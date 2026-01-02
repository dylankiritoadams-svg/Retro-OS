import React, { useRef, useEffect, useState, useCallback } from 'react';
import { globalEmitter } from '../../events';

interface AppProps {
    isActive: boolean;
    instanceId: string;
}

const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 10;
const BALL_RADIUS = 5;
const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_WIDTH = 38;
const BRICK_HEIGHT = 15;
const BRICK_GAP = 2;

export const BrickBreaker: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isLevelCleared, setIsLevelCleared] = useState(false);

    const paddleX = useRef(200);
    const ball = useRef({ x: 200, y: 300, dx: 2, dy: -2 });
    const bricks = useRef<any[]>([]);

    const resetBricks = useCallback(() => {
        const newBricks = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                newBricks.push({
                    x: c * (BRICK_WIDTH + BRICK_GAP) + 10,
                    y: r * (BRICK_HEIGHT + BRICK_GAP) + 50,
                    w: BRICK_WIDTH,
                    h: BRICK_HEIGHT,
                    visible: true,
                });
            }
        }
        bricks.current = newBricks;
    }, []);
    
    const newGame = useCallback(() => {
        setScore(0);
        setLives(3);
        setIsGameOver(false);
        setIsLevelCleared(false);
        ball.current = { x: 200, y: 300, dx: 2, dy: -2 };
        if(canvasRef.current) {
            paddleX.current = canvasRef.current.width / 2 - PADDLE_WIDTH / 2;
        }
        resetBricks();
    }, [resetBricks]);

    useEffect(() => {
        if (!isActive) return;
        const handler = (data: { instanceId: string }) => {
            if (data.instanceId === instanceId) {
                newGame();
            }
        };
        globalEmitter.subscribe('brickbreaker:new', handler);
        return () => globalEmitter.unsubscribe('brickbreaker:new', handler);
    }, [isActive, instanceId, newGame]);

    // Call newGame once on mount
    useEffect(() => {
        newGame();
    }, [newGame]);


    useEffect(() => {
        if (!isActive || isGameOver || isLevelCleared) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isActive) return;
            const rect = canvas.getBoundingClientRect();
            let newX = e.clientX - rect.left - PADDLE_WIDTH / 2;
            paddleX.current = Math.max(0, Math.min(canvas.width - PADDLE_WIDTH, newX));
        };
        canvas.addEventListener('mousemove', handleMouseMove);

        let animationFrameId: number;
        
        const scoreRef = { current: score };
        scoreRef.current = score;
        const livesRef = { current: lives };
        livesRef.current = lives;


        const gameLoop = () => {
            // Update
            ball.current.x += ball.current.dx;
            ball.current.y += ball.current.dy;

            // Wall collision
            if (ball.current.x + ball.current.dx > canvas.width - BALL_RADIUS || ball.current.x + ball.current.dx < BALL_RADIUS) {
                ball.current.dx = -ball.current.dx;
            }
            if (ball.current.y + ball.current.dy < BALL_RADIUS) {
                ball.current.dy = -ball.current.dy;
            } else if (ball.current.y + ball.current.dy > canvas.height - BALL_RADIUS - 30) {
                // Paddle collision
                if (ball.current.x > paddleX.current && ball.current.x < paddleX.current + PADDLE_WIDTH) {
                    const paddleCenter = paddleX.current + PADDLE_WIDTH / 2;
                    const impactPoint = ball.current.x;
                    const relativeImpact = impactPoint - paddleCenter;
                    const normalizedImpact = relativeImpact / (PADDLE_WIDTH / 2); // -1 to 1
                    
                    const maxDx = 4;
                    ball.current.dx = normalizedImpact * maxDx;
                    ball.current.dy = -ball.current.dy; // Bounce up
                } else {
                    setLives(l => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                            setIsGameOver(true);
                        } else {
                            ball.current = { x: 200, y: 300, dx: 2, dy: -2 };
                            paddleX.current = canvas.width / 2 - PADDLE_WIDTH / 2;
                        }
                        return newLives;
                    });
                }
            }

            // Brick collision
            let allBricksCleared = true;
            bricks.current.forEach(brick => {
                if (brick.visible) {
                    allBricksCleared = false;
                    if (
                        ball.current.x > brick.x &&
                        ball.current.x < brick.x + brick.w &&
                        ball.current.y > brick.y &&
                        ball.current.y < brick.y + brick.h
                    ) {
                        ball.current.dy = -ball.current.dy;
                        brick.visible = false;
                        setScore(s => s + 10);
                    }
                }
            });

            if(allBricksCleared) {
                setIsLevelCleared(true);
            }
            
            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#ddd';
            ctx.fillRect(paddleX.current, canvas.height - 30, PADDLE_WIDTH, PADDLE_HEIGHT);

            ctx.beginPath();
            ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.closePath();

            bricks.current.forEach(brick => {
                if (brick.visible) {
                    ctx.fillStyle = '#f99';
                    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
                }
            });
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Pixelify Sans"';
            ctx.fillText(`Score: ${scoreRef.current}`, 8, 20);
            ctx.fillText(`Lives: ${livesRef.current}`, canvas.width - 65, 20);
            
            if (isGameOver) {
                 ctx.font = '40px "Pixelify Sans"';
                 ctx.fillStyle = 'red';
                 ctx.textAlign = 'center';
                 ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
            }
            if (isLevelCleared) {
                 ctx.font = '40px "Pixelify Sans"';
                 ctx.fillStyle = 'green';
                 ctx.textAlign = 'center';
                 ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2);
            }

            animationFrameId = requestAnimationFrame(gameLoop);
        };

        gameLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isActive, isGameOver, isLevelCleared, score, lives]);

    return (
        <div className="w-full h-full bg-black flex items-center justify-center p-2">
            <canvas ref={canvasRef} width="400" height="450" className="bg-gray-800" />
        </div>
    );
};