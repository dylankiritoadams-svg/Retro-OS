import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

interface PlaylistItem {
    url: string;
    name: string;
}

export const MixTape: React.FC<AppProps> = () => {
    const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to clean up object URLs
    useEffect(() => {
        return () => {
            playlist.forEach(item => URL.revokeObjectURL(item.url));
        };
    }, [playlist]);

    const playTrack = useCallback((index: number) => {
        if (playlist[index] && audioRef.current) {
            (audioRef.current as HTMLAudioElement).src = playlist[index].url;
            (audioRef.current as HTMLAudioElement).play().then(() => {
                setCurrentTrackIndex(index);
                setIsPlaying(true);
            }).catch((error: any) => console.error("Error playing track:", error));
        }
    }, [playlist]);
    
    const handlePlayNext = useCallback(() => {
        if (currentTrackIndex !== null) {
            const nextIndex = (currentTrackIndex + 1) % playlist.length;
            playTrack(nextIndex);
        }
    }, [currentTrackIndex, playlist.length, playTrack]);

    // Effect for auto-play next track
    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement) {
            (audioElement as HTMLAudioElement).addEventListener('ended', handlePlayNext);
            return () => {
                (audioElement as HTMLAudioElement).removeEventListener('ended', handlePlayNext);
            };
        }
    }, [handlePlayNext]);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            const newPlaylist: PlaylistItem[] = Array.from(files).map((file: File) => ({
                url: URL.createObjectURL(file),
                name: file.name,
            }));
            setPlaylist(newPlaylist);
            // Start playing the first track
            if (newPlaylist.length > 0) {
                playTrack(0);
            }
        }
    };
    
    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                (audioRef.current as HTMLAudioElement).pause();
                setIsPlaying(false);
            } else if (currentTrackIndex !== null) {
                (audioRef.current as HTMLAudioElement).play();
                setIsPlaying(true);
            }
        }
    };

    const handlePlayPrev = () => {
        if (currentTrackIndex !== null) {
            const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            playTrack(prevIndex);
        }
    };

    const currentTrackName = currentTrackIndex !== null ? playlist[currentTrackIndex]?.name : 'No Music Loaded';

    return (
        <div className="w-full h-full flex bg-gray-400 text-black font-mono p-2 select-none">
             <audio ref={audioRef} />
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="audio/*"
                multiple
            />
            {/* Player Body */}
            <div className="w-2/3 bg-gray-300 border-2 border-black p-4 flex flex-col justify-between">
                <div>
                    <div className="bg-black text-green-400 p-2 text-center text-lg mb-4 h-12 flex items-center justify-center">
                        <p className="truncate">{currentTrackName}</p>
                    </div>
                    <div className="bg-gray-800 h-24 border-2 border-black flex items-center justify-center p-2">
                         <div className="w-1/3 h-full bg-black border border-gray-600 rounded-sm p-1">
                            <div className={`w-12 h-12 mx-auto bg-gray-700 rounded-full ${isPlaying ? 'animate-spin' : ''}`} style={{animationDuration: '2s'}}></div>
                         </div>
                         <div className="w-1/3 h-full bg-black border border-gray-600 rounded-sm p-1">
                            <div className={`w-12 h-12 mx-auto bg-gray-700 rounded-full ${isPlaying ? 'animate-spin' : ''}`} style={{animationDuration: '2s'}}></div>
                         </div>
                    </div>
                </div>
                <div className="flex items-center justify-around">
                    <button onClick={handlePlayPrev} className="px-4 py-2 bg-gray-200 border-2 border-black active:bg-gray-400">«</button>
                    <button onClick={togglePlayPause} className="px-6 py-3 bg-gray-200 border-2 border-black active:bg-gray-400 text-2xl">
                        {isPlaying ? '❚❚' : '▶'}
                    </button>
                    <button onClick={handlePlayNext} className="px-4 py-2 bg-gray-200 border-2 border-black active:bg-gray-400">»</button>
                </div>
            </div>

            {/* Playlist */}
            <div className="w-1/3 bg-gray-200 border-2 border-black border-l-0 flex flex-col">
                <h3 className="text-center font-bold p-2 bg-gray-300 border-b-2 border-black">Playlist</h3>
                <ul className="flex-grow overflow-y-auto">
                    {playlist.length > 0 ? (
                        playlist.map((item, index) => (
                            <li
                                key={index}
                                onClick={() => playTrack(index)}
                                className={`p-2 cursor-pointer text-sm truncate ${currentTrackIndex === index ? 'bg-black text-white' : 'hover:bg-gray-300'}`}
                            >
                                {item.name}
                            </li>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-600">
                            Click 'Load...' to add music.
                        </div>
                    )}
                </ul>
                <div className="p-2 border-t-2 border-black">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full p-2 bg-white border-2 border-black active:bg-gray-300">
                        Load...
                    </button>
                </div>
            </div>
        </div>
    );
};