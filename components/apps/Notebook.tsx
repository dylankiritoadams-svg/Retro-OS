
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotebook } from '../../NotebookContext';
import type { NotebookNode, NotebookPage, NotebookSection, NotebookDrawingData } from '../../types';
import { proofreadText } from '../../services/geminiService';

const ContextMenu: React.FC<{ x: number, y: number, node: NotebookNode, onClose: () => void, onSelect: (id: string) => void }> = ({ x, y, node, onClose, onSelect }) => {
    const { createNode, deleteNode, rootId } = useNotebook();
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

    const handleCreate = (type: 'page' | 'section') => {
        const targetId = node.type === 'section' ? node.id : node.parentId;
        const newId = createNode(type, targetId);
        if (newId) onSelect(newId);
        onClose();
    };

    const isRoot = node.id === rootId;
    const isNotebook = node.type === 'section' && node.parentId === rootId;

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-white border border-black shadow-lg text-black text-sm">
            <button onClick={() => handleCreate('page')} className="block w-full text-left px-4 py-2 hover:bg-gray-200">New Mixed Page</button>
            <button onClick={() => handleCreate('section')} className="block w-full text-left px-4 py-2 hover:bg-gray-200">{isRoot ? 'New Notebook' : 'New Section'}</button>
            {!isRoot && <button onClick={() => { deleteNode(node.id); onClose(); }} className="block w-full text-left px-4 py-2 hover:bg-gray-200">Delete {isNotebook ? 'Notebook' : 'Item'}</button>}
        </div>
    );
};

const NodeTreeItem: React.FC<{ 
    node: NotebookNode, 
    level: number, 
    selectedId: string | null, 
    onSelect: (id: string) => void, 
    onContextMenu: (e: React.MouseEvent, node: NotebookNode) => void,
    searchQuery: string
}> = ({ node, level, selectedId, onSelect, onContextMenu, searchQuery }) => {
    const { getChildren, toggleSectionOpen, updateNodeName, moveNode } = useNotebook();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name);
    const [isDragOver, setIsDragOver] = useState(false);

    const isVisible = useMemo(() => {
        if (!searchQuery) return true;
        if (node.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        if (node.type === 'page' && (node as NotebookPage).content?.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        return false;
    }, [node, searchQuery]);

    const handleBlur = () => {
        if (name.trim()) updateNodeName(node.id, name.trim());
        else setName(node.name); 
        setIsEditing(false);
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/notebook-node', node.id);
        e.stopPropagation();
    };
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
        e.stopPropagation();
        setIsDragOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('application/notebook-node');
        if (draggedId) moveNode(draggedId, node.id);
    };

    if (!isVisible && !searchQuery) return null;

    if (node.type === 'section') {
        const sectionNode = node as NotebookSection;
        const children = getChildren(node.id);
        return (
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={isVisible ? '' : 'opacity-50'}>
                <div 
                    draggable onDragStart={handleDragStart}
                    onClick={() => onSelect(node.id)} 
                    onContextMenu={(e) => onContextMenu(e, node)}
                    className={`flex items-center p-1 hover:bg-gray-200 ${selectedId === node.id ? 'bg-blue-200' : ''} ${isDragOver ? 'border-2 border-blue-500' : ''}`}
                    style={{ paddingLeft: `${level * 16}px` }}
                >
                    <span onClick={(e) => { e.stopPropagation(); toggleSectionOpen(node.id); }} className="cursor-pointer px-1">{sectionNode.isOpen ? '▼' : '►'}</span>
                    {isEditing ? (
                        <input type="text" value={name} onChange={e => setName(e.target.value)} onBlur={handleBlur} onKeyPress={e => e.key === 'Enter' && handleBlur()} autoFocus className="ml-2 bg-transparent border border-black" onClick={e=>e.stopPropagation()} />
                    ) : (
                        <span onDoubleClick={() => setIsEditing(true)} className={`ml-2 font-bold cursor-pointer ${searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 'bg-yellow-200' : ''}`}>{node.name}</span>
                    )}
                </div>
                {sectionNode.isOpen && children.map(child => <NodeTreeItem key={child.id} node={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} onContextMenu={onContextMenu} searchQuery={searchQuery} />)}
            </div>
        );
    }

    if (!isVisible) return null;

    return (
        <div 
            draggable onDragStart={handleDragStart}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => onSelect(node.id)} 
            onContextMenu={(e) => onContextMenu(e, node)}
            className={`flex items-center p-1 cursor-pointer hover:bg-gray-200 ${selectedId === node.id ? 'bg-blue-200' : ''} ${isDragOver ? 'border-2 border-blue-500' : ''}`}
            style={{ paddingLeft: `${level * 16 + 16}px` }}
        >
            <span>📝</span>
            <span className={`ml-2 ${searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 'bg-yellow-200' : ''}`}>{node.name}</span>
        </div>
    );
};

