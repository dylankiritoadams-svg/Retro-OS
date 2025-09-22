import React, { useState, useRef, useCallback, useMemo } from 'react';
import { usePinBoard } from '../PinBoardContext';
import { useFileSystem } from '../FileSystemContext';
import { useApp } from '../App';
import { AnyPinBoardNode, VFSFile } from '../types';
import { APPS, DocumentIcon, FolderIcon } from '../constants';

const NOTE_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#ffcdd2', '#e1bee7', '#ffffff'];

const PinBoardNodeComponent: React.FC<{
    node: AnyPinBoardNode;
    onDragStart: (e: React.MouseEvent, nodeId: string) => void;
    onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
    onUpdate: (id: string, data: Partial<AnyPinBoardNode>) => void;
    onDelete: (id: string) => void;
}> = React.memo(({ node, onDragStart, onResizeStart, onUpdate, onDelete }) => {
    const { getNode } = useFileSystem();
    const { openApp } = useApp();

    const handleDoubleClick = () => {
        if (node.type === 'document') {
            const file = getNode(node.vfsFileId) as VFSFile;
            if (file && file.contentId) {
                openApp(file.appId, { documentIdToOpen: file.contentId });
            }
        }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onDelete(node.id);
    };

    const file = node.type === 'document' ? getNode(node.vfsFileId) as VFSFile : null;
    const appDef = file ? APPS.find(a => a.id === file.appId) : null;
    const icon = appDef?.icon ? React.cloneElement(appDef.icon, { className: "h-8 w-8" }) : <DocumentIcon className="h-8 w-8" />;
    
    return (
        <g transform={`translate(${node.x}, ${node.y})`} onMouseDown={e => onDragStart(e, node.id)} onDoubleClick={handleDoubleClick} onContextMenu={handleContextMenu} className="cursor-move group">
            <rect
                width={node.width}
                height={node.height}
                fill={node.type === 'note' ? node.color : '#ffffff'}
                stroke="#000"
                strokeWidth="1"
                className="shadow-md"
            />
            <foreignObject x="5" y="5" width={node.width - 10} height={node.height - 10}>
                 <div className="w-full h-full overflow-hidden text-black text-sm p-1 flex flex-col items-center justify-center text-center">
                    {node.type === 'note' ? (
                        <textarea
                            value={node.content}
                            onChange={(e) => onUpdate(node.id, { content: e.target.value })}
                            className="w-full h-full bg-transparent border-none resize-none focus:outline-none p-0 m-0 pointer-events-auto"
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                        />
                    ) : file ? (
                        <>
                            <div className="w-8 h-8 mb-1">{icon}</div>
                            <span className="font-bold text-xs break-words">{file.name}</span>
                        </>
                    ) : (
                        <span className="text-xs text-red-500">Linked file not found.</span>
                    )}
                </div>
            </foreignObject>
            <rect x={node.width - 10} y={node.height - 10} width={10} height={10} onMouseDown={(e) => onResizeStart(e, node.id)} className="cursor-nwse-resize fill-gray-500 opacity-0 group-hover:opacity-100" />
        </g>
    );
});


