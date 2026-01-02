
import React, { useState, useMemo } from 'react';
import { useHabitTracker } from '../../HabitTrackerContext';
import { startOfDay, eachDayOfInterval, subDays, format, isSameDay, parseISO } from 'date-fns';
import { GoogleGenAI } from '@google/genai';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const ICONS = ['🔥', '💧', '🥗', '📖', '💪', '🧘', '💻', '💤', '💊', '🚶'];
const COLORS = ['#FF5555', '#55FF55', '#5555FF', '#FFFF55', '#FF55FF', '#55FFFF', '#FFAA00', '#AA00FF'];

export const HabitTracker: React.FC<AppProps> = () => {
    const { habits, addHabit, toggleHabit, deleteHabit } = useHabitTracker();
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const days = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 13); // Show last 14 days
        return eachDayOfInterval({ start, end });
    }, []);

    const handleAdd = () => {
        if (!newName.trim()) return;
        addHabit(newName.trim(), selectedIcon, selectedColor);
        setNewName('');
        setIsAdding(false);
    };

    const getAiCoach = async () => {
        setIsAiLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const habitContext = habits.length > 0 
                ? `The user is currently tracking: ${habits.map(h => `${h.name} (${h.streak} day streak)`).join(', ')}.`
                : "The user hasn't started tracking any habits yet.";
            
            const prompt = `You are a retro-style 8-bit health coach from a 1990s video game.
            User Habits: ${habitContext}
            Provide 2-3 short, punchy pieces of advice or motivation in all-caps retro style. 
            Also suggest ONE new specific habit they might like based on what they already do.
            Keep it under 60 words. No markdown, just plain text.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            setAiAdvice(response.text || "SYSTEM BUSY. TRY AGAIN LATER.");
        } catch (e) {
            console.error(e);
            setAiAdvice("COACH IS OFFLINE. CHECK POWER CABLES.");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#C0C0C0] text-black font-mono overflow-hidden select-none">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-900 to-blue-700 p-2 text-white font-bold flex justify-between items-center shadow-inner">
                <span className="tracking-widest uppercase text-xs">PunchCard Habit Pro v1.0</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="px-3 py-0.5 bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 text-[10px] font-bold active:border-inset"
                    >
                        NEW HABIT
                    </button>
                    <button 
                        onClick={getAiCoach}
                        disabled={isAiLoading}
                        className="px-3 py-0.5 bg-yellow-400 text-black border-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 text-[10px] font-bold active:border-inset disabled:opacity-50"
                    >
                        {isAiLoading ? 'SYNCING...' : 'AI COACH'}
                    </button>
                </div>
            </div>

            {/* AI Advice Panel */}
            {aiAdvice && (
                <div className="p-2 bg-black text-green-400 border-b-2 border-gray-600 animate-in fade-in slide-in-from-top duration-500 overflow-hidden relative">
                    <button onClick={() => setAiAdvice(null)} className="absolute top-1 right-1 text-white text-[10px]">[X]</button>
                    <p className="text-[10px] leading-tight font-vt323 uppercase">{aiAdvice}</p>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-white/50 custom-scrollbar">
                {habits.length === 0 && !isAdding && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-2">
                        <span className="text-4xl">📭</span>
                        <p className="text-[10px] font-bold uppercase">No habits in buffer</p>
                    </div>
                )}

                {isAdding && (
                    <div className="p-3 border-2 border-black bg-[#E0E0E0] space-y-4 shadow-[4px_4px_0px_gray]">
                        <h3 className="text-xs font-bold uppercase border-b border-black pb-1">Initialize New Habit</h3>
                        <input 
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="HABIT NAME..."
                            className="w-full p-2 border-2 border-black bg-white text-xs outline-none uppercase font-bold"
                            autoFocus
                        />
                        <div className="flex justify-between items-center">
                            <div className="flex gap-1">
                                {ICONS.map(i => (
                                    <button 
                                        key={i} 
                                        onClick={() => setSelectedIcon(i)}
                                        className={`w-7 h-7 flex items-center justify-center border ${selectedIcon === i ? 'bg-white border-blue-500' : 'border-gray-400'}`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-1">
                            {COLORS.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setSelectedColor(c)}
                                    className={`w-5 h-5 border-2 ${selectedColor === c ? 'border-black' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleAdd} className="flex-1 py-2 bg-green-600 text-white font-bold border-2 border-black text-[10px] uppercase">Commit</button>
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-red-600 text-white font-bold border-2 border-black text-[10px] uppercase">Abort</button>
                        </div>
                    </div>
                )}

                {habits.map(habit => (
                    <div key={habit.id} className="border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_black]">
                        <div className="bg-gray-100 border-b border-black p-2 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{habit.icon}</span>
                                <span className="text-xs font-bold uppercase">{habit.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-[8px] block uppercase text-gray-500">Streak</span>
                                    <span className="text-xs font-bold text-orange-600">{habit.streak}🔥</span>
                                </div>
                                <button onClick={() => deleteHabit(habit.id)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold">[PURGE]</button>
                            </div>
                        </div>
                        <div className="p-2 flex gap-1 justify-between">
                            {days.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd') + 'T00:00:00Z'; // normalization
                                const isDone = habit.completions.some(c => isSameDay(parseISO(c), day));
                                return (
                                    <div key={day.toISOString()} className="flex flex-col items-center">
                                        <button 
                                            onClick={() => toggleHabit(habit.id, day)}
                                            className={`w-6 h-6 border-2 transition-all ${isDone ? 'border-black shadow-none scale-90' : 'border-gray-200 border-t-white border-l-white border-r-gray-400 border-b-gray-400'}`}
                                            style={{ backgroundColor: isDone ? habit.color : '#F0F0F0' }}
                                        />
                                        <span className="text-[7px] mt-1 text-gray-400 uppercase">{format(day, 'EE').charAt(0)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="p-2 border-t border-gray-400 bg-[#C0C0C0] text-[8px] flex justify-between font-bold text-gray-600">
                <span>SYSTEM STATUS: TRACKING ACTIVE</span>
                <span>PUNCH CARD REVISION: 04</span>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #666; border: 1px solid #C0C0C0; }
                .border-inset { border-style: solid; border-width: 2px; border-color: #808080 #FFFFFF #FFFFFF #808080; }
            `}</style>
        </div>
    );
};
