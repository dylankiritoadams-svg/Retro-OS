
import React from 'react';
import type { AppDefinition, IconProps } from './types';
import { PlannerX } from './components/apps/PlannerX';
import { TaskDetails } from './components/apps/TaskDetails';
import { Writer } from './components/apps/Writer';
import { Canvas } from './components/apps/Canvas';
import { ZurgCabin } from './components/apps/ZurgCabin';
import { TextAdventure } from './components/apps/TextAdventure';
import { MacWrite } from './components/apps/MacWrite';
import { CloudMixer } from './components/apps/CloudMixer';
import { PixelPainter } from './components/apps/PixelPainter';
import { MacShop } from './components/apps/MacShop';
import { PixelPegs } from './components/apps/PixelPegs';
import { Peggle2 } from './components/apps/Peggle2';
import { Finder } from './components/apps/Finder';
import { SystemSettings } from './components/apps/SystemSettings';
import { ClockApp } from './components/apps/ClockApp';
import { BrickBreaker } from './components/apps/BrickBreaker';
import { Pong } from './components/apps/Pong';
import { Tetris } from './components/apps/Tetris';
import { PacMan } from './components/apps/PacMan';
import { Chirper } from './components/apps/Chirper';
import { Motherload } from './components/apps/Motherload';
import { StickyNoteWindow } from './components/apps/StickyNoteWindow';
import { Notebook } from './components/apps/Notebook';
import { CampaignWeaver } from './components/apps/CampaignWeaver';
import { TaskNote } from './components/apps/TaskNote';
import { UpNext } from './components/apps/UpNext';
import { HabitTracker } from './components/apps/HabitTracker';
import { BBSExchange } from './components/apps/BBSExchange';

const PIXEL_ATTRS = { shapeRendering: "crispEdges" as const };

// --- Icon Components ---

export const AppleIcon: React.FC<IconProps> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 2h2v2H2zM6 2h2v2H6zM10 2h2v2h-2zM2 6h12v2H2zM2 10h12v2H2zM2 14h2v-2h2v2h2v-2h2v2h2v-2h2v2z" />
    </svg>
);

export const WindowsIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z" />
    </svg>
);

export const FolderIcon: React.FC<IconProps> = ({ className = "h-12 w-12" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M1 3h5l2 2h7v9H1V3z" />
        <path d="M2 4v8h12V5H7L5 3H2z" opacity="0.3" />
    </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ className = "h-12 w-12" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M3 1h7l4 4v10H3V1z" />
        <path d="M10 1v4h4" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
);

export const HabitIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 2h12v12H2V2zm2 2v8h8V4H4z" />
        <path d="M6 6h4v4H6V6z" />
    </svg>
);

export const NetworkIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M0 4h5v8H0V4zM7 0h9v5H7V0zM7 7h9v9H7V7z" />
        <path d="M5 8h2v1H5zM11 5v2h1V5z" />
    </svg>
);

export const NewPlannerIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M1 2h14v12H1V2zm2 2v2h2V4H3zm4 0v2h2V4H7zm4 0v2h2V4h-2zm-8 4v2h2V8H3zm4 0v2h2V8H7zm4 0v2h2V8h-2zm-8 4v2h2v-2H3zm4 0v2h2v-2H7zm4 0v2h2v-2h-2z" />
    </svg>
);

export const TasksIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 3h2v2H2V3zm4 0h8v2H6V3zm-4 4h2v2H2V7zm4 0h8v2H6V7zm-4 4h2v2H2v-2zm4 0h8v2H6v-2z" />
    </svg>
);

export const UpNextIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 2h4v1H2V2zm0 3h4v1H2V5zm0 3h4v1H2V8zm10-6h2v12h-2V2zm-3 2h2v1h-2V4zm0 3h2v1h-2V7zm0 3h2v1h-2v-1z" />
    </svg>
);

export const TaskNoteIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M4 1h8v2H4V1zM2 3h12v12H2V3zm2 2v1h8V5H4zm0 3v1h8V8H4zm0 3v1h5v-1H4z" />
        <rect x="11" y="11" width="2" height="2" fill="currentColor" />
    </svg>
);

export const CardsIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M1 4h10v10H1V4zm4-3h10v10h-2V3H5V1z" />
    </svg>
);

export const CanvasIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
);

export const MacWriteIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 13h12v2H2v-2zM3 2l10 10-1 1-10-10 1-1z" />
    </svg>
);

export const MacShopIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 2h5v5H2V2zm7 0h5v5H9V2zm0 7h5v5H9V9zM2 9h5v5H2V9z" />
    </svg>
);

export const PainterIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M1 8a7 7 0 1014 0c0-3.8-3.1-7-7-7H1v7zM4 5h2v2H4V5zm6 0h2v2h-2V5zm-3 5h2v2H7v-2z" />
    </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 2a6 6 0 110 12A6 6 0 018 2zm-1 2h2v4H7V4zm0 4h4v2H7V8z" />
    </svg>
);

