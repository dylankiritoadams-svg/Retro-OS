import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    type Unsubscribe,
    type DocumentData,
} from 'firebase/firestore';
import type { RetroBoardMessage } from '../types';

let db: ReturnType<typeof getFirestore> | null = null;
let initError: Error | null = null;

try {
    if (typeof process === 'undefined' || !process.env) {
        throw new Error("Execution environment does not provide `process.env`. API keys cannot be accessed.");
    }

    const requiredVars: (keyof NodeJS.ProcessEnv)[] = [
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID',
    ];
    
    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        throw new Error(`Firebase configuration is missing. Please set the following environment variables in your Vercel project settings: ${missingVars.join(', ')}`);
    }

    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
    };
    
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error: any) {
    console.error("Firebase initialization error:", error);
    initError = error;
}

const MESSAGES_COLLECTION = 'messages';

export const listenToMessages = (callback: (messages: RetroBoardMessage[]) => void): Unsubscribe | null => {
    if (!db || initError) {
        callback([{
            id: 'error-1',
            username: 'System',
            content: `Error: Could not connect to the message board service.\n${initError?.message || 'Unknown error.'}`,
            timestamp: new Date(),
        }]);
        return null;
    }

    const q = query(collection(db, MESSAGES_COLLECTION), orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages: RetroBoardMessage[] = [];
        querySnapshot.forEach((doc: DocumentData) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                username: data.username,
                content: data.content,
                timestamp: data.timestamp?.toDate() || new Date(),
            });
        });
        callback(messages);
    }, (error) => {
        console.error("Error listening to messages:", error);
        callback([{
            id: 'error-2',
            username: 'System',
            content: 'Error: Lost connection to the message board.',
            timestamp: new Date(),
        }]);
    });

    return unsubscribe;
};

export const addMessage = async (username: string, content: string): Promise<void> => {
    if (!db) {
        throw new Error("Message board service is not connected.");
    }
    if (!username.trim() || !content.trim()) {
        throw new Error("Username and message content cannot be empty.");
    }

    try {
        await addDoc(collection(db, MESSAGES_COLLECTION), {
            username,
            content,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error adding message:", error);
        throw new Error("Failed to send message.");
    }
};