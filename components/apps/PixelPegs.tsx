import React, { useRef, useEffect, useState, useCallback } from 'react';
import { globalEmitter } from '../../events';
import type { Peg, Ball, Bucket } from '../../types';

// Constants
const DISPLAY_WIDTH = 400;
const DISPLAY_HEIGHT = 600;
const GAME_WIDTH = 100;
const GAME_HEIGHT = 150;
const SCALE_FACTOR = DISPLAY_WIDTH / GAME_WIDTH;

const GRAVITY = 0.025;
const PEG_RADIUS = 2.0;
const BALL_RADIUS = 1.5;
const CANNON_Y = 7.5;
const INITIAL_BALLS = 12;
const BALL_SPEED = 1.4;
const BUCKET_SPEED = 0.45;
const BUCKET_WIDTH = 18;
const BUCKET_HEIGHT = 5;
const BOUNCE_FACTOR = 0.82;

type GameStatus = 'hero-select' | 'ready' | 'aiming' | 'firing' | 'cleared' | 'game-over';
type HeroType = 'aimbot' | 'blasto' | 'splitter';
type GameMode = 'adventure' | 'chaos' | 'architect';

interface Hero {
    id: HeroType;
    name: string;
    description: string;
    color: string;
}

const HEROES: Hero[] = [
    { id: 'aimbot', name: 'The Aim-Bot', description: 'Long trajectory path.', color: '#00ffcc' },
    { id: 'blasto', name: 'Blast-O', description: 'Power-up creates explosion.', color: '#ff6600' },
    { id: 'splitter', name: 'Splitter', description: 'Chance to spawn ghost balls.', color: '#cc33ff' },
];

const PRESET_LEVELS = [
    // Level 1: Smiley
    [{x: 30, y: 50, type: 'blue'}, {x: 70, y: 50, type: 'blue'}, {x: 50, y: 70, type: 'orange'}, {x: 30, y: 90, type: 'orange'}, {x: 40, y: 100, type: 'orange'}, {x: 50, y: 100, type: 'orange'}, {x: 60, y: 100, type: 'orange'}, {x: 70, y: 90, type: 'orange'}],
    // Level 2: Diamond
    [{x: 50, y: 40, type: 'green'}, {x: 30, y: 70, type: 'orange'}, {x: 70, y: 70, type: 'orange'}, {x: 50, y: 100, type: 'blue'}],
    // Level 3: Columns
    [{x: 20, y: 50, type: 'orange'}, {x: 20, y: 70, type: 'orange'}, {x: 20, y: 90, type: 'orange'}, {x: 80, y: 50, type: 'orange'}, {x: 80, y: 70, type: 'orange'}, {x: 80, y: 90, type: 'orange'}],
];

