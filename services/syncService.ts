
/**
 * Sync Service v2.1
 * Uses public KV storage to pair devices via a unique key.
 */

const SYNC_PROVIDER = 'https://kvstore.io/api/v1/items';
const COLLECTION_ID = 'retro_os_global_sync'; // Namespace

export interface SyncPacket {
    timestamp: number;
    deviceId: string;
    data: Record<string, any>;
}

/**
 * Captures local state. 
 * Warning: Free KV stores typically limit payloads to 1MB.
 */
export const captureLocalState = (): Record<string, any> => {
    const state: Record<string, any> = {};
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('retro_os_')) {
            const value = localStorage.getItem(key) || '';
            totalSize += value.length;
            
            // If we are hitting a massive size limit, we skip heavy image data 
            // to ensure core documents and tasks still sync.
            if (totalSize > 900000 && (key.includes('macshop') || key.includes('canvas'))) {
                console.warn(`[Sync] Skipping ${key} to stay under 1MB limit.`);
                continue;
            }

            try {
                state[key] = JSON.parse(value);
            } catch (e) {
                console.error(`[Sync] Parse error on ${key}`, e);
            }
        }
    }
    return state;
};

export const applyRemoteState = (remoteData: Record<string, any>) => {
    Object.entries(remoteData).forEach(([key, value]) => {
        if (key.startsWith('retro_os_')) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });
};

/**
 * Pushes data to the KV store.
 */
export const pushToCloud = async (syncId: string): Promise<boolean> => {
    const packet: SyncPacket = {
        timestamp: Date.now(),
        deviceId: navigator.userAgent,
        data: captureLocalState()
    };

    try {
        const response = await fetch(`${SYNC_PROVIDER}/${syncId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.stringify(packet) })
        });
        return response.ok;
    } catch (e) {
        console.error("[Sync] Push failed:", e);
        return false;
    }
};

/**
 * Pulls data from the KV store.
 */
export const pullFromCloud = async (syncId: string): Promise<SyncPacket | null> => {
    try {
        const response = await fetch(`${SYNC_PROVIDER}/${syncId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) return null;
        const result = await response.json();
        return JSON.parse(result.value);
    } catch (e) {
        console.error("[Sync] Pull failed:", e);
        return null;
    }
};

/**
 * Initializes a new sync session.
 */
export const initializeNewSync = async (): Promise<string | null> => {
    // Generate a unique 8-character key
    const syncId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const packet: SyncPacket = {
        timestamp: Date.now(),
        deviceId: 'primary',
        data: captureLocalState()
    };

    try {
        // We use POST to create/update the item at this specific random ID
        const response = await fetch(`${SYNC_PROVIDER}/${syncId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.stringify(packet) })
        });

        if (response.ok) {
            return syncId;
        }
        
        const errData = await response.json();
        if (response.status === 413) {
            alert("SYNC FAILED: Your local data (likely images) is too large for the 1MB free cloud limit. Try deleting some large drawings.");
        }
        return null;
    } catch (e) {
        console.error("[Sync] Network Error:", e);
        alert("CLOUD LINK BLOCKED: A network error occurred. Please disable ad-blockers or try a different network connection.");
        return null;
    }
};
