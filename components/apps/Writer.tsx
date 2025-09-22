import React, { useState, useCallback, useEffect } from 'react';
import { getWriterSuggestion } from '../../services/geminiService';
import { useCards } from '../../CardContext';
import { globalEmitter } from '../../events';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
);

const FolderIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
);


export const Writer: React.FC<AppProps> = ({ isActive, instanceId }) => {
    // Component state
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCardsMenuOpen, setIsCardsMenuOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [loadedCardId, setLoadedCardId] = useState<string | null>(null);

    // Shared card state from context
    const { groups, getCardById, addCard, deleteCard, updateCard, addGroup, moveCardToGroup } = useCards();
    const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');

    // Effect to handle if the selected group is deleted or on initial load
    useEffect(() => {
        if (!selectedGroupId || !groups.find(g => g.id === selectedGroupId)) {
            setSelectedGroupId(groups[0]?.id || '');
        }
    }, [groups, selectedGroupId]);


    // Gemini API call
    const handleGeminiAction = useCallback(async (action: 'continue' | 'title' | 'improve') => {
        setIsLoading(true);
        setError(null);
        
        let prompt = '';
        switch (action) {
            case 'continue':
                prompt = `Continue the following story, starting from where it left off:\n\n${text}`;
                break;
            case 'title':
                prompt = `Suggest a creative title for the following text:\n\n${text}`;
                break;
            case 'improve':
                prompt = `Improve the grammar and style of the following text, only return the improved text:\n\n${text}`;
                break;
        }

        try {
            const result = await getWriterSuggestion(prompt);
            if (action === 'continue') {
                setText(prev => prev + (prev.endsWith('\n') || prev.length === 0 ? '' : '\n\n') + result);
            } else if (action === 'title') {
                 setText(prev => `Title: ${result}\n\n` + prev);
            } else {
                setText(result);
            }
        } catch (e) {
            console.error(e);
            setError('Failed to get suggestion from AI. Check console for details.');
        } finally {
            setIsLoading(false);
        }
    }, [text]);

    // Card and Group Management using context
    const handleSaveOrUpdateCard = useCallback(() => {
        if (!text.trim()) return;
        
        if (loadedCardId) {
            updateCard(loadedCardId, text);
        } else {
            addCard(text, selectedGroupId);
        }
        
        setText(''); // Clear writing space
        setLoadedCardId(null); // Reset loaded card state
    }, [text, loadedCardId, addCard, updateCard, selectedGroupId]);

    const handleLoadCard = (cardId: string, content: string) => {
        setText(content);
        setLoadedCardId(cardId);
        setIsCardsMenuOpen(false); // Close menu on load
    };

    const handleDeleteCardFromGroup = (cardId: string) => {
        if (cardId === loadedCardId) {
            setText('');
            setLoadedCardId(null);
        }
        deleteCard(cardId);
    };

    const handleAddGroup = () => {
        if (!newGroupName.trim()) return;
        addGroup(newGroupName);
        setNewGroupName('');
    };

    const handleMoveCard = (cardId: string, targetGroupId: string) => {
        moveCardToGroup(cardId, targetGroupId);
    };
    
    const toggleCardsMenu = () => {
        setIsCardsMenuOpen(prev => !prev);
    };

    useEffect(() => {
        if (!isActive) return;

        const eventHandlers: { [key: string]: () => void } = {
            'cards:file:save': handleSaveOrUpdateCard,
            'cards:ai:continue': () => handleGeminiAction('continue'),
            'cards:ai:improve': () => handleGeminiAction('improve'),
            'cards:ai:title': () => handleGeminiAction('title'),
        };

        const subscriptions: { event: string; handler: (data?: any) => void }[] = [];

        Object.entries(eventHandlers).forEach(([event, handler]) => {
            const wrappedHandler = (data: { instanceId: string }) => {
                if (data && data.instanceId === instanceId) {
                    handler();
                }
            };
            subscriptions.push({ event, handler: wrappedHandler });
            globalEmitter.subscribe(event, wrappedHandler);
        });

        return () => {
            subscriptions.forEach(({ event, handler }) => {
                globalEmitter.unsubscribe(event, handler);
            });
        };
    }, [isActive, instanceId, handleSaveOrUpdateCard, handleGeminiAction]);


    return (
        <div className="w-full h-full flex bg-white text-black">
            {isCardsMenuOpen && (
                <div className="w-64 h-full border-r-2 border-gray-300 flex flex-col flex-shrink-0 bg-gray-50">
                    <div className="p-2 border-b-2 border-gray-300">
                        <h3 className="font-bold text-center mb-2">New Group</h3>
                        <div className="flex space-x-1">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddGroup()}
                                placeholder="Group name..."
                                className="flex-grow p-1 border-2 border-black bg-white text-black focus:outline-none rounded-sm text-sm"
                            />
                            <button
                                onClick={handleAddGroup}
                                className="p-1 px-2 bg-white border-2 border-black active:bg-gray-200 rounded-sm text-sm"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2">
                        {groups.map(group => (
                            <div key={group.id} className="mb-4">
                                <h4 className="font-bold text-sm mb-1">{group.name}</h4>
                                {group.cardIds.length > 0 ? (
                                    <ul className="space-y-1">
                                        {group.cardIds.map(cardId => {
                                            const card = getCardById(cardId);
                                            if (!card) return null;
                                            return (
                                                <li key={card.id} className="p-1 bg-white border-2 border-black text-sm group relative">
                                                    <p 
                                                        onClick={() => handleLoadCard(card.id, card.content)}
                                                        className="truncate cursor-pointer"
                                                    >
                                                        {card.content.split('\n')[0] || 'Empty Card'}
                                                    </p>
                                                    <div className="absolute top-0 right-0 h-full flex items-center bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <select
                                                            value={group.id}
                                                            onChange={(e) => handleMoveCard(card.id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs border-l-2 border-black h-full focus:outline-none"
                                                        >
                                                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                        </select>
                                                        <button 
                                                            onClick={() => handleDeleteCardFromGroup(card.id)} 
                                                            className="px-1 text-red-500 hover:bg-red-100 h-full border-l-2 border-black"
                                                        >
                                                            X
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No cards in this group.</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex-grow flex flex-col relative">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="flex-grow w-full h-full p-4 bg-transparent resize-none focus:outline-none text-lg"
                    placeholder="Start writing..."
                    style={{ fontFamily: "'Cutive Mono', monospace" }}
                />
                <div className="flex-shrink-0 p-1 border-t-2 border-gray-300 flex items-center space-x-2 bg-gray-50">
                    <button onClick={toggleCardsMenu} className="p-1 hover:bg-gray-200 rounded-sm" title="Toggle Card Library">
                        <FolderIcon className="w-6 h-6" />
                    </button>
                    
                    {!loadedCardId && (
                        <div className="flex items-center space-x-1">
                            <label htmlFor="group-select" className="text-sm">Save to:</label>
                            <select
                                id="group-select"
                                value={selectedGroupId}
                                onChange={e => setSelectedGroupId(e.target.value)}
                                className="p-1 border-2 border-black bg-white text-black focus:outline-none rounded-sm text-sm"
                            >
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex-grow"></div>

                    {error && <span className="text-red-500 text-xs">{error}</span>}
                    {isLoading && <LoadingSpinner />}
                    
                    <button
                        onClick={handleSaveOrUpdateCard}
                        className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200"
                    >
                        {loadedCardId ? 'Update Card' : 'Save Card'}
                    </button>
                </div>
            </div>
        </div>
    );
};