import React, { useState, useEffect, useRef } from 'react';
import { getGroundedResponse } from '../../services/geminiService';
import { useApp } from '../../App';

const terminalStyle: React.CSSProperties = {
    fontFamily: "'VT323', monospace",
    color: '#00FF41',
    backgroundColor: '#0a0a0a',
    textShadow: '0 0 5px #00FF41, 0 0 10px #00FF41',
    padding: '10px',
    height: '100%',
    width: '100%',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    boxSizing: 'border-box',
    lineHeight: '1.2',
};

const bootSequence = [
    'RetroOS BIOS v1.33.7',
    'Initializing memory...',
    'Memory test: 640K OK',
    'Detecting primary master: GEN-IDE-001',
    'Detecting primary slave: None',
    'Detecting secondary master: GEN-CD-ROM',
    'Detecting secondary slave: None',
    'Booting from C:',
    'Starting RetroOS...',
    'Connecting to G-Network...',
    'Connection established. IP: 192.168.0.42',
    'Loading G-Terminal...',
    'Ready.',
];

const GOOGLE_ASCII = [
'  o o o o o o o  o-o  o-o  o-o  o   o  o-o',
'  |   | | | |   |  | |  | |    |   | |   ',
'  o o o o | o o o  o  o-o  o-o  o-o o o-o ',
'      | | | | | |  | |    |    | | | |  |',
'  o o o o o o-o o  o o-o  o-o  | | o o-o ',
];


export const GTerminal: React.FC = () => {
    const { openApp } = useApp();
    const [bootLog, setBootLog] = useState<string[]>([]);
    const [isBooting, setIsBooting] = useState(true);
    const [input, setInput] = useState('');
    const [searchResult, setSearchResult] = useState<React.ReactNode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let i = 0;
        const intervalId = setInterval(() => {
            if (i < bootSequence.length) {
                setBootLog(prev => [...prev, bootSequence[i]]);
                i++;
            } else {
                clearInterval(intervalId);
                setTimeout(() => setIsBooting(false), 300);
            }
        }, 150);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!isBooting) {
            (inputRef.current as HTMLInputElement)?.focus();
        }
    }, [isBooting]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        setIsLoading(true);
        setSearchResult(null);
        try {
            const response = await getGroundedResponse(input);
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

            const formattedResult = (
                <div>
                    <p>{`> Search results for: "${input}"`}</p>
                    <br />
                    {sources.length > 0 ? (
                        <div>
                            {sources.map((source: any, index: number) => (
                                <div key={index} className="mb-2">
                                    <p className="text-sm">{`${index + 1}. `}
                                        <button
                                            onClick={() => openApp('browser', { url: source.web.uri })}
                                            className="text-blue-400 hover:text-blue-300 underline text-left"
                                        >
                                            {source.web.title || "Untitled"}
                                        </button>
                                    </p>
                                    <p className="pl-4 text-sm text-gray-400">{source.web.uri}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p>No results found for "{input}".</p>
                    )}
                </div>
            );
            setSearchResult(formattedResult);
        } catch (error: any) {
            setSearchResult(`\n\n[SYSTEM ERROR]\nCould not connect to G-Network.\n${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (isBooting) {
        return (
            <div style={terminalStyle}>
                {bootLog.join('\n')}
                <span className="animate-pulse">_</span>
            </div>
        );
    }

    if (isLoading) {
         return (
             <div style={terminalStyle}>
                Connecting to G-Network for query: "{input}"...
                <span className="animate-pulse">_</span>
             </div>
         );
    }
    
    if (searchResult) {
        return (
             <div style={terminalStyle}>
                <div>{searchResult}</div>
                <br/><br/>
                <button 
                    onClick={() => { setSearchResult(null); setInput(''); }} 
                    className="bg-green-900 text-green-400 border border-green-400 px-2 py-1"
                >
                    New Search
                </button>
             </div>
        );
    }

    return (
        <div style={terminalStyle} className="flex flex-col items-center justify-center" onClick={() => inputRef.current?.focus()}>
            <div className="mb-8 text-sm">
                {GOOGLE_ASCII.map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <form onSubmit={handleSubmit} className="w-96">
                <div className="border-2 border-green-400 p-1 flex">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput((e.target as HTMLInputElement).value)}
                        className="bg-transparent border-none outline-none text-green-400 w-full"
                    />
                </div>
                <div className="mt-4 text-center">
                    <button type="submit" className="bg-gray-800 border border-green-400 px-4 py-1 mx-2">
                        Google Search
                    </button>
                    <button type="button" className="bg-gray-800 border border-green-400 px-4 py-1 mx-2">
                        I'm Feeling Lucky
                    </button>
                </div>
            </form>
        </div>
    );
};