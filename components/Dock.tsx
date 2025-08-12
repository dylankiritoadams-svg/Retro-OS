import React, { useState, useRef, useEffect, useCallback } from 'react';
import { APPS, AppleIcon, WindowsIcon } from '../constants';
import { AppDefinition, MenuDefinition, MenuItemDefinition, WindowInstance } from '../types';
import { globalEmitter } from '../events';
import { useTheme } from '../SettingsContext';

interface DockProps {
    onAppClick: (appId: string) => void;
    activeApp: AppDefinition | null;
    activeWindowId: string | null;
    windows: WindowInstance[];
    onWindowFocus: (id: string) => void;
}

const GlobalMenu: React.FC<{ menu: MenuDefinition, activeWindowId: string | null, closeMenu: () => void }> = ({ menu, activeWindowId, closeMenu }) => (
    <ul>
        {menu.items.map((item, index) => {
            if (item.separator) {
                return <hr key={`sep-${index}`} className="border-t border-gray-400 my-1"/>
            }
            return (
                <li key={item.label}>
                    <button
                        onMouseDown={(e) => {
                            e.preventDefault();
                            if (!item.disabled) {
                                globalEmitter.emit(item.event, { instanceId: activeWindowId });
                                closeMenu();
                            }
                        }}
                        disabled={item.disabled}
                        className="w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center gap-2 disabled:text-gray-400 disabled:hover:bg-white disabled:cursor-default"
                    >
                        {item.label}
                    </button>
                </li>
            );
        })}
    </ul>
);

const Clock: React.FC<{ uiMode: 'mac' | 'windows' }> = ({ uiMode }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    if (uiMode === 'mac') {
        const formattedDate = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return (
            <div className="px-3">
                {formattedDate} {formattedTime}
            </div>
        );
    }

    // Windows Mode
    const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
     return (
        <div className="taskbar-clock win95-border-inset">
            {formattedTime}
        </div>
    );
}

const SecretMenu: React.FC<{onSwitch: () => void, onClose: () => void, uiMode: 'mac' | 'windows'}> = ({ onSwitch, onClose, uiMode }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const menuStyle: React.CSSProperties = uiMode === 'mac' ? { top: '100%', marginTop: '4px' } : { bottom: '100%', marginBottom: '2px' };

    return (
        <div ref={menuRef} className="absolute left-0 w-48 bg-white border-2 border-black shadow-lg z-50" style={menuStyle}>
            <ul>
                <li>
                    <button onClick={onSwitch} className="w-full text-left px-3 py-1 hover:bg-black hover:text-white">
                        Switch Sides
                    </button>
                </li>
            </ul>
        </div>
    );
}


