

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { globalEmitter } from '../../events';
import ePub from "epubjs";
import type { Book, Rendition } from 'epubjs';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const IReader: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileType, setFileType] = useState<'pdf' | 'epub' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [book, setBook] = useState<Book | null>(null);
    const [rendition, setRendition] = useState<Rendition | null>(null);
    const [location, setLocation] = useState<string>('');
    const [isBookMode, setIsBookMode] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Cleanup for the book instance
    useEffect(() => {
        return () => {
            if (book) {
                book.destroy();
            }
        };
    }, [book]);

    // Cleanup for the PDF file URL
    useEffect(() => {
        return () => {
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [fileUrl]);


    const handleOpenFileClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Clear previous state, which will trigger cleanup effects for old resources
        setError(null);
        setBook(null);
        setRendition(null);
        setFileUrl(null);
        setFileType(null);
        setLocation('');

        setFileName(file.name);

        if (file.type === 'application/pdf') {
            setFileType('pdf');
            const url = URL.createObjectURL(file);
            setFileUrl(url);
        } else if (file.type === 'application/epub+zip') {
            setFileType('epub');
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    const bookInstance = ePub(e.target.result as ArrayBuffer);
                    setBook(bookInstance);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            setError(`Unsupported file type: "${file.type}". Only PDF and ePub files are supported.`);
        }

        if (event.target) event.target.value = '';
    };

    // Main effect to manage the Rendition lifecycle
    useEffect(() => {
        if (!book || !viewerRef.current) {
            return;
        }

        const newRendition = book.renderTo(viewerRef.current, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            spread: "auto",
        });

        setRendition(newRendition); // Set state immediately for nav functions

        newRendition.display().then(() => {
            // Locations can be loaded after display
            book.ready.then(() => {
                return book.locations.generate(1650);
            }).then((generatedLocations) => {
                const updateLocationPercentage = (locationObject: any) => {
                     if (book.locations && generatedLocations && generatedLocations.length > 0 && locationObject?.start?.cfi) {
                        try {
                            const percentage = book.locations.percentageFromCfi(locationObject.start.cfi);
                            setLocation(`${Math.round(percentage * 100)}%`);
                        } catch (e) {
                            console.error("ePub percentage calculation error:", e);
                        }
                    }
                };
                
                newRendition.on('relocated', updateLocationPercentage);
                updateLocationPercentage(newRendition.currentLocation());
            });
        }).catch((err: Error) => {
            console.error("EPUB display error:", err);
            setError("Failed to display the ePub file. It might be corrupted.");
        });

        // This cleanup function runs when the dependencies [book, isBookMode] change.
        return () => {
            if (newRendition) {
                newRendition.destroy();
            }
            if (viewerRef.current) {
                viewerRef.current.innerHTML = '';
            }
            setRendition(null);
            setLocation('');
        };
    }, [book, isBookMode]);

    const nextPage = useCallback(() => rendition?.next(), [rendition]);
    const prevPage = useCallback(() => rendition?.prev(), [rendition]);
    const toggleBookMode = useCallback(() => setIsBookMode(prev => !prev), []);

    // Listen for global menu events
    useEffect(() => {
        if (!isActive) return;
        const openHandler = (data: { instanceId: string }) => {
            if (data.instanceId === instanceId) handleOpenFileClick();
        };
        const toggleHandler = (data: { instanceId: string }) => {
            if (data.instanceId === instanceId) toggleBookMode();
        };

        globalEmitter.subscribe('ireader:file:open', openHandler);
        globalEmitter.subscribe('ireader:view:toggle-book-mode', toggleHandler);

        return () => {
            globalEmitter.unsubscribe('ireader:file:open', openHandler);
            globalEmitter.unsubscribe('ireader:view:toggle-book-mode', toggleHandler);
        };
    }, [isActive, instanceId, handleOpenFileClick, toggleBookMode]);

    if (isBookMode && fileType === 'epub') {
        return (
            <div className="w-full h-full flex flex-col bg-[#f5f5dc]">
                <main className="flex-grow relative p-8 shadow-inner overflow-hidden">
                    <div ref={viewerRef} className="w-full h-full" />
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center">
                        <button onClick={prevPage} className="w-1/5 h-full text-4xl text-transparent hover:text-black hover:bg-black/10 transition-colors">‹</button>
                        <button onClick={nextPage} className="w-1/5 h-full text-4xl text-transparent hover:text-black hover:bg-black/10 transition-colors">›</button>
                    </div>
                </main>
                <footer className="flex-shrink-0 flex justify-between items-center text-sm p-2 border-t border-gray-300 font-serif text-gray-700">
                    <button onClick={toggleBookMode} className="px-2 py-0.5 border border-gray-500 bg-gray-200 rounded-sm">Exit Book Mode</button>
                    <span className="truncate max-w-[60%]">{fileName}</span>
                    <span>{location}</span>
                </footer>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full flex flex-col bg-gray-200 text-black">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf,.epub"
            />
            <header className="flex-shrink-0 p-1 bg-gray-300 border-b-2 border-black flex items-center justify-between">
                <button 
                    onClick={handleOpenFileClick} 
                    className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200"
                >
                    Open File...
                </button>
                <span className="text-sm truncate px-4">{fileName || 'No file selected'}</span>
                <button 
                    onClick={toggleBookMode}
                    disabled={fileType !== 'epub'}
                    className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 disabled:opacity-50"
                >
                    Book Mode
                </button>
            </header>
            <main className="flex-grow bg-gray-500">
                {error && (
                    <div className="w-full h-full flex items-center justify-center text-center p-4 text-red-700 bg-red-100">
                        <p>{error}</p>
                    </div>
                )}
                {!error && fileUrl && fileType === 'pdf' && (
                    <iframe 
                        src={fileUrl} 
                        className="w-full h-full border-none" 
                        title={fileName || 'File Viewer'}
                    ></iframe>
                )}
                 {!error && fileType === 'epub' && (
                    <div ref={viewerRef} className="w-full h-full bg-white" />
                )}
                {!error && !fileType && (
                    <div className="w-full h-full flex items-center justify-center text-center p-4 text-gray-700">
                        <p>Click "Open File..." to view a local PDF or ePub document.</p>
                    </div>
                )}
            </main>
        </div>
    );
};