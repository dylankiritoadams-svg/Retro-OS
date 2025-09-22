import React from 'react';

// From constants.tsx
export interface IconProps {
    className?: string;
}
export interface AppDefinition {
    id: string;
    name: string;
    icon: React.ReactElement<IconProps>;
    component: React.FC<any>;
    defaultSize: { width: number; height: number };
    menus?: MenuDefinition[];
}
export interface MenuDefinition {
    title: string;
    items: MenuItemDefinition[];
}
// FIX: Changed MenuItemDefinition to a discriminated union to properly support separators.
export type MenuItemDefinition =
  | {
      label: string;
      event: string;
      disabled?: boolean;
      separator?: false | undefined;
    }
  | {
      separator: true;
      label?: never;
      event?: never;
      disabled?: never;
    };

// From App.tsx
export interface WindowInstance {
    id: string;
    appId: string;
    zIndex: number;
    position: { x: number, y: number };
    size: { width: number, height: number };
    props?: Record<string, any>;
    isNote?: boolean;
}

// From CardContext.tsx and Writer.tsx
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

// From DocumentContext.tsx and various apps
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

// From FileSystemContext.tsx
export type VFSNodeType = 'folder' | 'file';
export type VFSFileType = 'app' | 'document' | 'other';
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
    icon?: React.ReactElement<IconProps>;
    contentId?: string; // e.g., for documents
}
export interface FileSystemContextType {
    nodes: Record<string, VFSNode>;
    getRoot: () => VFSFolder;
    getNode: (id: string) => VFSNode | undefined;
    getChildren: (folderId: string) => VFSNode[];
    findNodeByPath: (path: string) => VFSNode | undefined;
    createFile: (name: string, parentId: string, fileType: VFSFileType, appId: string, contentId?: string) => VFSFile;
}

// From SettingsContext.tsx
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

// From AssistantIve.tsx & TextAdventure.tsx
export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}
export interface ChatSession {
    id: string;
    name: string;
    messages: ChatMessage[];
    chatInstance: any; // Cannot import from @google/genai here, so using any
}

// From Chirper.tsx
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

// From StickyNoteContext.tsx
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

