import React from 'react';
import { Chat } from '@google/genai';

// --- General ---
export interface IconProps {
    className?: string;
}

export interface MenuItem {
    label: string;
    event: string;
    disabled?: boolean;
}

export interface MenuDefinition {
    title: string;
    items: (MenuItem | { separator: true })[];
}

export interface AppDefinition {
    id: string;
    name: string;
    icon: React.ReactElement<IconProps>;
    component: React.FC<any>;
    defaultSize: {
        width: number;
        height: number;
    };
    menus?: MenuDefinition[];
}

export interface WindowInstance {
    id: string;
    appId: string;
    zIndex: number;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
    props?: Record<string, any>;
    isNote?: boolean;
}

// --- File System & Documents ---
export interface VFSBaseNode {
    id: string;
    name: string;
    parentId: string | null;
}

export interface VFSFolder extends VFSBaseNode {
    type: 'folder';
    childrenIds: string[];
}

export interface VFSFile extends VFSBaseNode {
    type: 'file';
    fileType: 'app' | 'document';
    appId: string;
    icon?: React.ReactElement<IconProps>;
    contentId?: string;
}

export type VFSNode = VFSFolder | VFSFile;

export interface AppDocument {
    id: string;
    name: string;
    appId: string;
    content: any;
}

export interface FileSystemContextType {
    nodes: Record<string, VFSNode>;
    getRoot: () => VFSFolder;
    getNode: (id: string) => VFSNode | undefined;
    getChildren: (folderId: string) => VFSNode[];
    findNodeByPath: (path: string) => VFSNode | undefined;
    createFile: (name: string, parentId: string, fileType: 'app' | 'document', appId: string, contentId?: string) => VFSFile;
}

export interface DocumentContextType {
    documents: AppDocument[];
    getDocument: (id: string) => AppDocument | undefined;
    getDocumentsByApp: (appId: string) => AppDocument[];
    createDocument: (name: string, content: any, appId: string) => AppDocument;
    updateDocument: (id: string, newName: string, newContent: any) => void;
    deleteDocument: (id: string) => void;
}

// --- Settings ---
export type Wallpaper = 'none' | 'grid' | 'dots';
export type UIMode = 'mac' | 'windows';

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
}

export interface ThemeContextType {
    theme: ThemeSettings;
    setColorScheme: (id: string) => void;
    setFont: (id: string) => void;
    setWallpaper: (wallpaper: Wallpaper) => void;
    setUiMode: (mode: UIMode) => void;
    colorSchemes: ColorScheme[];
    fonts: Font[];
    getActiveColorScheme: () => ColorScheme;
    getActiveFont: () => Font;
}

// --- Cards App (Writer) ---
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

// --- Assistant Ive & Text Adventure ---
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

export interface ChatSession {
    id: string;
    name: string;
    messages: ChatMessage[];
    chatInstance: Chat;
}

// --- Sticky Notes ---
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


// --- Chirper ---
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

// --- Tasks & Planner ---
export interface SubTask {
    id: string;
    text: string;
    isComplete: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    isComplete: boolean;
    subTasks: SubTask[];
    startTime: string;
    duration: number; // in minutes
    color?: string;
    repeatableId?: string;
}

export type RepeatableType = 'Task' | 'Payment' | 'Activity' | 'Reminder';
export type RepeatableFrequency = 'daily' | 'weekly' | 'monthly';

export interface Repeatable {
    id: string;
    title: string;
    type: RepeatableType;
    frequency: RepeatableFrequency;
    defaultDuration: number;
    color: string;
}

