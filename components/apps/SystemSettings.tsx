
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../SettingsContext';
import { Wallpaper, DesktopMode, AnimationSpeed } from '../../types';
import * as sync from '../../services/syncService';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

type Tab = 'general' | 'appearance' | 'background' | 'sync' | 'advanced';

export const SystemSettings: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { 
        theme, 
        setColorScheme, 
        setFont, 
        setWallpaper, 
        setDesktopMode, 
        setAnimationSpeed,
        setCustomColor,
        updateSystem,
        colorSchemes, 
        fonts,
        getActiveColorScheme
    } = useTheme();
    
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [isUpdating, setIsUpdating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync State
    const [syncKey, setSyncKey] = useState<string>(() => localStorage.getItem('retro_os_sync_id') || '');
    const [syncStatus, setSyncStatus] = useState<'idle' | 'linking' | 'syncing' | 'error'>('idle');
    const [lastSync, setLastSync] = useState<string>(localStorage.getItem('retro_os_last_sync') || 'Never');

    const activeColors = getActiveColorScheme().colors;

    const handleCreateLink = async () => {
        setSyncStatus('linking');
        try {
            const id = await sync.initializeNewSync();
            if (id) {
                setSyncKey(id);
                localStorage.setItem('retro_os_sync_id', id);
                setSyncStatus('idle');
            } else {
                setSyncStatus('error');
            }
        } catch (e) {
            setSyncStatus('error');
        }
    };

    const handleJoinLink = async () => {
        if (!syncKey) return;
        setSyncStatus('syncing');
        try {
            const packet = await sync.pullFromCloud(syncKey);
            if (packet) {
                sync.applyRemoteState(packet.data);
                localStorage.setItem('retro_os_sync_id', syncKey);
                const now = new Date().toLocaleString();
                setLastSync(now);
                localStorage.setItem('retro_os_last_sync', now);
                alert("SYNC SUCCESSFUL. REBOOTING...");
                window.location.reload();
            } else {
                alert("Invalid Key or Link Expired.");
                setSyncStatus('error');
            }
        } catch (e) {
            setSyncStatus('error');
        }
    };

    const handlePushSync = async () => {
        if (!syncKey) return;
        setSyncStatus('syncing');
        try {
            const ok = await sync.pushToCloud(syncKey);
            if (ok) {
                const now = new Date().toLocaleString();
                setLastSync(now);
                localStorage.setItem('retro_os_last_sync', now);
                setSyncStatus('idle');
            } else {
                alert("Push failed. Check your connection.");
                setSyncStatus('error');
            }
        } catch (e) {
            setSyncStatus('error');
        }
    };

    const handleExport = () => {
        try {
            const keys = ['window_state', 'theme_settings', 'vfs', 'documents', 'cards_state', 'sticky_notes', 'notebook_state', 'task_planner_state', 'pinboard_state'];
            const stateToExport: Record<string, any> = {};
            keys.forEach(k => {
                const val = localStorage.getItem(`retro_os_${k}`);
                if (val) stateToExport[k] = JSON.parse(val);
            });

            const blob = new Blob([JSON.stringify(stateToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `retro-os-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Export failed.");
        }
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                Object.entries(data).forEach(([key, val]) => {
                    localStorage.setItem(`retro_os_${key}`, JSON.stringify(val));
                });
                alert("Import successful! Reloading...");
                window.location.reload();
            } catch (err) {
                alert("Invalid state file.");
            }
        };
        reader.readAsText(file);
    };
    
    const renderSidebarItem = (id: Tab, label: string, icon: string) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`w-full text-left p-2 flex items-center space-x-2 border-b border-gray-400/50 ${activeTab === id ? 'bg-black text-white' : 'hover:bg-gray-300'}`}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
        </button>
    );

    return (
        <div className="w-full h-full flex bg-gray-200 text-black font-[var(--main-font)] overflow-hidden">
            {/* Sidebar */}
            <div className="w-40 border-r-2 border-black bg-gray-100 flex flex-col">
                {renderSidebarItem('general', 'General', '🕹️')}
                {renderSidebarItem('appearance', 'Colors', '🎨')}
                {renderSidebarItem('background', 'Desktop', '🖼️')}
                {renderSidebarItem('sync', 'Global Link', '🌐')}
                {renderSidebarItem('advanced', 'System', '💾')}
                <div className="mt-auto p-2 border-t border-black bg-white/50 text-[10px] text-gray-500 font-mono">
                    VER: {theme.systemVersion}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-sm font-bold uppercase border-b border-black mb-3">User Interface</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block">UI Paradigm</label>
                                    <div className="flex space-x-2">
                                        {['mac', 'windows'].map(m => (
                                            <button key={m} onClick={() => useTheme().setUiMode(m as any)} className={`px-4 py-1 border-2 border-black text-xs font-bold uppercase ${theme.uiMode === m ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Desktop Mode</label>
                                    <div className="flex space-x-2">
                                        {['scrolling', 'fixed'].map(m => (
                                            <button key={m} onClick={() => setDesktopMode(m as any)} className={`px-4 py-1 border-2 border-black text-xs font-bold uppercase ${theme.desktopMode === m ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <section>
                            <h2 className="text-sm font-bold uppercase border-b border-black mb-3 flex items-center">
                                <span className="mr-2">🛰️</span> Global Device Sync
                            </h2>
                            <p className="text-[10px] text-gray-500 mb-4 leading-tight">
                                Pair your laptop and mobile device using a unique Link Key.
                            </p>

                            {syncStatus === 'error' && (
                                <div className="p-2 mb-4 bg-red-100 border border-red-500 text-[10px] text-red-700 font-bold uppercase">
                                    Network Error: Link rejected by carrier. Check your internet or disable ad-blockers.
                                </div>
                            )}

                            {!syncKey ? (
                                <div className="bg-white border-2 border-black p-4 text-center space-y-4">
                                    <h3 className="text-xs font-bold uppercase">No Active Uplink</h3>
                                    <button 
                                        onClick={handleCreateLink}
                                        disabled={syncStatus === 'linking'}
                                        className="w-full py-2 bg-blue-600 text-white font-bold text-xs uppercase border-2 border-black shadow-[4px_4px_0px_gray] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                                    >
                                        {syncStatus === 'linking' ? 'Establishing Link...' : 'Create New Link Key'}
                                    </button>
                                    <div className="flex items-center space-x-2">
                                        <div className="h-px bg-gray-300 flex-grow"></div>
                                        <span className="text-[9px] text-gray-400 font-bold">OR JOIN</span>
                                        <div className="h-px bg-gray-300 flex-grow"></div>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="ENTER LINK KEY..." 
                                        className="w-full p-2 border-2 border-black text-center font-mono text-xs uppercase"
                                        onChange={e => { setSyncKey(e.target.value); setSyncStatus('idle'); }}
                                    />
                                    <button 
                                        onClick={handleJoinLink}
                                        className="w-full py-1.5 border-2 border-black text-[10px] font-bold uppercase hover:bg-gray-100"
                                    >Join Existing Link</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-black text-green-400 p-3 border-2 border-gray-600 font-mono">
                                        <div className="flex justify-between items-center border-b border-green-900 pb-2 mb-2">
                                            <span className="text-[10px] font-bold">CARRIER: ONLINE</span>
                                            <span className="text-[8px] animate-pulse">● SYNC READY</span>
                                        </div>
                                        <div className="text-[10px] flex flex-col space-y-1">
                                            <div className="flex justify-between">
                                                <span>KEY:</span>
                                                <span className="font-bold text-white select-all">{syncKey}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>LAST SYNC:</span>
                                                <span>{lastSync}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={handlePushSync}
                                            disabled={syncStatus === 'syncing'}
                                            className="p-3 border-2 border-black bg-white font-bold text-[10px] uppercase shadow-[3px_3px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                                        >
                                            {syncStatus === 'syncing' ? 'UP...' : 'Push Data'}
                                        </button>
                                        <button 
                                            onClick={handleJoinLink}
                                            disabled={syncStatus === 'syncing'}
                                            className="p-3 border-2 border-black bg-white font-bold text-[10px] uppercase shadow-[3px_3px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                                        >
                                            {syncStatus === 'syncing' ? 'DOWN...' : 'Pull Data'}
                                        </button>
                                    </div>
                                    
                                    <button 
                                        onClick={() => { if(confirm("DISCONNECT? Local data stays.")) { setSyncKey(''); localStorage.removeItem('retro_os_sync_id'); }}}
                                        className="w-full text-[9px] text-red-600 hover:underline uppercase font-bold"
                                    >Destroy Link</button>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-sm font-bold uppercase border-b border-black mb-3">Color Themes</h2>
                            <div className="grid grid-cols-3 gap-2">
                                {colorSchemes.map(cs => (
                                    <button 
                                        key={cs.id} 
                                        onClick={() => setColorScheme(cs.id)}
                                        className={`p-1 border-2 border-black flex flex-col items-center ${theme.colorSchemeId === cs.id ? 'ring-2 ring-blue-500 z-10' : ''}`}
                                    >
                                        <div className="w-full h-8 border border-black" style={{ backgroundColor: cs.colors['--desktop-bg'] }}></div>
                                        <div className="text-[9px] font-bold mt-1 uppercase">{cs.name}</div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'advanced' && (
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-sm font-bold uppercase border-b border-black mb-3">System Recovery</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleExport} className="p-2 border-2 border-black bg-white hover:bg-gray-100 text-[10px] font-bold uppercase">Manual Backup</button>
                                <button onClick={handleImportClick} className="p-2 border-2 border-black bg-white hover:bg-gray-100 text-[10px] font-bold uppercase">Restore System</button>
                                <button 
                                    onClick={() => { if(confirm("ERASE ALL DATA?")) { Object.keys(localStorage).filter(k => k.startsWith('retro_os_')).forEach(k => localStorage.removeItem(k)); window.location.reload(); }}} 
                                    className="p-2 col-span-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors text-[10px] font-bold uppercase"
                                >
                                    Factory Reset
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json" />
                        </section>
                    </div>
                )}
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; }
            `}</style>
        </div>
    );
};
