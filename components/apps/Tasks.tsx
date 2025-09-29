import React, { useState, useMemo, useEffect } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { Task, SubTask } from '../../types';
import { generateTasksFromText } from '../../services/geminiService';
import { format, getDay, addDays, startOfWeek, parseISO, formatISO } from 'date-fns';

interface AppProps {
    isActive: boolean;
    instanceId: string;
}

// --- Sub-components ---

const TaskItem: React.FC<{ task: Task; expandedTaskId: string | null; onExpand: (id: string) => void; }> = ({ task, expandedTaskId, onExpand }) => {
    const { updateTask, deleteTask, promoteSubTask } = useTaskPlanner();
    const [newSubTask, setNewSubTask] = useState('');
    const [details, setDetails] = useState({
        description: task.description,
        startTime: task.startTime ? format(parseISO(task.startTime), "yyyy-MM-dd'T'HH:mm") : '',
        duration: task.duration.toString(),
    });

    const isExpanded = expandedTaskId === task.id;

    useEffect(() => {
        // Reset local details if task from context changes (e.g., from planner)
        setDetails({
            description: task.description,
            startTime: task.startTime ? format(parseISO(task.startTime), "yyyy-MM-dd'T'HH:mm") : '',
            duration: task.duration.toString(),
        });
    }, [task]);

    const handleToggleComplete = () => {
        updateTask(task.id, { isComplete: !task.isComplete });
    };

    const handleDetailsChange = (field: keyof typeof details, value: string) => {
        setDetails(prev => ({ ...prev, [field]: value }));
    };
    
    const handleDetailsBlur = (field: keyof typeof details) => {
        let updates: Partial<Task> = {};
        if (field === 'description') {
            updates.description = details.description;
        } else if (field === 'startTime') {
            try {
                updates.startTime = new Date(details.startTime).toISOString();
            } catch { /* Invalid date, do nothing */ }
        } else if (field === 'duration') {
            updates.duration = parseInt(details.duration, 10) || 30;
        }
        updateTask(task.id, updates);
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/retro-os-task-id', task.id);
    };

    const handleAddSubTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newSubTask.trim()) {
            const subTask: SubTask = { id: `subtask-${Date.now()}`, text: newSubTask.trim(), isComplete: false };
            updateTask(task.id, { subTasks: [...task.subTasks, subTask] });
            setNewSubTask('');
        }
    };

    const taskTime = task.startTime ? format(new Date(task.startTime), 'p') : 'No time set';
    const taskDate = task.startTime ? format(new Date(task.startTime), 'E, MMM d') : 'Unscheduled';

    return (
        <div className="p-2 border-b-2 border-black" draggable onDragStart={handleDragStart}>
            <div className="flex items-start cursor-pointer" onClick={() => onExpand(task.id)}>
                <input
                    type="checkbox"
                    checked={task.isComplete}
                    onChange={handleToggleComplete}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 mr-2 classic-checkbox"
                />
                <div className="flex-grow">
                    <span className={` ${task.isComplete ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                    </span>
                    <p className="text-xs text-gray-600">{taskDate} @ {taskTime} ({task.duration} min)</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-black hover:text-red-500 ml-2 font-bold">X</button>
            </div>
            {isExpanded && (
                <div className="ml-7 mt-2 space-y-2">
                    {/* Details Editor */}
                    <div>
                         <label className="text-xs font-bold">Notes</label>
                         <textarea
                            value={details.description}
                            onChange={e => handleDetailsChange('description', e.target.value)}
                            onBlur={() => handleDetailsBlur('description')}
                            className="w-full text-sm p-1 border-2 border-gray-400"
                            rows={2}
                            placeholder="Add notes..."
                         />
                    </div>
                    <div className="flex space-x-2">
                        <div className="flex-grow">
                            <label className="text-xs font-bold">Date & Time</label>
                            <input
                                type="datetime-local"
                                value={details.startTime}
                                onChange={e => handleDetailsChange('startTime', e.target.value)}
                                onBlur={() => handleDetailsBlur('startTime')}
                                className="w-full text-sm p-0.5 border-2 border-gray-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold">Duration (min)</label>
                            <input
                                type="number"
                                value={details.duration}
                                onChange={e => handleDetailsChange('duration', e.target.value)}
                                onBlur={() => handleDetailsBlur('duration')}
                                className="w-20 text-sm p-0.5 border-2 border-gray-400"
                            />
                        </div>
                    </div>
                    {/* Sub-tasks */}
                    <div className="border-t-2 border-gray-300 pt-2">
                        {task.subTasks.map(st => (
                            <div key={st.id} className="flex items-center text-sm group">
                                <input
                                    type="checkbox"
                                    checked={st.isComplete}
                                    onChange={(e) => updateTask(task.id, { subTasks: task.subTasks.map(s => s.id === st.id ? {...s, isComplete: e.target.checked } : s)})}
                                    className="mr-2 classic-checkbox-sm"
                                />
                                <span className={st.isComplete ? 'line-through text-gray-500' : ''}>{st.text}</span>
                                <button onClick={() => promoteSubTask(task.id, st.id)} className="ml-auto text-xs opacity-0 group-hover:opacity-100 text-blue-500">Promote</button>
                            </div>
                        ))}
                        <input
                            type="text"
                            value={newSubTask}
                            onChange={(e) => setNewSubTask(e.target.value)}
                            onKeyPress={handleAddSubTask}
                            placeholder="+ Add sub-task"
                            className="w-full text-sm p-0.5 border-2 border-gray-400 mt-1"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const AIReviewModal: React.FC<{ tasks: Omit<Task, 'id' | 'isComplete'>[]; onConfirm: () => void; onClose: () => void }> = ({ tasks, onConfirm, onClose }) => (
    <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="w-[500px] bg-white border-2 border-black classic-window">
            <div className="classic-title-bar classic-title-bar-active">
                <h2 className="flex-grow text-center truncate">Confirm Generated Tasks</h2>
            </div>
            <div className="p-4">
                <p className="mb-2">Review the tasks generated by the AI:</p>
                <div className="max-h-64 overflow-y-auto mb-4 border-2 border-black p-2 bg-gray-100">
                    {tasks.map((task, index) => (
                        <div key={index} className="p-1 border-b">
                            <p className="font-bold">{task.title}</p>
                            {task.subTasks && task.subTasks.length > 0 && (
                                <ul className="list-disc list-inside text-sm pl-2">
                                    {task.subTasks.map((st, i) => <li key={i}>{st.text}</li>)}
                                </ul>
                            )}
                            {task.startTime && <p className="text-xs text-gray-600">Scheduled for: {format(new Date(task.startTime), 'Pp')}</p>}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="p-1 border-2 border-black active:bg-black active:text-white">Cancel</button>
                    <button onClick={onConfirm} className="p-1 border-2 border-black active:bg-black active:text-white font-bold">Confirm</button>
                </div>
            </div>
        </div>
    </div>
);


// --- Main Tasks App ---

export const Tasks: React.FC<AppProps> = () => {
    const { tasks, addTask } = useTaskPlanner();
    const [mode, setMode] = useState<'list' | 'load'>('list');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    
    // AI State
    const [aiInput, setAiInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedTasks, setGeneratedTasks] = useState<Omit<Task, 'id' | 'isComplete'>[] | null>(null);

    // Task Load Mode State
    const [brainDumpText, setBrainDumpText] = useState('');
    const [stagedTasks, setStagedTasks] = useState<string[]>([]);
    const [scheduledTasks, setScheduledTasks] = useState<Record<number, string[]>>({});

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        addTask({
            title: newTaskTitle,
            description: '',
            subTasks: [],
            startTime: new Date().toISOString(), // Default to now, but effectively unscheduled
            duration: 60,
        });
        setNewTaskTitle('');
    };

    const handleAiGenerate = async () => {
        if (!aiInput.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateTasksFromText(aiInput, new Date().toISOString());
            const tasksToReview = result.tasks.map(t => ({
                title: t.title,
                description: '',
                subTasks: t.subTasks ? t.subTasks.map(st => ({ id: `sub-${Date.now()}-${Math.random()}`, text: st, isComplete: false })) : [],
                startTime: t.startTime || new Date().toISOString(),
                duration: t.duration || 60,
            }));
            setGeneratedTasks(tasksToReview);
        } catch (error) {
            console.error("Failed to generate tasks:", error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const confirmGeneratedTasks = () => {
        if(generatedTasks) {
            generatedTasks.forEach(taskData => addTask(taskData));
        }
        setGeneratedTasks(null);
        setAiInput('');
    };

    const handleBrainDumpChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setBrainDumpText(e.target.value);
        setStagedTasks(e.target.value.split('\n').filter(t => t.trim() !== ''));
    };

    const handleDrop = (e: React.DragEvent, dayIndex: number) => {
        e.preventDefault();
        const taskText = e.dataTransfer.getData('text/plain');
        
        setScheduledTasks(prev => ({
            ...prev,
            [dayIndex]: [...(prev[dayIndex] || []), taskText]
        }));
        setStagedTasks(prev => prev.filter(t => t !== taskText));
    };
    
     const handleDragStart = (e: React.DragEvent, taskText: string) => {
        e.dataTransfer.setData('text/plain', taskText);
    };

    const handleLoadToPlanner = () => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        Object.entries(scheduledTasks).forEach(([dayIndex, taskTitles]) => {
            taskTitles.forEach((title, i) => {
                const day = addDays(weekStart, parseInt(dayIndex));
                const startTime = new Date(day);
                startTime.setHours(9 + i, 0, 0, 0); // Stagger tasks starting at 9 AM
                addTask({ title, description: '', subTasks: [], startTime: startTime.toISOString(), duration: 60 });
            });
        });
        setStagedTasks([]);
        setScheduledTasks({});
        setBrainDumpText('');
        setMode('list');
    };

    const weekDays = useMemo(() => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 });
        return Array.from({length: 7}).map((_, i) => addDays(start, i));
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedTaskId(prev => (prev === id ? null : id));
    };

    const renderListMode = () => (
        <>
            <header className="p-2 border-b-2 border-black flex-shrink-0">
                <div className="flex">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddTask()}
                        placeholder="Add a new task..."
                        className="flex-grow p-1 border-2 border-black"
                    />
                    <button onClick={handleAddTask} className="px-3 py-1 bg-white border-2 border-black border-l-0 active:bg-black active:text-white">Add</button>
                </div>
            </header>
            <main className="flex-grow overflow-y-auto">
                {tasks.filter(t => !t.isComplete).map(task => <TaskItem key={task.id} task={task} expandedTaskId={expandedTaskId} onExpand={toggleExpand} />)}
                {tasks.filter(t => t.isComplete).length > 0 && (
                     <>
                        <h2 className="p-1 mt-2 font-bold bg-gray-200 border-y-2 border-black">Completed</h2>
                        {tasks.filter(t => t.isComplete).map(task => <TaskItem key={task.id} task={task} expandedTaskId={expandedTaskId} onExpand={toggleExpand} />)}
                     </>
                )}
            </main>
        </>
    );
    
    const renderLoadMode = () => (
        <div className="flex-grow flex p-2 space-x-2 min-h-0">
            <div className="w-1/3 flex flex-col">
                <h3 className="font-bold text-center">Brain Dump</h3>
                 <div className="flex-grow border-2 border-black p-1 flex flex-col">
                    <textarea
                        value={brainDumpText}
                        onChange={handleBrainDumpChange}
                        className="w-full h-32 p-1 resize-none focus:outline-none"
                        placeholder="List tasks here..."
                    />
                    <div className="flex-grow border-t-2 border-black mt-1 p-1 overflow-y-auto">
                        {stagedTasks.map((task, index) => (
                            <div key={index} draggable onDragStart={(e) => handleDragStart(e, task)} className="text-xs p-1 bg-gray-200 my-1 cursor-move">{task}</div>
                        ))}
                    </div>
                 </div>
            </div>
            <div className="w-2/3 flex flex-col">
                 <h3 className="font-bold text-center">Schedule for this Week</h3>
                 <div className="grid grid-cols-7 flex-grow border-2 border-black">
                    {weekDays.map((day, i) => (
                        <div key={i} className="border-r-2 border-black flex flex-col" onDrop={(e) => handleDrop(e, i)} onDragOver={(e) => e.preventDefault()}>
                            <p className="font-bold text-center text-sm p-1 border-b-2 border-black">{format(day, 'E')}</p>
                            <div className="p-1 flex-grow">
                                {(scheduledTasks[i] || []).map((task, index) => (
                                    <div key={index} className="text-xs p-1 bg-blue-200 my-1">{task}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-white text-black font-mono">
            {generatedTasks && <AIReviewModal tasks={generatedTasks} onClose={() => setGeneratedTasks(null)} onConfirm={confirmGeneratedTasks} />}
            
            <div className="p-1 border-b-2 border-black flex justify-between items-center">
                 <h1 className="text-xl font-bold">Tasks</h1>
                 <div className="flex items-center">
                     <button onClick={() => setMode('list')} className={`p-1 border-2 border-black text-sm ${mode === 'list' ? 'bg-black text-white' : ''}`}>List</button>
                     <button onClick={() => setMode('load')} className={`p-1 border-y-2 border-r-2 border-black text-sm ${mode === 'load' ? 'bg-black text-white' : ''}`}>Load</button>
                     {mode === 'load' && <button onClick={handleLoadToPlanner} className="ml-2 p-1 border-2 border-black text-sm font-bold">Load into Planner</button>}
                 </div>
            </div>
            
            {mode === 'list' ? renderListMode() : renderLoadMode()}
            
            <footer className="p-2 border-t-2 border-black flex-shrink-0">
                 <div className="flex">
                    <input
                        type="text"
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        placeholder="Generate tasks with AI... e.g., 'Team meeting Monday 2pm-3pm'"
                        className="flex-grow p-1 border-2 border-black"
                        disabled={isGenerating}
                    />
                    <button onClick={handleAiGenerate} disabled={isGenerating} className="px-3 py-1 bg-white border-2 border-black border-l-0 active:bg-black active:text-white">
                        {isGenerating ? '...' : '✨'}
                    </button>
                </div>
            </footer>
        </div>
    );
};