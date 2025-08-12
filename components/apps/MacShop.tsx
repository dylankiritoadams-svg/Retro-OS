import React, { useState, useRef, useEffect, useCallback, createRef } from 'react';
import { globalEmitter } from '../../events';
import { generateMacShopImage } from '../../services/geminiService';
import type { MacShopLayer, MacShopTool, SelectionRect, AppDocument } from '../../types';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  documentIdToOpen?: string;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const BG_COLOR = '#FFFFFF';
const COLORS = ['#000000', '#FFFFFF', '#808080', '#C0C0C0', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080'];
let layerCounter = 1;
const APP_ID = 'macshop';

const TOOL_NAMES: Record<MacShopTool, string> = {
    select: 'Selection',
    pencil: 'Pencil',
    eraser: 'Eraser',
    fill: 'Paint Bucket',
    'gen-fill': 'Generative Fill',
    eyedropper: 'Eyedropper',
    move: 'Move Tool',
    text: 'Text Tool',
    brush: 'Brush',
};

const LoadingScreen = () => (
    <div className="absolute inset-0 bg-gray-400 z-50 flex flex-col items-center justify-center font-mono select-none">
        <div className="w-80 p-2 bg-gray-500 border-2 border-t-gray-300 border-l-gray-300 border-r-black border-b-black">
            <h1 className="text-2xl font-bold text-white text-center" style={{fontFamily: "'Pixelify Sans', sans-serif"}}>MacShop 1.0</h1>
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 my-4 border border-black"></div>
            <p className="text-white text-xs">© 1990 Gemini Systems Inc.</p>
            <p className="text-white text-xs">Licensed to: The User</p>
            <p className="text-white text-xs mt-2">Loading creative modules...</p>
        </div>
    </div>
);

const GenFillModal = ({ onGenerate, onCancel, prompt, setPrompt, isLoading }: { onGenerate: () => void, onCancel: () => void, prompt: string, setPrompt: (p: string) => void, isLoading: boolean }) => (
     <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-gray-400 p-1 border-2 border-t-gray-300 border-l-gray-300 border-r-black border-b-black w-96">
            <div className="bg-gray-500 p-1 text-white font-bold">Generative Fill</div>
            <div className="p-4 bg-gray-300">
                <p className="mb-2 font-mono">Enter a prompt for the selected area:</p>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="w-full h-24 p-1 border-2 border-black bg-white focus:outline-none font-mono text-sm resize-none"
                    autoFocus
                    disabled={isLoading}
                />
                <div className="flex justify-end mt-4 space-x-2">
                    <button onClick={onCancel} disabled={isLoading} className="px-3 py-1 bg-gray-300 border-2 border-black active:bg-gray-200 font-mono">Cancel</button>
                    <button onClick={onGenerate} disabled={isLoading || !prompt.trim()} className="px-3 py-1 bg-gray-300 border-2 border-black active:bg-gray-200 font-bold font-mono">
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
     </div>
);

const TextToolModal = ({ onConfirm, onCancel, text, setText, size, setSize }: { 
    onConfirm: () => void, onCancel: () => void, 
    text: string, setText: (s:string) => void,
    size: number, setSize: (n:number) => void
}) => (
     <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-gray-400 p-1 border-2 border-t-gray-300 border-l-gray-300 border-r-black border-b-black w-96">
            <div className="bg-gray-500 p-1 text-white font-bold">Text Tool</div>
            <div className="p-4 bg-gray-300">
                <p className="mb-2 font-mono">Enter text:</p>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="w-full h-24 p-1 border-2 border-black bg-white focus:outline-none font-mono text-sm resize-none"
                    autoFocus
                />
                <div className="flex items-center mt-2">
                    <label className="mr-2 font-mono text-sm">Size:</label>
                    <input type="number" value={size} onChange={e => setSize(parseInt(e.target.value) || 16)} className="w-20 p-1 border-2 border-black bg-white font-mono text-sm"/>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                    <button onClick={onCancel} className="px-3 py-1 bg-gray-300 border-2 border-black active:bg-gray-200 font-mono">Cancel</button>
                    <button onClick={onConfirm} className="px-3 py-1 bg-gray-300 border-2 border-black active:bg-gray-200 font-bold font-mono">OK</button>
                </div>
            </div>
        </div>
     </div>
);


export const MacShop: React.FC<AppProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();

    const [isLoading, setIsLoading] = useState(true);
    const [isAppReady, setIsAppReady] = useState(false);
    
    const [layers, setLayers] = useState<MacShopLayer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
    const [tool, setTool] = useState<MacShopTool>('pencil');
    const [color, setColor] = useState<string>('#000000');
    
    const [selection, setSelection] = useState<SelectionRect | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [undoState, setUndoState] = useState<ImageData | null>(null);
    const lastPoint = useRef<{ x: number, y: number } | null>(null);
    const moveData = useRef<ImageData | null>(null);

    const [showGenFillModal, setShowGenFillModal] = useState(false);
    const [genFillPrompt, setGenFillPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [textToolState, setTextToolState] = useState<{ x: number; y: number; text: string; size: number; } | null>(null);
    
    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const appDocuments = getDocumentsByApp(APP_ID);

    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const getActiveLayer = useCallback(() => layers.find(l => l.id === activeLayerId), [layers, activeLayerId]);
    
    const loadDocument = useCallback((doc: AppDocument) => {
        const content = doc.content;
        if (content && content.layers) {
            const newLayers = content.layers.map((layerData: any) => ({
                ...layerData,
                canvasRef: createRef<HTMLCanvasElement>(),
            }));
            setLayers(newLayers);
            setActiveLayerId(newLayers[newLayers.length - 1].id);
            setActiveDocument(doc);
            setIsDirty(false);
        }
    }, []);
    
    useEffect(() => {
        if (documentIdToOpen) {
            const doc = getDocument(documentIdToOpen);
            if (doc && doc.appId === APP_ID) {
                setIsLoading(false);
                loadDocument(doc);
                setIsAppReady(true);
            }
        } else {
            const timer = setTimeout(() => {
                setIsLoading(false);
                const bgLayer: MacShopLayer = { id: 'bg', name: 'Background', isVisible: true, opacity: 1, canvasRef: createRef<HTMLCanvasElement>() };
                setLayers([bgLayer]);
                setActiveLayerId('bg');
                setTimeout(() => setIsAppReady(true), 10);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [documentIdToOpen, getDocument, loadDocument]);

    // Effect to draw initial content (bg color or loaded data)
    useEffect(() => {
        if (isAppReady) {
            layers.forEach(layer => {
                const canvas = layer.canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                if (layer.id === 'bg' && !layer.dataURL) {
                    ctx.fillStyle = BG_COLOR;
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                } else if (layer.dataURL) {
                    const img = new Image();
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = layer.dataURL;
                }
            });
        }
    }, [isAppReady, layers]);

    const saveUndoState = useCallback(() => {
        const activeLayer = getActiveLayer();
        const canvas = activeLayer?.canvasRef.current;
        if(canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if(ctx) setUndoState(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
        }
    }, [getActiveLayer]);

    const handleUndo = useCallback(() => {
        const activeLayer = getActiveLayer();
        const canvas = activeLayer?.canvasRef.current;
        if (canvas && undoState) {
            const ctx = canvas.getContext('2d');
            ctx?.putImageData(undoState, 0, 0);
        }
    }, [getActiveLayer, undoState]);
    
    const getCanvasCoords = (e: React.MouseEvent): { x: number, y: number } | null => {
        const container = canvasContainerRef.current;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / rect.width * CANVAS_WIDTH);
        const y = Math.floor((e.clientY - rect.top) / rect.height * CANVAS_HEIGHT);
        return { x, y };
    };

    const pickColor = useCallback((x: number, y: number) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CANVAS_WIDTH;
        tempCanvas.height = CANVAS_HEIGHT;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;
        
        layers.forEach(layer => {
            if (layer.isVisible && layer.canvasRef.current) {
                tempCtx.drawImage(layer.canvasRef.current, 0, 0);
            }
        });

        const pixel = tempCtx.getImageData(x, y, 1, 1).data;
        const hex = `#${("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6)}`;
        setColor(hex);
        
    }, [layers]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const coords = getCanvasCoords(e);
        if (!coords) return;
        const activeLayer = getActiveLayer();
        if(!activeLayer || !activeLayer.isVisible) return;
        
        saveUndoState();
        setIsDrawing(true);
        lastPoint.current = coords;
        setIsDirty(true);

        if (tool === 'select') {
            setSelection({ ...coords, width: 0, height: 0 });
        } else if (tool === 'eyedropper') {
            pickColor(coords.x, coords.y);
            setIsDrawing(false);
        } else if (tool === 'text') {
            setTextToolState({ x: coords.x, y: coords.y, text: '', size: 16 });
            setIsDrawing(false);
        } else if (tool === 'move') {
            const canvas = activeLayer.canvasRef.current;
            if(canvas) {
                const ctx = canvas.getContext('2d');
                if(ctx) {
                    moveData.current = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }
            }
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const coords = getCanvasCoords(e);
        if (!coords || !lastPoint.current) return;
        
        const activeLayer = getActiveLayer();
        if(!activeLayer) return;
        const ctx = activeLayer.canvasRef.current?.getContext('2d');

        if (tool === 'pencil' || tool === 'eraser' || tool === 'brush') {
            if(!ctx) return;
            ctx.beginPath();
            ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
            ctx.lineTo(coords.x, coords.y);
            
            if(tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
                ctx.lineWidth = 12;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = color;
                ctx.lineWidth = tool === 'pencil' ? 4 : 8;
            }
            ctx.lineCap = tool === 'brush' ? 'round' : 'square';
            ctx.lineJoin = tool === 'brush' ? 'round' : 'miter';
            ctx.stroke();
            lastPoint.current = coords;
            ctx.globalCompositeOperation = 'source-over';
        } else if (tool === 'select' && selection) {
            const newSelection = { ...selection, width: coords.x - selection.x, height: coords.y - selection.y };
            setSelection(newSelection);
        } else if (tool === 'move' && moveData.current) {
            const previewCtx = previewCanvasRef.current?.getContext('2d');
            if (previewCtx) {
                const dx = coords.x - lastPoint.current.x;
                const dy = coords.y - lastPoint.current.y;
                previewCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                previewCtx.putImageData(moveData.current, dx, dy);
            }
        }
    };
    
    const handleMouseUp = (e: React.MouseEvent) => {
        setIsDrawing(false);
        
        if (tool === 'select' && selection) {
            const normalized = {
                x: selection.width < 0 ? selection.x + selection.width : selection.x,
                y: selection.height < 0 ? selection.y + selection.height : selection.y,
                width: Math.abs(selection.width),
                height: Math.abs(selection.height),
            };
            if(normalized.width < 1 || normalized.height < 1) setSelection(null);
            else setSelection(normalized);
        } else if (tool === 'move' && lastPoint.current && moveData.current) {
            const activeCtx = getActiveLayer()?.canvasRef.current?.getContext('2d');
            const previewCanvas = previewCanvasRef.current;
            if (activeCtx && previewCanvas) {
                activeCtx.drawImage(previewCanvas, 0, 0);
                previewCanvas.getContext('2d')?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
            moveData.current = null;
        }
        
        lastPoint.current = null;
    };

    const handleDeselect = useCallback(() => setSelection(null), []);

    // Layer Management
    const addLayer = useCallback(() => {
        layerCounter++;
        const newLayer: MacShopLayer = { id: `layer-${layerCounter}`, name: `Layer ${layerCounter}`, isVisible: true, opacity: 1, canvasRef: createRef<HTMLCanvasElement>() };
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
    }, []);

    const deleteLayer = useCallback(() => {
        if(activeLayerId === 'bg') return;
        setLayers(prev => prev.filter(l => l.id !== activeLayerId));
        setActiveLayerId(layers.find(l => l.id !== activeLayerId)?.id || 'bg');
    }, [activeLayerId, layers]);

    // AI Generation
    const openGenFillModal = useCallback(() => {
        if (!getActiveLayer()) addLayer();
        setShowGenFillModal(true);
    }, [getActiveLayer, addLayer]);

    const handleGenerate = useCallback(async () => {
        const activeLayer = getActiveLayer();
        if (!genFillPrompt || !activeLayer?.canvasRef.current) return;
        
        setIsGenerating(true);
        try {
            const targetRect = selection || { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
            const imageUrl = await generateMacShopImage(genFillPrompt, targetRect.width, targetRect.height);
            
            const image = new Image();
            image.crossOrigin = 'Anonymous';
            image.src = imageUrl;
            image.onload = () => {
                const ctx = activeLayer.canvasRef.current?.getContext('2d');
                if(!ctx) return;
                saveUndoState();
                ctx.save();
                ctx.beginPath();
                ctx.rect(targetRect.x, targetRect.y, targetRect.width, targetRect.height);
                ctx.clip();
                ctx.drawImage(image, targetRect.x, targetRect.y, targetRect.width, targetRect.height);
                ctx.restore();
                
                setShowGenFillModal(false);
                setGenFillPrompt('');
                setSelection(null);
                setIsGenerating(false);
            }

        } catch (error) {
            console.error(error);
            setIsGenerating(false);
        }
    }, [genFillPrompt, selection, getActiveLayer, saveUndoState]);
    
    const handleConfirmText = useCallback((text: string, size: number) => {
        if (!textToolState) return;
        const activeLayer = getActiveLayer();
        const ctx = activeLayer?.canvasRef.current?.getContext('2d');
        if (ctx) {
            saveUndoState();
            ctx.fillStyle = color;
            ctx.font = `${size}px 'DotGothic16', sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(text, textToolState.x, textToolState.y);
        }
        setTextToolState(null);
    }, [textToolState, color, getActiveLayer, saveUndoState]);

    // File Operations
    const handleNew = useCallback(() => {
        // In a real app, prompt to save if dirty
        setIsAppReady(false);
        setActiveDocument(null);
        setSelection(null);
        setTimeout(() => {
             const bgLayer: MacShopLayer = { id: 'bg', name: 'Background', isVisible: true, opacity: 1, canvasRef: createRef<HTMLCanvasElement>() };
             setLayers([bgLayer]);
             setActiveLayerId('bg');
             setIsAppReady(true);
        }, 10);
    }, []);

    const getSaveContent = () => {
        return {
            layers: layers.map(l => ({
                id: l.id,
                name: l.name,
                isVisible: l.isVisible,
                opacity: l.opacity,
                dataURL: l.canvasRef.current?.toDataURL() || '',
            }))
        };
    };

    const handleSave = useCallback(() => {
        const content = getSaveContent();
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, content);
            setIsDirty(false);
        } else {
            setSaveAsName('Untitled Project');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, layers, updateDocument]);
    
    const handleSaveAs = useCallback(() => {
        setSaveAsName(activeDocument?.name || 'Untitled Project');
        setIsSaveAsModalOpen(true);
    }, [activeDocument]);

    const confirmSaveAs = useCallback(() => {
        if (!saveAsName.trim()) return;
        const content = getSaveContent();
        const newDoc = createDocument(saveAsName, content, APP_ID);
        const documentsFolder = findNodeByPath('/Documents');
        if (documentsFolder) {
            createFile(saveAsName, documentsFolder.id, 'document', APP_ID, newDoc.id);
        }
        setActiveDocument(newDoc);
        setIsDirty(false);
        setIsSaveAsModalOpen(false);
    }, [saveAsName, layers, createDocument, findNodeByPath, createFile]);

    const handleOpen = useCallback(() => setIsOpenFileModalOpen(true), []);

    const confirmOpen = (docId: string) => {
        const docToOpen = getDocument(docId);
        if (docToOpen) {
            loadDocument(docToOpen);
        }
        setIsOpenFileModalOpen(false);
    };

    useEffect(() => {
        if(!isActive) return;
        const handlers = {
            'macshop:file:new': handleNew,
            'macshop:file:open': handleOpen,
            'macshop:file:save': handleSave,
            'macshop:file:saveas': handleSaveAs,
            'macshop:edit:undo': handleUndo,
            'macshop:edit:deselect': handleDeselect,
            'macshop:layer:new': addLayer,
            'macshop:layer:delete': deleteLayer,
            'macshop:filter:genfill': openGenFillModal
        };

        const subscriptions = Object.entries(handlers).map(([event, handler]) => {
            const wrappedHandler = (data: { instanceId: string }) => {
                if (data.instanceId === instanceId) handler();
            };
            globalEmitter.subscribe(event, wrappedHandler);
            return { event, handler: wrappedHandler };
        });

        return () => subscriptions.forEach(({ event, handler }) => globalEmitter.unsubscribe(event, handler));
    }, [isActive, instanceId, handleNew, handleOpen, handleSave, handleSaveAs, handleUndo, handleDeselect, addLayer, deleteLayer, openGenFillModal, layers]);

    useEffect(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        if (selection) {
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
        }
    }, [selection]);

    const ToolButton = ({ toolName, children }: { toolName: MacShopTool, children: React.ReactNode }) => (
        <button onClick={() => setTool(toolName)} className={`w-8 h-8 flex items-center justify-center border-2 bg-gray-300 ${tool === toolName ? 'border-black' : 'border-gray-400'}`}>{children}</button>
    );

    return (
        <div className="w-full h-full flex flex-col bg-gray-400 text-black font-mono select-none">
            {isLoading && <LoadingScreen />}
            {showGenFillModal && <GenFillModal onGenerate={handleGenerate} onCancel={() => setShowGenFillModal(false)} prompt={genFillPrompt} setPrompt={setGenFillPrompt} isLoading={isGenerating}/>}
            {textToolState && 
                <TextToolModal 
                    text={textToolState.text}
                    setText={(t) => setTextToolState(s => s ? {...s, text: t} : null)}
                    size={textToolState.size}
                    setSize={(s) => setTextToolState(st => st ? {...st, size: s} : null)}
                    onConfirm={() => handleConfirmText(textToolState.text, textToolState.size)}
                    onCancel={() => setTextToolState(null)}
                />
            }
            {isOpenFileModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow w-96">
                        <h3 className="font-bold mb-2">Open Project:</h3>
                        <ul className="h-48 overflow-y-auto border-2 border-black bg-white p-1">
                           {appDocuments.length > 0 ? appDocuments.map(doc => (
                               <li key={doc.id}>
                                   <button onClick={() => confirmOpen(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">
                                       {doc.name}
                                   </button>
                               </li>
                           )) : <li className="p-2 text-center text-gray-500">No projects found.</li>}
                        </ul>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setIsOpenFileModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                        </div>
                    </div>
                 </div>
            )}
             {isSaveAsModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow">
                        <h3 className="font-bold mb-2">Save Project As:</h3>
                        <input
                            type="text"
                            value={saveAsName}
                            onChange={e => setSaveAsName(e.target.value)}
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
            
            <div className="flex flex-grow min-h-0">
                {/* Toolbar */}
                <div className="p-2 bg-gray-400 flex flex-col">
                    <div className="grid grid-cols-2 gap-2">
                        <ToolButton toolName="select">S</ToolButton>
                        <ToolButton toolName="move">✥</ToolButton>
                        <ToolButton toolName="pencil">✏️</ToolButton>
                        <ToolButton toolName="brush">B</ToolButton>
                        <ToolButton toolName="eraser">E</ToolButton>
                        <ToolButton toolName="fill">F</ToolButton>
                        <ToolButton toolName="text">T</ToolButton>
                        <ToolButton toolName="eyedropper">💧</ToolButton>
                        <ToolButton toolName="gen-fill">✨</ToolButton>
                    </div>
                    <div className="mt-2 p-1 bg-gray-300 border-2 border-gray-500 text-center text-xs">
                        {TOOL_NAMES[tool]}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow flex items-center justify-center p-2">
                    <div
                        ref={canvasContainerRef}
                        className="relative bg-black"
                        style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, imageRendering: 'pixelated' }}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                    >
                        {layers.map((layer, index) => (
                            <canvas
                                key={layer.id}
                                ref={layer.canvasRef}
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                                className="absolute top-0 left-0 pointer-events-none"
                                style={{ zIndex: index, opacity: layer.opacity, display: layer.isVisible ? 'block' : 'none' }}
                            />
                        ))}
                         <canvas
                            ref={previewCanvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="absolute top-0 left-0 pointer-events-none"
                            style={{ zIndex: layers.length + 1 }}
                         />
                    </div>
                </div>

                {/* Side Panels */}
                <div className="w-48 bg-gray-400 flex flex-col p-2 space-y-2">
                    {/* Color Picker */}
                    <div className="bg-gray-300 border-2 border-gray-500 p-1">
                        <h4 className="text-center font-bold text-sm">Colors</h4>
                        <div className="grid grid-cols-4 gap-1 p-1">
                            {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-full h-6 border-2 ${color === c ? 'border-white' : 'border-black'}`} style={{ backgroundColor: c }} />)}
                        </div>
                    </div>
                     {/* Layers */}
                    <div className="bg-gray-300 border-2 border-gray-500 p-1 flex-grow flex flex-col min-h-0">
                        <h4 className="text-center font-bold text-sm">Layers</h4>
                        <div className="flex-grow bg-white border-2 border-black mt-1 overflow-y-auto">
                           {[...layers].reverse().map(layer => (
                               <div key={layer.id} onClick={() => setActiveLayerId(layer.id)} className={`flex items-center p-1 space-x-2 text-sm ${activeLayerId === layer.id ? 'bg-blue-400 text-white' : 'hover:bg-gray-200'}`}>
                                   <input type="checkbox" checked={layer.isVisible} onChange={(e) => {
                                       e.stopPropagation();
                                       setLayers(ls => ls.map(l => l.id === layer.id ? {...l, isVisible: !l.isVisible} : l));
                                   }} />
                                   <span className="flex-grow">{layer.name}</span>
                               </div>
                           ))}
                        </div>
                         <div className="flex items-center justify-end mt-1 space-x-1">
                            <button onClick={addLayer} className="px-2 border-2 border-black bg-gray-300">New</button>
                            <button onClick={deleteLayer} disabled={activeLayerId === 'bg'} className="px-2 border-2 border-black bg-gray-300 disabled:opacity-50">Del</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};