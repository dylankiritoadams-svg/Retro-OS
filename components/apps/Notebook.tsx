import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNotebook } from '../../NotebookContext';
import type { NotebookNode, NotebookPage, NotebookSection, NotebookDrawingData } from '../../types';

const ContextMenu: React.FC<{ x: number, y: number, node: NotebookNode, onClose: () => void }> = ({ x, y, node, onClose }) => {
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

    const parentId = node.type === 'section' ? node.id : node.parentId;
    const isRoot = node.id === rootId;
    const isNotebook = node.type === 'section' && node.parentId === rootId;

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-white border border-black shadow-lg text-black text-sm">
            <button onClick={() => { createNode('page', parentId, 'text'); onClose(); }} className="block w-full text-left px-4 py-2 hover:bg-gray-200" disabled={node.type === 'page'}>New Text Page</button>
            <button onClick={() => { createNode('page', parentId, 'drawing'); onClose(); }} className="block w-full text-left px-4 py-2 hover:bg-gray-200" disabled={node.type === 'page'}>New Drawing Page</button>
            <button onClick={() => { createNode('section', parentId); onClose(); }} className="block w-full text-left px-4 py-2 hover:bg-gray-200">{isRoot ? 'New Notebook' : 'New Section'}</button>
            {!isRoot && <button onClick={() => { deleteNode(node.id); onClose(); }} className="block w-full text-left px-4 py-2 hover:bg-gray-200">Delete {isNotebook ? 'Notebook' : 'Item'}</button>}
        </div>
    );
};

const NodeTreeItem: React.FC<{ node: NotebookNode, level: number, selectedId: string | null, onSelect: (id: string) => void, onContextMenu: (e: React.MouseEvent, node: NotebookNode) => void }> = ({ node, level, selectedId, onSelect, onContextMenu }) => {
    const { getChildren, toggleSectionOpen, updateNodeName, moveNode } = useNotebook();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(node.name);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleBlur = () => {
        if (name.trim()) updateNodeName(node.id, name.trim());
        else setName(node.name); // Revert if empty
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
        if (draggedId) {
            moveNode(draggedId, node.id);
        }
    };

    if (node.type === 'section') {
        const sectionNode = node as NotebookSection;
        const children = getChildren(node.id);
        return (
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
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
                        <span onDoubleClick={() => setIsEditing(true)} className="ml-2 font-bold cursor-pointer">{node.name}</span>
                    )}
                </div>
                {sectionNode.isOpen && children.map(child => <NodeTreeItem key={child.id} node={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} onContextMenu={onContextMenu} />)}
            </div>
        );
    }

    return (
        <div 
            draggable onDragStart={handleDragStart}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => onSelect(node.id)} 
            onContextMenu={(e) => onContextMenu(e, node)}
            className={`flex items-center p-1 cursor-pointer hover:bg-gray-200 ${selectedId === node.id ? 'bg-blue-200' : ''} ${isDragOver ? 'border-2 border-blue-500' : ''}`}
            style={{ paddingLeft: `${level * 16 + 16}px` }}
        >
            <span>{(node as NotebookPage).pageType === 'drawing' ? '🎨' : '📄'}</span>
            <span className="ml-2">{node.name}</span>
        </div>
    );
};

const DrawingCanvas: React.FC<{ page: NotebookPage }> = ({ page }) => {
    const { updatePageContent } = useNotebook();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#000000');
    const [isDrawing, setIsDrawing] = useState(false);
    
    const content = page.content as NotebookDrawingData;

    const getCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const coords = getCoords(e);
        if(!coords) return;
        const newPath = { points: [coords], color: tool === 'pencil' ? color : '#FFFFFF', lineWidth: tool === 'pencil' ? 2 : 20 };
        updatePageContent(page.id, { paths: [...content.paths, newPath] });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const coords = getCoords(e);
        if (coords) {
            const updatedPaths = [...content.paths];
            updatedPaths[updatedPaths.length - 1].points.push(coords);
            updatePageContent(page.id, { paths: updatedPaths });
        }
    };
    
    const handleMouseUp = () => setIsDrawing(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
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
        <div className="w-full h-full flex flex-col">
            <div className="flex-shrink-0 p-1 bg-gray-200 border-b border-gray-300 flex items-center space-x-2">
                <button onClick={() => setTool('pencil')} className={`px-2 py-1 border ${tool === 'pencil' ? 'bg-black text-white' : 'bg-white'}`}>✏️</button>
                <button onClick={() => setTool('eraser')} className={`px-2 py-1 border ${tool === 'eraser' ? 'bg-black text-white' : 'bg-white'}`}>🧽</button>
                <div className="w-px h-6 bg-gray-400"></div>
                {['#000000', '#FF0000', '#0000FF', '#00FF00'].map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{backgroundColor: c}} className={`w-6 h-6 border-2 ${color === c ? 'border-blue-500' : 'border-black'}`} />
                ))}
            </div>
            <div className="flex-grow relative bg-white">
                <canvas 
                    ref={canvasRef} 
                    width={550} 
                    height={700}
                    className="absolute top-0 left-0"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
        </div>
    )
};


