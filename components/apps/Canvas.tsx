
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useCards } from '../../CardContext';
import { useApp } from '../../types';
import type { 
    CanvasLayer, 
    CanvasTool, 
    CanvasShapeElement, 
    CanvasPathElement,
    CanvasTextElement,
    CanvasLineElement,
    AppDocument, 
    CanvasElement,
    CanvasGradient
} from '../../types';
import { globalEmitter } from '../../events';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  documentIdToOpen?: string;
}

const APP_ID = 'canvas';

// --- Icons ---
const SelectIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>;
const HandIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v5m-3-1V5a2 2 0 00-2-2v0a2 2 0 00-2 2v10m-3-6V9a2 2 0 00-2-2v0a2 2 0 00-2 2v7a7 7 0 007 7h3a7 7 0 007-7v-1"/></svg>;
const SquareIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
const CircleIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>;
const TriangleIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l9 18H3l9-18z"/></svg>;
const LineIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="21" x2="21" y2="3"/></svg>;
const PencilIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const HighlighterIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l4 4-8 8H4v-4l8-8z"/><path d="M18 11l-3-3"/></svg>;
const TextIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>;

export const Canvas: React.FC<AppProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { groups: cardGroups, getCardById } = useCards();
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();

    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [gradients, setGradients] = useState<CanvasGradient[]>([]);
    const [activeTool, setActiveTool] = useState<CanvasTool>('select');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [activeLayerId, setActiveLayerId] = useState('layer-1');
    
    // UI State
    const [isInspectorOpen, setIsInspectorOpen] = useState(true);
    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [rightPanelTab, setRightPanelTab] = useState<'inspector' | 'cards'>('inspector');

    // Drawing Logic
    const [isInteracting, setIsInteracting] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [draggedElement, setDraggedElement] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
    const [startPoint, setStartPoint] = useState({x: 0, y: 0});
    const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);

    const svgRef = useRef<SVGSVGElement>(null);

    const loadContent = useCallback((content: any) => {
        if (!content) return;
        setElements(content.elements || []);
        setGradients(content.gradients || []);
        if (content.viewTransform) setViewTransform(content.viewTransform);
    }, []);

    useEffect(() => {
        if (documentIdToOpen) {
            const doc = getDocument(documentIdToOpen);
            if (doc) {
                setActiveDocument(doc);
                loadContent(doc.content);
            }
        }
    }, [documentIdToOpen, getDocument, loadContent]);

    const screenToWorld = (clientX: number, clientY: number) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left - viewTransform.x) / viewTransform.scale,
            y: (clientY - rect.top - viewTransform.y) / viewTransform.scale
        };
    };

    const handleSave = useCallback(() => {
        const content = { elements, viewTransform, gradients };
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, content);
        } else {
            setSaveAsName('Untitled Canvas');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, elements, viewTransform, gradients, updateDocument]);

    const confirmSaveAs = useCallback(() => {
        if (!saveAsName.trim()) return;
        const content = { elements, viewTransform, gradients };
        const newDoc = createDocument(saveAsName, content, APP_ID);
        const docsFolder = findNodeByPath('/Documents');
        if (docsFolder) createFile(saveAsName, docsFolder.id, 'document', APP_ID, newDoc.id);
        setActiveDocument(newDoc);
        setIsSaveAsModalOpen(false);
    }, [saveAsName, elements, viewTransform, gradients, createDocument, findNodeByPath, createFile]);

    const handleExportPDF = () => {
        if (!svgRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
        // Make it readable for the print window
        svgClone.setAttribute('width', '800');
        svgClone.setAttribute('height', '1100');
        printWindow.document.write(`
            <html><head><title>Canvas Export</title><style>
                @page { size: auto; margin: 0mm; }
                body { margin: 0; display: flex; justify-content: center; }
                svg { max-width: 100%; height: auto; }
            </style></head><body>${svgClone.outerHTML}</body></html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    useEffect(() => {
        if (!isActive) return;
        const handlers = {
            'canvas:file:save': handleSave,
            'canvas:file:saveas': () => setIsSaveAsModalOpen(true),
            'canvas:file:new': () => { setElements([]); setActiveDocument(null); },
            'canvas:file:export': handleExportPDF,
            'canvas:edit:delete': () => { if(selectedElementId) setElements(e => e.filter(el => el.id !== selectedElementId)); },
            'canvas:arrange:front': () => {
                if (selectedElementId) {
                    setElements(prev => {
                        const target = prev.find(el => el.id === selectedElementId);
                        if (!target) return prev;
                        return [...prev.filter(el => el.id !== selectedElementId), target];
                    });
                }
            },
            'canvas:arrange:back': () => {
                if (selectedElementId) {
                    setElements(prev => {
                        const target = prev.find(el => el.id === selectedElementId);
                        if (!target) return prev;
                        return [target, ...prev.filter(el => el.id !== selectedElementId)];
                    });
                }
            }
        };
        const subs = Object.entries(handlers).map(([evt, h]) => {
            const wrapper = (d: any) => { if(d.instanceId === instanceId) h(); };
            globalEmitter.subscribe(evt, wrapper);
            return { evt, wrapper };
        });
        return () => subs.forEach(s => globalEmitter.unsubscribe(s.evt, s.wrapper));
    }, [isActive, instanceId, handleSave, selectedElementId]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        if (activeTool === 'hand') { setIsPanning(true); setStartPoint({ x: e.clientX, y: e.clientY }); return; }

        setIsInteracting(true);
        setStartPoint(worldPos);

        const target = (e.target as any).closest('[data-element-id]');
        if (activeTool === 'select') {
            if (target) {
                const id = target.getAttribute('data-element-id')!;
                setSelectedElementId(id);
                const element = elements.find(el => el.id === id);
                if (element) setDraggedElement({ id, offsetX: worldPos.x - element.x, offsetY: worldPos.y - element.y });
            } else {
                setSelectedElementId(null);
            }
            return;
        }

        const newId = `el-${Date.now()}`;
        let newElement: CanvasElement | null = null;

        if (['shape_rect', 'shape_circle', 'shape_triangle'].includes(activeTool)) {
            newElement = {
                id: newId, type: 'shape', shapeType: activeTool.split('_')[1] as any, layerId: activeLayerId,
                x: worldPos.x, y: worldPos.y, width: 0, height: 0,
                fillType: 'solid', fillColor: '#cccccc', strokeColor: '#000000', strokeWidth: 1,
                rotation: 0, opacity: 1, isGlass: false
            };
        } else if (activeTool === 'line') {
            // Fix: Added missing width and height properties to CanvasLineElement.
            newElement = {
                id: newId, type: 'line', layerId: activeLayerId,
                x: worldPos.x, y: worldPos.y, x2: worldPos.x, y2: worldPos.y,
                strokeColor: '#000000', strokeWidth: 2, rotation: 0, opacity: 1,
                width: 0, height: 0
            };
        } else if (activeTool === 'pencil' || activeTool === 'highlighter') {
            // Fix: Added missing width and height properties to CanvasPathElement.
            newElement = {
                id: newId, type: 'path', layerId: activeLayerId,
                x: 0, y: 0, points: [worldPos], pathData: `M ${worldPos.x} ${worldPos.y}`,
                strokeColor: activeTool === 'highlighter' ? '#ffff00' : '#000000',
                strokeWidth: activeTool === 'highlighter' ? 12 : 2,
                isHighlighter: activeTool === 'highlighter',
                rotation: 0, opacity: activeTool === 'highlighter' ? 0.5 : 1,
                width: 0, height: 0
            };
        } else if (activeTool === 'text') {
            newElement = {
                id: newId, type: 'text', layerId: activeLayerId,
                x: worldPos.x, y: worldPos.y, content: 'Type here...', width: 150, height: 30,
                fontFamily: 'sans-serif', fontSize: 24, fontWeight: 'normal', textAlign: 'left',
                color: '#000000', rotation: 0, opacity: 1
            };
            setElements(prev => [...prev, newElement!]);
            setSelectedElementId(newId);
            setActiveTool('select');
            setIsInteracting(false);
            return;
        }

        if (newElement) setCurrentElement(newElement);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        if (isPanning) {
            setViewTransform(prev => ({ ...prev, x: prev.x + (e.clientX - startPoint.x), y: prev.y + (e.clientY - startPoint.y) }));
            setStartPoint({ x: e.clientX, y: e.clientY });
            return;
        }
        if (!isInteracting) return;

        if (draggedElement) {
            setElements(prev => prev.map(el => el.id === draggedElement.id ? { ...el, x: worldPos.x - draggedElement.offsetX, y: worldPos.y - draggedElement.offsetY } : el));
        } else if (currentElement) {
            if (currentElement.type === 'shape') {
                setCurrentElement({ ...currentElement, width: worldPos.x - startPoint.x, height: worldPos.y - startPoint.y });
            } else if (currentElement.type === 'line') {
                setCurrentElement({ ...currentElement, x2: worldPos.x, y2: worldPos.y });
            } else if (currentElement.type === 'path') {
                const nextPoints = [...currentElement.points, worldPos];
                const nextPathData = nextPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                setCurrentElement({ ...currentElement, points: nextPoints, pathData: nextPathData });
            }
        }
    };

    const handleMouseUp = () => {
        if (currentElement) {
            setElements(prev => [...prev, currentElement]);
            setSelectedElementId(currentElement.id);
        }
        setIsInteracting(false); setIsPanning(false); setDraggedElement(null); setCurrentElement(null);
    };

    const updateElement = (id: string, patch: Partial<CanvasElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...patch } as any : el));
    };

    const selectedElement = useMemo(() => elements.find(e => e.id === selectedElementId), [elements, selectedElementId]);

    return (
        <div className="w-full h-full flex bg-gray-200 overflow-hidden font-[var(--main-font)] text-black">
            {/* Toolbar */}
            <div className="w-12 border-r border-black bg-white flex flex-col items-center py-2 space-y-3 z-10">
                <button onClick={() => setActiveTool('select')} className={`p-1.5 border border-black ${activeTool === 'select' ? 'bg-black text-white' : ''}`} title="Select"><SelectIcon/></button>
                <button onClick={() => setActiveTool('hand')} className={`p-1.5 border border-black ${activeTool === 'hand' ? 'bg-black text-white' : ''}`} title="Pan"><HandIcon/></button>
                <div className="w-8 h-px bg-gray-300"/>
                <button onClick={() => setActiveTool('pencil')} className={`p-1.5 border border-black ${activeTool === 'pencil' ? 'bg-black text-white' : ''}`} title="Pencil"><PencilIcon/></button>
                <button onClick={() => setActiveTool('highlighter')} className={`p-1.5 border border-black ${activeTool === 'highlighter' ? 'bg-black text-white' : ''}`} title="Highlighter"><HighlighterIcon/></button>
                <button onClick={() => setActiveTool('line')} className={`p-1.5 border border-black ${activeTool === 'line' ? 'bg-black text-white' : ''}`} title="Line"><LineIcon/></button>
                <button onClick={() => setActiveTool('shape_rect')} className={`p-1.5 border border-black ${activeTool === 'shape_rect' ? 'bg-black text-white' : ''}`} title="Rectangle"><SquareIcon/></button>
                <button onClick={() => setActiveTool('shape_circle')} className={`p-1.5 border border-black ${activeTool === 'shape_circle' ? 'bg-black text-white' : ''}`} title="Circle"><CircleIcon/></button>
                <button onClick={() => setActiveTool('shape_triangle')} className={`p-1.5 border border-black ${activeTool === 'shape_triangle' ? 'bg-black text-white' : ''}`} title="Triangle"><TriangleIcon/></button>
                <button onClick={() => setActiveTool('text')} className={`p-1.5 border border-black ${activeTool === 'text' ? 'bg-black text-white' : ''}`} title="Text"><TextIcon/></button>
                <div className="flex-grow"/>
                <button onClick={() => setRightPanelTab('cards')} className={`p-1.5 border border-black ${rightPanelTab === 'cards' ? 'bg-black text-white' : ''}`} title="Cards Library">📄</button>
            </div>

            {/* Canvas */}
            <div className="flex-grow relative bg-gray-100 overflow-hidden">
                <svg 
                    ref={svgRef} 
                    className="w-full h-full cursor-crosshair touch-none"
                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                    onWheel={e => setViewTransform(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))}
                >
                    <g transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}>
                        {elements.map(el => {
                            const common = { 
                                key: el.id, 
                                'data-element-id': el.id, 
                                opacity: el.opacity,
                                transform: `translate(${el.x}, ${el.y}) rotate(${el.rotation})`
                            };
                            if (el.type === 'shape') {
                                const fill = el.fillType === 'none' ? 'none' : el.fillColor;
                                if (el.shapeType === 'rect') return <rect width={el.width} height={el.height} fill={fill} stroke={el.strokeColor} strokeWidth={el.strokeWidth} {...common}/>;
                                if (el.shapeType === 'circle') return <ellipse cx={el.width/2} cy={el.height/2} rx={Math.abs(el.width/2)} ry={Math.abs(el.height/2)} fill={fill} stroke={el.strokeColor} strokeWidth={el.strokeWidth} {...common}/>;
                                if (el.shapeType === 'triangle') return <path d={`M ${el.width/2} 0 L ${el.width} ${el.height} L 0 ${el.height} Z`} fill={fill} stroke={el.strokeColor} strokeWidth={el.strokeWidth} {...common}/>;
                            }
                            if (el.type === 'line') return <line key={el.id} x1={0} y1={0} x2={el.x2 - el.x} y2={el.y2 - el.y} stroke={el.strokeColor} strokeWidth={el.strokeWidth} {...common}/>;
                            if (el.type === 'path') return <path key={el.id} d={el.pathData} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...common}/>;
                            if (el.type === 'text') return (
                                <text key={el.id} dominantBaseline="hanging" fill={el.color} fontSize={el.fontSize} fontWeight={el.fontWeight} style={{fontFamily: el.fontFamily}} onDoubleClick={() => {
                                    const next = prompt('Edit text:', el.content);
                                    if (next) updateElement(el.id, { content: next });
                                }} {...common}>
                                    {el.content}
                                </text>
                            );
                            if (el.type === 'card') {
                                const card = getCardById(el.cardId);
                                return (
                                    <g key={el.id} {...common}>
                                        <rect width={el.width} height={el.height} fill="white" stroke="black" strokeWidth="1" />
                                        <foreignObject x="5" y="5" width={el.width - 10} height={el.height - 10}>
                                            <div className="text-[10px] text-black overflow-hidden h-full whitespace-pre-wrap">{card?.content || 'Empty Card'}</div>
                                        </foreignObject>
                                    </g>
                                );
                            }
                            return null;
                        })}
                        {currentElement && (
                             <g opacity="0.5">
                                {currentElement.type === 'shape' && (
                                    currentElement.shapeType === 'rect' ? <rect x={currentElement.x} y={currentElement.y} width={currentElement.width} height={currentElement.height} fill="gray" /> :
                                    currentElement.shapeType === 'circle' ? <ellipse cx={currentElement.x + currentElement.width/2} cy={currentElement.y + currentElement.height/2} rx={Math.abs(currentElement.width/2)} ry={Math.abs(currentElement.height/2)} fill="gray" /> :
                                    <path d={`M ${currentElement.x + currentElement.width/2} ${currentElement.y} L ${currentElement.x + currentElement.width} ${currentElement.y + currentElement.height} L ${currentElement.x} ${currentElement.y + currentElement.height} Z`} fill="gray" />
                                )}
                                {currentElement.type === 'path' && <path d={currentElement.pathData} fill="none" stroke={currentElement.strokeColor} strokeWidth={currentElement.strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>}
                                {currentElement.type === 'line' && <line x1={currentElement.x} y1={currentElement.y} x2={currentElement.x2} y2={currentElement.y2} stroke="black" strokeWidth="2" strokeDasharray="4"/>}
                             </g>
                        )}
                        {selectedElement && (
                            <rect x={selectedElement.x - 2} y={selectedElement.y - 2} width={(selectedElement as any).width || 4} height={(selectedElement as any).height || 4} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2" />
                        )}
                    </g>
                </svg>
            </div>

            {/* Inspector / Library Right Panel */}
            <div className={`transition-all duration-300 flex border-l border-black bg-white ${isInspectorOpen ? 'w-64' : 'w-0'}`}>
                {/* Collapse Handle */}
                <button 
                    onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-12 bg-white border border-black rounded-l-md z-20 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100"
                    style={{ right: isInspectorOpen ? '255px' : '-4px', left: 'auto' }}
                >
                    {isInspectorOpen ? '→' : '←'}
                </button>

                <div className="w-full flex flex-col overflow-hidden">
                    <div className="flex border-b border-black">
                        <button onClick={() => setRightPanelTab('inspector')} className={`flex-1 py-2 text-[10px] font-bold ${rightPanelTab === 'inspector' ? 'bg-gray-100' : ''}`}>PROPS</button>
                        <button onClick={() => setRightPanelTab('cards')} className={`flex-1 py-2 text-[10px] font-bold ${rightPanelTab === 'cards' ? 'bg-gray-100' : ''}`}>CARDS</button>
                    </div>

                    <div className="p-4 space-y-4 overflow-y-auto">
                        {rightPanelTab === 'inspector' ? (
                            !selectedElement ? (
                                <div className="text-[10px] text-center text-gray-400 mt-10">Select an object on the canvas to edit its properties</div>
                            ) : (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase">Arrangement</label>
                                        <div className="flex space-x-1">
                                            <button onClick={() => setElements(prev => [...prev.filter(e => e.id !== selectedElement.id), selectedElement])} className="flex-1 text-[9px] border border-black p-1 hover:bg-gray-100">BRING FRONT</button>
                                            <button onClick={() => setElements(prev => [selectedElement, ...prev.filter(e => e.id !== selectedElement.id)])} className="flex-1 text-[9px] border border-black p-1 hover:bg-gray-100">SEND BACK</button>
                                        </div>
                                    </div>
                                    {selectedElement.type === 'shape' && (
                                        <div className="space-y-2 border-t pt-2 border-black/10">
                                            <label className="text-[10px] font-bold uppercase block">Fill Settings</label>
                                            <div className="flex space-x-1 mb-2">
                                                <button onClick={() => updateElement(selectedElement.id, { fillType: 'solid' })} className={`flex-1 text-[9px] border border-black p-1 ${selectedElement.fillType === 'solid' ? 'bg-black text-white' : ''}`}>SOLID</button>
                                                <button onClick={() => updateElement(selectedElement.id, { fillType: 'none' })} className={`flex-1 text-[9px] border border-black p-1 ${selectedElement.fillType === 'none' ? 'bg-black text-white' : ''}`}>NONE</button>
                                            </div>
                                            {selectedElement.fillType === 'solid' && (
                                                <input type="color" value={selectedElement.fillColor} onChange={e => updateElement(selectedElement.id, { fillColor: e.target.value })} className="w-full h-6 border border-black p-0"/>
                                            )}
                                            <label className="text-[10px] font-bold uppercase block mt-4">Stroke Color</label>
                                            <input type="color" value={selectedElement.strokeColor} onChange={e => updateElement(selectedElement.id, { strokeColor: e.target.value })} className="w-full h-6 border border-black p-0"/>
                                        </div>
                                    )}
                                    {selectedElement.type === 'text' && (
                                        <div className="space-y-2 border-t pt-2 border-black/10">
                                            <label className="text-[10px] font-bold uppercase block">Text Settings</label>
                                            <input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 12 })} className="w-full text-xs border border-black p-1" placeholder="Font Size"/>
                                            <input type="color" value={selectedElement.color} onChange={e => updateElement(selectedElement.id, { color: e.target.value })} className="w-full h-6 border border-black p-0"/>
                                        </div>
                                    )}
                                </>
                            )
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-gray-500">Your Cards</label>
                                {cardGroups.flatMap(g => g.cardIds).map(cardId => {
                                    const card = getCardById(cardId);
                                    return (
                                        <div 
                                            key={cardId} 
                                            draggable 
                                            onDragEnd={() => {
                                                const worldPos = viewTransform; // Approximate
                                                const el: CanvasElement = {
                                                    id: `el-card-${Date.now()}`, type: 'card', cardId, layerId: activeLayerId,
                                                    x: 100, y: 100, width: 200, height: 150, rotation: 0, opacity: 1
                                                };
                                                setElements(prev => [...prev, el]);
                                            }}
                                            className="p-2 border border-black bg-white cursor-grab hover:bg-gray-100 text-[10px] line-clamp-2"
                                        >
                                            {card?.content || 'Untitled Card'}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Save As Modal */}
            {isSaveAsModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white p-4 border-2 border-black">
                        <h2 className="text-xs font-bold mb-4 uppercase">Save Canvas As</h2>
                        <input value={saveAsName} onChange={e => setSaveAsName(e.target.value)} className="w-full p-2 border border-black mb-4 text-sm" />
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsSaveAsModalOpen(false)} className="px-4 py-2 border border-black text-xs">CANCEL</button>
                            <button onClick={confirmSaveAs} className="px-4 py-2 bg-black text-white text-xs">SAVE</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
