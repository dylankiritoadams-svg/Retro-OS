import React, { useState, useEffect } from 'react';
import { useTaskPlanner } from '../../TaskPlannerContext';
import { SubTask, Task } from '../../types';
import { format, parseISO } from 'date-fns';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  taskId: string;
}

export const TaskDetails: React.FC<AppProps> = ({ taskId }) => {
    const { getTask, updateTask, promoteSubTask } = useTaskPlanner();
    const task = getTask(taskId);

    // Local state for controlled input, to avoid re-rendering parent on every keystroke
    const [title, setTitle] = useState(task?.title || '');
    const [duration, setDuration] = useState(task?.duration.toString() || '30');
    const [newSubTask, setNewSubTask] = useState('');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDuration(task.duration.toString());
        }
    }, [task]);

    if (!task) {
        return <div className="p-4 bg-white h-full w-full">Task not found. It may have been deleted.</div>;
    }

    const handleUpdate = (updates: Partial<Task>) => {
        updateTask(task.id, updates);
    };
    
    const handleDurationBlur = () => {
        const newDuration = parseInt(duration, 10);
        if (!isNaN(newDuration) && newDuration > 0) {
            handleUpdate({ duration: newDuration });
        } else {
            // reset to original value if input is invalid
            setDuration(task.duration.toString());
        }
    };


    const handleAddSubTask = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newSubTask.trim()) {
            const newSub: SubTask = { id: `sub-${Date.now()}`, text: newSubTask.trim(), isComplete: false };
            handleUpdate({ subTasks: [...task.subTasks, newSub] });
            setNewSubTask('');
        }
    };

    return (
        <div className="w-full h-full p-4 space-y-3 bg-white text-black overflow-y-auto">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleUpdate({ title })}
                className="w-full p-1 text-lg font-bold border-b-2 border-black focus:outline-none focus:bg-gray-100"
            />
            <div className="text-sm space-y-2">
                 <div>
                    <label className="font-bold block">Date & Time</label>
                    <span>
                        {task.startTime 
                            ? `${format(parseISO(task.startTime), 'eee, MMM d, yyyy')} at ${format(parseISO(task.startTime), 'p')}`
                            : 'Unscheduled'
                        }
                    </span>
                </div>
                <div>
                    <label htmlFor="task-duration" className="font-bold block">Duration (minutes)</label>
                    <input
                        id="task-duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        onBlur={handleDurationBlur}
                        className="w-full p-1 border-b-2 border-black focus:outline-none focus:bg-gray-100"
                    />
                </div>
                <div>
                    <label htmlFor="task-color" className="font-bold block">Color</label>
                    <input
                        id="task-color"
                        type="color"
                        value={task.color || '#a2d2ff'}
                        onChange={(e) => handleUpdate({ color: e.target.value })}
                        className="w-full p-0 h-8 border-b-2 border-black focus:outline-none cursor-pointer"
                    />
                </div>
            </div>
            <div className="border p-1">
                <h3 className="text-sm font-bold mb-1">Sub-tasks</h3>
                <div className="max-h-32 overflow-y-auto">
                    {task.subTasks.map(st => (
                        <div key={st.id} className="flex items-center text-sm group hover:bg-gray-100">
                            <input type="checkbox" checked={st.isComplete} onChange={(e) => handleUpdate({ subTasks: task.subTasks.map(s => s.id === st.id ? { ...s, isComplete: e.target.checked } : s)})} className="mr-2" />
                            <span className={`flex-grow ${st.isComplete ? 'line-through text-gray-500' : ''}`}>{st.text}</span>
                            <button onClick={() => promoteSubTask(task.id, st.id)} className="ml-auto text-xs opacity-0 group-hover:opacity-100 text-blue-500 hover:underline px-1">Promote</button>
                        </div>
                    ))}
                    {task.subTasks.length === 0 && <p className="text-xs text-gray-400 italic">No sub-tasks yet.</p>}
                </div>
            </div>
            <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyPress={handleAddSubTask}
                placeholder="+ Add sub-task and press Enter"
                className="w-full text-sm p-1 border-2 border-black"
            />
        </div>
    );
};