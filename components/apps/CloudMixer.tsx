
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { globalEmitter } from '../../events';
import type { Particle, Obstacle, CloudMixerTool, AppDocument, CloudMixerElement } from '../../types';
import { useDocuments } from '../../DocumentContext';
import { useFileSystem } from '../../FileSystemContext';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  documentIdToOpen?: string;
}

const APP_ID = 'cloud-mixer';
const MAX_PARTICLES = 2000; // Lowered for 60fps stability
const PARTICLE_RADIUS = 5.5; 
const FRICTION = 0.985; 
const BASE_TURBULENCE = 0.35; 
const MIX_RATE = 0.15; 
const BOUNCE_ELASTICITY = 0.55; 

interface CloudProfile {
    color: string;
    r: number; g: number; b: number; // Pre-calculated numeric colors
    buoyancy: number; 
    altitude: number; 
    energy: number;   
    name: string;
}

const CLOUDS: Record<CloudMixerElement, CloudProfile> = {
    white: { color: '#ffffff', r: 255, g: 255, b: 255, buoyancy: 0.12, altitude: 0.3, energy: 0.4, name: 'Cirrus' },
    blue: { color: '#88e1ff', r: 136, g: 225, b: 255, buoyancy: 0.08, altitude: 0.5, energy: 0.3, name: 'Stratus' },
    storm: { color: '#4a4a5a', r: 74, g: 74, b: 90, buoyancy: -0.08, altitude: 0.9, energy: 0.8, name: 'Nimbus' },
    sunset: { color: '#ff77aa', r: 255, g: 119, b: 170, buoyancy: 0.2, altitude: 0.4, energy: 0.5, name: 'Sunset' },
    aurora: { color: '#55ff99', r: 85, g: 255, b: 153, buoyancy: 0.3, altitude: 0.1, energy: 1.0, name: 'Aurora' },
    gold: { color: '#ffcc33', r: 255, g: 204, b: 51, buoyancy: 0.1, altitude: 0.6, energy: 0.4, name: 'Amber' }
};

