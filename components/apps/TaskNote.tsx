
import React, { useState, useEffect, useMemo } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { EventCategory, Task } from '../../types';
import { format, isSameDay, parseISO, addMinutes, differenceInSeconds } from 'date-fns';

interface AppProps {
    isActive: boolean;
    instanceId: string;
}

const CATEGORY_ACCENTS: Record<EventCategory, string> = {
    'Work': '#ef4444', 'Personal': '#3b82f6', 'Media': '#10b981', 'Appointment': '#f59e0b', 
};

const CATEGORY_PASTELS: Record<EventCategory, string> = {
    'Work': '#fee2e2', 'Personal': '#eff6ff', 'Media': '#f0fdf4', 'Appointment': '#fffbeb', 
};

const CountdownTimer: React.FC<{ targetDate: Date; label: string; isEnding?: boolean }> = ({ targetDate, label, isEnding }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const diff = differenceInSeconds(targetDate, now);
    if (diff <= 0) return <span className="text-gray-400">Time up!</span>;

    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;

    const timeStr = `${hours > 0 ? hours + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return (
        <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase text-gray-400 font-bold leading-none">{label}</span>
            <span className={`font-mono text-xs font-bold ${isEnding ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                {timeStr}
            </span>
        </div>
    );
};

export const TaskNote: React.FC<AppProps> = () => {
    const { tasks, addTask } = useTaskPlanner();
    const [view, setView] = useState<'create' | 'today'>('today');
    
    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<EventCategory>('Work');
    const [duration, setDuration] = useState(30);
    const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [isLocked, setIsLocked] = useState(false);
    const [assignTime, setAssignTime] = useState(true);

    const todayTasks = useMemo(() => {
        const now = new Date();
        return tasks
            .filter(t => t.startTime && isSameDay(parseISO(t.startTime), now))
            .sort((a, b) => a.startTime!.localeCompare(b.startTime!));
    }, [tasks]);

    const unassignedTasks = useMemo(() => {
        return tasks.filter(t => !t.startTime && !t.isComplete);
    }, [tasks]);

    const handleCreate = () => {
        if (!title.trim()) return;
        addTask({
            title,
            category,
            duration,
            startTime: assignTime ? new Date(startTime).toISOString() : undefined,
            isLocked,
            color: CATEGORY_PASTELS[category],
            description: 'Created via TaskNote',
            subTasks: []
        });
        setTitle('');
        setView('today');
    };

    return (
        <div className="w-full h-full flex flex-col bg-white text-black font-[var(--main-font)] overflow-hidden border-t border-black">
            {/* Tabs */}
            <div className="flex bg-gray-200 border-b border-black flex-shrink-0">
                <button 
                    onClick={() => setView('today')} 
                    className={`flex-1 py-1 text-[10px] font-bold uppercase transition-all ${view === 'today' ? 'bg-white border-r border-black' : 'hover:bg-gray-300 border-r border-gray-400'}`}
                >Schedule</button>
                <button 
                    onClick={() => setView('create')} 
                    className={`flex-1 py-1 text-[10px] font-bold uppercase transition-all ${view === 'create' ? 'bg-white' : 'hover:bg-gray-300'}`}
                >New Event</button>
            </div>

            <div className="flex-grow overflow-y-auto p-3 custom-scrollbar">
                {view === 'create' ? (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Event Title</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Enter title..."
                                className="w-full p-2 border-2 border-black bg-white text-sm outline-none focus:ring-1 ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Category</label>
                                <select 
                                    value={category} 
                                    onChange={e => setCategory(e.target.value as EventCategory)}
                                    className="w-full p-2 border-2 border-black bg-white text-xs outline-none"
                                >
                                    {Object.keys(CATEGORY_ACCENTS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Length (min)</label>
                                <input 
                                    type="number" 
                                    value={duration} 
                                    onChange={e => setDuration(parseInt(e.target.value) || 0)}
                                    className="w-full p-2 border-2 border-black bg-white text-xs outline-none"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2 border-2 border-black p-2 bg-gray-50">
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="checkbox" 
                                    checked={assignTime} 
                                    onChange={e => setAssignTime(e.target.checked)}
                                    id="assign-time"
                                />
                                <label htmlFor="assign-time" className="text-[10px] font-bold uppercase cursor-pointer">Assign Specific Time</label>
                            </div>
                            
                            {assignTime && (
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Start Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={startTime} 
                                        onChange={e => setStartTime(e.target.value)}
                                        className="w-full p-1 border border-black bg-white text-[10px] outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2 bg-gray-50 p-2 border border-dashed border-gray-300">
                            <input 
                                type="checkbox" 
                                checked={isLocked} 
                                onChange={e => setIsLocked(e.target.checked)}
                                id="lock-event"
                            />
                            <label htmlFor="lock-event" className="text-[10px] font-bold uppercase cursor-pointer">Lock in schedule</label>
                        </div>
                        <button 
                            onClick={handleCreate}
                            disabled={!title.trim()}
                            className="w-full py-3 bg-black text-white font-bold text-sm uppercase shadow-[4px_4px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-30"
                        >
                            Log Event
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <section>
                            <h3 className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-200 mb-2">Today's Timeline</h3>
                            <div className="space-y-2">
                                {todayTasks.length === 0 ? (
                                    <p className="text-[10px] text-gray-300 italic text-center py-4">Nothing timed for today</p>
                                ) : (
                                    todayTasks.map(t => {
                                        const tStart = parseISO(t.startTime!);
                                        const tEnd = addMinutes(tStart, t.duration);
                                        const now = new Date();
                                        const isCurrent = now >= tStart && now < tEnd;
                                        const isPast = now >= tEnd;

                                        if (isPast) return null;

                                        return (
                                            <div 
                                                key={t.id} 
                                                className={`p-2 border-2 flex items-center justify-between transition-all ${isCurrent ? 'border-black bg-white scale-[1.02] shadow-md z-10' : 'border-gray-200 bg-gray-50/50'}`}
                                            >
                                                <div className="flex items-center min-w-0 mr-2">
                                                    <div className="w-1.5 h-6 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: CATEGORY_ACCENTS[t.category as EventCategory] || '#000' }} />
                                                    <div className="truncate">
                                                        <div className="text-[10px] font-bold truncate leading-tight uppercase">{t.title}</div>
                                                        <div className="text-[8px] text-gray-400 font-mono">{format(tStart, 'HH:mm')} - {format(tEnd, 'HH:mm')}</div>
                                                    </div>
                                                </div>
                                                {isCurrent ? (
                                                    <CountdownTimer targetDate={tEnd} label="REMAINING" isEnding />
                                                ) : (
                                                    <CountdownTimer targetDate={tStart} label="STARTS IN" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {unassignedTasks.length > 0 && (
                            <section>
                                <h3 className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-200 mb-2">Unassigned (Drag to Planner)</h3>
                                <div className="space-y-1">
                                    {unassignedTasks.map(t => (
                                        <div 
                                            key={t.id} 
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData('planner/task-id', t.id)}
                                            className="p-1.5 border border-black text-[9px] font-bold bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing flex items-center shadow-sm"
                                            style={{ borderLeft: `3px solid ${CATEGORY_ACCENTS[t.category as EventCategory] || '#000'}` }}
                                        >
                                            <span className="truncate">{t.title}</span>
                                            <span className="ml-auto text-[8px] text-gray-300 font-mono">{t.duration}m</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 4px; }
            `}</style>
        </div>
    );
};
