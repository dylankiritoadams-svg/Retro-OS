
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFileSystem } from '../../FileSystemContext';
import { useDocuments } from '../../DocumentContext';
import { GoogleGenAI, Type } from '@google/genai';
import type { VFSFile, BBSServerFile } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const BBSExchange: React.FC<AppProps> = ({ isActive }) => {
    const { findNodeByPath, getChildren, createFile } = useFileSystem();
    const { getDocument, createDocument } = useDocuments();

    const [status, setStatus] = useState<'offline' | 'connecting' | 'online' | 'transferring'>('offline');
    const [activeTab, setActiveTab] = useState<'public' | 'upload' | 'sync'>('public');
    const [baudRate, setBaudRate] = useState('2400');
    const [remoteFiles, setRemoteFiles] = useState<BBSServerFile[]>([]);
    const [transferProgress, setTransferProgress] = useState(0);
    const [transferMsg, setTransferMsg] = useState('');
    
    const [syncPacket, setSyncPacket] = useState('');
    const [receivePacket, setReceivePacket] = useState('');

    const localDocs = useMemo(() => {
        const docFolder = findNodeByPath('/Documents');
        if (docFolder) return getChildren(docFolder.id).filter(n => n.type === 'file') as VFSFile[];
        return [];
    }, [findNodeByPath, getChildren]);

    const connect = async () => {
        setStatus('connecting');
        setTimeout(async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: "List 6 creative retro computer files for a BBS file exchange. Include Name, Size (KB), short funny Description, Uploader handle, and Category. Return JSON format.",
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    name: { type: Type.STRING },
                                    size: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    uploader: { type: Type.STRING },
                                    category: { type: Type.STRING }
                                }
                            }
                        }
                    }
                });
                setRemoteFiles(JSON.parse(response.text || '[]'));
                setStatus('online');
            } catch (e) {
                console.error(e);
                setStatus('offline');
            }
        }, 1500);
    };

    const runTransferAnimation = (msg: string, callback: () => void) => {
        setStatus('transferring');
        setTransferMsg(msg);
        setTransferProgress(0);
        const interval = setInterval(() => {
            setTransferProgress(p => {
                if (p >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setStatus('online');
                        callback();
                    }, 500);
                    return 100;
                }
                return p + Math.random() * 15;
            });
        }, 150);
    };

    const handleDownload = (remote: BBSServerFile) => {
        runTransferAnimation(`RECEIVING: ${remote.name}`, () => {
            const networkFolder = findNodeByPath('/Network');
            if (networkFolder) {
                const content = `Downloaded from BBS: ${remote.description}\nUploader: ${remote.uploader}`;
                const newDoc = createDocument(remote.name, content, 'macwrite');
                createFile(remote.name, networkFolder.id, 'document', 'macwrite', newDoc.id);
            }
        });
    };

    const handleUpload = (file: VFSFile) => {
        runTransferAnimation(`UPLOADING: ${file.name}`, () => {
            // Simulated upload success
        });
    };

    const generateSyncPacket = (file: VFSFile) => {
        if (!file.contentId) return;
        const doc = getDocument(file.contentId);
        if (!doc) return;
        const packet = {
            v: 1,
            n: file.name,
            a: file.appId,
            c: doc.content
        };
        setSyncPacket(btoa(JSON.stringify(packet)));
    };

    const processSyncPacket = () => {
        if (!receivePacket) return;
        try {
            const decoded = JSON.parse(atob(receivePacket));
            runTransferAnimation(`SYNCING PACKET: ${decoded.n}`, () => {
                const networkFolder = findNodeByPath('/Network');
                if (networkFolder) {
                    const newDoc = createDocument(decoded.n, decoded.c, decoded.a);
                    createFile(decoded.n, networkFolder.id, 'document', decoded.a, newDoc.id);
                    setReceivePacket('');
                }
            });
        } catch (e) {
            alert("CORRUPTED SYNC PACKET DETECTED");
        }
    };

    const renderOffline = () => (
        <div className="flex-grow flex flex-col items-center justify-center p-8 space-y-6 text-green-500 bg-black font-mono border-2 border-green-900">
            <pre className="text-[8px] leading-[1] text-center mb-4">
{`
   _  _ ___ ___  ___ _  _   _   _  _  ___ ___ 
  | || | _ ) __|/ __| || | /_\\ | \\| |/ __| __|
  | __ | _ \\__ \\ (__| __ |/ _ \\| .  | (_ | _| 
  |_||_|___/___/\\___|_||_/_/ \\_\\_|\\_|\\___|___|
                                               
     GLOBAL FILE EXCHANGE SYNC PROTOCOL 1.1
`}
            </pre>
            <div className="flex items-center space-x-4">
                <label className="text-xs uppercase">Baud Rate:</label>
                <select 
                    value={baudRate} 
                    onChange={e => setBaudRate(e.target.value)}
                    className="bg-black border border-green-500 text-green-500 p-1 text-xs"
                >
                    <option>300</option><option>1200</option><option>2400</option><option>9600</option><option>14400</option>
                </select>
            </div>
            <button 
                onClick={connect}
                className="px-8 py-2 border-2 border-green-500 hover:bg-green-500 hover:text-black font-bold animate-pulse"
            >
                [ DIAL GLOBAL GATEWAY ]
            </button>
            <p className="text-[10px] opacity-60 italic uppercase tracking-widest">No active carrier detected...</p>
        </div>
    );

    const renderConnecting = () => (
        <div className="flex-grow flex flex-col items-center justify-center bg-black text-green-500 font-mono">
            <div className="text-sm space-y-1">
                <p>ATDT 0110-882-SYNC...</p>
                <p>CONNECTING AT {baudRate} BAUD...</p>
                <p>CARRIER DETECTED</p>
                <p>PROTOCOL HANDSHAKING...</p>
                <div className="w-48 h-2 border border-green-500 mt-4">
                    <div className="h-full bg-green-500 animate-[width_1.5s_linear_infinite]" style={{width: '30%'}}></div>
                </div>
            </div>
        </div>
    );

    const renderTransferring = () => (
        <div className="flex-grow flex flex-col items-center justify-center bg-black text-green-500 font-mono">
            <div className="w-80 border-2 border-green-500 p-4 bg-gray-900">
                <h3 className="text-sm font-bold mb-2 uppercase">{transferMsg}</h3>
                <div className="flex items-center space-x-2">
                    <div className="flex-grow h-4 border border-green-500">
                        <div className="h-full bg-green-500" style={{ width: `${transferProgress}%` }}></div>
                    </div>
                    <span className="text-xs">{Math.floor(transferProgress)}%</span>
                </div>
                <div className="mt-4 grid grid-cols-2 text-[10px] opacity-70">
                    <div>SPEED: {baudRate} BPS</div>
                    <div>ERROR CORRECTION: V.42bis</div>
                </div>
            </div>
        </div>
    );

    const renderOnline = () => (
        <div className="flex-grow flex flex-col bg-gray-900 text-green-400 font-mono">
            <header className="bg-black p-2 border-b border-green-800 flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                <div className="flex space-x-4">
                    <button onClick={() => setActiveTab('public')} className={activeTab === 'public' ? 'text-white' : 'hover:text-white'}>[ 1. Public Exchange ]</button>
                    <button onClick={() => setActiveTab('upload')} className={activeTab === 'upload' ? 'text-white' : 'hover:text-white'}>[ 2. Sync Local ]</button>
                    <button onClick={() => setActiveTab('sync')} className={activeTab === 'sync' ? 'text-white' : 'hover:text-white'}>[ 3. Peer Packet ]</button>
                </div>
                <button onClick={() => setStatus('offline')} className="text-red-500">[ HANG UP ]</button>
            </header>

            <main className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'public' && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold underline mb-4">GLOBAL GATEWAY // PUBLIC FILE AREA</h2>
                        <div className="grid grid-cols-1 gap-2">
                            {remoteFiles.map(rf => (
                                <div key={rf.id} className="border border-green-900 p-2 hover:bg-green-900/20 flex justify-between items-start group">
                                    <div className="flex-grow">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-white uppercase">{rf.name}</span>
                                            <span className="text-[9px] bg-green-900 px-1">{rf.category}</span>
                                        </div>
                                        <p className="text-[10px] opacity-60 mt-1">{rf.description}</p>
                                        <div className="text-[9px] mt-1 italic">Uploaded by: {rf.uploader} • {rf.size}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleDownload(rf)}
                                        className="text-[10px] border border-green-500 px-2 py-1 opacity-0 group-hover:opacity-100 bg-black hover:bg-green-500 hover:text-black transition-all"
                                    >
                                        DL_XMODEM
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold underline">MY ARCHIVE // UPLOAD QUEUE</h2>
                        {localDocs.length === 0 ? (
                            <p className="text-[10px] opacity-50 italic">No files in /Documents ready for sync.</p>
                        ) : (
                            localDocs.map(doc => (
                                <div key={doc.id} className="border border-green-900 p-2 flex justify-between items-center">
                                    <span className="text-xs uppercase">{doc.name}</span>
                                    <button 
                                        onClick={() => handleUpload(doc)}
                                        className="text-[10px] border border-green-500 px-2 py-1 bg-black hover:bg-green-500 hover:text-black uppercase"
                                    >
                                        Upload to BBS
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-sm font-bold underline mb-2">SEND PEER PACKET</h2>
                            <p className="text-[10px] mb-2 opacity-60">Generate a transfer code for a local file to share with another user.</p>
                            <select 
                                onChange={e => {
                                    const file = localDocs.find(f => f.id === e.target.value);
                                    if(file) generateSyncPacket(file);
                                }}
                                className="w-full bg-black border border-green-500 text-green-500 p-1 text-xs mb-2"
                            >
                                <option>-- Select File --</option>
                                {localDocs.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
                            </select>
                            {syncPacket && (
                                <div className="space-y-2">
                                    <textarea 
                                        readOnly 
                                        value={syncPacket}
                                        className="w-full h-20 bg-black border border-green-800 text-[8px] p-1 font-mono break-all focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(syncPacket); alert("Packet Copied!"); }}
                                        className="text-[10px] border border-green-500 px-3 py-1 bg-black hover:bg-green-500 hover:text-black"
                                    >
                                        COPY PACKET
                                    </button>
                                </div>
                            )}
                        </section>

                        <section className="border-t border-green-900 pt-6">
                            <h2 className="text-sm font-bold underline mb-2">RECEIVE PEER PACKET</h2>
                            <textarea 
                                placeholder="PASTE PACKET CODE HERE..."
                                value={receivePacket}
                                onChange={e => setReceivePacket(e.target.value)}
                                className="w-full h-20 bg-black border border-green-800 text-[8px] p-1 font-mono break-all focus:outline-none"
                            />
                            <button 
                                onClick={processSyncPacket}
                                disabled={!receivePacket}
                                className="mt-2 w-full text-[10px] border border-green-500 px-3 py-2 bg-black hover:bg-green-500 hover:text-black disabled:opacity-30"
                            >
                                START PACKET EXTRACTION
                            </button>
                        </section>
                    </div>
                )}
            </main>

            <footer className="p-1 bg-black border-t border-green-800 flex justify-between text-[8px] opacity-70">
                <span>ONLINE: 0:04:12</span>
                <span>CARRIER: G-SYNC (AUTO-SYNC ENABLED)</span>
            </footer>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col bg-black overflow-hidden select-none">
            {status === 'offline' && renderOffline()}
            {status === 'connecting' && renderConnecting()}
            {status === 'online' && renderOnline()}
            {status === 'transferring' && renderTransferring()}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #004400; }
                @keyframes width { 0% { width: 0%; } 100% { width: 100%; } }
            `}</style>
        </div>
    );
};
