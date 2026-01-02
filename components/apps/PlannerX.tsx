
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { Task, EventCategory, Repeatable, ScheduleTemplate } from '../../types';
import { 
    startOfWeek, addDays, format, parseISO, addMinutes, isSameDay, 
    setHours, setMinutes, differenceInMinutes, startOfDay, 
    endOfWeek, eachDayOfInterval, isWithinInterval, startOfMonth, 
    endOfMonth, isSameMonth, subDays
} from 'date-fns';
import { batchIngestEvents } from '../../services/geminiService';

interface AppProps {
    isActive: boolean;
    instanceId: string;
}

const CATEGORY_ACCENTS: Record<EventCategory, string> = {
    'Work': '#ef4444', 
    'Personal': '#3b82f6', 
    'Media': '#10b981', 
    'Appointment': '#f59e0b', 
};

const CATEGORY_PASTELS: Record<EventCategory, string> = {
    'Work': '#fee2e2', 
    'Personal': '#eff6ff', 
    'Media': '#f0fdf4', 
    'Appointment': '#fffbeb', 
};

const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SLOT_HEIGHT = 20; 

type ViewMode = 'month' | 'week' | '5day' | 'day';

// --- Sub-components ---

const TemplateCreatorModal: React.FC<{ onSave: (name: string, tasks: any[]) => void, onClose: () => void }> = ({ onSave, onClose }) => {
    const [templateName, setTemplateName] = useState('New Routine');
    const [mockTasks, setMockTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string, startY: number, startMinutes: number } | null>(null);
    const [resizeState, setResizeState] = useState<{ id: string, startY: number, startDuration: number } | null>(null);

    const refDate = startOfDay(new Date());

    const handleGridDoubleClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const slotsFromTop = Math.floor(y / SLOT_HEIGHT);
        const minutesFromStart = slotsFromTop * 30;

        let startTime = setHours(refDate, START_HOUR);
        startTime = addMinutes(startTime, minutesFromStart);

        const newTask: Task = {
            id: `mock-${Date.now()}`,
            title: 'New Template Event',
            category: 'Work',
            duration: 60,
            startTime: startTime.toISOString(),
            color: CATEGORY_PASTELS['Work'],
            description: '',
            isComplete: false,
            subTasks: []
        };
        setMockTasks(prev => [...prev, newTask]);
        setSelectedTaskId(newTask.id);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (dragState) {
            const dy = e.clientY - dragState.startY;
            const minuteChange = Math.round((dy / SLOT_HEIGHT) * 30 / 15) * 15;
            setMockTasks(prev => prev.map(t => {
                if (t.id !== dragState.id) return t;
                let newTime = setHours(startOfDay(refDate), START_HOUR);
                newTime = addMinutes(newTime, dragState.startMinutes + minuteChange);
                return { ...t, startTime: newTime.toISOString() };
            }));
        }
        if (resizeState) {
            const dy = e.clientY - resizeState.startY;
            const minuteChange = Math.round((dy / SLOT_HEIGHT) * 30 / 15) * 15;
            setMockTasks(prev => prev.map(t => {
                if (t.id !== resizeState.id) return t;
                return { ...t, duration: Math.max(15, resizeState.startDuration + minuteChange) };
            }));
        }
    };

    const handleMouseUp = () => {
        setDragState(null);
        setResizeState(null);
    };

    const handleSave = () => {
        if (!templateName.trim()) { alert('Name your template'); return; }
        if (mockTasks.length === 0) { alert('Add at least one event'); return; }
        onSave(templateName, mockTasks.map(({ id, isComplete, subTasks, ...rest }) => rest));
    };

    const selectedTask = mockTasks.find(t => t.id === selectedTaskId);

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <div className="bg-white border-2 border-black w-full max-w-3xl flex flex-col h-[85vh] shadow-[10px_10px_0px_black] overflow-hidden">
                <div className="bg-black text-white p-2 font-bold uppercase text-[10px] flex justify-between items-center flex-shrink-0">
                    <span className="tracking-widest">Template Blueprint Editor</span>
                    <button onClick={onClose} className="hover:text-red-400 font-bold px-2">[ CLOSE ]</button>
                </div>

                {/* Top Panel: Name & Selection Details */}
                <div className="p-3 bg-gray-100 border-b border-black grid grid-cols-12 gap-4 flex-shrink-0">
                    <div className="col-span-4">
                        <label className="text-[8px] font-bold uppercase text-gray-400 block mb-1">Blueprint Name</label>
                        <input 
                            value={templateName} 
                            onChange={e => setTemplateName(e.target.value)}
                            className="w-full p-1.5 border border-black text-xs font-bold uppercase outline-none focus:bg-white"
                        />
                    </div>
                    {selectedTask ? (
                        <>
                            <div className="col-span-4">
                                <label className="text-[8px] font-bold uppercase text-gray-400 block mb-1">Block Title</label>
                                <input 
                                    value={selectedTask.title} 
                                    onChange={e => setMockTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, title: e.target.value } : t))}
                                    className="w-full p-1.5 border border-black text-xs outline-none focus:bg-white"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[8px] font-bold uppercase text-gray-400 block mb-1">Type</label>
                                <select 
                                    value={selectedTask.category} 
                                    onChange={e => {
                                        const cat = e.target.value as EventCategory;
                                        setMockTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, category: cat, color: CATEGORY_PASTELS[cat] } : t));
                                    }}
                                    className="w-full p-1.5 border border-black text-[10px] outline-none"
                                >
                                    {Object.keys(CATEGORY_ACCENTS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2 flex items-end">
                                <button 
                                    onClick={() => { setMockTasks(prev => prev.filter(t => t.id !== selectedTaskId)); setSelectedTaskId(null); }}
                                    className="w-full p-1.5 border border-red-200 text-red-600 bg-red-50 text-[10px] font-bold hover:bg-red-600 hover:text-white transition-colors"
                                >DELETE</button>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-8 flex items-center justify-center text-[10px] text-gray-400 italic uppercase font-bold tracking-tight">
                            Double-click grid to add • Drag to move • Pull bottom to resize
                        </div>
                    )}
                </div>

                {/* Day Grid Replication */}
                <div className="flex-grow overflow-y-auto bg-gray-50 flex custom-scrollbar relative">
                    <div className="w-12 border-r border-black bg-gray-100 flex-shrink-0 sticky left-0 z-10 pt-8">
                        {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                            <div key={i} style={{ height: SLOT_HEIGHT * 2 }} className="text-[9px] text-right pr-2 text-gray-300 font-mono">
                                {START_HOUR + i}:00
                            </div>
                        ))}
                    </div>
                    <div 
                        className="flex-grow relative bg-white border-r border-black" 
                        style={{ minHeight: `${TOTAL_HOURS * SLOT_HEIGHT * 2 + 32}px` }}
                        onDoubleClick={handleGridDoubleClick}
                    >
                        {/* Time Grid Lines */}
                        <div className="absolute inset-0 pt-8 pointer-events-none">
                            {Array.from({ length: TOTAL_HOURS * 2 }).map((_, idx) => (
                                <div key={idx} style={{ height: SLOT_HEIGHT }} className={`border-b ${idx % 2 !== 0 ? 'border-gray-100' : 'border-dashed border-gray-100'}`}></div>
                            ))}
                        </div>

                        <div className="h-8 border-b border-black flex items-center justify-center bg-gray-50 sticky top-0 z-10 text-[9px] font-bold uppercase text-gray-500 tracking-tighter">
                            Template Canvas (6am - 10pm)
                        </div>

                        {mockTasks.map(t => {
                            const d = parseISO(t.startTime!);
                            const startMins = (d.getHours() - START_HOUR) * 60 + d.getMinutes();
                            const top = (startMins / 30) * SLOT_HEIGHT + 32;
                            const height = (t.duration / 30) * SLOT_HEIGHT;
                            const isSelected = selectedTaskId === t.id;

                            return (
                                <div 
                                    key={t.id}
                                    onClick={() => setSelectedTaskId(t.id)}
                                    className={`absolute left-1 right-1 rounded-sm border-l-4 shadow-sm cursor-pointer select-none transition-all ${isSelected ? 'ring-1 ring-black z-30' : 'z-20 opacity-90'}`}
                                    style={{ top: `${top}px`, height: `${height}px`, backgroundColor: t.color, borderColor: CATEGORY_ACCENTS[t.category as EventCategory] }}
                                >
                                    <div 
                                        className="p-1.5 h-full overflow-hidden"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDragState({ id: t.id, startY: e.clientY, startMinutes: startMins });
                                        }}
                                    >
                                        <div className="text-[10px] font-bold truncate leading-none uppercase">{t.title}</div>
                                        <div className="text-[8px] text-gray-500 font-mono mt-0.5">{format(d, 'HH:mm')} ({t.duration}m)</div>
                                    </div>
                                    {isSelected && (
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-40 flex items-center justify-center"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                setResizeState({ id: t.id, startY: e.clientY, startDuration: t.duration });
                                            }}
                                        >
                                            <div className="w-4 h-[1px] bg-black/20"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-3 bg-white border-t border-black flex justify-between items-center flex-shrink-0">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Routine Blocks: {mockTasks.length}</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-1.5 border border-black text-xs font-bold uppercase hover:bg-gray-100">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-gray-800 shadow-[4px_4px_0px_gray]">Save Template</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PlannerX: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { 
        tasks, addTask, updateTask, deleteTask, 
        repeatables, addRepeatable, deleteRepeatable,
        templates, addTemplate, deleteTemplate, applyTemplate
    } = useTaskPlanner();
    
    const [viewDate, setViewDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    
    const [rawInput, setRawInput] = useState('');
    const [inventorySearch, setInventorySearch] = useState('');
    const [isIngesting, setIsIngesting] = useState(false);
    const [stagedEvents, setStagedEvents] = useState<Omit<Task, 'id' | 'isComplete' | 'subTasks'>[]>([]);
    const [showTemplateCreator, setShowTemplateCreator] = useState(false);
    
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [editorState, setEditorState] = useState<{title: string, category: EventCategory, duration: number, isLocked: boolean, color: string} | null>(null);

    const [resizingTaskId, setResizingTaskId] = useState<string | null>(null);
    const [resizeStartMinutes, setResizeStartMinutes] = useState<number>(0);
    const [resizeStartY, setResizeStartY] = useState<number>(0);

    const daysInView = useMemo(() => {
        if (viewMode === 'day') return [viewDate];
        if (viewMode === '5day') {
            const start = startOfWeek(viewDate, { weekStartsOn: 1 });
            return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
        }
        if (viewMode === 'week') {
            const start = startOfWeek(viewDate, { weekStartsOn: 1 });
            return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
        }
        return [];
    }, [viewDate, viewMode]);

    const visibleTasks = useMemo(() => {
        if (viewMode === 'month') {
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            return tasks.filter(t => t.startTime && isWithinInterval(parseISO(t.startTime), { start, end }));
        }
        if (daysInView.length === 0) return [];
        const interval = { 
            start: startOfDay(daysInView[0]), 
            end: setMinutes(setHours(startOfDay(daysInView[daysInView.length - 1] || daysInView[0]), 23), 59) 
        };
        return tasks.filter(t => t.startTime && isWithinInterval(parseISO(t.startTime), interval));
    }, [tasks, daysInView, viewDate, viewMode]);

    const filteredAgenda = useMemo(() => {
        const query = inventorySearch.toLowerCase();
        return tasks.filter(t => {
            if (t.isComplete) return false;
            const matchesQuery = t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query));
            if (!matchesQuery) return false;
            if (!t.startTime) return true;
            return visibleTasks.some(vt => vt.id === t.id);
        });
    }, [tasks, visibleTasks, inventorySearch]);

    const agendaByCategory = useMemo(() => {
        const groups: Record<EventCategory, Task[]> = {
            'Work': [], 'Personal': [], 'Media': [], 'Appointment': []
        };
        filteredAgenda.forEach(t => {
            const cat = (t.category || 'Work') as EventCategory;
            if (groups[cat]) groups[cat].push(t);
        });
        return groups;
    }, [filteredAgenda]);

    const handleApplyTemplate = (id: string) => {
        applyTemplate(id, viewDate.toISOString());
    };

    const handleIngest = async () => {
        if (!rawInput.trim()) return;
        setIsIngesting(true);
        try {
            const history = tasks.slice(-50).map(t => ({ title: t.title, duration: t.duration }));
            const result = await batchIngestEvents(rawInput, new Date().toISOString(), history);
            const newStaged = result.events.map(e => ({
                title: e.title,
                description: 'Imported via AI',
                startTime: e.startTime,
                duration: e.duration,
                category: e.category as EventCategory,
                isLocked: e.isLocked,
                color: CATEGORY_PASTELS[e.category as EventCategory] || '#f3f4f6'
            }));
            setStagedEvents(prev => [...prev, ...newStaged]);
            setRawInput('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsIngesting(false);
        }
    };

    const confirmStagedEvent = (index: number) => {
        const newTask = addTask({ ...stagedEvents[index], subTasks: [] });
        setSelectedEventId(newTask.id);
        setStagedEvents(prev => prev.filter((_, i) => i !== index));
    };

    const handleGridDoubleClick = (e: React.MouseEvent, day: Date) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-task-id]') || target.closest('.cursor-ns-resize')) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const slotsFromTop = Math.floor(y / SLOT_HEIGHT);
        const minutesFromStart = slotsFromTop * 30;

        let startTime = setHours(startOfDay(day), START_HOUR);
        startTime = addMinutes(startTime, minutesFromStart);

        const newTask = addTask({
            title: 'New Event',
            category: 'Work',
            duration: 60,
            startTime: startTime.toISOString(),
            color: CATEGORY_PASTELS['Work'],
            description: '',
            subTasks: []
        });
        setSelectedEventId(newTask.id);
    };

    const handleDrop = (e: React.DragEvent, targetDay: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('planner/task-id');
        const favId = e.dataTransfer.getData('planner/favourite-id');
        
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const slotsFromTop = Math.floor(y / SLOT_HEIGHT);
        const minutesFromStart = slotsFromTop * 30;
        
        let newStartTime = setHours(targetDay, START_HOUR);
        newStartTime = setMinutes(newStartTime, 0);
        newStartTime = addMinutes(newStartTime, minutesFromStart);

        if (taskId) {
            updateTask(taskId, { startTime: newStartTime.toISOString() });
        } else if (favId) {
            const fav = repeatables.find(r => r.id === favId);
            if (!fav) return;
            const newTask = addTask({
                title: fav.title,
                category: fav.category || 'Personal',
                duration: fav.defaultDuration,
                startTime: newStartTime.toISOString(),
                color: fav.color,
                description: 'Created from Favourite',
                subTasks: []
            });
            setSelectedEventId(newTask.id);
        }
    };

    const handleResizeStart = (e: React.MouseEvent, taskId: string, currentDuration: number) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingTaskId(taskId);
        setResizeStartMinutes(currentDuration);
        setResizeStartY(e.clientY);
    };

    useEffect(() => {
        if (selectedEventId) {
            const t = tasks.find(t => t.id === selectedEventId);
            if (t) setEditorState({ 
                title: t.title, 
                category: (t.category || 'Work') as EventCategory, 
                duration: t.duration, 
                isLocked: t.isLocked || false,
                color: t.color || CATEGORY_PASTELS['Work']
            });
        } else setEditorState(null);
    }, [selectedEventId, tasks]);

    const handleEditorSave = () => {
        if (selectedEventId && editorState) {
            updateTask(selectedEventId, {
                title: editorState.title,
                category: editorState.category,
                duration: editorState.duration,
                isLocked: editorState.isLocked,
                color: editorState.color
            });
        }
    };

    const handleCopyAgenda = () => {
        const lines: string[] = [];
        lines.push(`PLANNER X REPORT - ${format(viewDate, 'MMMM yyyy')}`);
        daysInView.forEach(day => {
            const dayTasks = visibleTasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), day));
            if (dayTasks.length > 0) {
                lines.push(`\n${format(day, 'EEEE, MMM do')}`);
                dayTasks.sort((a, b) => a.startTime!.localeCompare(b.startTime!)).forEach(t => {
                    lines.push(`[${format(parseISO(t.startTime!), 'HH:mm')}] ${t.title} (${t.duration}m)`);
                });
            }
        });
        navigator.clipboard.writeText(lines.join('\n'));
        alert('Agenda copied to clipboard!');
    };

    const renderMonthGrid = () => {
        const start = startOfMonth(viewDate);
        const firstDay = startOfWeek(start, { weekStartsOn: 1 });
        const monthDays = Array.from({ length: 35 }).map((_, i) => addDays(firstDay, i));

        return (
            <div className="grid grid-cols-7 h-full border-l border-t border-black">
                {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => (
                    <div key={d} className="bg-gray-50 p-1 border-r border-b border-black text-[10px] font-bold text-center text-gray-400">{d}</div>
                ))}
                {monthDays.map(d => {
                    const dayTasks = tasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), d));
                    return (
                        <div key={d.toISOString()} 
                            className={`min-h-[100px] p-1 border-r border-b border-black relative ${isSameMonth(d, viewDate) ? 'bg-white' : 'bg-gray-100/50'}`}
                            onDoubleClick={() => { setViewDate(d); setViewMode('day'); }}
                        >
                            <span className={`text-[10px] font-bold ${isSameDay(d, new Date()) ? 'bg-black text-white px-1' : 'text-gray-400'}`}>{format(d, 'd')}</span>
                            <div className="mt-1 space-y-0.5 overflow-y-auto max-h-[80px]">
                                {dayTasks.map(t => (
                                    <div key={t.id} className="text-[9px] truncate px-1 border-l-2" style={{backgroundColor: t.color || '#f3f4f6', borderColor: CATEGORY_ACCENTS[t.category as EventCategory] || '#000'}}>{t.title}</div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full h-full flex bg-white text-black font-[var(--main-font)] overflow-hidden">
            {showTemplateCreator && (
                <TemplateCreatorModal 
                    onSave={(n, ts) => { addTemplate(n, ts); setShowTemplateCreator(false); }}
                    onClose={() => setShowTemplateCreator(false)}
                />
            )}

            <div className="w-72 flex-shrink-0 border-r border-black flex flex-col bg-gray-50 h-full">
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    {/* Templates Section */}
                    <div className="p-4 border-b border-black bg-white">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Day Blueprints</label>
                            <button 
                                onClick={() => setShowTemplateCreator(true)}
                                className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 font-bold uppercase"
                            >Create New</button>
                        </div>
                        <div className="space-y-1">
                            {templates.map(tmpl => (
                                <div key={tmpl.id} className="p-2 border border-black text-[10px] bg-white flex items-center justify-between group shadow-sm">
                                    <span className="font-bold truncate pr-2 uppercase">{tmpl.name}</span>
                                    <div className="flex space-x-1">
                                        <button onClick={() => handleApplyTemplate(tmpl.id)} className="text-blue-600 hover:bg-blue-50 px-1 border border-blue-100 font-bold" title="Apply to current day">STAMP</button>
                                        <button onClick={() => deleteTemplate(tmpl.id)} className="text-red-500 hover:bg-red-50 px-1 border border-red-100 font-bold">X</button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && <div className="text-[9px] text-gray-400 italic text-center py-2 border border-dashed border-gray-300">No blueprints saved</div>}
                        </div>
                    </div>

                    <div className="p-4 border-b border-black bg-white">
                        <label className="text-[10px] font-bold uppercase mb-2 block tracking-tight text-gray-500">Favourites (Blocks)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {repeatables.map(fav => (
                                <div 
                                    key={fav.id} 
                                    draggable 
                                    onDragStart={e => e.dataTransfer.setData('planner/favourite-id', fav.id)}
                                    className="p-1.5 border border-black text-[9px] font-bold bg-white shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing truncate relative group"
                                    style={{ borderLeft: `3px solid ${CATEGORY_ACCENTS[fav.category || 'Personal']}` }}
                                >
                                    <span className="truncate block pr-3">{fav.title}</span>
                                    <button onClick={() => deleteRepeatable(fav.id)} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-500 font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-b border-black bg-white">
                        <label className="text-[10px] font-bold uppercase mb-2 block tracking-tight text-gray-500">AI Batch Ingest</label>
                        <textarea 
                            className="w-full h-20 p-2 border border-black bg-white text-xs resize-none focus:outline-none"
                            placeholder="Paste schedule fragments..."
                            value={rawInput}
                            onChange={e => setRawInput(e.target.value)}
                        />
                        <button 
                            onClick={handleIngest}
                            disabled={isIngesting || !rawInput.trim()}
                            className="mt-2 w-full bg-white border border-black py-1.5 text-[10px] font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50 uppercase"
                        >
                            {isIngesting ? 'EXTRACTING...' : 'PROCESS BATCH'}
                        </button>
                    </div>

                    <div className="p-4 flex flex-col border-b border-black">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] font-bold uppercase block text-gray-500">Inventory</label>
                            <input 
                                type="text"
                                value={inventorySearch}
                                onChange={e => setInventorySearch(e.target.value)}
                                placeholder="Filter..."
                                className="w-24 border-b border-black bg-transparent text-[10px] focus:outline-none"
                            />
                        </div>
                        {(Object.entries(agendaByCategory) as [string, Task[]][]).map(([cat, items]) => (
                            <div key={cat} className="mb-4">
                                <div className="text-[10px] font-bold border-b border-gray-200 mb-2 pb-1 flex justify-between items-center">
                                    <span className="flex items-center uppercase">
                                        <span className="w-2 h-2 mr-2 rounded-sm" style={{backgroundColor: CATEGORY_ACCENTS[cat as EventCategory]}}></span>
                                        {cat}
                                    </span>
                                    <span className="text-[9px] text-gray-400">{items.length}</span>
                                </div>
                                <div className="space-y-1">
                                    {items.map(t => (
                                        <div 
                                            key={t.id} 
                                            draggable
                                            onDragStart={e => { e.dataTransfer.setData('planner/task-id', t.id); }}
                                            onClick={() => setSelectedEventId(t.id)} 
                                            className="text-[10px] cursor-pointer hover:bg-gray-100 rounded px-1 truncate py-0.5 flex items-center group/item"
                                        >
                                            <span className="font-mono text-gray-400 mr-2 flex-shrink-0">
                                                {t.startTime ? format(parseISO(t.startTime), 'HH:mm') : '---'}
                                            </span>
                                            <span className="truncate flex-grow">{t.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4">
                        <button onClick={handleCopyAgenda} className="w-full bg-white border border-black py-2 text-[10px] font-bold hover:bg-black hover:text-white transition-colors uppercase">COPY AGENDA</button>
                    </div>
                </div>

                {selectedEventId && editorState && (
                    <div className="p-4 bg-white border-t border-black shadow-lg z-20">
                        <div className="text-[10px] font-bold uppercase border-b border-black mb-3 flex justify-between">
                            <span>Modify Event</span>
                            <button onClick={() => setSelectedEventId(null)} className="hover:bg-gray-100 px-1 font-bold">×</button>
                        </div>
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                value={editorState.title} 
                                onChange={e => setEditorState({...editorState, title: e.target.value})}
                                onBlur={handleEditorSave}
                                className="w-full p-2 border border-black text-xs font-bold bg-gray-50 uppercase"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <select 
                                    value={editorState.category} 
                                    onChange={e => { 
                                        const cat = e.target.value as EventCategory;
                                        setEditorState({...editorState, category: cat, color: CATEGORY_PASTELS[cat]}); 
                                        setTimeout(handleEditorSave, 0); 
                                    }}
                                    className="p-1 border border-black text-[10px]"
                                >
                                    {Object.keys(CATEGORY_ACCENTS).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input 
                                    type="number" 
                                    value={editorState.duration} 
                                    onChange={e => setEditorState({...editorState, duration: parseInt(e.target.value) || 0})}
                                    onBlur={handleEditorSave}
                                    className="p-1 border border-black text-[10px]" 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-grow flex flex-col h-full overflow-hidden">
                <header className="h-14 border-b border-black flex items-center px-6 space-x-6 bg-white z-20">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setViewDate(d => subDays(d, viewMode === 'month' ? 30 : viewMode === 'day' ? 1 : 7))} className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white font-bold">←</button>
                        <span className="font-bold text-sm px-4 min-w-[140px] text-center uppercase tracking-tighter">{format(viewDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}</span>
                        <button onClick={() => setViewDate(d => addDays(d, viewMode === 'month' ? 30 : viewMode === 'day' ? 1 : 7))} className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white font-bold">→</button>
                    </div>

                    <div className="flex border border-black p-0.5 bg-gray-100">
                        {(['month', 'week', '5day', 'day'] as ViewMode[]).map(m => (
                            <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1 text-[10px] font-bold uppercase transition-all ${viewMode === m ? 'bg-black text-white shadow-inner' : 'hover:bg-white text-gray-500'}`}>{m}</button>
                        ))}
                    </div>
                </header>

                <div className="flex-grow overflow-auto relative bg-gray-100 p-3">
                    {viewMode === 'month' ? renderMonthGrid() : (
                        <div className="flex h-full min-h-[1000px] border-l border-black bg-white shadow-sm">
                            <div className="w-14 flex-shrink-0 border-r border-black bg-gray-50 sticky left-0 z-10">
                                {Array.from({length: TOTAL_HOURS}).map((_, i) => (
                                    <div key={i} className="h-[40px] text-[9px] font-bold text-right pr-2 pt-1 border-b border-gray-200 text-gray-300">
                                        {START_HOUR + i}:00
                                    </div>
                                ))}
                            </div>
                            <div className="flex-grow flex">
                                {daysInView.map((day, i) => {
                                    const dayTasks = tasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), day));
                                    return (
                                        <div key={i} 
                                            className="flex-grow border-r border-black relative min-w-[130px]" 
                                            onDragOver={e => e.preventDefault()} 
                                            onDrop={e => handleDrop(e, day)}
                                            onDoubleClick={(e) => handleGridDoubleClick(e, day)}
                                        >
                                            <div className="sticky top-0 bg-white border-b border-black text-center p-2 z-10 select-none">
                                                <div className="text-[9px] font-bold uppercase text-gray-400">{format(day, 'EEEE')}</div>
                                                <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''}`}>{format(day, 'd')}</div>
                                            </div>
                                            
                                            {Array.from({length: TOTAL_HOURS * 2}).map((_, idx) => (
                                                <div key={idx} style={{ height: `${SLOT_HEIGHT}px` }} className={`border-b ${idx % 2 !== 0 ? 'border-gray-100' : 'border-dashed border-gray-100'}`}></div>
                                            ))}

                                            {dayTasks.map(t => {
                                                const d = parseISO(t.startTime!);
                                                const top = (differenceInMinutes(d, setHours(startOfDay(d), START_HOUR)) / 30) * SLOT_HEIGHT;
                                                const height = (t.duration / 30) * SLOT_HEIGHT;
                                                const isSelected = selectedEventId === t.id;
                                                const accentColor = CATEGORY_ACCENTS[t.category as EventCategory] || '#000';
                                                
                                                return (
                                                    <div key={t.id} 
                                                        data-task-id={t.id}
                                                        draggable 
                                                        onDragStart={e => { e.dataTransfer.setData('planner/task-id', t.id); }} 
                                                        onClick={() => setSelectedEventId(t.id)}
                                                        className={`absolute left-0.5 right-0.5 rounded-sm px-2 py-1 text-[10px] cursor-pointer border-l-4 transition-all z-10 shadow-sm ${isSelected ? 'ring-1 ring-black z-50' : ''}`}
                                                        style={{ 
                                                            top: `${Math.max(0, top)}px`, 
                                                            height: `${Math.max(SLOT_HEIGHT, height)}px`, 
                                                            backgroundColor: t.color || '#f3f4f6',
                                                            borderColor: accentColor,
                                                            opacity: isSelected ? 1 : 0.9
                                                        }}
                                                    >
                                                        <div className="font-bold truncate text-black pointer-events-none uppercase">{t.title}</div>
                                                        {isSelected && (
                                                            <div 
                                                                className="absolute bottom-[-4px] left-0 right-0 h-2 cursor-ns-resize z-50 flex items-center justify-center"
                                                                onMouseDown={(e) => handleResizeStart(e, t.id, t.duration)}
                                                            >
                                                                <div className="w-4 h-[1px] bg-black/20"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
