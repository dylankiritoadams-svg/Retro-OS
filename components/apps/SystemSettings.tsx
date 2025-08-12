import React, { useRef } from 'react';
import { useTheme } from '../../SettingsContext';
import { Wallpaper } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const SystemSettings: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { theme, setColorScheme, setFont, setWallpaper, colorSchemes, fonts } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            const stateToExport = {
                windowState: JSON.parse(localStorage.getItem('retro_os_window_state') || '{}'),
                themeState: JSON.parse(localStorage.getItem('retro_os_theme_settings') || '{}'),
                vfsState: JSON.parse(localStorage.getItem('retro_os_vfs') || '{}'),
                documentsState: JSON.parse(localStorage.getItem('retro_os_documents') || '[]'),
                cardsState: JSON.parse(localStorage.getItem('retro_os_cards_state') || '{}'),
            };

            const jsonString = JSON.stringify(stateToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `retro-os-state-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export state:", error);
            alert("Failed to export state. See console for details.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') {
                    throw new Error("Failed to read file.");
                }
                const importedState = JSON.parse(result);
                
                // Basic validation
                if (
                    !importedState.windowState ||
                    !importedState.themeState ||
                    !importedState.vfsState ||
                    !importedState.documentsState ||
                    !importedState.cardsState
                ) {
                    throw new Error("Invalid state file format.");
                }

                localStorage.setItem('retro_os_window_state', JSON.stringify(importedState.windowState));
                localStorage.setItem('retro_os_theme_settings', JSON.stringify(importedState.themeState));
                localStorage.setItem('retro_os_vfs', JSON.stringify(importedState.vfsState));
                localStorage.setItem('retro_os_documents', JSON.stringify(importedState.documentsState));
                localStorage.setItem('retro_os_cards_state', JSON.stringify(importedState.cardsState));

                alert("State imported successfully! The application will now reload.");
                window.location.reload();
            } catch (error) {
                console.error("Failed to import state:", error);
                alert(`Failed to import state: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        reader.readAsText(file);
        // Reset file input to allow importing the same file again
        event.target.value = ''; 
    };

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

            <div>
                <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-1 mb-2">System Data</h2>
                <p className="text-sm mb-2">Save or load your entire OS state, including files and settings.</p>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleExport}
                        className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200"
                    >
                        Export State
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200"
                    >
                        Import State
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        className="hidden"
                        accept=".json"
                    />
                </div>
            </div>
        </div>
    );
};