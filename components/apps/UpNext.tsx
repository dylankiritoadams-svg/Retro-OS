
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useMedia } from '../../MediaContext';
import { MediaCategory, MediaItem } from '../../types';
import { format, parseISO, differenceInDays, addDays, startOfDay, isAfter } from 'date-fns';
import { searchMedia, MediaSuggestion } from '../../services/mediaSearchService';

const CATEGORIES: MediaCategory[] = ['Anime', 'TV', 'Film', 'Books', 'Comics', 'Games'];

export const UpNext: React.FC = () => {
    const { mediaItems, addMediaItem, updateMediaItem, deleteMediaItem, toggleMediaCompleted, reorderMediaItems } = useMedia();
    const [activeTab, setActiveTab] = useState<'lists' | 'tracker'>('lists');
    const [selectedCategory, setSelectedCategory] = useState<MediaCategory>('Anime');
    
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newPoster, setNewPoster] = useState('');
    
    const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef<number | null>(null);

    const currentCategoryItems = useMemo(() => {
        return mediaItems
            .filter(i => i.category === selectedCategory)
            .sort((a, b) => a.order - b.order);
    }, [mediaItems, selectedCategory]);

    const activeItems = useMemo(() => currentCategoryItems.filter(i => !i.isCompleted), [currentCategoryItems]);
    const upNextItems = useMemo(() => activeItems.slice(0, 5), [activeItems]);
    const backlogItems = useMemo(() => activeItems.slice(5), [activeItems]);
    const archivedItems = useMemo(() => currentCategoryItems.filter(i => i.isCompleted), [currentCategoryItems]);

    const upcomingReleases = useMemo(() => {
        const now = startOfDay(new Date());
        return mediaItems
            .filter(i => i.releaseDate && isAfter(parseISO(i.releaseDate), now))
            .sort((a, b) => a.releaseDate!.localeCompare(b.releaseDate!));
    }, [mediaItems]);

    useEffect(() => {
        if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
        
        if (newTitle.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsSearching(true);
        searchTimeout.current = window.setTimeout(async () => {
            const results = await searchMedia(selectedCategory, newTitle);
            setSuggestions(results);
            setIsSearching(false);
        }, 500);
    }, [newTitle, selectedCategory]);

    const handleSelectSuggestion = (s: MediaSuggestion) => {
        setNewTitle(s.title);
        if (s.releaseDate) setNewDate(s.releaseDate);
        if (s.posterUrl) setNewPoster(s.posterUrl);
        setSuggestions([]);
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        addMediaItem({
            title: newTitle.trim(),
            category: selectedCategory,
            releaseDate: newDate || undefined,
            posterUrl: newPoster || undefined,
            isCompleted: false
        });
        setNewTitle('');
        setNewDate('');
        setNewPoster('');
        setSuggestions([]);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/media-id', id);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/media-id');
        if (!draggedId) return;

        const itemIds = currentCategoryItems.map(i => i.id);
        const currentIndex = itemIds.indexOf(draggedId);
        if (currentIndex === -1) return;

        const newIds = [...itemIds];
        newIds.splice(currentIndex, 1);
        newIds.splice(targetIndex, 0, draggedId);
        reorderMediaItems(selectedCategory, newIds);
    };

    return (
        <div className="w-full h-full flex flex-col bg-white text-black font-[var(--main-font)] overflow-hidden">
            <div className="flex bg-gray-200 border-b border-black">
                <button 
                    onClick={() => setActiveTab('lists')}
                    className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'lists' ? 'bg-white border-r border-black' : 'hover:bg-gray-300'}`}
                >Organize Lists</button>
                <button 
                    onClick={() => setActiveTab('tracker')}
                    className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'tracker' ? 'bg-white border-l border-black' : 'hover:bg-gray-300'}`}
                >Release Tracker</button>
            </div>

            {activeTab === 'lists' ? (
                <div className="flex flex-grow overflow-hidden">
                    <div className="w-32 border-r border-black bg-gray-50 flex flex-col overflow-y-auto">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setSelectedCategory(cat); setNewTitle(''); setSuggestions([]); }}
                                className={`p-3 text-left text-[10px] font-bold uppercase border-b border-gray-300 transition-colors ${selectedCategory === cat ? 'bg-black text-white' : 'hover:bg-gray-200'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex-grow flex flex-col overflow-hidden bg-white">
                        <div className="p-3 border-b border-black bg-gray-100 relative">
                            <form onSubmit={handleAddItem} className="flex gap-2">
                                <div className="flex-grow relative">
                                    <input 
                                        type="text" 
                                        value={newTitle} 
                                        onChange={e => setNewTitle(e.target.value)} 
                                        placeholder={`Search ${selectedCategory}...`}
                                        className="w-full p-1 border border-black text-xs outline-none"
                                    />
                                    {suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border-2 border-black z-50 shadow-[4px_4px_0px_black] max-h-48 overflow-y-auto">
                                            {suggestions.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleSelectSuggestion(s)}
                                                    className="w-full text-left p-1.5 border-b border-gray-200 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                                                >
                                                    {s.posterUrl && <img src={s.posterUrl} className="w-6 h-8 object-cover border border-black" alt="" />}
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase truncate">{s.title}</div>
                                                        <div className="text-[8px] text-gray-500 font-mono">{s.releaseDate?.split('-')[0] || 'TBA'}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="date" 
                                    value={newDate} 
                                    onChange={e => setNewDate(e.target.value)} 
                                    className="p-1 border border-black text-xs outline-none w-32"
                                />
                                <button type="submit" className="px-3 bg-black text-white text-[10px] font-bold uppercase">Add</button>
                            </form>
                        </div>

                        <div className="flex-grow overflow-y-auto p-3 space-y-4 custom-scrollbar">
                            <section>
                                <h3 className="text-[10px] font-bold uppercase text-blue-600 border-b border-blue-100 mb-2">Up Next (Priority)</h3>
                                <div className="space-y-1">
                                    {upNextItems.map((item, idx) => (
                                        <MediaRow 
                                            key={item.id} 
                                            item={item} 
                                            index={idx}
                                            onDragStart={handleDragStart}
                                            onDrop={handleDrop}
                                            onDelete={deleteMediaItem}
                                            onComplete={toggleMediaCompleted}
                                            isPriority
                                        />
                                    ))}
                                    {upNextItems.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4 border border-dashed border-gray-200">Priority list is empty</p>}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 mb-2">Backlog</h3>
                                <div className="space-y-1">
                                    {backlogItems.map((item, idx) => (
                                        <MediaRow 
                                            key={item.id} 
                                            item={item} 
                                            index={idx + 5}
                                            onDragStart={handleDragStart}
                                            onDrop={handleDrop}
                                            onDelete={deleteMediaItem}
                                            onComplete={toggleMediaCompleted}
                                        />
                                    ))}
                                </div>
                            </section>

                            {archivedItems.length > 0 && (
                                <section className="pt-6">
                                    <h3 className="text-[10px] font-bold uppercase text-gray-300 border-b border-gray-100 mb-2">Completed Archive</h3>
                                    <div className="space-y-1 opacity-60">
                                        {archivedItems.map((item, idx) => (
                                            <MediaRow 
                                                key={item.id} 
                                                item={item} 
                                                index={idx}
                                                onDelete={deleteMediaItem}
                                                onComplete={toggleMediaCompleted}
                                                isArchived
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-white custom-scrollbar">
                    <section>
                        <h2 className="text-sm font-bold uppercase border-b-2 border-black mb-4 flex justify-between">
                            Upcoming Releases
                            <span className="text-[10px] font-normal text-gray-400">Chronological</span>
                        </h2>
                        <div className="space-y-2">
                            {upcomingReleases.map(item => {
                                const daysLeft = differenceInDays(parseISO(item.releaseDate!), startOfDay(new Date()));
                                return (
                                    <div key={item.id} className="p-3 border-2 border-black bg-gray-50 flex items-center justify-between group hover:bg-white transition-colors">
                                        <div className="flex items-center space-x-4">
                                            {item.posterUrl && <img src={item.posterUrl} className="w-10 h-14 object-cover border border-black shadow-[2px_2px_0px_black]" alt="" />}
                                            <div>
                                                <span className="text-[8px] font-bold uppercase bg-black text-white px-1.5 py-0.5">{item.category}</span>
                                                <div className="text-xs font-bold uppercase mt-1">{item.title}</div>
                                                <div className="text-[9px] text-gray-500 font-mono">{format(parseISO(item.releaseDate!), 'MMM d, yyyy')}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-bold ${daysLeft <= 7 ? 'text-red-500' : 'text-black'}`}>
                                                {daysLeft} {daysLeft === 1 ? 'DAY' : 'DAYS'}
                                            </div>
                                            <div className="text-[8px] uppercase text-gray-400">until release</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

