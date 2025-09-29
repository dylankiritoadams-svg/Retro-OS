import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Task, SubTask, Repeatable, TaskPlannerContextType } from './types';

const TaskPlannerContext = createContext<TaskPlannerContextType | undefined>(undefined);

export const useTaskPlanner = (): TaskPlannerContextType => {
    const context = useContext(TaskPlannerContext);
    if (!context) {
        throw new Error('useTaskPlanner must be used within a TaskPlannerProvider');
    }
    return context;
};

const TASK_PLANNER_STORAGE_KEY = 'retro_os_task_planner_state';

interface TaskPlannerState {
    tasks: Task[];
    repeatables: Repeatable[];
}

export const TaskPlannerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<TaskPlannerState>(() => {
        try {
            const storedState = localStorage.getItem(TASK_PLANNER_STORAGE_KEY);
            return storedState ? JSON.parse(storedState) : { tasks: [], repeatables: [] };
        } catch (error) {
            console.error("Error loading task planner state from localStorage", error);
            return { tasks: [], repeatables: [] };
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(TASK_PLANNER_STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Error saving task planner state to localStorage", error);
        }
    }, [state]);

    const getTask = useCallback((id: string) => {
        return state.tasks.find(t => t.id === id);
    }, [state.tasks]);

    const addTask = useCallback((taskData: Omit<Task, 'id' | 'isComplete'>) => {
        const defaults = {
            description: '',
            subTasks: [],
            isComplete: false,
            color: '#a2d2ff',
        };
        const newTask: Task = {
            ...defaults,
            ...taskData,
            id: `task-${Date.now()}-${Math.random()}`,
        };
        setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    }, []);

    const updateTask = useCallback((id: string, updates: Partial<Task>) => {
        setState(prev => ({
            ...prev,
            tasks: prev.tasks.map(task =>
                task.id === id ? { ...task, ...updates } : task
            ),
        }));
    }, []);

    const deleteTask = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            tasks: prev.tasks.filter(task => task.id !== id),
        }));
    }, []);
    
    const promoteSubTask = useCallback((taskId: string, subTaskId: string) => {
        setState(prev => {
            const task = prev.tasks.find(t => t.id === taskId);
            if (!task) return prev;
            const subTask = task.subTasks.find(st => st.id === subTaskId);
            if (!subTask) return prev;
            
            const newTasks = [...prev.tasks];
            
            // Create new task from subtask first
            const promotedTask: Task = {
                id: `task-${Date.now()}-${Math.random()}`,
                title: subTask.text,
                description: `Promoted from sub-task of "${task.title}"`,
                isComplete: subTask.isComplete,
                subTasks: [],
                startTime: task.startTime, // Inherit start time
                duration: 30, // Default duration
            };
            newTasks.push(promotedTask);
            
            // Then, remove subtask from original task
            const originalTaskIndex = newTasks.findIndex(t => t.id === taskId);
            newTasks[originalTaskIndex] = {
                ...task,
                subTasks: task.subTasks.filter(st => st.id !== subTaskId),
            };
            
            return { ...prev, tasks: newTasks };
        });
    }, []);

    const addRepeatable = useCallback((data: Omit<Repeatable, 'id'>) => {
        const newRepeatable: Repeatable = {
            ...data,
            id: `repeat-${Date.now()}-${Math.random()}`,
        };
        setState(prev => ({ ...prev, repeatables: [...prev.repeatables, newRepeatable] }));
    }, []);

    const updateRepeatable = useCallback((id: string, updates: Partial<Repeatable>) => {
        setState(prev => ({
            ...prev,
            repeatables: prev.repeatables.map(r =>
                r.id === id ? { ...r, ...updates } : r
            ),
        }));
    }, []);

    const deleteRepeatable = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            repeatables: prev.repeatables.filter(r => r.id !== id),
        }));
    }, []);

    const value: TaskPlannerContextType = {
        tasks: state.tasks,
        getTask,
        addTask,
        updateTask,
        deleteTask,
        promoteSubTask,
        repeatables: state.repeatables,
        addRepeatable,
        updateRepeatable,
        deleteRepeatable,
    };

    return <TaskPlannerContext.Provider value={value}>{children}</TaskPlannerContext.Provider>;
};