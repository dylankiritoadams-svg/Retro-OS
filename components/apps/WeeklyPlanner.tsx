import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DayColumnProps {
    day: string;
    tasks: string[];
    onAddTask: (day: string, task: string) => void;
    onRemoveTask: (day: string, taskIndex: number) => void;
}

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, tasks, onAddTask, onRemoveTask }) => {
    const [newTask, setNewTask] = useState('');

    const handleAddTask = () => {
        if (newTask.trim()) {
            onAddTask(day, newTask.trim());
            setNewTask('');
        }
    };

    return (
        <div className="flex-1 p-2 border-r-2 border-gray-400 last:border-r-0">
            <h3 className="text-lg font-bold text-center border-b-2 border-gray-400 pb-1 mb-2">{day}</h3>
            <ul className="h-64 overflow-y-auto space-y-1 mb-2">
                {tasks.map((task, index) => (
                    <li key={index} className="flex justify-between items-center bg-gray-100 p-1 text-sm rounded-sm">
                        <span>{task}</span>
                        <button
                            onClick={() => onRemoveTask(day, index)}
                            className="text-red-500 hover:text-red-700 ml-2 font-bold"
                            aria-label={`Remove task: ${task}`}
                        >
                            X
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex space-x-1">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                    className="flex-grow p-1 border-2 border-black bg-white text-black focus:outline-none rounded-sm"
                    placeholder="New task..."
                />
                <button
                    onClick={handleAddTask}
                    className="p-1 px-2 bg-white border-2 border-black active:bg-gray-200 rounded-sm"
                >
                    Add
                </button>
            </div>
        </div>
    );
};

export const WeeklyPlanner: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const [tasksByDay, setTasksByDay] = useState<Record<string, string[]>>(() =>
        DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {})
    );

    const addTask = (day: string, task: string) => {
        setTasksByDay(prev => ({
            ...prev,
            [day]: [...prev[day], task],
        }));
    };

    const removeTask = (day: string, taskIndex: number) => {
        setTasksByDay(prev => ({
            ...prev,
            [day]: prev[day].filter((_, index) => index !== taskIndex),
        }));
    };

    return (
        <div className="w-full h-full flex flex-col bg-white text-black">
            <h2 className="text-xl font-bold p-2 text-center">My Week</h2>
            <div className="flex flex-grow border-t-2 border-gray-400">
                {DAYS.map(day => (
                    <DayColumn
                        key={day}
                        day={day}
                        tasks={tasksByDay[day]}
                        onAddTask={addTask}
                        onRemoveTask={removeTask}
                    />
                ))}
            </div>
        </div>
    );
};