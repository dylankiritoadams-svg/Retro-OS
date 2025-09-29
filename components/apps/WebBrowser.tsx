import React, { useState, useRef, useCallback, useEffect } from 'react';

const HOME_PAGE = 'about:blank';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  url?: string;
}

const ErrorDisplay = ({ url }: { url: string }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white text-black p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Connection Blocked</h2>
        <p className="mb-4">Could not connect to the requested page.</p>
        <p className="text-sm text-gray-600 mb-2">
            The site <strong className="font-mono">{url}</strong> may have refused the connection.
        </p>
        <p className="text-xs text-gray-500">
            Many websites (like Google, Wikipedia, etc.) use security policies that prevent them from being loaded inside other applications.
        </p>
    </div>
);

export const WebBrowser: React.FC<AppProps> = ({ isActive, instanceId, url: initialUrl }) => {
    const [history, setHistory] = useState<string[]>([initialUrl || HOME_PAGE]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [inputValue, setInputValue] = useState(initialUrl || HOME_PAGE);
    const [currentUrl, setCurrentUrl] = useState(initialUrl || HOME_PAGE);
    const [iframeError, setIframeError] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const initialLoad = useRef(true);

    const navigate = useCallback((url: string, addToHistory = true) => {
        let finalUrl = url.trim();
        if (!/^(https?:\/\/|about:)/.test(finalUrl)) {
            finalUrl = `https://${finalUrl}`;
        }
        
        setCurrentUrl('about:blank'); // Prevent flashing old content
        setIframeError(false);
        initialLoad.current = true;
        
        setTimeout(() => {
            setCurrentUrl(finalUrl);
            setInputValue(finalUrl);

            if (addToHistory) {
                const newHistory = history.slice(0, historyIndex + 1);
                newHistory.push(finalUrl);
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
            }
        }, 100);
    }, [history, historyIndex]);

    const handleBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            navigate(history[newIndex], false);
        }
    };

    const handleForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            navigate(history[newIndex], false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate(inputValue);
    };

    const handleIframeLoad = () => {
        if (initialLoad.current) {
            initialLoad.current = false;
            // A common trick to detect if an iframe was blocked by X-Frame-Options
            try {
                // This will throw an error if the iframe is cross-origin and blocked
                const canAccess = iframeRef.current?.contentWindow?.location.href;
                setIframeError(false);
            } catch (e) {
                if (currentUrl !== 'about:blank') {
                    setIframeError(true);
                }
            }
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-200 text-black">
            <header className="flex-shrink-0 p-1 bg-gray-300 border-b-2 border-black flex items-center space-x-1">
                <button onClick={handleBack} disabled={historyIndex === 0} className="px-2 border-2 border-black bg-white disabled:opacity-50">◀</button>
                <button onClick={handleForward} disabled={historyIndex === history.length - 1} className="px-2 border-2 border-black bg-white disabled:opacity-50">▶</button>
                <button onClick={() => navigate(currentUrl)} className="px-2 border-2 border-black bg-white">⟳</button>
                <form onSubmit={handleFormSubmit} className="flex-grow">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue((e.target as HTMLInputElement).value)}
                        className="w-full p-1 border-2 border-black bg-white focus:outline-none"
                    />
                </form>
            </header>
            <main className="flex-grow bg-white border-2 border-black m-1">
                {iframeError ? <ErrorDisplay url={currentUrl} /> : (
                    <iframe
                        ref={iframeRef}
                        src={currentUrl}
                        className="w-full h-full border-none"
                        title="Web Browser"
                        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
                        onLoad={handleIframeLoad}
                    />
                )}
            </main>
        </div>
    );
};