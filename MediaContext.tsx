
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { MediaItem, MediaCategory, MediaContextType } from './types';

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export const useMedia = (): MediaContextType => {
    const context = useContext(MediaContext);
    if (!context) throw new Error('useMedia must be used within a MediaProvider');
    return context;
};

const STORAGE_KEY = 'retro_os_upnext_data';

export const MediaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mediaItems));
    }, [mediaItems]);

    const addMediaItem = useCallback((item: Omit<MediaItem, 'id' | 'order'>) => {
        setMediaItems(prev => {
            const categoryItems = prev.filter(i => i.category === item.category);
            const maxOrder = categoryItems.length > 0 ? Math.max(...categoryItems.map(i => i.order)) : -1;
            return [...prev, { ...item, id: `media-${Date.now()}`, order: maxOrder + 1, isCompleted: false }];
        });
    }, []);

    const updateMediaItem = useCallback((id: string, updates: Partial<MediaItem>) => {
        setMediaItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    }, []);

    const toggleMediaCompleted = useCallback((id: string) => {
        setMediaItems(prev => prev.map(item => 
            item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
        ));
    }, []);

    const deleteMediaItem = useCallback((id: string) => {
        setMediaItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const reorderMediaItems = useCallback((category: MediaCategory, newOrderIds: string[]) => {
        setMediaItems(prev => {
            const otherCategoryItems = prev.filter(item => item.category !== category);
            const categoryItems = prev.filter(item => item.category === category);
            const reordered = newOrderIds.map((id, index) => {
                const item = categoryItems.find(i => i.id === id);
                return item ? { ...item, order: index } : null;
            }).filter(Boolean) as MediaItem[];

            return [...otherCategoryItems, ...reordered];
        });
    }, []);

    return (
        <MediaContext.Provider value={{ mediaItems, addMediaItem, updateMediaItem, deleteMediaItem, toggleMediaCompleted, reorderMediaItems }}>
            {children}
        </MediaContext.Provider>
    );
};
