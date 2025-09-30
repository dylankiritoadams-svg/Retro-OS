import React, { useState, useCallback, useMemo } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { useApp, Task } from '../../types';
import { generateTasksFromText } from '../../services/geminiService';
import { format, parseISO } from 'date-fns';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const TaskItem: React.FC<{ task: Task; onOpen: (taskId: string) => void }> = ({ task, onOpen }) => {
    const { updateTask } = useTaskPlanner();

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/retro-os-task-id', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <li 
            draggable
            onDragStart={handleDragStart}
            className="p-2 border-b-2 border-gray-300 flex items-start group cursor-grab"
        >
            <input
                type="checkbox"
                checked={task.isComplete}
                onChange={() => updateTask(task.id, { isComplete: !task.isComplete })}
                className="mt-1 mr-3"
            />
            <div className="flex-grow">
                <p className={`font-bold ${task.isComplete ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                </p>
                <p className="text-xs text-gray-600">
                    {task.startTime ? format(parseISO(task.startTime), 'MMM d, p') : 'Unscheduled'}
                </p>
            </div>
            <button onClick={() => onOpen(task.id)} className="text-sm opacity-0 group-hover:opacity-100 text-blue-500 hover:underline">
                Details
            </button>
        </li>
    );
};

export const Tasks: React.FC<AppProps> = () => {
    const { tasks, addTask } = useTaskPlanner();
    const { openApp } = useApp();

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [aiInputText, setAiInputText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        addTask({
            title: newTaskTitle,
            duration: 60, // Default duration
            subTasks: [],
        });
        setNewTaskTitle('');
    };

    const handleAiGenerate = async () => {
        if (!aiInputText.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateTasksFromText(aiInputText, new Date().toISOString());
            result.tasks.forEach(taskData => {
                addTask({
                    title: taskData.title,
                    subTasks: taskData.subTasks.map(st => ({ id: `sub-${Date.now()}-${Math.random()}`, text: st, isComplete: false })),
                    startTime: taskData.startTime,
                    duration: taskData.duration || 60,
                });
            });
            setAiInputText('');
        } catch (error) {
            console.error("Failed to generate tasks:", error);
            // Optionally show an error to the user
        } finally {
            setIsGenerating(false);
        }
    };
    
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            if (a.isComplete && !b.isComplete) return 1;
            if (!a.isComplete && b.isComplete) return -1;
            if (a.startTime && b.startTime) return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            if (a.startTime && !b.startTime) return -1;
            if (!a.startTime && b.startTime) return 1;
            return 0; // if both are unscheduled, maintain order
        });
    }, [tasks]);
    

    const openTaskDetails = (taskId: string) => {
        openApp('task-details', { taskId });
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 text-black">
            <header className="flex-shrink-0 p-2 border-b-2 border-gray-300">
                <h1 className="text-xl font-bold">Tasks</h1>
            </header>
            <main className="flex-grow overflow-y-auto">
                <ul>
                    {sortedTasks.map(task => (
                        <TaskItem key={task.id} task={task} onOpen={openTaskDetails} />
                    ))}
                </ul>
            </main>
            <footer className="flex-shrink-0 p-2 border-t-2 border-gray-300 space-y-2">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                        placeholder="Add a new task..."
                        className="flex-grow p-2 border-2 border-black bg-white"
                    />
                    <button onClick={handleAddTask} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">
                        Add
                    </button>
                </div>
                 <div className="flex space-x-2">
                    <input
                        type="text"
                        value={aiInputText}
                        onChange={(e) => setAiInputText(e.target.value)}
                        placeholder="Or generate tasks with AI... e.g., 'Finish report by tomorrow 5pm for 2 hours'"
                        className="flex-grow p-2 border-2 border-black bg-white"
                        disabled={isGenerating}
                    />
                    <button onClick={handleAiGenerate} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200" disabled={isGenerating}>
                        {isGenerating ? '...' : '✨'}
                    </button>
                </div>
            </footer>
        </div>
    );
};