const MediaRow: React.FC<{ 
    item: MediaItem; 
    index: number; 
    onDragStart?: (e: React.DragEvent, id: string) => void;
    onDrop?: (e: React.DragEvent, index: number) => void;
    onDelete: (id: string) => void;
    onComplete: (id: string) => void;
    isPriority?: boolean;
    isArchived?: boolean;
}> = ({ item, index, onDragStart, onDrop, onDelete, onComplete, isPriority, isArchived }) => {
    return (
        <div
            draggable={!!onDragStart}
            onDragStart={(e) => onDragStart?.(e, item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop?.(e, index)}
            className={`flex items-center group p-2 border border-black transition-all ${isArchived ? 'bg-gray-100' : 'cursor-grab active:cursor-grabbing hover:shadow-[2px_2px_0px_black]'} ${isPriority ? 'bg-white border-l-4' : 'bg-gray-50'}`}
        >
            <button 
                onClick={() => onComplete(item.id)}
                className={`mr-3 w-5 h-5 border-2 border-black flex items-center justify-center transition-colors ${item.isCompleted ? 'bg-black text-white' : 'bg-white hover:bg-gray-200'}`}
            >
                {item.isCompleted && <span className="text-[10px] font-bold">✓</span>}
            </button>
            
            <div className="mr-3 text-[10px] text-gray-300 font-mono w-4">{(index + 1).toString().padStart(2, '0')}</div>
            
            {item.posterUrl ? (
                <img src={item.posterUrl} className="w-6 h-8 object-cover border border-black mr-3" alt="" />
            ) : (
                <div className="w-6 h-8 border border-dashed border-gray-300 mr-3 flex items-center justify-center text-[8px] text-gray-300">?</div>
            )}

            <div className="flex-grow min-w-0">
                <div className={`text-xs font-bold truncate uppercase ${item.isCompleted ? 'line-through text-gray-400' : ''}`}>{item.title}</div>
                {item.releaseDate && (
                    <div className="text-[8px] text-gray-400 font-mono">{format(parseISO(item.releaseDate), 'yyyy-MM-dd')}</div>
                )}
            </div>
            <button 
                onClick={() => onDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 px-2 font-bold transition-opacity"
            >×</button>
        </div>
    );
};
