
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDocuments } from '../../DocumentContext';
import * as gemini from '../../services/geminiService';
import { globalEmitter } from '../../events';
import { useFileSystem } from '../../FileSystemContext';
import { useApp } from '../../App';
import type {
    AppDocument,
    CampaignDocumentContent,
    CampaignNpc,
    CampaignPc,
    CampaignLocation,
    CampaignFaction,
    CampaignItem,
    CampaignSession,
    CampaignStoryArc,
    CampaignEntity,
    CampaignWikiPage,
    CampaignBoard,
    BoardState,
    AnyBoardNode,
    BoardLoreNode,
    BoardStoryArcNode,
    BoardNoteNode,
    BoardSide,
} from '../../types';

const APP_ID = 'campaign-weaver';

const getEmptyCampaign = (): CampaignDocumentContent => ({
    npcs: [], pcs: [], locations: [], factions: [], items: [], storyArcs: [], sessions: [],
    boards: [], wikiPages: [],
    linkedDocumentIds: [],
});

// --- HELPER & UI COMPONENTS ---

const LinkedTextarea: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; onLinkClick: (name: string, type: string) => void }> = ({ label, value, onChange, onLinkClick }) => {
    const renderTextWithLinks = (text: string) => {
        const safeText = text ?? '';
        const regex = /\[\[(.*?)\]\]/g;
        const parts = safeText.split(regex);
        return parts.map((part, index) =>
            index % 2 === 1
                ? <button key={index} onClick={() => onLinkClick(part, 'any')} className="text-blue-500 hover:underline">{part}</button>
                : <span key={index}>{part}</span>
        );
    };

    return (
        <div>
            <label className="block text-sm font-bold mb-1">{label}</label>
            <textarea value={value ?? ''} onChange={onChange} className="w-full p-1 border-2 border-black bg-white" rows={4} />
            <div className="p-2 border-2 border-black border-t-0 bg-gray-100 min-h-[60px] whitespace-pre-wrap text-sm">{renderTextWithLinks(value)}</div>
        </div>
    );
};

const GeneratorComponent: React.FC<{ title: string; onGenerate: (prompt: string) => Promise<any>; onSuccess: (data: any) => void; placeholder: string; }> = ({ title, onGenerate, onSuccess, placeholder }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        try {
            const data = await onGenerate(prompt);
            onSuccess(data);
            setPrompt('');
        } catch (error) { console.error("AI Generation Error:", error); }
        finally { setIsLoading(false); }
    };

    return (
        <div className="p-2 border-2 border-dashed border-gray-400 mt-4">
            <h4 className="text-sm font-bold mb-2">{title}</h4>
            <div className="flex space-x-2">
                <input type="text" value={prompt} onChange={e => setPrompt((e.target as HTMLInputElement).value)} placeholder={placeholder} className="flex-grow p-1 border-2 border-black" />
                <button onClick={handleGenerate} disabled={isLoading} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 disabled:opacity-50">{isLoading ? '...' : 'Generate'}</button>
            </div>
        </div>
    );
};

// --- INDIVIDUAL VIEWS ---

interface ViewProps<T extends CampaignEntity> {
    items: T[];
    onUpdate: (id: string, data: Partial<T>) => void;
    onAdd: () => void;
    onDelete: (id: string) => void;
    onLinkClick: (name: string, type: string) => void;
    renderEditorPanel: (item: T, onUpdate: (data: Partial<T>) => void, onLinkClick: (name: string, type: string) => void) => React.ReactNode;
    title: string;
}

const GenericView = <T extends CampaignEntity>({ items, onUpdate, onAdd, onDelete, onLinkClick, renderEditorPanel, title }: ViewProps<T>) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (selectedId && !items.find(item => item.id === selectedId)) {
            setSelectedId(null);
        }
    }, [items, selectedId]);

    const selectedItem = useMemo(() => items.find(item => item.id === selectedId), [items, selectedId]);

    return (
        <div className="flex h-full">
            <div className="w-1/3 border-r-2 border-black flex flex-col">
                <ul className="flex-grow overflow-y-auto">
                    {items.map(item => (
                        <li key={item.id} className={`p-2 cursor-pointer ${selectedId === item.id ? 'bg-black text-white' : 'hover:bg-gray-200'}`} onClick={() => setSelectedId(item.id)}>
                            {item.name || `Untitled ${title.slice(0, -1)}`}
                        </li>
                    ))}
                </ul>
                <div className="p-2 border-t-2 border-black flex">
                    <button onClick={onAdd} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 w-full mr-1">Add New</button>
                    <button onClick={() => selectedId && onDelete(selectedId)} disabled={!selectedId} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 disabled:opacity-50">Delete</button>
                </div>
            </div>
            <div className="w-2/3 p-4 overflow-y-auto">
                {selectedItem ? renderEditorPanel(selectedItem, (data) => onUpdate(selectedItem.id, data), onLinkClick) : <div className="text-center text-gray-500">Select an item to view or edit.</div>}
            </div>
        </div>
    );
};

