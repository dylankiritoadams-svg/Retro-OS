
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
import { PinBoard } from './components/PinBoard';
import { globalEmitter } from './events';
import { TaskPlannerProvider } from './TaskPlannerContext';

const WINDOW_STATE_KEY = 'retro_os_window_state';

const OS: React.FC = () => {
    const { theme, getActiveColorScheme, getActiveFont } = useTheme();
    const { notes, addNote } = useStickyNotes();
    const mainRef = useRef<HTMLDivElement>(null);
    const [isPinBoardOpen, setIsPinBoardOpen] = useState(false);

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

    const togglePinBoard = useCallback(() => {
        setIsPinBoardOpen(prev => !prev);
    }, []);

    // Sync sticky note data with window instances
    useEffect(() => {
        const noteWindows = windows.filter(w => w.isNote);
        const noteIdsWithWindows = new Set(noteWindows.map(w => w.props?.noteId));

        // Add windows for new notes
        for (const note of notes) {
            if (!noteIdsWithWindows.has(note.id)) {
                const app = APPS.find(a => a.id === 'stickynote-window');
                if (app) {
                    const newWindow: WindowInstance = {
                        id: `win-${note.id}`,
                        appId: app.id,
                        zIndex: nextZIndex,
                        position: { x: Math.random() * 400 + 50, y: Math.random() * 200 + 50 },
                        size: app.defaultSize,
                        isNote: true,
                        props: { noteId: note.id },
                    };
                    setWindows(prev => [...prev, newWindow]);
                    setNextZIndex(p => p + 1);
                }
            }
        }
        // Remove windows for deleted notes
        const noteIds = new Set(notes.map(n => n.id));
        const windowsToDelete = noteWindows.filter(w => !noteIds.has(w.props?.noteId));
        if (windowsToDelete.length > 0) {
            setWindows(prev => prev.filter(w => !windowsToDelete.some(dw => dw.id === w.id)));
        }
    }, [notes, windows, nextZIndex]);

    const focusWindow = useCallback((id: string) => {
        if (id === activeWindowId) return;

        setWindows(prevWindows =>
            prevWindows.map(w => (w.id === id ? { ...w, zIndex: nextZIndex } : w))
        );
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

        const newWindow: WindowInstance = {
            id: `win-${Date.now()}`,
            appId,
            zIndex: nextZIndex,
            position: { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 },
            size: app.defaultSize,
            props,
        };
        setWindows(prev => [...prev, newWindow]);
        focusWindow(newWindow.id);
    }, [nextZIndex, focusWindow, addNote]);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    const handlePositionChange = useCallback((id: string, position: { x: number; y: number }) => {
        let newPos = position;
        if (theme.desktopMode === 'fixed') {
            const win = windows.find(w => w.id === id);
            if (win) {
                newPos.x = Math.max(0, Math.min(position.x, window.innerWidth - win.size.width));
                newPos.y = Math.max(0, Math.min(position.y, window.innerHeight - 24)); // 24px for menu bar
            }
        }
        setWindows(prev => prev.map(w => (w.id === id ? { ...w, position: newPos } : w)));
    }, [windows, theme.desktopMode]);

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
            case 'left':
                newPos = { x: 0, y: 0 };
                newSize = { width: innerWidth / 2, height: usableHeight };
                break;
            case 'right':
                newPos = { x: innerWidth / 2, y: 0 };
                newSize = { width: innerWidth / 2, height: usableHeight };
                break;
            case 'top':
                newPos = { x: 0, y: 0 };
                newSize = { width: innerWidth, height: usableHeight / 2 };
                break;
            case 'bottom':
                newPos = { x: 0, y: usableHeight / 2 };
                newSize = { width: innerWidth, height: usableHeight / 2 };
                break;
        }

        setWindows(prev => prev.map(w => (w.id === id ? { ...w, position: newPos, size: newSize, isMinimized: false } : w)));
        focusWindow(id);
    }, [focusWindow]);

    useEffect(() => {
        const closeHandler = (data: { instanceId: string }) => closeWindow(data.instanceId);
        globalEmitter.subscribe('app:quit', closeHandler);
        return () => globalEmitter.unsubscribe('app:quit', closeHandler);
    }, [closeWindow]);
    
    const activeApp = useMemo(() => {
        const activeWindow = windows.find(w => w.id === activeWindowId);
        return activeWindow ? APPS.find(a => a.id === activeWindow.appId) || null : null;
    }, [activeWindowId, windows]);
    
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
    
    return (
         <AppContext.Provider value={appContextValue}>
            <main ref={mainRef} id="os-container" data-desktop-mode={theme.desktopMode} className={`relative h-[200vh] w-[200vw] wallpaper-${theme.wallpaper} overflow-auto`}>
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
                                <PinBoardProvider>
                                    <OS />
                                </PinBoardProvider>
                            </TaskPlannerProvider>
                        </NotebookProvider>
                    </StickyNoteProvider>
                </CardProvider>
            </DocumentProvider>
        </FileSystemProvider>
    </ThemeProvider>
);

export default App;
