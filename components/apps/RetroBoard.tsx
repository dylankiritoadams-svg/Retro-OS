import React, { useState, useEffect, useRef, useCallback } from 'react';
import { listenToMessages, addMessage, listenToBoards, addBoard, listenToMentions } from '../../services/firebaseService';
import type { RetroBoardMessage, Board } from '../../types';
import { format } from 'date-fns';

const USERNAME_KEY = 'retro_os_retroboard_username';

const ContextMenu: React.FC<{ x: number, y: number, message: RetroBoardMessage, onReply: (username: string) => void, onClose: () => void }> = ({ x, y, message, onReply, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-black border border-green-400">
            <button
                onClick={() => { onReply(message.username); onClose(); }}
                className="block w-full text-left px-4 py-2 text-green-400 hover:bg-green-400 hover:text-black"
            >
                Reply to {message.username}
            </button>
        </div>
    );
};


export const RetroBoard: React.FC = () => {
    const [messages, setMessages] = useState<RetroBoardMessage[]>([]);
    const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));
    const [tempUsername, setTempUsername] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string | 'mentions' | null>(null);
    const [newBoardName, setNewBoardName] = useState('');

    const [allMentions, setAllMentions] = useState<RetroBoardMessage[]>([]);
    const [unreadBoardIds, setUnreadBoardIds] = useState<Set<string>>(new Set());
    const [highlightedMessageIds, setHighlightedMessageIds] = useState<Set<string>>(new Set());
    
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, message: RetroBoardMessage } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Data Fetching and Subscriptions ---

    useEffect(() => {
        const unsubscribe = listenToBoards((newBoards) => {
            setBoards(newBoards);
            if (!selectedBoardId && newBoards.length > 0) {
                setSelectedBoardId(newBoards[0].id);
            } else if (newBoards.length === 0) {
                setSelectedBoardId(null);
            }
        });
        return () => unsubscribe?.();
    }, []);

    useEffect(() => {
        if (!selectedBoardId || selectedBoardId === 'mentions' || !username) {
            setMessages([]);
            return;
        }
        setIsLoading(true);
        const unsubscribe = listenToMessages(selectedBoardId, (newMessages) => {
            // Highlight new mentions in the current channel
            if (messages.length > 0 && newMessages.length > messages.length) {
                const latestMessages = newMessages.slice(messages.length);
                latestMessages.forEach(msg => {
                    if (msg.content.includes(`@${username}`)) {
                        setHighlightedMessageIds(prev => new Set(prev).add(msg.id));
                        setTimeout(() => {
                            setHighlightedMessageIds(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(msg.id);
                                return newSet;
                            });
                        }, 3000);
                    }
                });
            }
            setMessages(newMessages);
            setIsLoading(false);
        });
        return () => unsubscribe?.();
    }, [selectedBoardId, username, messages.length]);

    useEffect(() => {
        if (!username) return;
        const unsubscribe = listenToMentions(username, (mentionedMessages) => {
            if (allMentions.length > 0 && mentionedMessages.length > allMentions.length) {
                const newMentions = mentionedMessages.slice(0, mentionedMessages.length - allMentions.length);
                const newUnreadIds = new Set(unreadBoardIds);
                newMentions.forEach(mention => {
                    if (mention.boardId !== selectedBoardId) {
                        newUnreadIds.add(mention.boardId);
                    }
                });
                setUnreadBoardIds(newUnreadIds);
            }
            setAllMentions(mentionedMessages);
        });
        return () => unsubscribe?.();
    }, [username, allMentions.length, selectedBoardId, unreadBoardIds]);


    // --- UI Handlers ---

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, allMentions]);

    const handleSetUsername = () => {
        const trimmedUsername = tempUsername.trim();
        if (trimmedUsername) {
            localStorage.setItem(USERNAME_KEY, trimmedUsername);
            setUsername(trimmedUsername);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !username || !selectedBoardId || selectedBoardId === 'mentions') return;
        try {
            await addMessage(selectedBoardId, username, newMessage.trim());
            setNewMessage('');
        } catch (err: any) {
            setError(err.message || "Failed to send message.");
        }
    };

    const handleAddBoard = async () => {
        if (!newBoardName.trim()) return;
        try {
            await addBoard(newBoardName.trim());
            setNewBoardName('');
        } catch (err: any) {
            setError(err.message || "Failed to create board.");
        }
    };
    
    const handleBoardSelect = (boardId: string | 'mentions') => {
        setSelectedBoardId(boardId);
        if (boardId !== 'mentions') {
            setUnreadBoardIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(boardId);
                return newSet;
            });
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent, message: RetroBoardMessage) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, message });
    };
    
    const handleReply = (replyUsername: string) => {
        setNewMessage(prev => `@${replyUsername} ${prev}`);
        inputRef.current?.focus();
    };

    // --- Render Logic ---

    if (!username) {
        return (
            <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl mb-4">[ RetroBoard System ]</h1>
                <p className="mb-2">Please enter a handle to continue:</p>
                <div className="flex">
                    <input type="text" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSetUsername()} className="p-1 bg-gray-800 border border-green-400 focus:outline-none" maxLength={20} autoFocus />
                    <button onClick={handleSetUsername} className="ml-2 px-2 py-1 border border-green-400 hover:bg-green-400 hover:text-black">Enter</button>
                </div>
            </div>
        );
    }

    const currentBoardName = selectedBoardId === 'mentions' ? 'Mentions' : boards.find(b => b.id === selectedBoardId)?.name || 'Select a Board';
    const messagesToDisplay = selectedBoardId === 'mentions' ? allMentions : messages;

    return (
        <div className="w-full h-full bg-black text-green-400 font-mono flex">
            {contextMenu && <ContextMenu {...contextMenu} onReply={handleReply} onClose={() => setContextMenu(null)} />}
            
            {/* Left Panel: Boards List */}
            <div className="w-1/4 min-w-[150px] border-r-2 border-green-600 flex flex-col">
                <header className="p-2 border-b-2 border-green-600 text-center">
                    <h2 className="text-lg">[ BOARDS ]</h2>
                </header>
                <ul className="flex-grow overflow-y-auto">
                     <li onClick={() => handleBoardSelect('mentions')} className={`p-2 cursor-pointer flex justify-between items-center ${selectedBoardId === 'mentions' ? 'bg-green-400 text-black' : 'hover:bg-gray-800'}`}>
                        <span>@ Mentions</span>
                    </li>
                    {boards.map(board => (
                        <li key={board.id} onClick={() => handleBoardSelect(board.id)} className={`p-2 cursor-pointer flex justify-between items-center ${selectedBoardId === board.id ? 'bg-green-400 text-black' : 'hover:bg-gray-800'}`}>
                            <span># {board.name}</span>
                            {unreadBoardIds.has(board.id) && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                        </li>
                    ))}
                </ul>
                <div className="p-2 border-t-2 border-green-600">
                     <input type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddBoard()} placeholder="+ New Board" className="w-full p-1 bg-gray-800 border border-green-400 focus:outline-none mb-1" />
                </div>
            </div>

            {/* Right Panel: Chat */}
            <div className="flex-grow flex flex-col">
                 <header className="flex-shrink-0 p-2 border-b-2 border-green-600 text-center">
                    <h1 className="text-xl">[ {currentBoardName} ] --- Logged in as: {username}</h1>
                </header>
                <main className="flex-grow p-2 overflow-y-auto">
                    {isLoading ? <p>Connecting...</p> : error ? <p className="text-red-500">{error}</p> :
                        messagesToDisplay.map(msg => (
                            <div key={msg.id} onContextMenu={(e) => handleContextMenu(e, msg)} className={`mb-2 rounded-sm ${highlightedMessageIds.has(msg.id) ? 'message-highlight' : ''}`}>
                                <span className="text-cyan-400">&lt;{msg.username}&gt;</span>
                                <span className="text-gray-500 ml-2">[{format(msg.timestamp, 'HH:mm')}]</span>
                                {selectedBoardId === 'mentions' && <span className="text-yellow-500 ml-2"> on #{boards.find(b=>b.id===msg.boardId)?.name}</span>}
                                <p className="ml-4 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        ))
                    }
                    <div ref={messagesEndRef} />
                </main>
                {selectedBoardId !== 'mentions' && (
                    <footer className="flex-shrink-0 p-2 border-t-2 border-green-600">
                        <form onSubmit={handleSendMessage} className="flex">
                            <span className="mr-2">&gt;</span>
                            <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-grow bg-transparent border-none outline-none" placeholder={error ? "Connection failed." : "Type your message..."} disabled={!!error || isLoading} />
                        </form>
                    </footer>
                )}
            </div>
        </div>
    );
};