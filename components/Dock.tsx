import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { APPS, AppleIcon, WindowsIcon, PinBoardIcon } from '../constants';
import { useApp } from '../types';
import type { AppDefinition, MenuDefinition, VFSFile, WindowInstance } from '../types';
import { globalEmitter } from '../events';
import { useTheme } from '../SettingsContext';
import { useFileSystem } from '../FileSystemContext';

interface DockProps {
    onAppClick: (appId: string) => void;
    activeApp: AppDefinition | null;
    activeWindowId: string | null;
    windows: WindowInstance[];
    onWindowFocus: (id: string) => void;
    togglePinBoard: () => void;
}

const useTripleClick = (callback: () => void) => {
    const clickCount = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handler = useCallback(() => {
        clickCount.current += 1;
        if (timer.current) {
            clearTimeout(timer.current);
        }
        timer.current = setTimeout(() => {
            clickCount.current = 0;
        }, 500); // 500ms window for triple click

        if (clickCount.current === 3) {
            if (timer.current) clearTimeout(timer.current);
            clickCount.current = 0;
            callback();
        }
    }, [callback]);

    return handler;
};

const GlobalMenu: React.FC<{ menu: MenuDefinition, activeWindowId: string | null, closeMenu: () => void }> = ({ menu, activeWindowId, closeMenu }) => (
    <div className="classic-dropdown-menu">
        {menu.items.map((item, index) => {
            if ('separator' in item && item.separator) {
                return <hr key={`sep-${index}`} />
            }
            if ('label' in item) {
                return (
                    <button
                        key={item.label}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (!item.disabled) {
                                globalEmitter.emit(item.event, { instanceId: activeWindowId });
                                closeMenu();
                            }
                        }}
                        disabled={item.disabled}
                    >
                        {item.label}
                    </button>
                );
            }
            return null;
        })}
    </div>
);


