
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTaskPlanner } from '../TaskPlannerContext';
import { Task, EventCategory } from '../types';
import { 
    format, addDays, parseISO, addMinutes, isSameDay, 
    setHours, setMinutes, differenceInMinutes, startOfDay 
} from 'date-fns';

const CATEGORY_ACCENTS: Record<EventCategory, string> = {
    'Work': '#ef4444', 'Personal': '#3b82f6', 'Media': '#10b981', 'Appointment': '#f59e0b', 
};
const CATEGORY_PASTELS: Record<EventCategory, string> = {
    'Work': '#fee2e2', 'Personal': '#eff6ff', 'Media': '#f0fdf4', 'Appointment': '#fffbeb', 
};

const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SLOT_HEIGHT = 15;
const RULER_WIDTH = 40;
const COLUMN_WIDTH = 128;

export const PinBoardDayView: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const { tasks, addTask, updateTask, deleteTask } = useTaskPlanner();
    const [baseDate, setBaseDate] = useState(new Date());
    const [numDays, setNumDays] = useState(1);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Resizing/Dragging state
    const [interactionState, setInteractionState] = useState<{
        type: 'resize' | 'drag';
        id: string;
        startY: number;
        startDuration?: number;
        startMinutes?: number;
        dayIndex?: number;
    } | null>(null);

    const days = useMemo(() => 
        Array.from({ length: numDays }).map((_, i) => addDays(baseDate, i))
    , [baseDate, numDays]);

    const handleAddDay = () => {
        if (numDays < 3) {
            setNumDays(n => n + 1);
        } else {
            setBaseDate(d => addDays(d, 1));
        }
    };

    const handleCollapse = () => {
        setNumDays(1);
    };

    const handleGridDoubleClick = (e: React.MouseEvent, day: Date) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const slotsFromTop = Math.floor(y / SLOT_HEIGHT);
        const minutesFromStart = slotsFromTop * 30;

        let startTime = setHours(startOfDay(day), START_HOUR);
        startTime = addMinutes(startTime, minutesFromStart);

        const newTask = addTask({
            title: 'Quick Task',
            category: 'Personal',
            duration: 30,
            startTime: startTime.toISOString(),
            color: CATEGORY_PASTELS['Personal'],
            description: '',
            subTasks: []
        });
        setSelectedTaskId(newTask.id);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!interactionState) return;
        const { type, id, startY } = interactionState;
        const dy = e.clientY - startY;
        const slotsMoved = Math.round(dy / SLOT_HEIGHT);

        if (type === 'resize' && interactionState.startDuration !== undefined) {
            const newDuration = Math.max(30, interactionState.startDuration + slotsMoved * 30);
            updateTask(id, { duration: newDuration });
        } else if (type === 'drag' && interactionState.startMinutes !== undefined) {
            const task = tasks.find(t => t.id === id);
            if (!task || !task.startTime) return;
            const newMinutes = interactionState.startMinutes + slotsMoved * 30;
            let newTime = setHours(startOfDay(parseISO(task.startTime)), START_HOUR);
            newTime = addMinutes(newTime, newMinutes);
            updateTask(id, { startTime: newTime.toISOString() });
        }
    }, [interactionState, tasks, updateTask]);

    const handleMouseUp = useCallback(() => {
        setInteractionState(null);
    }, []);

    useEffect(() => {
        if (interactionState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [interactionState, handleMouseMove, handleMouseUp]);

    const selectedTask = tasks.find(t => t.id === selectedTaskId);
    const totalWidgetWidth = RULER_WIDTH + (numDays * COLUMN_WIDTH);

    return (
        <div 
            className="flex flex-col bg-white border-2 border-black shadow-[4px_4px_0px_black] max-h-[calc(100vh-80px)] overflow-hidden"
            style={{ width: `${totalWidgetWidth + 4}px` }} // +4 for borders
        >
            {/* Custom Header for the widget */}
            <div className="bg-black text-white p-1 flex justify-between items-center select-none h-6">
                <span className="text-[10px] font-bold uppercase tracking-widest pl-1">Planner Widget</span>
                {onClose && (
                    <button onClick={onClose} className="w-4 h-4 flex items-center justify-center hover:bg-red-600 transition-colors text-xs font-bold leading-none">×</button>
                )}
            </div>

            {/* Scrollable Viewport for the Grid */}
            <div className="overflow-y-auto custom-scrollbar flex flex-grow min-h-0 bg-white border-b border-black">
                {/* Time Ruler */}
                <div className="w-10 flex-shrink-0 bg-gray-100 border-r border-black select-none pt-8">
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                        <div key={i} style={{ height: SLOT_HEIGHT * 2 }} className="text-[8px] text-right pr-1 pt-0.5 text-gray-400 font-mono">
                            {START_HOUR + i}:00
                        </div>
                    ))}
                </div>

                <div className="flex">
                    {days.map((day, idx) => (
                        <div 
                            key={day.toISOString()} 
                            className="w-32 border-r border-black last:border-r-0 relative bg-white"
                            style={{ height: `${TOTAL_HOURS * SLOT_HEIGHT * 2 + 32}px` }}
                            onDoubleClick={(e) => handleGridDoubleClick(e, day)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={(e) => {
                                const taskId = e.dataTransfer.getData('application/retro-os-task-id');
                                if (taskId) {
                                    const task = tasks.find(t => t.id === taskId);
                                    if (task) {
                                        const oldTimeStr = task.startTime;
                                        const newTime = setHours(setMinutes(startOfDay(day), oldTimeStr ? parseISO(oldTimeStr).getMinutes() : 0), oldTimeStr ? parseISO(oldTimeStr).getHours() : 9);
                                        updateTask(taskId, { startTime: newTime.toISOString() });
                                    }
                                }
                            }}
                        >
                            {/* Day Header */}
                            <div className="h-8 border-b border-black flex flex-col items-center justify-center bg-gray-50 sticky top-0 z-10 select-none">
                                <span className="text-[8px] font-bold uppercase text-gray-400 leading-none">{format(day, 'EEE')}</span>
                                <span className="text-xs font-bold leading-none">{format(day, 'd')}</span>
                            </div>

                            {/* Grid Lines */}
                            <div className="absolute inset-0 pt-8 pointer-events-none">
                                {Array.from({ length: TOTAL_HOURS * 2 }).map((_, idx) => (
                                    <div key={idx} style={{ height: SLOT_HEIGHT }} className="border-b border-dashed border-gray-100 last:border-0" />
                                ))}
                            </div>

                            {/* Tasks */}
                            {tasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), day)).map(t => {
                                const d = parseISO(t.startTime!);
                                if (d.getHours() < START_HOUR || d.getHours() >= END_HOUR) return null;

                                const top = ((d.getHours() - START_HOUR) * 60 + d.getMinutes()) / 30 * SLOT_HEIGHT + 32;
                                const height = (t.duration / 30) * SLOT_HEIGHT;
                                const isSelected = selectedTaskId === t.id;

                                return (
                                    <div 
                                        key={t.id}
                                        draggable
                                        onDragStart={e => e.dataTransfer.setData('application/retro-os-task-id', t.id)}
                                        onClick={() => setSelectedTaskId(t.id)}
                                        className={`absolute left-0.5 right-0.5 rounded-sm px-1 py-0.5 text-[9px] cursor-pointer border-l-2 transition-all select-none ${isSelected ? 'ring-1 ring-black z-20 shadow-md' : 'z-10 opacity-90 shadow-sm'}`}
                                        style={{ 
                                            top: `${top}px`, 
                                            height: `${height}px`, 
                                            backgroundColor: t.color || '#eff6ff',
                                            borderColor: CATEGORY_ACCENTS[t.category as EventCategory] || '#3b82f6'
                                        }}
                                    >
                                        <div className="font-bold truncate leading-tight pointer-events-none">{t.title}</div>
                                        <div 
                                            className="absolute top-0 left-0 w-full h-full cursor-move" 
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setInteractionState({ 
                                                    type: 'drag', 
                                                    id: t.id, 
                                                    startY: e.clientY, 
                                                    startMinutes: (d.getHours() - START_HOUR) * 60 + d.getMinutes() 
                                                });
                                            }}
                                        />
                                        
                                        {/* Resize Handle */}
                                        {isSelected && (
                                            <div 
                                                className="absolute bottom-[-2px] left-0 right-0 h-1.5 cursor-ns-resize z-30 flex items-center justify-center group"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setInteractionState({ type: 'resize', id: t.id, startY: e.clientY, startDuration: t.duration });
                                                }}
                                            >
                                                <div className="w-4 h-[1px] bg-black/20 group-hover:bg-black/40"></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Event Details Panel - Explicitly matched to content width */}
            {selectedTask && (
                <div className="p-3 bg-gray-50 flex flex-col space-y-2 flex-shrink-0" style={{ width: `${totalWidgetWidth}px` }}>
                    <div className="flex justify-between items-center border-b border-black pb-1 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Event Details</span>
                        <button onClick={() => setSelectedTaskId(null)} className="text-xs font-bold hover:bg-black hover:text-white px-1">×</button>
                    </div>
                    <input 
                        type="text" 
                        value={selectedTask.title} 
                        onChange={e => updateTask(selectedTask.id, { title: e.target.value })}
                        className="w-full text-xs font-bold border border-black p-1 bg-white outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <select 
                            value={selectedTask.category} 
                            onChange={e => {
                                const cat = e.target.value as EventCategory;
                                updateTask(selectedTask.id, { category: cat, color: CATEGORY_PASTELS[cat] });
                            }}
                            className="text-[10px] border border-black p-1 bg-white"
                        >
                            {Object.keys(CATEGORY_ACCENTS).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex items-center space-x-1 border border-black px-1 bg-white">
                            <input 
                                type="number" 
                                value={selectedTask.duration} 
                                onChange={e => updateTask(selectedTask.id, { duration: parseInt(e.target.value) || 30 })}
                                className="w-full text-[10px] outline-none"
                            />
                            <span className="text-[8px] font-bold text-gray-400">MIN</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => { deleteTask(selectedTask.id); setSelectedTaskId(null); }}
                        className="w-full text-[9px] font-bold text-red-600 border border-red-200 hover:bg-red-600 hover:text-white py-1 transition-colors uppercase tracking-widest"
                    >
                        Delete Task
                    </button>
                </div>
            )}

            {/* Bottom Controls */}
            <div className="p-1.5 flex items-center justify-between bg-gray-100 border-t border-black flex-shrink-0">
                <div className="flex space-x-1">
                    <button 
                        onClick={handleAddDay}
                        className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                        title="Add Next Day"
                    >
                        <span className="text-[10px] font-bold leading-none flex items-center">
                            {numDays === 3 ? 'SHIFT' : 'ADD'} <span className="ml-1">→</span>
                        </span>
                    </button>
                    {numDays > 1 && (
                        <button 
                            onClick={handleCollapse}
                            className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            title="Reset to 1 Day"
                        >
                            <span className="text-[10px] font-bold leading-none flex items-center px-1">
                                ⇥ 1
                            </span>
                        </button>
                    )}
                </div>
                <div className="flex space-x-1">
                    <button onClick={() => setBaseDate(d => addDays(d, -1))} className="text-[10px] px-1 border border-black bg-white active:bg-gray-100 hover:bg-gray-50">←</button>
                    <button onClick={() => setBaseDate(d => addDays(d, 1))} className="text-[10px] px-1 border border-black bg-white active:bg-gray-100 hover:bg-gray-50">→</button>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; }
            `}</style>
        </div>
    );
};
