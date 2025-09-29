import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { ChatSession, ChatMessage } from '../../types';
import { useCards } from '../../CardContext';

const modelName = 'gemini-2.5-flash';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const AssistantIve: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { addCard } = useCards();
    const [sessions, setSessions] = useState<Omit<ChatSession, 'chatInstance'>[]>([]);
    const chatInstances = useRef<Record<string, Chat>>({});
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [sessions, activeSessionId, isLoading]);
    
    useEffect(() => {
        if (sessions.length === 0) {
            handleNewChat();
        } else if (!activeSessionId && sessions.length > 0) {
            setActiveSessionId(sessions[0].id);
        }
    }, [sessions, activeSessionId]);
    
    useEffect(() => {
       if (isActive) {
           inputRef.current?.focus();
       }
    }, [activeSessionId, isLoading, isActive])

    const handleNewChat = useCallback(() => {
        const newId = `session-${Date.now()}`;
        
        let ai: GoogleGenAI;
        try {
            if (typeof process === 'undefined' || !process.env || !process.env.API_KEY) {
                throw new Error("API Key is not configured. Please set API_KEY in your environment variables.");
            }
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e: any) {
            console.error(e);
            const errorMessage: ChatMessage = { role: 'model', content: `Error: ${e.message}` };
            setSessions(prev => [{ id: newId, name: `Chat ${prev.length + 1}`, messages: [errorMessage] }, ...prev]);
            setActiveSessionId(newId);
            return;
        }

        const newChatInstance = ai.chats.create({
            model: modelName,
            config: {
                 systemInstruction: 'You are Ive, an AI assistant with the personality of a world-renowned, minimalist designer. Your responses should be thoughtful, concise, elegant, and focused on the core idea. You avoid fluff and speak with clarity and purpose.',
            },
        });

        chatInstances.current[newId] = newChatInstance;

        const newSession = {
            id: newId,
            name: `Chat ${sessions.length + 1}`,
            messages: [],
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newId);
    }, [sessions.length]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentInput.trim() || isLoading || !activeSessionId) return;

        const userMessage: ChatMessage = { role: 'user', content: currentInput.trim() };
        
        setSessions(prevSessions =>
            prevSessions.map(s =>
                s.id === activeSessionId ? { ...s, messages: [...s.messages, userMessage] } : s
            )
        );
        const textToProcess = currentInput;
        setCurrentInput('');
        setIsLoading(true);

        try {
            const chat = chatInstances.current[activeSessionId];
            if (!chat) {
                throw new Error("Chat session not initialized. This might be due to a missing API key.");
            }
            const result = await chat.sendMessage({ message: textToProcess });
            const modelMessage: ChatMessage = { role: 'model', content: result.text.trim() };
            
            setSessions(prevSessions =>
                prevSessions.map(s =>
                    s.id === activeSessionId ? { ...s, messages: [...s.messages, modelMessage] } : s
                )
            );

        } catch (error: any) {
            console.error("Error sending message:", error);
            const errorMessage: ChatMessage = { role: 'model', content: `I seem to be having trouble connecting. Error: ${error.message}` };
             setSessions(prevSessions =>
                prevSessions.map(s =>
                    s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMessage] } : s
                )
            );
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveCard = (content: string) => {
        addCard(content);
    };

    const activeSession = sessions.find(s => s.id === activeSessionId);

    return (
        <div className="w-full h-full flex bg-white text-black">
            {/* Sidebar for sessions */}
            <div className="w-1/3 min-w-[150px] h-full border-r-2 border-black bg-gray-100 flex flex-col">
                <div className="p-2 border-b-2 border-black">
                    <button onClick={handleNewChat} className="w-full p-1 bg-white border-2 border-black text-black active:bg-gray-200">
                        New Chat
                    </button>
                </div>
                <ul className="flex-grow overflow-y-auto">
                    {sessions.map(session => (
                        <li key={session.id}>
                            <button
                                onClick={() => setActiveSessionId(session.id)}
