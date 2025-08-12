import type React from 'react';
import { Chat } from '@google/genai';

export interface IconProps {
  className?: string;
}

export interface MenuItemDefinition {
  label: string;
  event: string;
  disabled?: boolean;
  separator?: boolean;
}

export interface MenuDefinition {
  title: string;
  items: MenuItemDefinition[];
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: React.ReactElement<IconProps>;
  component: React.FC<any>; // Allow any props
  defaultSize: { width: number, height: number };
  menus?: MenuDefinition[];
}

export interface WindowInstance {
  id: string;
  appId: string;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number, height: number };
  props?: Record<string, any>;
}

// Types for VFS (Virtual File System)
export type VFSNodeType = 'file' | 'folder';

export interface VFSBaseNode {
  id: string;
  name: string;
  type: VFSNodeType;
  parentId: string | null;
}

export interface VFSFile extends VFSBaseNode {
  type: 'file';
  fileType: 'app' | 'document';
  appId: string;
  contentId?: string;
  icon?: React.ReactElement<IconProps>;
}

export interface VFSFolder extends VFSBaseNode {
  type: 'folder';
  childrenIds: string[];
}

export type VFSNode = VFSFile | VFSFolder;

export interface FileSystemContextType {
    nodes: Record<string, VFSNode>;
    getRoot: () => VFSFolder;
    getNode: (id: string) => VFSNode | undefined;
    getChildren: (folderId: string) => VFSNode[];
    findNodeByPath: (path: string) => VFSNode | undefined;
    createFile: (name: string, parentId: string, fileType: 'app' | 'document', appId: string, contentId?: string) => VFSFile;
}

// Types for System Settings and Theming
export type Wallpaper = 'none' | 'grid' | 'dots';
export type UIMode = 'mac' | 'windows';

export interface ColorScheme {
    id: string;
    name: string;
    colors: {
        '--bg-color': string;
        '--text-color': string;
        '--window-bg': string;
        '--header-bg': string;
        '--active-title-bar-bg': string;
        '--button-bg': string;
        '--button-text': string;
        '--button-active-bg': string;
        '--button-active-text': string;
    };
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
    
    // For convenience in settings
    colorSchemes: ColorScheme[];
    fonts: Font[];
    getActiveColorScheme: () => ColorScheme;
    getActiveFont: () => Font;
}


// Types for Shared Card System
export interface SavedCard {
  id: string;
  content: string;
}

export interface CardGroup {
  id: string;
  name: string;
  cardIds: string[];
}

// Types for Canvas App
export type CanvasElementType = 'card' | 'box' | 'line';

interface BaseCanvasElement {
  id: string;
  type: CanvasElementType;
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

export type CanvasElement = CanvasCardElement | CanvasBoxElement | CanvasLineElement;

export interface CanvasLayer {
    id:string;
    name: string;
    isVisible: boolean;
}

export type CanvasTool = 'select' | 'box' | 'line';


// Type for Card Context
export interface CardContextType {
    cards: SavedCard[];
    groups: CardGroup[];
    getCardById: (id: string) => SavedCard | undefined;
    addCard: (content: string) => void;
    deleteCard: (id: string) => void;
    updateCard: (id: string, content: string) => void;
    addGroup: (name: string) => void;
    deleteGroup: (id: string) => void;
    moveCardToGroup: (cardId: string, targetGroupId: string) => void;
}

// Types for Assistant Ive App
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

// Types for Painter3D App
export type ModelName = 'car' | 'house' | 'boat';

// Types for Saved Documents (Generic)
export interface AppDocument {
  id: string;
  name: string;
  appId: string;
  content: any; // Can be string, object, etc.
  fileId?: string; // Link to VFS
}

export interface DocumentContextType {
  documents: AppDocument[];
  getDocument: (id: string) => AppDocument | undefined;
  getDocumentsByApp: (appId: string) => AppDocument[];
  createDocument: (name: string, content: any, appId: string) => AppDocument;
  updateDocument: (id: string, newName: string, newContent: any) => void;
  deleteDocument: (id: string) => void;
}

// Types for Cloud Mixer App
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
export interface WormholeObstacle { id: string; type: 'wormhole'; x: number; y: number; radius: number; strength: number; }
export interface PortalObstacle { id: string; type: 'portal'; portalType: 'blue' | 'orange'; x: number; y: number; radius: number; }
export type Obstacle = CircleObstacle | LineObstacle | BoxObstacle | WormholeObstacle | PortalObstacle;

export type CloudMixerTool = 'color' | 'water' | 'obstacle_circle' | 'obstacle_line' | 'obstacle_box' | 'wormhole' | 'portal_blue' | 'portal_orange';

// Types for Pixel Painter App
export type PixelPainterTool = 'pencil' | 'eraser' | 'fill' | 'rectangle' | 'oval' | 'line';

// Types for MacShop App
export interface MacShopLayer {
  id: string;
  name: string;
  isVisible: boolean;
  opacity: number; // 0 to 1
  canvasRef: React.RefObject<HTMLCanvasElement>;
  dataURL?: string; // Used for loading
}

export type MacShopTool = 'pencil' | 'eraser' | 'fill' | 'select' | 'gen-fill' | 'eyedropper' | 'move' | 'text' | 'brush';

export interface SelectionRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Types for Pixel Pegs App
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

// Types for Chirper App
export interface ChirperUser {
  id: string;
  name: string;
  handle: string;
  bio: string; // The prompt used to define the persona
}

export interface Chirp {
  id: string;
  userId: string;
  content: string;
}