import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGroundedResponse } from '../../services/geminiService';
import { useApp } from '../../App';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

type HistoryLine = {
    type: 'input' | 'output' | 'error' | 'system';
    content: React.ReactNode;
}

const WELCOME_MESSAGE = `DeepSearch Terminal [Version 1.0.0]
(c) Gemini Corporation. All rights reserved.

Type 'help' to see a list of available commands.
`;

const HELP_MESSAGE = `Available commands:
  search [query]   - Search the web for a query.
  sysinfo          - Display system information.
  date             - Display the current date and time.
  echo [message]   - Display a message.
  clear            - Clear the terminal screen.
  help             - Show this help message.
`;

const SYSINFO_MESSAGE = `
  ,------------------------------------,
  | RetroOS v1.0                       |
  |------------------------------------|
  | OS:       RetroOS x64              |
  | Host:     Web Browser              |
  | Kernel:   React 19                 |
  | Uptime:   since page load          |
  | Shell:    gterm                    |
  | CPU:      Your Browser's Engine    |
  | GPU:      Your GPU                 |
  | Memory:   A few MBs                |
  '------------------------------------'
`;

export const DeepSearch: React.FC<AppProps> = ({ isActive }) => {
    const { openApp } = useApp();
    const [history, setHistory] = useState<HistoryLine[]>([{ type: 'system', content: WELCOME_MESSAGE }]);
    const [input, setInput] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = useCallback(() => {
        if (containerRef.current) {
            (containerRef.current as HTMLDivElement).scrollTo(0, (containerRef.current as HTMLDivElement).scrollHeight);
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [history, isLoading, scrollToBottom]);

    useEffect(() => {
        if (isActive) {
            (inputRef.current as HTMLInputElement)?.focus();
        }
    }, [isActive]);

    const addHistory = (line: HistoryLine) => {
        setHistory(prev => [...prev, line]);
    };

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        try {
            const response = await getGroundedResponse(query);
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

            const outputContent = (
                <div>
                    <p>{response.text}</p>
                    {sources && sources.length > 0 && (
                        <div className="mt-2">
                            <p className="underline">Sources:</p>
                            <ul className="list-disc list-inside">
                                {sources.map((source: any, index: number) => (
                                    <li key={index}>
                                        <button 
                                            onClick={() => openApp('browser', { url: source.web.uri })}
                                            className="text-blue-400 hover:text-blue-300 underline"
                                        >
                                            {source.web.title || source.web.uri}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
            addHistory({ type: 'output', content: outputContent });
        } catch (error: any) {
            addHistory({ type: 'error', content: `Error during search: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const processCommand = (commandStr: string) => {
        const [command, ...args] = commandStr.trim().split(/\s+/);
        const query = args.join(' ');

        switch (command.toLowerCase()) {
            case 'search':
                if (!query) {
                    addHistory({ type: 'error', content: "Usage: search [your query]" });
                    return;
                }
                handleSearch(query);
                break;
            case 'clear':
                setHistory([]);
                break;
            case 'help':
                addHistory({ type: 'system', content: HELP_MESSAGE });
                break;
            case 'sysinfo':
                 addHistory({ type: 'system', content: SYSINFO_MESSAGE });
                 break;
            case 'date':
                addHistory({ type: 'output', content: new Date().toLocaleString() });
                break;
            case 'echo':
                addHistory({ type: 'output', content: query });
                break;
            case '':
                break;
            default:
                addHistory({ type: 'error', content: `command not found: ${command}` });
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading || !input.trim()) return;

        const command = input.trim();
        addHistory({ type: 'input', content: command });

        if (command) {
            setCommandHistory(prev => [command, ...prev.filter(c => c !== command)]);
        }
        setHistoryIndex(-1);

        processCommand(command);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex >= 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(newIndex >= 0 ? commandHistory[newIndex] : '');
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full bg-black text-green-400 font-mono p-2 overflow-y-auto"
            onClick={() => inputRef.current?.focus()}
            style={{ textShadow: '0 0 5px rgba(0, 255, 0, 0.5)' }}
        >
            {history.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap">
                    {line.type === 'input' && <span className="text-gray-500">[user@retroos ~]$ </span>}
                    <span className={line.type === 'error' ? 'text-red-500' : ''}>{line.content}</span>
                </div>
            ))}

            {isLoading && <div>Searching...</div>}

            <form onSubmit={handleSubmit}>
                <div className="flex">
                    <span className="text-gray-500">[user@retroos ~]$&nbsp;</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput((e.target as HTMLInputElement).value)}
                        onKeyDown={handleKeyDown}
                        className="flex-grow bg-transparent border-none outline-none text-green-400"
                        autoFocus
                        disabled={isLoading}
                        autoComplete="off"
                    />
                </div>
            </form>
        </div>
    );
};