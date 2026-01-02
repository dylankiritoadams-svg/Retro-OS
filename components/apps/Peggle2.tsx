
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Peg, Ball, Bucket } from '../../types';

// --- Extended Types ---
interface Portal { id: string; x1: number; y1: number; x2: number; y2: number; radius: number; }
interface Barrier { id: string; x: number; y: number; w: number; h: number; vx: number; vy: number; isMoving: boolean; }
interface GravityWell { x: number; y: number; radius: number; strength: number; }

// Logic Constants
const GAME_WIDTH = 100;
const GAME_HEIGHT = 140;
const ASPECT_RATIO = GAME_WIDTH / GAME_HEIGHT;

const GRAVITY = 0.042;
const PEG_RADIUS = 1.9;
const BALL_RADIUS = 1.7; 
const CANNON_Y = 6;
const INITIAL_BALLS = 10;
const BALL_SPEED = 2.4;
const BUCKET_SPEED = 0.75;
const BUCKET_WIDTH = 20;
const BUCKET_HEIGHT = 6;
const BOUNCE_FACTOR = 0.88;

const FEVER_COLORS = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];

type HeroId = 'BJORN' | 'CLYDE' | 'KATUT';
interface HeroDef { id: HeroId; name: string; power: string; color: string; ability: string; }

const HEROES: HeroDef[] = [
    { id: 'BJORN', name: 'BJORN', power: 'SUPER GUIDE', color: '#ffcc00', ability: 'Enhanced trajectory' },
    { id: 'CLYDE', name: 'SONIC BOOM', power: 'EXPLOSION', color: '#ff3300', ability: 'Pegs explode on hit' },
    { id: 'KATUT', name: 'MULTIBALL', power: 'GHOSTS', color: '#33ccff', ability: 'Spawns extra balls' },
];

const ANIMALS = ['A disco capybara with sunglasses', 'A cat wearing a wizard hat riding a taco', 'A buff hamster weightlifting a slice of cheese', 'A fancy pigeon with a monocle in a library', 'A corgi floating in space with a bubble tea'];
const SETTINGS = ['a candy-coated volcanic landscape', 'a vaporwave digital grid world', 'a renaissance painting but with pixels', 'an underwater arcade from the 80s', 'a galactic casino at the end of time'];

// --- Audio System ---
const playTone = (freq: number, type: OscillatorType = 'sine', duration = 0.1, volume = 0.08) => {
    try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
};

