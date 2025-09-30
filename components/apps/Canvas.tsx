import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useCards } from '../../CardContext';
import { GLASS_HUES } from '../../theme';
import { useApp } from '../../types';
// FIX: Remove unused `CanvasElement` base type and use specific element types in a union.
import type { CanvasLayer, CanvasTool, CanvasCardElement, CanvasBoxElement, CanvasLineElement, AppDocument } from '../../types';
import { globalEmitter } from '../../events';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  documentIdToOpen?: string;
}

const APP_ID = 'canvas';

// Icons for Toolbar
const SelectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" /></svg>;
const BoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.563C9.252 15 9 14.748 9 14.437V9.564z" /></svg>;
const LineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75l16.5-6.5m-16.5 6.5l16.5 6.5" /></svg>;
const InspectorToggleIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d={isOpen ? "M19.5 8.25l-7.5 7.5-7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"} />
    </svg>
);


export const Canvas: React.FC<AppProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { cards: savedCards, groups, getCardById } = useCards();
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();
    const { openApp } = useApp();

    // FIX: Use a union type for elements to allow access to type-specific properties.
    const [elements, setElements] = useState<(CanvasCardElement | CanvasBoxElement | CanvasLineElement)[]>([]);
    const [layers, setLayers] = useState<CanvasLayer[]>([{ id: 'layer-1', name: 'Layer 1', isVisible: true }]);
    const [activeLayerId, setActiveLayerId] = useState('layer-1');
    const [activeTool, setActiveTool] = useState<CanvasTool>('select');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    
    const [isInteracting, setIsInteracting] = useState(false);
    const [draggedElement, setDraggedElement] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
    const [resizedElement, setResizedElement] = useState<{ id: string; startWidth: number; startHeight: number; startX: number; startY: number; } | null>(null);
    const [drawingElement, setDrawingElement] = useState<CanvasBoxElement | CanvasLineElement | null>(null);
    const [startPoint, setStartPoint] = useState({x: 0, y: 0});
    
    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [isInspectorOpen, setIsInspectorOpen] = useState(true);

    const appDocuments = getDocumentsByApp(APP_ID);

    const svgRef = useRef<SVGSVGElement>(null);
    
    const loadContent = useCallback((content: any) => {
        if (content && content.elements && content.layers) {
            setElements(content.elements);
            setLayers(content.layers);
            setActiveLayerId(content.layers[0]?.id || 'layer-1');
            setIsDirty(false);
        }
    }, []);

    useEffect(() => {
        if (documentIdToOpen) {
            const doc = getDocument(documentIdToOpen);
            if (doc && doc.appId === APP_ID) {
                setActiveDocument(doc);
                loadContent(doc.content);
            }
        }
    }, [documentIdToOpen, getDocument, loadContent]);

    const getSVGPoint = (e: React.MouseEvent | DragEvent) => {
        if (!svgRef.current) return {x: 0, y: 0};
        const pt = (svgRef.current as any).createSVGPoint();
        pt.x = (e as MouseEvent).clientX;
        pt.y = (e as MouseEvent).clientY;
        const svgPoint = pt.matrixTransform((svgRef.current as any).getScreenCTM()?.inverse());
        return { x: svgPoint.x, y: svgPoint.y };
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        const { x, y } = getSVGPoint(e);
        setIsInteracting(true);
        setStartPoint({x, y});
        const target = (e.target as any).closest('[data-element-id]');
        setIsDirty(true);

        if (activeTool === 'select') {
            if (target) {
                const id = target.getAttribute('data-element-id')!;
                setSelectedElementId(id);
                const element = elements.find(el => el.id === id);
                if (element) {
                    setDraggedElement({id, offsetX: x - element.x, offsetY: y - element.y});
                }
            } else {
                 setSelectedElementId(null);
            }
        } else if (activeTool === 'box' || activeTool === 'line') {
             setSelectedElementId(null);
            const newElement = {
                id: `el-${Date.now()}`,
                type: activeTool,
                layerId: activeLayerId,
                x: x, y: y,
                ...(activeTool === 'box' ? { width: 0, height: 0, isGlass: false, backgroundColor: '#ffffff', content: 'New Box', color: '#000000', fontSize: 12, fontFamily: 'sans-serif' } : { x2: x, y2: y })
            } as CanvasBoxElement | CanvasLineElement;
            setDrawingElement(newElement);
        }
    };
    
     const handleResizeStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        const element = elements.find(el => el.id === id);
        if (!element || (element.type !== 'card' && element.type !== 'box')) return;
        const { x, y } = getSVGPoint(e);
        setResizedElement({
            id,
            startWidth: element.width,
            startHeight: element.height,
            startX: x,
            startY: y,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isInteracting && !resizedElement) return;
        const { x, y } = getSVGPoint(e);

        if (draggedElement) {
            setElements(prev => prev.map(el =>
                el.id === draggedElement.id ? { ...el, x: x - draggedElement.offsetX, y: y - draggedElement.offsetY } : el
            ));
        } else if (resizedElement) {
            const dx = x - resizedElement.startX;
            const dy = y - resizedElement.startY;
            setElements(prev => prev.map(el => {
                if (el.id === resizedElement.id && (el.type === 'box' || el.type === 'card')) {
                    return {
                        ...el,
                        width: Math.max(80, resizedElement.startWidth + dx),
                        height: Math.max(50, resizedElement.startHeight + dy),
                    };
                }
                return el;
            }));
        } else if (drawingElement) {
            if (drawingElement.type === 'box') {
                const newWidth = Math.abs(x - startPoint.x);
                const newHeight = Math.abs(y - startPoint.y);
                const newX = Math.min(x, startPoint.x);
                const newY = Math.min(y, startPoint.y);
                setDrawingElement({...drawingElement, x: newX, y: newY, width: newWidth, height: newHeight});
            } else if (drawingElement.type === 'line') {
                setDrawingElement({...drawingElement, x2: x, y2: y});
            }
        }
    };

    const handleMouseUp = () => {
        if (drawingElement) {
            if (drawingElement.type === 'box' && (drawingElement.width < 5 || drawingElement.height < 5)) {
                // Ignore tiny elements
            } else if (drawingElement.type === 'line' && Math.hypot(drawingElement.x2 - drawingElement.x, drawingElement.y2 - drawingElement.y) < 5) {
                // Ignore tiny elements
            } else {
                 setElements(prev => [...prev, drawingElement]);
                 setSelectedElementId(drawingElement.id);
            }
        }
        setIsInteracting(false);
        setDraggedElement(null);
        setDrawingElement(null);
        setResizedElement(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('cardId');
        if (!cardId) return;

        const { x, y } = getSVGPoint(e);
        
        const newCardElement: CanvasCardElement = {
            id: `el-${Date.now()}`,
            type: 'card',
            layerId: activeLayerId,
            cardId: cardId,
            x: x - 100, // offset to center on cursor
            y: y - 50,
            width: 200,
            height: 100
        };
        setElements(prev => [...prev, newCardElement]);
        setSelectedElementId(newCardElement.id);
        setIsDirty(true);
    };

    const addLayer = () => {
        const newLayer: CanvasLayer = {
            id: `layer-${Date.now()}`,
            name: `Layer ${layers.length + 1}`,
            isVisible: true
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
        setIsDirty(true);
    };

    const toggleLayerVisibility = (id: string) => {
        setLayers(prev => prev.map(l => l.id === id ? {...l, isVisible: !l.isVisible} : l));
        setIsDirty(true);
    };

    const updateElementProperty = (id: string, prop: string, value: any) => {
        setElements(prev => prev.map(el => el.id === id ? {...el, [prop]: value} : el));
        setIsDirty(true);
    }
    
    const handleNewCanvas = useCallback(() => {
        setElements([]);
        setLayers([{ id: 'layer-1', name: 'Layer 1', isVisible: true }]);
        setActiveLayerId('layer-1');
        setSelectedElementId(null);
        setActiveDocument(null);
        setIsDirty(false);
    }, []);

    const handleDeleteSelection = useCallback(() => {
        if (selectedElementId) {
            setElements(prev => prev.filter(el => el.id !== selectedElementId));
            setSelectedElementId(null);
            setIsDirty(true);
        }
    }, [selectedElementId]);

    const getSaveContent = () => ({ elements, layers });

    const handleSave = useCallback(() => {
        const content = getSaveContent();
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, content);
            setIsDirty(false);
        } else {
            setSaveAsName('Untitled Canvas');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, elements, layers, updateDocument]);
    
    const handleSaveAs = useCallback(() => {
        setSaveAsName(activeDocument?.name || 'Untitled Canvas');
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
    }, [saveAsName, elements, layers, createDocument, findNodeByPath, createFile]);

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
        if (!isActive) return;

        const eventHandlers: { [key: string]: () => void } = {
            'canvas:file:new': handleNewCanvas,
            'canvas:file:open': handleOpen,
            'canvas:file:save': handleSave,
            'canvas:file:saveas': handleSaveAs,
            'canvas:edit:delete': handleDeleteSelection,
            'canvas:tools:select': () => setActiveTool('select'),
            'canvas:tools:box': () => setActiveTool('box'),
            'canvas:tools:line': () => setActiveTool('line'),
        };

        const subscriptions: { event: string; handler: (data?: any) => void }[] = [];

        Object.entries(eventHandlers).forEach(([event, handler]) => {
            const wrappedHandler = (data: { instanceId: string }) => {
                if (data && data.instanceId === instanceId) {
                    handler();
                }
            };
            subscriptions.push({ event, handler: wrappedHandler });
            globalEmitter.subscribe(event, wrappedHandler);
        });

        return () => {
            subscriptions.forEach(({ event, handler }) => {
                globalEmitter.unsubscribe(event, handler);
            });
        };
    }, [isActive, instanceId, handleNewCanvas, handleOpen, handleSave, handleSaveAs, handleDeleteSelection]);

    const selectedElement = elements.find(el => el.id === selectedElementId);
    const visibleLayers = new Set(layers.filter(l => l.isVisible).map(l => l.id));

    return (
        <div className="w-full h-full flex flex-row bg-white">
            {/* Toolbar */}
            <div className="flex flex-col items-center p-1 border-r-2 border-black bg-gray-100 space-y-2">
                <button title="Select/Move (V)" onClick={() => setActiveTool('select')} className={`p-2 border-2 border-black ${activeTool === 'select' ? 'bg-black text-white' : 'bg-white'}`}><SelectIcon/></button>
                <button title="Draw Box (B)" onClick={() => setActiveTool('box')} className={`p-2 border-2 border-black ${activeTool === 'box' ? 'bg-black text-white' : 'bg-white'}`}><BoxIcon/></button>
                <button title="Draw Line (L)" onClick={() => setActiveTool('line')} className={`p-2 border-2 border-black ${activeTool === 'line' ? 'bg-black text-white' : 'bg-white'}`}><LineIcon/></button>
                 <button title="Toggle Inspector" onClick={() => setIsInspectorOpen(p => !p)} className={`p-2 border-2 border-black bg-white mt-auto`}><InspectorToggleIcon isOpen={isInspectorOpen} /></button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col relative">
                <svg
                    ref={svgRef}
                    className="flex-grow w-full h-full"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <defs>
                        <pattern id="ditherPattern" patternUnits="userSpaceOnUse" width="4" height="4">
                             <rect width="2" height="2" x="0" y="0" fill="rgba(0,0,0,0.2)"/>
                             <rect width="2" height="2" x="2" y="2" fill="rgba(0,0,0,0.2)"/>
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="#fff" />
                    {elements.filter(el => visibleLayers.has(el.layerId)).map(el => {
                        const baseProps = {
                             'data-element-id': el.id,
                             className: activeTool === 'select' ? 'cursor-move' : ''
                        };
                        switch (el.type) {
                            case 'card':
                                const card = getCardById(el.cardId);
                                return (
                                    <g key={el.id} transform={`translate(${el.x}, ${el.y})`} {...baseProps} onDoubleClick={() => openApp('cards', { cardIdToOpen: el.cardId })}>
                                        <rect width={el.width} height={el.height} fill="#fff" stroke="#000" strokeWidth="2" />
                                        <foreignObject x="5" y="5" width={el.width - 10} height={el.height - 10}>
                                            <div
                                                className="w-full h-full overflow-hidden text-black text-xs p-1 whitespace-pre-wrap"
                                                style={{
                                                    fontFamily: el.fontFamily || 'sans-serif',
                                                    fontSize: `${el.fontSize || 12}px`,
                                                    color: el.color || '#000000',
                                                }}
                                            >
                                                {card?.content}
                                            </div>
                                        </foreignObject>
                                    </g>
                                );
                            case 'box':
                                const box = el as CanvasBoxElement;
                                return (
                                    <g key={box.id} transform={`translate(${box.x}, ${box.y})`} {...baseProps}>
                                        {box.isGlass ? (
                                            <>
                                                <rect width={box.width} height={box.height} fill={box.backgroundColor || 'rgba(255,255,255,0.1)'} stroke="none" />
                                                <rect width={box.width} height={box.height} fill="url(#ditherPattern)" stroke="none" />
                                                <rect width={box.width} height={box.height} fill="none" stroke="#000" strokeWidth="2" />
                                            </>
                                        ) : (
                                            <rect width={box.width} height={box.height} fill={box.backgroundColor || '#ffffff'} stroke="#000" strokeWidth="2" />
                                        )}
                                        <foreignObject x="5" y="5" width={box.width-10} height={box.height-10}>
                                             <textarea
                                                value={box.content || ''}
                                                onChange={e => updateElementProperty(box.id, 'content', e.target.value)}
                                                className="w-full h-full bg-transparent border-none resize-none focus:outline-none p-0 m-0 text-black"
                                                style={{
                                                    fontFamily: box.fontFamily || 'sans-serif',
                                                    fontSize: `${box.fontSize || 12}px`,
                                                    color: box.color || '#000000',
                                                }}
                                            />
                                        </foreignObject>
                                    </g>
                                );
                            case 'line':
                                const line = el as CanvasLineElement;
                                return <line key={el.id} x1={el.x} y1={el.y} x2={line.x2} y2={line.y2} stroke="#000" strokeWidth="2" {...baseProps} />;
                            default:
                                return null;
                        }
                    })}
                    {drawingElement && (
                        drawingElement.type === 'box' ? 
                            <rect x={drawingElement.x} y={drawingElement.y} width={drawingElement.width} height={drawingElement.height} fill="none" stroke="#000" strokeWidth="2" strokeDasharray="4"/> :
                            <line x1={drawingElement.x} y1={drawingElement.y} x2={(drawingElement as CanvasLineElement).x2} y2={(drawingElement as CanvasLineElement).y2} stroke="#000" strokeWidth="2" strokeDasharray="4"/>
                    )}
                    {selectedElement && (selectedElement.type === 'card' || selectedElement.type === 'box') && (
                        <>
                            <rect 
                                x={selectedElement.x - 2}
                                y={selectedElement.y - 2}
                                width={selectedElement.width + 4}
                                height={selectedElement.height + 4}
                                fill="none"
                                stroke="#000"
                                strokeWidth="1"
                                strokeDasharray="4 2"
                                className="pointer-events-none"
                            />
                            <rect
                                x={selectedElement.x + selectedElement.width - 5}
                                y={selectedElement.y + selectedElement.height - 5}
                                width="10"
                                height="10"
                                fill="white"
                                stroke="black"
                                strokeWidth="1"
                                className="cursor-nwse-resize"
                                onMouseDown={(e) => handleResizeStart(e, selectedElement.id)}
                            />
                        </>
                    )}
                </svg>
                 {isSaveAsModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow">
                        <h3 className="font-bold mb-2">Save Canvas As:</h3>
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
                {isOpenFileModalOpen && (
                     <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white p-4 border-2 border-black window-shadow w-96">
                            <h3 className="font-bold mb-2">Open Canvas:</h3>
                            <ul className="h-48 overflow-y-auto border-2 border-black bg-white p-1">
                               {appDocuments.length > 0 ? appDocuments.map(doc => (
                                   <li key={doc.id}>
                                       <button onClick={() => confirmOpen(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">
                                           {doc.name}
                                       </button>
                                   </li>
                               )) : <li className="p-2 text-center text-gray-500">No canvases found.</li>}
                            </ul>
                            <div className="flex justify-end mt-4">
                                <button onClick={() => setIsOpenFileModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                            </div>
                        </div>
                     </div>
                )}
            </div>

            {/* Side Panels */}
            {isInspectorOpen && (
                 <div className="w-64 flex flex-col border-l-2 border-black bg-gray-100">
                    {/* Inspector Panel */}
                    <div className="p-2 border-b-2 border-black min-h-[120px]">
                        <h3 className="font-bold text-center mb-2">Inspector</h3>
                        {selectedElement?.type === 'box' && (
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 text-sm">
                                    {/* FIX: Remove redundant cast, type narrowing is sufficient */}
                                    <input type="checkbox" checked={selectedElement.isGlass || false} onChange={e => updateElementProperty(selectedElementId!, 'isGlass', (e.target as HTMLInputElement).checked)} />
                                    <span>Make Glass</span>
                                </label>
                                <div>
                                    <label className="text-xs font-bold">BG Color</label>
                                    {/* FIX: Remove redundant cast, type narrowing is sufficient */}
                                    <input type="color" value={selectedElement.backgroundColor} onChange={e => updateElementProperty(selectedElementId!, 'backgroundColor', e.target.value)} className="w-full h-6 p-0"/>
                                </div>
                            </div>
                        )}
                        {(selectedElement?.type === 'box' || selectedElement?.type === 'card') && (
                             <div className="space-y-2 mt-2">
                                <label className="text-xs font-bold">Font</label>
                                <input type="text" value={selectedElement.fontFamily || 'sans-serif'} onChange={e => updateElementProperty(selectedElementId!, 'fontFamily', e.target.value)} className="w-full text-xs p-1 border" />
                                <div className="flex space-x-2">
                                    <input type="number" value={selectedElement.fontSize || 12} onChange={e => updateElementProperty(selectedElementId!, 'fontSize', parseInt(e.target.value))} className="w-1/2 text-xs p-1 border" />
                                    <input type="color" value={selectedElement.color || '#000000'} onChange={e => updateElementProperty(selectedElementId!, 'color', e.target.value)} className="w-1/2 h-auto" />
                                </div>
                            </div>
                        )}
                         {!selectedElement && <p className="text-xs text-center text-gray-500 italic mt-4">Select an object to see its properties.</p>}
                    </div>
                     {/* Layers Panel */}
                    <div className="p-2 border-b-2 border-black">
                        <h3 className="font-bold text-center mb-2">Layers</h3>
                        <ul>
                           {layers.map(layer => (
                               <li key={layer.id} className={`flex items-center justify-between p-1 ${activeLayerId === layer.id ? 'bg-gray-300' : ''}`} onClick={() => setActiveLayerId(layer.id)}>
                                   <span className="flex-grow cursor-pointer">{layer.name}</span>
                                   <input type="checkbox" checked={layer.isVisible} onChange={() => toggleLayerVisibility(layer.id)} className="ml-2"/>
                               </li>
                           ))}
                        </ul>
                        <button onClick={addLayer} className="mt-2 w-full text-sm p-1 bg-white border-2 border-black active:bg-gray-200">Add Layer</button>
                    </div>
                    {/* Cards Panel */}
                    <div className="flex-grow overflow-y-auto p-2">
                        <h3 className="font-bold text-center mb-2">Cards Library</h3>
                        {groups.map(group => (
                             <details key={group.id} className="mb-1">
                                <summary className="font-bold cursor-pointer">{group.name}</summary>
                                <div className="pl-2">
                                {group.cardIds.length > 0 ? group.cardIds.map(cardId => {
                                    const card = getCardById(cardId);
                                    if(!card) return null;
                                    return (
                                       <div key={card.id} draggable onDragStart={(e) => e.dataTransfer.setData('cardId', card.id)} className="p-2 bg-white border-2 border-black mt-1 cursor-grab active:cursor-grabbing">
                                            <p className="text-xs pointer-events-none whitespace-pre-wrap overflow-hidden text-ellipsis" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                                               {card.content || "Empty Card"}
                                            </p>
                                       </div>
                                    );
                                }) : <p className="text-xs text-gray-500 italic">No cards.</p>}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};