const WikiEditorPanel: React.FC<{ item: CampaignWikiPage; onUpdate: (data: Partial<CampaignWikiPage>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
    <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="Article Title" />
        <LinkedTextarea label="Content" value={item.content} onChange={e => onUpdate({ content: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
    </div>
);

const WikiView: React.FC<{ items: CampaignWikiPage[]; onUpdate: (id: string, data: Partial<CampaignWikiPage>) => void; onAdd: () => void; onDelete: (id: string) => void; }> = ({ items, onUpdate, onAdd, onDelete }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedId || !items.find(item => item.id === selectedId)) {
            setSelectedId(items[0]?.id || null);
        }
    }, [items, selectedId]);

    const handleLinkClick = (name: string) => {
        const targetPage = items.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (targetPage) {
            setSelectedId(targetPage.id);
        }
    };

    const selectedItem = useMemo(() => items.find(item => item.id === selectedId), [items, selectedId]);

    return (
        <div className="flex h-full">
            <div className="w-1/3 border-r-2 border-black flex flex-col">
                <ul className="flex-grow overflow-y-auto">
                    {items.map(item => (
                        <li key={item.id} className={`p-2 cursor-pointer ${selectedId === item.id ? 'bg-black text-white' : 'hover:bg-gray-200'}`} onClick={() => setSelectedId(item.id)}>
                            {item.name || 'Untitled Page'}
                        </li>
                    ))}
                </ul>
                <div className="p-2 border-t-2 border-black flex">
                    <button onClick={onAdd} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 w-full mr-1">Add New</button>
                    <button onClick={() => selectedId && onDelete(selectedId)} disabled={!selectedId} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 disabled:opacity-50">Delete</button>
                </div>
            </div>
            <div className="w-2/3 p-4 overflow-y-auto">
                {selectedItem ? <WikiEditorPanel item={selectedItem} onUpdate={(data) => onUpdate(selectedItem.id, data)} onLinkClick={handleLinkClick} /> : <div className="text-center text-gray-500">Select an item to view or edit.</div>}
            </div>
        </div>
    );
};

const NpcEditorPanel: React.FC<{ item: CampaignNpc; onUpdate: (data: Partial<CampaignNpc>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
    <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="NPC Name" />
        <LinkedTextarea label="Description" value={item.description} onChange={e => onUpdate({ description: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Secrets" value={item.secrets} onChange={e => onUpdate({ secrets: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <GeneratorComponent title="Generate with AI" onGenerate={gemini.generateNpc} onSuccess={onUpdate} placeholder="e.g., a grumpy dwarven blacksmith" />
    </div>
);

const LocationEditorPanel: React.FC<{ item: CampaignLocation; onUpdate: (data: Partial<CampaignLocation>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
    <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="Location Name" />
        <LinkedTextarea label="Description" value={item.description} onChange={e => onUpdate({ description: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <GeneratorComponent title="Generate with AI" onGenerate={gemini.generateLocation} onSuccess={onUpdate} placeholder="e.g., a haunted forest library" />
    </div>
);

const FactionEditorPanel: React.FC<{ item: CampaignFaction; onUpdate: (data: Partial<CampaignFaction>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
    <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="Faction Name" />
        <LinkedTextarea label="Goals" value={item.goals} onChange={e => onUpdate({ goals: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Resources" value={item.resources} onChange={e => onUpdate({ resources: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <GeneratorComponent title="Generate with AI" onGenerate={gemini.generateFaction} onSuccess={onUpdate} placeholder="e.g., a shadowy thieves' guild" />
    </div>
);

const ItemEditorPanel: React.FC<{ item: CampaignItem; onUpdate: (data: Partial<CampaignItem>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
    <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="Item Name" />
        <LinkedTextarea label="Description" value={item.description} onChange={e => onUpdate({ description: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Properties" value={item.properties} onChange={e => onUpdate({ properties: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <GeneratorComponent title="Generate with AI" onGenerate={gemini.generateItem} onSuccess={onUpdate} placeholder="e.g., a sword that glows near goblins" />
    </div>
);

const StoryArcEditorPanel: React.FC<{ item: CampaignStoryArc; onUpdate: (data: Partial<CampaignStoryArc>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
     <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="Story Arc Name" />
        <LinkedTextarea label="Summary" value={item.summary} onChange={e => onUpdate({ summary: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Key Events" value={item.keyEvents} onChange={e => onUpdate({ keyEvents: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Linked Lore" value={item.linkedLore} onChange={e => onUpdate({ linkedLore: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Resolution" value={item.resolution} onChange={e => onUpdate({ resolution: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <GeneratorComponent title="Generate with AI" onGenerate={gemini.generateStoryArc} onSuccess={onUpdate} placeholder="e.g., the search for a lost artifact" />
    </div>
);

const SessionEditorPanel: React.FC<{ item: CampaignSession; onUpdate: (data: Partial<CampaignSession>) => void; onLinkClick: (name: string, type: string) => void }> = ({ item, onUpdate, onLinkClick }) => (
     <div className="space-y-4">
        <input type="text" value={item.name} onChange={e => onUpdate({ name: (e.target as HTMLInputElement).value })} className="w-full p-1 text-xl font-bold border-2 border-black" placeholder="Session Name" />
        <LinkedTextarea label="Summary" value={item.summary} onChange={e => onUpdate({ summary: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Planned Events" value={item.plannedEvents} onChange={e => onUpdate({ plannedEvents: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Linked Lore" value={item.linkedLore} onChange={e => onUpdate({ linkedLore: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <LinkedTextarea label="Post-Session Notes" value={item.postSessionNotes} onChange={e => onUpdate({ postSessionNotes: (e.target as HTMLTextAreaElement).value })} onLinkClick={onLinkClick} />
        <GeneratorComponent title="Generate with AI" onGenerate={gemini.generateSessionOutline} onSuccess={onUpdate} placeholder="e.g., a heist in the capital city" />
    </div>
);

// --- BOARD VIEW ---

const BoardNode: React.FC<{ node: AnyBoardNode, onDragStart: (e: React.MouseEvent, id: string) => void }> = ({ node, onDragStart }) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        border: '1px solid black',
        cursor: 'move'
    };
    
    if (node.type === 'note') {
        style.backgroundColor = node.color;
        return <div style={style} onMouseDown={e => onDragStart(e, node.id)} className="p-2 whitespace-pre-wrap overflow-hidden">{node.content}</div>
    }
    
    if (node.type === 'arc') {
        style.backgroundColor = node.color;
        return <div style={style} onMouseDown={e => onDragStart(e, node.id)} className="p-2 font-bold text-center flex items-center justify-center">{node.entityType}</div>
    }
    
    if (node.type === 'lore') {
        style.backgroundColor = node.color || '#eee';
        return <div style={style} onMouseDown={e => onDragStart(e, node.id)} className="p-2 text-center flex items-center justify-center">{node.entityType}</div>
    }

    return null;
}

const BoardCanvas: React.FC<{ boardState: BoardState, setBoardState: React.Dispatch<React.SetStateAction<BoardState>> }> = ({ boardState, setBoardState }) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [draggedNode, setDraggedNode] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        const node = boardState.nodes.find(n => n.id === id);
        if (!node) return;
        const offsetX = e.clientX / boardState.viewport.zoom - node.x;
        const offsetY = e.clientY / boardState.viewport.zoom - node.y;
        setDraggedNode({ id, offsetX, offsetY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggedNode) return;
        const newX = e.clientX / boardState.viewport.zoom - draggedNode.offsetX;
        const newY = e.clientY / boardState.viewport.zoom - draggedNode.offsetY;
        setBoardState(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === draggedNode.id ? { ...n, x: newX, y: newY } : n)
        }));
    };

    const handleMouseUp = () => {
        setDraggedNode(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const entityType = (e.dataTransfer as any).getData('campaign/entity-type');
        const entityId = (e.dataTransfer as any).getData('campaign/entity-id');

        if (!entityType || !entityId) return;

        const canvas = boardRef.current;
        if (!canvas) return;
        const rect = (canvas as any).getBoundingClientRect();
        const dropX = (e.clientX - rect.left) / boardState.viewport.zoom - boardState.viewport.x;
        const dropY = (e.clientY - rect.top) / boardState.viewport.zoom - boardState.viewport.y;
        
        // Using an IIFE to ensure TypeScript can correctly infer the discriminated union type
        const finalNewNode = ((): AnyBoardNode => {
            const baseNode = { id: `node-${Date.now()}`, x: dropX, y: dropY };
            if (entityType === 'storyArc') {
                return {
                    ...baseNode,
                    type: 'arc',
                    entityId: entityId,
                    entityType: 'storyArc',
                    color: '#ff6347',
                    width: 200,
                    height: 80,
                };
            } else if (entityType === 'note') {
                return {
                    ...baseNode,
                    type: 'note',
                    content: entityId, // For notes, the "id" is the content
                    color: '#fff9c4',
                    width: 150,
                    height: 100,
                };
            } else { // lore
                return {
                    ...baseNode,
                    type: 'lore',
                    entityId: entityId,
                    entityType: entityType as 'npc' | 'pc' | 'location' | 'faction' | 'item',
                    width: 150,
                    height: 60,
                };
            }
        })();

        setBoardState(prev => ({
            ...prev,
            nodes: [...prev.nodes, finalNewNode],
        }));
    };
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div 
            ref={boardRef}
            className="w-full h-full bg-gray-300 overflow-hidden relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div 
                className="absolute"
                style={{ transform: `translate(${boardState.viewport.x}px, ${boardState.viewport.y}px) scale(${boardState.viewport.zoom})`, transformOrigin: 'top left' }}
            >
                {boardState.nodes.map(node => (
                    <BoardNode key={node.id} node={node} onDragStart={handleMouseDown} />
                ))}
            </div>
        </div>
    )
};

const BoardView: React.FC<{ 
    boards: CampaignBoard[],
    campaign: CampaignDocumentContent,
    onUpdateBoard: (id: string, data: Partial<CampaignBoard>) => void,
    onAddBoard: () => void,
    onDeleteBoard: (id: string) => void,
}> = ({ boards, campaign, onUpdateBoard, onAddBoard, onDeleteBoard }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedBoard = useMemo(() => boards.find(b => b.id === selectedId), [boards, selectedId]);

    const setBoardState = (state: React.SetStateAction<BoardState>) => {
        if (selectedId) {
            onUpdateBoard(selectedId, {
                boardState: typeof state === 'function' ? state(selectedBoard!.boardState) : state,
            });
        }
    };
    
    const handleDragStart = (e: React.DragEvent, entityType: string, entityId: string, entityName: string) => {
        (e.dataTransfer as any).setData('campaign/entity-type', entityType);
        (e.dataTransfer as any).setData('campaign/entity-id', entityId);
        (e.dataTransfer as any).setData('campaign/entity-name', entityName);
    };

    return (
        <div className="flex h-full">
            <div className="w-1/3 border-r-2 border-black flex flex-col">
                {/* Entity list */}
                <div className="flex-grow overflow-y-auto">
                    <h3 className="font-bold p-2 bg-gray-200">Story Arcs</h3>
                    {campaign.storyArcs.map(a => <div key={a.id} draggable onDragStart={e => handleDragStart(e, 'storyArc', a.id, a.name)} className="p-1 hover:bg-gray-100 cursor-grab">{a.name}</div>)}
                     <h3 className="font-bold p-2 bg-gray-200">NPCs</h3>
                    {campaign.npcs.map(n => <div key={n.id} draggable onDragStart={e => handleDragStart(e, 'npc', n.id, n.name)} className="p-1 hover:bg-gray-100 cursor-grab">{n.name}</div>)}
                     <h3 className="font-bold p-2 bg-gray-200">Locations</h3>
                    {campaign.locations.map(l => <div key={l.id} draggable onDragStart={e => handleDragStart(e, 'location', l.id, l.name)} className="p-1 hover:bg-gray-100 cursor-grab">{l.name}</div>)}
                </div>
                {/* Board list */}
                <div className="border-t-2 border-black flex-shrink-0">
                    <ul className="max-h-48 overflow-y-auto">
                         {boards.map(board => (
                            <li key={board.id} className={`p-2 cursor-pointer ${selectedId === board.id ? 'bg-black text-white' : 'hover:bg-gray-200'}`} onClick={() => setSelectedId(board.id)}>
                                {board.name || `Untitled Board`}
                            </li>
                        ))}
                    </ul>
                     <div className="p-2 border-t-2 border-black flex">
                        <button onClick={onAddBoard} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 w-full mr-1">New Board</button>
                        <button onClick={() => selectedId && onDeleteBoard(selectedId)} disabled={!selectedId} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 disabled:opacity-50">Delete</button>
                    </div>
                </div>
            </div>
            <div className="w-2/3">
                 {selectedBoard ? <BoardCanvas boardState={selectedBoard.boardState} setBoardState={setBoardState} /> : <div className="text-center text-gray-500 p-8">Select or create a board to begin.</div>}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
type MainView = 'npcs' | 'pcs' | 'locations' | 'factions' | 'items' | 'storyArcs' | 'sessions' | 'boards' | 'wiki';

export const CampaignWeaver: React.FC<{ instanceId: string, documentIdToOpen?: string }> = ({ instanceId, documentIdToOpen }) => {
    const { getDocument, createDocument, updateDocument, getDocumentsByApp } = useDocuments();
    const { findNodeByPath, createFile } = useFileSystem();
    const { openApp } = useApp();

    const [activeDocument, setActiveDocument] = useState<AppDocument | null>(null);
    const [campaign, setCampaign] = useState<CampaignDocumentContent>(getEmptyCampaign());
    const [isDirty, setIsDirty] = useState(false);
    const [view, setView] = useState<MainView>('npcs');
    
    const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
    const [isOpenFileModalOpen, setIsOpenFileModalOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const appDocuments = getDocumentsByApp(APP_ID);

    const loadContent = useCallback((content: any) => {
        if (content && typeof content === 'object') {
            const mergedContent = { ...getEmptyCampaign(), ...content };
            setCampaign(mergedContent);
            setIsDirty(false);
        }
    }, []);

    useEffect(() => {
        if (documentIdToOpen) {
            const doc = getDocument(documentIdToOpen);
            if (doc && doc.appId === APP_ID) {
                setActiveDocument(doc);
                loadContent(doc.content);
            }
        }
    }, [documentIdToOpen, getDocument, loadContent]);
    
    const updateCampaign = useCallback((newCampaignData: Partial<CampaignDocumentContent>) => {
        setCampaign(prev => ({ ...prev, ...newCampaignData }));
        setIsDirty(true);
    }, []);

    const handleUpdate = <T extends CampaignEntity>(key: keyof CampaignDocumentContent, id: string, data: Partial<T>) => {
        updateCampaign({
            [key]: ((campaign[key] as unknown as T[]).map(item => item.id === id ? { ...item, ...data } : item))
        });
    };

    const handleAdd = (key: keyof CampaignDocumentContent) => {
        const baseItem = { id: `${key}-${Date.now()}`, name: '' };
        let newItem: CampaignEntity = baseItem;

        switch (key) {
            case 'npcs':
                newItem = { ...baseItem, name: 'New NPC', description: '', secrets: '' } as CampaignNpc;
                break;
            case 'locations':
                newItem = { ...baseItem, name: 'New Location', description: '' } as CampaignLocation;
                break;
            case 'factions':
                newItem = { ...baseItem, name: 'New Faction', goals: '', resources: '' } as CampaignFaction;
                break;
            case 'items':
                newItem = { ...baseItem, name: 'New Item', description: '', properties: '' } as CampaignItem;
                break;
            case 'storyArcs':
                newItem = { ...baseItem, name: 'New Story Arc', summary: '', keyEvents: '', linkedLore: '', resolution: '' } as CampaignStoryArc;
                break;
            case 'sessions':
                newItem = { ...baseItem, name: 'New Session', summary: '', plannedEvents: '', linkedLore: '', postSessionNotes: '' } as CampaignSession;
                break;
            case 'wikiPages':
                newItem = { ...baseItem, name: 'New Wiki Page', content: '' } as CampaignWikiPage;
                break;
            case 'boards':
                newItem = { ...baseItem, name: 'New Board', boardState: { nodes: [], connections: [], viewport: { x: 0, y: 0, zoom: 1 } } } as CampaignBoard;
                break;
            default:
                // This will handle 'pcs' which just needs id and name.
                break;
        }
        updateCampaign({ [key]: [...(campaign[key] as any[]), newItem] });
    };

    const handleDelete = (key: keyof CampaignDocumentContent, id: string) => {
        updateCampaign({ [key]: (campaign[key] as any[]).filter(item => item.id !== id) });
    };

    const handleLinkClick = (name: string, type: string) => {
        // Simple implementation: just log it for now
        console.log(`Link clicked: ${name} (type: ${type})`);
    };

    const handleNew = useCallback(() => {
        setCampaign(getEmptyCampaign());
        setActiveDocument(null);
        setIsDirty(false);
    }, []);

    const handleSave = useCallback(() => {
        if (activeDocument) {
            updateDocument(activeDocument.id, activeDocument.name, campaign);
            setIsDirty(false);
        } else {
            setSaveAsName('Untitled Campaign');
            setIsSaveAsModalOpen(true);
        }
    }, [activeDocument, campaign, updateDocument]);
    
    const handleSaveAs = useCallback(() => {
        setSaveAsName(activeDocument?.name || 'Untitled Campaign');
        setIsSaveAsModalOpen(true);
    }, [activeDocument]);

    const confirmSaveAs = useCallback(() => {
        if (!saveAsName.trim()) return;
        const newDoc = createDocument(saveAsName, campaign, APP_ID);
        
        const documentsFolder = findNodeByPath('/Documents');
        if (documentsFolder) {
            createFile(saveAsName, documentsFolder.id, 'document', APP_ID, newDoc.id);
        }

        setActiveDocument(newDoc);
        setIsDirty(false);
        setIsSaveAsModalOpen(false);
    }, [saveAsName, campaign, createDocument, findNodeByPath, createFile]);
    
    const handleOpen = useCallback(() => setIsOpenFileModalOpen(true), []);
    
    const confirmOpen = (docId: string) => {
        const docToOpen = getDocument(docId);
        if (docToOpen) {
            setActiveDocument(docToOpen);
            loadContent(docToOpen.content);
        }
        setIsOpenFileModalOpen(false);
    };

    const handleLinkDocument = () => {
        // TODO: Implement a modal to select other documents to link
        console.log("Link Document clicked");
    };
    
     useEffect(() => {
        const handlers = {
            'campaign:file:new': handleNew,
            'campaign:file:open': handleOpen,
            'campaign:file:save': handleSave,
            'campaign:file:saveas': handleSaveAs,
            'campaign:file:linkdocument': handleLinkDocument,
        };

        const subscriptions = Object.entries(handlers).map(([event, handler]) => {
            const wrappedHandler = (data: { instanceId: string }) => {
                if (data.instanceId === instanceId) handler();
            };
            globalEmitter.subscribe(event, wrappedHandler);
            return { event, handler: wrappedHandler };
        });

        return () => subscriptions.forEach(({ event, handler }) => globalEmitter.unsubscribe(event, handler));
    }, [instanceId, handleNew, handleOpen, handleSave, handleSaveAs, handleLinkDocument]);

    const renderCurrentView = () => {
        switch(view) {
            case 'npcs': return <GenericView items={campaign.npcs} onUpdate={(id, data) => handleUpdate('npcs', id, data)} onAdd={() => handleAdd('npcs')} onDelete={(id) => handleDelete('npcs', id)} onLinkClick={handleLinkClick} renderEditorPanel={(item, onUpdate, onLinkClick) => <NpcEditorPanel item={item as CampaignNpc} onUpdate={onUpdate} onLinkClick={onLinkClick} />} title="NPCs" />;
            case 'locations': return <GenericView items={campaign.locations} onUpdate={(id, data) => handleUpdate('locations', id, data)} onAdd={() => handleAdd('locations')} onDelete={(id) => handleDelete('locations', id)} onLinkClick={handleLinkClick} renderEditorPanel={(item, onUpdate, onLinkClick) => <LocationEditorPanel item={item as CampaignLocation} onUpdate={onUpdate} onLinkClick={onLinkClick} />} title="Locations" />;
            case 'factions': return <GenericView items={campaign.factions} onUpdate={(id, data) => handleUpdate('factions', id, data)} onAdd={() => handleAdd('factions')} onDelete={(id) => handleDelete('factions', id)} onLinkClick={handleLinkClick} renderEditorPanel={(item, onUpdate, onLinkClick) => <FactionEditorPanel item={item as CampaignFaction} onUpdate={onUpdate} onLinkClick={onLinkClick} />} title="Factions" />;
            case 'items': return <GenericView items={campaign.items} onUpdate={(id, data) => handleUpdate('items', id, data)} onAdd={() => handleAdd('items')} onDelete={(id) => handleDelete('items', id)} onLinkClick={handleLinkClick} renderEditorPanel={(item, onUpdate, onLinkClick) => <ItemEditorPanel item={item as CampaignItem} onUpdate={onUpdate} onLinkClick={onLinkClick} />} title="Items" />;
            case 'storyArcs': return <GenericView items={campaign.storyArcs} onUpdate={(id, data) => handleUpdate('storyArcs', id, data)} onAdd={() => handleAdd('storyArcs')} onDelete={(id) => handleDelete('storyArcs', id)} onLinkClick={handleLinkClick} renderEditorPanel={(item, onUpdate, onLinkClick) => <StoryArcEditorPanel item={item as CampaignStoryArc} onUpdate={onUpdate} onLinkClick={onLinkClick} />} title="Story Arcs" />;
            case 'sessions': return <GenericView items={campaign.sessions} onUpdate={(id, data) => handleUpdate('sessions', id, data)} onAdd={() => handleAdd('sessions')} onDelete={(id) => handleDelete('sessions', id)} onLinkClick={handleLinkClick} renderEditorPanel={(item, onUpdate, onLinkClick) => <SessionEditorPanel item={item as CampaignSession} onUpdate={onUpdate} onLinkClick={onLinkClick} />} title="Sessions" />;
            case 'wiki': return <WikiView items={campaign.wikiPages} onUpdate={(id, data) => handleUpdate('wikiPages', id, data)} onAdd={() => handleAdd('wikiPages')} onDelete={(id) => handleDelete('wikiPages', id)} />;
            case 'boards': return <BoardView boards={campaign.boards} campaign={campaign} onUpdateBoard={(id, data) => handleUpdate('boards', id, data)} onAddBoard={() => handleAdd('boards')} onDeleteBoard={(id) => handleDelete('boards', id)} />;
            default: return null;
        }
    };
    
    const NavButton: React.FC<{ targetView: MainView, children: React.ReactNode }> = ({ targetView, children }) => (
        <button onClick={() => setView(targetView)} className={`px-3 py-1 text-sm border-b-2 ${view === targetView ? 'border-black' : 'border-transparent'}`}>{children}</button>
    );

    return (
        <div className="w-full h-full flex flex-col bg-white text-black">
            <nav className="flex-shrink-0 border-b-2 border-black flex space-x-2">
                <NavButton targetView="npcs">NPCs</NavButton>
                <NavButton targetView="locations">Locations</NavButton>
                <NavButton targetView="factions">Factions</NavButton>
                <NavButton targetView="items">Items</NavButton>
                <NavButton targetView="storyArcs">Story Arcs</NavButton>
                <NavButton targetView="sessions">Sessions</NavButton>
                <NavButton targetView="wiki">Wiki</NavButton>
                <NavButton targetView="boards">Boards</NavButton>
            </nav>
            <main className="flex-grow overflow-hidden">
                {renderCurrentView()}
            </main>
             {isSaveAsModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow">
                        <h3 className="font-bold mb-2">Save Campaign As:</h3>
                        <input
                            type="text"
                            value={saveAsName}
                            onChange={e => setSaveAsName((e.target as HTMLInputElement).value)}
                            onKeyPress={e => e.key === 'Enter' && confirmSaveAs()}
                            className="w-full p-1 border-2 border-black bg-white focus:outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end mt-4 space-x-2">
                            <button onClick={() => setIsSaveAsModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                            <button onClick={confirmSaveAs} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200 font-bold">Save</button>
                        </div>
                    </div>
                 </div>
            )}
            {isOpenFileModalOpen && (
                 <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-4 border-2 border-black window-shadow w-96">
                        <h3 className="font-bold mb-2">Open Campaign:</h3>
                        <ul className="h-48 overflow-y-auto border-2 border-black bg-white p-1">
                           {appDocuments.length > 0 ? appDocuments.map(doc => (
                               <li key={doc.id}>
                                   <button onClick={() => confirmOpen(doc.id)} className="w-full text-left p-1 hover:bg-black hover:text-white">
                                       {doc.name}
                                   </button>
                               </li>
                           )) : <li className="p-2 text-center text-gray-500">No campaigns found.</li>}
                        </ul>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setIsOpenFileModalOpen(false)} className="px-3 py-1 bg-white border-2 border-black active:bg-gray-200">Cancel</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};
