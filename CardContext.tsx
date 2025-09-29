import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { SavedCard, CardGroup, CardContextType } from './types';

const UNCATEGORIZED_ID = 'uncategorized';
const CARDS_STORAGE_KEY = 'retro_os_cards_state';

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
    const [cards, setCards] = useState<SavedCard[]>(() => {
        try {
            const state = localStorage.getItem(CARDS_STORAGE_KEY);
            return state ? JSON.parse(state).cards : [];
        } catch { return []; }
    });

    const [groups, setGroups] = useState<CardGroup[]>(() => {
        try {
            const state = localStorage.getItem(CARDS_STORAGE_KEY);
            return state ? JSON.parse(state).groups : [{ id: UNCATEGORIZED_ID, name: 'Uncategorized', cardIds: [] }];
        } catch {
            return [{ id: UNCATEGORIZED_ID, name: 'Uncategorized', cardIds: [] }];
        }
    });

    useEffect(() => {
        try {
            const stateToSave = { cards, groups };
            localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Error saving card state:", e);
        }
    }, [cards, groups]);


    const getCardById = useCallback((id: string) => {
        return cards.find(c => c.id === id);
    }, [cards]);

    const addCard = useCallback((content: string, groupId: string = UNCATEGORIZED_ID) => {
        const newCard: SavedCard = {
            id: `card-${Date.now()}-${Math.random()}`,
            content,
        };
        setCards(prev => [...prev, newCard]);
        setGroups(prevGroups => {
             // Ensure the target group exists, otherwise default to Uncategorized
            const groupExists = prevGroups.some(g => g.id === groupId);
            const targetGroupId = groupExists ? groupId : UNCATEGORIZED_ID;

            return prevGroups.map(g => 
                g.id === targetGroupId ? { ...g, cardIds: [newCard.id, ...g.cardIds] } : g
            );
        });
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
