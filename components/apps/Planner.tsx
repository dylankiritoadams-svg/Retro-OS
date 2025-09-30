

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { Task, SubTask, Repeatable, RepeatableType, RepeatableFrequency } from '../../types';
import {
    format,
    startOfWeek,
    addDays,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    getDay,
    parseISO,
    setHours,
    setMinutes,
    addMinutes,
    differenceInMinutes
} from 'date-fns';
import { useApp } from '../../types';

interface AppProps {
    isActive: boolean;
    instanceId: string;
}

const HOUR_HEIGHT = 48; // pixels per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// --- Sub-components ---

const RepeatablesModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { repeatables, addRepeatable, updateRepeatable, deleteRepeatable } = useTaskPlanner();
    const [newRepeatable, setNewRepeatable] = useState<Omit<Repeatable, 'id'>>({ title: '', type: 'Task', frequency: 'weekly', defaultDuration: 60, color: '#a2d2ff' });

    const handleAdd = () => {
        if (newRepeatable.title.trim()) {
            addRepeatable(newRepeatable);
            setNewRepeatable({ title: '', type: 'Task', frequency: 'weekly', defaultDuration: 60, color: '#a2d2ff' });
        }
    };

    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
            <div className="w-[500px] bg-white border-2 border-black classic-window">
                <div className="classic-title-bar classic-title-bar-active">
                    <div className="classic-close-box" onMouseDown={onClose}></div>
                    <h2 className="flex-grow text-center truncate">Manage Repeatables</h2>
                </div>
                <div className="p-4">
                    <div className="max-h-64 overflow-y-auto mb-4 border-2 border-black p-2">
                        {repeatables.map(r => (
                            <div key={r.id} className="flex items-center justify-between p-1 border-b">
                                <span>{r.title} ({r.frequency})</span>
                                <button onClick={() => deleteRepeatable(r.id)} className="text-red-500 font-bold">X</button>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2 border-2 border-black">
                        <input type="text" placeholder="Title" value={newRepeatable.title} onChange={e => setNewRepeatable({...newRepeatable, title: e.target.value})} className="col-span-2 p-1 border-2 border-black" />
                        <select value={newRepeatable.type} onChange={e => setNewRepeatable({...newRepeatable, type: e.target.value as RepeatableType})} className="p-1 border-2 border-black">
                            <option>Task</option><option>Payment</option><option>Activity</option><option>Reminder</option>
                        </select>
                        <select value={newRepeatable.frequency} onChange={e => setNewRepeatable({...newRepeatable, frequency: e.target.value as RepeatableFrequency})} className="p-1 border-2 border-black">
                            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                        </select>
                        <input type="number" placeholder="Duration (mins)" value={newRepeatable.defaultDuration} onChange={e => setNewRepeatable({...newRepeatable, defaultDuration: parseInt(e.target.value) || 30})} className="p-1 border-2 border-black" />
                        <input type="color" value={newRepeatable.color} onChange={e => setNewRepeatable({...newRepeatable, color: e.target.value})} className="p-1 border-2 border-black" />
                        <button onClick={handleAdd} className="col-span-2 p-1 bg-white border-2 border-black active:bg-black active:text-white">Add Repeatable</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- The main Planner App ---

export const Planner: React.FC<AppProps> = () => {
    const { tasks, addTask, updateTask } = useTaskPlanner();
    const { openApp } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    
    const [showRepeatables, setShowRepeatables] = useState(false);
    
    const [quickAddState, setQuickAddState] = useState<{ date: Date; top: number } | null>(null);
    const [quickAddTitle, setQuickAddTitle] = useState('');

    const [dragState, setDragState] = useState<{ id: string; startY: number; startMinutes: number; } | null>(null);
    const [resizeState, setResizeState] = useState<{ id: string; startY: number; startDuration: number; } | null>(null);

    const week = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const month = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }), [currentDate]);
    const day = useMemo(() => currentDate, [currentDate]);
    
    const changeDate = (delta: number) => {
        const newDate = new Date(currentDate);
        if (view === 'weekly') newDate.setDate(newDate.getDate() + delta * 7);
        else if (view === 'monthly') newDate.setMonth(newDate.getMonth() + delta);
        else if (view === 'daily') newDate.setDate(newDate.getDate() + delta);
        setCurrentDate(newDate);
    };

    const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && quickAddTitle.trim() && quickAddState) {
            const minutesFromTop = (quickAddState.top / HOUR_HEIGHT) * 60;
            const hour = Math.floor(minutesFromTop / 60);
            const minute = minutesFromTop % 60;
            const startTime = setMinutes(setHours(quickAddState.date, hour), minute);
            
            addTask({
                title: quickAddTitle.trim(),
                description: '',
                subTasks: [],
                startTime: startTime.toISOString(),
                duration: 30, // Default duration for quick add
            });
            setQuickAddState(null);
            setQuickAddTitle('');
        }
    };
    
    const handleDragStart = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        const startMinutes = parseISO(task.startTime).getHours() * 60 + parseISO(task.startTime).getMinutes();
        setDragState({ id: task.id, startY: e.clientY, startMinutes });
    };

    const handleResizeStart = (e: React.MouseEvent, task: Task) => {
        e.stopPropagation();
        setResizeState({ id: task.id, startY: e.clientY, startDuration: task.duration });
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragState) {
            const dy = e.clientY - dragState.startY;
            const minuteChange = Math.round((dy / HOUR_HEIGHT) * 60 / 15) * 15; // Snap to 15 mins
            const task = tasks.find(t => t.id === dragState.id)!;
            const newStartTime = addMinutes(parseISO(task.startTime), minuteChange + dragState.startMinutes - (parseISO(task.startTime).getHours() * 60 + parseISO(task.startTime).getMinutes()));
            updateTask(dragState.id, { startTime: newStartTime.toISOString() });
        }
        if (resizeState) {
            const dy = e.clientY - resizeState.startY;
            const minuteChange = Math.round((dy / HOUR_HEIGHT) * 60 / 15) * 15;
            const newDuration = Math.max(15, resizeState.startDuration + minuteChange);
            updateTask(resizeState.id, { duration: newDuration });
        }
    };

    const handleMouseUp = (e: React.MouseEvent, day?: Date) => {
         if (dragState && day) {
            const task = tasks.find(t => t.id === dragState.id)!;
            const oldDate = parseISO(task.startTime);
            const newDate = new Date(day);
            newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds(), oldDate.getMilliseconds());
            updateTask(dragState.id, { startTime: newDate.toISOString() });
        }
        setDragState(null);
        setResizeState(null);
    };

    const headerText = useMemo(() => {
        if (view === 'weekly') return `${format(week, 'MMM yyyy')}`;
        if (view === 'monthly') return format(currentDate, 'MMMM yyyy');
        if (view === 'daily') return format(day, 'eeee, MMMM d, yyyy');
        return '';
    }, [view, currentDate, week, day]);

    const renderWeeklyView = () => (
        <div className="flex-grow grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr]">
            {/* Time Column */}
            <div className="text-right pr-2 text-xs">
                {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="relative -top-2 border-r border-gray-300">
                        {hour > 0 && `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`}
                    </div>
                ))}
            </div>
            {/* Day Columns */}
            {Array.from({ length: 7 }).map((_, i) => {
                const currentDay = addDays(week, i);
                return (
                    <div
                        key={i}
                        className="border-r border-gray-300 relative"
                        onMouseUp={(e) => handleMouseUp(e, currentDay)}
                        onDoubleClick={(e) => {
                            if (quickAddState || dragState || resizeState) return;
                             const target = e.target as HTMLElement;
                            if (target.closest('[data-task-id]')) {
                                return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const top = e.clientY - rect.top;
                            setQuickAddState({ date: currentDay, top });
                        }}
                    >
                        {HOURS.map(hour => (
                            <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-gray-300" />
                        ))}
                        {tasks.filter(task => isSameDay(parseISO(task.startTime), currentDay)).map(task => {
                            const taskDate = parseISO(task.startTime);
                            const top = (taskDate.getHours() + taskDate.getMinutes() / 60) * HOUR_HEIGHT;
                            const height = (task.duration / 60) * HOUR_HEIGHT;
                            return (
                                <div
                                    key={task.id}
                                    data-task-id={task.id}
                                    className="absolute left-1 right-1 p-1 text-xs overflow-hidden classic-window"
                                    style={{ top: `${top}px`, height: `${height}px`, backgroundColor: task.color }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        openApp('task-details', { taskId: task.id });
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="w-full h-4 bg-white bg-opacity-50 cursor-move classic-title-bar-active" onMouseDown={e => handleDragStart(e, task)}>
                                        <p className="font-bold truncate">{task.title}</p>
                                    </div>
                                    <p className="pt-1">{task.description}</p>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize classic-resize-handle" onMouseDown={e => handleResizeStart(e, task)}></div>
                                </div>
                            );
                        })}
                        {quickAddState && isSameDay(quickAddState.date, currentDay) && (
                            <div className="absolute left-1 right-1" style={{ top: `${quickAddState.top}px` }}>
                                <input
                                    type="text"
                                    autoFocus
                                    value={quickAddTitle}
                                    onChange={(e) => setQuickAddTitle(e.target.value)}
                                    onKeyDown={handleQuickAdd}
                                    onBlur={() => { setQuickAddState(null); setQuickAddTitle(''); }}
                                    className="w-full text-xs p-1 border-2 border-black bg-white"
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
    
    const renderDailyView = () => (
         <div className="flex-grow grid grid-cols-[auto,1fr]">
            {/* Time Column */}
            <div className="text-right pr-2 text-xs">
                {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${HOUR_HEIGHT*2}px` }} className="relative -top-2 border-r border-gray-300">
                        {hour > 0 && `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`}
                    </div>
                ))}
            </div>
            {/* Day Column */}
            <div className="border-r border-gray-300 relative">
                {HOURS.map(hour => (
                    <div key={hour} style={{ height: `${HOUR_HEIGHT*2}px` }} className="border-b border-gray-300" />
                ))}
                {tasks.filter(task => isSameDay(parseISO(task.startTime), day)).map(task => {
                    const taskDate = parseISO(task.startTime);
                    const top = (taskDate.getHours() + taskDate.getMinutes() / 60) * HOUR_HEIGHT*2;
                    const height = (task.duration / 60) * HOUR_HEIGHT*2;
                    return (
                        <div key={task.id} className="absolute left-1 right-1 p-1 text-xs overflow-hidden classic-window" style={{ top: `${top}px`, height: `${height}px`, backgroundColor: task.color }} onDoubleClick={() => openApp('task-details', { taskId: task.id })}>
                            <p className="font-bold">{task.title}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderMonthlyView = () => (
        <div className="flex-grow grid grid-cols-7 grid-rows-6">
            {month.map(day => {
                const isCurrent = isSameMonth(day, currentDate);
                return (
                    <div key={day.toISOString()} className={`border border-black p-1 ${isCurrent ? 'bg-white' : 'bg-gray-300'}`} onClick={() => { setCurrentDate(day); setView('daily'); }}>
                        <span className={`text-sm ${isSameDay(day, new Date()) ? 'bg-black text-white rounded-full px-1' : ''}`}>{format(day, 'd')}</span>
                        <div className="text-xs overflow-hidden h-12">
                            {tasks.filter(task => isSameDay(parseISO(task.startTime), day)).map(task => (
                                <div key={task.id} className="truncate" style={{backgroundColor: task.color}}>{task.title}</div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-white text-black font-mono select-none" onMouseMove={handleMouseMove} onMouseUp={(e) => handleMouseUp(e)}>
            {showRepeatables && <RepeatablesModal onClose={() => setShowRepeatables(false)} />}
            
            <header className="flex-shrink-0 p-1 border-b-2 border-black flex justify-between items-center">
                <div className="flex items-center">
                    <button onClick={() => changeDate(-1)} className="p-1 border-2 border-black active:bg-black active:text-white">◀</button>
                    <button onClick={() => setCurrentDate(new Date())} className="p-1 border-y-2 border-black active:bg-black active:text-white">Today</button>
                    <button onClick={() => changeDate(1)} className="p-1 border-2 border-black active:bg-black active:text-white">▶</button>
                    <h2 className="font-bold text-lg ml-4">{headerText}</h2>
                </div>
                <div className="flex items-center">
                    <button onClick={() => setShowRepeatables(true)} className="p-1 border-2 border-black active:bg-black active:text-white text-sm">Repeatables</button>
                    <div className="mx-2 w-px h-5 bg-black"></div>
                    <button onClick={() => setView('daily')} className={`p-1 border-2 border-black text-sm ${view === 'daily' ? 'bg-black text-white' : ''}`}>Day</button>
                    <button onClick={() => setView('weekly')} className={`p-1 border-y-2 border-r-2 border-black text-sm ${view === 'weekly' ? 'bg-black text-white' : ''}`}>Week</button>
                    <button onClick={() => setView('monthly')} className={`p-1 border-y-2 border-r-2 border-black text-sm ${view === 'monthly' ? 'bg-black text-white' : ''}`}>Month</button>
                </div>
            </header>
            
            {view === 'weekly' && (
                <div className="flex-grow flex flex-col min-h-0">
                    <div className="grid grid-cols-[auto,1fr,1fr,1fr,1fr,1fr,1fr,1fr] sticky top-0 bg-white z-10 border-b-2 border-black">
                        <div className="w-16"></div>
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="text-center font-bold p-1 border-r">
                                {format(addDays(week, i), 'eee d')}
                            </div>
                        ))}
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {renderWeeklyView()}
                    </div>
                </div>
            )}
             {view === 'daily' && renderDailyView()}
             {view === 'monthly' && (
                <div className="flex-grow flex flex-col min-h-0">
                    <div className="grid grid-cols-7 sticky top-0 bg-white z-10 border-b-2 border-black">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="text-center font-bold p-1 border-r">{day}</div>
                        ))}
                    </div>
                    {renderMonthlyView()}
                </div>
            )}
        </div>
    );
};