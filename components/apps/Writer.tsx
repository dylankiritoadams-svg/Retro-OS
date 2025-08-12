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
            addCard(text);
        }
        
        setText(''); // Clear writing space
        setLoadedCardId(null); // Reset loaded card state
    }, [text, loadedCardId, addCard, updateCard]);

    const handleLoadCard = (cardId: string, content: string) => {
        setText(content);
        setLoadedCardId(cardId);
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
            'writer:file:save': handleSaveOrUpdateCard,
            'writer:ai:continue': () => handleGeminiAction('continue'),
            'writer:ai:improve': () => handleGeminiAction('improve'),
            'writer:ai:title': () => handleGeminiAction('title'),
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
                    <div className="flex-grow overflow-y-auto">
                        {groups.map(group => (
                            <div key={group.id} className="border-b-2 border-gray-300 last:border-b-0">
                                <h4 className="p-2 font-bold bg-gray-100 sticky top-0">{group.name} ({group.cardIds.length})</h4>
                                {group.cardIds.length > 0 ? (
                                    <ul>
                                        {group.cardIds.map(cardId => {
                                            const card = getCardById(cardId);
                                            if (!card) return null;
                                            return (
                                                <li key={card.id} className="p-2 border-b border-gray-200 last:border-b-0">
                                                    <p
                                                        className="text-sm cursor-pointer mb-2 whitespace-pre-wrap"
                                                        style={{
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            minHeight: '3.6em',
                                                        }}
                                                        onClick={() => handleLoadCard(card.id, card.content)}
                                                        title="Click to load this card"
                                                    >
                                                        {card.content || 'Empty Card'}
                                                    </p>
                                                    <div className="flex justify-end items-center space-x-1">
                                                        <select
                                                            onChange={(e) => handleMoveCard(card.id, e.target.value)}
                                                            className="px-1 py-0.5 text-xs bg-white border-2 border-black rounded-sm active:bg-gray-200 focus:outline-none"
                                                            value={group.id}
                                                            title="Move to another group"
                                                        >
                                                            {groups.map(g => (
                                                                <option key={g.id} value={g.id}>{g.name}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleLoadCard(card.id, card.content)}
                                                            className="px-2 py-0.5 text-xs bg-white border-2 border-black rounded-sm active:bg-gray-200"
                                                        >
                                                            Load
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCardFromGroup(card.id)}
                                                            className="px-2 py-0.5 text-xs bg-white border-2 border-black rounded-sm active:bg-gray-200"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="p-4 text-center text-gray-500 text-xs">No cards in this group.</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="w-full h-full flex flex-col">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-grow w-full p-2 border-0 bg-white text-black resize-none focus:outline-none"
                    placeholder="Start writing your story here..."
                />
                {error && <div className="p-2 text-red-500 bg-red-100 border-t-2 border-red-200">{error}</div>}
                <div className="p-2 flex items-center justify-start space-x-2 border-t-2 border-gray-300 bg-gray-100 flex-wrap">
                    <button
                        onClick={toggleCardsMenu}
                        disabled={isLoading}
                        className="px-2 py-1 bg-white border-2 border-black rounded-md disabled:opacity-50 flex items-center justify-center h-8 w-8 active:bg-gray-200"
                        aria-label="Toggle saved cards menu"
                    >
                        <FolderIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleSaveOrUpdateCard}
                        disabled={isLoading || !text}
                        className="px-3 py-1 bg-white border-2 border-black rounded-md disabled:opacity-50 flex items-center justify-center h-8 active:bg-gray-200"
                    >
                        {loadedCardId ? 'Update Card' : 'Save Card'}
                    </button>
                    
                    <div className="h-6 w-px bg-gray-400 mx-2"></div>

                    <button
                        onClick={() => handleGeminiAction('continue')}
                        disabled={isLoading || !text}
                        className="px-3 py-1 bg-white border-2 border-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-8 active:bg-gray-200"
                    >
                        {isLoading ? <LoadingSpinner/> : 'Continue'}
                    </button>
                    <button
                        onClick={() => handleGeminiAction('improve')}
                        disabled={isLoading || !text}
                        className="px-3 py-1 bg-white border-2 border-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-8 active:bg-gray-200"
                    >
                        {isLoading ? <LoadingSpinner/> : 'Improve'}
                    </button>
                    <button
                        onClick={() => handleGeminiAction('title')}
                        disabled={isLoading || !text}
                        className="px-3 py-1 bg-white border-2 border-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-8 active:bg-gray-200"
                    >
                        {isLoading ? <LoadingSpinner/> : 'Suggest Title'}
                    </button>
                </div>
            </div>
        </div>
    );
};