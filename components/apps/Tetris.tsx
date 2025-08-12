import React, { useRef, useEffect, useState, useCallback } from 'react';
import { globalEmitter } from '../../events';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 25;

const SHAPES = [
    [[1,1,1,1]], // I
    [[1,1],[1,1]], // O
    [[0,1,0],[1,1,1]], // T
    [[0,1,1],[1,1,0]], // S
    [[1,1,0],[0,1,1]], // Z
    [[1,0,0],[1,1,1]], // L
    [[0,0,1],[1,1,1]], // J
];
const COLORS = ['#00FFFF', '#FFFF00', '#800080', '#00FF00', '#FF0000', '#FFA500', '#0000FF'];

export const Tetris: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);

    const board = useRef(Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
    const player = useRef({ pos: { x: 0, y: 0 }, shape: [[0]], color: '' });
    const dropCounter = useRef(0);
    const dropInterval = useRef(1000);

    const updateScore = (clearedLines: number) => {
        const linePoints = [0, 100, 300, 500, 800];
        setScore(s => s + linePoints[clearedLines]);
    };

    const resetPlayer = useCallback(() => {
        const index = Math.floor(Math.random() * SHAPES.length);
        player.current.shape = SHAPES[index];
        player.current.color = COLORS[index];
        player.current.pos = {
            x: Math.floor(COLS / 2) - Math.floor(player.current.shape[0].length / 2),
            y: 0,
        };
        if (checkCollision(player.current.pos, player.current.shape)) {
            setIsGameOver(true);
        }
    }, []);

    const newGame = useCallback(() => {
        board.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        setScore(0);
        setIsGameOver(false);
        dropInterval.current = 1000;
        resetPlayer();
    }, [resetPlayer]);
    
    useEffect(() => {
        if (!isActive) return;
        globalEmitter.subscribe('tetris:new', newGame);
        return () => globalEmitter.unsubscribe('tetris:new', newGame);
    }, [isActive, newGame]);


    const checkCollision = (pos: {x:number, y:number}, shape: number[][]): boolean => {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x] !== 0) {
                    const newY = y + pos.y;
                    const newX = x + pos.x;
                    if (newY >= ROWS || newX < 0 || newX >= COLS || (newY >= 0 && board.current[newY] && board.current[newY][newX] !== 0)) {
                        return true;
                    }
                }
            }
        }
        return false;
    };
    
    const mergeToBoard = () => {
        player.current.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board.current[y + player.current.pos.y][x + player.current.pos.x] = player.current.color;
                }
            });
        });
    };
    
    const clearLines = () => {
        let clearedLines = 0;
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) {
                if (board.current[y][x] === 0) {
                    continue outer;
                }
            }
            const row = board.current.splice(y, 1)[0].fill(0);
            board.current.unshift(row);
            y++;
            clearedLines++;
        }
        updateScore(clearedLines);
    };

    const playerDrop = useCallback(() => {
        const newPos = { ...player.current.pos, y: player.current.pos.y + 1 };
        if (!checkCollision(newPos, player.current.shape)) {
            player.current.pos = newPos;
        } else {
            mergeToBoard();
            clearLines();
            resetPlayer();
        }
        dropCounter.current = 0;
    }, [resetPlayer]);

    const playerMove = (dir: number) => {
        const newPos = { ...player.current.pos, x: player.current.pos.x + dir };
        if (!checkCollision(newPos, player.current.shape)) {
            player.current.pos = newPos;
        }
    };
    
    const playerRotate = () => {
        const shape = player.current.shape;
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
        if (!checkCollision(player.current.pos, newShape)) {
            player.current.shape = newShape;
        }
    };

    useEffect(() => {
        newGame();
        let lastTime = 0;
        let animationFrameId: number;

        const update = (time = 0) => {
            if (isGameOver) return;
            const deltaTime = time - lastTime;
            lastTime = time;

            dropCounter.current += deltaTime;
            if (dropCounter.current > dropInterval.current) {
                playerDrop();
            }
            draw();
            animationFrameId = requestAnimationFrame(update);
        };
        
        update();

        return () => cancelAnimationFrame(animationFrameId);
    }, [isGameOver, playerDrop, newGame]);
    
     const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw board
        board.current.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = value as string;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });

        // Draw player piece
        player.current.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = player.current.color;
                    ctx.fillRect((player.current.pos.x + x) * BLOCK_SIZE, (player.current.pos.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect((player.current.pos.x + x) * BLOCK_SIZE, (player.current.pos.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });

        // Draw Score
        ctx.fillStyle = '#fff';
        ctx.font = '20px "Pixelify Sans"';
        ctx.fillText(`Score: ${score}`, COLS * BLOCK_SIZE + 10, 30);
        
        if (isGameOver) {
             ctx.fillStyle = 'rgba(0,0,0,0.7)';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             ctx.font = '30px "Pixelify Sans"';
             ctx.fillStyle = 'red';
             ctx.textAlign = 'center';
             ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        }
    };

    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isGameOver) return;
            switch (e.key) {
                case 'ArrowLeft': playerMove(-1); break;
                case 'ArrowRight': playerMove(1); break;
                case 'ArrowDown': playerDrop(); break;
                case 'ArrowUp': playerRotate(); break;
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);

    }, [isActive, isGameOver, playerDrop]);


    return (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center p-2">
            <canvas ref={canvasRef} width={COLS * BLOCK_SIZE + 100} height={ROWS * BLOCK_SIZE} />
        </div>
    );
};
