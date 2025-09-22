import React, { useRef, useEffect, useState, useCallback } from 'react';
import { globalEmitter } from '../../events';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const TILE_SIZE = 20;
const MAP_ROWS = 21;
const MAP_COLS = 19;

// 1 = wall, 0 = dot, 2 = power pellet, 3 = empty
const MAP_LAYOUT = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,3,1,3,1,1,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,3,1,1,3,1,0,1,1,1,1], // Ghost house door added here
    [3,0,0,0,0,3,3,1,3,3,3,1,3,3,0,0,0,0,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,2,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,2,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const INITIAL_GHOSTS_STATE = [
    { x: 9, y: 9, color: 'red', dir: { x: 0, y: 0 } },
    { x: 8, y: 9, color: 'pink', dir: { x: 0, y: 0 } },
    { x: 10, y: 9, color: 'cyan', dir: { x: 0, y: 0 } },
];


export const PacMan: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [isGameOver, setIsGameOver] = useState(false);
    
    const pacman = useRef({ x: 9, y: 15, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } });
    const ghosts = useRef(JSON.parse(JSON.stringify(INITIAL_GHOSTS_STATE)));
    const board = useRef(JSON.parse(JSON.stringify(MAP_LAYOUT)));

    const newGame = useCallback(() => {
        board.current = JSON.parse(JSON.stringify(MAP_LAYOUT));
        setScore(0);
        setLives(3);
        setIsGameOver(false);
        pacman.current = { x: 9, y: 15, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } };
        ghosts.current = JSON.parse(JSON.stringify(INITIAL_GHOSTS_STATE));
    }, []);

    useEffect(() => {
        if (!isActive) return;
        const handler = (data: { instanceId: string }) => {
            if (data.instanceId === instanceId) {
                newGame();
            }
        };
        globalEmitter.subscribe('pacman:new', handler);
        return () => globalEmitter.unsubscribe('pacman:new', handler);
    }, [isActive, instanceId, newGame]);

    useEffect(() => {
        if (!isActive) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            switch(e.key) {
                case 'ArrowUp': pacman.current.nextDir = { x: 0, y: -1 }; break;
                case 'ArrowDown': pacman.current.nextDir = { x: 0, y: 1 }; break;
                case 'ArrowLeft': pacman.current.nextDir = { x: -1, y: 0 }; break;
                case 'ArrowRight': pacman.current.nextDir = { x: 1, y: 0 }; break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActive]);
    
    // Call newGame once on mount
    useEffect(() => {
        newGame();
    }, [newGame]);

    useEffect(() => {
        if (!isActive || isGameOver) return;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        let frameCount = 0;
        let animationFrameId: number;

        const scoreRef = { current: score };
        scoreRef.current = score;
        const livesRef = { current: lives };
        livesRef.current = lives;

        const isWall = (x: number, y: number) => {
            if (y < 0 || y >= MAP_ROWS || x < 0 || x >= MAP_COLS) return true;
            return board.current[y][x] === 1;
        };

        const gameLoop = () => {
            if (isGameOver) {
                // Draw final game over screen and stop loop
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = '40px "Pixelify Sans"';
                ctx.fillStyle = 'red';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
                return;
            }
            // Update
            frameCount++;

            // Pacman movement
            if (frameCount % 10 === 0) { // Slowed down from 8
                const { x, y, dir, nextDir } = pacman.current;
                
                // Try next direction
                if (nextDir.x !== 0 || nextDir.y !== 0) {
                    if (!isWall(x + nextDir.x, y + nextDir.y)) {
                        pacman.current.dir = { ...nextDir };
                    }
                }

                // Move in current direction
                if (!isWall(x + pacman.current.dir.x, y + pacman.current.dir.y)) {
                    pacman.current.x += pacman.current.dir.x;
                    pacman.current.y += pacman.current.dir.y;
                }
                
                // Eat dots
                if (board.current[pacman.current.y][pacman.current.x] === 0) {
                    board.current[pacman.current.y][pacman.current.x] = 3; // Empty
                    setScore(s => s + 10);
                } else if (board.current[pacman.current.y][pacman.current.x] === 2) {
                     board.current[pacman.current.y][pacman.current.x] = 3; // Empty
                    setScore(s => s + 50);
                }
            }
            
            // Ghost movement
            if (frameCount % 14 === 0) { // Slower than pacman
                ghosts.current.forEach(g => {
                    const possibleMoves = [];
                    const directions = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
                    
                    for (const dir of directions) {
                        if (!isWall(g.x + dir.x, g.y + dir.y)) {
                            possibleMoves.push(dir);
                        }
                    }
                    
                    let validMoves = possibleMoves;
                    // Prevent ghosts from turning back unless they have to
                    if (possibleMoves.length > 1 && (g.dir.x !== 0 || g.dir.y !== 0)) {
                        const oppositeDir = { x: -g.dir.x, y: -g.dir.y };
                        const filteredMoves = possibleMoves.filter(move => move.x !== oppositeDir.x || move.y !== oppositeDir.y);
                        if(filteredMoves.length > 0) {
                             validMoves = filteredMoves;
                        }
                    }
                    
                    if (validMoves.length > 0) {
                        const newDir = validMoves[Math.floor(Math.random() * validMoves.length)];
                        g.dir = newDir;
                        g.x += newDir.x;
                        g.y += newDir.y;
                    }
                });
            }

            // Ghost collision
            ghosts.current.forEach(g => {
                if (g.x === pacman.current.x && g.y === pacman.current.y) {
                    setLives(l => {
                        const newLives = l - 1;
                        if (newLives <= 0) {
                             setIsGameOver(true);
                        } else { // Reset positions
                            pacman.current.x = 9;
                            pacman.current.y = 15;
                            pacman.current.dir = {x: 0, y: 0};
                            pacman.current.nextDir = {x: 0, y: 0};
                            ghosts.current = JSON.parse(JSON.stringify(INITIAL_GHOSTS_STATE));
                        }
                        return newLives;
                    });
                }
            });

            // Draw
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw map
            for (let r = 0; r < MAP_ROWS; r++) {
                for (let c = 0; c < MAP_COLS; c++) {
                    if (board.current[r][c] === 1) {
                        ctx.fillStyle = 'blue';
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    } else if (board.current[r][c] === 0) {
                        ctx.fillStyle = 'white';
                        ctx.fillRect(c * TILE_SIZE + TILE_SIZE/2 - 1, r * TILE_SIZE + TILE_SIZE/2 - 1, 2, 2);
                    } else if (board.current[r][c] === 2) {
                        ctx.beginPath();
                        ctx.arc(c * TILE_SIZE + TILE_SIZE/2, r * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/4, 0, Math.PI * 2);
                        ctx.fillStyle = 'white';
                        ctx.fill();
                    }
                }
            }
            
            // Draw ghosts
            ghosts.current.forEach(g => {
                ctx.fillStyle = g.color;
                ctx.beginPath();
                ctx.arc(g.x * TILE_SIZE + TILE_SIZE/2, g.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2, Math.PI, 0);
                ctx.lineTo(g.x * TILE_SIZE + TILE_SIZE, g.y * TILE_SIZE + TILE_SIZE);
                ctx.lineTo(g.x * TILE_SIZE, g.y * TILE_SIZE + TILE_SIZE);
                ctx.closePath();
                ctx.fill();
            });

            // Draw Pacman
            ctx.beginPath();
            const openMouth = frameCount % 20 < 10;
            const startAngle = 0.25 * Math.PI;
            const endAngle = 1.75 * Math.PI;
            ctx.arc(pacman.current.x * TILE_SIZE + TILE_SIZE/2, pacman.current.y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2 - 2, openMouth ? startAngle : 0, openMouth ? endAngle : 2*Math.PI);
            ctx.lineTo(pacman.current.x * TILE_SIZE + TILE_SIZE/2, pacman.current.y * TILE_SIZE + TILE_SIZE/2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            
            // Draw UI
            ctx.fillStyle = '#fff';
            ctx.font = '18px "Pixelify Sans"';
            ctx.fillText(`Score: ${scoreRef.current}`, 10, MAP_ROWS * TILE_SIZE + 30);
            ctx.fillText(`Lives: ${livesRef.current}`, canvas.width - 70, MAP_ROWS * TILE_SIZE + 30);

            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();

        return () => cancelAnimationFrame(animationFrameId);

    }, [isActive, isGameOver, score, lives]);


    return (
        <div className="w-full h-full bg-black flex flex-col items-center justify-center p-2">
            <canvas
                ref={canvasRef}
                width={MAP_COLS * TILE_SIZE}
                height={MAP_ROWS * TILE_SIZE + 40}
            />
        </div>
    );
};