const Dock: React.FC<DockProps> = ({ onAppClick, activeApp, activeWindowId, windows, onWindowFocus }) => {
    const { theme, setUiMode } = useTheme();
    const { uiMode } = theme;

    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showSecretMenu, setShowSecretMenu] = useState(false);
    const clickCount = useRef(0);
    const clickTimer = useRef<number | null>(null);

    const menuBarRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (title: string) => {
        setActiveMenu(prev => (prev === title ? null : title));
    };
    
    const handleAppClick = (appId: string) => {
        onAppClick(appId);
        setActiveMenu(null);
    };

    const handleLogoClick = () => {
        clickCount.current += 1;
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
        }
        clickTimer.current = window.setTimeout(() => {
            if (clickCount.current === 1) {
                toggleMenu(uiMode === 'mac' ? 'apple' : 'start');
            }
            clickCount.current = 0;
        }, 300);

        if (clickCount.current === 3) {
            if (clickTimer.current) clearTimeout(clickTimer.current);
            clickCount.current = 0;
            setShowSecretMenu(s => !s);
            setActiveMenu(null);
        }
    };
    
    const switchSides = () => {
        setUiMode(uiMode === 'mac' ? 'windows' : 'mac');
        setShowSecretMenu(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const defaultMenus: MenuDefinition[] = [
      { title: 'File', items: [] },
      { title: 'Edit', items: [] },
    ];
    
    const menusToRender = activeApp?.menus && activeApp.menus.length > 0 ? activeApp.menus : defaultMenus;
    
    const gameAppIds = new Set(['pixel-pegs', 'zurg-cabin', 'old-pc', 'brick-breaker', 'pong', 'tetris', 'pac-man']);
    const utilityApps = APPS.filter(app => !gameAppIds.has(app.id) && app.id !== 'finder' && app.id !== 'settings');
    const gameApps = APPS.filter(app => gameAppIds.has(app.id));

    const AppMenuItem: React.FC<{app: AppDefinition}> = ({ app }) => (
      <li>
        <button
            onClick={() => handleAppClick(app.id)}
            className="w-full text-left px-3 py-1 hover:bg-black hover:text-white flex items-center gap-2"
        >
            <div className="w-6 h-6 flex items-center justify-center">
                {React.cloneElement(app.icon as React.ReactElement<{ className?: string }>, { className: "h-5 w-5" })}
            </div>
            {app.name}
        </button>
      </li>
    );

    if (uiMode === 'windows') {
        return (
            <header ref={menuBarRef} className="taskbar">
                <div className="relative">
                    <button
                        className="taskbar-start-btn win95-border-outset"
                        onClick={handleLogoClick}
                    >
                        <WindowsIcon className="h-5 w-5" />
                        <span>Start</span>
                    </button>
                    {showSecretMenu && <SecretMenu onSwitch={switchSides} onClose={() => setShowSecretMenu(false)} uiMode="windows"/>}
                    {activeMenu === 'start' && (
                        <div className="absolute bottom-full mb-1 left-0 bg-[var(--win95-silver)] p-1 win95-border-outset w-56 z-50">
                            <div className="relative group">
                                <div className="flex justify-between items-center p-1 hover:bg-[var(--win95-navy)] hover:text-white cursor-default">
                                    <span>Utilities</span>
                                    <span className="text-xs font-mono">▶</span>
                                </div>
                                <div className="absolute left-full bottom-0 w-56 bg-[var(--win95-silver)] p-1 win95-border-outset hidden group-hover:block">
                                    {utilityApps.map(app => (
                                        <button key={app.id} onClick={() => handleAppClick(app.id)} className="w-full text-left p-1 flex items-center gap-2 hover:bg-[var(--win95-navy)] hover:text-white">
                                           {React.cloneElement(app.icon, {className: "h-5 w-5"})}
                                           <span className="truncate">{app.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="flex justify-between items-center p-1 hover:bg-[var(--win95-navy)] hover:text-white cursor-default">
                                    <span>Games</span>
                                    <span className="text-xs font-mono">▶</span>
                                </div>
                                <div className="absolute left-full bottom-0 w-56 bg-[var(--win95-silver)] p-1 win95-border-outset hidden group-hover:block">
                                    {gameApps.map(app => (
                                         <button key={app.id} onClick={() => handleAppClick(app.id)} className="w-full text-left p-1 flex items-center gap-2 hover:bg-[var(--win95-navy)] hover:text-white">
                                           {React.cloneElement(app.icon, {className: "h-5 w-5"})}
                                           <span className="truncate">{app.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <hr className="my-1 border-t-[var(--win95-dark-gray)] border-b-[var(--win95-white)]"/>
                            <button key={'finder'} onClick={() => handleAppClick('finder')} className="w-full text-left p-1 flex items-center gap-2 hover:bg-[var(--win95-navy)] hover:text-white">
                                {React.cloneElement(APPS.find(a => a.id === 'finder')!.icon, {className: "h-5 w-5"})}
                                <span>Finder</span>
                            </button>
                            <button key={'settings'} onClick={() => handleAppClick('settings')} className="w-full text-left p-1 flex items-center gap-2 hover:bg-[var(--win95-navy)] hover:text-white">
                                {React.cloneElement(APPS.find(a => a.id === 'settings')!.icon, {className: "h-5 w-5"})}
                                <span>System Settings</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-full w-px bg-[var(--win95-dark-gray)] border-r border-white mx-1"></div>

                {windows.map(win => {
                    const app = APPS.find(a => a.id === win.appId);
                    return (
                        <button key={win.id} className={`taskbar-window-btn ${win.id === activeWindowId ? 'active win95-border-inset' : 'win95-border-outset'}`} onClick={() => onWindowFocus(win.id)}>
                            {app && React.cloneElement(app.icon, {className: "h-4 w-4"})}
                            <span className="truncate">{app?.name}</span>
                        </button>
                    )
                })}
                
                <Clock uiMode="windows" />
            </header>
        );
    }
    
    // Mac Mode
    return (
        <header ref={menuBarRef} className="w-full bg-white border-b-2 border-black p-1 text-black flex items-center select-none text-sm">
            <div className="flex items-center space-x-4">
                <div className="relative inline-block">
                    <button
                        onClick={handleLogoClick}
                        onMouseEnter={() => activeMenu && setActiveMenu('apple')}
                        className={`px-3 py-0.5 ${activeMenu === 'apple' ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >
                        <AppleIcon />
                    </button>
                     {showSecretMenu && <SecretMenu onSwitch={switchSides} onClose={() => setShowSecretMenu(false)} uiMode="mac"/>}
                    {activeMenu === 'apple' && (
                        <div className="absolute left-0 mt-1 w-48 bg-white border-2 border-black shadow-lg z-50">
                            <ul>
                                <li className="relative group">
                                    <div className="px-3 py-1 flex justify-between items-center hover:bg-black hover:text-white cursor-default">
                                        <span>Utilities</span>
                                        <span className="text-xs">▶</span>
                                    </div>
                                    <div className="absolute left-full top-0 -mt-0.5 w-48 bg-white border-2 border-black shadow-lg z-50 hidden group-hover:block">
                                        <ul>
                                            {utilityApps.map(app => <AppMenuItem key={app.id} app={app} />)}
                                        </ul>
                                    </div>
                                </li>
                                <li className="relative group">
                                    <div className="px-3 py-1 flex justify-between items-center hover:bg-black hover:text-white cursor-default">
                                        <span>Games</span>
                                        <span className="text-xs">▶</span>
                                    </div>
                                    <div className="absolute left-full top-0 -mt-0.5 w-48 bg-white border-2 border-black shadow-lg z-50 hidden group-hover:block">
                                        <ul>
                                            {gameApps.map(app => <AppMenuItem key={app.id} app={app} />)}
                                        </ul>
                                    </div>
                                </li>
                                 <hr className="border-t border-gray-400 my-1"/>
                                 <AppMenuItem app={APPS.find(a => a.id === 'finder')!} />
                                 <AppMenuItem app={APPS.find(a => a.id === 'settings')!} />
                            </ul>
                        </div>
                    )}
                </div>

                {menusToRender.map(menu => (
                    <div key={menu.title} className="relative inline-block">
                         <button
                            onMouseDown={() => toggleMenu(menu.title)}
                            onMouseEnter={() => activeMenu && setActiveMenu(menu.title)}
                            className={`px-3 py-0.5 ${activeMenu === menu.title ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                            {menu.title}
                        </button>
                         {activeMenu === menu.title && menu.items.length > 0 && (
                            <div className="absolute left-0 mt-1 w-48 bg-white border-2 border-black shadow-lg z-50">
                                <GlobalMenu menu={menu} activeWindowId={activeWindowId} closeMenu={() => setActiveMenu(null)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="ml-auto">
                <Clock uiMode="mac" />
            </div>
        </header>
    );
};

export default Dock;