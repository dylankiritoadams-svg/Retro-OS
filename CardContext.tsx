import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import type { SavedCard, CardGroup, CardContextType } from './types';

const UNCATEGORIZED_ID = 'uncategorized';

const CardContext = createContext<CardContextType | undefined>(undefined);

export const useCards = (): CardContextType => {
    const context = useContext(CardContext);
    if (!context) {
        throw new Error('useCards must be used within a CardProvider');
    }
    return context;
};

interface CardProviderProps {
    children: ReactNode;
}

export const CardProvider: React.FC<CardProviderProps> = ({ children }) => {
    const [cards, setCards] = useState<SavedCard[]>([]);
    const [groups, setGroups] = useState<CardGroup[]>([
        { id: UNCATEGORIZED_ID, name: 'Uncategorized', cardIds: [] }
    ]);

    const getCardById = useCallback((id: string) => {
        return cards.find(c => c.id === id);
    }, [cards]);

    const addCard = useCallback((content: string) => {
        const newCard: SavedCard = {
            id: `card-${Date.now()}-${Math.random()}`,
            content,
        };
        setCards(prev => [...prev, newCard]);
        setGroups(prevGroups => 
            prevGroups.map(g => 
                g.id === UNCATEGORIZED_ID ? { ...g, cardIds: [newCard.id, ...g.cardIds] } : g
            )
        );
    }, []);

    const updateCard = useCallback((id: string, content: string) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, content } : c));
    }, []);

    const deleteCard = useCallback((id: string) => {
        setCards(prev => prev.filter(c => c.id !== id));
        setGroups(prev => 
            prev.map(g => ({ ...g, cardIds: g.cardIds.filter(cardId => cardId !== id) }))
        );
    }, []);

    const addGroup = useCallback((name: string) => {
        if (!name.trim() || groups.some(g => g.name.toLowerCase() === name.trim().toLowerCase())) return;
        const newGroup: CardGroup = {
            id: `group-${Date.now()}`,
            name: name.trim(),
            cardIds: [],
        };
        setGroups(prev => [...prev, newGroup]);
    }, [groups]);

    const deleteGroup = useCallback((id: string) => {
        if (id === UNCATEGORIZED_ID) return; // Cannot delete default group
        
        let cardIdsToMove: string[] = [];
        setGroups(prev => {
            const groupToDelete = prev.find(g => g.id === id);
            if (groupToDelete) {
                cardIdsToMove = groupToDelete.cardIds;
            }
            return prev.filter(g => g.id !== id);
        });

        if (cardIdsToMove.length > 0) {
            setGroups(prev =>
                prev.map(g => 
                    g.id === UNCATEGORIZED_ID ? { ...g, cardIds: [...g.cardIds, ...cardIdsToMove] } : g
                )
            );
        }
    }, []);
    
    const moveCardToGroup = useCallback((cardId: string, targetGroupId: string) => {
        let sourceGroupId: string | null = null;
        for (const group of groups) {
            if (group.cardIds.includes(cardId)) {
                sourceGroupId = group.id;
                break;
            }
        }
        
        if (!sourceGroupId || sourceGroupId === targetGroupId) return;

        setGroups(prev => {
            const newGroups = [...prev];
            const sourceGroup = newGroups.find(g => g.id === sourceGroupId)!;
            const targetGroup = newGroups.find(g => g.id === targetGroupId)!;
            
            sourceGroup.cardIds = sourceGroup.cardIds.filter(id => id !== cardId);
            targetGroup.cardIds.unshift(cardId);
            
            return newGroups;
        });
    }, [groups]);


    const value: CardContextType = {
        cards,
        groups,
        getCardById,
        addCard,
        updateCard,
        deleteCard,
        addGroup,
        deleteGroup,
        moveCardToGroup,
    };

    return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
};