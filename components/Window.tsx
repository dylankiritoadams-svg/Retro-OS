
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WindowInstance, AppDefinition, MenuDefinition, MenuItem } from '../types';
import { useTheme } from '../SettingsContext';
import { globalEmitter } from '../events';

interface WindowProps {
    instance: WindowInstance;
    app: AppDefinition;
    allWindows: WindowInstance[]; // Added to allow snapping to other windows
    onClose: (id: string) => void;
    onFocus: (id: string) => void;
    onPositionChange: (id: string, position: { x: number; y: number }) => void;
    onSizeChange: (id: string, size: { width: number, height: number }) => void;
    isActive: boolean;
    onMinimize: (id: string) => void;
    onSplit: (id: string, direction: 'left' | 'right' | 'top' | 'bottom') => void;
}

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;
const SNAP_THRESHOLD = 12; // Pixels distance to trigger snap

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
                                if ('separator' in item && item.separator) return <hr key={`sep-${index}`} />;
                                const menuItem = item as MenuItem;
                                return (
                                    <button
                                        key={menuItem.label}
                                        disabled={menuItem.disabled}
                                        onClick={() => {
                                            if(!menuItem.disabled) {
                                                globalEmitter.emit(menuItem.event, { instanceId });
                                                setActiveMenuTitle(null);
                                            }
                                        }}
                                    >
                                        {menuItem.label}
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

const Window: React.FC<WindowProps> = ({ instance, app, allWindows, onClose, onFocus, onPositionChange, onSizeChange, isActive, onMinimize, onSplit }) => {
    const { theme } = useTheme();
    const { uiMode } = theme;

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [ghostPos, setGhostPos] = useState({ x: instance.position.x, y: instance.position.y });
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStartData = useRef({ width: 0, height: 0, x: 0, y: 0 });
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

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (type === 'drag') {
            setIsDragging(true);
            setGhostPos({ x: instance.position.x, y: instance.position.y });
            const rect = nodeRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: clientX - rect.left,
                y: clientY - rect.top,
            };
        } else if (type === 'resize') {
            setIsResizing(true);
            resizeStartData.current = {
                width: instance.size.width,
                height: instance.size.height,
                x: clientX,
                y: clientY,
            };
        }

        e.preventDefault();
    }, [handleFocus, instance.position, instance.size]);

    const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (isDragging) {
            let newX = clientX - dragOffset.current.x;
            let newY = clientY - dragOffset.current.y;
            
            // --- Snapping Logic ---
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const menuBarHeight = 24;
            const winWidth = instance.size.width;
            const winHeight = instance.isMinimized ? 22 : instance.size.height;

            // Snap to screen edges
            if (Math.abs(newX) < SNAP_THRESHOLD) newX = 0;
            if (Math.abs(newX + winWidth - screenWidth) < SNAP_THRESHOLD) newX = screenWidth - winWidth;
            if (Math.abs(newY - menuBarHeight) < SNAP_THRESHOLD) newY = menuBarHeight;
            if (Math.abs(newY + winHeight - screenHeight) < SNAP_THRESHOLD) newY = screenHeight - winHeight;

            // Snap to other windows
            for (const other of allWindows) {
                if (other.id === instance.id || other.isMinimized) continue;

                const otherX = other.position.x;
                const otherY = other.position.y;
                const otherWidth = other.size.width;
                const otherHeight = other.size.height;

                // Vertical alignment (snap x)
                if (Math.abs(newX - otherX) < SNAP_THRESHOLD) newX = otherX;
                if (Math.abs(newX + winWidth - (otherX + otherWidth)) < SNAP_THRESHOLD) newX = otherX + otherWidth - winWidth;
                if (Math.abs(newX - (otherX + otherWidth)) < SNAP_THRESHOLD) newX = otherX + otherWidth;
                if (Math.abs(newX + winWidth - otherX) < SNAP_THRESHOLD) newX = otherX - winWidth;

                // Horizontal alignment (snap y)
                if (Math.abs(newY - otherY) < SNAP_THRESHOLD) newY = otherY;
                if (Math.abs(newY + winHeight - (otherY + otherHeight)) < SNAP_THRESHOLD) newY = otherY + otherHeight - winHeight;
                if (Math.abs(newY - (otherY + otherHeight)) < SNAP_THRESHOLD) newY = otherY + otherHeight;
                if (Math.abs(newY + winHeight - otherY) < SNAP_THRESHOLD) newY = otherY - winHeight;
            }

            if (uiMode === 'mac') {
                // Ghost dragging for classic Mac feel
                setGhostPos({ x: newX, y: newY });
            } else {
                // Immediate dragging for Windows mode
                onPositionChange(instance.id, { x: newX, y: newY });
            }
        } else if (isResizing) {
            const dx = clientX - resizeStartData.current.x;
            const dy = clientY - resizeStartData.current.y;
            const newWidth = Math.max(MIN_WIDTH, resizeStartData.current.width + dx);
            const newHeight = Math.max(MIN_HEIGHT, resizeStartData.current.height + dy);
            onSizeChange(instance.id, { width: newWidth, height: newHeight });
        }
    }, [isDragging, isResizing, instance.id, instance.size, instance.isMinimized, allWindows, onPositionChange, onSizeChange, uiMode]);
    
    const handleInteractionEnd = useCallback(() => {
        if (isDragging && uiMode === 'mac') {
            onPositionChange(instance.id, ghostPos);
        }
        setIsDragging(false);
        setIsResizing(false);
    }, [isDragging, uiMode, ghostPos, onPositionChange, instance.id]);

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

    if (instance.isNote) {
        return (
            <div
                ref={nodeRef}
                className="absolute flex flex-col shadow-lg"
                style={{
                    left: instance.position.x,
                    top: instance.position.y,
                    width: instance.size.width,
                    height: instance.size.height,
                    zIndex: instance.zIndex,
                    backgroundColor: '#FFF9C4', 
                    border: '1px solid #FBC02D',
                    boxShadow: '3px 3px 5px rgba(0,0,0,0.2)',
                }}
                onMouseDown={handleFocus}
                onTouchStart={handleFocus}
            >
                <header
                    className="h-6 flex-shrink-0 cursor-move"
                    style={{ backgroundColor: '#FDD835' }}
                    onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                    onTouchStart={(e) => handleInteractionStart(e, 'drag')}
                >
                    <button onClick={() => onClose(instance.id)} className="float-right w-5 h-5 text-xs text-gray-600 hover:text-black">✕</button>
                </header>
                <main className="w-full flex-grow overflow-hidden">
                    <AppComponent isActive={isActive} instanceId={instance.id} {...instance.props} />
                </main>
            </div>
        )
    }

    const isMinimized = !!instance.isMinimized;

    const macWindow = (
        <>
            {/* Ghost Outline during Drag */}
            {isDragging && uiMode === 'mac' && (
                <div 
                    className="absolute border border-black z-[9998] pointer-events-none"
                    style={{
                        left: ghostPos.x,
                        top: ghostPos.y,
                        width: instance.size.width,
                        height: isMinimized ? '22px' : instance.size.height,
                        backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 1px, transparent 1px, transparent 4px)',
                        borderStyle: 'dashed'
                    }}
                />
            )}
            <div
                ref={nodeRef}
                className={`absolute classic-window ${isDragging && uiMode === 'mac' ? 'opacity-50' : ''}`}
                style={{
                    left: instance.position.x,
                    top: instance.position.y,
                    width: instance.size.width,
                    height: isMinimized ? '22px' : instance.size.height,
                    zIndex: instance.zIndex,
                }}
                onMouseDown={handleFocus}
                onTouchStart={handleFocus}
            >
                <header
                    className={`classic-title-bar cursor-move ${isActive ? 'classic-title-bar-active' : ''}`}
                    onMouseDown={(e) => handleInteractionStart(e, 'drag')}
                    onTouchStart={(e) => handleInteractionStart(e, 'drag')}
                >
                    <div className="classic-close-box" onMouseDown={(e) => { e.stopPropagation(); onClose(instance.id); }}></div>
                    {!instance.isNote && (
                        <div className="classic-minimize-box" onMouseDown={(e) => { e.stopPropagation(); onMinimize(instance.id); }}></div>
                    )}
                    <h2 className="flex-grow text-center truncate">{app.name}</h2>
                    {!instance.isNote && (
                        <div className="flex items-center space-x-1 mr-1">
                            <button onMouseDown={(e) => { e.stopPropagation(); onSplit(instance.id, 'top'); }} className="classic-split-button">⬓</button>
                            <button onMouseDown={(e) => { e.stopPropagation(); onSplit(instance.id, 'bottom'); }} className="classic-split-button">⬒</button>
                            <button onMouseDown={(e) => { e.stopPropagation(); onSplit(instance.id, 'left'); }} className="classic-split-button">◧</button>
                            <button onMouseDown={(e) => { e.stopPropagation(); onSplit(instance.id, 'right'); }} className="classic-split-button">◨</button>
                        </div>
                    )}
                </header>
                <main className={`w-full h-[calc(100%-23px)] overflow-hidden ${isMinimized ? 'hidden' : ''}`}>
                    <AppComponent isActive={isActive} instanceId={instance.id} {...instance.props} />
                </main>
                <div
                    className={`classic-resize-handle ${isMinimized ? 'hidden' : ''}`}
                    onMouseDown={(e) => handleInteractionStart(e, 'resize')}
                    onTouchStart={(e) => handleInteractionStart(e, 'resize')}
                ></div>
            </div>
        </>
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
                    {!instance.isNote && (
                        <>
                            <button className="win95-border-outset" onClick={() => onSplit(instance.id, 'top')}>⬓</button>
                            <button className="win95-border-outset" onClick={() => onSplit(instance.id, 'bottom')}>⬒</button>
                            <button className="win95-border-outset" onClick={() => onSplit(instance.id, 'left')}>◧</button>
                            <button className="win95-border-outset" onClick={() => onSplit(instance.id, 'right')}>◨</button>
                        </>
                    )}
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
