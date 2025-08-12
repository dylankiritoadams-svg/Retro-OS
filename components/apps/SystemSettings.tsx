import React from 'react';
import { useTheme } from '../../SettingsContext';
import { Wallpaper } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const SystemSettings: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { theme, setColorScheme, setFont, setWallpaper, colorSchemes, fonts } = useTheme();

    return (
        <div className="w-full h-full p-4 space-y-6 bg-gray-200 text-black overflow-y-auto">
            <div>
                <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-1 mb-2">Appearance</h2>
                <p className="text-sm mb-2">Change the overall look of the system.</p>
                <div className="space-y-1">
                    {colorSchemes.map(cs => (
                        <label key={cs.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="theme"
                                value={cs.id}
                                checked={theme.colorSchemeId === cs.id}
                                onChange={() => setColorScheme(cs.id)}
                            />
                            <span>{cs.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-1 mb-2">Typography</h2>
                <p className="text-sm mb-2">Select a system-wide typeface.</p>
                <div className="space-y-1">
                    {fonts.map(f => (
                        <label key={f.id} className="flex items-center space-x-2 cursor-pointer" style={{fontFamily: f.fontFamily}}>
                            <input
                                type="radio"
                                name="font"
                                value={f.id}
                                checked={theme.fontId === f.id}
                                onChange={() => setFont(f.id)}
                            />
                            <span>{f.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-1 mb-2">Wallpaper</h2>
                <p className="text-sm mb-2">Select a desktop background.</p>
                <div className="space-y-1">
                     {['none', 'grid', 'dots'].map(w => (
                        <label key={w} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name="wallpaper"
                                value={w}
                                checked={theme.wallpaper === (w as Wallpaper)}
                                onChange={() => setWallpaper(w as Wallpaper)}
                            />
                            <span className="capitalize">{w}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};
