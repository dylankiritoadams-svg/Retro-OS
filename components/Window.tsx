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

    const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!nodeRef.current) return;
        handleFocus();
        setIsDragging(true);
        const rect = nodeRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        e.preventDefault();
    };

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
    }, []);

    const handleDragMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !nodeRef.current) return;
        e.preventDefault();
        onPositionChange(instance.id, {
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
        });
    }, [isDragging, instance.id, onPositionChange]);
    
    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        handleFocus();
        setIsResizing(true);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !nodeRef.current) return;
        e.preventDefault();
        const rect = nodeRef.current.getBoundingClientRect();
        const newWidth = Math.max(MIN_WIDTH, e.clientX - rect.left + (uiMode === 'windows' ? 3 : 6));
        const newHeight = Math.max(MIN_HEIGHT, e.clientY - rect.top + (uiMode === 'windows' ? 3 : 6));
        onSizeChange(instance.id, { width: newWidth, height: newHeight });
    }, [isResizing, instance.id, onSizeChange, uiMode]);

    useEffect(() => {
        if (!isDragging && !isResizing) return;
        const handleMove = isDragging ? handleDragMouseMove : handleResizeMouseMove;
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, handleDragMouseMove, handleResizeMouseMove, handleMouseUp]);
    
    const AppContent = app.component;

    if (uiMode === 'windows') {
        return (
             <div
                ref={nodeRef}
                className="absolute win95-window win95-border-outset flex flex-col"
                style={{
                    left: `${instance.position.x}px`,
                    top: `${instance.position.y}px`,
                    width: `${instance.size.width}px`,
                    height: `${instance.size.height}px`,
                    zIndex: instance.zIndex,
                }}
                onMouseDown={handleFocus}
            >
                <div
                    className={`win95-title-bar ${isActive ? '' : 'inactive'}`}
                    onMouseDown={handleDragMouseDown}
                >
                    <div className="win95-title-bar-text">
                        {React.cloneElement(app.icon, {className: "h-4 w-4 inline-block mr-2"})}
                        {app.name}
                    </div>
                    <div className="win95-title-bar-controls">
                        <button className="win95-border-outset" aria-label="Minimize">_</button>
                        <button className="win95-border-outset" aria-label="Maximize">[]</button>
                        <button onClick={() => onClose(instance.id)} className="win95-border-outset" aria-label={`Close ${app.name}`}>X</button>
                    </div>
                </div>
                {app.menus && app.menus.length > 0 && <Win95Menu menus={app.menus} instanceId={instance.id} />}
                <div className="win95-content win95-border-inset flex-grow relative overflow-auto min-h-0 min-w-0">
                    <AppContent isActive={isActive} instanceId={instance.id} {...instance.props} />
                </div>
                 <div
                    className="absolute bottom-0 right-0 w-4 h-4"
                    style={{ cursor: 'se-resize' }}
                    onMouseDown={handleResizeMouseDown}
                    aria-label="Resize window"
                 ></div>
            </div>
        );
    }
    
    // Mac Mode
    return (
        <div
            ref={nodeRef}
            className="absolute bg-[var(--window-bg)] border-2 border-black p-0.5 flex flex-col window-shadow"
            style={{
                left: `${instance.position.x}px`,
                top: `${instance.position.y}px`,
                width: `${instance.size.width}px`,
                height: `${instance.size.height}px`,
                zIndex: instance.zIndex,
            }}
            onMouseDown={handleFocus}
        >
            <div
                className={`p-1 flex justify-between items-center select-none cursor-move ${isActive ? 'active-title-bar' : ''}`}
                onMouseDown={handleDragMouseDown}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose(instance.id);
                    }}
                    className="bg-[var(--window-bg)] border-2 border-black w-5 h-5 font-bold flex items-center justify-center active:bg-gray-300"
                    aria-label={`Close ${app.name}`}
                >
                </button>
                <span className="font-bold pointer-events-none">{app.name}</span>
                 <div className="w-5 h-5"></div>
            </div>
            <div className="flex-grow bg-[var(--window-bg)] border-t-2 border-black p-2 overflow-auto min-h-0 min-w-0 relative">
                 <AppContent isActive={isActive} instanceId={instance.id} {...instance.props} />
            </div>
            <div
                className="absolute bottom-0 right-0 w-4 h-4"
                style={{ cursor: 'se-resize' }}
                onMouseDown={handleResizeMouseDown}
                aria-label="Resize window"
            >
                <div className="w-full h-full bg-gray-200 border-l-2 border-t-2 border-black"></div>
            </div>
        </div>
    );
};

export default Window;
