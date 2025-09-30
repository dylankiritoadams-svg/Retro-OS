

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './SettingsContext';
import { FileSystemProvider } from './FileSystemContext';
import { DocumentProvider } from './DocumentContext';
import { CardProvider } from './CardContext';
import { StickyNoteProvider, useStickyNotes } from './StickyNoteContext';
import { NotebookProvider } from './NotebookContext';
import { TaskPlannerProvider } from './TaskPlannerContext';
import { PinBoardProvider } from './PinBoardContext';
import Desktop from './components/Desktop';
import Dock from './components/Dock';
import Window from './components/Window';
import { PinBoard } from './components/PinBoard';
import { AppContext, WindowInstance } from './types';
import { APPS } from './constants';
import { globalEmitter } from './events';

const DESKTOP_WIDTH = 2560;
const DESKTOP_HEIGHT = 1600;

const OsShell: React.FC = () => {
    const { theme, getActiveColorScheme } = useTheme();
    const [windows, setWindows] = useState<WindowInstance[]>([]);
    const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(10);
    const [isPinBoardOpen, setIsPinBoardOpen] = useState(false);

    const { addNote: addStickyNote } = useStickyNotes();

    const focusWindow = useCallback((id: string) => {
        if (id === activeWindowId && !windows.find(w => w.id === id)?.isMinimized) return;
        setWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w));
        setActiveWindowId(id);
        setNextZIndex(prev => prev + 1);
    }, [activeWindowId, nextZIndex, windows]);

    const openApp = useCallback((appId: string, props?: Record<string, any>) => {
        const app = APPS.find(a => a.id === appId);
        if (!app) return;
        
        if (appId === 'task-details' && props?.taskId) {
            const existingWindow = windows.find(w => w.appId === 'task-details' && w.props?.taskId === props.taskId);
            if (existingWindow) {
                focusWindow(existingWindow.id);
                return;
            }
        }
        
        if (appId === 'stickies') {
            const newNote = addStickyNote();
            openApp('stickynote-window', { noteId: newNote.id });
            return;
        }

        const newWindow: WindowInstance = {
            id: `win-${Date.now()}`,
            appId,
            zIndex: nextZIndex,
            position: { x: Math.random() * 400 + 100, y: Math.random() * 200 + 50 },
            size: app.defaultSize,
            isNote: appId === 'stickynote-window',
            props,
        };
        setWindows(prev => [...prev, newWindow]);
        setActiveWindowId(newWindow.id);
        setNextZIndex(prev => prev + 1);
    }, [nextZIndex, addStickyNote, windows, focusWindow]);

    const closeWindow = useCallback((id: string) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);
    
    useEffect(() => {
        const quitHandler = (data: { instanceId: string }) => {
            if(data.instanceId) {
                closeWindow(data.instanceId);
            }
        };
        globalEmitter.subscribe('app:quit', quitHandler);
        return () => globalEmitter.unsubscribe('app:quit', quitHandler);
    }, [closeWindow]);

    const updateWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
         const newPos = { ...position };

        // Always prevent window from being dragged above the top of the desktop area.
        newPos.y = Math.max(0, newPos.y);

        if (theme.desktopMode === 'fixed') {
            const win = windows.find(w => w.id === id);
            if (win) {
                const parentBounds = document.getElementById('desktop-area')?.getBoundingClientRect();
                if (parentBounds) {
                    // In fixed mode, also constrain left, right, and bottom edges.
                    newPos.x = Math.max(0, Math.min(newPos.x, parentBounds.width - win.size.width));
                    // The top is already constrained, now constrain the bottom.
                    newPos.y = Math.min(newPos.y, parentBounds.height - win.size.height);
                }
            }
        }
        setWindows(prev => prev.map(w => w.id === id ? { ...w, position: newPos } : w));
    }, [theme.desktopMode, windows]);

    const updateWindowSize = useCallback((id: string, size: { width: number, height: number }) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    }, []);

    const minimizeWindow = useCallback((id: string) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
        if (id === activeWindowId) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    const splitWindow = useCallback((id: string, direction: 'left' | 'right' | 'top' | 'bottom') => {
        const desktopArea = document.getElementById('desktop-area');
        if (!desktopArea) return;

        const { width: screenWidth, height: screenHeight } = desktopArea.getBoundingClientRect();
        
        let position: {x:number, y:number} = {x: 0, y: 0};
        let size: {width:number, height:number} = {width: 0, height: 0};
        
        switch(direction) {
            case 'left': 
                position = { x: 0, y: 0 };
                size = { width: screenWidth / 2, height: screenHeight };
                break;
            case 'right':
                position = { x: screenWidth / 2, y: 0 };
                size = { width: screenWidth / 2, height: screenHeight };
                break;
            case 'top':
                position = { x: 0, y: 0 };
                size = { width: screenWidth, height: screenHeight / 2 };
                break;
            case 'bottom':
                position = { x: 0, y: screenHeight / 2 };
                size = { width: screenWidth, height: screenHeight / 2 };
                break;
        }
        
        setWindows(prev => prev.map(w => w.id === id ? { ...w, position, size, isMinimized: false } : w));
        focusWindow(id);
    }, [focusWindow]);

    const activeApp = useMemo(() => {
        if (!activeWindowId) return null;
        const activeWindow = windows.find(w => w.id === activeWindowId);
        return activeWindow ? APPS.find(a => a.id === activeWindow.appId) || null : null;
    }, [activeWindowId, windows]);
    
    const appContextValue = { openApp };

    const wallpaperClass = {
        'grid': 'wallpaper-grid',
        'dots': 'wallpaper-dots',
        'none': ''
    }[theme.wallpaper];

    const desktopContainerStyle: React.CSSProperties = theme.desktopMode === 'scrolling' ? {
        minWidth: DESKTOP_WIDTH,
        minHeight: DESKTOP_HEIGHT,
    } : {
        width: '100%',
        height: '100%',
    };

    const isMacMode = theme.uiMode === 'mac';

    return (
        <AppContext.Provider value={appContextValue}>
            <main id="os-container" className={`os-shell h-screen w-screen flex flex-col font-[var(--main-font)] text-[var(--text-color)] bg-[var(--desktop-bg)]`} style={getActiveColorScheme().colors as React.CSSProperties}>
                {isMacMode && (
                    <Dock
                        onAppClick={openApp}
                        activeApp={activeApp}
                        activeWindowId={activeWindowId}
                        windows={windows}
                        onWindowFocus={focusWindow}
                        togglePinBoard={() => setIsPinBoardOpen(p => !p)}
                    />
                )}

                <div id="desktop-area" className="flex-grow relative overflow-hidden">
                    <div 
                        className={`absolute inset-0 ${wallpaperClass}`}
                        style={theme.desktopMode === 'scrolling' ? { overflow: 'auto' } : { overflow: 'hidden' }}
                    >
                        <div style={{ position: 'relative', ...desktopContainerStyle }}>
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
                                        onMinimize={minimizeWindow}
                                        onSplit={splitWindow}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {!isMacMode && (
                    <Dock
                        onAppClick={openApp}
                        activeApp={activeApp}
                        activeWindowId={activeWindowId}
                        windows={windows}
                        onWindowFocus={focusWindow}
                        togglePinBoard={() => setIsPinBoardOpen(p => !p)}
                    />
                )}
                 
                 <PinBoard isOpen={isPinBoardOpen} onClose={() => setIsPinBoardOpen(false)} />
            </main>
        </AppContext.Provider>
    );
};

const App: React.FC = () => (
    <ThemeProvider>
        <FileSystemProvider>
            <DocumentProvider>
                <CardProvider>
                    <StickyNoteProvider>
                        <NotebookProvider>
                            <TaskPlannerProvider>
                                <PinBoardProvider>
                                    <OsShell />
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