interface DrawingCanvasProps {
    page: NotebookPage;
    isLocked: boolean;
    tool: 'pencil' | 'eraser';
    color: string;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ page, isLocked, tool, color }) => {
    const { updatePageDrawing } = useNotebook();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const content = page.drawingContent;

    const getCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        // Correctly map viewport coordinates to the internal canvas resolution (800x1000)
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        return { x, y };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isLocked) return;
        setIsDrawing(true);
        const coords = getCoords(e);
        if(!coords) return;
        const newPath = { points: [coords], color: tool === 'pencil' ? color : '#FFFFFF', lineWidth: tool === 'pencil' ? 2 : 20 };
        updatePageDrawing(page.id, { paths: [...content.paths, newPath] });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || isLocked) return;
        const coords = getCoords(e);
        if (coords) {
            const updatedPaths = [...content.paths];
            if (updatedPaths.length > 0) {
                updatedPaths[updatedPaths.length - 1].points.push(coords);
                updatePageDrawing(page.id, { paths: updatedPaths });
            }
        }
    };
    
    const handleMouseUp = () => setIsDrawing(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        content.paths.forEach(path => {
            ctx.beginPath();
            if (path.points.length === 0) return;
            ctx.moveTo(path.points[0].x, path.points[0].y);
            path.points.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        });
    }, [content.paths]);

    return (
        <div className={`absolute inset-0 ${isLocked ? 'pointer-events-none' : ''}`}>
            <canvas 
                ref={canvasRef} 
                width={800} 
                height={1000}
                className={`w-full h-full opacity-70 ${isLocked ? 'pointer-events-none' : 'pointer-events-auto cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            />
        </div>
    )
};


export const Notebook: React.FC = () => {
    const { nodes, rootId, getNode, getChildren, updatePageContent, updatePageDrawing, updatePageStyle, createNode, moveNode } = useNotebook();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: NotebookNode } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editMode, setEditMode] = useState<'text' | 'draw'>('text');
    
    // Drawing tool state moved here to be shared with header
    const [drawTool, setDrawTool] = useState<'pencil' | 'eraser'>('pencil');
    const [drawColor, setDrawColor] = useState('#000000');
    
    const selectedPage = selectedId && nodes[selectedId]?.type === 'page' ? nodes[selectedId] as NotebookPage : null;
    const [localText, setLocalText] = useState(selectedPage?.content || '');

    const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void => {
        let timeout: ReturnType<typeof setTimeout>;
        return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    const debouncedUpdate = useRef(debounce(updatePageContent, 500)).current;

    useEffect(() => {
        if (selectedPage) setLocalText(selectedPage.content || '');
    }, [selectedPage]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!selectedPage) return;
        setLocalText(e.target.value);
        debouncedUpdate(selectedPage.id, e.target.value);
    }
    
    const handleFixSpelling = async () => {
        if (!selectedPage || isProcessing) return;
        setIsProcessing(true);
        try {
            const corrected = await proofreadText(localText);
            setLocalText(corrected);
            updatePageContent(selectedPage.id, corrected);
        } catch (e) {
            console.error("AI Spelling fix failed", e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearDrawing = () => {
        if (selectedPage) {
            updatePageDrawing(selectedPage.id, { paths: [] });
        }
    };

    const wikiLinks = useMemo(() => {
        if (!localText) return [];
        const regex = /\[\[(.*?)\]\]/g;
        const matches = [];
        let match;
        while ((match = regex.exec(localText)) !== null) {
            matches.push(match[1]);
        }
        return Array.from(new Set(matches));
    }, [localText]);

    const linkedPages = useMemo(() => {
        const allPages = Object.values(nodes).filter(n => n.type === 'page') as NotebookPage[];
        return wikiLinks.map(link => allPages.find(p => p.name.toLowerCase() === link.toLowerCase())).filter(Boolean) as NotebookPage[];
    }, [wikiLinks, nodes]);

    useEffect(() => {
        if (!selectedId || !nodes[selectedId]) {
            const firstPage = Object.values(nodes).filter(n => n.type === 'page')[0];
            if (firstPage) setSelectedId(firstPage.id);
        }
    }, [nodes, selectedId]);

    const handleContextMenu = (e: React.MouseEvent, node: NotebookNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };
    
    const getStyleClasses = (style: string) => {
        switch(style) {
            case 'graph': return 'notebook-graph';
            case 'parchment': return 'notebook-parchment';
            case 'lines': return 'notebook-textarea-lines';
            case 'dots': return 'notebook-textarea-dots';
            default: return '';
        }
    };

    // Fix: Added safety check for rootNode and inspection logic
    const rootNode = getNode(rootId)!;
    const { activeNotebook, activeSection } = useMemo(() => {
        let current = selectedId ? nodes[selectedId] : null;
        if (!current || current.id === rootId) return { activeNotebook: null, activeSection: null };
        
        let section: NotebookNode | null = current.type === 'section' ? current : (getNode(current.parentId) || null);
        let temp = section;
        while (temp && temp.parentId !== rootId) {
            temp = getNode(temp.parentId);
        }
        return { activeNotebook: temp, activeSection: section };
    }, [selectedId, nodes, getNode, rootId]);

    const handleCreateNode = (type: 'page' | 'section', parent: string) => {
        const newId = createNode(type, parent);
        if (newId) setSelectedId(newId);
    };

    return (
        <div className="w-full h-full flex bg-white text-black font-[var(--main-font)] overflow-hidden">
            {/* Sidebar */}
            <div className="w-1/4 min-w-[200px] border-r border-black flex flex-col bg-gray-50 overflow-hidden">
                <div className="p-2 border-b border-black">
                    <input 
                        type="text" 
                        placeholder="Search notes..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full p-1 border border-black text-xs bg-white focus:outline-none"
                    />
                </div>
                <div className="flex-grow overflow-y-auto p-1 custom-scrollbar" onContextMenu={(e) => handleContextMenu(e, rootNode)}>
                    <NodeTreeItem node={rootNode} level={-1} selectedId={selectedId} onSelect={setSelectedId} onContextMenu={handleContextMenu} searchQuery={searchQuery} />
                </div>
                <div className="flex-shrink-0 border-t border-black p-1 flex justify-around bg-white">
                    <button onClick={() => handleCreateNode('section', rootId)} className="text-[10px] font-bold border border-black px-1 hover:bg-gray-100">+ Book</button>
                    <button onClick={() => activeNotebook && handleCreateNode('section', activeNotebook.id)} disabled={!activeNotebook} className="text-[10px] font-bold border border-black px-1 hover:bg-gray-100 disabled:opacity-30">+ Sec</button>
                    <button onClick={() => activeSection && handleCreateNode('page', activeSection.id)} disabled={!activeSection} className="text-[10px] font-bold border border-black px-1 hover:bg-gray-100 disabled:opacity-30">+ Page</button>
                </div>
                {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} onSelect={setSelectedId} />}
            </div>

            {/* Editor */}
            <div className="flex-grow relative flex flex-col bg-white overflow-hidden">
                {selectedPage ? (
                    <>
                        <div className="flex-shrink-0 p-1 bg-gray-100 border-b border-black flex justify-between items-center px-4">
                            <div className="flex items-center space-x-2">
                                <div className="flex border border-black p-0.5 bg-gray-200">
                                    <button 
                                        onClick={() => setEditMode('text')} 
                                        className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-all ${editMode === 'text' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
                                    >Type</button>
                                    <button 
                                        onClick={() => setEditMode('draw')} 
                                        className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-all ${editMode === 'draw' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
                                    >Draw</button>
                                </div>

                                {editMode === 'draw' && (
                                    <div className="flex items-center space-x-2 ml-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="flex border border-black p-0.5 bg-gray-200">
                                            <button onClick={() => setDrawTool('pencil')} className={`px-2 py-0.5 text-[10px] font-bold uppercase ${drawTool === 'pencil' ? 'bg-black text-white' : 'bg-white'}`}>Skch</button>
                                            <button onClick={() => setDrawTool('eraser')} className={`px-2 py-0.5 text-[10px] font-bold uppercase ${drawTool === 'eraser' ? 'bg-black text-white' : 'bg-white'}`}>Eras</button>
                                        </div>
                                        <div className="flex space-x-1">
                                            {['#000000', '#FF0000', '#0000FF', '#00FF00'].map(c => (
                                                <button key={c} onClick={() => setDrawColor(c)} style={{backgroundColor: c}} className={`w-4 h-4 border ${drawColor === c ? 'border-blue-500 ring-1 ring-blue-500' : 'border-black'}`} />
                                            ))}
                                        </div>
                                        <button onClick={handleClearDrawing} className="text-[10px] font-bold border border-black px-2 py-0.5 bg-red-50 hover:bg-red-500 hover:text-white">CLR</button>
                                    </div>
                                )}
                            </div>
                            
                            <button 
                                onClick={handleFixSpelling} 
                                disabled={isProcessing}
                                className="text-[10px] font-bold border border-black px-2 py-0.5 bg-white hover:bg-black hover:text-white disabled:opacity-50"
                            >
                                {isProcessing ? 'FIXING...' : '✨ FIX SPELLING'}
                            </button>
                        </div>
                        
                        <div className={`flex-grow relative ${getStyleClasses(selectedPage.style)}`}>
                            <textarea
                                value={localText}
                                spellCheck="true"
                                onChange={handleTextChange}
                                className={`absolute inset-0 w-full h-full bg-transparent resize-none focus:outline-none p-8 text-base leading-relaxed ${editMode === 'text' ? 'z-20' : 'z-0 pointer-events-none opacity-40'}`}
                                placeholder="Type your thoughts or use [[Links]] to connect ideas..."
                            />
                            <div className={`absolute inset-0 ${editMode === 'draw' ? 'z-20' : 'z-10 pointer-events-none'}`}>
                                <DrawingCanvas 
                                    page={selectedPage} 
                                    isLocked={editMode === 'text'} 
                                    tool={drawTool}
                                    color={drawColor}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-400 italic text-sm">Select a page to begin journaling</div>
                )}
            </div>

            {/* Inspector */}
            <div className="w-1/4 max-w-[180px] border-l border-black p-4 bg-gray-50 overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 tracking-widest border-b border-black pb-1 text-center">Inspector</h3>
                {selectedPage && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-bold uppercase mb-2 block">Paper Type</label>
                            <select
                                value={selectedPage.style}
                                onChange={e => updatePageStyle(selectedPage.id, e.target.value as any)}
                                className="w-full p-1 border border-black bg-white text-xs"
                            >
                                <option value="blank">Plain White</option>
                                <option value="dots">Dotted Grid</option>
                                <option value="lines">College Ruled</option>
                                <option value="graph">Technical Graph</option>
                                <option value="parchment">Old Parchment</option>
                            </select>
                        </div>

                        {linkedPages.length > 0 && (
                            <div>
                                <label className="text-[10px] font-bold uppercase mb-2 block text-blue-600">Knowledge Links</label>
                                <div className="space-y-1">
                                    {linkedPages.map(page => (
                                        <button 
                                            key={page.id}
                                            onClick={() => setSelectedId(page.id)}
                                            className="w-full text-left p-1.5 border border-blue-200 bg-blue-50 text-[10px] font-bold truncate hover:bg-blue-100 transition-colors"
                                        >
                                            → {page.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-black/10">
                            <label className="text-[10px] font-bold uppercase mb-2 block text-gray-400">Page Stats</label>
                            <div className="text-[9px] font-mono space-y-1">
                                <div>Chars: {(selectedPage.content || '').length}</div>
                                <div>Words: {(selectedPage.content || '').split(/\s+/).filter(w => w.length > 0).length}</div>
                                <div>Paths: {selectedPage.drawingContent.paths.length}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .notebook-graph {
                    background-image: 
                        linear-gradient(rgba(0, 150, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 150, 255, 0.1) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
                .notebook-parchment {
                    background-color: #f4ecd8;
                    background-image: url("https://www.transparenttextures.com/patterns/old-map.png");
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 4px; }
            `}</style>
        </div>
    );
};