export const Notebook: React.FC = () => {
    const { nodes, rootId, getNode, getChildren, updatePageContent, updatePageStyle, createNode, moveNode } = useNotebook();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: NotebookNode } | null>(null);
    const [selectedNotebookForMove, setSelectedNotebookForMove] = useState('');
    
    // Local state for text editing to avoid performance issues
    const selectedPage = selectedId && nodes[selectedId]?.type === 'page' ? nodes[selectedId] as NotebookPage : null;
    const [localText, setLocalText] = useState(selectedPage?.pageType === 'text' ? selectedPage.content as string : '');

    // Debounce utility
    const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void => {
        let timeout: ReturnType<typeof setTimeout>;
        return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    const debouncedUpdate = useRef(debounce(updatePageContent, 500)).current;

    useEffect(() => {
        if (selectedPage?.pageType === 'text') {
            setLocalText(selectedPage.content as string);
        }
    }, [selectedPage]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!selectedPage) return;
        setLocalText(e.target.value);
        debouncedUpdate(selectedPage.id, e.target.value);
    }
    
    useEffect(() => {
        const notebooks = getChildren(rootId);
        if (notebooks.length === 0) {
            createNode('section', rootId);
        }
    }, [rootId, getChildren, createNode]);

    useEffect(() => {
        if (!selectedId || !nodes[selectedId]) {
            const firstPage = Object.values(nodes).find(n => n.type === 'page');
            if (firstPage) {
                setSelectedId(firstPage.id);
            }
        }
    }, [nodes, selectedId]);

    useEffect(() => {
        const selectedNode = selectedId ? nodes[selectedId] : null;
        if (selectedNode?.type === 'page') {
             let parent = getNode(selectedNode.parentId);
             while(parent && parent.parentId !== rootId) {
                parent = getNode(parent.parentId);
             }
             if (parent) setSelectedNotebookForMove(parent.id);
        } else if (selectedNode?.type === 'section' && selectedNode.parentId !== rootId) {
             let parent = getNode(selectedNode.parentId);
             while(parent && parent.parentId !== rootId) {
                parent = getNode(parent.parentId);
             }
             if (parent) setSelectedNotebookForMove(parent.id);
        } else if (selectedNode?.type === 'section' && selectedNode.parentId === rootId) {
            setSelectedNotebookForMove(selectedNode.id);
        }

    }, [selectedId, nodes, getNode, rootId]);
    
    const selectedNode = selectedId ? nodes[selectedId] : null;
    const { activeNotebook, activeSection } = useMemo(() => {
        let current = selectedNode;
        if (!current) return { activeNotebook: null, activeSection: null };
        let notebook: NotebookNode | null = null;
        let section: NotebookNode | null = null;
        if (current.type === 'page') section = getNode(current.parentId) || null;
        else if (current.type === 'section') section = current;
        let tempNotebook = section;
        while(tempNotebook && tempNotebook.parentId !== rootId) tempNotebook = getNode(tempNotebook.parentId);
        notebook = tempNotebook;
        return { activeNotebook: notebook, activeSection: section };
    }, [selectedNode, getNode, rootId]);
    
    const handleContextMenu = (e: React.MouseEvent, node: NotebookNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };
    
    const rootNode = getNode(rootId)!;
    const textareaStyleClass = selectedPage?.style === 'lines' ? 'notebook-textarea-lines' : selectedPage?.style === 'dots' ? 'notebook-textarea-dots' : '';
    const notebooks = getChildren(rootId).filter(n => n.type === 'section') as NotebookSection[];
    const sectionsInSelectedNotebook = selectedNotebookForMove ? getChildren(selectedNotebookForMove).filter(n => n.type === 'section') as NotebookSection[] : [];
    
    const canCreateSection = !!activeNotebook;
    const canCreatePage = !!activeSection;

    return (
        <div className="w-full h-full flex bg-white text-black">
            {/* Sidebar */}
            <div className="w-1/4 min-w-[200px] border-r border-gray-300 flex flex-col" onContextMenu={(e) => handleContextMenu(e, rootNode)}>
                <div className="flex-grow overflow-y-auto p-1">
                    <NodeTreeItem node={rootNode} level={-1} selectedId={selectedId} onSelect={setSelectedId} onContextMenu={handleContextMenu} />
                </div>
                <div className="flex-shrink-0 border-t border-gray-300 p-1 flex justify-around">
                    <button onClick={() => createNode('section', rootId)} className="p-1 text-xs hover:bg-gray-200" title="New Notebook">+ Notebook</button>
                    <button onClick={() => canCreateSection && activeNotebook && createNode('section', activeNotebook.id)} disabled={!canCreateSection} className="p-1 text-xs hover:bg-gray-200 disabled:opacity-50" title="New Section">+ Section</button>
                    <button onClick={() => canCreatePage && activeSection && createNode('page', activeSection.id, 'text')} disabled={!canCreatePage} className="p-1 text-xs hover:bg-gray-200 disabled:opacity-50" title="New Text Page">+ Text Page</button>
                    <button onClick={() => canCreatePage && activeSection && createNode('page', activeSection.id, 'drawing')} disabled={!canCreatePage} className="p-1 text-xs hover:bg-gray-200 disabled:opacity-50" title="New Drawing Page">+ Drawing</button>
                </div>
                {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
            </div>

            {/* Editor */}
            <div className={`flex-grow w-1/2 overflow-y-auto`}>
                {selectedPage?.pageType === 'text' && (
                     <textarea
                        key={selectedPage.id} // Re-mount when page changes
                        value={localText}
                        onChange={handleTextChange}
                        className={`w-full h-full bg-transparent resize-none focus:outline-none text-base p-4 ${textareaStyleClass} font-[var(--main-font)]`}
                        placeholder="Give your page a title..."
                    />
                )}
                 {selectedPage?.pageType === 'drawing' && <DrawingCanvas page={selectedPage} />}
                 {!selectedPage && (
                    <div className="text-center text-gray-500 mt-10">Select or create a page to begin.</div>
                )}
            </div>

            {/* Inspector */}
            <div className="w-1/4 max-w-[150px] border-l border-gray-300 p-2 bg-gray-50">
                <h3 className="font-bold text-center mb-4">Inspector</h3>
                {selectedPage && (
                    <>
                        {selectedPage.pageType === 'text' && (
                            <div className="mb-4">
                                <h4 className="text-sm font-bold mb-2">Page Style</h4>
                                <select
                                    value={selectedPage.style}
                                    onChange={e => updatePageStyle(selectedPage.id, e.target.value as any)}
                                    className="w-full p-1 border border-black bg-white text-xs"
                                >
                                    <option value="blank">Blank</option>
                                    <option value="dots">Dots</option>
                                    <option value="lines">Lines</option>
                                </select>
                            </div>
                        )}
                        <div className="mb-4">
                            <h4 className="text-sm font-bold mb-2">Location</h4>
                            <label className="text-xs">Notebook</label>
                            <select value={selectedNotebookForMove} onChange={e => setSelectedNotebookForMove(e.target.value)} className="w-full p-1 border border-black bg-white text-xs mb-2">
                               {notebooks.map(nb => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
                            </select>
                             <label className="text-xs">Section</label>
                             <select 
                                value={selectedPage.parentId}
                                onChange={e => {
                                    const dropTargetId = e.target.value;
                                    const dropTargetNode = getNode(dropTargetId);
                                    if(dropTargetNode && dropTargetNode.type === 'section') {
                                        moveNode(selectedPage.id, dropTargetId);
                                    }
                                }}
                                className="w-full p-1 border border-black bg-white text-xs"
                             >
                               {sectionsInSelectedNotebook.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                            </select>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};