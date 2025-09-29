import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PixelPainterTool, AppDocument } from '../../types';
import { globalEmitter } from '../../events';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  documentIdToOpen?: string;
}

const COLORS = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#C0C0C0', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080'];
const BG_COLOR = '#FFFFFF';
const ERASER_SIZE = 10;
const PENCIL_SIZE = 2;
const APP_ID = 'pixel-painter';

export const PixelPainter: React.FC<AppProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<PixelPainterTool>('pencil');
    const [color, setColor] = useState<string>(COLORS[0]);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const lastPoint = useRef<{ x: number, y: number } | null>(null);
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
    const [undoState, setUndoState] = useState<ImageData | null>(null);
    
    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    
    const appDocuments = getDocumentsByApp(APP_ID);
    
    const getContext = useCallback(() => canvasRef.current?.getContext('2d', { willReadFrequently: true }), []);

    const clearCanvas = useCallback(() => {
        const ctx = getContext();
        if (ctx && canvasRef.current) {
            ctx.fillStyle = BG_COLOR;
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [getContext]);
    
    const loadContent = useCallback((dataUrl: string) => {
        const ctx = getContext();
        if (!ctx || !canvasRef.current) return;
        const img = new Image();
        img.onload = () => {
            clearCanvas();
            ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
            setIsDirty(false);
        };
        img.src = dataUrl;
    }, [getContext, clearCanvas]);

    useEffect(() => {
        if (documentIdToOpen) {
            const doc = getDocument(documentIdToOpen);
            if (doc && doc.appId === APP_ID) {
                setActiveDocument(doc);
                loadContent(doc.content);
            }
        }
    }, [documentIdToOpen, getDocument, loadContent]);

    const saveUndoState = useCallback(() => {
        const ctx = getContext();
        if (ctx && canvasRef.current) {
            setUndoState(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        }
    }, [getContext]);
    
    const handleUndo = useCallback(() => {
        const ctx = getContext();
        if (ctx && undoState) {
            ctx.putImageData(undoState, 0, 0);
        }
    }, [getContext, undoState]);

    const floodFill = useCallback((startX: number, startY: number) => {
        const ctx = getContext();
        if (!ctx || !canvasRef.current) return;
        
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const data = imageData.data;
        const targetColor = getPixelColor(startX, startY);
        const fillColor = hexToRgba(color);
        
        if (isSameColor(targetColor, fillColor)) return;

        const stack = [[startX, startY]];

        while (stack.length) {
            const [x, y] = stack.pop()!;
            if (x < 0 || x >= canvasRef.current.width || y < 0 || y >= canvasRef.current.height) continue;
            
            const currentColor = getPixelColor(x, y);
            if (isSameColor(currentColor, targetColor)) {
                setPixelColor(x, y, fillColor);
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }
        }
        ctx.putImageData(imageData, 0, 0);
        setIsDirty(true);

        function getPixelColor(x: number, y: number) {
            const i = (y * canvasRef.current!.width + x) * 4;
            return [data[i], data[i+1], data[i+2], data[i+3]];
        }
        function setPixelColor(x: number, y: number, c: number[]) {
             const i = (y * canvasRef.current!.width + x) * 4;
             data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2]; data[i+3] = c[3];
        }
        function isSameColor(c1: number[], c2: number[]) {
            return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
        }
        function hexToRgba(hex: string) {
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b, 255];
        }
    }, [getContext, color]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        saveUndoState();
        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        lastPoint.current = { x, y };
        setStartPoint({x, y});
        setIsDirty(true);

        if(tool === 'fill') {
            floodFill(x, y);
            setIsDrawing(false);
            lastPoint.current = null;
        } else if (tool === 'pencil' || tool === 'eraser') {
            const ctx = getContext();
            if (!ctx) return;
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (tool === 'pencil') {
                ctx.fillStyle = color;
                ctx.arc(x, y, PENCIL_SIZE / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = BG_COLOR;
                ctx.arc(x, y, ERASER_SIZE / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const ctx = getContext();
        if (!ctx) return;
        
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if ((tool === 'pencil' || tool === 'eraser') && lastPoint.current) {
            ctx.beginPath();
            ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
            ctx.lineTo(x, y);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            if (tool === 'pencil') {
                ctx.strokeStyle = color;
                ctx.lineWidth = PENCIL_SIZE;
            } else { 
                ctx.strokeStyle = BG_COLOR;
                ctx.lineWidth = ERASER_SIZE;
            }
            ctx.stroke();
            lastPoint.current = { x, y };

        } else if (startPoint && (tool === 'rectangle' || tool === 'oval' || tool === 'line')) {
            if(!undoState) return;
            ctx.putImageData(undoState, 0, 0);
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (tool === 'rectangle') {
                 ctx.rect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
            } else if (tool === 'oval') {
                 ctx.ellipse(startPoint.x + (x - startPoint.x)/2, startPoint.y + (y-startPoint.y)/2, Math.abs((x - startPoint.x)/2), Math.abs((y-startPoint.y)/2), 0, 0, Math.PI * 2);
            } else if (tool === 'line') {
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    };
    
    const handleMouseUp = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        handleMouseMove(e); 
        setIsDrawing(false);
        setStartPoint(null);
        lastPoint.current = null;
    };

    const handleNew = useCallback(() => {
        clearCanvas();
        setActiveDocument(null);
        setIsDirty(false);
    }, [clearCanvas]);

    const handleSave = useCallback(() => {
        if (!canvasRef.current) return;
        const content = canvasRef.current.toDataURL();
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, content);
            setIsDirty(false);
        } else {
            setSaveAsName('Untitled Drawing');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, updateDocument]);
    
    const handleSaveAs = useCallback(() => {
        setSaveAsName(activeDocument?.name || 'Untitled Drawing');
        setIsSaveAsModalOpen(true);
    }, [activeDocument]);

    const confirmSaveAs = useCallback(() => {
        if (!saveAsName.trim() || !canvasRef.current) return;
        const content = canvasRef.current.toDataURL();
        const newDoc = createDocument(saveAsName, content, APP_ID);
        
        const documentsFolder = findNodeByPath('/Documents');
        if (documentsFolder) {
            createFile(saveAsName, documentsFolder.id, 'document', APP_ID, newDoc.id);
        }

        setActiveDocument(newDoc);
        setIsDirty(false);
        setIsSaveAsModalOpen(false);
    }, [saveAsName, createDocument, findNodeByPath, createFile]);
    
    const handleOpen = useCallback(() => setIsOpenFileModalOpen(true), []);
    
    const confirmOpen = (docId: string) => {
        const docToOpen = getDocument(docId);
        if (docToOpen) {
            setActiveDocument(docToOpen);
            loadContent(docToOpen.content);
        }
        setIsOpenFileModalOpen(false);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const parent = canvas.parentElement!;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            if (!documentIdToOpen) clearCanvas();

            const resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(() => {
                    const parent = canvas.parentElement;
                    if (parent && canvas) {
                        const currentData = getContext()?.getImageData(0, 0, canvas.width, canvas.height);
                        const newWidth = parent.clientWidth;
                        const newHeight = parent.clientHeight;
                        if (canvas.width !== newWidth || canvas.height !== newHeight) {
                            canvas.width = newWidth;
                            canvas.height = newHeight;
                            clearCanvas();
                            if (currentData) getContext()?.putImageData(currentData, 0, 0);
                        }
                    }
                });
            });
            if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);
            return () => resizeObserver.disconnect();
        }
    }, [clearCanvas, getContext, documentIdToOpen]);
    
    useEffect(() => {
        if (!isActive) return;

        const eventHandlers: { [key: string]: () => void } = {
            'painter:file:new': handleNew,
            'painter:file:open': handleOpen,
            'painter:file:save': handleSave,
            'painter:file:saveas': handleSaveAs,
            'painter:edit:undo': handleUndo,
            ...Object.fromEntries((['pencil', 'eraser', 'fill', 'rectangle', 'oval', 'line'] as PixelPainterTool[]).map(t => [`painter:tools:${t}`, () => setTool(t)])),
        };

        const subscriptions: { event: string; handler: (data?: any) => void }[] = [];
        Object.entries(eventHandlers).forEach(([event, handler]) => {
            const wrappedHandler = (data: { instanceId: string }) => {
                if (data && data.instanceId === instanceId) handler();
            };
            subscriptions.push({ event, handler: wrappedHandler });
            globalEmitter.subscribe(event, wrappedHandler);
        });

        return () => {
            subscriptions.forEach(({ event, handler }) => {
                globalEmitter.unsubscribe(event, handler);
            });
        };
    }, [isActive, instanceId, handleNew, handleOpen, handleSave, handleSaveAs, handleUndo]);

    const ToolButton = ({ toolName, children }: { toolName: PixelPainterTool, children: React.ReactNode }) => (
        <button 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setTool(toolName); }} 
            className={`p-2 border-2 border-black ${tool === toolName ? 'bg-black text-white' : 'bg-white'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="w-full h-full flex flex-row bg-gray-200">
            <div className="flex flex-col items-center p-1 border-r-2 border-black bg-gray-100 space-y-1">
                <ToolButton toolName="pencil">✏️</ToolButton>
                <ToolButton toolName="eraser">🧽</ToolButton>
                <ToolButton toolName="line">╱</ToolButton>
                <ToolButton toolName="fill">💧</ToolButton>
                <ToolButton toolName="rectangle">⬜</ToolButton>
                <ToolButton toolName="oval">⚪</ToolButton>
            </div>
            <div className="flex-grow flex flex-col">
                <div className="flex-grow bg-white border-2 border-black m-1" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                    <canvas ref={canvasRef} className="cursor-crosshair" />
                </div>
                <div className="flex-shrink-0 p-1 border-t-2 border-black bg-gray-100 flex items-center justify-center gap-1">
                    {COLORS.map(c => (
                        <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 border-2 ${color === c ? 'border-blue-500' : 'border-black'}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
            </div>
             {isSaveAsModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow">
                        <h3 className="font-bold mb-2">Save Drawing As:</h3>
                        <input
                            type="text"
                            value={saveAsName}
                            onChange={e => setSaveAsName((e.target as HTMLInputElement).value)}
                            onKeyPress={e => e.key === 'Enter' && confirmSaveAs()}
                            className="w-full p-1 border-2 border-black bg-white focus:outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end mt-4 space-x-2">
                            <button onClick={() => setIsSaveAsModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                            <button onClick={confirmSaveAs} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 font-bold">Save</button>
                        </div>
                    </div>
                 </div>
            )}
            {isOpenFileModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow w-96">
                        <h3 className="font-bold mb-2">Open Drawing:</h3>
                        <ul className="h-48 overflow-y-auto border-2 border-black bg-white p-1">
                           {appDocuments.length > 0 ? appDocuments.map(doc => (
                               <li key={doc.id}>
                                   <button onClick={() => confirmOpen(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">
                                       {doc.name}
                                   </button>
                               </li>
                           )) : <li className="p-2 text-center text-gray-500">No drawings found.</li>}
                        </ul>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setIsOpenFileModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};