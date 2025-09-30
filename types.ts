import React from 'react';

// --- General ---
export interface AppContextType {
    openApp: (appId: string, props?: Record<string, any>) => void;
}
export const AppContext = React.createContext<AppContextType | undefined>(undefined);
export const useApp = () => {
    const context = React.useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};

export interface IconProps {
    className?: string;
}

export interface AppDefinition {
    id: string;
    name: string;
    icon: React.ReactElement;
    component: React.FC<any>;
    defaultSize: { width: number, height: number };
    menus?: MenuDefinition[];
}

export interface WindowInstance {
    id: string;
    appId: string;
    zIndex: number;
    position: { x: number, y: number };
    size: { width: number, height: number };
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

export interface MenuDefinition {
    title: string;
    items: (MenuItem | MenuSeparator | string)[]; // string for MacWrite sizes
}

// --- File System & Documents ---
export type VFSNodeType = 'folder' | 'file';
export type VFSFileType = 'app' | 'document' | 'text' | 'image';

export interface VFSNode {
    id: string;
    name: string;
    type: VFSNodeType;
    parentId: string | null;
}

export interface VFSFolder extends VFSNode {
    type: 'folder';
    childrenIds: string[];
}

export interface VFSFile extends VFSNode {
    type: 'file';
    fileType: VFSFileType;
    appId: string;
    contentId?: string;
    icon?: React.ReactElement;
}

export interface FileSystemContextType {
    nodes: Record<string, VFSNode>;
    getRoot: () => VFSFolder;
    getNode: (id: string) => VFSNode | undefined;
    getChildren: (folderId: string) => VFSNode[];
    findNodeByPath: (path: string) => VFSNode | undefined;
    createFile: (name: string, parentId: string, fileType: 'app' | 'document', appId: string, contentId?: string) => VFSFile;
}

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

// --- Theme & Settings ---
export type Wallpaper = 'none' | 'grid' | 'dots';
export type UIMode = 'mac' | 'windows';
export type DesktopMode = 'scrolling' | 'fixed';

export interface ColorScheme {
    id: string;
    name: string;
    colors: Record<string, string>;
}

export interface Font {
    id: string;
    name: string;
    fontFamily: string;
}

export interface ThemeSettings {
    colorSchemeId: string;
    fontId: string;
    wallpaper: Wallpaper;
    uiMode: UIMode;
    desktopMode: DesktopMode;
}

export interface ThemeContextType {
    theme: ThemeSettings;
    setColorScheme: (id: string) => void;
    setFont: (id: string) => void;
    setWallpaper: (wallpaper: Wallpaper) => void;
    setUiMode: (mode: UIMode) => void;
    setDesktopMode: (mode: DesktopMode) => void;
    colorSchemes: ColorScheme[];
    fonts: Font[];
    getActiveColorScheme: () => ColorScheme;
    getActiveFont: () => Font;
}

// --- App Specific ---

// Writer / Cards
export interface SavedCard {
    id: string;
    content: string;
}
export interface CardGroup {
    id: string;
    name: string;
    cardIds: string[];
}
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

// Text Adventure
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

// Chirper
export interface ChirperUser {
    id: string;
    name: string;
    handle: string;
    bio: string;
}
export interface Chirp {
    id: string;
    userId: string;
    content: string;
}

// Tasks / Planner
export interface SubTask {
    id: string;
    text: string;
    isComplete: boolean;
}
export interface Task {
    id: string;
    title: string;
    isComplete: boolean;
    subTasks: SubTask[];
    startTime?: string;
    duration: number; // in minutes
    color?: string;
}
export interface TaskPlannerContextType {
    tasks: Task[];
    getTask: (id: string) => Task | undefined;
    addTask: (taskData: Omit<Task, 'id' | 'isComplete'>) => Task;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    promoteSubTask: (taskId: string, subTaskId: string) => void;
}


// MacShop
export type MacShopTool = 'select' | 'pencil' | 'eraser' | 'fill' | 'gen-fill' | 'eyedropper' | 'move' | 'text' | 'brush';
export interface MacShopLayer {
    id: string;
    name: string;
    isVisible: boolean;
    opacity: number;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    dataURL?: string;
}
export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Pixel Painter
export type PixelPainterTool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'oval';

// Canvas
export type CanvasTool = 'select' | 'box' | 'line';
export interface CanvasLayer {
    id: string;
    name: string;
    isVisible: boolean;
}
export interface CanvasElement {
    id: string;
    type: 'card' | 'box' | 'line';
    layerId: string;
    x: number;
    y: number;
}
export interface CanvasCardElement extends CanvasElement {
    type: 'card';
    cardId: string;
    width: number;
    height: number;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
}
export interface CanvasBoxElement extends CanvasElement {
    type: 'box';
    width: number;
    height: number;
    isGlass: boolean;
    backgroundColor: string;
    content: string;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
}
export interface CanvasLineElement extends CanvasElement {
    type: 'line';
    x2: number;
    y2: number;
}

// CloudMixer
export type CloudMixerTool = 'color' | 'water' | 'obstacle_circle' | 'obstacle_line' | 'obstacle_box' | 'wormhole' | 'portal_blue' | 'portal_orange';
export interface Particle {
    id: number;
    type: 'cloud' | 'water';
    x: number; y: number;
    vx: number; vy: number;
    radius: number;
    color: string;
    teleportCooldown: number;
}
export type Obstacle =
    | { id: string, type: 'circle', x: number, y: number, radius: number }
    | { id: string, type: 'line', x1: number, y1: number, x2: number, y2: number }
    | { id: string, type: 'box', x: number, y: number, width: number, height: number };

export interface WormholeObstacle {
    id: string; type: 'wormhole';
    x: number; y: number; radius: number; strength: number;
}
export interface PortalObstacle {
    id: string; type: 'portal'; portalType: 'blue' | 'orange';
    x: number; y: number; radius: number;
}

// Pixel Pegs
export interface Peg {
    id: number;
    x: number;
    y: number;
    radius: number;
    type: 'blue' | 'orange';
    hit: boolean;
    score: number;
}
export interface Ball {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}
export interface Bucket {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
}

// Sticky Notes
export interface StickyNote {
    id: string;
    content: string;
    color: string;
}
export interface StickyNoteContextType {
    notes: StickyNote[];
    getNote: (id: string) => StickyNote | undefined;
    addNote: () => StickyNote;
    updateNoteContent: (id: string, content: string) => void;
    deleteNote: (id: string) => void;
}

// Notebook
export type NotebookPageType = 'text' | 'drawing';
export type NotebookPageStyle = 'blank' | 'dots' | 'lines';

export interface NotebookDrawingData {
    paths: {
        points: { x: number, y: number }[];
        color: string;
        lineWidth: number;
    }[];
}

export interface NotebookNode {
    id: string;
    parentId: string;
    name: string;
    type: 'section' | 'page';
}

export interface NotebookSection extends NotebookNode {
    type: 'section';
    childrenIds: string[];
    isOpen: boolean;
}

export interface NotebookPage extends NotebookNode {
    type: 'page';
    pageType: NotebookPageType;
    style: NotebookPageStyle;
    content: string | NotebookDrawingData;
}
export interface NotebookContextType {
    nodes: Record<string, NotebookNode>;
    rootId: string;
    getNode: (id: string) => NotebookNode | undefined;
    getChildren: (id: string) => NotebookNode[];
    createNode: (type: 'page' | 'section', parentId: string, pageType?: NotebookPageType) => void;
    deleteNode: (id: string) => void;
    updateNodeName: (id: string, name: string) => void;
    updatePageContent: (id: string, content: string | NotebookDrawingData) => void;
    updatePageStyle: (id: string, style: NotebookPageStyle) => void;
    toggleSectionOpen: (id: string) => void;
    moveNode: (draggedId: string, dropTargetId: string) => void;
}

// PinBoard
export interface PinBoardViewport {
    x: number;
    y: number;
    zoom: number;
}

export interface PinBoardNode {
    id: string;
    type: 'note' | 'document' | 'app' | 'task';
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PinBoardNoteNode extends PinBoardNode {
    type: 'note';
    content: string;
    color: string;
}
export interface PinBoardDocumentNode extends PinBoardNode {
    type: 'document';
    vfsFileId: string;
}
export interface PinBoardAppNode extends PinBoardNode {
    type: 'app';
    appId: string;
}
export interface PinBoardTaskNode extends PinBoardNode {
    type: 'task';
    taskId: string;
}

export type AnyPinBoardNode = PinBoardNoteNode | PinBoardDocumentNode | PinBoardAppNode | PinBoardTaskNode;

export interface PinBoardState {
    nodes: AnyPinBoardNode[];
    viewport: PinBoardViewport;
}
export interface PinBoardContextType {
    pinBoardState: PinBoardState;
    addNote: (pos: { x: number, y: number }) => void;
    addDocument: (vfsFileId: string, pos: { x: number, y: number }) => void;
    addApp: (appId: string, pos: { x: number, y: number }) => void;
    addTask: (taskId: string, pos: { x: number, y: number }) => void;
    updateNode: (id: string, data: Partial<AnyPinBoardNode>) => void;
    deleteNode: (id: string) => void;
}


// RetroBoard
export interface Board {
    id: string;
    name: string;
}
export interface RetroBoardMessage {
    id: string;
    boardId: string;
    username: string;
    content: string;
    timestamp: Date;
    mentions: string[];
}

// Motherload
export interface OreType {
    name: string;
    color: number;
    hardness: number;
    value: number;
    rarity: [number, number]; // min/max depth
    density: number;
}
export interface Tile {
    typeId: number;
    instanceId?: number;
}
export interface MotherloadUpgrade {
    level: number;
    cost: number;
    value: number;
    maxLevel: number;
}
export interface MotherloadPlayerState {
    cash: number;
    fuel: number;
    maxFuel: number;
    hull: number;
    maxHull: number;
    cargo: Record<string, number>;
    maxCargo: number;
    depth: number;
    upgrades: {
        drill: MotherloadUpgrade;
        engine: MotherloadUpgrade;
        fuelTank: MotherloadUpgrade;
        cargoBay: MotherloadUpgrade;
        hull: MotherloadUpgrade;
        radiator: MotherloadUpgrade;
    };
}

// Campaign Weaver
export interface CampaignEntity {
    id: string;
    name: string;
}

export interface CampaignNpc extends CampaignEntity {
    description: string;
    secrets: string;
}

export interface CampaignPc extends CampaignEntity {
    // Basic for now
}

export interface CampaignLocation extends CampaignEntity {
    description: string;
}

export interface CampaignFaction extends CampaignEntity {
    goals: string;
    resources: string;
}

export interface CampaignItem extends CampaignEntity {
    description: string;
    properties: string;
}

export interface CampaignStoryArc extends CampaignEntity {
    summary: string;
    keyEvents: string;
    linkedLore: string;
    resolution: string;
}

export interface CampaignSession extends CampaignEntity {
    summary: string;
    plannedEvents: string;
    linkedLore: string;
    postSessionNotes: string;
}
export interface CampaignWikiPage extends CampaignEntity {
    content: string;
}

export interface BoardNode {
    id: string;
    type: 'note' | 'lore' | 'arc';
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface BoardNoteNode extends BoardNode {
    type: 'note';
    content: string;
    color: string;
}
export interface BoardLoreNode extends BoardNode {
    type: 'lore';
    entityId: string;
    entityType: 'npc' | 'pc' | 'location' | 'faction' | 'item';
    color?: string;
}
export interface BoardStoryArcNode extends BoardNode {
    type: 'arc';
    entityId: string;
    entityType: 'storyArc';
    color: string;
}
export type AnyBoardNode = BoardNoteNode | BoardLoreNode | BoardStoryArcNode;

export type BoardSide = 'top' | 'bottom' | 'left' | 'right';
export interface BoardConnection {
    id: string;
    fromId: string;
    fromSide: BoardSide;
    toId: string;
    toSide: BoardSide;
    label?: string;
}
export interface BoardState {
    nodes: AnyBoardNode[];
    connections: BoardConnection[];
    viewport: { x: number, y: number, zoom: number };
}
export interface CampaignBoard extends CampaignEntity {
    boardState: BoardState;
}

export interface CampaignDocumentContent {
    npcs: CampaignNpc[];
    pcs: CampaignPc[];
    locations: CampaignLocation[];
    factions: CampaignFaction[];
    items: CampaignItem[];
    storyArcs: CampaignStoryArc[];
    sessions: CampaignSession[];
    wikiPages: CampaignWikiPage[];
    boards: CampaignBoard[];
    linkedDocumentIds: string[];
}