
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Habit, HabitTrackerContextType } from './types';
import { startOfDay, formatISO, subDays, isSameDay, parseISO } from 'date-fns';

const HabitTrackerContext = createContext<HabitTrackerContextType | undefined>(undefined);

export const useHabitTracker = (): HabitTrackerContextType => {
    const context = useContext(HabitTrackerContext);
    if (!context) {
        throw new Error('useHabitTracker must be used within a HabitTrackerProvider');
    }
    return context;
};

const STORAGE_KEY = 'retro_os_habit_tracker_state';

const calculateStreak = (completions: string[]): number => {
    if (completions.length === 0) return 0;
    
    const sorted = [...completions].sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime());
    const today = startOfDay(new Date());
    let streak = 0;
    let checkDate = today;

    // If not completed today, check if it was completed yesterday to maintain streak
    const lastCompletion = parseISO(sorted[0]);
    if (!isSameDay(lastCompletion, today) && !isSameDay(lastCompletion, subDays(today, 1))) {
        return 0;
    }

    if (!isSameDay(lastCompletion, today)) {
        checkDate = subDays(today, 1);
    }

    for (const compStr of sorted) {
        const compDate = parseISO(compStr);
        if (isSameDay(compDate, checkDate)) {
            streak++;
            checkDate = subDays(checkDate, 1);
        } else if (compDate < checkDate) {
            break;
        }
    }

    return streak;
};

export const HabitTrackerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [habits, setHabits] = useState<Habit[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    }, [habits]);

    const addHabit = useCallback((name: string, icon: string, color: string) => {
        const newHabit: Habit = {
            id: `habit-${Date.now()}`,
            name,
            icon,
            color,
            completions: [],
            streak: 0,
            createdAt: formatISO(new Date()),
        };
        setHabits(prev => [...prev, newHabit]);
    }, []);

    const toggleHabit = useCallback((habitId: string, date: Date) => {
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            
            const dateStr = formatISO(startOfDay(date));
            const isCompleted = h.completions.includes(dateStr);
            
            const newCompletions = isCompleted 
                ? h.completions.filter(c => c !== dateStr)
                : [...h.completions, dateStr];
            
            return {
                ...h,
                completions: newCompletions,
                streak: calculateStreak(newCompletions)
            };
        }));
    }, []);

    const deleteHabit = useCallback((habitId: string) => {
        setHabits(prev => prev.filter(h => h.id !== habitId));
    }, []);

    return (
        <HabitTrackerContext.Provider value={{ habits, addHabit, toggleHabit, deleteHabit }}>
            {children}
        </HabitTrackerContext.Provider>
    );
};
