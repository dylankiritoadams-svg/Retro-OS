import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Task, SubTask, TaskPlannerContextType } from './types';

const TaskPlannerContext = createContext<TaskPlannerContextType | undefined>(undefined);

export const useTaskPlanner = (): TaskPlannerContextType => {
    const context = useContext(TaskPlannerContext);
    if (!context) {
        throw new Error('useTaskPlanner must be used within a TaskPlannerProvider');
    }
    return context;
};

const STORAGE_KEY = 'retro_os_task_planner_state';

export const TaskPlannerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (e) {
            console.error("Failed to save tasks state:", e);
        }
    }, [tasks]);

    const getTask = useCallback((id: string) => {
        return tasks.find(t => t.id === id);
    }, [tasks]);

    const addTask = useCallback((taskData: Omit<Task, 'id' | 'isComplete'>): Task => {
        const newTask: Task = {
            id: `task-${Date.now()}`,
            isComplete: false,
            ...taskData
        };
        setTasks(prev => [...prev, newTask]);
        return newTask;
    }, []);

    const updateTask = useCallback((id: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    }, []);

    const deleteTask = useCallback((id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);
    
    const promoteSubTask = useCallback((taskId: string, subTaskId: string) => {
        const task = getTask(taskId);
        if (!task) return;

        const subTask = task.subTasks.find(st => st.id === subTaskId);
        if (!subTask) return;

        // Create new task from subtask
        addTask({
            title: subTask.text,
            subTasks: [],
            duration: 30, // Default duration
            // could try to inherit other properties like startTime if needed
        });
        
        // Remove subtask from original task
        updateTask(taskId, {
            subTasks: task.subTasks.filter(st => st.id !== subTaskId),
        });

    }, [getTask, addTask, updateTask]);

    const value: TaskPlannerContextType = {
        tasks,
        getTask,
        addTask,
        updateTask,
        deleteTask,
        promoteSubTask,
    };

    return <TaskPlannerContext.Provider value={value}>{children}</TaskPlannerContext.Provider>;
};