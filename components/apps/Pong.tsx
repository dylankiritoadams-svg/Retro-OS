import React, { useRef, useEffect, useState } from 'react';

interface AppProps {
    isActive: boolean;
    instanceId: string;
}

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 5;

export const Pong: React.FC<AppProps> = ({ isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scores, setScores] = useState({ player: 0, ai: 0 });

    const ball = useRef({ x: 300, y: 200, dx: 4, dy: 4 });
    const playerPaddleY = useRef(160);
    const aiPaddleY = useRef(160);

    const resetBall = () => {
        ball.current.x = 300;
        ball.current.y = 200;
        ball.current.dx = -ball.current.dx; // Change direction
    };

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isActive) return;
            const rect = canvas.getBoundingClientRect();
            let newY = e.clientY - rect.top - PADDLE_HEIGHT / 2;
            playerPaddleY.current = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, newY));
        };
        canvas.addEventListener('mousemove', handleMouseMove);

        let animationFrameId: number;

        const gameLoop = () => {
            // Update
            ball.current.x += ball.current.dx;
            ball.current.y += ball.current.dy;

            // AI paddle movement
            const aiCenter = aiPaddleY.current + PADDLE_HEIGHT / 2;
            if (aiCenter < ball.current.y - 20) {
                aiPaddleY.current += 3;
            } else if (aiCenter > ball.current.y + 20) {
                aiPaddleY.current -= 3;
            }
            aiPaddleY.current = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, aiPaddleY.current));


            // Wall collision (top/bottom)
            if (ball.current.y + ball.current.dy > canvas.height - BALL_RADIUS || ball.current.y + ball.current.dy < BALL_RADIUS) {
                ball.current.dy = -ball.current.dy;
            }

            // Paddle collision
            // Player
            if (ball.current.x - BALL_RADIUS < 20 + PADDLE_WIDTH && ball.current.y > playerPaddleY.current && ball.current.y < playerPaddleY.current + PADDLE_HEIGHT) {
                ball.current.dx = -ball.current.dx;
            }
            // AI
            if (ball.current.x + BALL_RADIUS > canvas.width - 20 - PADDLE_WIDTH && ball.current.y > aiPaddleY.current && ball.current.y < aiPaddleY.current + PADDLE_HEIGHT) {
                ball.current.dx = -ball.current.dx;
            }

            // Score
            if (ball.current.x - BALL_RADIUS < 0) {
                setScores(s => ({ ...s, ai: s.ai + 1 }));
                resetBall();
            } else if (ball.current.x + BALL_RADIUS > canvas.width) {
                setScores(s => ({ ...s, player: s.player + 1 }));
                resetBall();
            }

            // Draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Center line
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, 0);
            ctx.lineTo(canvas.width / 2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);

            // Paddles
            ctx.fillStyle = '#fff';
            ctx.fillRect(20, playerPaddleY.current, PADDLE_WIDTH, PADDLE_HEIGHT);
            ctx.fillRect(canvas.width - 30, aiPaddleY.current, PADDLE_WIDTH, PADDLE_HEIGHT);

            // Ball
            ctx.beginPath();
            ctx.arc(ball.current.x, ball.current.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Scores
            ctx.font = '40px "Pixelify Sans"';
            ctx.fillText(String(scores.player), canvas.width / 2 - 60, 50);
            ctx.fillText(String(scores.ai), canvas.width / 2 + 40, 50);

            animationFrameId = requestAnimationFrame(gameLoop);
        };
        gameLoop();

        return () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('mousemove', handleMouseMove);
        };
    }, [scores.player, scores.ai, isActive]);

    return (
        <div className="w-full h-full bg-black flex items-center justify-center p-2">
            <canvas ref={canvasRef} width="580" height="380" className="bg-gray-800" />
        </div>
    );
};