export interface TaskPlannerContextType {
    tasks: Task[];
    getTask: (id: string) => Task | undefined;
    addTask: (taskData: Omit<Task, 'id' | 'isComplete'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    promoteSubTask: (taskId: string, subTaskId: string) => void;
    repeatables: Repeatable[];
    addRepeatable: (data: Omit<Repeatable, 'id'>) => void;
    updateRepeatable: (id: string, updates: Partial<Repeatable>) => void;
    deleteRepeatable: (id: string) => void;
}


// --- Canvas ---
export interface CanvasLayer {
    id: string;
    name: string;
    isVisible: boolean;
}
export type CanvasTool = 'select' | 'box' | 'line';
interface CanvasElementBase {
    id: string;
    layerId: string;
    x: number;
    y: number;
}
export interface CanvasCardElement extends CanvasElementBase {
    type: 'card';
    cardId: string;
    width: number;
    height: number;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
}
export interface CanvasBoxElement extends CanvasElementBase {
    type: 'box';
    width: number;
    height: number;
    isGlass: boolean;
    backgroundColor: string;
    content?: string;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
}
export interface CanvasLineElement extends CanvasElementBase {
    type: 'line';
    x2: number;
    y2: number;
}
export type CanvasElement = CanvasCardElement | CanvasBoxElement | CanvasLineElement;

// --- MacShop ---
export interface MacShopLayer {
    id: string;
    name: string;
    isVisible: boolean;
    opacity: number;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    dataURL?: string;
}
export type MacShopTool = 'select' | 'pencil' | 'eraser' | 'fill' | 'gen-fill' | 'eyedropper' | 'move' | 'text' | 'brush';
export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// --- Pixel Painter ---
export type PixelPainterTool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'oval';

// --- Cloud Mixer ---
export interface Particle {
    id: number;
    type: 'cloud' | 'water';
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    teleportCooldown: number;
}
interface CircleObstacle { id: string; type: 'circle'; x: number; y: number; radius: number; }
interface LineObstacle { id: string; type: 'line'; x1: number; y1: number; x2: number; y2: number; }
interface BoxObstacle { id: string; type: 'box'; x: number; y: number; width: number; height: number; }
export type Obstacle = CircleObstacle | LineObstacle | BoxObstacle;
export interface WormholeObstacle { id: string; type: 'wormhole'; x: number; y: number; radius: number; strength: number; }
export interface PortalObstacle { id: string; type: 'portal'; portalType: 'blue' | 'orange'; x: number; y: number; radius: number; }
export type CloudMixerTool = 'color' | 'water' | 'obstacle_circle' | 'obstacle_line' | 'obstacle_box' | 'wormhole' | 'portal_blue' | 'portal_orange';

// --- Pixel Pegs ---
export interface Peg {
    id: number;
    x: number;
    y: number;
    radius: number;
    type: 'orange' | 'blue';
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

// --- Motherload ---
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
export interface OreType {
    name: string;
    color: number;
    hardness: number;
    value: number;
    rarity: [number, number];
    density: number;
}
export interface Tile {
    typeId: number;
    instanceId?: number;
}

// --- Notebook ---
export type NotebookPageType = 'text' | 'drawing';
export type NotebookPageStyle = 'blank' | 'dots' | 'lines';
export interface NotebookDrawingData {
    paths: {
        points: { x: number; y: number }[];
        color: string;
        lineWidth: number;
    }[];
}
export interface NotebookNodeBase {
    id: string;
    parentId: string;
    name: string;
}
export interface NotebookSection extends NotebookNodeBase {
    type: 'section';
    childrenIds: string[];
    isOpen: boolean;
}
export interface NotebookPage extends NotebookNodeBase {
    type: 'page';
    pageType: NotebookPageType;
    style: NotebookPageStyle;
    content: string | NotebookDrawingData;
}
export type NotebookNode = NotebookSection | NotebookPage;
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

// --- Campaign Weaver ---
export interface CampaignEntity {
    id: string;
    name: string;
}
export interface CampaignPc extends CampaignEntity {
    // TBD
}
export interface CampaignNpc extends CampaignEntity {
    description: string;
    secrets: string;
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

export type BoardSide = 'left' | 'right' | 'top' | 'bottom';
export interface BoardLoreNode {
    id: string;
    type: 'lore';
    entityId: string;
    entityType: 'npc' | 'pc' | 'location' | 'faction' | 'item';
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}
export interface BoardStoryArcNode {
    id: string;
    type: 'arc';
    entityId: string;
    entityType: 'storyArc';
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}
export interface BoardNoteNode {
    id: string;
    type: 'note';
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
}
export type AnyBoardNode = BoardLoreNode | BoardStoryArcNode | BoardNoteNode;
export interface BoardState {
    nodes: AnyBoardNode[];
    connections: { from: { id: string; side: BoardSide; }, to: { id: string; side: BoardSide; } }[];
    viewport: { x: number; y: number; zoom: number; };
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
    boards: CampaignBoard[];
    wikiPages: CampaignWikiPage[];
    linkedDocumentIds: string[];
}

// --- PinBoard ---
export interface PinBoardNoteNode {
    id: string;
    type: 'note';
    x: number;
    y: number;
    width: number;
    height: number;
    content: string;
    color: string;
}
export interface PinBoardDocumentNode {
    id: string;
    type: 'document';
    vfsFileId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface PinBoardAppNode {
    id: string;
    type: 'app';
    appId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface PinBoardTaskNode {
    id: string;
    type: 'task';
    taskId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export type AnyPinBoardNode = PinBoardNoteNode | PinBoardDocumentNode | PinBoardAppNode | PinBoardTaskNode;
export interface PinBoardState {
    nodes: AnyPinBoardNode[];
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
}
export interface PinBoardContextType {
    pinBoardState: PinBoardState;
    addNote: (pos: { x: number; y: number }) => void;
    addDocument: (vfsFileId: string, pos: { x: number; y: number }) => void;
    addApp: (appId: string, pos: { x: number; y: number }) => void;
    addTask: (taskId: string, pos: { x: number; y: number; }) => void;
    updateNode: (id: string, data: Partial<AnyPinBoardNode>) => void;
    deleteNode: (id: string) => void;
}