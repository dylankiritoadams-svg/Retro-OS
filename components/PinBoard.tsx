import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { usePinBoard } from '../PinBoardContext';
import { useFileSystem } from '../FileSystemContext';
import { useApp, IconProps } from '../types';
import type { AnyPinBoardNode, VFSFile } from '../types';
import { APPS, DocumentIcon } from '../constants';
import { useDocuments } from '../DocumentContext';
import { useTaskPlanner } from '../TaskPlannerContext';

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#ffcdd2', '#e1bee7', '#ffffff'];

const PinBoardNodeComponent: React.FC<{
    node: AnyPinBoardNode;
    onDragStart: (e: React.MouseEvent<SVGGElement>, nodeId: string) => void;
    onResizeStart: (e: React.MouseEvent<SVGRectElement>, nodeId: string) => void;
    onUpdate: (id: string, data: Partial<AnyPinBoardNode>) => void;
    onDelete: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string | null) => void;
}> = React.memo(({ node, onDragStart, onResizeStart, onUpdate, onDelete, isSelected, onSelect }) => {
    const { getNode } = useFileSystem();
    const { openApp } = useApp();
    const { getTask, updateTask } = useTaskPlanner();

    const handleDoubleClick = () => {
        if (node.type === 'document') {
            const file = getNode(node.vfsFileId) as VFSFile;
            if (file && file.contentId) {
                openApp(file.appId, { documentIdToOpen: file.contentId });
            }
        } else if (node.type === 'app') {
            openApp(node.appId);
        } else if (node.type === 'task') {
            // Future: could open the task in the Planner/Tasks app
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onDelete(node.id);
    };

    let content: React.ReactNode;
    let bgColor = '#ffffff';

    switch (node.type) {
        case 'note':
            bgColor = node.color;
            content = (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-1">
                    <textarea
                        value={node.content}
                        onChange={(e) => onUpdate(node.id, { content: e.target.value })}
                        className="w-full flex-grow bg-transparent border-none resize-none focus:outline-none p-0 m-0 pointer-events-auto"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                    />
                    {isSelected && (
                        <div className="flex-shrink-0 flex space-x-1 mt-1">
                            {NOTE_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => onUpdate(node.id, { color })}
                                    className="w-4 h-4 rounded-full border border-black"
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            );
            break;
        case 'document':
            const file = getNode(node.vfsFileId) as VFSFile;
            const docAppDef = file ? APPS.find(a => a.id === file.appId) : null;
            // FIX: Cast icon to a type that accepts className to satisfy React.cloneElement
            const docIcon = docAppDef?.icon ? React.cloneElement(docAppDef.icon as React.ReactElement<IconProps>, { className: "h-8 w-8" }) : <DocumentIcon className="h-8 w-8" />;
            content = file ? (
                <div className="flex flex-col items-center justify-center text-center">
                    {docIcon}
                    <p className="mt-1 font-bold text-xs">{file.name}</p>
                </div>
            ) : <p className="text-red-500 text-xs">Document not found</p>;
            break;
        case 'app':
            const appDef = APPS.find(a => a.id === node.appId);
            // FIX: Cast icon to a type that accepts className to satisfy React.cloneElement
            const appIcon = appDef?.icon ? React.cloneElement(appDef.icon as React.ReactElement<IconProps>, { className: "h-10 w-10" }) : <DocumentIcon className="h-10 w-10" />;
            content = appDef ? (
                 <div className="flex flex-col items-center justify-center text-center">
                    {appIcon}
                    <p className="mt-1 font-bold text-xs">{appDef.name}</p>
                </div>
            ) : <p className="text-red-500 text-xs">App not found</p>;
            break;
        case 'task':
            bgColor = '#f0f0f0';
            const task = getTask(node.taskId);
            content = task ? (
                 <div className="w-full h-full flex items-center p-2 pointer-events-auto" onMouseDown={e => e.stopPropagation()}>
                    <input type="checkbox" checked={task.isComplete} onChange={(e) => updateTask(task.id, {isComplete: e.target.checked})} className="mr-2" />
                    <p className={`text-sm ${task.isComplete ? 'line-through text-gray-500' : ''}`}>{task.title}</p>
                 </div>
            ) : <p className="text-red-500 text-xs">Task not found</p>;
            break;
    }
    
    return (
        <g 
            transform={`translate(${node.x}, ${node.y})`} 
            onMouseDown={e => { onDragStart(e, node.id); onSelect(node.id); }} 
            onDoubleClick={handleDoubleClick} 
            onContextMenu={handleContextMenu} 
            className="cursor-move group"
        >
            <rect
                width={node.width}
                height={node.height}
                fill={bgColor}
                stroke={isSelected ? '#0000FF' : '#000'}
                strokeWidth={isSelected ? "2" : "1"}
                className="shadow-md"
            />
            <foreignObject x="5" y="5" width={node.width - 10} height={node.height - 10}>
                 <div className="w-full h-full overflow-hidden text-black text-sm flex flex-col items-center justify-center">
                    {content}
                 </div>
            </foreignObject>
            {/* Resize handle */}
            <rect
                x={node.width - 10}
                y={node.height - 10}
                width="10"
                height="10"
                className="fill-gray-500 cursor-nwse-resize pointer-events-auto"
                onMouseDown={e => { e.stopPropagation(); onResizeStart(e, node.id); }}
            />
        </g>
    );
});

const AppPickerModal: React.FC<{ onSelect: (appId: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => (
    <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-gray-700 p-4 w-96 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-bold mb-2 text-white">Pin an Application</h3>
            <div className="bg-gray-800 p-2 overflow-y-auto">
                {APPS.filter(app => !new Set(['finder', 'settings', 'stickynote-window']).has(app.id)).map(app => (
                    <button key={app.id} onClick={() => onSelect(app.id)} className="w-full text-left p-2 hover:bg-gray-600 flex items-center text-white">
                        {/* FIX: Cast icon to a type that accepts className to satisfy React.cloneElement */}
                        {React.cloneElement(app.icon as React.ReactElement<IconProps>, { className: "h-6 w-6 mr-2 flex-shrink-0" })}
                        <span>{app.name}</span>
                    </button>
                ))}
            </div>
            <button onClick={onClose} className="mt-4 w-full p-2 bg-red-500 text-white">Cancel</button>
        </div>
    </div>
);

const DocumentPickerModal: React.FC<{ onSelect: (vfsFileId: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    const { documents } = useDocuments();
    const { nodes } = useFileSystem();

    const vfsDocuments = useMemo(() => {
        const docMap = new Map(documents.map(doc => [doc.id, doc]));
        return Object.values(nodes).filter(
            node => node.type === 'file' && (node as VFSFile).fileType === 'document' && docMap.has((node as VFSFile).contentId!)
        ) as VFSFile[];
    }, [documents, nodes]);

    return (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-gray-700 p-4 w-96 max-h-[80vh] flex flex-col">
                <h3 className="text-lg font-bold mb-2 text-white">Pin a Document</h3>
                <div className="bg-gray-800 p-2 overflow-y-auto">
                    {vfsDocuments.length > 0 ? vfsDocuments.map(docFile => (
                        <button key={docFile.id} onClick={() => onSelect(docFile.id)} className="w-full text-left p-2 hover:bg-gray-600 flex items-center text-white">
                            <span className="mr-2">📄</span>
                            <span>{docFile.name}</span>
                        </button>
                    )) : (
                        <p className="text-center text-gray-400 p-4">No documents found.</p>
                    )}
                </div>
                <button onClick={onClose} className="mt-4 w-full p-2 bg-red-500 text-white">Cancel</button>
            </div>
        </div>
    );
};


interface PinBoardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PinBoard: React.FC<PinBoardProps> = ({ isOpen, onClose }) => {
    const { pinBoardState, addNote, addDocument, addApp, addTask, updateNode, deleteNode } = usePinBoard();
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [isAppPickerOpen, setIsAppPickerOpen] = useState(false);
    const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
    
    const [draggedNode, setDraggedNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [resizedNode, setResizedNode] = useState<{ id: string; startWidth: number; startHeight: number; startX: number; startY: number; } | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);

    const [isGravityMode, setIsGravityMode] = useState(false);
    const physicsNodes = useRef<Record<string, { x: number, y: number, vx: number, vy: number, width: number, height: number }>>({});
    const savedPositions = useRef<Record<string, { x: number, y: number }>>({});
    const konamiCode = useRef<string[]>([]);
    const animationFrameId = useRef<number | null>(null);

    const toggleGravityMode = useCallback(() => {
        setIsGravityMode(prev => {
            const isActivating = !prev;
            if (isActivating) {
                const currentPositions: Record<string, { x: number, y: number }> = {};
                const currentPhysicsNodes: Record<string, any> = {};
                pinBoardState.nodes.forEach(node => {
                    currentPositions[node.id] = { x: node.x, y: node.y };
                    currentPhysicsNodes[node.id] = { x: node.x, y: node.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, width: node.width, height: node.height };
                });
                savedPositions.current = currentPositions;
                physicsNodes.current = currentPhysicsNodes;
            } else {
                pinBoardState.nodes.forEach(node => {
                    if (savedPositions.current[node.id]) {
                        updateNode(node.id, savedPositions.current[node.id]);
                    }
                });
            }
            return isActivating;
        });
    }, [pinBoardState.nodes, updateNode]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            const requiredCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
            konamiCode.current.push(e.key);
            konamiCode.current = konamiCode.current.slice(-requiredCode.length);
            if (JSON.stringify(konamiCode.current) === JSON.stringify(requiredCode)) {
                toggleGravityMode();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, toggleGravityMode]);

    const physicsLoop = useCallback(() => {
        if (!boardRef.current) return;
        const { clientWidth, clientHeight } = boardRef.current;
        const GRAVITY = 0.2;
        const BOUNCE = -0.6;

        const updatedPhysicsNodes = { ...physicsNodes.current };
        Object.keys(updatedPhysicsNodes).forEach(id => {
            const node = updatedPhysicsNodes[id];
            
            node.vy += GRAVITY; 
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0) { node.x = 0; node.vx *= BOUNCE; }
            if (node.x + node.width > clientWidth) { node.x = clientWidth - node.width; node.vx *= BOUNCE; }
            if (node.y < 0) { node.y = 0; node.vy *= BOUNCE; }
            if (node.y + node.height > clientHeight) { node.y = clientHeight - node.height; node.vy *= BOUNCE; }
            
            updateNode(id, { x: node.x, y: node.y });
        });
        
        physicsNodes.current = updatedPhysicsNodes;
        animationFrameId.current = requestAnimationFrame(physicsLoop);
    }, [updateNode]);
    
    useEffect(() => {
        if (isGravityMode) {
            animationFrameId.current = requestAnimationFrame(physicsLoop);
        } else {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        }
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current) };
    }, [isGravityMode, physicsLoop]);


    const handleNodeDragStart = useCallback((e: React.MouseEvent<SVGGElement>, nodeId: string) => {
        setSelectedNodeId(nodeId);
        const node = pinBoardState.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (isGravityMode) {
            physicsNodes.current[nodeId].vx = 0;
            physicsNodes.current[nodeId].vy = 0;
        }

        setDraggedNode({
            id: nodeId,
            offsetX: e.clientX - node.x,
            offsetY: e.clientY - node.y,
        });
    }, [pinBoardState.nodes, isGravityMode]);

    const handleResizeStart = useCallback((e: React.MouseEvent<SVGRectElement>, nodeId: string) => {
        const node = pinBoardState.nodes.find(n => n.id === nodeId);
        if (!node) return;
        setResizedNode({
            id: nodeId,
            startWidth: node.width,
            startHeight: node.height,
            startX: e.clientX,
            startY: e.clientY,
        });
    }, [pinBoardState.nodes]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (draggedNode) {
            const newX = e.clientX - draggedNode.offsetX;
            const newY = e.clientY - draggedNode.offsetY;
            updateNode(draggedNode.id, { x: newX, y: newY });
             if (isGravityMode) {
                const prevNode = physicsNodes.current[draggedNode.id];
                if(prevNode) {
                    physicsNodes.current[draggedNode.id].vx = (newX - prevNode.x) * 0.5;
                    physicsNodes.current[draggedNode.id].vy = (newY - prevNode.y) * 0.5;
                }
            }
        }
        if (resizedNode) {
            const dx = e.clientX - resizedNode.startX;
            const dy = e.clientY - resizedNode.startY;
            updateNode(resizedNode.id, {
                width: Math.max(80, resizedNode.startWidth + dx),
                height: Math.max(50, resizedNode.startHeight + dy),
            });
        }
    }, [draggedNode, resizedNode, updateNode, isGravityMode]);

    const handleMouseUp = useCallback(() => {
        setDraggedNode(null);
        setResizedNode(null);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const vfsNodeId = (e.dataTransfer as any).getData('application/vfs-node-id');
        const taskId = (e.dataTransfer as any).getData('application/retro-os-task-id');
        
        if (!boardRef.current) return;
        const rect = boardRef.current.getBoundingClientRect();
        const dropPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        
        if (vfsNodeId) {
            addDocument(vfsNodeId, dropPos);
        } else if (taskId) {
            addTask(taskId, dropPos);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="absolute inset-0 bg-black bg-opacity-50 z-40"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedNodeId(null)}
        >
            {isAppPickerOpen && <AppPickerModal onClose={() => setIsAppPickerOpen(false)} onSelect={(appId) => { addApp(appId, { x: 50, y: 50 }); setIsAppPickerOpen(false); }} />}
            {isDocPickerOpen && <DocumentPickerModal onClose={() => setIsDocPickerOpen(false)} onSelect={(vfsFileId) => { addDocument(vfsFileId, { x: 50, y: 50 }); setIsDocPickerOpen(false); }} />}
            
            <div 
                ref={boardRef}
                className="w-full h-full bg-gray-800 relative overflow-hidden"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onMouseDown={() => setSelectedNodeId(null)}
            >
                <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2" onMouseDown={e => e.stopPropagation()}>
                    <button onClick={() => addNote({ x: 50, y: 50 })} className="px-3 py-1 bg-yellow-400 text-black text-sm shadow-lg">Add Note</button>
                    <button onClick={() => setIsDocPickerOpen(true)} className="px-3 py-1 bg-green-400 text-black text-sm shadow-lg">Pin Document...</button>
                    <button onClick={() => setIsAppPickerOpen(true)} className="px-3 py-1 bg-blue-400 text-black text-sm shadow-lg">Pin App...</button>
                    <button onClick={onClose} className="px-3 py-1 bg-red-500 text-white text-sm shadow-lg">Close Board</button>
                </div>

                <svg className="w-full h-full">
                    {pinBoardState.nodes.map(node => (
                        <PinBoardNodeComponent 
                            key={node.id} 
                            node={node} 
                            onDragStart={handleNodeDragStart} 
                            onResizeStart={handleResizeStart}
                            onUpdate={updateNode} 
                            onDelete={deleteNode}
                            isSelected={node.id === selectedNodeId}
                            onSelect={setSelectedNodeId}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};