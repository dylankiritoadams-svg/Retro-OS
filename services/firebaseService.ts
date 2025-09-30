import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    collectionGroup,
    where,
    type Unsubscribe,
    type DocumentData,
} from 'firebase/firestore';
import type { RetroBoardMessage, Board } from '../types';

let db: ReturnType<typeof getFirestore> | null = null;
let initError: Error | null = null;

try {
    const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const requiredKeys: (keyof typeof firebaseConfig)[] = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
    ];
    
    const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

    if (missingKeys.length > 0) {
        throw new Error(`Firebase configuration is missing. Please set the following VITE_FIREBASE_* environment variables in your Vercel project settings: ${missingKeys.join(', ')}`);
    }

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error: any) {
    console.error("Firebase initialization error:", error);
    initError = error;
}

const BOARDS_COLLECTION = 'boards';
const MESSAGES_SUBCOLLECTION = 'messages';

// --- Boards ---
export const listenToBoards = (callback: (boards: Board[]) => void): Unsubscribe | null => {
    if (!db) return null;
    const q = query(collection(db, BOARDS_COLLECTION), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        const boards: Board[] = [];
        snapshot.forEach(doc => {
            boards.push({ id: doc.id, name: doc.data().name });
        });
        callback(boards);
    });
};

export const addBoard = async (name: string): Promise<void> => {
    if (!db) throw new Error("Service not connected.");
    if (!name.trim()) throw new Error("Board name cannot be empty.");
    await addDoc(collection(db, BOARDS_COLLECTION), { name, createdAt: serverTimestamp() });
};

// --- Messages ---
export const listenToMessages = (boardId: string, callback: (messages: RetroBoardMessage[]) => void): Unsubscribe | null => {
    if (!db || initError) {
        callback([{
            id: 'error-1', boardId: 'system', username: 'System', mentions: [],
            content: `Error: Could not connect to the message board service.\n${initError?.message || 'Unknown error.'}`,
            timestamp: new Date(),
        }]);
        return null;
    }

    const messagesPath = `${BOARDS_COLLECTION}/${boardId}/${MESSAGES_SUBCOLLECTION}`;
    const q = query(collection(db, messagesPath), orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages: RetroBoardMessage[] = [];
        querySnapshot.forEach((doc: DocumentData) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                boardId,
                username: data.username,
                content: data.content,
                timestamp: data.timestamp?.toDate() || new Date(),
                mentions: data.mentions || [],
            });
        });
        callback(messages);
    }, (error) => {
        console.error(`Error listening to messages for board ${boardId}:`, error);
        const errorMessage = `Error: Lost connection to the message board. (${error.code || 'permission-denied'})`;
        callback([{
            id: 'error-2', boardId: 'system', username: 'System', mentions: [],
            content: errorMessage,
            timestamp: new Date(),
        }]);
    });

    return unsubscribe;
};

export const addMessage = async (boardId: string, username: string, content: string): Promise<void> => {
    if (!db) throw new Error("Message board service is not connected.");
    if (!username.trim() || !content.trim()) throw new Error("Username and message content cannot be empty.");

    // Parse mentions
    const mentions = [...content.matchAll(/@(\w+)/g)].map(match => match[1]);

    try {
        const messagesPath = `${BOARDS_COLLECTION}/${boardId}/${MESSAGES_SUBCOLLECTION}`;
        await addDoc(collection(db, messagesPath), {
            username,
            content,
            mentions,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error adding message:", error);
        throw new Error("Failed to send message.");
    }
};

// --- Mentions ---
export const listenToMentions = (username: string, callback: (messages: RetroBoardMessage[]) => void): Unsubscribe | null => {
    if (!db) return null;

    const messagesGroup = collectionGroup(db, MESSAGES_SUBCOLLECTION);
    const q = query(
        messagesGroup,
        where('mentions', 'array-contains', username),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const messages: RetroBoardMessage[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const parentPath = doc.ref.parent.parent;
            if (parentPath) {
                 messages.push({
                    id: doc.id,
                    boardId: parentPath.id,
                    username: data.username,
                    content: data.content,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    mentions: data.mentions || [],
                });
            }
        });
        callback(messages);
    });
};