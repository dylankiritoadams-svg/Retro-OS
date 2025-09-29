import React, { useState } from 'react';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarApp: React.FC<AppProps> = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (delta: number) => {
        setCurrentDate(new Date(year, month + delta, 1));
    };

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} className="border border-gray-300"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
        days.push(
            <div key={day} className={`p-2 border border-gray-300 text-center ${isToday ? 'bg-black text-white' : 'bg-white'}`}>
                {day}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-gray-200 text-black p-2 font-mono">
            <header className="flex justify-between items-center mb-2 p-2 bg-white border-2 border-black">
                <button onClick={() => changeMonth(-1)} className="px-2 border-2 border-black active:bg-gray-200">
                    &lt;
                </button>
                <h2 className="text-lg font-bold">
                    {currentDate.toLocaleString('default', { month: 'long' })} {year}
                </h2>
                <button onClick={() => changeMonth(1)} className="px-2 border-2 border-black active:bg-gray-200">
                    &gt;
                </button>
            </header>
            <div className="grid grid-cols-7 flex-grow">
                {WEEK_DAYS.map(day => (
                    <div key={day} className="font-bold text-center border-b-2 border-black p-1">
                        {day}
                    </div>
                ))}
                {days}
            </div>
        </div>
    );
};
