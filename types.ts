
import React, { createContext, useContext } from 'react';

export interface IconProps {
    className?: string;
}

export interface WindowInstance {
    id: string;
    appId: string;
    zIndex: number;
    position: { x: number; y: number };
    size: { width: number; height: number };
    isMinimized?: boolean;
    isNote?: boolean;
    props?: Record<string, any>;
}

export interface MenuItem {
    label: string;
    event: string;
    disabled?: boolean;
}

export interface MenuSeparator {
    separator: true;
}

export type MenuEntry = MenuItem | MenuSeparator;

export interface MenuDefinition {
    title: string;
    items: MenuEntry[];
}

export interface AppDefinition {
    id: string;
    name: string;
    icon: React.ReactElement;
    component: React.ComponentType<any>;
    defaultSize: { width: number; height: number };
    menus?: MenuDefinition[];
}

export interface AppContextType {
    openApp: (appId: string, props?: Record<string, any>) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within a AppProvider');
    }
    return context;
};

// --- VFS ---
export type VFSNodeType = 'file' | 'folder';

export interface VFSNodeBase {
    id: string;
    name: string;
    type: VFSNodeType;
    parentId: string | null;
}

export interface VFSFolder extends VFSNodeBase {
    type: 'folder';
    childrenIds: string[];
}

export interface VFSFile extends VFSNodeBase {
    type: 'file';
    fileType: 'app' | 'document';
    appId: string;
    contentId?: string;
    icon?: React.ReactElement;
}

export type VFSNode = VFSFolder | VFSFile;

export interface FileSystemContextType {
    nodes: Record<string, VFSNode>;
    getRoot: () => VFSFolder;
    getNode: (id: string) => VFSNode | undefined;
    getChildren: (folderId: string) => VFSNode[];
    findNodeByPath: (path: string) => VFSNode | undefined;
    createFile: (name: string, parentId: string, fileType: 'app' | 'document', appId: string, contentId?: string) => VFSFile;
    deleteNode: (id: string) => void;
}

// --- Documents ---
export interface AppDocument {
    id: string;
    name: string;
    appId: string;
    content: any;
}

export interface DocumentContextType {
    documents: AppDocument[];
    getDocument: (id: string) => AppDocument | undefined;
    getDocumentsByApp: (appId: string) => AppDocument[];
    createDocument: (name: string, content: any, appId: string) => AppDocument;
    updateDocument: (id: string, newName: string, newContent: any) => void;
    deleteDocument: (id: string) => void;
}

// --- BBS / Sync Types ---
export interface BBSServerFile {
    id: string;
    name: string;
    size: string;
    description: string;
    uploader: string;
    category: string;
}

// --- Habit Tracker ---
export interface Habit {
    id: string;
    name: string;
    icon: string;
    color: string;
    completions: string[]; 
    streak: number;
    createdAt: string;
}

export interface HabitTrackerContextType {
    habits: Habit[];
    addHabit: (name: string, icon: string, color: string) => void;
    toggleHabit: (habitId: string, date: Date) => void;
    deleteHabit: (habitId: string) => void;
}

// --- Cloud Mixer Elements ---
export type CloudMixerElement = 'white' | 'blue' | 'storm' | 'sunset' | 'aurora' | 'gold';

export interface Particle {
    id: number;
    type: CloudMixerElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    r: number;
    g: number;
    b: number;
    life: number;
    buoyancy: number; 
    targetAltitude: number;
}

export interface Obstacle {
    id: string;
    type: 'circle' | 'box' | 'vortex';
    x?: number;
    y?: number;
    radius?: number;
    width?: number;
    height?: number;
}

export type CloudMixerTool = CloudMixerElement | 'vortex' | 'eraser' | 'mixer';

