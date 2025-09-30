import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { useApp } from '../../types';
import type { Task } from '../../types';
import {
    format,
    startOfWeek,
    addDays,
    startOfMonth,
    endOfMonth,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    parse,
    getHours,
    setHours,
    setMinutes,
    addHours,
    parseISO,
} from 'date-fns';

type PlannerView = 'month' | 'week' | 'day';

const TaskComponent: React.FC<{
    task: Task;
    onClick: () => void;
    onResizeStart: (e: React.MouseEvent, taskId: string) => void;
    view: PlannerView;
}> = ({ task, onClick, onResizeStart, view }) => {
    const startHour = task.startTime ? getHours(parseISO(task.startTime)) : 0;
    const durationHours = task.duration / 60;
    
    const isVisible = view === 'month' || (task.startTime && startHour >= 0 && startHour < 24);

    if (!isVisible) return null;

    const top = view !== 'month' ? `${startHour * 60}px` : undefined;
    const height = view !== 'month' ? `${durationHours * 60}px` : undefined;

    return (
        <div
            onClick={onClick}
            className="absolute w-full p-1 rounded-sm overflow-hidden cursor-pointer"
            style={{
                top,
                height,
                backgroundColor: task.color || '#a2d2ff',
                borderLeft: `3px solid ${task.isComplete ? '#4ade80' : (task.color || '#a2d2ff')}`,
            }}
        >
            <p className="text-xs font-bold truncate">{task.title}</p>
            {view !== 'month' && <p className="text-xs truncate">{task.duration} min</p>}
            {view !== 'month' && (
                 <div
                    className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onResizeStart(e, task.id);
                    }}
                />
            )}
        </div>
    );
};


const DayColumn: React.FC<{
    day: Date;
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    onDoubleClick: (time: Date) => void;
    onDrop: (time: Date, taskId: string) => void;
    onResizeStart: (e: React.MouseEvent, taskId: string) => void;
}> = ({ day, tasks, onTaskClick, onDoubleClick, onDrop, onResizeStart }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayRef = useRef<HTMLDivElement>(null);
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('application/retro-os-task-id');
        if (!taskId || !dayRef.current) return;
        
        const rect = dayRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const hour = Math.floor(y / 60);
        const time = setMinutes(setHours(day, hour), 0);
        
        onDrop(time, taskId);
    };

    return (
        <div
            ref={dayRef}
            className="relative"
            onDoubleClick={(e) => {
                if (!dayRef.current) return;
                const rect = dayRef.current.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const hour = Math.floor(y / 60);
                onDoubleClick(setMinutes(setHours(day, hour), 0));
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-200" />
            ))}
            {tasks.map(task => (
                <TaskComponent
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                    onResizeStart={onResizeStart}
                    view="week"
                />
            ))}
        </div>
    );
};

