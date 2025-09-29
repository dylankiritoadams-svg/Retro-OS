import React, { useState, useEffect, useCallback } from 'react';
import { globalEmitter } from '../../events';
import { generateChirperFeed, createChirperPersona } from '../../services/geminiService';
import type { ChirperUser, Chirp } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const DEFAULT_PERSONAS: ChirperUser[] = [
    { id: 'user-1', name: 'Captain Code', handle: '@captaincode', bio: 'A swashbuckling pirate who codes in Rust and only talks about treasure and WebAssembly.' },
    { id: 'user-2', name: 'Design Diva', handle: '@designista', bio: 'A high-fashion designer who sees the world in hex codes and critiques everything with elegant, cutting remarks.' },
    { id: 'user-3', name: 'Gary Grillmaster', handle: '@gary_grills', bio: 'A suburban dad who just discovered charcoal grilling. Every post is about tongs, marinades, or perfectly seared steaks.' },
    { id: 'user-4', name: 'Cosmic Voyager', handle: '@stardustSailor', bio: 'An existential astronaut floating through space, sharing poetic and slightly melancholic thoughts about distant galaxies and the silence of the void.' },
];

const LoadingSpinner: React.FC = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
    </div>
);

export const Chirper: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const [users, setUsers] = useState<ChirperUser[]>(DEFAULT_PERSONAS);
    const [chirps, setChirps] = useState<Chirp[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newPersonaBio, setNewPersonaBio] = useState('');
    const [isCreatingPersona, setIsCreatingPersona] = useState(false);

    const fetchFeed = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateChirperFeed(users);
            const newChirps: Chirp[] = result.chirps.map((c, index) => ({
                ...c,
                id: `chirp-${Date.now()}-${index}`
            }));
            setChirps(newChirps);
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [users]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    const handleRefresh = useCallback(() => {
        if (!isLoading) {
            fetchFeed();
        }
    }, [isLoading, fetchFeed]);

    useEffect(() => {
        if (!isActive) return;
        
        const handler = (data: { instanceId: string }) => {
             if (data.instanceId === instanceId) {
                handleRefresh();
            }
        }

        globalEmitter.subscribe('chirper:feed:refresh', handler);
        return () => {
            globalEmitter.unsubscribe('chirper:feed:refresh', handler);
        }
    }, [isActive, instanceId, handleRefresh]);
    
    const handleCreatePersona = async () => {
        if (!newPersonaBio.trim() || isCreatingPersona) return;
        setIsCreatingPersona(true);
        try {
            const { name, handle } = await createChirperPersona(newPersonaBio);
            const newUser: ChirperUser = {
                id: `user-${Date.now()}`,
                name,
                handle,
                bio: newPersonaBio,
            };
            setUsers(prevUsers => [...prevUsers, newUser]);
            setNewPersonaBio('');
        } catch (e) {
            console.error("Failed to create persona", e);
            // You might want to show an error to the user here
        } finally {
            setIsCreatingPersona(false);
        }
    };

    const getUserById = (userId: string) => users.find(u => u.id === userId);

    return (
        <div className="w-full h-full flex bg-gray-200 text-black font-mono">
            {/* Left Column - Persona Creator */}
            <div className="w-1/4 min-w-[200px] p-2 border-r-2 border-gray-400 flex flex-col space-y-4">
                <h2 className="text-lg font-bold text-center">Create a Persona</h2>
                <textarea
                    value={newPersonaBio}
                    onChange={e => setNewPersonaBio((e.target as HTMLTextAreaElement).value)}
                    placeholder="Describe a new AI user... e.g., 'a cheerful baker obsessed with sourdough'"
                    className="w-full h-32 p-2 border-2 border-black bg-white resize-none focus:outline-none"
                    disabled={isCreatingPersona}
                />
                <button
                    onClick={handleCreatePersona}
                    disabled={isCreatingPersona || !newPersonaBio.trim()}
                    className="w-full p-2 bg-white border-2 border-black active:bg-gray-300 disabled:opacity-50"
                >
                    {isCreatingPersona ? 'Creating...' : 'Create'}
                </button>
            </div>

            {/* Middle Column - Feed */}
            <div className="flex-grow w-1/2 p-2 flex flex-col">
                 <header className="flex-shrink-0 flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold">Chirper Feed</h1>
                     <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="px-3 py-1 bg-white border-2 border-black active:bg-gray-300 disabled:opacity-50"
                    >
                        {isLoading ? '...' : 'Refresh'}
                    </button>
                </header>
                <div className="flex-grow bg-white border-2 border-black overflow-y-auto">
                    {isLoading ? <LoadingSpinner /> : (
                        error ? <div className="p-4 text-red-600">{error}</div> : (
                            chirps.length > 0 ? (
                                <ul>
                                    {chirps.map(chirp => {
                                        const user = getUserById(chirp.userId);
                                        return (
                                            <li key={chirp.id} className="p-3 border-b-2 border-gray-300">
                                                <div className="flex items-center mb-1">
                                                    <div className="w-10 h-10 rounded-full bg-gray-400 mr-3 flex-shrink-0"></div>
                                                    <div>
                                                        <span className="font-bold">{user?.name || 'Unknown User'}</span>
                                                        <span className="text-gray-600 ml-2">{user?.handle || '@unknown'}</span>
                                                    </div>
                                                </div>
                                                <p className="whitespace-pre-wrap">{chirp.content}</p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-gray-600">No chirps to display.</div>
                            )
                        )
                    )}
                </div>
            </div>

            {/* Right Column - Users List */}
            <div className="w-1/4 min-w-[200px] p-2 border-l-2 border-gray-400 flex flex-col">
                <h2 className="text-lg font-bold text-center mb-2 flex-shrink-0">AI Personas</h2>
                <div className="flex-grow bg-white border-2 border-black overflow-y-auto">
                    <ul>
                        {users.map(user => (
                            <li key={user.id} className="p-3 border-b border-gray-300">
                                <p className="font-bold">{user.name}</p>
                                <p className="text-sm text-gray-600">{user.handle}</p>
                                <p className="text-xs italic mt-1 text-gray-500">"{user.bio}"</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};