// --- Other types ---
export interface Peg { id: number; x: number; y: number; radius: number; type: 'blue'|'orange'|'green'; hit: boolean; score: number; }
export interface Ball { id: string; x: number; y: number; vx: number; vy: number; radius: number; isGhost?: boolean; }
export interface Bucket { x: number; y: number; width: number; height: number; vx: number; }
export interface ChatMessage { role: 'user' | 'model'; content: string; }
export interface SavedCard { id: string; content: string; }
export interface CardGroup { id: string; name: string; cardIds: string[]; }
export interface CardContextType {
    cards: SavedCard[];
    groups: CardGroup[];
    getCardById: (id: string) => SavedCard | undefined;
    addCard: (content: string, groupId?: string) => void;
    updateCard: (id: string, content: string) => void;
    deleteCard: (id: string) => void;
    addGroup: (name: string) => void;
    deleteGroup: (id: string) => void;
    moveCardToGroup: (cardId: string, targetGroupId: string) => void;
}
export type Wallpaper = 'none' | 'grid' | 'dots' | 'checkerboard' | 'bricks';
export type UIMode = 'mac' | 'windows';
export type DesktopMode = 'scrolling' | 'fixed';
export type AnimationSpeed = 'none' | 'fast' | 'smooth' | 'slow';
export interface ColorScheme { id: string; name: string; colors: Record<string, string>; }
export interface Font { id: string; name: string; fontFamily: string; }
export interface ThemeSettings { colorSchemeId: string; fontId: string; wallpaper: Wallpaper; uiMode: UIMode; desktopMode: DesktopMode; animationSpeed: AnimationSpeed; customColors: Record<string, string>; systemVersion: string; }
export interface ThemeContextType {
    theme: ThemeSettings;
    setColorScheme: (id: string) => void;
    setFont: (id: string) => void;
    setWallpaper: (wallpaper: Wallpaper) => void;
    setUiMode: (mode: UIMode) => void;
    setDesktopMode: (mode: DesktopMode) => void;
    setAnimationSpeed: (speed: AnimationSpeed) => void;
    setCustomColor: (key: string, value: string) => void;
    updateSystem: () => Promise<void>;
    colorSchemes: ColorScheme[];
    fonts: Font[];
    getActiveColorScheme: () => ColorScheme;
    getActiveFont: () => Font;
}
export interface StickyNote { id: string; content: string; color: string; }
export interface StickyNoteContextType { notes: StickyNote[]; getNote: (id: string) => StickyNote | undefined; addNote: () => StickyNote; updateNoteContent: (id: string, content: string) => void; deleteNote: (id: string) => void; }
export type NotebookPageType = 'text' | 'drawing' | 'mixed';
export type NotebookPageStyle = 'blank' | 'dots' | 'lines' | 'graph' | 'parchment';
export interface NotebookDrawingPath { points: { x: number; y: number }[]; color: string; lineWidth: number; }
export interface NotebookDrawingData { paths: NotebookDrawingPath[]; }
export interface NotebookNodeBase { id: string; parentId: string; name: string; }
export interface NotebookSection extends NotebookNodeBase { type: 'section'; childrenIds: string[]; isOpen: boolean; }
export interface NotebookPage extends NotebookNodeBase { type: 'page'; pageType: NotebookPageType; style: NotebookPageStyle; content: string; drawingContent: NotebookDrawingData; }
export type NotebookNode = NotebookSection | NotebookPage;
export interface NotebookContextType { nodes: Record<string, NotebookNode>; rootId: string; getNode: (id: string) => NotebookNode | undefined; getChildren: (id: string) => NotebookNode[]; createNode: (type: 'page' | 'section', parentId: string, pageType?: NotebookPageType) => string | undefined; deleteNode: (id: string) => void; updateNodeName: (id: string, name: string) => void; updatePageContent: (id: string, content: string) => void; updatePageDrawing: (id: string, drawingContent: NotebookDrawingData) => void; updatePageStyle: (id: string, style: NotebookPageStyle) => void; toggleSectionOpen: (id: string) => void; moveNode: (draggedId: string, dropTargetId: string) => void; }
export type EventCategory = 'Work' | 'Personal' | 'Media' | 'Appointment';
export interface SubTask { id: string; text: string; isComplete: boolean; }
export interface Task { id: string; title: string; description: string; isComplete: boolean; subTasks: SubTask[]; startTime?: string; duration: number; category?: EventCategory; isLocked?: boolean; color?: string; }
export interface Repeatable { id: string; title: string; type: string; frequency: string; defaultDuration: number; color: string; category?: EventCategory; }
export type RepeatableType = 'Task' | 'Payment' | 'Activity' | 'Reminder';
export type RepeatableFrequency = 'daily' | 'weekly' | 'monthly';
export interface ScheduleTemplate { id: string; name: string; tasks: Omit<Task, 'id' | 'isComplete' | 'subTasks'>[]; }
export interface TaskPlannerContextType { tasks: Task[]; getTask: (id: string) => Task | undefined; addTask: (taskData: Omit<Task, 'id' | 'isComplete'>) => Task; updateTask: (id: string, updates: Partial<Task>) => void; deleteTask: (id: string) => void; promoteSubTask: (taskId: string, subTaskId: string) => void; repeatables: Repeatable[]; addRepeatable: (data: Omit<Repeatable, 'id'>) => void; updateRepeatable: (id: string, updates: Partial<Repeatable>) => void; deleteRepeatable: (id: string) => void; templates: ScheduleTemplate[]; addTemplate: (name: string, tasks: Omit<Task, 'id' | 'isComplete' | 'subTasks'>[]) => void; deleteTemplate: (id: string) => void; applyTemplate: (templateId: string, targetDate: string) => void; }
export type MediaCategory = 'Anime' | 'TV' | 'Film' | 'Books' | 'Comics' | 'Games';
export interface MediaItem { id: string; title: string; category: MediaCategory; releaseDate?: string; posterUrl?: string; description?: string; isCompleted?: boolean; order: number; }
export interface MediaContextType { mediaItems: MediaItem[]; addMediaItem: (item: Omit<MediaItem, 'id' | 'order'>) => void; updateMediaItem: (id: string, updates: Partial<MediaItem>) => void; deleteMediaItem: (id: string) => void; toggleMediaCompleted: (id: string) => void; reorderMediaItems: (category: MediaCategory, newOrderIds: string[]) => void; }
export interface ChirperUser { id: string; name: string; handle: string; bio: string; }
export interface Chirp { id: string; userId: string; content: string; }
export interface MotherloadUpgrade { level: number; cost: number; value: number; maxLevel: number; }
export interface MotherloadPlayerState { cash: number; fuel: number; maxFuel: number; hull: number; maxHull: number; cargo: Record<string, number>; maxCargo: number; depth: number; upgrades: { drill: MotherloadUpgrade; engine: MotherloadUpgrade; fuelTank: MotherloadUpgrade; cargoBay: MotherloadUpgrade; hull: MotherloadUpgrade; radiator: MotherloadUpgrade; }; }
export interface OreType { name: string; color: number; hardness: number; value: number; rarity: [number, number]; density: number; }
export interface Tile { typeId: number; instanceId?: number; }
export interface MacShopLayer { id: string; name: string; isVisible: boolean; opacity: number; canvasRef: React.RefObject<HTMLCanvasElement | null>; dataURL?: string; }
export type MacShopTool = 'select' | 'pencil' | 'eraser' | 'fill' | 'gen-fill' | 'eyedropper' | 'move' | 'text' | 'brush';
export interface SelectionRect { x: number; y: number; width: number; height: number; }
export type PixelPainterTool = 'pencil' | 'eraser' | 'fill' | 'rectangle' | 'oval' | 'line';
export interface CanvasElement { id: string; type: 'shape' | 'path' | 'text' | 'line' | 'card'; x: number; y: number; width: number; height: number; rotation: number; opacity: number; color?: string; content?: string; [key: string]: any; }
export interface CanvasShapeElement extends CanvasElement { type: 'shape'; shapeType: 'rect' | 'circle' | 'triangle'; fillColor: string; fillType: 'solid' | 'none'; strokeColor: string; strokeWidth: number; isGlass: boolean; }
export interface CanvasPathElement extends CanvasElement { type: 'path'; points: {x: number, y: number}[]; pathData: string; strokeColor: string; strokeWidth: number; isHighlighter: boolean; }
export interface CanvasTextElement extends CanvasElement { type: 'text'; content: string; fontFamily: string; fontSize: number; fontWeight: string; textAlign: string; color: string; }
export interface CanvasLineElement extends CanvasElement { type: 'line'; x2: number; y2: number; strokeColor: string; strokeWidth: number; }
export interface CanvasLayer { id: string; name: string; isVisible: boolean; }
export type CanvasTool = 'select' | 'hand' | 'pencil' | 'highlighter' | 'line' | 'shape_rect' | 'shape_circle' | 'shape_triangle' | 'text';
export interface CanvasGradient { id: string; stops: { offset: number; color: string }[]; }
export interface CampaignEntity { id: string; name: string; }
export interface CampaignNpc extends CampaignEntity { description: string; secrets: string; }
export interface CampaignPc extends CampaignEntity { player: string; description: string; }
export interface CampaignLocation extends CampaignEntity { description: string; }
export interface CampaignFaction extends CampaignEntity { goals: string; resources: string; }
export interface CampaignItem extends CampaignEntity { description: string; properties: string; }
export interface CampaignStoryArc extends CampaignEntity { summary: string; keyEvents: string; linkedLore: string; resolution: string; }
export interface CampaignSession extends CampaignEntity { summary: string; plannedEvents: string; linkedLore: string; postSessionNotes: string; }
export interface CampaignWikiPage extends CampaignEntity { content: string; }
export interface CampaignBoard { id: string; name: string; boardState: BoardState; }
export interface BoardState { nodes: AnyBoardNode[]; viewport: { x: number; y: number; zoom: number }; }
export type AnyBoardNode = BoardNoteNode | BoardLoreNode | BoardStoryArcNode;
export interface BoardNodeBase { id: string; x: number; y: number; width: number; height: number; }
export interface BoardNoteNode extends BoardNodeBase { type: 'note'; content: string; color: string; }
export interface BoardLoreNode extends BoardNodeBase { type: 'lore'; entityId: string; entityType: 'npc'|'pc'|'location'|'faction'|'item'; color?: string; }
export interface BoardStoryArcNode extends BoardNodeBase { type: 'arc'; entityId: string; entityType: 'storyArc'; color: string; }
export interface CampaignDocumentContent { npcs: CampaignNpc[]; pcs: CampaignPc[]; locations: CampaignLocation[]; factions: CampaignFaction[]; items: CampaignItem[]; storyArcs: CampaignStoryArc[]; sessions: CampaignSession[]; boards: CampaignBoard[]; wikiPages: CampaignWikiPage[]; linkedDocumentIds: string[]; }
export type BoardSide = 'left' | 'right' | 'top' | 'bottom';
export interface PinBoardNoteNode extends BoardNodeBase { type: 'note'; content: string; color: string; }
export interface PinBoardDocumentNode extends BoardNodeBase { type: 'document'; vfsFileId: string; }
export interface PinBoardAppNode extends BoardNodeBase { type: 'app'; appId: string; }
export interface PinBoardTaskNode extends BoardNodeBase { type: 'task'; taskId: string; }
export type AnyPinBoardNode = PinBoardNoteNode | PinBoardDocumentNode | PinBoardAppNode | PinBoardTaskNode;
export interface PinBoardState { nodes: AnyPinBoardNode[]; viewport: { x: number; y: number; zoom: number }; }
export interface PinBoardContextType {
    pinBoardState: PinBoardState;
    addNote: (pos: {x: number, y: number}) => void;
    addDocument: (vfsFileId: string, pos: {x: number, y: number}) => void;
    addApp: (appId: string, pos: {x: number, y: number}) => void;
    addTask: (taskId: string, pos: {x: number, y: number}) => void;
    updateNode: (id: string, data: Partial<AnyPinBoardNode>) => void;
    deleteNode: (id: string) => void;
}