// From NotebookContext.tsx
export type NotebookPageType = 'text' | 'drawing';
export type NotebookPageStyle = 'blank' | 'lines' | 'dots';
export interface NotebookDrawingPath {
    points: { x: number; y: number }[];
    color: string;
    lineWidth: number;
}
export interface NotebookDrawingData {
    paths: NotebookDrawingPath[];
}
// FIX: Replaced the NotebookNode interface with a discriminated union type (NotebookNode = NotebookSection | NotebookPage)
// and made NotebookSection and NotebookPage self-contained interfaces. This fixes excess property checking errors
// in NotebookContext.tsx when updating nodes.
export interface NotebookSection {
    id: string;
    parentId: string;
    name: string;
    type: 'section';
    childrenIds: string[];
    isOpen: boolean;
}
export interface NotebookPage {
    id: string;
    parentId: string;
    name: string;
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

// From BrickBreaker.tsx (not explicitly typed, but can infer)
// No complex types needed to be shared.

// From Pong.tsx (not explicitly typed, but can infer)
// No complex types needed to be shared.

// From Tetris.tsx (not explicitly typed, but can infer)
// No complex types needed to be shared.

// From PacMan.tsx (not explicitly typed, but can infer)
// No complex types needed to be shared.

// From PixelPegs.tsx
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

// From Motherload.tsx
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

// From Canvas.tsx
export type CanvasTool = 'select' | 'box' | 'line';
export type CanvasElement = CanvasCardElement | CanvasBoxElement | CanvasLineElement;
export interface BaseCanvasElement {
    id: string;
    type: 'card' | 'box' | 'line';
    layerId: string;
    x: number;
    y: number;
}
export interface CanvasCardElement extends BaseCanvasElement {
    type: 'card';
    cardId: string;
    width: number;
    height: number;
}
export interface CanvasBoxElement extends BaseCanvasElement {
    type: 'box';
    width: number;
    height: number;
    isGlass?: boolean;
    hue?: string;
}
export interface CanvasLineElement extends BaseCanvasElement {
    type: 'line';
    x2: number;
    y2: number;
}
export interface CanvasLayer {
    id: string;
    name: string;
    isVisible: boolean;
}

// From CloudMixer.tsx
export type CloudMixerTool = 'color' | 'water' | 'obstacle_circle' | 'obstacle_line' | 'obstacle_box' | 'wormhole' | 'portal_blue' | 'portal_orange';
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
export interface BaseObstacle {
    id: string;
    type: 'circle' | 'line' | 'box' | 'wormhole' | 'portal';
}
export interface CircleObstacle extends BaseObstacle { type: 'circle'; x: number; y: number; radius: number; }
export interface LineObstacle extends BaseObstacle { type: 'line'; x1: number; y1: number; x2: number; y2: number; }
export interface BoxObstacle extends BaseObstacle { type: 'box'; x: number; y: number; width: number; height: number; }
export type Obstacle = CircleObstacle | LineObstacle | BoxObstacle;
export interface WormholeObstacle extends BaseObstacle { type: 'wormhole'; x: number; y: number; radius: number; strength: number; }
export interface PortalObstacle extends BaseObstacle { type: 'portal'; portalType: 'blue' | 'orange'; x: number; y: number; radius: number; }

// From PixelPainter.tsx
export type PixelPainterTool = 'pencil' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'oval';

// From MacShop.tsx
export type MacShopTool = 'select' | 'pencil' | 'eraser' | 'fill' | 'gen-fill' | 'eyedropper' | 'move' | 'text' | 'brush';
export interface MacShopLayer {
    id: string;
    name: string;
    isVisible: boolean;
    opacity: number;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    dataURL?: string; // For serialization
}
export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// From CampaignWeaver
export interface CampaignEntity { id: string; name: string; }
export interface CampaignNpc extends CampaignEntity { description: string; secrets: string; }
export interface CampaignPc extends CampaignEntity { backstory: string; goals: string; }
export interface CampaignLocation extends CampaignEntity { description: string; mapUrl?: string; }
export interface CampaignFaction extends CampaignEntity { goals: string; resources: string; }
export interface CampaignItem extends CampaignEntity { description: string; properties: string; }
export interface CampaignWikiPage extends CampaignEntity { content: string; }
export type CampaignStoryArcType = 'main_plot' | 'side_plot' | 'subplot' | 'character_arc';
export interface CampaignStoryArc extends CampaignEntity {
    type: CampaignStoryArcType;
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

// --- BOARD TYPES (Refactored) ---
export type BoardSide = 'top' | 'right' | 'bottom' | 'left';

export interface BaseBoardNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BoardLoreNode extends BaseBoardNode {
    type: 'lore';
    entityId: string;
    entityType: 'npc' | 'pc' | 'location' | 'faction' | 'item';
    displayStyle?: 'solid' | 'highlight';
    color?: string;
}

export interface BoardStoryArcNode extends BaseBoardNode {
    type: 'arc';
    entityId: string;
    entityType: 'storyArc';
    color: string;
    displayStyle?: 'solid' | 'highlight';
}

export interface BoardNoteNode extends BaseBoardNode {
    type: 'note';
    content: string;
    color: string;
}

export type AnyBoardNode = BoardLoreNode | BoardStoryArcNode | BoardNoteNode;

export interface BoardConnection {
    id: string;
    from: { nodeId: string; side: BoardSide };
    to: { nodeId: string; side: BoardSide };
}

export interface BoardState {
    nodes: AnyBoardNode[];
    connections: BoardConnection[];
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
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

// --- PINBOARD TYPES ---
export interface BasePinBoardNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PinBoardNoteNode extends BasePinBoardNode {
    type: 'note';
    content: string;
    color: string;
}

export interface PinBoardDocumentNode extends BasePinBoardNode {
    type: 'document';
    vfsFileId: string; // Reference to the VFS node
}

export type AnyPinBoardNode = PinBoardNoteNode | PinBoardDocumentNode;

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
    addNote: (pos: {x: number, y: number}) => void;
    addDocument: (vfsFileId: string, pos: {x: number, y: number}) => void;
    updateNode: (id: string, data: Partial<AnyPinBoardNode>) => void;
    deleteNode: (id: string) => void;
}