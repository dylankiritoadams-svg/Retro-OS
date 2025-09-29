import React, { useRef, useEffect, useState, useCallback } from 'react';
import { globalEmitter } from '../../events';
import type { Particle, Obstacle, WormholeObstacle, PortalObstacle, CloudMixerTool, AppDocument } from '../../types';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  documentIdToOpen?: string;
}

const COLORS = ['#1a75ff', '#ff4d4d', '#33cc33', '#ffcc00', '#cc33ff', '#ff6600'];
const WATER_COLOR = '#87CEEB';
const PARTICLE_BURST_COUNT = 50;
const PARTICLE_STREAM_COUNT = 3;
const PARTICLE_RADIUS = 1.5;
const GRAVITY = 0.02;
const APP_ID = 'cloud-mixer';

let particleIdCounter = 0;

const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1).padStart(6, '0');
};

const lineCollision = (p: Particle, obs: {x1:number, y1:number, x2:number, y2:number}, bounce: number) => {
         const p1 = { x: obs.x1, y: obs.y1 };
         const p2 = { x: obs.x2, y: obs.y2 };
         const lineVec = { x: p2.x - p1.x, y: p2.y - p1.y };
         const lenSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;

         if (lenSq === 0) return;

         const t = Math.max(0, Math.min(1, ((p.x - p1.x) * lineVec.x + (p.y - p1.y) * lineVec.y) / lenSq));
         const closestPoint = { x: p1.x + t * lineVec.x, y: p1.y + t * lineVec.y };
         
         const distSq = (p.x - closestPoint.x) ** 2 + (p.y - closestPoint.y) ** 2;

         if (distSq < p.radius * p.radius) {
             const dist = Math.sqrt(distSq);
             const overlap = p.radius - dist;
             
             const normal = { x: p.x - closestPoint.x, y: p.y - closestPoint.y };
             const mag = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
             if (mag > 0) {
                 normal.x /= mag;
                 normal.y /= mag;
             }

             p.x += normal.x * overlap;
             p.y += normal.y * overlap;

             const dot = p.vx * normal.x + p.vy * normal.y;
             p.vx -= 2 * dot * normal.x * bounce;
             p.vy -= 2 * dot * normal.y * bounce;
         }
    };

