import React, { useState, useEffect, useRef } from 'react';
import { listenToMessages, addMessage } from '../../services/firebaseService';
import type { RetroBoardMessage } from '../../types';
import { format } from 'date-fns';

const USERNAME_KEY = 'retro_os_retroboard_username';

export const RetroBoard: React.FC = () => {
    const [messages, setMessages] = useState<RetroBoardMessage[]>([]);
    const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));
    const [tempUsername, setTempUsername] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages]);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = listenToMessages((newMessages) => {
            setMessages(newMessages);
            setIsLoading(false);
            
            const errorMsg = newMessages.find(m => m.id.startsWith('error-'));
            if (errorMsg) {
                setError(errorMsg.content);
            } else {
                setError(null);
            }
        });

        // Cleanup subscription on component unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, []);

    const handleSetUsername = () => {
        const trimmedUsername = tempUsername.trim();
        if (trimmedUsername) {
            localStorage.setItem(USERNAME_KEY, trimmedUsername);
            setUsername(trimmedUsername);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !username) return;

        try {
            await addMessage(username, newMessage.trim());
            setNewMessage('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to send message.");
        }
    };

    if (!username) {
        return (
            <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl mb-4">[ RetroBoard System ]</h1>
                <p className="mb-2">Please enter a handle to continue:</p>
                <div className="flex">
                    <input
                        type="text"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSetUsername()}
                        className="p-1 bg-gray-800 border border-green-400 focus:outline-none"
                        maxLength={20}
                        autoFocus
                    />
                    <button onClick={handleSetUsername} className="ml-2 px-2 py-1 border border-green-400 hover:bg-green-400 hover:text-black">
                        Enter
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col">
            <header className="flex-shrink-0 p-2 border-b-2 border-green-600 text-center">
                <h1 className="text-xl">[ RetroBoard ] --- Logged in as: {username}</h1>
            </header>
            
            <main className="flex-grow p-2 overflow-y-auto">
                {isLoading ? (
                    <p>Connecting to board...</p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className="mb-2">
                            <span className="text-cyan-400">&lt;{msg.username}&gt;</span>
                            <span className="text-gray-500 ml-2">[{format(msg.timestamp, 'HH:mm')}]</span>
                            <p className="ml-4 whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </main>

            <footer className="flex-shrink-0 p-2 border-t-2 border-green-600">
                <form onSubmit={handleSendMessage} className="flex">
                    <span className="mr-2">&gt;</span>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-grow bg-transparent border-none outline-none"
                        placeholder={error ? "Connection failed." : "Type your message..."}
                        disabled={!!error || isLoading}
                    />
                </form>
            </footer>
        </div>
    );
};