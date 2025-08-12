import React, { useState, useCallback, createContext, useContext, useMemo, useEffect } from 'react';
import { WindowInstance, AppDefinition } from './types';
import { APPS } from './constants';
import Window from './components/Window';
import Dock from './components/Dock';
import Desktop from './components/Desktop';
import { CardProvider } from './CardContext';
import { DocumentProvider } from './DocumentContext';
import { ThemeProvider, useTheme } from './SettingsContext';
import { FileSystemProvider } from './FileSystemContext';

interface AppContextType {
    openApp: (appId: string, props?: Record<string, any>) => void;
}
export const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
    const context = useContext(AppContext);
    if(!context) throw new Error("useApp must be used within an AppProvider");
    return context;
}

const OS: React.FC = () => {
    const { theme, getActiveColorScheme, getActiveFont } = useTheme();
    const [windows, setWindows] = useState<WindowInstance[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(10);
    
    // Effect to apply theme colors and font to the root element
    useEffect(() => {
        const root = document.documentElement;
        const colorScheme = getActiveColorScheme();
        const font = getActiveFont();

        Object.entries(colorScheme.colors).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
        root.style.setProperty('--main-font', font.fontFamily);
    }, [theme.colorSchemeId, theme.fontId, getActiveColorScheme, getActiveFont]);

    // Effect to apply wallpaper and UI mode to the body
    useEffect(() => {
        document.body.className = `wallpaper-${theme.wallpaper}`;
        document.body.dataset.uimode = theme.uiMode;
    }, [theme.wallpaper, theme.uiMode]);

    const openApp = useCallback((appId: string, props: Record<string, any> = {}) => {
        const app = APPS.find(a => a.id === appId);
        if (!app) return;

        const newWindow: WindowInstance = {
            id: `win-${Date.now()}`,
            appId: app.id,
            zIndex: nextZIndex,
            position: { x: 100 + windows.length * 20, y: 100 + windows.length * 20 },
            size: app.defaultSize,
            props: props || {},
        };
        setWindows(prev => [...prev, newWindow]);
        setActiveWindowId(newWindow.id);
        setNextZIndex(prev => prev + 1);
    }, [nextZIndex, windows.length]);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (activeWindowId === id) {
            const remainingWindows = windows.filter(w => w.id !== id);
            if (remainingWindows.length > 0) {
                 const topWindow = remainingWindows.reduce((prev, current) => (prev.zIndex > current.zIndex) ? prev : current);
                 setActiveWindowId(topWindow.id);
            } else {
                 setActiveWindowId(null);
            }
        }
    }, [activeWindowId, windows]);

    const focusWindow = useCallback((id: string) => {
        if (id === activeWindowId) return;
        setActiveWindowId(id);
        setNextZIndex(prev => {
            const newZ = prev + 1;
            setWindows(currentWindows =>
                currentWindows.map(w => w.id === id ? { ...w, zIndex: newZ } : w)
            );
            return newZ;
        });
    }, [activeWindowId]);

    const updateWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, position } : w));
    }, []);

    const updateWindowSize = useCallback((id: string, size: { width: number, height: number }) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    }, []);

    const activeApp = useMemo(() => {
        const activeWindow = windows.find(w => w.id === activeWindowId);
        return activeWindow ? APPS.find(a => a.id === activeWindow.appId) || null : null;
    }, [activeWindowId, windows]);
    
    return (
        <AppContext.Provider value={{ openApp }}>
            <div className={`h-screen w-screen overflow-hidden flex ${theme.uiMode === 'mac' ? 'flex-col' : 'flex-col-reverse'} bg-[var(--bg-color)]`}>
                <Dock
                    onAppClick={openApp}
                    activeApp={activeApp}
                    activeWindowId={activeWindowId}
                    windows={windows}
                    onWindowFocus={focusWindow}
                />
                <main className="flex-grow relative">
                    <Desktop />
                    {windows.map(instance => {
                        const app = APPS.find(a => a.id === instance.appId);
                        if (!app) return null;
                        return (
                            <Window
                                key={instance.id}
                                instance={instance}
                                app={app}
                                onClose={closeWindow}
                                onFocus={focusWindow}
                                onPositionChange={updateWindowPosition}
                                onSizeChange={updateWindowSize}
                                isActive={instance.id === activeWindowId}
                            />
                        );
                    })}
                </main>
            </div>
        </AppContext.Provider>
    );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <FileSystemProvider>
            <DocumentProvider>
                 <CardProvider>
                    <OS />
                 </CardProvider>
            </DocumentProvider>
        </FileSystemProvider>
    </ThemeProvider>
  );
};

export default App;