export const CloudMixer: React.FC<AppProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const obstaclesRef = useRef<Obstacle[]>([]);
    const wormholesRef = useRef<WormholeObstacle[]>([]);
    const bluePortalRef = useRef<PortalObstacle | null>(null);
    const orangePortalRef = useRef<PortalObstacle | null>(null);
    
    const animationFrameId = useRef<number | null>(null);
    
    const [activeTool, setActiveTool] = useState<CloudMixerTool>('color');
    const [activeColor, setActiveColor] = useState<string>(COLORS[0]);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [drawingObstacle, setDrawingObstacle] = useState<Obstacle | null>(null);
    const startPointRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const appDocuments = getDocumentsByApp(APP_ID);

    const loadContent = useCallback((content: any) => {
        if (typeof content === 'object' && content !== null) {
            particlesRef.current = content.particles || [];
            obstaclesRef.current = content.obstacles || [];
            wormholesRef.current = content.wormholes || [];
            bluePortalRef.current = content.bluePortal || null;
            orangePortalRef.current = content.orangePortal || null;
            particleIdCounter = Math.max(...(content.particles?.map((p: Particle) => p.id) || [0])) + 1;
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

    const handleNew = useCallback(() => {
        particlesRef.current = [];
        obstaclesRef.current = [];
        wormholesRef.current = [];
        bluePortalRef.current = null;
        orangePortalRef.current = null;
        setActiveDocument(null);
    }, []);
    
    const getSaveContent = () => ({
        particles: particlesRef.current,
        obstacles: obstaclesRef.current,
        wormholes: wormholesRef.current,
        bluePortal: bluePortalRef.current,
        orangePortal: orangePortalRef.current,
    });

    const handleSave = useCallback(() => {
        const content = getSaveContent();
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, content);
        } else {
            setSaveAsName('Untitled Mix');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, updateDocument]);

    const handleSaveAs = useCallback(() => {
        setSaveAsName(activeDocument?.name || 'Untitled Mix');
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
        if (!isActive) return;
        const eventHandlers = {
            'cloudmixer:file:new': handleNew,
            'cloudmixer:file:open': handleOpen,
            'cloudmixer:file:save': handleSave,
            'cloudmixer:file:saveas': handleSaveAs,
            'cloudmixer:tool:color': () => setActiveTool('color'),
            'cloudmixer:tool:water': () => setActiveTool('water'),
            'cloudmixer:obstacle:circle': () => setActiveTool('obstacle_circle'),
            'cloudmixer:obstacle:line': () => setActiveTool('obstacle_line'),
            'cloudmixer:obstacle:box': () => setActiveTool('obstacle_box'),
            'cloudmixer:special:wormhole': () => setActiveTool('wormhole'),
            'cloudmixer:special:portal_blue': () => setActiveTool('portal_blue'),
            'cloudmixer:special:portal_orange': () => setActiveTool('portal_orange'),
        };

        const subscriptions: { event: string, handler: (data?: any) => void }[] = [];
        Object.entries(eventHandlers).forEach(([event, handler]) => {
            const wrappedHandler = (data: { instanceId?: string }) => {
                if (data?.instanceId === instanceId) handler();
            };
            subscriptions.push({ event, handler: wrappedHandler });
            globalEmitter.subscribe(event, wrappedHandler);
        });

        return () => subscriptions.forEach(({ event, handler }) => globalEmitter.unsubscribe(event, handler));
    }, [isActive, instanceId, handleNew, handleOpen, handleSave, handleSaveAs]);
    
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.fillStyle = 'rgba(26, 26, 46, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        for (let i = 0; i < particlesRef.current.length; i++) {
            const p = particlesRef.current[i];
            
            p.teleportCooldown = Math.max(0, p.teleportCooldown - 1);
            
            // Differentiated physics for cloud vs water
            if (p.type === 'cloud') {
                p.vy -= 0.005; // Gentle lift to make them floaty
                p.vx *= 0.99;  // Air friction
                p.vy *= 0.99;  // Air friction
            } else { // Water particles
                p.vy += GRAVITY;
            }
            
            p.x += p.vx;
            p.y += p.vy;

            const bounceFactor = p.type === 'cloud' ? -0.2 : -0.8;
            const collisionBounce = p.type === 'cloud' ? 0.2 : 0.8;

            if (p.x < p.radius || p.x > canvas.width - p.radius) p.vx *= bounceFactor;
            if (p.y < p.radius || p.y > canvas.height - p.radius) p.vy *= bounceFactor;

            // Obstacle collisions
            obstaclesRef.current.forEach(obs => {
                if (obs.type === 'circle') {
                    const dist = Math.hypot(p.x - obs.x, p.y - obs.y);
                    if (dist < p.radius + obs.radius) {
                        const nx = (p.x - obs.x) / dist;
                        const ny = (p.y - obs.y) / dist;
                        const dot = p.vx * nx + p.vy * ny;
                        p.vx -= 2 * dot * nx * collisionBounce;
                        p.vy -= 2 * dot * ny * collisionBounce;
                    }
                } else if (obs.type === 'line') {
                    lineCollision(p, obs, collisionBounce);
                } else if (obs.type === 'box') {
                    if (p.x > obs.x && p.x < obs.x + obs.width && p.y > obs.y && p.y < obs.y + obs.height) {
                         p.vx *= bounceFactor; p.vy *= bounceFactor;
                    }
                }
            });
            
            // Wormhole gravity
            wormholesRef.current.forEach(w => {
                const dist = Math.hypot(p.x - w.x, p.y - w.y);
                if (dist > 1) {
                    const force = w.strength / (dist * dist);
                    const angle = Math.atan2(w.y - p.y, w.x - p.x);
                    p.vx += Math.cos(angle) * force;
                    p.vy += Math.sin(angle) * force;
                }
            });
            
            // Portals
            if (p.teleportCooldown === 0) {
                if(bluePortalRef.current && orangePortalRef.current) {
                    if (Math.hypot(p.x - bluePortalRef.current.x, p.y - bluePortalRef.current.y) < p.radius + bluePortalRef.current.radius) {
                        p.x = orangePortalRef.current.x; p.y = orangePortalRef.current.y; p.teleportCooldown = 30;
                    } else if (Math.hypot(p.x - orangePortalRef.current.x, p.y - orangePortalRef.current.y) < p.radius + orangePortalRef.current.radius) {
                        p.x = bluePortalRef.current.x; p.y = bluePortalRef.current.y; p.teleportCooldown = 30;
                    }
                }
            }


            // Particle mixing
            for (let j = i + 1; j < particlesRef.current.length; j++) {
                const other = particlesRef.current[j];
                const dist = Math.hypot(p.x - other.x, p.y - other.y);
                if (dist < p.radius + other.radius) {
                    const pRgb = hexToRgb(p.color);
                    const otherRgb = hexToRgb(other.color);
                    if(pRgb && otherRgb) {
                        const mixedRgb = { r: (pRgb.r + otherRgb.r)/2, g: (pRgb.g + otherRgb.g)/2, b: (pRgb.b + otherRgb.b)/2 };
                        const mixedColor = rgbToHex(mixedRgb.r, mixedRgb.g, mixedRgb.b);
                        p.color = mixedColor;
                        other.color = mixedColor;
                    }
                }
            }
        }
        
        particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 50);

        // Drawing
        obstaclesRef.current.forEach(obs => {
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 2;
            if (obs.type === 'circle') {
                ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2); ctx.stroke();
            } else if (obs.type === 'line') {
                ctx.beginPath(); ctx.moveTo(obs.x1, obs.y1); ctx.lineTo(obs.x2, obs.y2); ctx.stroke();
            } else if (obs.type === 'box') {
                ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            }
        });
        
        wormholesRef.current.forEach(w => {
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2); ctx.fill();
        });
        
        [bluePortalRef.current, orangePortalRef.current].forEach(portal => {
            if(portal) {
                ctx.fillStyle = portal.portalType === 'blue' ? 'blue' : 'orange';
                ctx.beginPath(); ctx.arc(portal.x, portal.y, portal.radius, 0, Math.PI * 2); ctx.fill();
            }
        });

        particlesRef.current.forEach(p => {
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
             ctx.fillStyle = p.color;
             ctx.fill();
        });
        
        if (drawingObstacle) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            if (drawingObstacle.type === 'circle') {
                ctx.beginPath(); ctx.arc(drawingObstacle.x, drawingObstacle.y, drawingObstacle.radius, 0, Math.PI * 2); ctx.stroke();
            } else if (drawingObstacle.type === 'line') {
                ctx.beginPath(); ctx.moveTo(drawingObstacle.x1, drawingObstacle.y1); ctx.lineTo(drawingObstacle.x2, drawingObstacle.y2); ctx.stroke();
            } else if (drawingObstacle.type === 'box') {
                ctx.strokeRect(drawingObstacle.x, drawingObstacle.y, drawingObstacle.width, drawingObstacle.height);
            }
            ctx.setLineDash([]);
        }

        animationFrameId.current = requestAnimationFrame(animate);
    }, [drawingObstacle]);
    
    const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDrawing(true);
        const { x, y } = getCanvasCoords(e);
        startPointRef.current = { x, y };
        
        if (activeTool === 'color' || activeTool === 'water') {
            const count = e.shiftKey ? PARTICLE_BURST_COUNT : PARTICLE_STREAM_COUNT;
            for (let i = 0; i < count; i++) {
                particlesRef.current.push({
                    id: particleIdCounter++,
                    type: activeTool === 'color' ? 'cloud' : 'water',
                    x, y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    radius: PARTICLE_RADIUS,
                    color: activeTool === 'color' ? activeColor : WATER_COLOR,
                    teleportCooldown: 0
                });
            }
        } else if (activeTool.startsWith('obstacle')) {
             if (activeTool === 'obstacle_circle') setDrawingObstacle({ id: `obs-${Date.now()}`, type: 'circle', x, y, radius: 0 });
             if (activeTool === 'obstacle_line') setDrawingObstacle({ id: `obs-${Date.now()}`, type: 'line', x1:x, y1:y, x2:x, y2:y });
             if (activeTool === 'obstacle_box') setDrawingObstacle({ id: `obs-${Date.now()}`, type: 'box', x, y, width:0, height:0 });
        } else if (activeTool === 'wormhole') {
             wormholesRef.current.push({ id: `wh-${Date.now()}`, type: 'wormhole', x, y, radius: 10, strength: 100 });
        } else if (activeTool === 'portal_blue') {
             bluePortalRef.current = { id: `portal-b-${Date.now()}`, type: 'portal', portalType: 'blue', x, y, radius: 15 };
        } else if (activeTool === 'portal_orange') {
             orangePortalRef.current = { id: `portal-o-${Date.now()}`, type: 'portal', portalType: 'orange', x, y, radius: 15 };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const { x, y } = getCanvasCoords(e);
        if (activeTool === 'color' || activeTool === 'water') {
            handleMouseDown(e); // Stream particles
        } else if (drawingObstacle) {
            if (drawingObstacle.type === 'circle') {
                setDrawingObstacle({ ...drawingObstacle, radius: Math.hypot(x - startPointRef.current.x, y - startPointRef.current.y) });
            } else if (drawingObstacle.type === 'line') {
                setDrawingObstacle({ ...drawingObstacle, x2: x, y2: y });
            } else if (drawingObstacle.type === 'box') {
                setDrawingObstacle({
                    ...drawingObstacle,
                    x: Math.min(x, startPointRef.current.x),
                    y: Math.min(y, startPointRef.current.y),
                    width: Math.abs(x - startPointRef.current.x),
                    height: Math.abs(y - startPointRef.current.y)
                });
            }
        }
    };
    
    const handleMouseUp = () => {
        setIsDrawing(false);
        if (drawingObstacle) {
            obstaclesRef.current.push(drawingObstacle);
            setDrawingObstacle(null);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const parent = canvas.parentElement;
            canvas.width = parent?.clientWidth || 600;
            canvas.height = parent?.clientHeight || 500;
        }
        animationFrameId.current = requestAnimationFrame(animate);
        return () => { if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current) };
    }, [animate]);

    return (
        <div className="w-full h-full flex flex-row bg-gray-900">
            <div className="flex flex-col p-2 bg-gray-800 space-y-2 w-48 text-white">
                <h3 className="font-bold text-center">Tools</h3>
                <button onClick={() => setActiveTool('color')} className={`p-1 border ${activeTool === 'color' ? 'bg-blue-500' : 'bg-gray-700'}`}>Color Cloud</button>
                <div className="flex flex-wrap gap-1">
                    {COLORS.map(c => <button key={c} style={{backgroundColor: c}} className={`w-6 h-6 border-2 ${activeColor === c ? 'border-white' : 'border-transparent'}`} onClick={() => setActiveColor(c)} />)}
                </div>
                <button onClick={() => setActiveTool('water')} className={`p-1 border ${activeTool === 'water' ? 'bg-blue-500' : 'bg-gray-700'}`}>Water</button>
                <h3 className="font-bold text-center pt-2">Obstacles</h3>
                <button onClick={() => setActiveTool('obstacle_circle')} className={`p-1 border ${activeTool === 'obstacle_circle' ? 'bg-blue-500' : 'bg-gray-700'}`}>Circle</button>
                <button onClick={() => setActiveTool('obstacle_line')} className={`p-1 border ${activeTool === 'obstacle_line' ? 'bg-blue-500' : 'bg-gray-700'}`}>Line</button>
                <button onClick={() => setActiveTool('obstacle_box')} className={`p-1 border ${activeTool === 'obstacle_box' ? 'bg-blue-500' : 'bg-gray-700'}`}>Box</button>
                 <h3 className="font-bold text-center pt-2">Special</h3>
                <button onClick={() => setActiveTool('wormhole')} className={`p-1 border ${activeTool === 'wormhole' ? 'bg-blue-500' : 'bg-gray-700'}`}>Wormhole</button>
                <button onClick={() => setActiveTool('portal_blue')} className={`p-1 border ${activeTool === 'portal_blue' ? 'bg-blue-500' : 'bg-gray-700'}`}>Blue Portal</button>
                <button onClick={() => setActiveTool('portal_orange')} className={`p-1 border ${activeTool === 'portal_orange' ? 'bg-blue-500' : 'bg-gray-700'}`}>Orange Portal</button>
                <div className="flex-grow"></div>
                <button onClick={() => (particlesRef.current = [])} className="p-1 border bg-red-800">Clear All</button>
            </div>
            <div className="flex-grow relative">
                <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="cursor-crosshair"/>
                 {isSaveAsModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow text-black">
                        <h3 className="font-bold mb-2">Save Mix As:</h3>
                        <input type="text" value={saveAsName} onChange={e => setSaveAsName((e.target as HTMLInputElement).value)} onKeyPress={e => e.key === 'Enter' && confirmSaveAs()} className="w-full p-1 border-2 border-black bg-white focus:outline-none" autoFocus/>
                        <div className="flex justify-end mt-4 space-x-2">
                            <button onClick={() => setIsSaveAsModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                            <button onClick={confirmSaveAs} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 font-bold">Save</button>
                        </div>
                    </div>
                 </div>
                )}
                {isOpenFileModalOpen && (
                     <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                        <div className="bg-white p-4 border-2 border-black window-shadow w-96 text-black">
                            <h3 className="font-bold mb-2">Open Mix:</h3>
                            <ul className="h-48 overflow-y-auto border-2 border-black bg-white p-1">
                               {appDocuments.length > 0 ? appDocuments.map(doc => (
                                   <li key={doc.id}><button onClick={() => confirmOpen(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">{doc.name}</button></li>
                               )) : <li className="p-2 text-center text-gray-500">No mixes found.</li>}
                            </ul>
                            <div className="flex justify-end mt-4">
                                <button onClick={() => setIsOpenFileModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                            </div>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};