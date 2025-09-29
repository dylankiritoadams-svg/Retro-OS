import React, { useState, useCallback, useEffect } from 'react';
import { getWriterSuggestion } from '../../services/geminiService';
import { useCards } from '../../CardContext';
import { globalEmitter } from '../../events';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  cardIdToOpen?: string;
}

const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
);

const FolderIconComponent: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
);


export const Writer: React.FC<AppProps> = ({ isActive, instanceId, cardIdToOpen }) => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCardsMenuOpen, setIsCardsMenuOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [loadedCardId, setLoadedCardId] = useState<string | null>(null);

    const { groups, getCardById, addCard, deleteCard, updateCard, addGroup, deleteGroup, moveCardToGroup } = useCards();
    const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');

    useEffect(() => {
        if (cardIdToOpen) {
            const cardToLoad = getCardById(cardIdToOpen);
            if (cardToLoad) {
                setText(cardToLoad.content);
                setLoadedCardId(cardToLoad.id);
            }
        }
    }, [cardIdToOpen, getCardById]);
    
    useEffect(() => {
        if (!selectedGroupId || !groups.find(g => g.id === selectedGroupId)) {
            setSelectedGroupId(groups[0]?.id || '');
        }
    }, [groups, selectedGroupId]);


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

    const handleSaveOrUpdateCard = useCallback(() => {
        if (!text.trim()) return;
        
        if (loadedCardId) {
            updateCard(loadedCardId, text);
        } else {
            addCard(text, selectedGroupId);
        }
        
        setText('');
        setLoadedCardId(null);
    }, [text, loadedCardId, addCard, updateCard, selectedGroupId]);

    const handleLoadCard = (cardId: string, content: string) => {
        setText(content);
        setLoadedCardId(cardId);
        setIsCardsMenuOpen(false);
    };
    
    const handleNewCard = () => {
        setText('');
        setLoadedCardId(null);
    };

    const handleDeleteCardFromGroup = (cardId: string) => {
        if (cardId === loadedCardId) {
            handleNewCard();
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
                                onChange={e => setNewGroupName((e.target as HTMLInputElement).value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddGroup()}
                                className="flex-grow p-1 border-2 border-black bg-white text-black focus:outline-none rounded-sm"
                                placeholder="Group name..."
                            />
                            <button
                                onClick={handleAddGroup}
                                className="p-1 px-2 bg-white border-2 border-black active:bg-gray-200 rounded-sm"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2">
                        {groups.map(group => (
                            <div key={group.id} className="mb-4">
                                <h4 className="font-bold">{group.name}</h4>
                                {group.cardIds.length > 0 ? (
                                    <ul>
                                        {group.cardIds.map(cardId => {
                                            const card = getCardById(cardId);
                                            return (
                                                <li key={cardId} className="group text-sm p-1 my-1 bg-white border border-gray-300 flex items-center justify-between">
                                                    <button onClick={() => handleLoadCard(cardId, card?.content || '')} className="flex-grow text-left truncate">
                                                        {card?.content?.split('\n')[0] || 'Untitled Card'}
                                                    </button>
                                                    <select
                                                        value={group.id}
                                                        onChange={(e) => handleMoveCard(cardId, (e.target as HTMLSelectElement).value)}
                                                        className="mx-1 opacity-0 group-hover:opacity-100 bg-white border border-gray-300 rounded-sm"
                                                    >
                                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                    </select>
                                                    <button onClick={() => handleDeleteCardFromGroup(cardId)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100">✕</button>
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
                    onChange={e => setText((e.target as HTMLTextAreaElement).value)}
                    className="flex-grow w-full h-full p-4 text-base bg-transparent resize-none focus:outline-none"
                    placeholder="Start writing your card here..."
                />
                <div className="flex-shrink-0 p-2 border-t-2 border-gray-300 bg-gray-100 flex items-center space-x-2">
                    <button onClick={toggleCardsMenu} title="Toggle Library" className="p-2 bg-white border-2 border-black active:bg-gray-200"><FolderIconComponent className="w-5 h-5" /></button>
                     {loadedCardId === null && (
                        <div className="flex items-center space-x-1">
                            <label htmlFor="group-select" className="text-sm font-bold">Group:</label>
                            <select
                                id="group-select"
                                value={selectedGroupId}
                                onChange={e => setSelectedGroupId((e.target as HTMLSelectElement).value)}
                                className="p-1 bg-white border-2 border-black rounded-sm"
                            >
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button onClick={handleSaveOrUpdateCard} className="font-bold px-3 py-1 bg-white border-2 border-black active:bg-gray-200">{loadedCardId ? 'Update Card' : 'Save New Card'}</button>
                    {loadedCardId && <button onClick={handleNewCard} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">New Card</button>}
                    <div className="flex-grow"></div>
                    {isLoading && <LoadingSpinner />}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
            </div>
        </div>
    );
};