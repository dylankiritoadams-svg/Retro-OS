import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { startTextAdventureChat } from '../../services/geminiService';
import type { ChatMessage } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const TextAdventure: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const geminiChat = useRef<Chat | null>(null);
    const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const logEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog, isLoading]);
    
    useEffect(() => {
        if(isActive) {
            inputRef.current?.focus();
        }
    }, [isActive, isLoading]);

    useEffect(() => {
        try {
            geminiChat.current = startTextAdventureChat();
        } catch (e: any) {
            console.error(e);
            const errorMessage: ChatMessage = { role: 'model', content: `Error: ${e.message}\nThe system cannot boot.` };
            setChatLog([errorMessage]);
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        geminiChat.current.sendMessage({ message: "Start the game." }).then(result => {
            const startMessage: ChatMessage = { role: 'model', content: result.text.trim() };
            setChatLog([startMessage]);
        }).catch(e => {
            console.error(e);
            const errorMessage: ChatMessage = { role: 'model', content: 'The system buzzes but fails to boot properly.' };
            setChatLog([errorMessage]);
        }).finally(() => {
             setIsLoading(false);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !geminiChat.current) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setChatLog(prev => [...prev, userMessage]);
        const textToProcess = input;
        setInput('');
        setIsLoading(true);

        try {
            const result = await geminiChat.current.sendMessage({ message: textToProcess });
            const modelMessage: ChatMessage = { role: 'model', content: result.text.trim() };
            setChatLog(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: ChatMessage = { role: 'model', content: 'The system buzzes and returns an error.' };
            setChatLog(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full bg-black text-green-400 font-mono flex flex-col p-2">
            <div className="flex-grow overflow-y-auto pr-2 mb-2">
                {chatLog.map((msg, index) => (
                    <div key={index} className="whitespace-pre-wrap leading-tight">
                        {msg.role === 'user' ? `> ${msg.content}` : msg.content}
                    </div>
                ))}
                {isLoading && <div className="animate-pulse">AI is thinking...</div>}
                <div ref={logEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="flex-shrink-0 flex">
                <span className="text-green-400 mr-2">&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow bg-transparent text-green-400 border-none outline-none"
                    autoFocus
                    disabled={isLoading}
                />
            </form>
        </div>
    );
};