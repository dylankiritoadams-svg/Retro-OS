
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { WindowInstance, AppDefinition, AppContext } from './types';
import { APPS } from './constants';
import Window from './components/Window';
import Dock from './components/Dock';
import Desktop from './components/Desktop';
import { CardProvider } from './CardContext';
import { DocumentProvider } from './DocumentContext';
import { ThemeProvider, useTheme } from './SettingsContext';
import { FileSystemProvider } from './FileSystemContext';
import { StickyNoteProvider, useStickyNotes } from './StickyNoteContext';
import { NotebookProvider } from './NotebookContext';
import { PinBoardProvider } from './PinBoardContext';
import { HabitTrackerProvider } from './HabitTrackerContext';
import { PinBoard } from './components/PinBoard';
import { globalEmitter } from './events';
import { TaskPlannerProvider } from './TaskPlannerContext';
import { MediaProvider } from './MediaContext';

const WINDOW_STATE_KEY = 'retro_os_window_state';

const OS: React.FC = () => {
    const { theme, getActiveColorScheme, getActiveFont } = useTheme();
    const { notes, addNote, deleteNote } = useStickyNotes();
    const mainRef = useRef<HTMLDivElement>(null);
    const [isPinBoardOpen, setIsPinBoardOpen] = useState(false);
    const [isBooting, setIsBooting] = useState(true);
    const [syncId] = useState(localStorage.getItem('retro_os_sync_id'));

    const [windows, setWindows] = useState<WindowInstance[]>(() => {
        try {
            const state = localStorage.getItem(WINDOW_STATE_KEY);
            return state ? JSON.parse(state).windows : [];
        } catch { return []; }
    });

    const [activeWindowId, setActiveWindowId] = useState<string | null>(() => {
        try {
            const state = localStorage.getItem(WINDOW_STATE_KEY);
            return state ? JSON.parse(state).activeWindowId : null;
        } catch { return null; }
    });

    const [nextZIndex, setNextZIndex] = useState<number>(() => {
        try {
            const state = localStorage.getItem(WINDOW_STATE_KEY);
            const savedState = state ? JSON.parse(state) : {};
            if (!savedState.windows || savedState.windows.length === 0) return 10;
            const maxZ = Math.max(
                savedState.nextZIndex || 0,
                ...savedState.windows.map((w: WindowInstance) => w.zIndex)
            );
            return maxZ + 1;
        } catch { return 10; }
    });
    
    useEffect(() => {
        const stateToSave = { windows, activeWindowId, nextZIndex };
        localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(stateToSave));
    }, [windows, activeWindowId, nextZIndex]);

    useEffect(() => {
        // Initial "Boot" sequence to feel authentic and check sync status
        const timer = setTimeout(() => setIsBooting(false), syncId ? 1800 : 800);
        return () => clearTimeout(timer);
    }, [syncId]);

    const togglePinBoard = useCallback(() => {
        setIsPinBoardOpen(prev => !prev);
    }, []);

    const focusWindow = useCallback((id: string) => {
        setWindows(prevWindows => {
            const alreadyActive = activeWindowId === id;
            if (alreadyActive && prevWindows.find(w => w.id === id)?.zIndex === nextZIndex - 1) return prevWindows;
            
            return prevWindows.map(w => (w.id === id ? { ...w, zIndex: nextZIndex } : w));
        });
        setActiveWindowId(id);
        setNextZIndex(prev => prev + 1);
    }, [activeWindowId, nextZIndex]);

    const openApp = useCallback((appId: string, props: Record<string, any> = {}) => {
        if (appId === 'stickies') {
            addNote();
            return;
        }

        const app = APPS.find(a => a.id === appId);
        if (!app) return;

        const newPos = { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 };
        const newWindow: WindowInstance = {
            id: `win-${Date.now()}`,
            appId,
            zIndex: nextZIndex,
            position: newPos,
            size: app.defaultSize,
            props,
        };
        setWindows(prev => [...prev, newWindow]);
        setActiveWindowId(newWindow.id);
        setNextZIndex(p => p + 1);
    }, [nextZIndex, addNote]);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => {
            const win = prev.find(w => w.id === id);
            if (win) {
                if (win.isNote && win.props?.noteId) {
                    deleteNote(win.props.noteId);
                }
                const filtered = prev.filter(w => w.id !== id);
                if (activeWindowId === id) setActiveWindowId(null);
                return filtered;
            }
            return prev;
        });
    }, [activeWindowId, deleteNote]);

    // Handle Global Menu Bar Events
    useEffect(() => {
        const handleGlobalOpen = (data: { appId: string, props?: any }) => {
            openApp(data.appId, data.props || {});
        };

        const handleGlobalQuit = (data: { instanceId: string }) => {
            closeWindow(data.instanceId);
        };

        globalEmitter.subscribe('app:open', handleGlobalOpen);
        globalEmitter.subscribe('app:quit', handleGlobalQuit);

        return () => {
            globalEmitter.unsubscribe('app:open', handleGlobalOpen);
            globalEmitter.unsubscribe('app:quit', handleGlobalQuit);
        };
    }, [openApp, closeWindow]);

    const handlePositionChange = useCallback((id: string, position: { x: number; y: number }) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, position } : w)));
    }, []);

    const handleSizeChange = useCallback((id: string, size: { width: number; height: number }) => {
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, size } : w)));
    }, []);

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
    }, []);
    
    const splitWindow = useCallback((id: string, direction: 'left' | 'right' | 'top' | 'bottom') => {
        const { innerWidth, innerHeight } = window;
        const menuBarHeight = 24;
        const usableHeight = innerHeight - menuBarHeight;
        let newPos, newSize;
        switch (direction) {
            case 'left': newPos = { x: 0, y: 0 }; newSize = { width: innerWidth / 2, height: usableHeight }; break;
            case 'right': newPos = { x: innerWidth / 2, y: 0 }; newSize = { width: innerWidth / 2, height: usableHeight }; break;
            case 'top': newPos = { x: 0, y: 0 }; newSize = { width: innerWidth, height: usableHeight / 2 }; break;
            case 'bottom': newPos = { x: 0, y: usableHeight / 2 }; newSize = { width: innerWidth, height: usableHeight / 2 }; break;
        }
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, position: newPos, size: newSize, isMinimized: false } : w)));
        focusWindow(id);
    }, [focusWindow]);

    useEffect(() => {
        const colorScheme = getActiveColorScheme();
        const font = getActiveFont();
        Object.entries(colorScheme.colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(key, value);
        });
        document.documentElement.style.setProperty('--main-font', font.fontFamily);
        document.body.dataset.uimode = theme.uiMode;
    }, [theme, getActiveColorScheme, getActiveFont]);

    const appContextValue = useMemo(() => ({ openApp }), [openApp]);
    const desktopSizeClasses = theme.desktopMode === 'fixed' ? 'h-full w-full overflow-hidden' : 'h-[200vh] w-[200vw] overflow-auto';

    const activeApp = useMemo(() => {
        const activeWin = windows.find(w => w.id === activeWindowId);
        if (!activeWin) return null;
        return APPS.find(a => a.id === activeWin.appId) || null;
    }, [windows, activeWindowId]);

    if (isBooting) {
        return (
            <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white font-mono z-[1000]">
                <div className="w-80 p-4 border-2 border-white space-y-4">
                    <div className="flex justify-between border-b border-white pb-2">
                        <span className="font-bold">RETRO OS v2.4</span>
                        <span className="animate-pulse">●</span>
                    </div>
                    <div className="text-[10px] space-y-1">
                        <p>CPU: 80486DX2 66MHz</p>
                        <p>MEM: 16384 KB OK</p>
                        <p>VFS: MACINTOSH HD MOUNTED</p>
                        {syncId ? (
                            <>
                                <p className="text-green-400">NET: GLOBAL LINK DETECTED</p>
                                <p className="text-green-400">ID: {syncId}</p>
                                <p className="animate-[pulse_1s_infinite]">SYNCING CLOUD DATA...</p>
                            </>
                        ) : (
                            <p className="text-gray-500">NET: NO CLOUD LINK DETECTED</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
         <AppContext.Provider value={appContextValue}>
            <main ref={mainRef} id="os-container" data-desktop-mode={theme.desktopMode} className={`relative ${desktopSizeClasses} wallpaper-${theme.wallpaper}`}>
                <Dock
                    onAppClick={openApp}
                    activeApp={activeApp}
                    activeWindowId={activeWindowId}
                    windows={windows}
                    onWindowFocus={focusWindow}
                    togglePinBoard={togglePinBoard}
                />
                <div className="relative w-full h-[calc(100%-24px)]">
                    <Desktop />
                    <PinBoard isOpen={isPinBoardOpen} onClose={togglePinBoard} />
                    {windows.map(instance => {
                        const app = APPS.find(a => a.id === instance.appId);
                        if (!app) return null;
                        return (
                            <Window
                                key={instance.id}
                                instance={instance}
                                app={app}
                                allWindows={windows}
                                onClose={closeWindow}
                                onFocus={focusWindow}
                                onPositionChange={handlePositionChange}
                                onSizeChange={handleSizeChange}
                                isActive={instance.id === activeWindowId}
                                onMinimize={minimizeWindow}
                                onSplit={splitWindow}
                            />
                        );
                    })}
                </div>
            </main>
        </AppContext.Provider>
    );
}

const App: React.FC = () => (
    <ThemeProvider>
        <FileSystemProvider>
            <DocumentProvider>
                <CardProvider>
                    <StickyNoteProvider>
                        <NotebookProvider>
                            <TaskPlannerProvider>
                                <MediaProvider>
                                    <PinBoardProvider>
                                        <HabitTrackerProvider>
                                            <OS />
                                        </HabitTrackerProvider>
                                    </PinBoardProvider>
                                </MediaProvider>
                            </TaskPlannerProvider>
                        </NotebookProvider>
                    </StickyNoteProvider>
                </CardProvider>
            </DocumentProvider>
        </FileSystemProvider>
    </ThemeProvider>
);

export default App;
