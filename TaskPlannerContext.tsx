
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { Task, SubTask, Repeatable, ScheduleTemplate, TaskPlannerContextType } from './types';
import { parseISO, setHours, setMinutes, startOfDay } from 'date-fns';

const TaskPlannerContext = createContext<TaskPlannerContextType | undefined>(undefined);

export const useTaskPlanner = (): TaskPlannerContextType => {
    const context = useContext(TaskPlannerContext);
    if (!context) {
        throw new Error('useTaskPlanner must be used within a TaskPlannerProvider');
    }
    return context;
};

const TASK_PLANNER_STORAGE_KEY = 'retro_os_task_planner_state_v2';

interface TaskPlannerState {
    tasks: Task[];
    repeatables: Repeatable[];
    templates: ScheduleTemplate[];
}

export const TaskPlannerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<TaskPlannerState>(() => {
        try {
            const storedState = localStorage.getItem(TASK_PLANNER_STORAGE_KEY);
            return storedState ? JSON.parse(storedState) : { tasks: [], repeatables: [], templates: [] };
        } catch (error) {
            console.error("Error loading task planner state:", error);
            return { tasks: [], repeatables: [], templates: [] };
        }
    });

    useEffect(() => {
        localStorage.setItem(TASK_PLANNER_STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    const getTask = useCallback((id: string) => state.tasks.find(t => t.id === id), [state.tasks]);

    const addTask = useCallback((taskData: Omit<Task, 'id' | 'isComplete'>): Task => {
        const newTask: Task = {
            description: '',
            subTasks: [],
            isComplete: false,
            color: '#a2d2ff',
            ...taskData,
            id: `task-${Date.now()}-${Math.random()}`,
        };
        setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
        return newTask;
    }, []);

    const updateTask = useCallback((id: string, updates: Partial<Task>) => {
        setState(prev => ({
            ...prev,
            tasks: prev.tasks.map(task => task.id === id ? { ...task, ...updates } : task),
        }));
    }, []);

    const deleteTask = useCallback((id: string) => {
        setState(prev => ({ ...prev, tasks: prev.tasks.filter(task => task.id !== id) }));
    }, []);
    
    const promoteSubTask = useCallback((taskId: string, subTaskId: string) => {
        setState(prev => {
            const task = prev.tasks.find(t => t.id === taskId);
            if (!task) return prev;
            const subTask = task.subTasks.find(st => st.id === subTaskId);
            if (!subTask) return prev;
            
            const promotedTask: Task = {
                id: `task-${Date.now()}`,
                title: subTask.text,
                description: `From sub-task of "${task.title}"`,
                isComplete: subTask.isComplete,
                subTasks: [],
                startTime: task.startTime,
                duration: 30,
            };
            
            return {
                ...prev,
                tasks: [
                    ...prev.tasks.map(t => t.id === taskId ? { ...t, subTasks: t.subTasks.filter(st => st.id !== subTaskId) } : t),
                    promotedTask
                ]
            };
        });
    }, []);

    const addRepeatable = useCallback((data: Omit<Repeatable, 'id'>) => {
        const newRepeatable: Repeatable = { ...data, id: `repeat-${Date.now()}` };
        setState(prev => ({ ...prev, repeatables: [...prev.repeatables, newRepeatable] }));
    }, []);

    const deleteRepeatable = useCallback((id: string) => {
        setState(prev => ({ ...prev, repeatables: prev.repeatables.filter(r => r.id !== id) }));
    }, []);

    const updateRepeatable = useCallback((id: string, updates: Partial<Repeatable>) => {
        setState(prev => ({
            ...prev,
            repeatables: prev.repeatables.map(r => r.id === id ? { ...r, ...updates } : r),
        }));
    }, []);

    const addTemplate = useCallback((name: string, tasks: Omit<Task, 'id' | 'isComplete' | 'subTasks'>[]) => {
        const newTemplate: ScheduleTemplate = {
            id: `template-${Date.now()}`,
            name,
            tasks: tasks.map(t => ({
                ...t,
                // Ensure times are stored as standard hour/min offsets if possible, 
                // but for now we store the Omit<Task> exactly as it is for simplicity.
            }))
        };
        setState(prev => ({ ...prev, templates: [...prev.templates, newTemplate] }));
    }, []);

    const deleteTemplate = useCallback((id: string) => {
        setState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
    }, []);

    const applyTemplate = useCallback((templateId: string, targetDateStr: string) => {
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;

        const targetDayStart = startOfDay(parseISO(targetDateStr));
        
        const newTasks = template.tasks.map(t => {
            let startTime = undefined;
            if (t.startTime) {
                const originalDate = parseISO(t.startTime);
                startTime = setMinutes(setHours(targetDayStart, originalDate.getHours()), originalDate.getMinutes()).toISOString();
            }
            return {
                ...t,
                id: `task-${Date.now()}-${Math.random()}`,
                isComplete: false,
                subTasks: [],
                startTime,
            } as Task;
        });

        setState(prev => ({ ...prev, tasks: [...prev.tasks, ...newTasks] }));
    }, [state.templates]);

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
        templates: state.templates,
        addTemplate,
        deleteTemplate,
        applyTemplate
    };

    return <TaskPlannerContext.Provider value={value}>{children}</TaskPlannerContext.Provider>;
};
