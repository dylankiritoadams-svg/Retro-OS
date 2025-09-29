import React, { useState, useEffect } from 'react';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const ClockApp: React.FC<AppProps> = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const seconds = time.getSeconds();
    const minutes = time.getMinutes();
    const hours = time.getHours();

    const secondHandAngle = (seconds / 60) * 360;
    const minuteHandAngle = ((minutes * 60 + seconds) / 3600) * 360;
    const hourHandAngle = ((hours * 3600 + minutes * 60 + seconds) / 43200) * 360;

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="relative w-64 h-64 bg-white border-8 border-black rounded-full shadow-lg">
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10"></div>
                
                {/* Hour Hand */}
                <div 
                    className="absolute top-1/2 left-1/2 w-1 h-16 bg-black transform -translate-x-1/2 -translate-y-full origin-bottom"
                    style={{ transform: `translateX(-50%) rotate(${hourHandAngle}deg)` }}
                ></div>

                {/* Minute Hand */}
                <div 
                    className="absolute top-1/2 left-1/2 w-0.5 h-24 bg-black transform -translate-x-1/2 -translate-y-full origin-bottom"
                    style={{ transform: `translateX(-50%) rotate(${minuteHandAngle}deg)` }}
                ></div>

                {/* Second Hand */}
                <div 
                    className="absolute top-1/2 left-1/2 w-0.5 h-28 bg-red-600 transform -translate-x-1/2 -translate-y-full origin-bottom z-10"
                    style={{ transform: `translateX(-50%) rotate(${secondHandAngle}deg)` }}
                ></div>
                
                 {/* Hour Markers */}
                 {[...Array(12)].map((_, i) => (
                    <div 
                        key={i} 
                        className="absolute top-1/2 left-1/2 w-1 h-3 bg-black transform -translate-x-1/2 -translate-y-1/2"
                        style={{ transform: `rotate(${i * 30}deg) translateY(-110px)` }}
                    />
                ))}
            </div>
        </div>
    );
};
