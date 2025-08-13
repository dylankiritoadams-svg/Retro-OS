

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WindowInstance, AppDefinition, MenuDefinition } from '../types';
import { useTheme } from '../SettingsContext';
import { globalEmitter } from '../events';

interface WindowProps {
    instance: WindowInstance;
    app: AppDefinition;
    onClose: (id: string) => void;
    onFocus: (id: string) => void;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onSizeChange: (id: string, size: { width: number, height: number }) => void;
    isActive: boolean;
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

const Win95Menu: React.FC<{ menus: MenuDefinition[], instanceId: string }> = ({ menus, instanceId }) => {
    const [activeMenuTitle, setActiveMenuTitle] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const toggleMenu = (title: string) => {
        setActiveMenuTitle(prev => prev === title ? null : title);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenuTitle(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={menuRef} className="win95-menu-bar">
            {menus.map(menu => (
                <div key={menu.title} className="relative">
                    <button
                        onMouseDown={() => toggleMenu(menu.title)}
                        onMouseEnter={() => activeMenuTitle && setActiveMenuTitle(menu.title)}
                        className={`win95-menu-item ${activeMenuTitle === menu.title ? 'active' : ''}`}
                    >
                        {menu.title}
                    </button>
                    {activeMenuTitle === menu.title && (
                        <div className="win95-dropdown-menu win95-border-outset">
                            {menu.items.map((item, index) => {
                                if (item.separator) return <hr key={`sep-${index}`} />;
                                return (
                                    <button
                                        key={item.label}
                                        disabled={item.disabled}
                                        onClick={() => {
                                            if(!item.disabled) {
                                                globalEmitter.emit(item.event, { instanceId });
                                                setActiveMenuTitle(null);
                                            }
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

const Window: React.FC<WindowProps> = ({ instance, app, onClose, onFocus, onPositionChange, onSizeChange, isActive }) => {
    const { theme } = useTheme();
    const { uiMode } = theme;

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const nodeRef = useRef<HTMLDivElement>(null);

    const handleFocus = useCallback(() => {
        if (!isActive) {
            onFocus(instance.id);
        }
    }, [isActive, onFocus, instance.id]);

    const handleInteractionStart = useCallback((e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, type: 'drag' | 'resize') => {
        if (!nodeRef.current) return;
        if (type === 'resize') e.stopPropagation();

        handleFocus();

        if (type === 'drag') setIsDragging(true);
        if (type === 'resize') setIsResizing(true);

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const rect = nodeRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };

        // Prevent default behavior like text selection or page scrolling
        e.preventDefault();
    }, [handleFocus]);

    const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (isDragging) {
            onPositionChange(instance.id, {
                x: clientX - dragOffset.current.x,
                y: clientY - dragOffset.current.y,
            });
        } else if (isResizing) {
            if (!nodeRef.current) return;
            const rect = nodeRef.current.getBoundingClientRect();
            const newWidth = Math.max(MIN_WIDTH, clientX - rect.left);
            const newHeight = Math.max(MIN_HEIGHT, clientY - rect.top);
            onSizeChange(instance.id, { width: newWidth, height: newHeight });
        }
    }, [isDragging, isResizing, instance.id, onPositionChange, onSizeChange]);
    
    const handleInteractionEnd = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleInteractionMove);
            document.addEventListener('mouseup', handleInteractionEnd);
            document.addEventListener('touchmove', handleInteractionMove, { passive: false });
            document.addEventListener('touchend', handleInteractionEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleInteractionMove);
            document.removeEventListener('mouseup', handleInteractionEnd);
            document.removeEventListener('touchmove', handleInteractionMove);
            document.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [isDragging, isResizing, handleInteractionMove, handleInteractionEnd]);

    const AppComponent = app.component;

    const macWindow = (
        <div
            ref={nodeRef}
            className="absolute bg-[var(--window-bg)] border-2 border-black rounded-lg window-shadow"
            style={{
                left: instance.position.x,
                top: instance.position.y,
                width: instance.size.width,
                height: instance.size.height,
                zIndex: instance.zIndex,
            }}
            onMouseDown={handleFocus}
            onTouchStart={handleFocus}
        >
            <header
                className={`flex items-center p-1 border-b-2 border-black ${isActive ? 'active-title-bar' : ''}`}
                onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                onTouchStart={(e) => handleInteractionStart(e, 'drag')}
            >
                <div className="flex space-x-1.5 pl-1">
                    <button onClick={() => onClose(instance.id)} className="w-3.5 h-3.5 bg-red-500 rounded-full border border-black"></button>
                    <button className="w-3.5 h-3.5 bg-yellow-500 rounded-full border border-black"></button>
                    <button className="w-3.5 h-3.5 bg-green-500 rounded-full border border-black"></button>
                </div>
                <h2 className="flex-grow text-center text-sm font-bold truncate pr-16">{app.name}</h2>
            </header>
            <main className="w-full h-[calc(100%-29px)] overflow-hidden">
                <AppComponent isActive={isActive} instanceId={instance.id} {...instance.props} />
            </main>
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    -45deg,
                    transparent,
                    transparent 2px,
                    rgba(0,0,0,0.5) 2px,
                    rgba(0,0,0,0.5) 4px
                  )`
                }}
                onMouseDown={(e) => handleInteractionStart(e, 'resize')}
                onTouchStart={(e) => handleInteractionStart(e, 'resize')}
            ></div>
        </div>
    );

    const windowsWindow = (
         <div
            ref={nodeRef}
            className="absolute win95-window win95-border-outset"
             style={{
                left: instance.position.x,
                top: instance.position.y,
                width: instance.size.width,
                height: instance.size.height,
                zIndex: instance.zIndex,
            }}
            onMouseDown={handleFocus}
            onTouchStart={handleFocus}
        >
            <div className={`win95-title-bar ${isActive ? '' : 'inactive'}`} onMouseDown={(e) => handleInteractionStart(e, 'drag')} onTouchStart={(e) => handleInteractionStart(e, 'drag')}>
                <span className="win95-title-bar-text">{app.name}</span>
                <div className="win95-title-bar-controls">
                    <button className="win95-border-outset" disabled>_</button>
                    <button className="win95-border-outset" disabled>❐</button>
                    <button className="win95-border-outset" onClick={() => onClose(instance.id)}>X</button>
                </div>
            </div>
            {app.menus && app.menus.length > 0 && <Win95Menu menus={app.menus} instanceId={instance.id} />}
            <main className="win95-content win95-border-inset h-[calc(100%-23px-26px)] overflow-hidden">
                 <AppComponent isActive={isActive} instanceId={instance.id} {...instance.props} />
            </main>
             <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                style={{ background: 'var(--win95-silver)' }}
                onMouseDown={(e) => handleInteractionStart(e, 'resize')}
                onTouchStart={(e) => handleInteractionStart(e, 'resize')}
            ></div>
        </div>
    );

    return uiMode === 'mac' ? macWindow : windowsWindow;
};

export default Window;