export const PinBoard: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { pinBoardState, addNote, addDocument, updateNode, deleteNode } = usePinBoard();
    const { nodes: allVFSNodes } = useFileSystem();

    const svgRef = useRef<SVGSVGElement>(null);
    const [viewport, setViewport] = useState(pinBoardState.viewport);
    const [interactionState, setInteractionState] = useState({ isPanning: false, draggedNodeId: null as string | null, resizedNode: null as {id: string, startW: number, startH: number, startX: number, startY: number} | null });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const [isPinDocModalOpen, setIsPinDocModalOpen] = useState(false);

    const documentsToPin = useMemo(() => {
        // FIX: Add type assertion to VFSNode to access fileType, since n.type === 'file' doesn't narrow the type automatically.
        return Object.values(allVFSNodes).filter(n => n.type === 'file' && (n as VFSFile).fileType === 'document') as VFSFile[];
    }, [allVFSNodes]);


    const getSVGPoint = (e: React.MouseEvent | React.DragEvent): { x: number; y: number } => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        return { x: svgPoint.x, y: svgPoint.y };
    };
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setViewport(v => ({ ...v, zoom: Math.max(0.2, Math.min(2, v.zoom * zoomFactor)) }));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === svgRef.current) {
            setInteractionState(s => ({ ...s, isPanning: true }));
            dragStartPos.current = { x: e.clientX, y: e.clientY };
        }
    };
    
    const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setInteractionState(s => ({ ...s, draggedNodeId: nodeId }));
        const { x, y } = getSVGPoint(e);
        const node = pinBoardState.nodes.find(n => n.id === nodeId)!;
        dragStartPos.current = { x: x - node.x, y: y - node.y };
    };

    const handleResizeStart = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        const node = pinBoardState.nodes.find(n => n.id === nodeId)!;
        setInteractionState(s => ({ ...s, resizedNode: { id: nodeId, startW: node.width, startH: node.height, startX: e.clientX, startY: e.clientY } }));
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (interactionState.isPanning) {
            const dx = e.clientX - dragStartPos.current.x;
            const dy = e.clientY - dragStartPos.current.y;
            dragStartPos.current = { x: e.clientX, y: e.clientY };
            setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
        } else if (interactionState.draggedNodeId) {
            const { x, y } = getSVGPoint(e);
            updateNode(interactionState.draggedNodeId, { x: x - dragStartPos.current.x, y: y - dragStartPos.current.y });
        } else if (interactionState.resizedNode) {
            const dx = e.clientX - interactionState.resizedNode.startX;
            const dy = e.clientY - interactionState.resizedNode.startY;
            updateNode(interactionState.resizedNode.id, { width: Math.max(80, interactionState.resizedNode.startW + dx / viewport.zoom), height: Math.max(60, interactionState.resizedNode.startH + dy / viewport.zoom) });
        }
    };

    const handleMouseUp = () => {
        setInteractionState({ isPanning: false, draggedNodeId: null, resizedNode: null });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const vfsFileId = e.dataTransfer.getData('application/vfs-node-id');
        if (vfsFileId) {
            const { x, y } = getSVGPoint(e);
            addDocument(vfsFileId, { x: x - 75, y: y - 40 });
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (e.target === svgRef.current) {
            const { x, y } = getSVGPoint(e);
            addNote({ x, y });
        }
    };

    const handlePinDocument = (vfsFileId: string) => {
        const svg = svgRef.current;
        if (!svg) return;

        const centerX = (-viewport.x + svg.clientWidth / 2) / viewport.zoom - 75; // -75 to center the node
        const centerY = (-viewport.y + svg.clientHeight / 2) / viewport.zoom - 40; // -40 to center the node
        addDocument(vfsFileId, { x: centerX, y: centerY });
        setIsPinDocModalOpen(false);
    };
    
    return (
        <div 
            className={`absolute top-0 left-0 w-full h-full bg-gray-800 bg-opacity-80 backdrop-blur-sm z-[100] transition-transform duration-300 ease-in-out`}
            style={{ transform: isOpen ? 'translateY(0)' : 'translateY(-100%)' }}
        >
            {isPinDocModalOpen && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[101]">
                    <div className="bg-white p-4 border-2 border-black w-[400px]">
                        <h3 className="font-bold mb-2">Pin a Document</h3>
                        <ul className="h-64 overflow-y-auto border-2 border-black bg-white p-1">
                            {documentsToPin.length > 0 ? documentsToPin.map(doc => (
                                <li key={doc.id}>
                                    <button onClick={() => handlePinDocument(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">
                                        {doc.name} <span className="text-xs text-gray-500">({doc.appId})</span>
                                    </button>
                                </li>
                            )) : <li className="p-2 text-center text-gray-500">No documents found.</li>}
                        </ul>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setIsPinDocModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
             <svg 
                ref={svgRef} 
                className="w-full h-full"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onContextMenu={handleContextMenu}
             >
                <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}>
                    {pinBoardState.nodes.map(node => (
                        <PinBoardNodeComponent
                            key={node.id}
                            node={node}
                            onDragStart={handleNodeDragStart}
                            onResizeStart={handleResizeStart}
                            onUpdate={updateNode}
                            onDelete={deleteNode}
                        />
                    ))}
                </g>
            </svg>
             <div className="absolute bottom-4 right-4 flex space-x-2">
                <button onClick={() => setIsPinDocModalOpen(true)} className="px-4 py-2 bg-white text-black border-2 border-black font-bold active:bg-gray-200">Pin Document...</button>
                <button onClick={onClose} className="px-4 py-2 bg-white text-black border-2 border-black font-bold active:bg-gray-200">Close</button>
             </div>
        </div>
    );
};