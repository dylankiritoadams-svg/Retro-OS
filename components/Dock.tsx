
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { APPS, AppleIcon, WindowsIcon, PinBoardIcon } from '../constants';
import { useApp } from '../types';
import type { AppDefinition, MenuDefinition, MenuItem, VFSFile, WindowInstance } from '../types';
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

const flashEffect = (callback: () => void) => {
    let count = 0;
    const interval = setInterval(() => {
        document.body.classList.toggle('invert-selection');
        count++;
        if (count === 6) {
            clearInterval(interval);
            document.body.classList.remove('invert-selection');
            callback();
        }
    }, 80);
};

const GlobalMenu: React.FC<{ 
    menu: MenuDefinition, 
    onHoverItem: (label: string | null) => void,
    hoveredItem: string | null
}> = ({ menu, onHoverItem, hoveredItem }) => {
    return (
        <div className="classic-dropdown-menu">
            {menu.items.map((item, index) => {
                if ('separator' in item && item.separator) {
                    return <hr key={`sep-${index}`} />
                }
                if ('label' in item) {
                    const isHovered = hoveredItem === item.label;
                    return (
                        <button
                            key={item.label}
                            className={isHovered ? 'bg-black text-white' : ''}
                            onMouseEnter={() => onHoverItem(item.label)}
                            onMouseLeave={() => onHoverItem(null)}
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
};

const AppleMenu: React.FC<{ 
    onHoverItem: (label: string | null) => void,
    hoveredItem: string | null
}> = ({ onHoverItem, hoveredItem }) => {
    const { findNodeByPath, getChildren } = useFileSystem();
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const isFullscreen = !!document.fullscreenElement;

    const appCategories = useMemo(() => [
        { name: 'Apps', path: '/Desktop/Apps' },
        { name: 'Games', path: '/Desktop/Games' },
        { name: 'Utilities', path: '/Desktop/Utilities' },
    ], []);

    const getAppsForFolder = useCallback((path: string): VFSFile[] => {
        const folder = findNodeByPath(path);
        if (folder && folder.type === 'folder') {
            return getChildren(folder.id).filter(node => node.type === 'file') as VFSFile[];
        }
        return [];
    }, [findNodeByPath, getChildren]);

    return (
        <div className="classic-dropdown-menu">
            <button 
                onMouseEnter={() => onHoverItem('System Settings...')}
                className={hoveredItem === 'System Settings...' ? 'bg-black text-white' : ''}
            >System Settings...</button>
            <hr />
            <button 
                onMouseEnter={() => onHoverItem('Fullscreen')}
                className={hoveredItem === 'Fullscreen' ? 'bg-black text-white' : ''}
            >
                {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            </button>
            <hr />
            {appCategories.map(category => {
                const apps = getAppsForFolder(category.path);
                if (apps.length === 0) return null;
                return (
                    <div 
                        key={category.name} 
                        className="relative" 
                        onMouseEnter={() => { setOpenSubMenu(category.name); onHoverItem(category.name); }}
                        onMouseLeave={() => { setOpenSubMenu(null); onHoverItem(null); }}
                    >
                        <button className={`w-full flex justify-between items-center ${hoveredItem === category.name ? 'bg-black text-white' : ''}`}>
                            <span>{category.name}</span>
                            <span className="mr-2">►</span>
                        </button>
                        {openSubMenu === category.name && (
                            <div className="classic-dropdown-menu classic-submenu">
                                {apps.sort((a,b) => a.name.localeCompare(b.name)).map(appFile => (
                                    <button 
                                        key={appFile.id} 
                                        onMouseEnter={() => onHoverItem(`app:${appFile.appId}`)}
                                        className={hoveredItem === `app:${appFile.appId}` ? 'bg-black text-white' : ''}
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
    );
};

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);
    return <span className="select-none">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
};

const GlobalMenuBar: React.FC<DockProps> = ({ activeApp, activeWindowId, togglePinBoard }) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const isMouseDownRef = useRef(false);
    const menuBarRef = useRef<HTMLDivElement>(null);

    const closeAllMenus = useCallback(() => {
        setActiveMenu(null);
        setHoveredItem(null);
        isMouseDownRef.current = false;
    }, []);

    const executeAction = useCallback((itemLabel: string) => {
        if (!itemLabel) return;
        
        const trigger = () => {
            if (itemLabel === 'System Settings...') {
                 globalEmitter.emit('app:open', { appId: 'settings' });
            } else if (itemLabel === 'Fullscreen') {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
            } else if (itemLabel.startsWith('app:')) {
                const id = itemLabel.split(':')[1];
                globalEmitter.emit('app:open', { appId: id });
            } else if (itemLabel === `Quit ${activeApp?.name}`) {
                if (activeWindowId) globalEmitter.emit('app:quit', { instanceId: activeWindowId });
            } else {
                const allCustomItems = (activeApp?.menus?.flatMap(m => m.items) || []).filter((i): i is MenuItem => 'label' in i);
                const found = allCustomItems.find(i => i.label === itemLabel);
                if (found) globalEmitter.emit(found.event, { instanceId: activeWindowId });
            }
            closeAllMenus();
        };

        flashEffect(trigger);
    }, [activeApp, activeWindowId, closeAllMenus]);

    const handleMouseDown = (title: string) => {
        isMouseDownRef.current = true;
        setActiveMenu(title);
    };

    const handleMouseEnterTitle = (title: string) => {
        if (isMouseDownRef.current) {
            setActiveMenu(title);
        }
    };

    const handleMouseUpGlobal = useCallback(() => {
        if (isMouseDownRef.current) {
            if (hoveredItem) {
                executeAction(hoveredItem);
            } else {
                closeAllMenus();
            }
        }
    }, [hoveredItem, executeAction, closeAllMenus]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUpGlobal);
        return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
    }, [handleMouseUpGlobal]);

    return (
        <nav ref={menuBarRef} className="classic-menu-bar select-none">
            <div className="flex items-center h-full">
                <div className="relative h-full">
                    <button 
                        onMouseDown={() => handleMouseDown('Apple')}
                        onMouseEnter={() => handleMouseEnterTitle('Apple')}
                        className={`classic-apple-button ${activeMenu === 'Apple' ? 'active' : ''}`}
                    >
                        <AppleIcon />
                    </button>
                    {activeMenu === 'Apple' && (
                        <AppleMenu onHoverItem={setHoveredItem} hoveredItem={hoveredItem} />
                    )}
                </div>

                {activeApp && (
                     <div className="relative h-full">
                        <button 
                             onMouseDown={() => handleMouseDown(activeApp.name)}
                             onMouseEnter={() => handleMouseEnterTitle(activeApp.name)}
                             className={`classic-menu-item font-bold ${activeMenu === activeApp.name ? 'active' : ''}`}
                        >
                            {activeApp.name}
                        </button>
                        {activeMenu === activeApp.name && (
                             <div className="classic-dropdown-menu">
                                <button 
                                    onMouseEnter={() => setHoveredItem(`Quit ${activeApp.name}`)}
                                    className={hoveredItem === `Quit ${activeApp.name}` ? 'bg-black text-white' : ''}
                                >
                                    Quit {activeApp.name}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeApp?.menus?.map(menu => (
                    <div key={menu.title} className="relative h-full">
                        <button 
                             onMouseDown={() => handleMouseDown(menu.title)}
                             onMouseEnter={() => handleMouseEnterTitle(menu.title)}
                             className={`classic-menu-item ${activeMenu === menu.title ? 'active' : ''}`}
                        >
                            {menu.title}
                        </button>
                        {activeMenu === menu.title && (
                            <GlobalMenu 
                                menu={menu} 
                                onHoverItem={setHoveredItem}
                                hoveredItem={hoveredItem}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="ml-auto flex items-center h-full px-2 space-x-4">
                 <button onMouseDown={togglePinBoard} className="h-full flex items-center px-2 hover:bg-black hover:text-white">
                    <PinBoardIcon />
                </button>
                <Clock />
            </div>
            <style>{`
                .invert-selection .classic-dropdown-menu button.bg-black {
                    background-color: white !important;
                    color: black !important;
                }
            `}</style>
        </nav>
    );
}

const WindowsTaskbar: React.FC<DockProps> = ({ windows, activeWindowId, onWindowFocus }) => {
    const [time, setTime] = useState(new Date());
    const { setUiMode } = useTheme();

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <footer className="taskbar h-10 flex-shrink-0 select-none">
            <button className="taskbar-start-btn win95-border-outset" onClick={() => setUiMode('mac')}>
                <WindowsIcon /> Start
            </button>
            <div className="h-full w-px bg-gray-500 border-r border-white"></div>
            {windows.map(win => {
                 const app = APPS.find(a => a.id === win.appId);
                 if (!app) return null;
                 return (
                     <button key={win.id} onClick={() => onWindowFocus(win.id)} className={`taskbar-window-btn ${win.id === activeWindowId ? 'active' : 'win95-border-outset'}`}>
                         {React.cloneElement(app.icon as React.ReactElement<any>, { className: "h-5 w-5" })}
                         <span>{app.name}</span>
                     </button>
                 );
            })}
             <div className="taskbar-clock win95-border-inset ml-auto font-mono">
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