export const PixelPegs: React.FC<{ isActive: boolean; instanceId: string }> = ({ isActive, instanceId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [status, setStatus] = useState<GameStatus>('hero-select');
    const [mode, setMode] = useState<GameMode>('adventure');
    const [hero, setHero] = useState<Hero | null>(null);
    const [ballsRemaining, setBallsRemaining] = useState(INITIAL_BALLS);
    const [level, setLevel] = useState(0);
    const [score, setScore] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editPegType, setEditPegType] = useState<Peg['type']>('blue');

    const pegs = useRef<Peg[]>([]);
    const balls = useRef<Ball[]>([]);
    const bucket = useRef<Bucket>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 7.5, width: BUCKET_WIDTH, height: BUCKET_HEIGHT, vx: BUCKET_SPEED });
    const orangePegsRemaining = useRef(0);
    const aimAngle = useRef(Math.PI / 2);
    const particles = useRef<{x: number, y: number, vx: number, vy: number, color: string, life: number}[]>([]);

    const generateLevel = useCallback((currentLevel: number, currentMode: GameMode) => {
        pegs.current = [];
        orangePegsRemaining.current = 0;
        balls.current = [];

        if (currentMode === 'adventure') {
            const data = PRESET_LEVELS[currentLevel % PRESET_LEVELS.length];
            data.forEach((p, i) => {
                pegs.current.push({
                    id: i, x: p.x, y: p.y,
                    radius: PEG_RADIUS,
                    type: p.type as Peg['type'],
                    hit: false,
                    score: p.type === 'orange' ? 50 : p.type === 'green' ? 100 : 10,
                });
                if (p.type === 'orange') orangePegsRemaining.current++;
            });
        } else if (currentMode === 'chaos') {
            const numPegs = 60 + (currentLevel * 5);
            for (let i = 0; i < numPegs; i++) {
                let placed = false;
                let attempts = 0;
                while (!placed && attempts < 50) {
                    const x = Math.random() * (GAME_WIDTH - PEG_RADIUS * 6) + PEG_RADIUS * 3;
                    const y = Math.random() * (GAME_HEIGHT / 2) + 30;
                    const isOrange = Math.random() < 0.25;
                    const isGreen = Math.random() < 0.04;
                    const type = isGreen ? 'green' : (isOrange ? 'orange' : 'blue');

                    if (!pegs.current.some(p => Math.hypot(x - p.x, y - p.y) < PEG_RADIUS * 2.5)) {
                        pegs.current.push({ id: i, x, y, radius: PEG_RADIUS, type, hit: false, score: type === 'orange' ? 50 : 10 });
                        if (type === 'orange') orangePegsRemaining.current++;
                        placed = true;
                    }
                    attempts++;
                }
            }
        }
    }, []);

    const spawnParticles = (x: number, y: number, color: string, count = 5) => {
        for (let i = 0; i < count; i++) {
            particles.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color,
                life: 1.0
            });
        }
    };

    const handlePowerUp = (x: number, y: number) => {
        if (!hero) return;
        if (hero.id === 'blasto') {
            spawnParticles(x, y, '#ff6600', 30);
            pegs.current.forEach(peg => {
                if (!peg.hit && Math.hypot(peg.x - x, peg.y - y) < 15) {
                    peg.hit = true;
                    if (peg.type === 'orange') orangePegsRemaining.current--;
                    setScore(s => s + peg.score * 2);
                }
            });
        } else if (hero.id === 'splitter') {
            balls.current.push({
                id: `ghost-${Date.now()}`,
                x, y,
                vx: (Math.random() - 0.5) * 2,
                vy: -1,
                radius: BALL_RADIUS,
                isGhost: true
            });
        }
    };

    const restartGame = useCallback(() => {
        setScore(0);
        setBallsRemaining(INITIAL_BALLS);
        setLevel(0);
        generateLevel(0, mode);
        setStatus('ready');
    }, [generateLevel, mode]);

    const nextLevel = useCallback(() => {
        setScore(s => s + ballsRemaining * 200);
        setLevel(l => l + 1);
        generateLevel(level + 1, mode);
        setBallsRemaining(INITIAL_BALLS);
        setStatus('ready');
    }, [ballsRemaining, level, generateLevel, mode]);

    const animate = useCallback(() => {
        const gameCtx = gameCanvasRef.current?.getContext('2d');
        if (!gameCtx) return;

        // Draw World
        gameCtx.fillStyle = '#050510';
        gameCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Grid dots for Architect mode
        if (isEditMode) {
            gameCtx.fillStyle = '#111122';
            for (let i = 0; i < GAME_WIDTH; i += 5) {
                for (let j = 0; j < GAME_HEIGHT; j += 5) {
                    gameCtx.fillRect(i, j, 1, 1);
                }
            }
        }

        // Draw Bucket
        bucket.current.x += bucket.current.vx;
        if (bucket.current.x < 0 || bucket.current.x + bucket.current.width > GAME_WIDTH) bucket.current.vx *= -1;
        gameCtx.fillStyle = '#333344';
        gameCtx.fillRect(bucket.current.x, bucket.current.y, bucket.current.width, bucket.current.height);
        gameCtx.strokeStyle = '#666677';
        gameCtx.strokeRect(bucket.current.x, bucket.current.y, bucket.current.width, bucket.current.height);

        // Update Particles
        particles.current = particles.current.filter(p => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.02;
            gameCtx.fillStyle = p.color;
            gameCtx.globalAlpha = p.life;
            gameCtx.fillRect(p.x, p.y, 1, 1);
            gameCtx.globalAlpha = 1;
            return p.life > 0;
        });

        // Trajectory Prediction (Aimbot Hero)
        if ((status === 'aiming' || status === 'ready') && hero?.id === 'aimbot') {
            let tx = GAME_WIDTH / 2, ty = CANNON_Y;
            let tvx = Math.cos(aimAngle.current) * BALL_SPEED;
            let tvy = Math.sin(aimAngle.current) * BALL_SPEED;
            gameCtx.beginPath();
            gameCtx.setLineDash([1, 1]);
            gameCtx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
            for (let i = 0; i < 150; i++) {
                tvy += GRAVITY; tx += tvx; ty += tvy;
                if (tx < 0 || tx > GAME_WIDTH) tvx *= -1;
                if (i % 5 === 0) gameCtx.lineTo(tx, ty);
            }
            gameCtx.stroke();
            gameCtx.setLineDash([]);
        }

        // Update & Draw Balls
        balls.current = balls.current.filter(b => {
            b.vy += GRAVITY; b.x += b.vx; b.y += b.vy;

            // Wall Collisions
            if (b.x < b.radius || b.x > GAME_WIDTH - b.radius) {
                b.vx *= -BOUNCE_FACTOR;
                b.x = b.x < b.radius ? b.radius : GAME_WIDTH - b.radius;
            }
            if (b.y < b.radius) { b.vy *= -BOUNCE_FACTOR; b.y = b.radius; }

            // Peg Collisions
            pegs.current.forEach(peg => {
                if (!peg.hit) {
                    const dist = Math.hypot(b.x - peg.x, b.y - peg.y);
                    if (dist < b.radius + peg.radius) {
                        peg.hit = true;
                        if (peg.type === 'orange') orangePegsRemaining.current--;
                        if (peg.type === 'green') handlePowerUp(peg.x, peg.y);
                        setScore(s => s + peg.score);
                        spawnParticles(peg.x, peg.y, peg.type === 'orange' ? '#ff6600' : '#4169e1');

                        const nx = (b.x - peg.x) / dist;
                        const ny = (b.y - peg.y) / dist;
                        const dot = b.vx * nx + b.vy * ny;
                        b.vx = (b.vx - 2 * dot * nx) * BOUNCE_FACTOR;
                        b.vy = (b.vy - 2 * dot * ny) * BOUNCE_FACTOR;

                        if (orangePegsRemaining.current <= 0) setStatus('cleared');
                    }
                }
            });

            // Bucket Catch
            if (b.y + b.radius > bucket.current.y && b.x > bucket.current.x && b.x < bucket.current.x + bucket.current.width) {
                if (!b.isGhost) setBallsRemaining(br => br + 1);
                spawnParticles(b.x, b.y, '#ffffff', 10);
                return false;
            }

            // Draw Ball
            gameCtx.beginPath();
            gameCtx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            gameCtx.fillStyle = b.isGhost ? 'rgba(255,255,255,0.4)' : '#ffffff';
            gameCtx.fill();

            return b.y < GAME_HEIGHT + 10;
        });

        // If all balls lost
        // Fix: Check for balls.current.length === 0 first, then handle status transitions to avoid type conflict at line 266
        if (balls.current.length === 0) {
            if (status === 'cleared') {
                nextLevel();
            } else if (status === 'firing') {
                if (ballsRemaining <= 0) setStatus('game-over');
                else setStatus('ready');
            }
        }

        // Draw Pegs
        pegs.current.forEach(peg => {
            gameCtx.beginPath();
            gameCtx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            gameCtx.fillStyle = peg.type === 'orange' ? '#ff6600' : (peg.type === 'green' ? '#00ff00' : '#4169e1');
            gameCtx.globalAlpha = peg.hit ? 0.2 : 1.0;
            gameCtx.fill();
            if (!peg.hit) {
                gameCtx.strokeStyle = 'rgba(255,255,255,0.3)';
                gameCtx.lineWidth = 0.5;
                gameCtx.stroke();
            }
            gameCtx.globalAlpha = 1.0;
        });

        // Draw Cannon
        gameCtx.save();
        gameCtx.translate(GAME_WIDTH / 2, CANNON_Y);
        gameCtx.rotate(aimAngle.current - Math.PI / 2);
        gameCtx.fillStyle = hero?.color || '#ffffff';
        gameCtx.fillRect(-3, -2, 6, 4);
        gameCtx.fillRect(-1, -6, 2, 5);
        gameCtx.restore();

        // Render to Display
        const displayCtx = canvasRef.current?.getContext('2d');
        if (displayCtx) {
            displayCtx.imageSmoothingEnabled = false;
            displayCtx.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
            displayCtx.drawImage(gameCanvasRef.current!, 0, 0, GAME_WIDTH, GAME_HEIGHT, 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
            
            // HUD
            displayCtx.fillStyle = '#ffffff';
            displayCtx.font = '16px "Pixelify Sans"';
            displayCtx.textAlign = 'left';
            displayCtx.fillText(`LEVEL: ${level + 1}`, 10, 20);
            displayCtx.textAlign = 'center';
            displayCtx.fillText(`SCORE: ${score}`, DISPLAY_WIDTH / 2, 20);
            displayCtx.textAlign = 'right';
            displayCtx.fillText(`BALLS: ${ballsRemaining}`, DISPLAY_WIDTH - 10, 20);

            if (status === 'cleared') {
                displayCtx.fillStyle = 'rgba(0,255,0,0.2)';
                displayCtx.fillRect(0,0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
                displayCtx.font = '32px "Pixelify Sans"';
                displayCtx.fillStyle = '#ffffff';
                displayCtx.textAlign = 'center';
                displayCtx.fillText('EXTREME FEVER!', DISPLAY_WIDTH/2, DISPLAY_HEIGHT/2);
            }
        }

        animationFrameId.current = requestAnimationFrame(animate);
    }, [ballsRemaining, level, score, status, nextLevel, hero, isEditMode]);

    useEffect(() => {
        gameCanvasRef.current = document.createElement('canvas');
        gameCanvasRef.current.width = GAME_WIDTH;
        gameCanvasRef.current.height = GAME_HEIGHT;
        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [animate]);

    const handleCanvasInteraction = (e: React.MouseEvent) => {
        if (status === 'hero-select') return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (GAME_WIDTH / DISPLAY_WIDTH);
        const y = (e.clientY - rect.top) * (GAME_HEIGHT / DISPLAY_HEIGHT);

        if (isEditMode) {
            // Remove existing peg if clicking on it
            const existingIdx = pegs.current.findIndex(p => Math.hypot(p.x - x, p.y - y) < PEG_RADIUS * 2);
            if (existingIdx !== -1) {
                pegs.current.splice(existingIdx, 1);
            } else {
                pegs.current.push({
                    id: Date.now(), x, y, radius: PEG_RADIUS, type: editPegType, hit: false,
                    score: editPegType === 'orange' ? 50 : 10
                });
            }
            orangePegsRemaining.current = pegs.current.filter(p => p.type === 'orange').length;
            return;
        }

        if (status === 'ready' || status === 'aiming') {
            if (ballsRemaining > 0) {
                setStatus('firing');
                setBallsRemaining(br => br - 1);
                balls.current.push({
                    id: `ball-${Date.now()}`,
                    x: GAME_WIDTH / 2, y: CANNON_Y,
                    vx: Math.cos(aimAngle.current) * BALL_SPEED,
                    vy: Math.sin(aimAngle.current) * BALL_SPEED,
                    radius: BALL_RADIUS,
                });
            }
        } else if (status === 'game-over') {
            restartGame();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (status === 'hero-select') return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (GAME_WIDTH / DISPLAY_WIDTH);
        const y = (e.clientY - rect.top) * (GAME_HEIGHT / DISPLAY_HEIGHT);
        aimAngle.current = Math.atan2(y - CANNON_Y, x - GAME_WIDTH / 2);
        if (status === 'ready') setStatus('aiming');
    };

    const selectHero = (h: Hero) => {
        setHero(h);
        restartGame();
    };

    return (
        <div className="w-full h-full bg-[#1a1a2e] flex flex-col items-center justify-center p-2 relative">
            {status === 'hero-select' && (
                <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-8 text-white font-mono">
                    <h1 className="text-3xl font-bold mb-2 tracking-tighter" style={{fontFamily: "'Pixelify Sans'"}}>PIXEL PEGS 2</h1>
                    <p className="text-gray-400 mb-8 text-sm">CHOOSE YOUR CHAMPION</p>
                    <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                        {HEROES.map(h => (
                            <button 
                                key={h.id} 
                                onClick={() => selectHero(h)}
                                className="border-2 border-white p-4 hover:bg-white hover:text-black transition-colors text-left"
                            >
                                <div className="font-bold uppercase" style={{color: h.color}}>{h.name}</div>
                                <div className="text-xs mt-1">{h.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-grow flex items-center justify-center w-full relative">
                <canvas
                    ref={canvasRef}
                    width={DISPLAY_WIDTH}
                    height={DISPLAY_HEIGHT}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleCanvasInteraction}
                    className="bg-black shadow-2xl border-2 border-gray-700"
                    style={{ imageRendering: 'pixelated', cursor: isEditMode ? 'crosshair' : 'none' }}
                />
            </div>

            {/* Architecture Toolbar */}
            {status !== 'hero-select' && (
                <div className="w-full flex justify-between items-center mt-2 px-2">
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => { setMode('adventure'); restartGame(); }}
                            className={`px-2 py-1 text-[10px] border border-white text-white ${mode === 'adventure' ? 'bg-white text-black' : ''}`}
                        >LEVELS</button>
                        <button 
                            onClick={() => { setMode('chaos'); restartGame(); }}
                            className={`px-2 py-1 text-[10px] border border-white text-white ${mode === 'chaos' ? 'bg-white text-black' : ''}`}
                        >CHAOS</button>
                         <button 
                            onClick={() => { setIsEditMode(!isEditMode); setMode('architect'); pegs.current = []; orangePegsRemaining.current = 0; }}
                            className={`px-2 py-1 text-[10px] border border-white text-white ${isEditMode ? 'bg-white text-black' : ''}`}
                        >MAKER</button>
                    </div>

                    {isEditMode && (
                        <div className="flex space-x-1">
                            {(['blue', 'orange', 'green'] as Peg['type'][]).map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setEditPegType(t)}
                                    className={`w-4 h-4 rounded-full border border-white ${editPegType === t ? 'ring-2 ring-yellow-400' : ''}`}
                                    style={{backgroundColor: t === 'orange' ? '#ff6600' : (t === 'green' ? '#00ff00' : '#4169e1')}}
                                />
                            ))}
                        </div>
                    )}

                    <div className="text-[10px] text-gray-500 uppercase tracking-widest">{hero?.name}</div>
                </div>
            )}

            {status === 'game-over' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-40 text-white font-mono">
                    <div className="text-4xl text-red-500 mb-2">GAME OVER</div>
                    <div className="mb-4">FINAL SCORE: {score}</div>
                    <button onClick={restartGame} className="px-6 py-2 border-2 border-white hover:bg-white hover:text-black">REBOOT</button>
                </div>
            )}
        </div>
    );
};
