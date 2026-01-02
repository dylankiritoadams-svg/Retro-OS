
import React, { useState, useCallback, useEffect } from 'react';
import { getWriterSuggestion, proofreadText } from '../../services/geminiService';
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


    const handleGeminiAction = useCallback(async (action: 'continue' | 'title' | 'improve' | 'proofread') => {
        setIsLoading(true);
        setError(null);
        
        try {
            if (action === 'proofread') {
                const result = await proofreadText(text);
                setText(result);
            } else {
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
                const result = await getWriterSuggestion(prompt);
                if (action === 'continue') {
                    setText(prev => prev + (prev.endsWith('\n') || prev.length === 0 ? '' : '\n\n') + result);
                } else if (action === 'title') {
                     setText(prev => `Title: ${result}\n\n` + prev);
                } else {
                    setText(result);
                }
            }
        } catch (e) {
            console.error(e);
            setError('Failed to get AI response.');
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
        globalEmitter.emit('cards:updated');
    }, [text, loadedCardId, addCard, updateCard, selectedGroupId]);

    const handleLoadCard = (cardId: string, content: string) => {
        setText(content);
        setLoadedCardId(cardId);
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
            'cards:ai:proofread': () => handleGeminiAction('proofread'),
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
        <div className="w-full h-full flex bg-white text-black font-[var(--main-font)]">
            <div className="flex-grow flex flex-col relative">
                <textarea
                    value={text}
                    spellCheck="true"
                    onChange={e => setText((e.target as HTMLTextAreaElement).value)}
                    className="flex-grow w-full h-full p-4 text-base bg-transparent resize-none focus:outline-none"
                    placeholder="Start writing your card here..."
                />
                <div className="flex-shrink-0 p-1 border-t-2 border-black bg-gray-100 flex items-center space-x-2">
                    <button onClick={toggleCardsMenu} title="Toggle Library" className={`p-1 border-2 border-black active:bg-black active:text-white ${isCardsMenuOpen ? 'bg-black text-white' : 'bg-white'}`}>
                        <FolderIconComponent className="w-5 h-5" />
                    </button>
                     {loadedCardId === null && (
                        <div className="flex items-center space-x-1">
                            <label htmlFor="group-select" className="text-xs font-bold">Group:</label>
                            <select
                                id="group-select"
                                value={selectedGroupId}
                                onChange={e => setSelectedGroupId((e.target as HTMLSelectElement).value)}
                                className="p-1 bg-white border-2 border-black rounded-none text-xs"
                            >
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button onClick={handleSaveOrUpdateCard} className="font-bold px-3 py-1 bg-white border-2 border-black active:bg-black active:text-white text-xs uppercase tracking-wide">
                        {loadedCardId ? 'Update' : 'Save'}
                    </button>
                    {loadedCardId && <button onClick={handleNewCard} className="px-3 py-1 bg-white border-2 border-black active:bg-black active:text-white text-xs uppercase tracking-wide">New</button>}
                    <div className="flex-grow"></div>
                    {isLoading && <span className="text-[10px] uppercase font-bold animate-pulse">Analyzing...</span>}
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                </div>
            </div>
            
            {isCardsMenuOpen && (
                <div className="w-64 h-full border-l-2 border-black flex flex-col flex-shrink-0 bg-white">
                    <div className="h-6 border-b-2 border-black bg-white flex items-center justify-center classic-title-bar-active">
                        <span className="font-bold text-xs uppercase tracking-widest bg-white px-2">Library</span>
                    </div>

                    <div className="p-2 border-b-2 border-black bg-white">
                        <div className="flex space-x-1">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName((e.target as HTMLInputElement).value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddGroup()}
                                className="flex-grow p-1 border-2 border-black bg-white text-black focus:outline-none text-xs rounded-none"
                                placeholder="NEW GROUP..."
                            />
                            <button
                                onClick={handleAddGroup}
                                className="p-1 px-2 bg-white border-2 border-black active:bg-black active:text-white rounded-none text-xs font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2 bg-gray-50">
                        {groups.map(group => (
                            <div key={group.id} className="mb-3">
                                <div className="flex justify-between items-center mb-1 border-b border-black pb-0.5">
                                    <h4 className="font-bold text-xs uppercase">{group.name}</h4>
                                    {group.id !== 'uncategorized' && (
                                        <button onClick={() => deleteGroup(group.id)} className="text-[10px] hover:bg-black hover:text-white px-1 font-bold">X</button>
                                    )}
                                </div>
                                {group.cardIds.length > 0 ? (
                                    <ul className="space-y-1">
                                        {group.cardIds.map(cardId => {
                                            const card = getCardById(cardId);
                                            return (
                                                <li key={cardId} className="group relative border border-black bg-white hover:bg-gray-200 transition-colors">
                                                    <button onClick={() => handleLoadCard(cardId, card?.content || '')} className="text-left w-full p-1.5 text-xs block h-full">
                                                        <span className="line-clamp-2">{card?.content || 'Untitled Card'}</span>
                                                    </button>
                                                    <div className="absolute top-0 right-0 bottom-0 bg-white border-l border-black flex flex-col justify-between p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-6">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCardFromGroup(cardId); }} 
                                                            className="text-[10px] font-bold hover:text-red-600 leading-none h-1/2 flex items-center justify-center hover:bg-black"
                                                            title="Delete"
                                                        >
                                                            ✕
                                                        </button>
                                                        <div className="h-px bg-black w-full"></div>
                                                        <select
                                                            value={group.id}
                                                            onChange={(e) => { e.stopPropagation(); handleMoveCard(cardId, (e.target as HTMLSelectElement).value); }}
                                                            className="text-[9px] bg-white h-1/2 w-full appearance-none text-center cursor-pointer hover:bg-black hover:text-white outline-none"
                                                            title="Move to group"
                                                        >
                                                            {groups.map(g => <option key={g.id} value={g.id}>→</option>)}
                                                        </select>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="border border-dashed border-gray-400 p-2 text-center">
                                        <p className="text-[10px] text-gray-500 uppercase">Empty</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
