import React, { useState, useRef, useCallback, useEffect } from 'react';

const HOME_PAGE = 'about:blank';

interface AppProps {
  isActive: boolean;
  instanceId: string;
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

export const WebBrowser: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const [history, setHistory] = useState<string[]>([HOME_PAGE]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [currentUrl, setCurrentUrl] = useState(HOME_PAGE);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const navigate = useCallback((url: string) => {
        setIsLoading(true);
        setLoadError(null);
        setCurrentUrl(url);

        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            if (newHistory[newHistory.length - 1] !== url) {
                newHistory.push(url);
                setHistoryIndex(newHistory.length - 1);
            }
            return newHistory;
        });
    }, [historyIndex]);

    const handleGo = () => {
        let url = inputValue.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('about:')) {
            url = 'https://' + url;
        }
        setInputValue(url);
        navigate(url);
    };

    const handleBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const newUrl = history[newIndex];
            setInputValue(newUrl);
            setCurrentUrl(newUrl);
            setLoadError(null);
        }
    };

    const handleForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const newUrl = history[newIndex];
            setInputValue(newUrl);
            setCurrentUrl(newUrl);
            setLoadError(null);
        }
    };
    
    const handleHome = () => {
        setInputValue('');
        navigate(HOME_PAGE);
    };

    const handleIframeLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if(isLoading) {
            const timer = setTimeout(() => {
                 if(isLoading) {
                    setIsLoading(false);
                    setLoadError(currentUrl);
                 }
            }, 8000); // 8 second timeout
            
            return () => clearTimeout(timer);
        }
    }, [isLoading, currentUrl]);
    
    useEffect(() => {
        setInputValue(currentUrl === HOME_PAGE ? '' : currentUrl);
    }, [currentUrl]);

    const statusText = isLoading ? `Loading ${currentUrl}...` : (loadError ? `Failed to load ${loadError}` : `Viewing ${currentUrl === HOME_PAGE ? "Home" : currentUrl}`);

    return (
        <div className="w-full h-full flex flex-col bg-gray-200 text-black">
            <div className="flex items-center space-x-1 p-1 border-b-2 border-black bg-white">
                <button onClick={handleBack} disabled={historyIndex <= 0} className="px-2 py-0.5 border-2 border-black bg-white active:bg-gray-200 disabled:opacity-50">&lt;</button>
                <button onClick={handleForward} disabled={historyIndex >= history.length - 1} className="px-2 py-0.5 border-2 border-black bg-white active:bg-gray-200 disabled:opacity-50">&gt;</button>
                 <button onClick={handleHome} className="px-2 py-0.5 border-2 border-black bg-white active:bg-gray-200">Home</button>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGo()}
                    className="flex-grow p-1 border-2 border-black bg-white focus:outline-none"
                    placeholder="https://..."
                />
                <button onClick={handleGo} className="px-3 py-1 border-2 border-black bg-white active:bg-gray-200">Go</button>
            </div>
            
            <div className="flex-grow bg-white border-2 border-black border-t-0 border-b-0 m-1 relative">
                {loadError && <ErrorDisplay url={loadError} />}
                <iframe
                    ref={iframeRef}
                    src={currentUrl}
                    className="w-full h-full border-0"
                    title="Web Stalker Browser"
                    onLoad={handleIframeLoad}
                    style={{ visibility: loadError ? 'hidden' : 'visible' }}
                    sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                />
            </div>

            <div className="p-1 border-t-2 border-black bg-white text-xs truncate">
                {statusText}
            </div>
        </div>
    );
};