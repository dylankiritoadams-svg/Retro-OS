import React, { useState, useCallback, createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { WindowInstance, AppDefinition } from './types';
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

interface AppContextType {
    openApp: (appId: string, props?: Record<string, any>) => void;
}
export const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
    const context = useContext(AppContext);
    if(!context) throw new Error("useApp must be used within an AppProvider");
    return context;
}

const WINDOW_STATE_KEY = 'retro_os_window_state';

const OS: React.FC = () => {
    const { theme, getActiveColorScheme, getActiveFont } = useTheme();
    const { notes, addNote, deleteNote } = useStickyNotes();
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
            const maxZ = Math.max(
                savedState.nextZIndex || 0,
                ...(savedState.windows?.map((w: WindowInstance) => w.zIndex) || [0])
            );
            return maxZ + 1;
        } catch { return 10; }
    });

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
                 if(!app) continue;
                 const newWindow: WindowInstance = {
                    id: `note-win-${note.id}`,
                    appId: app.id,
                    zIndex: nextZIndex,
                    position: { x: 50 + ((windows.length % 10) * 20), y: 50 + ((windows.length % 10) * 20) },
                    size: app.defaultSize,
                    props: { noteId: note.id },
                    isNote: true,
                };
                setWindows(prev => [...prev, newWindow]);
                setActiveWindowId(newWindow.id);
                setNextZIndex(prev => prev + 1);
            }
        }

        // Remove windows for deleted notes
        const noteIdsInData = new Set(notes.map(n => n.id));
        const windowsToRemove = noteWindows.filter(w => !noteIdsInData.has(w.props?.noteId as string));
        if (windowsToRemove.length > 0) {
            const idsToRemove = new Set(windowsToRemove.map(w => w.id));
            setWindows(prev => prev.filter(w => !idsToRemove.has(w.id)));
        }

    }, [notes, nextZIndex, windows.length]);

    // Save state to localStorage
    useEffect(() => {
        try {
            const stateToSave = { windows, activeWindowId, nextZIndex };
            localStorage.setItem(WINDOW_STATE_KEY, JSON.stringify(stateToSave));
        } catch (e) {
            console.error("Error saving window state:", e);
        }
    }, [windows, activeWindowId, nextZIndex]);
    
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
        if (appId === 'stickies') {
            addNote(); // This will trigger the useEffect to create a window
            return;
        }

        const app = APPS.find(a => a.id === appId);
        if (!app) return;
        
        const mainEl = mainRef.current;
        const viewportWidth = mainEl ? mainEl.clientWidth : window.innerWidth;
        const viewportHeight = mainEl ? mainEl.clientHeight : window.innerHeight;
        const scrollLeft = mainEl ? mainEl.scrollLeft : 0;
        const scrollTop = mainEl ? mainEl.scrollTop : 0;

        const newWindow: WindowInstance = {
            id: `win-${Date.now()}`,
            appId: app.id,
            zIndex: nextZIndex,
            position: { 
                x: scrollLeft + (viewportWidth / 2) - (app.defaultSize.width / 2) + ((windows.length % 10) * 20),
                y: scrollTop + (viewportHeight / 2) - (app.defaultSize.height / 2) + ((windows.length % 10) * 20),
            },
            size: app.defaultSize,
            props: props || {},
        };
        setWindows(prev => [...prev, newWindow]);
        setActiveWindowId(newWindow.id);
        setNextZIndex(prev => prev + 1);
    }, [nextZIndex, windows.length, addNote]);

    const closeWindow = useCallback((id: string) => {
        const windowToClose = windows.find(w => w.id === id);

        if (windowToClose?.isNote && windowToClose.props?.noteId) {
            deleteNote(windowToClose.props.noteId);
        }
        
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
    }, [activeWindowId, windows, deleteNote]);

    useEffect(() => {
        const handleQuit = (data: { instanceId: string }) => {
            if (data?.instanceId) {
                closeWindow(data.instanceId);
            }
        };
        globalEmitter.subscribe('app:quit', handleQuit);
        return () => {
            globalEmitter.unsubscribe('app:quit', handleQuit);
        };
    }, [closeWindow]);


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

    const splitWindow = useCallback((id: string, direction: 'left' | 'right') => {
        if (!mainRef.current) return;

        const mainEl = mainRef.current;
        const viewportWidth = mainEl.clientWidth;
        const viewportHeight = mainEl.clientHeight;
        const scrollLeft = mainEl.scrollLeft;
        const scrollTop = mainEl.scrollTop;

        const newWidth = viewportWidth / 2;
        const newHeight = viewportHeight;
        const newX = direction === 'left' ? scrollLeft : scrollLeft + newWidth;
        const newY = scrollTop;

        setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x: newX, y: newY }, size: { width: newWidth, height: newHeight } } : w));
        focusWindow(id);
    }, [focusWindow]);

    const updateWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
        const topConstraint = theme.uiMode === 'mac' ? 24 : 0;
        const constrainedY = Math.max(topConstraint, position.y);
        
        setWindows(prev => prev.map(w => w.id === id ? { ...w, position: { x: position.x, y: constrainedY } } : w));
    }, [theme.uiMode]);

    const updateWindowSize = useCallback((id: string, size: { width: number, height: number }) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    }, []);

    const activeApp = useMemo(() => {
        const activeWindow = windows.find(w => w.id === activeWindowId);
        return activeWindow ? APPS.find(a => a.id === activeWindow.appId) || null : null;
    }, [activeWindowId, windows]);
    
    return (
        <AppContext.Provider value={{ openApp }}>
            <div className="h-screen w-screen relative overflow-hidden">
                <div className={`h-full w-full flex ${theme.uiMode === 'mac' ? 'flex-col' : 'flex-col-reverse'}`}>
                    <Dock
                        onAppClick={openApp}
                        activeApp={activeApp}
                        activeWindowId={activeWindowId}
                        windows={windows}
                        onWindowFocus={focusWindow}
                        togglePinBoard={togglePinBoard}
                    />
                    <main ref={mainRef} className="flex-grow relative overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="relative" style={{ width: '4000px', height: '3000px' }}>
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
                                        onSplit={splitWindow}
                                    />
                                );
                            })}
                        </div>
                    </main>
                </div>
                 <PinBoard isOpen={isPinBoardOpen} onClose={togglePinBoard} />
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
};

export default App;