export const ChirperIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 4h4v2H2V4zm8 0h4v2h-4V4zm-4 4h4v2H6V8zm-4 4h4v2H2v-2zm8 0h4v2h-4v-2z" />
    </svg>
);

export const StickyNoteIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M2 1h12v10l-4 4H2V1zm8 10h4v1h-4v-1z" />
    </svg>
);

export const NewNotebookIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M3 1h11v14H3V1zm-2 2h1v2H1V3zm0 4h1v2H1V7zm0 4h1v2H1v-2z" />
    </svg>
);

export const CampaignWeaverIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M8 1l7 14H1L8 1zm0 4l-4 8h8l-4-8z" />
    </svg>
);

const PeggleIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <rect x="4" y="4" width="8" height="8" fill="#ff6600" />
        <rect x="7" y="7" width="2" height="2" fill="#fff" />
    </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M7 1h2v2H7zM13 3l1.4 1.4-1.4 1.4L11.6 4.4zM15 7v2h-2V7zM13 13l-1.4 1.4-1.4-1.4 1.4-1.4zM7 15v-2h2v2zM3 13l-1.4-1.4 1.4-1.4 1.4 1.4zM1 7h2v2H1zM3 3l1.4-1.4 1.4 1.4-1.4 1.4zM6 6h4v4H6z" />
    </svg>
);

export const PinBoardIcon: React.FC<IconProps> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 16 16" fill="currentColor" {...PIXEL_ATTRS}>
        <path d="M7 1h2v4h4v2H9v8H7V7H3V5h4V1z" />
    </svg>
);

// --- App Definitions ---

export const APPS: AppDefinition[] = [
    { id: 'finder', name: 'Finder', icon: <FolderIcon />, component: Finder, defaultSize: { width: 600, height: 400 } },
    { id: 'settings', name: 'System Settings', icon: <SettingsIcon />, component: SystemSettings, defaultSize: { width: 500, height: 550 } },
    { id: 'bbs-exchange', name: 'BBS Exchange', icon: <NetworkIcon />, component: BBSExchange, defaultSize: { width: 480, height: 420 } },
    { id: 'habit-tracker', name: 'Habit Tracker', icon: <HabitIcon />, component: HabitTracker, defaultSize: { width: 450, height: 500 } },
    { id: 'planner', name: 'Planner X', icon: <NewPlannerIcon />, component: PlannerX, defaultSize: { width: 1000, height: 800 } },
    { id: 'up-next', name: 'Up Next', icon: <UpNextIcon />, component: UpNext, defaultSize: { width: 650, height: 500 } },
    { id: 'task-note', name: 'TaskNote', icon: <TaskNoteIcon />, component: TaskNote, defaultSize: { width: 300, height: 450 } },
    { id: 'peggle-2', name: 'Peggle 2: Extreme', icon: <PeggleIcon />, component: Peggle2, defaultSize: { width: 620, height: 820 } },
    { id: 'cards', name: 'Cards', icon: <CardsIcon />, component: Writer, defaultSize: { width: 700, height: 500 } },
    { id: 'canvas', name: 'Canvas', icon: <CanvasIcon />, component: Canvas, defaultSize: { width: 800, height: 600 } },
    { id: 'macwrite', name: 'MacWrite II', icon: <MacWriteIcon />, component: MacWrite, defaultSize: { width: 640, height: 480 } },
    { id: 'macshop', name: 'MacShop', icon: <MacShopIcon />, component: MacShop, defaultSize: { width: 900, height: 650 } },
    { id: 'painter', name: 'Painter', icon: <PainterIcon />, component: PixelPainter, defaultSize: { width: 500, height: 400 } },
    { id: 'cloud-mixer', name: 'Cloud Mixer', icon: <DocumentIcon />, component: CloudMixer, defaultSize: { width: 800, height: 600 } },
    { id: 'clock', name: 'Clock', icon: <ClockIcon />, component: ClockApp, defaultSize: { width: 300, height: 320 } },
    { id: 'chirper', name: 'Chirper', icon: <ChirperIcon />, component: Chirper, defaultSize: { width: 900, height: 600 } },
    { id: 'stickynote-window', name: 'Sticky Note', icon: <StickyNoteIcon />, component: StickyNoteWindow, defaultSize: { width: 200, height: 200 } },
    { id: 'notebook', name: 'Notebook', icon: <NewNotebookIcon />, component: Notebook, defaultSize: { width: 800, height: 600 } },
    { id: 'campaign-weaver', name: 'Campaign Weaver', icon: <CampaignWeaverIcon />, component: CampaignWeaver, defaultSize: { width: 950, height: 700 } },
    { id: 'zurg-cabin', name: 'Zurg\'s Cabin', icon: <DocumentIcon />, component: ZurgCabin, defaultSize: { width: 800, height: 600 } },
    { id: 'pixel-pegs', name: 'Pixel Pegs', icon: <DocumentIcon />, component: PixelPegs, defaultSize: { width: 420, height: 650 } },
    { id: 'motherload', name: 'Motherload', icon: <DocumentIcon />, component: Motherload, defaultSize: { width: 800, height: 600 } },
];
