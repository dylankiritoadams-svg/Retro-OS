
import React, { useRef } from 'react';
import { useTheme } from '../../SettingsContext';
import { Wallpaper, DesktopMode } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const SystemSettings: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { theme, setColorScheme, setFont, setWallpaper, setDesktopMode, colorSchemes, fonts } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            const stateToExport = {
                windowState: JSON.parse(localStorage.getItem('retro_os_window_state') || '{}'),
                themeState: JSON.parse(localStorage.getItem('retro_os_theme_settings') || '{}'),
                vfsState: JSON.parse(localStorage.getItem('retro_os_vfs') || '{}'),
                documentsState: JSON.parse(localStorage.getItem('retro_os_documents') || '[]'),
                cardsState: JSON.parse(localStorage.getItem('retro_os_cards_state') || '{}'),
                stickyNotesState: JSON.parse(localStorage.getItem('retro_os_sticky_notes') || '[]'),
                notebookState: JSON.parse(localStorage.getItem('retro_os_notebook_state') || '{}'),
                taskPlannerState: JSON.parse(localStorage.getItem('retro_os_task_planner_state') || '{}'),
                pinBoardState: JSON.parse(localStorage.getItem('retro_os_pinboard_state') || '{}'),
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
        (fileInputRef.current as HTMLInputElement)?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') {
                    throw new Error("Failed to read file.");
                }
                const importedState = JSON.parse(result);
                
                // Load all keys present in the imported file
                const keysToImport = [
                    'windowState', 'themeState', 'vfsState', 'documentsState', 
                    'cardsState', 'stickyNotesState', 'notebookState', 
                    'taskPlannerState', 'pinBoardState'
                ];
                
                let importedCount = 0;
                for (const key of keysToImport) {
                    if (importedState[key]) {
                        const storageKey = `retro_os_${key.replace('State', '').toLowerCase()}`;
                        localStorage.setItem(storageKey, JSON.stringify(importedState[key]));
                        importedCount++;
                    }
                }
                
                if (importedCount === 0) {
                     throw new Error("Invalid or empty state file format.");
                }


                alert("State imported successfully! The application will now reload.");
                window.location.reload();
            } catch (error) {
                console.error("Failed to import state:", error);
                alert(`Failed to import state: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        reader.readAsText(file);
        // Reset file input to allow importing the same file again
        (event.target as HTMLInputElement).value = ''; 
    };
    
    const handleReset = () => {
        if (confirm(
            "Are you sure you want to reset the entire system?\n\nThis action is irreversible and will delete all saved files, settings, and window positions."
        )) {
            // A more robust way to clear all related keys
            Object.keys(localStorage)
                .filter(key => key.startsWith('retro_os_'))
                .forEach(key => localStorage.removeItem(key));
            window.location.reload();
        }
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
                <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-1 mb-2">Desktop Mode</h2>
                <p className="text-sm mb-2">Control how the desktop space behaves.</p>
                <div className="space-y-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="desktopMode"
                            value="scrolling"
                            checked={theme.desktopMode === 'scrolling'}
                            onChange={(e) => setDesktopMode(e.target.value as DesktopMode)}
                        />
                        <span>Scrolling (Large)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="radio"
                            name="desktopMode"
                            value="fixed"
                            checked={theme.desktopMode === 'fixed'}
                            onChange={(e) => setDesktopMode(e.target.value as DesktopMode)}
                        />
                        <span>Fixed (Fit to Screen)</span>
                    </label>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-1 mb-2">System Data</h2>
                <p className="text-sm mb-2">Save or load your entire OS state, including files and settings.</p>
                <div className="flex flex-wrap gap-2">
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
                     <button
                        onClick={handleReset}
                        className="px-3 py-1 bg-red-100 border-2 border-red-500 text-red-700 active:bg-red-200"
                    >
                        Reset System
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