export const Peggle2: React.FC<{ instanceId: string }> = ({ instanceId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);

    const [status, setStatus] = useState<'menu' | 'level-select' | 'hero-select' | 'playing' | 'fever' | 'cleared' | 'game-over'>('menu');
    const [hero, setHero] = useState<HeroDef>(HEROES[0]);
    const [level, setLevel] = useState(0);
    const [score, setScore] = useState(0);
    const [ballsLeft, setBallsLeft] = useState(INITIAL_BALLS);
    const [canvasSize, setCanvasSize] = useState({ w: 400, h: 560 });
    const [isGeneratingBg, setIsGeneratingBg] = useState(false);
    const [useAiBg, setUseAiBg] = useState(false);
    const [showPrediction, setShowPrediction] = useState(false);

    const pegs = useRef<Peg[]>([]);
    const balls = useRef<(Ball & { teleportCooldown: number })[]>([]);
    const portals = useRef<Portal[]>([]);
    const barriers = useRef<Barrier[]>([]);
    const gravityWells = useRef<GravityWell[]>([]);
    const bucket = useRef<Bucket>({ x: 40, y: GAME_HEIGHT - 10, width: BUCKET_WIDTH, height: BUCKET_HEIGHT, vx: BUCKET_SPEED });
    const aimAngle = useRef(Math.PI / 2);
    const comboCount = useRef(0);
    const totalOrangeCount = useRef(0);

    const generateAIBackground = useCallback(async (lvl: number) => {
        if (!useAiBg) {
            bgImageRef.current = null;
            return;
        }
        setIsGeneratingBg(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const animal = ANIMALS[lvl % ANIMALS.length];
            const setting = SETTINGS[lvl % SETTINGS.length];
            const prompt = `Funny digital art of ${animal} in ${setting}. Flat game background style, 4K, no text.`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{ text: prompt }] },
                config: { imageConfig: { aspectRatio: "3:4" } }
            });
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) { 
                    const img = new Image();
                    img.src = `data:image/png;base64,${part.inlineData.data}`;
                    img.onload = () => { bgImageRef.current = img; };
                    break; 
                }
            }
        } catch (e) { console.error(e); }
        finally { setIsGeneratingBg(false); }
    }, [useAiBg]);

    const layoutLevel = useCallback((lvl: number) => {
        pegs.current = []; portals.current = []; barriers.current = []; gravityWells.current = [];
        const addPeg = (x: number, y: number, type: Peg['type'] = 'blue') => {
            if (pegs.current.some(p => Math.hypot(p.x - x, p.y - y) < PEG_RADIUS * 1.6)) return;
            pegs.current.push({ id: Math.random(), x, y, radius: PEG_RADIUS, type, hit: false, score: type === 'orange' ? 100 : 25 });
        };

        const drawCirclePattern = (cx: number, cy: number, r: number, count: number, isOrange = false) => {
            for(let i=0; i<count; i++) {
                const a = (i/count) * Math.PI * 2;
                addPeg(cx + Math.cos(a)*r, cy + Math.sin(a)*r, isOrange ? 'orange' : 'blue');
            }
        };

        switch(lvl % 10) {
            case 0: // The Classic Arch
                for(let i=0; i<12; i++) {
                    const x = 15 + i * 7;
                    const y = 50 + Math.sin(i * 0.4) * 20;
                    addPeg(x, y, i % 3 === 0 ? 'orange' : 'blue');
                }
                drawCirclePattern(50, 90, 20, 10, true);
                break;
            case 1: // Portal Pillars
                portals.current.push({ id: 'p1', x1: 15, y1: 100, x2: 85, y2: 100, radius: 4 });
                for(let x=25; x<=75; x+=12) {
                    for(let y=40; y<=90; y+=15) addPeg(x, y, (x+y)%24===0 ? 'orange' : 'blue');
                }
                barriers.current.push({ id: 'b1', x: 45, y: 65, w: 10, h: 2, vx: 0, vy: 0, isMoving: false });
                break;
            case 2: // The X with Shifting Walls
                barriers.current.push({ id: 'b2', x: 25, y: 55, w: 8, h: 2, vx: 0.6, vy: 0, isMoving: true });
                barriers.current.push({ id: 'b3', x: 68, y: 85, w: 8, h: 2, vx: -0.6, vy: 0, isMoving: true });
                for(let i=0; i<20; i++) {
                    addPeg(20 + i*3, 40 + i*4, i%4===0 ? 'orange' : 'blue');
                    addPeg(80 - i*3, 40 + i*4, i%4===1 ? 'orange' : 'blue');
                }
                break;
            case 3: // Gravity Well Vortex
                gravityWells.current.push({ x: 50, y: 75, radius: 25, strength: 0.1 });
                for(let i=0; i<30; i++) {
                    const r = 8 + i * 1.2;
                    const a = i * 0.8;
                    addPeg(50 + Math.cos(a)*r, 75 + Math.sin(a)*r, i%5===0 ? 'orange' : 'blue');
                }
                break;
            case 4: // Twin Cascades
                portals.current.push({ id: 'p2', x1: 10, y1: 40, x2: 10, y2: 110, radius: 3 });
                portals.current.push({ id: 'p3', x1: 90, y1: 40, x2: 90, y2: 110, radius: 3 });
                for(let y=40; y<120; y+=12) {
                    addPeg(35, y, y%24===0 ? 'orange' : 'blue');
                    addPeg(50, y+6, y%24===12 ? 'orange' : 'blue');
                    addPeg(65, y, y%24===0 ? 'orange' : 'blue');
                }
                break;
            case 5: // The Diamond Maze
                const center = {x: 50, y: 75};
                for(let r=10; r<40; r+=10) {
                    const count = r / 2;
                    drawCirclePattern(center.x, center.y, r, count, r % 20 === 0);
                }
                barriers.current.push({ id: 'b4', x: 44, y: 35, w: 12, h: 2, vx: 0, vy: 0, isMoving: false });
                break;
            case 6: // Slalom
                for(let i=0; i<8; i++) {
                    const side = i % 2 === 0 ? 30 : 70;
                    const y = 35 + i * 14;
                    addPeg(side, y, 'orange');
                    addPeg(side + (i%2===0?10:-10), y, 'blue');
                }
                break;
            case 7: // Interlocking Rings
                drawCirclePattern(35, 60, 15, 8, true);
                drawCirclePattern(65, 60, 15, 8, true);
                drawCirclePattern(50, 95, 15, 8, false);
                break;
            case 8: // Asteroid Belt
                for(let i=0; i<35; i++) {
                    addPeg(10 + Math.random()*80, 30 + Math.random()*90, Math.random() < 0.3 ? 'orange' : 'blue');
                }
                barriers.current.push({ id: 'm1', x: 10, y: 70, w: 5, h: 5, vx: 0.8, vy: 0, isMoving: true });
                barriers.current.push({ id: 'm2', x: 85, y: 50, w: 5, h: 5, vx: -0.8, vy: 0, isMoving: true });
                break;
            case 9: // The Funnel
                for(let i=0; i<10; i++) {
                    addPeg(10 + i*4, 30 + i*8, 'orange');
                    addPeg(90 - i*4, 30 + i*8, 'orange');
                }
                drawCirclePattern(50, 110, 12, 6, false);
                gravityWells.current.push({ x: 50, y: 110, radius: 20, strength: -0.05 }); 
                break;
        }

        if(!pegs.current.some(p => p.type === 'green')) addPeg(50, 35, 'green');
        totalOrangeCount.current = pegs.current.filter(p => p.type === 'orange').length;
    }, []);

    const nextLevel = useCallback(() => {
        const nextLvl = (level + 1) % 10;
        setLevel(nextLvl); setScore(s => s + ballsLeft * 1000); setBallsLeft(INITIAL_BALLS);
        layoutLevel(nextLvl); generateAIBackground(nextLvl); setStatus('playing');
        playTone(523, 'triangle', 0.5, 0.1); 
    }, [level, ballsLeft, layoutLevel, generateAIBackground]);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const headerH = 48; 
                const safeMargin = 24;
                const availH = clientHeight - headerH - safeMargin;
                const availW = clientWidth - safeMargin;
                let w = availW;
                let h = w / ASPECT_RATIO;
                if (h > availH) { h = availH; w = h * ASPECT_RATIO; }
                setCanvasSize({ w, h });
            }
        };
        const observer = new ResizeObserver(updateSize);
        if (containerRef.current) observer.observe(containerRef.current);
        updateSize();
        return () => observer.disconnect();
    }, []);

    const animate = useCallback(() => {
        const gameCtx = gameCanvasRef.current?.getContext('2d');
        if (!gameCtx) return;

        // Clear and Draw BG
        gameCtx.fillStyle = '#000';
        gameCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        if (useAiBg && bgImageRef.current) {
            gameCtx.globalAlpha = status === 'fever' ? 0.3 : 0.6;
            gameCtx.drawImage(bgImageRef.current, 0, 0, GAME_WIDTH, GAME_HEIGHT);
            gameCtx.globalAlpha = 1;
        } else {
            const hue = (level * 36) % 360;
            gameCtx.fillStyle = `hsl(${hue}, 40%, 12%)`;
            gameCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            gameCtx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.1)`;
            gameCtx.lineWidth = 0.5;
            for(let i=0; i<GAME_WIDTH; i+=10) {
                gameCtx.beginPath(); gameCtx.moveTo(i, 0); gameCtx.lineTo(i, GAME_HEIGHT); gameCtx.stroke();
            }
        }

        // Mechanics
        barriers.current.forEach(b => {
            if (b.isMoving) { b.x += b.vx; if (b.x < 2 || b.x + b.w > 98) b.vx *= -1; }
            gameCtx.fillStyle = '#555'; gameCtx.fillRect(b.x, b.y, b.w, b.h);
            gameCtx.strokeStyle = '#fff'; gameCtx.lineWidth = 0.5; gameCtx.strokeRect(b.x, b.y, b.w, b.h);
        });

        portals.current.forEach(p => {
            gameCtx.lineWidth = 1;
            gameCtx.strokeStyle = '#0ff'; gameCtx.beginPath(); gameCtx.arc(p.x1, p.y1, p.radius, 0, Math.PI*2); gameCtx.stroke();
            gameCtx.strokeStyle = '#f0f'; gameCtx.beginPath(); gameCtx.arc(p.x2, p.y2, p.radius, 0, Math.PI*2); gameCtx.stroke();
        });

        // Bucket
        bucket.current.x += bucket.current.vx;
        if (bucket.current.x < 0 || bucket.current.x + bucket.current.width > GAME_WIDTH) bucket.current.vx *= -1;
        gameCtx.fillStyle = '#222';
        gameCtx.fillRect(bucket.current.x, bucket.current.y, bucket.current.width, bucket.current.height);
        gameCtx.strokeStyle = '#fff'; gameCtx.lineWidth = 0.5; gameCtx.strokeRect(bucket.current.x, bucket.current.y, bucket.current.width, bucket.current.height);

        // Prediction: Fixed, Bounces off ALL active pegs
        /* Fix: Corrected comparison with 'ready' which is not in the union type. */
        if (showPrediction && (status === 'playing') && balls.current.length === 0) {
            let tx = GAME_WIDTH / 2, ty = CANNON_Y, tvx = Math.cos(aimAngle.current) * BALL_SPEED, tvy = Math.sin(aimAngle.current) * BALL_SPEED;
            let bounces = 0;
            const maxBounces = hero.id === 'BJORN' ? 3 : 2;
            const maxSteps = 160; 
            
            gameCtx.beginPath();
            gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            gameCtx.setLineDash([1, 1]);
            gameCtx.moveTo(tx, ty);
            
            for (let i = 0; i < maxSteps; i++) {
                tvy += GRAVITY; tx += tvx; ty += tvy;
                
                // Wall Collision
                if (tx < BALL_RADIUS || tx > GAME_WIDTH - BALL_RADIUS) {
                    tvx *= -BOUNCE_FACTOR;
                    tx = tx < BALL_RADIUS ? BALL_RADIUS : GAME_WIDTH - BALL_RADIUS;
                    bounces++;
                }

                // Peg Collision
                for (const p of pegs.current) {
                    const dist = Math.hypot(tx-p.x, ty-p.y);
                    if (dist < BALL_RADIUS + p.radius) {
                        const nx = (tx-p.x)/dist; const ny = (ty-p.y)/dist;
                        const dot = tvx*nx + tvy*ny;
                        tvx = (tvx - 2 * dot * nx) * BOUNCE_FACTOR;
                        tvy = (tvy - 2 * dot * ny) * BOUNCE_FACTOR;
                        // Nudge simulate ball out of collision zone to prevent sticking
                        tx = p.x + nx * (BALL_RADIUS + p.radius + 0.1);
                        ty = p.y + ny * (BALL_RADIUS + p.radius + 0.1);
                        bounces++; break;
                    }
                }
                
                if (i % 5 === 0) gameCtx.lineTo(tx, ty);
                if (ty > GAME_HEIGHT || bounces >= maxBounces) break;
            }
            gameCtx.stroke();
            gameCtx.setLineDash([]);
        }

        // Physics
        balls.current = balls.current.filter(b => {
            b.vy += GRAVITY; 
            b.teleportCooldown = Math.max(0, b.teleportCooldown - 1);
            gravityWells.current.forEach(w => {
                const dist = Math.hypot(b.x-w.x, b.y-w.y);
                if (dist < w.radius) {
                    const angle = Math.atan2(w.y-b.y, w.x-b.x);
                    b.vx += Math.cos(angle) * w.strength; b.vy += Math.sin(angle) * w.strength;
                }
            });
            b.x += b.vx; b.y += b.vy;
            if (b.x < b.radius || b.x > GAME_WIDTH - b.radius) { b.vx *= -BOUNCE_FACTOR; b.x = b.x < b.radius ? b.radius : GAME_WIDTH - b.radius; }
            if (b.y < b.radius) { b.vy *= -BOUNCE_FACTOR; b.y = b.radius; }

            if (b.teleportCooldown === 0) {
                portals.current.forEach(p => {
                    if (Math.hypot(b.x-p.x1, b.y-p.y1) < b.radius+p.radius) { 
                        b.x = p.x2; b.y = p.y2; b.teleportCooldown = 20; playTone(800); 
                    } else if (Math.hypot(b.x-p.x2, b.y-p.y2) < b.radius+p.radius) { 
                        b.x = p.x1; b.y = p.y1; b.teleportCooldown = 20; playTone(800); 
                    }
                });
            }

            barriers.current.forEach(bar => {
                if (b.x > bar.x && b.x < bar.x + bar.w && b.y > bar.y && b.y < bar.y + bar.h) {
                    b.vy *= -BOUNCE_FACTOR;
                    b.x = b.x < bar.x + bar.w/2 ? bar.x - b.radius : bar.x + bar.w + b.radius;
                    playTone(150, 'square');
                }
            });

            pegs.current.forEach(p => {
                if (!p.hit && Math.hypot(b.x-p.x, b.y-p.y) < b.radius+p.radius) {
                    p.hit = true; comboCount.current++; setScore(s => s + p.score * comboCount.current);
                    playTone(200 + (Math.min(comboCount.current, 15)*60), 'triangle');
                    if (p.type === 'orange') { totalOrangeCount.current--; if (totalOrangeCount.current === 0) setStatus('fever'); }
                    else if (p.type === 'green') {
                        if (hero.id === 'CLYDE') { 
                            pegs.current.forEach(p2 => { if(!p2.hit && Math.hypot(p2.x-p.x, p2.y-p.y) < 22) { 
                                p2.hit = true; if(p2.type === 'orange') totalOrangeCount.current--; setScore(s => s + 100); 
                            }}); 
                        } else if (hero.id === 'KATUT') { 
                            balls.current.push({ id: `e-${Date.now()}`, x: p.x, y: p.y, vx: 2, vy: -2, radius: BALL_RADIUS, isGhost: true, teleportCooldown: 0 }); 
                        }
                    }
                    const dist = Math.hypot(b.x-p.x, b.y-p.y);
                    const nx = (b.x-p.x)/dist; const ny = (b.y-p.y)/dist;
                    const dot = b.vx*nx + b.vy*ny;
                    b.vx = (b.vx - 2 * dot * nx) * BOUNCE_FACTOR; b.vy = (b.vy - 2 * dot * ny) * BOUNCE_FACTOR;
                }
            });

            if (b.y + b.radius > bucket.current.y && b.x > bucket.current.x && b.x < bucket.current.x + bucket.current.width) {
                if (!b.isGhost) setBallsLeft(bl => bl + 1);
                playTone(1200, 'square', 0.2); return false;
            }
            return b.y < GAME_HEIGHT + 10;
        });

        // Pegs
        pegs.current.forEach(p => {
            gameCtx.beginPath(); gameCtx.fillStyle = p.type === 'orange' ? '#f60' : (p.type === 'green' ? '#0f0' : '#36f');
            if (p.hit) gameCtx.globalAlpha = 0.2;
            gameCtx.arc(p.x, p.y, p.radius, 0, Math.PI*2); gameCtx.fill(); gameCtx.globalAlpha = 1;
        });

        // Balls
        balls.current.forEach(b => {
            gameCtx.beginPath(); gameCtx.fillStyle = b.isGhost ? '#fff6' : '#fff';
            gameCtx.arc(b.x, b.y, b.radius, 0, Math.PI*2); gameCtx.fill();
        });

        // Cannon
        gameCtx.save(); gameCtx.translate(GAME_WIDTH/2, CANNON_Y); gameCtx.rotate(aimAngle.current - Math.PI/2);
        gameCtx.fillStyle = hero.color; gameCtx.fillRect(-2, -6, 4, 12); gameCtx.restore();

        // Render to Display
        const displayCtx = canvasRef.current?.getContext('2d');
        if (displayCtx) {
            displayCtx.imageSmoothingEnabled = false;
            displayCtx.clearRect(0, 0, canvasSize.w, canvasSize.h);
            displayCtx.drawImage(gameCanvasRef.current!, 0, 0, GAME_WIDTH, GAME_HEIGHT, 0, 0, canvasSize.w, canvasSize.h);
            if (status === 'fever') {
                displayCtx.font = 'bold 50px "Pixelify Sans"'; displayCtx.textAlign = 'center';
                displayCtx.fillStyle = FEVER_COLORS[Math.floor(Date.now()/50)%FEVER_COLORS.length];
                displayCtx.fillText('EXTREME FEVER!', canvasSize.w/2, canvasSize.h/2);
            }
        }

        // TURN END LOGIC: Clear hit pegs when balls are gone
        if (balls.current.length === 0 && (status === 'playing' || status === 'fever')) {
            if (pegs.current.some(p => p.hit)) {
                // Remove hit pegs from the board
                pegs.current = pegs.current.filter(p => !p.hit);
                comboCount.current = 0;
            }

            if (totalOrangeCount.current === 0) setStatus('cleared');
            else if (ballsLeft === 0) setStatus('game-over');
            else if (status !== 'fever') setStatus('playing');
        }
        animationFrameId.current = requestAnimationFrame(animate);
    }, [ballsLeft, score, status, hero, canvasSize, useAiBg, level, showPrediction]);

    useEffect(() => {
        gameCanvasRef.current = document.createElement('canvas');
        gameCanvasRef.current.width = GAME_WIDTH; gameCanvasRef.current.height = GAME_HEIGHT;
        animationFrameId.current = requestAnimationFrame(animate);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [animate]);

    const handleInteraction = (e: React.MouseEvent) => {
        if (status === 'menu' || status === 'level-select' || status === 'hero-select') return;
        if ((status === 'playing' || status === 'fever') && ballsLeft > 0 && balls.current.length === 0) {
            setBallsLeft(b => b - 1);
            balls.current.push({ id: `b-${Date.now()}`, x: GAME_WIDTH/2, y: CANNON_Y, vx: Math.cos(aimAngle.current)*BALL_SPEED, vy: Math.sin(aimAngle.current)*BALL_SPEED, radius: BALL_RADIUS, teleportCooldown: 0 });
            playTone(330);
        } else if (status === 'cleared') nextLevel();
        else if (status === 'game-over') setStatus('menu');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        aimAngle.current = Math.atan2((e.clientY - rect.top)/canvasSize.h * GAME_HEIGHT - CANNON_Y, (e.clientX - rect.left)/canvasSize.w * GAME_WIDTH - GAME_WIDTH/2);
    };

    const LevelPreview: React.FC<{ lvl: number }> = ({ lvl }) => (
        <div className="w-20 h-20 bg-gray-900 border-2 border-white/20 flex flex-col items-center justify-center hover:border-orange-500 group transition-all cursor-pointer">
            <div className="text-[10px] mb-1 font-bold">{lvl + 1}</div>
            <svg width={30} height={42} viewBox={`0 0 ${GAME_WIDTH} ${GAME_HEIGHT}`} className="opacity-60 group-hover:opacity-100">
                {lvl % 10 === 1 && <rect x="20" y="65" width="60" height="5" fill="gray" />}
                {lvl % 10 === 3 && <circle cx="50" cy="80" r="15" fill="none" stroke="white" strokeDasharray="2" />}
                <circle cx="50" cy="30" r="4" fill="orange" />
            </svg>
        </div>
    );

    return (
        <div ref={containerRef} className="w-full h-full bg-black flex flex-col items-center justify-center p-0 relative overflow-hidden font-mono">
            <div className="w-full h-12 flex justify-between px-6 items-center text-white bg-[#111] border-b border-white/10 z-20">
                <div className="flex flex-col"><span className="text-orange-500 font-bold uppercase text-[10px]">Level {level + 1}/10</span><span className="text-[14px] font-bold">{hero.name}</span></div>
                <div className="flex flex-col items-center"><span className="text-2xl font-bold tracking-[0.2em]">{score.toLocaleString()}</span></div>
                <div className="flex flex-col items-end"><span className="text-green-500 font-bold uppercase text-[10px]">{ballsLeft} Balls</span><span className="text-[12px] opacity-70">x{comboCount.current || 1}</span></div>
            </div>

            <div className="flex-grow flex items-center justify-center w-full relative bg-black">
                {isGeneratingBg && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-white animate-pulse text-xs font-bold uppercase">Painting Background...</div>}
                <div className="relative shadow-2xl" style={{ width: canvasSize.w, height: canvasSize.h }}>
                    <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h} onMouseMove={handleMouseMove} onMouseDown={handleInteraction} className="w-full h-full border-x border-white/5" style={{ imageRendering: 'pixelated', cursor: 'crosshair' }} />
                    {/* Fix: Removed invalid comparison with 'ready' which is not in the union type. */}
                    {(status === 'playing') && (
                        <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                            <button onClick={() => setShowPrediction(!showPrediction)} className={`px-2 py-1 text-[10px] border border-white ${showPrediction ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                Prediction: {showPrediction ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {status === 'menu' && (
                <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-8">
                    <h1 className="text-8xl font-black tracking-tighter italic drop-shadow-[0_0_20px_#f60]" style={{fontFamily: "'Pixelify Sans'"}}>PEGGLE</h1>
                    <div className="text-orange-500 text-3xl font-bold tracking-[0.6em] mb-12">EXTREME</div>
                    <div className="grid grid-cols-1 gap-5 w-full max-w-sm">
                        <button onClick={() => setStatus('level-select')} className="border-4 border-white p-5 hover:bg-white hover:text-black font-bold uppercase transition-all shadow-[8px_8px_0px_white]">New Game</button>
                        <button onClick={() => setUseAiBg(!useAiBg)} className={`mt-4 px-6 py-2 border-2 border-white text-xs font-bold uppercase transition-all ${useAiBg ? 'bg-white text-black' : 'bg-transparent text-white opacity-60'}`}>AI Backgrounds: {useAiBg ? 'ON' : 'OFF'}</button>
                    </div>
                </div>
            )}

            {status === 'level-select' && (
                <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white p-8 overflow-y-auto text-center">
                    <h2 className="text-4xl font-black mb-8 italic uppercase border-b-4 border-white">Select Map</h2>
                    <div className="grid grid-cols-5 gap-2 mb-8 mx-auto">
                        {Array.from({length: 10}).map((_, i) => <div key={i} onClick={() => { setLevel(i); setStatus('hero-select'); }}><LevelPreview lvl={i} /></div>)}
                    </div>
                    <button onClick={() => setStatus('menu')} className="text-gray-500 hover:text-white uppercase font-bold text-sm tracking-widest">Back</button>
                </div>
            )}

            {status === 'hero-select' && (
                <div className="absolute inset-0 z-50 bg-black/98 flex flex-col items-center justify-center text-white p-8">
                    <h2 className="text-4xl font-black mb-10 uppercase italic border-b-4 border-white text-center">Pick Champion</h2>
                    <div className="space-y-4 w-full max-w-md">
                        {HEROES.map(h => (
                            <button key={h.id} onClick={() => { setHero(h); setScore(0); layoutLevel(level); setBallsLeft(INITIAL_BALLS); setStatus('playing'); generateAIBackground(level); }} className="w-full border-4 border-white p-4 flex items-center text-left hover:bg-white hover:text-black transition-all group">
                                <div className="w-14 h-14 border-4 group-hover:border-black flex-shrink-0" style={{backgroundColor: h.color}}></div>
                                <div className="ml-6"><div className="font-black text-2xl uppercase">{h.name}</div><div className="text-[10px] font-mono opacity-60 uppercase">{h.power}: {h.ability}</div></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {status === 'game-over' && (
                <div className="absolute inset-0 z-40 bg-red-950/95 flex flex-col items-center justify-center text-white">
                    <h2 className="text-9xl font-black tracking-tighter mb-4 italic">FAILURE</h2>
                    <button onClick={() => setStatus('menu')} className="border-4 border-white px-16 py-5 hover:bg-white hover:text-black font-black uppercase text-3xl italic shadow-[10px_10px_0px_white]">Try Again</button>
                </div>
            )}
        </div>
    );
};