const Header: React.FC<{ view: PlannerView; currentMonth: Date; onPrev: () => void; onNext: () => void; onSetView: (view: PlannerView) => void; onToggleSidebar: () => void; }> = ({ view, currentMonth, onPrev, onNext, onSetView, onToggleSidebar }) => (
    <header className="flex-shrink-0 p-2 border-b-2 border-black flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <button onClick={onToggleSidebar} className="px-2 py-1 bg-white border-2 border-black active:bg-gray-200 text-sm">Tasks</button>
            <button onClick={onPrev} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">‹</button>
            <h2 className="text-lg font-bold w-48 text-center">{format(currentMonth, "MMMM yyyy")}</h2>
            <button onClick={onNext} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">›</button>
        </div>
        <div className="flex items-center space-x-1">
            {['month', 'week', 'day'].map(v => (
                <button key={v} onClick={() => onSetView(v as PlannerView)} className={`px-3 py-1 text-sm border-2 border-black ${view === v ? 'bg-black text-white' : 'bg-white'}`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
            ))}
        </div>
    </header>
);

export const Planner: React.FC = () => {
    const { tasks, addTask, updateTask } = useTaskPlanner();
    const { openApp } = useApp();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [view, setView] = useState<PlannerView>('month');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const [resizingTask, setResizingTask] = useState<{ id: string, startY: number, startDuration: number } | null>(null);

    const handleNext = () => view === 'month' ? setCurrentMonth(addMonths(currentMonth, 1)) : view === 'week' ? setCurrentMonth(addWeeks(currentMonth, 1)) : setCurrentMonth(addDays(currentMonth, 1));
    const handlePrev = () => view === 'month' ? setCurrentMonth(subMonths(currentMonth, 1)) : view === 'week' ? setCurrentMonth(subWeeks(currentMonth, 1)) : setCurrentMonth(addDays(currentMonth, -1));

    const openTaskDetails = (taskId: string) => openApp('task-details', { taskId });

    const handleCreateTask = useCallback((time: Date) => {
        const newTask = addTask({
            title: 'New Event',
            startTime: time.toISOString(),
            duration: 60,
            subTasks: [],
        });
        openTaskDetails(newTask.id);
    }, [addTask, openApp]);

    const handleDrop = useCallback((time: Date, taskId: string) => {
        updateTask(taskId, { startTime: time.toISOString() });
    }, [updateTask]);
    
    const handleResizeStart = useCallback((e: React.MouseEvent, taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        setResizingTask({
            id: taskId,
            startY: e.clientY,
            startDuration: task.duration,
        });
    }, [tasks]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!resizingTask) return;
        const dy = e.clientY - resizingTask.startY;
        const minutesPerPixel = 1; // 60px height for 60 minutes
        const durationChange = dy * minutesPerPixel;
        const newDuration = Math.max(15, Math.round((resizingTask.startDuration + durationChange) / 15) * 15); // Snap to 15 mins
        updateTask(resizingTask.id, { duration: newDuration });
    }, [resizingTask, updateTask]);
    
    const handleMouseUp = useCallback(() => {
        setResizingTask(null);
    }, []);

    const unscheduledTasks = useMemo(() => tasks.filter(t => !t.startTime), [tasks]);
    
    const renderMonthView = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        
        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const tasksForDay = tasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), cloneDay));
                days.push(
                    <div
                        key={day.toString()}
                        className={`p-1 border border-gray-200 flex-1 min-h-[120px] ${isSameMonth(day, monthStart) ? '' : 'bg-gray-100'}`}
                        onDoubleClick={() => handleCreateTask(addHours(cloneDay, 9))}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                            e.preventDefault();
                            const taskId = e.dataTransfer.getData('application/retro-os-task-id');
                            if(taskId) handleDrop(addHours(cloneDay, 9), taskId);
                        }}
                    >
                        <span className={`text-sm ${isSameDay(day, new Date()) ? 'bg-black text-white rounded-full px-1' : ''}`}>{format(day, 'd')}</span>
                        <div className="mt-1 space-y-1 relative h-full">
                             {tasksForDay.map(task => <TaskComponent key={task.id} task={task} onClick={() => openTaskDetails(task.id)} onResizeStart={()=>{}} view="month"/>)}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div key={day.toString()} className="flex">{days}</div>);
            days = [];
        }

        return (
            <div className="flex-grow flex flex-col">
                <div className="grid grid-cols-7 text-center font-bold border-b-2 border-black">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="p-2">{d}</div>)}
                </div>
                <div className="flex-grow flex flex-col overflow-y-auto">{rows}</div>
            </div>
        );
    };

    const renderWeekView = () => {
        const weekStart = startOfWeek(currentMonth);
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

        return (
            <div className="flex-grow flex overflow-auto min-w-0">
                {/* Time Column (sticky) */}
                <div className="w-[60px] flex-shrink-0 sticky left-0 z-20 bg-white border-r">
                    <div className="sticky top-0 z-10 bg-white border-b-2 border-black" style={{ height: '41px' }} />
                    {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="h-[60px] text-xs text-right pr-2 border-b border-gray-200 pt-1">
                            {format(new Date(0, 0, 0, i), 'ha')}
                        </div>
                    ))}
                </div>
                
                {/* All Day Columns */}
                {days.map(day => (
                    <div key={day.toISOString()} className="flex flex-col border-r border-gray-200" style={{ minWidth: '150px' }}>
                        {/* Header for this column (sticky) */}
                        <div className="sticky top-0 z-10 bg-white p-2 border-b-2 border-black text-center font-bold">
                            {format(day, 'ccc d')}
                        </div>
                        {/* The rest of the column */}
                        <DayColumn
                            day={day}
                            tasks={tasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), day))}
                            onTaskClick={openTaskDetails}
                            onDoubleClick={handleCreateTask}
                            onDrop={handleDrop}
                            onResizeStart={handleResizeStart}
                        />
                    </div>
                ))}
            </div>
        );
    };
    
    const renderDayView = () => {
        const day = currentMonth;
        return (
            <div className="flex-grow flex overflow-auto min-w-0">
                {/* Time Column (sticky) */}
                <div className="w-[60px] flex-shrink-0 sticky left-0 z-20 bg-white border-r">
                    <div className="sticky top-0 z-10 bg-white border-b-2 border-black" style={{ height: '41px' }} />
                    {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="h-[60px] text-xs text-right pr-2 border-b border-gray-200 pt-1">
                            {format(new Date(0, 0, 0, i), 'ha')}
                        </div>
                    ))}
                </div>
                
                {/* Day Column */}
                <div className="flex flex-col border-r border-gray-200 flex-grow" style={{ minWidth: '150px' }}>
                    {/* Header (sticky) */}
                    <div className="sticky top-0 z-10 bg-white p-2 border-b-2 border-black text-center font-bold">
                        {format(day, 'ccc d')}
                    </div>
                    {/* The rest of the column */}
                    <DayColumn
                        day={day}
                        tasks={tasks.filter(t => t.startTime && isSameDay(parseISO(t.startTime), day))}
                        onTaskClick={openTaskDetails}
                        onDoubleClick={handleCreateTask}
                        onDrop={handleDrop}
                        onResizeStart={handleResizeStart}
                    />
                </div>
            </div>
        );
    };


    return (
        <div className="w-full h-full flex flex-col bg-white text-black" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <Header view={view} currentMonth={currentMonth} onPrev={handlePrev} onNext={handleNext} onSetView={setView} onToggleSidebar={() => setIsSidebarOpen(p => !p)} />
            <main className="flex-grow flex overflow-hidden min-w-0">
                {isSidebarOpen && (
                    <div className="w-64 flex-shrink-0 border-r-2 border-black flex flex-col">
                        <h3 className="p-2 font-bold text-center border-b-2 border-black">Unscheduled Tasks</h3>
                        <div className="flex-grow overflow-y-auto p-2">
                            {unscheduledTasks.map(task => (
                                <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData('application/retro-os-task-id', task.id)} className="p-2 bg-gray-100 border border-gray-300 mb-2 cursor-grab">
                                    <p className="text-sm font-bold">{task.title}</p>
                                </div>
                            ))}
                            {unscheduledTasks.length === 0 && <p className="text-xs text-center text-gray-500 italic">No unscheduled tasks.</p>}
                        </div>
                    </div>
                )}
                <div className="flex-grow flex flex-col overflow-hidden min-w-0">
                    {view === 'month' && renderMonthView()}
                    {view === 'week' && renderWeekView()}
                    {view === 'day' && renderDayView()}
                </div>
            </main>
        </div>
    );
};