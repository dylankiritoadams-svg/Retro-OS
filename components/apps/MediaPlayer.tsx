import React, { useState, useRef, useEffect } from 'react';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const MediaPlayer: React.FC<AppProps> = () => {
    const [mediaSource, setMediaSource] = useState<{ url: string; type: 'video' | 'audio'; name: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const currentUrl = mediaSource?.url;
        return () => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [mediaSource?.url]);

    useEffect(() => {
        const mediaElement = mediaSource?.type === 'video' ? videoRef.current : audioRef.current;

        if (mediaElement && mediaSource) {
            const handleCanPlay = () => {
                const playPromise = (mediaElement as HTMLMediaElement).play();
                if (playPromise !== undefined) {
                    playPromise.catch((err: Error) => {
                        console.error("Error attempting to play media:", err);
                        setError("Could not play the file. It might be corrupted or in an unsupported format.");
                        setMediaSource(null);
                    });
                }
            };
            
            const handleError = () => {
                 setError(`Error: The media file could not be loaded. It may be an unsupported format or corrupted.`);
                 setMediaSource(null);
            };

            (mediaElement as HTMLMediaElement).addEventListener('canplay', handleCanPlay);
            (mediaElement as HTMLMediaElement).addEventListener('error', handleError);

            return () => {
                (mediaElement as HTMLMediaElement).removeEventListener('canplay', handleCanPlay);
                (mediaElement as HTMLMediaElement).removeEventListener('error', handleError);
            };
        }
    }, [mediaSource]);

    const handleOpenFileClick = () => {
        (fileInputRef.current as HTMLInputElement)?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        setMediaSource(null);
        setError(null);
        
        const fileType = file.type.split('/')[0];
        if (fileType !== 'video' && fileType !== 'audio') {
            setError(`Unsupported file type: ${file.type}. Please select a standard video or audio file.`);
            return;
        }

        const url = URL.createObjectURL(file);
        setMediaSource({ url, type: fileType as 'video' | 'audio', name: file.name });
        
        if(event.target) (event.target as HTMLInputElement).value = '';
    };

    return (
        <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center font-mono">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="video/mp4,video/webm,video/ogg,audio/mpeg,audio/ogg,audio/wav"
            />
            
            {error && (
                 <div className="text-center p-4">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={handleOpenFileClick}
                        className="px-4 py-2 bg-gray-700 border-2 border-gray-500 hover:bg-gray-600 active:bg-gray-800"
                    >
                        Try Another File...
                    </button>
                </div>
            )}
            
            {!error && !mediaSource && (
                <div className="text-center">
                    <p className="text-gray-400 mb-4">No Media Loaded</p>
                    <button
                        onClick={handleOpenFileClick}
                        className="px-4 py-2 bg-gray-700 border-2 border-gray-500 hover:bg-gray-600 active:bg-gray-800"
                    >
                        Open File...
                    </button>
                     <p className="text-xs text-gray-500 mt-4 max-w-sm">Supports standard formats like MP4, WebM, MP3, etc.</p>
                </div>
            )}

            {!error && mediaSource && (
                <div className="w-full h-full flex flex-col">
                    <div className="flex-grow flex items-center justify-center p-2">
                        {mediaSource.type === 'video' ? (
                            <video 
                                key={mediaSource.url}
                                ref={videoRef}
                                src={mediaSource.url}
                                controls
                                className="max-w-full max-h-full" 
                            />
                        ) : (
                            <div className="flex flex-col items-center">
                                <p className="text-lg mb-4">Now Playing</p>
                                <audio 
                                    key={mediaSource.url}
                                    ref={audioRef}
                                    src={mediaSource.url}
                                    controls 
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0 bg-gray-800 p-2 text-center text-sm truncate border-t-2 border-gray-600">
                        <p>Now Playing: {mediaSource.name}</p>
                         <button onClick={handleOpenFileClick} className="text-blue-400 hover:underline mt-1">
                            Load another file
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};