export const CloudMixer: React.FC<AppProps> = ({ isActive, instanceId, documentIdToOpen }) => {
    const { getDocument, createDocument, updateDocument } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameId = useRef<number | null>(null);

    const [activeTool, setActiveTool] = useState<CloudMixerTool>('white');
    const [brushSize, setBrushSize] = useState(60);
    const [movementEnergy, setMovementEnergy] = useState(20); // Lowered initial for smoothness
    const [isDrawing, setIsDrawing] = useState(false);
    
    const energyRef = useRef(movementEnergy);
    useEffect(() => { energyRef.current = movementEnergy; }, [movementEnergy]);

    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');

    const loadContent = useCallback((content: any) => {
        if (content && content.particles) {
            particlesRef.current = content.particles;
        }
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

    const handleSave = useCallback(() => {
        const content = { particles: particlesRef.current };
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, content);
        } else {
            setSaveAsName('Atmospheric Snapshot');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, updateDocument]);

    const confirmSaveAs = useCallback(() => {
        if (!saveAsName.trim()) return;
        const content = { particles: particlesRef.current };
        const newDoc = createDocument(saveAsName, content, APP_ID);
        const docsFolder = findNodeByPath('/Documents');
        if (docsFolder) createFile(saveAsName, docsFolder.id, 'document', APP_ID, newDoc.id);
        setActiveDocument(newDoc);
        setIsSaveAsModalOpen(false);
    }, [saveAsName, createDocument, findNodeByPath, createFile]);

    useEffect(() => {
        if (!isActive) return;
        const eventHandlers = {
            'cloudmixer:file:new': () => { particlesRef.current = []; setActiveDocument(null); },
            'cloudmixer:file:save': handleSave,
            'cloudmixer:file:saveas': () => setIsSaveAsModalOpen(true),
        };
        const subs = Object.entries(eventHandlers).map(([evt, h]) => {
            const wrapper = (d: any) => { if (d.instanceId === instanceId) h(); };
            globalEmitter.subscribe(evt, wrapper);
            return { evt, wrapper };
        });
        return () => subs.forEach(s => globalEmitter.unsubscribe(s.evt, s.wrapper));
    }, [isActive, instanceId, handleSave]);

    const spawnParticle = (x: number, y: number, type: CloudMixerElement) => {
        if (particlesRef.current.length >= MAX_PARTICLES) return;
        const p = CLOUDS[type];
        const spawnPower = (energyRef.current / 100) * 1.5; 
        particlesRef.current.push({
            id: Math.random(),
            type,
            x: x + (Math.random() - 0.5) * brushSize * 0.6,
            y: y + (Math.random() - 0.5) * brushSize * 0.6,
            vx: (Math.random() - 0.5) * p.energy * spawnPower,
            vy: (Math.random() - 0.5) * p.energy * spawnPower,
            radius: PARTICLE_RADIUS + (Math.random() * 3),
            r: p.r, g: p.g, b: p.b,
            life: 1.0,
            buoyancy: p.buoyancy,
            targetAltitude: p.altitude
        });
    };

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Clear with slight trail
        ctx.fillStyle = 'rgba(4, 4, 12, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const particles = particlesRef.current;
        const cellSize = 35; // Larger cells for less collision checks
        const grid: Map<number, Particle[]> = new Map();
        
        const currentTurbulence = (energyRef.current / 100) * BASE_TURBULENCE;
        const gridCols = Math.ceil(canvas.width / cellSize);

        // Build Grid
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const gx = (p.x / cellSize) | 0;
            const gy = (p.y / cellSize) | 0;
            const key = gy * gridCols + gx;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key)!.push(p);
        }

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const targetY = p.targetAltitude * canvas.height;
            const altitudeDiff = targetY - p.y;
            
            p.vy += (altitudeDiff * 0.0004 + (p.buoyancy * -0.1)) * (energyRef.current / 80 + 0.1);
            p.vx += (Math.random() - 0.5) * currentTurbulence;
            p.vy += (Math.random() - 0.5) * currentTurbulence;

            p.vx *= FRICTION;
            p.vy *= FRICTION;
            p.x += p.vx;
            p.y += p.vy;

            // Bounce
            if (p.x < p.radius) { p.x = p.radius; p.vx *= -BOUNCE_ELASTICITY; }
            if (p.x > canvas.width - p.radius) { p.x = canvas.width - p.radius; p.vx *= -BOUNCE_ELASTICITY; }
            if (p.y < p.radius) { p.y = p.radius; p.vy *= -BOUNCE_ELASTICITY; }
            if (p.y > canvas.height - p.radius) { p.y = canvas.height - p.radius; p.vy *= -BOUNCE_ELASTICITY; }

            // Collisions
            const gx = (p.x / cellSize) | 0;
            const gy = (p.y / cellSize) | 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const neighbors = grid.get((gy + dy) * gridCols + (gx + dx));
                    if (!neighbors) continue;
                    for (let j = 0; j < neighbors.length; j++) {
                        const other = neighbors[j];
                        if (p === other) continue;
                        const dx = p.x - other.x;
                        const dy = p.y - other.y;
                        const distSq = dx*dx + dy*dy;
                        const minDist = p.radius + other.radius;
                        if (distSq < minDist * minDist) {
                            const dist = Math.sqrt(distSq) || 0.1;
                            const nx = dx / dist;
                            const ny = dy / dist;
                            const overlap = (minDist - dist) * 0.15;
                            p.x += nx * overlap; p.y += ny * overlap;
                            other.x -= nx * overlap; other.y -= ny * overlap;

                            // Color Mixing (Numeric only - no strings!)
                            const mix = MIX_RATE * 0.05;
                            p.r += (other.r - p.r) * mix;
                            p.g += (other.g - p.g) * mix;
                            p.b += (other.b - p.b) * mix;
                            other.r += (p.r - other.r) * mix;
                            other.g += (p.g - other.g) * mix;
                            other.b += (p.b - other.b) * mix;
                        }
                    }
                }
            }

            // Simple render (no shadowBlur)
            ctx.fillStyle = `rgb(${p.r | 0}, ${p.g | 0}, ${p.b | 0})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, 6.28);
            ctx.fill();
        }

        animationFrameId.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.parentElement?.clientWidth || 800;
            canvas.height = canvas.parentElement?.clientHeight || 600;
        }
        animationFrameId.current = requestAnimationFrame(animate);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [animate]);

    const handleCanvasAction = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const brushForce = (energyRef.current / 100) * 6.0 + 0.5;

        particlesRef.current.forEach(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const limit = brushSize * 2.2;
            if (dist < limit) {
                const angle = Math.atan2(dy, dx);
                const power = (1 - dist / limit) * brushForce;
                if (activeTool === 'mixer' || activeTool === 'vortex') {
                    p.vx += Math.cos(angle + 1.57) * power * 2;
                    p.vy += Math.sin(angle + 1.57) * power * 2;
                    p.vx -= Math.cos(angle) * power * 0.2;
                    p.vy -= Math.sin(angle) * power * 0.2;
                } else {
                    p.vx += Math.cos(angle) * power;
                    p.vy += Math.sin(angle) * power;
                }
            }
        });

        if (activeTool === 'eraser') {
            particlesRef.current = particlesRef.current.filter(p => Math.hypot(p.x - x, p.y - y) > brushSize);
        } else if (activeTool !== 'mixer' && activeTool !== 'vortex') {
            for (let i = 0; i < 4; i++) spawnParticle(x, y, activeTool as CloudMixerElement);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#05050a] overflow-hidden font-mono text-white select-none">
            <div className="flex-shrink-0 bg-[#0c0c1a] border-b border-white/10 px-6 py-3 flex justify-between items-center shadow-2xl">
                <div className="flex items-center space-x-8">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em]">Atmospheric Mixer</span>
                        <span className="text-[9px] text-white/30 tracking-tight">{particlesRef.current.length} / {MAX_PARTICLES} ACTIVE VOXELS</span>
                    </div>
                    <div className="h-8 w-px bg-white/5"></div>
                    <div className="flex items-center space-x-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold uppercase text-white/20 mb-1">Scale</span>
                            <input type="range" min="30" max="200" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-24 h-1 bg-white/5 appearance-none accent-blue-600 rounded-full" />
                        </div>
                        <div className="flex flex-col ml-4">
                            <span className="text-[8px] font-bold uppercase text-white/20 mb-1">Energy</span>
                            <input type="range" min="0" max="100" value={movementEnergy} onChange={e => setMovementEnergy(parseInt(e.target.value))} className="w-24 h-1 bg-white/5 appearance-none accent-green-600 rounded-full" />
                        </div>
                        <span className="text-[11px] font-mono w-8 text-green-400">{movementEnergy}%</span>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => { particlesRef.current = []; }} className="text-[9px] font-bold px-4 py-1.5 bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-500/20 rounded uppercase tracking-widest transition-colors">Vent</button>
                    <button onClick={handleSave} className="text-[9px] font-bold px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/20 rounded uppercase tracking-widest transition-colors">Archive</button>
                </div>
            </div>

            <div className="flex-grow flex relative overflow-hidden">
                <div className="w-20 bg-[#0c0c1a] border-r border-white/5 flex flex-col items-center py-6 space-y-4 z-20 shadow-2xl overflow-y-auto custom-scrollbar">
                    {(Object.keys(CLOUDS) as CloudMixerElement[]).map(el => (
                        <button key={el} onClick={() => setActiveTool(el)} className={`w-12 h-12 rounded-full border-2 transition-all flex flex-col items-center justify-center group relative ${activeTool === el ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.15)]' : 'border-white/5 hover:border-white/20'}`} style={{ backgroundColor: CLOUDS[el].color + '22' }}>
                            <div className="w-6 h-4 bg-white/80 rounded-[40%_40%_30%_30%] relative" style={{ backgroundColor: CLOUDS[el].color }}>
                                <div className="absolute -top-1.5 -left-1 w-4 h-4 rounded-full bg-inherit"></div>
                                <div className="absolute -top-2 left-2 w-5 h-5 rounded-full bg-inherit"></div>
                            </div>
                        </button>
                    ))}
                    <div className="h-px w-8 bg-white/5 my-2"></div>
                    <button onClick={() => setActiveTool('vortex')} className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-all ${activeTool === 'vortex' ? 'border-indigo-400 bg-indigo-900/20 shadow-lg' : 'border-white/5'}`}>🌀</button>
                    <button onClick={() => setActiveTool('eraser')} className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center transition-all ${activeTool === 'eraser' ? 'border-red-400 bg-red-900/20 shadow-lg' : 'border-white/5'}`}>🧹</button>
                </div>

                <div className="flex-grow relative bg-black cursor-crosshair">
                    <canvas ref={canvasRef} onMouseDown={() => setIsDrawing(true)} onMouseUp={() => setIsDrawing(false)} onMouseMove={(e) => isDrawing && handleCanvasAction(e)} onMouseDownCapture={(e) => handleCanvasAction(e)} className="block w-full h-full" />
                </div>
            </div>

            {isSaveAsModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] backdrop-blur-md p-4">
                    <div className="bg-[#11111a] border border-white/10 p-8 w-full max-w-xs shadow-2xl rounded-2xl text-center">
                        <h3 className="text-[10px] font-black mb-6 uppercase tracking-[0.4em] text-blue-400">Save Composition</h3>
                        <input value={saveAsName} onChange={e => setSaveAsName(e.target.value)} className="w-full bg-black/50 border border-white/5 p-3 mb-6 outline-none focus:border-blue-500 text-xs font-mono text-center rounded-lg" placeholder="Name..." autoFocus />
                        <div className="flex flex-col space-y-3">
                            <button onClick={confirmSaveAs} className="w-full py-3 bg-blue-600 font-bold text-[10px] uppercase rounded-lg">Save</button>
                            <button onClick={() => setIsSaveAsModalOpen(false)} className="w-full py-2 text-[9px] font-bold uppercase text-white/30">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
                input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; background: #fff; cursor: pointer; border-radius: 50%; border: 1px solid #000; }
            `}</style>
        </div>
    );
};
