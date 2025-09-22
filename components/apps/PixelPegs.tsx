import React, { useRef, useEffect, useState, useCallback } from 'react';
import { globalEmitter } from '../../events';
import type { Peg, Ball, Bucket } from '../../types';

// Constants
const DISPLAY_WIDTH = 400;
const DISPLAY_HEIGHT = 600;
const GAME_WIDTH = 100;
const GAME_HEIGHT = 150;

const SCALE_FACTOR = DISPLAY_WIDTH / GAME_WIDTH; // 4

const GRAVITY = 0.025; // 0.1 / 4
const PEG_RADIUS = 2.0; // Pegs are smaller
const BALL_RADIUS = 1.5; // Ball is smaller
const CANNON_Y = 7.5; // 30 / 4
const INITIAL_BALLS = 16;
const BALL_SPEED = 1.25; // Slower speed: 5 / 4
const BUCKET_SPEED = 0.375; // 1.5 / 4
const BUCKET_WIDTH = 20; // 80 / 4
const BUCKET_HEIGHT = 5; // 20 / 4
const BOUNCE_FACTOR = 0.8; // Ball retains 80% of velocity on bounce

type GameStatus = 'ready' | 'aiming' | 'firing' | 'cleared' | 'game-over';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const PixelPegs: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameId = useRef<number | null>(null);

    const [status, setStatus] = useState<GameStatus>('ready');
    const [ballsRemaining, setBallsRemaining] = useState(INITIAL_BALLS);
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);

    const pegs = useRef<Peg[]>([]);
    const ball = useRef<Ball | null>(null);
    const bucket = useRef<Bucket>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 7.5, width: BUCKET_WIDTH, height: BUCKET_HEIGHT, vx: BUCKET_SPEED });
    const orangePegsRemaining = useRef(0);
    
    const aimAngle = useRef(Math.PI / 2);

    const generateLevel = useCallback((currentLevel: number) => {
        pegs.current = [];
        orangePegsRemaining.current = 0;
        const numPegs = Math.min(100, 50 + currentLevel * 5);
        const numOrangePegs = Math.floor(numPegs / 4);

        for (let i = 0; i < numPegs; i++) {
            let placed = false;
            while (!placed) {
                const x = Math.random() * (GAME_WIDTH - PEG_RADIUS * 4) + PEG_RADIUS * 2;
                const y = Math.random() * (GAME_HEIGHT / 2) + (GAME_HEIGHT / 5); // Place pegs lower down
                
                let overlap = false;
                for (const peg of pegs.current) {
                    const dist = Math.hypot(x - peg.x, y - peg.y);
                    if (dist < PEG_RADIUS * 2.5) {
                        overlap = true;
                        break;
                    }
                }

                if (!overlap) {
                    const isOrange = orangePegsRemaining.current < numOrangePegs && Math.random() < 0.25;
                    const type = isOrange ? 'orange' : 'blue';
                    if (isOrange) orangePegsRemaining.current++;
                    
                    pegs.current.push({
                        id: i, x, y,
                        radius: PEG_RADIUS,
                        type,
                        hit: false,
                        score: isOrange ? 50 : 10,
                    });
                    placed = true;
                }
            }
        }
    }, []);

    const restartGame = useCallback(() => {
        setLevel(1);
        setScore(0);
        setBallsRemaining(INITIAL_BALLS);
        generateLevel(1);
        setStatus('ready');
    }, [generateLevel]);

    const nextLevel = useCallback(() => {
        const bonus = ballsRemaining * 100 * level;
        setScore(s => s + bonus);
        setLevel(l => l + 1);
        generateLevel(level + 1);
        setStatus('ready');
    }, [ballsRemaining, level, generateLevel]);
    
    useEffect(() => {
        if (!isActive) return;

        const handleNewGame = (data: { instanceId: string }) => {
            if (data.instanceId === instanceId) {
                restartGame();
            }
        };

        globalEmitter.subscribe('pixelpegs:game:new', handleNewGame);
        return () => {
            globalEmitter.unsubscribe('pixelpegs:game:new', handleNewGame);
        };
    }, [isActive, instanceId, restartGame]);


    const animate = useCallback(() => {
        const gameCtx = gameCanvasRef.current?.getContext('2d');
        if (!gameCtx) {
             animationFrameId.current = requestAnimationFrame(animate);
             return;
        }
        
        // Clear game canvas
        gameCtx.fillStyle = '#1a1a2e';
        gameCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        gameCtx.strokeStyle = '#e0e0e0';
        gameCtx.lineWidth = 1;
        gameCtx.strokeRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Update & Draw bucket
        bucket.current.x += bucket.current.vx;
        if (bucket.current.x < 0 || bucket.current.x + bucket.current.width > GAME_WIDTH) {
            bucket.current.vx *= -1;
        }
        gameCtx.fillStyle = '#e0e0e0';
        gameCtx.fillRect(bucket.current.x, bucket.current.y, bucket.current.width, bucket.current.height);

        // Update & Draw Ball
        if (ball.current) {
            const b = ball.current;
            b.vy += GRAVITY;
            b.x += b.vx;
            b.y += b.vy;

            // Wall collision
            if (b.x - b.radius < 0 || b.x + b.radius > GAME_WIDTH) {
                b.vx *= -BOUNCE_FACTOR;
                b.x = b.x - b.radius < 0 ? b.radius : GAME_WIDTH - b.radius;
            }
            if (b.y - b.radius < 0) {
                 b.vy *= -BOUNCE_FACTOR;
                 b.y = b.radius;
            }

            // Peg collision
            pegs.current.forEach(peg => {
                if (!peg.hit) {
                    const dist = Math.hypot(b.x - peg.x, b.y - peg.y);
                    if (dist < b.radius + peg.radius) {
                        peg.hit = true;
                        setScore(s => s + peg.score);
                        if (peg.type === 'orange') {
                            orangePegsRemaining.current--;
                        }

                        // Reflection physics
                        const nx = (b.x - peg.x) / dist;
                        const ny = (b.y - peg.y) / dist;
                        const dot = b.vx * nx + b.vy * ny;
                        b.vx -= 2 * dot * nx;
                        b.vy -= 2 * dot * ny;

                        // Apply bounce factor
                        b.vx *= BOUNCE_FACTOR;
                        b.vy *= BOUNCE_FACTOR;

                        if (orangePegsRemaining.current <= 0) {
                            setStatus('cleared');
                        }
                    }
                }
            });

            // Bucket collision
            if (b.y + b.radius > bucket.current.y && b.x > bucket.current.x && b.x < bucket.current.x + bucket.current.width) {
                ball.current = null;
                setBallsRemaining(br => br + 1);
                if (status !== 'cleared') setStatus('ready');
            }

            // Off screen
            if (b.y - b.radius > GAME_HEIGHT) {
                ball.current = null;
                if (status === 'cleared') {
                    nextLevel();
                } else if (ballsRemaining <= 0) {
                    setStatus('game-over');
                } else {
                    setStatus('ready');
                }
            }
        }

        // Draw Pegs
        pegs.current.forEach(peg => {
            gameCtx.beginPath();
            gameCtx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
            gameCtx.fillStyle = peg.type === 'orange' ? '#ff7f50' : '#4169e1';
            gameCtx.globalAlpha = peg.hit ? 0.3 : 1;
            gameCtx.fill();
            if (peg.hit) {
                gameCtx.strokeStyle = '#fff';
                gameCtx.lineWidth = 0.5;
                gameCtx.stroke();
            }
            gameCtx.globalAlpha = 1;
        });
        
        // Draw Ball
        if (ball.current) {
            gameCtx.beginPath();
            gameCtx.arc(ball.current.x, ball.current.y, ball.current.radius, 0, Math.PI * 2);
            gameCtx.fillStyle = '#ffffff';
            gameCtx.fill();
        }

        // Draw Cannon and Aiming line
        const cannonX = GAME_WIDTH / 2;
        gameCtx.save();
        gameCtx.translate(cannonX, CANNON_Y);
        gameCtx.rotate(aimAngle.current - Math.PI / 2);
        gameCtx.fillStyle = '#e0e0e0';
        gameCtx.fillRect(-4, -2.5, 8, 5);
        gameCtx.fillRect(-1.25, -6, 2.5, 5);
        gameCtx.restore();

        if (status === 'aiming' || status === 'ready') {
            gameCtx.beginPath();
            gameCtx.moveTo(cannonX, CANNON_Y);
            gameCtx.lineTo(cannonX + Math.cos(aimAngle.current) * 12, CANNON_Y + Math.sin(aimAngle.current) * 12);
            gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            gameCtx.lineWidth = 0.5;
            gameCtx.setLineDash([1, 1]);
            gameCtx.stroke();
            gameCtx.setLineDash([]);
        }

        // Render game canvas to display canvas
        const displayCtx = canvasRef.current?.getContext('2d');
        if (displayCtx && gameCanvasRef.current) {
            displayCtx.imageSmoothingEnabled = false;
            displayCtx.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
            displayCtx.drawImage(gameCanvasRef.current, 0, 0, GAME_WIDTH, GAME_HEIGHT, 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

            // Draw all UI text on the high-res display canvas for clarity
            displayCtx.fillStyle = '#ffffff';
            displayCtx.font = '24px "Pixelify Sans", sans-serif';

            displayCtx.textAlign = 'left';
            displayCtx.fillText(`Score: ${score}`, 2 * SCALE_FACTOR, 7 * SCALE_FACTOR);

            displayCtx.textAlign = 'right';
            displayCtx.fillText(`Balls: ${ballsRemaining}`, (GAME_WIDTH - 2) * SCALE_FACTOR, 7 * SCALE_FACTOR);

            displayCtx.textAlign = 'center';
            displayCtx.fillText(`Level: ${level}`, (GAME_WIDTH / 2) * SCALE_FACTOR, 7 * SCALE_FACTOR);
            
            if (status === 'game-over') {
                displayCtx.fillStyle = 'rgba(0,0,0,0.7)';
                displayCtx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
                
                displayCtx.font = '40px "Pixelify Sans", sans-serif';
                // Shadow
                displayCtx.fillStyle = '#000000';
                displayCtx.fillText('GAME OVER', DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2 + 4);
                // Main text
                displayCtx.fillStyle = '#ff4d4d';
                displayCtx.fillText('GAME OVER', DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2);

                displayCtx.fillStyle = '#ffffff';
                displayCtx.font = '20px "Pixelify Sans", sans-serif';
                displayCtx.fillText('Click to Restart', DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2 + 40);
            } else if (status === 'cleared') {
                 displayCtx.font = '32px "Pixelify Sans", sans-serif';
                 // Shadow
                 displayCtx.fillStyle = '#000000';
                 displayCtx.fillText('LEVEL CLEARED!', DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2 + 4);
                 // Main text
                 displayCtx.fillStyle = '#ffd700';
                 displayCtx.fillText('LEVEL CLEARED!', DISPLAY_WIDTH / 2, DISPLAY_HEIGHT / 2);
            }
        }

        animationFrameId.current = requestAnimationFrame(animate);
    }, [ballsRemaining, level, score, status, nextLevel]);

    useEffect(() => {
        // Setup offscreen canvas for rendering
        gameCanvasRef.current = document.createElement('canvas');
        gameCanvasRef.current.width = GAME_WIDTH;
        gameCanvasRef.current.height = GAME_HEIGHT;

        generateLevel(level);
        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            gameCanvasRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (status !== 'ready' && status !== 'aiming') return;
        setStatus('aiming');
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (GAME_WIDTH / DISPLAY_WIDTH);
        const mouseY = (e.clientY - rect.top) * (GAME_HEIGHT / DISPLAY_HEIGHT);
        aimAngle.current = Math.atan2(mouseY - CANNON_Y, mouseX - GAME_WIDTH / 2);
    };
    
    const handleMouseClick = () => {
        if (status === 'ready' || status === 'aiming') {
            if(ballsRemaining > 0) {
                setStatus('firing');
                setBallsRemaining(br => br - 1);
                ball.current = {
                    x: GAME_WIDTH / 2, y: CANNON_Y,
                    vx: Math.cos(aimAngle.current) * BALL_SPEED,
                    vy: Math.sin(aimAngle.current) * BALL_SPEED,
                    radius: BALL_RADIUS,
                };
            }
        } else if (status === 'game-over') {
            restartGame();
        }
    };

    return (
        <div className="w-full h-full bg-black flex items-center justify-center p-2">
            <canvas
                ref={canvasRef}
                width={DISPLAY_WIDTH}
                height={DISPLAY_HEIGHT}
                onMouseMove={handleMouseMove}
                onClick={handleMouseClick}
                className="bg-gray-800"
                style={{ imageRendering: 'pixelated', cursor: 'crosshair' }}
            />
        </div>
    );
};