const AppleMenu: React.FC<{ closeMenu: () => void }> = ({ closeMenu }) => {
    const { openApp } = useApp();
    const { findNodeByPath, getChildren } = useFileSystem();
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
        closeMenu();
    };


    const getAppsForFolder = useCallback((path: string): VFSFile[] => {
        const folder = findNodeByPath(path);
        if (folder && folder.type === 'folder') {
            return getChildren(folder.id).filter(node => node.type === 'file') as VFSFile[];
        }
        return [];
    }, [findNodeByPath, getChildren]);

    const appCategories = useMemo(() => [
        { name: 'Apps', path: '/Desktop/Apps' },
        { name: 'Games', path: '/Desktop/Games' },
        { name: 'Utilities', path: '/Desktop/Utilities' },
    ], []);

    return (
        <div className="classic-dropdown-menu">
            <button onClick={() => { openApp('settings'); closeMenu(); }}>System Settings...</button>
            <hr />
            <button onClick={toggleFullscreen}>
                {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </button>
            <hr />
            <div onMouseLeave={() => setOpenSubMenu(null)}>
                {appCategories.map(category => {
                    const apps = getAppsForFolder(category.path);
                    if (apps.length === 0) return null; // Don't show empty categories
                    return (
                        <div 
                            key={category.name} 
                            className="relative" 
                            onMouseEnter={() => setOpenSubMenu(category.name)}
                        >
                            <button className="w-full flex justify-between items-center">
                                <span>{category.name}</span>
                                <span className="mr-2">►</span>
                            </button>
                            {openSubMenu === category.name && (
                                <div className="classic-dropdown-menu classic-submenu">
                                    {apps.sort((a,b) => a.name.localeCompare(b.name)).map(appFile => (
                                        <button 
                                            key={appFile.id} 
                                            onClick={() => { openApp(appFile.appId); closeMenu(); }}
                                        >
                                            {appFile.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 30000); // Update every 30 seconds
        return () => clearInterval(timer);
    }, []);
    return <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
};


const GlobalMenuBar: React.FC<DockProps> = ({ activeApp, activeWindowId, togglePinBoard }) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const { theme, setUiMode } = useTheme();
    const menuBarRef = useRef<HTMLDivElement>(null);

    const handleTripleClick = useTripleClick(() => {
        setUiMode(theme.uiMode === 'mac' ? 'windows' : 'mac');
    });

    const closeAllMenus = useCallback(() => setActiveMenu(null), []);

    const toggleMenu = (title: string) => {
        setActiveMenu(prev => (prev === title ? null : title));
    };
    
    const handleAppleClick = (e: React.MouseEvent) => {
        if(e.type === 'mousedown') handleTripleClick();
        toggleMenu('Apple');
    };

     const handleQuit = () => {
        if (activeWindowId) {
            globalEmitter.emit('app:quit', { instanceId: activeWindowId });
            closeAllMenus();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
                closeAllMenus();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeAllMenus]);

    return (
        <nav ref={menuBarRef} className="classic-menu-bar">
            <div className="flex items-center">
                <div className="relative">
                    <button 
                        onMouseDown={handleAppleClick}
                        className={`classic-apple-button ${activeMenu === 'Apple' ? 'active' : ''}`}
                    >
                        <AppleIcon />
                    </button>
                    {activeMenu === 'Apple' && <AppleMenu closeMenu={closeAllMenus} />}
                </div>

                {activeApp && (
                     <div className="relative h-full">
                        <button 
                             onMouseDown={() => toggleMenu(activeApp.name)}
                             className={`classic-menu-item font-bold ${activeMenu === activeApp.name ? 'active' : ''}`}
                        >
                            {activeApp.name}
                        </button>
                        {activeMenu === activeApp.name && (
                             <div className="classic-dropdown-menu">
                                <button onClick={handleQuit}>Quit {activeApp.name}</button>
                            </div>
                        )}
                    </div>
                )}

                {activeApp?.menus?.map(menu => (
                    <div key={menu.title} className="relative h-full">
                        <button 
                             onMouseDown={() => toggleMenu(menu.title)}
                             onMouseEnter={() => activeMenu && activeMenu !== 'Apple' && activeMenu !== activeApp?.name && setActiveMenu(menu.title)}
                             className={`classic-menu-item ${activeMenu === menu.title ? 'active' : ''}`}
                        >
                            {menu.title}
                        </button>
                        {activeMenu === menu.title && <GlobalMenu menu={menu} activeWindowId={activeWindowId} closeMenu={closeAllMenus} />}
                    </div>
                ))}
            </div>
            <div className="ml-auto flex items-center h-full px-2 space-x-4">
                 <button onClick={togglePinBoard} className="h-full flex items-center px-2 hover:bg-black hover:text-white">
                    <PinBoardIcon />
                </button>
                <Clock />
            </div>
        </nav>
    );
}

const WindowsTaskbar: React.FC<DockProps> = ({ onAppClick, windows, activeWindowId, onWindowFocus }) => {
    const [time, setTime] = useState(new Date());
    const { theme, setUiMode } = useTheme();

    const handleTripleClick = useTripleClick(() => {
        setUiMode(theme.uiMode === 'mac' ? 'windows' : 'mac');
    });

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <footer className="taskbar h-10 flex-shrink-0">
            <button className="taskbar-start-btn win95-border-outset" onClick={handleTripleClick}>
                <WindowsIcon /> Start
            </button>
            <div className="h-full w-px bg-gray-500 border-r border-white"></div>
            {windows.map(win => {
                 const app = APPS.find(a => a.id === win.appId);
                 if (!app) return null;
                 return (
                     <button key={win.id} onClick={() => onWindowFocus(win.id)} className={`taskbar-window-btn ${win.id === activeWindowId ? 'active' : 'win95-border-outset'}`}>
                         {React.cloneElement(app.icon, { className: "h-5 w-5" })}
                         <span>{app.name}</span>
                     </button>
                 );
            })}
             <div className="taskbar-clock win95-border-inset ml-auto">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </footer>
    );
};

const Dock: React.FC<DockProps> = (props) => {
    const { theme } = useTheme();
    return theme.uiMode === 'mac' ? <GlobalMenuBar {...props} /> : <WindowsTaskbar {...props} />;
};

export default Dock;