import React from 'react';
import type { AppDefinition, IconProps } from './types';
import { Planner } from './components/apps/Planner';
import { Tasks } from './components/apps/Tasks';
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
import { Finder } from './components/apps/Finder';
import { SystemSettings } from './components/apps/SystemSettings';
import { Calculator } from './components/apps/Calculator';
import { ClockApp } from './components/apps/ClockApp';
import { CalendarApp } from './components/apps/CalendarApp';
import { BrickBreaker } from './components/apps/BrickBreaker';
import { Pong } from './components/apps/Pong';
import { Tetris } from './components/apps/Tetris';
import { PacMan } from './components/apps/PacMan';
import { Chirper } from './components/apps/Chirper';
import { Motherload } from './components/apps/Motherload';
import { StickyNoteWindow } from './components/apps/StickyNoteWindow';
import { Notebook } from './components/apps/Notebook';
import { CampaignWeaver } from './components/apps/CampaignWeaver';
import { MediaPlayer } from './components/apps/MediaPlayer';
import { MixTape } from './components/apps/MixTape';
import { IReader } from './components/apps/IReader';
import { RetroBoard } from './components/apps/RetroBoard';

export const AppleIcon: React.FC<IconProps> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 16" shapeRendering="crispEdges" fill="currentColor">
        <text x="0" y="13" style={{ fontFamily: "'Pixelify Sans', sans-serif", fontSize: "16px", fontWeight: "bold" }}>RS</text>
    </svg>
);

export const WindowsIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M3,12V3H12V12H3M3,21V13H12V21H3M13,3V12H21V3H13M13,21V13H21V21H13Z" />
    </svg>
);

export const FolderIcon: React.FC<IconProps> = ({ className = "h-12 w-12" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M1 9V6h11l3 3h16v1H11.5l-3-3H2v2z m10.5 1h19.5v14H1z M2 10h8.5v1H2z"/>
    </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ className = "h-12 w-12" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M7 3h15v1h1v1h1v1h1v1h1v1h1v1h1v18H7z m1 1v23h21V12h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1V4z m14 0v7h7v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1v-1h-1z"/>
    </svg>
);

export const PinBoardIcon: React.FC<IconProps> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M5 5h22v22H5z m1 1v20h20V6z m2 2h16v16H8z"/>
    </svg>
);

const RetroBoardIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M5 5h22v22H5z" fill="#000080"/>
        <path d="M7 7h18v18H7z" fill="#000000"/>
        <path d="M9 9h2v2H9zm4 0h10v2H13z m-4 4h2v2H9zm4 0h10v2H13z m-4 4h2v2H9zm4 0h10v2H13z" fill="#00ff00"/>
    </svg>
);

const IReaderIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M5 4h22v24H5z" fill="#c0c0c0"/>
        <path d="M6 5h20v22H6z" fill="#fff"/>
        <path d="M10 8h12v1H10zm0 3h12v1H10zm0 3h8v1H10z" fill="#808080"/>
        <path d="M26 4v24h1V4z" fill="#808080"/>
    </svg>
);

const FinderIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M6 7h20v18H6z m1 1v16h18V8z m3 3h2v2H10zm3 0h2v2h-2zm3 0h2v2h-2zm3 0h2v2h-2zm3 0h2v2h-2z m-12 4h14v2H10z m0 3h14v2H10z"/>
    </svg>
);

const SettingsIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.008 1.11-1.212l.983-.328a2.25 2.25 0 012.122.983l.634 1.267c.21.421.613.74 1.065.856l1.267.316c.55.137.94.618.94 1.186v2.373c0 .568-.39.105-.94.1186l-1.267.316a2.25 2.25 0 01-1.065.856l-.634 1.267a2.25 2.25 0 01-2.122.983l-.983-.328a2.25 2.25 0 00-1.11-1.212A2.25 2.25 0 009 10.5v-1.5c0-.568.39-1.05.94-1.186l1.267-.316c.452-.116.855-.435 1.065-.856l.634-1.267a2.25 2.25 0 00-2.122-.983l-.983.328a2.25 2.25 0 00-1.11 1.212Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);

const NewPlannerIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M5 5h22v22H5z m1 1v2h20V6z m0 3v17h20V9z m2 2h3v3H8z m5 0h3v3h-3z m-5 4h3v3H8z" fill="#a2d2ff"/>
        <path d="M18 11h3v3h-3z m0 4h3v3h-3z m-5 0h3v3h-3z" fill="#ffafcc"/>
    </svg>
);

const TasksIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M7 5h18v22H7z m1 1v20h16V6z"/>
        <path d="M10 9h2v2h-2zm4 0h10v2H14z m-4 4h2v2h-2zm4 0h10v2H14z m-4 4h2v2h-2zm4 0h10v2H14z"/>
    </svg>
);

const CardsIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <rect x="10" y="7" width="15" height="15" fill="#FFF" stroke="#000" strokeWidth="1"/>
        <rect x="8" y="9" width="15" height="15" fill="#FFF" stroke="#000" strokeWidth="1"/>
        <rect x="6" y="11" width="15" height="15" fill="#FFF" stroke="#000" strokeWidth="1"/>
        <path d="M7 12h13v1H7zm0 2h13v1H7zm0 2h9v1H7z" fill="#a0a0a0"/>
    </svg>
);

const MacWriteIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M7 3h18v26H7z m1 1v24h16V4z m2 3h12v1H10zm0 2h12v1H10zm0 2h8v1H10z"/>
        <path d="M18 15l-1 1-7 7-1 1h-1l-1-1-1-1v-1l1-1 7-7 1-1h1l1 1zm-1 2l-6 6h1l6-6z" fill="#808080"/>
    </svg>
);

const MacShopIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M5 5h22v22H5z m1 1v20h20V6z" fill="#c0c0c0"/>
        <path d="M15 10h2v8h-2z m-1 8h4v2h-4z m-1-9h6v1h-6z" fill="#8B4513"/>
        <path d="M14 9h4v1h-4z" fill="#c0c0c0"/>
        <path d="M18 10h2v2h-2z" fill="#0000ff"/>
    </svg>
);

const PainterIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M16 5c-6 0-11 5-11 11s5 11 11 11c3 0 6-1.5 8-4l2 2c2.5-2.5 2.5-6.5 0-9l-2 2c-2-2.5-5-4-8-4zm0 2c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z"/>
        <path d="M10 10h2v2h-2z" fill="red"/>
        <path d="M15 9h2v2h-2z" fill="blue"/>
        <path d="M20 12h2v2h-2z" fill="green"/>
        <path d="M22 17h2v2h-2z" fill="yellow"/>
    </svg>
);

const NewNotebookIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M9 4h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2zm0 2h2v1h-2z" fill="#808080"/>
        <path d="M12 4h13v24H12z m1 1v22h11V5z m2 2h7v1H15zm0 3h7v1H15z"/>
    </svg>
);

const CampaignWeaverIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M16 4l-12 8v8l12 8 12-8v-8zm-11 8.5l11-7.33 11 7.33-11 7.33z m11 14.67l-10-6.67v-6l10 6.67z m1-13.34l-10-6.66 10-6.67 10 6.67z" opacity="0.6"/>
        <path d="M16 4l12 8-12 8-12-8z m0 16l12-8v8l-12 8z m0 0l-12-8v8l12 8z"/>
        <text x="13" y="19" style={{ fontFamily: "'Pixelify Sans', sans-serif", fontSize: "8px"}} fill="currentColor">20</text>
    </svg>
);

const CanvasIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
    </svg>
);

const CalculatorIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M7 3h18v26H7z m1 1v24h16V4z m2 2h12v5H10z m1 1v3h10V7z m-1 6h3v3h-3z m4 0h3v3h-3z m4 0h3v3h-3z m-8 4h3v3h-3z m4 0h3v3h-3z m4 0h3v3h-3z m-8 4h3v3h-3z m4 0h3v3h-3z m4 0h3v3h-3z"/>
    </svg>
);

const ClockIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M16 3A13 13 0 1016 29 13 13 0 1016 3z m0 1A12 12 0 1116 28 12 12 0 1116 4z m-1 3v9h2v-1h-1V7z m3 9h-8v1h4v4h1v-5z"/>
    </svg>
);

const CalendarIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
       <path d="M5 5h22v22H5z m1 1v2h20V6z m0 3v17h20V9z m2 2h3v3H8z m5 0h3v3h-3z m5 0h3v3h-3z m-10 4h3v3H8z m5 0h3v3h-3z m5 0h3v3h-3z m-10 4h3v3H8z m5 0h3v3h-3z m5 0h3v3h-3z"/>
    </svg>
);

const ChirperIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.46,6C21.69,6.35 20.86,6.58 20,6.69C20.88,6.16 21.56,5.32 21.88,4.31C21.05,4.81 20.13,5.16 19.16,5.36C18.37,4.5 17.26,4 16,4C13.65,4 11.73,5.92 11.73,8.29C11.73,8.63 11.77,8.96 11.84,9.27C8.28,9.09 5.11,7.38 2.9,4.79C2.53,5.42 2.33,6.15 2.33,6.94C2.33,8.43 3.11,9.75 4.12,10.55C3.42,10.53 2.78,10.34 2.2,10.03C2.2,10.05 2.2,10.07 2.2,10.08C2.2,12.24 3.73,14.04 5.88,14.47C5.53,14.57 5.17,14.62 4.79,14.62C4.52,14.62 4.26,14.6 4,14.56C4.58,16.34 6.25,17.65 8.24,17.69C6.75,18.85 4.88,19.54 2.86,19.54C2.5,19.54 2.15,19.52 1.82,19.46C3.84,20.78 6.28,21.58 8.9,21.58C16,21.58 19.94,15.65 19.94,10.63C19.94,10.45 19.94,10.27 19.93,10.09C20.7,9.52 21.37,8.82 21.88,8C21.13,8.31 20.33,8.53 19.5,8.64C20.34,8.13 21,7.35 21.34,6.44L22.46,6Z" />
    </svg>
);

const StickyNoteIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M7 3h18v18H7z m1 1v16h16V4z m16 16l-5 5v-5z"/>
    </svg>
);

const MediaPlayerIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M4 4h24v24H4z" fill="#c0c0c0" />
        <path d="M5 5h22v22H5z" fill="#808080" />
        <path d="M6 6h20v20H6z" fill="#000000" />
        <path d="M12 10l10 6-10 6z" fill="#00ff00" />
    </svg>
);

const MixTapeIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M4 8h24v16H4z" fill="#808080"/>
        <path d="M5 9h22v14H5z" fill="#c0c0c0"/>
        <path d="M7 11h8v8H7z m10 0h8v8h-8z" fill="#ffffff"/>
        <path d="M9 13h4v4H9z m10 0h4v4h-4z" fill="#404040"/>
        <path d="M6 20h20v2H6z" fill="#a0a0a0"/>
    </svg>
);

const CloudMixerIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M16 5 A 8 8 0 0 1 16 21 A 8 8 0 0 1 16 5 M 10 10 A 5 5 0 0 1 10 20 M 22 10 A 5 5 0 0 1 22 20" fill="#add8e6" />
    </svg>
);
const ZurgCabinIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M4 14 L 16 4 L 28 14 L 28 28 L 4 28 Z" stroke="black" strokeWidth="1" fill="#8B4513" />
        <rect x="13" y="18" width="6" height="10" fill="#4a2a0a" />
    </svg>
);
const TextAdventureIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M4 6 H 28 V 26 H 4 Z" fill="#000" />
        <path d="M6 8 H 26 V 24 H 6 Z" fill="#111" />
        <text x="7" y="14" fill="#0f0" style={{fontFamily: "'VT323', monospace", fontSize: "6px"}}> &gt; _ </text>
    </svg>
);
const PixelPegsIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <circle cx="16" cy="8" r="3" fill="#fff" />
        <circle cx="10" cy="15" r="2" fill="#ff7f50" />
        <circle cx="22" cy="15" r="2" fill="#4169e1" />
        <circle cx="16" cy="22" r="2" fill="#4169e1" />
    </svg>
);
const BrickBreakerIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <rect x="4" y="26" width="24" height="2" fill="#ddd" />
        <rect x="4" y="8" width="6" height="3" fill="#f99" />
        <rect x="13" y="8" width="6" height="3" fill="#f99" />
        <rect x="22" y="8" width="6" height="3" fill="#f99" />
        <rect x="8" y="13" width="6" height="3" fill="#f99" />
        <rect x="17" y="13" width="6" height="3" fill="#f99" />
    </svg>
);
const PongIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <rect x="4" y="12" width="2" height="8" fill="white" stroke="black" strokeWidth="1" />
        <rect x="26" y="12" width="2" height="8" fill="white" stroke="black" strokeWidth="1" />
        <rect x="15" y="15" width="2" height="2" fill="white" />
    </svg>
);
const TetrisIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <rect x="12" y="8" width="4" height="4" fill="#00FFFF" stroke="black" strokeWidth="1" />
        <rect x="12" y="12" width="4" height="4" fill="#00FFFF" stroke="black" strokeWidth="1" />
        <rect x="12" y="16" width="4" height="4" fill="#00FFFF" stroke="black" strokeWidth="1" />
        <rect x="16" y="16" width="4" height="4" fill="#FFA500" stroke="black" strokeWidth="1" />
        <rect x="8" y="16" width="4" height="4" fill="#FFFF00" stroke="black" strokeWidth="1" />
    </svg>
);
const PacManIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M16 4 A 12 12 0 1 1 16 28 A 12 12 0 1 1 16 4" fill="yellow" />
        <path d="M16 16 L 28 16 L 16 4 Z" fill="black" />
        <circle cx="22" cy="10" r="1" fill="white" />
    </svg>
);
const MotherloadIcon: React.FC<IconProps> = ({ className = "h-10 w-10" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 32" shapeRendering="crispEdges" fill="currentColor">
        <path d="M12 4 L 20 4 L 22 8 L 10 8 Z" fill="#ff0000" />
        <rect x="10" y="8" width="12" height="12" fill="#c0c0c0" />
        <path d="M14 20 L 18 20 L 16 26 Z" fill="#ffd700" />
    </svg>
);


export const APPS: AppDefinition[] = [
    { id: 'finder', name: 'Finder', icon: <FinderIcon />, component: Finder, defaultSize: { width: 600, height: 400 } },
    { id: 'settings', name: 'System Settings', icon: <SettingsIcon />, component: SystemSettings, defaultSize: { width: 500, height: 550 } },
    { id: 'retroboard', name: 'RetroBoard', icon: <RetroBoardIcon />, component: RetroBoard, defaultSize: { width: 700, height: 500 } },
    { id: 'planner', name: 'Planner', icon: <NewPlannerIcon />, component: Planner, defaultSize: { width: 900, height: 700 } },
    { id: 'tasks', name: 'Tasks', icon: <TasksIcon />, component: Tasks, defaultSize: { width: 600, height: 500 } },
    { id: 'task-details', name: 'Task Details', icon: <TasksIcon />, component: TaskDetails, defaultSize: { width: 400, height: 420 } },
    { id: 'ireader', name: 'iReader', icon: <IReaderIcon />, component: IReader, defaultSize: { width: 800, height: 600 }, menus: [
        { title: 'File', items: [{ label: 'Open File...', event: 'ireader:file:open' }] },
        { title: 'View', items: [{ label: 'Toggle Book Mode', event: 'ireader:view:toggle-book-mode' }] }
    ]},
    { id: 'cards', name: 'Cards', icon: <CardsIcon />, component: Writer, defaultSize: { width: 700, height: 500 }, menus: [
        { title: 'File', items: [{ label: 'Save Card', event: 'cards:file:save' }] },
        { title: 'AI', items: [
            { label: 'Continue Writing', event: 'cards:ai:continue' },
            { label: 'Improve Text', event: 'cards:ai:improve' },
            { label: 'Suggest Title', event: 'cards:ai:title' }
        ]}
    ]},
    { id: 'canvas', name: 'Canvas', icon: <CanvasIcon />, component: Canvas, defaultSize: { width: 800, height: 600 }, menus: [
        { title: 'File', items: [{ label: 'New', event: 'canvas:file:new' }, { label: 'Open...', event: 'canvas:file:open' }, { separator: true }, { label: 'Save', event: 'canvas:file:save' }, { label: 'Save As...', event: 'canvas:file:saveas' }] },
        { title: 'Edit', items: [{ label: 'Delete Selection', event: 'canvas:edit:delete' }] },
        { title: 'Tools', items: [{ label: 'Select Tool', event: 'canvas:tools:select' }, { label: 'Box Tool', event: 'canvas:tools:box' }, { label: 'Line Tool', event: 'canvas:tools:line' }]}
    ]},
    { id: 'media-player', name: 'Media Player', icon: <MediaPlayerIcon />, component: MediaPlayer, defaultSize: { width: 500, height: 400 } },
    { id: 'mixtape', name: 'MixTape', icon: <MixTapeIcon />, component: MixTape, defaultSize: { width: 550, height: 300 } },
    { id: 'macwrite', name: 'MacWrite II', icon: <MacWriteIcon />, component: MacWrite, defaultSize: { width: 640, height: 480 }, menus: [
        { title: 'File', items: [{ label: 'New', event: 'macwrite:file:new'}, { label: 'Open...', event: 'macwrite:file:open'}, { separator: true }, { label: 'Save', event: 'macwrite:file:save'}, { label: 'Save As...', event: 'macwrite:file:saveas'}] },
        { title: 'Edit', items: [{ label: 'Undo', event: 'macwrite:edit:undo'}, { separator: true }, { label: 'Cut', event: 'macwrite:edit:cut'}, { label: 'Copy', event: 'macwrite:edit:copy'}, { label: 'Paste', event: 'macwrite:edit:paste'}] },
        { title: 'Font', items: [{ label: 'Chicago', event: 'macwrite:font:chicago'}, { label: 'Courier', event: 'macwrite:font:courier'}, { label: 'Helvetica', event: 'macwrite:font:helvetica'}, { label: 'Times', event: 'macwrite:font:times'}] },
        { title: 'Size', items: ['9','10','12','14','18','24'].map(s => ({label: `${s} Point`, event: `macwrite:size:${s}`}))},
        { title: 'Style', items: [{ label: 'Bold', event: 'macwrite:style:bold'}, { label: 'Italic', event: 'macwrite:style:italic'}, { label: 'Underline', event: 'macwrite:style:underline'}]},
        { title: 'Format', items: [{ label: 'Align Left', event: 'macwrite:format:left'}, { label: 'Align Center', event: 'macwrite:format:center'}, { label: 'Align Right', event: 'macwrite:format:right'}]},
    ]},
    { id: 'macshop', name: 'MacShop', icon: <MacShopIcon />, component: MacShop, defaultSize: { width: 900, height: 650 }, menus: [
        { title: 'File', items: [{ label: 'New', event: 'macshop:file:new'}, { label: 'Open...', event: 'macshop:file:open'}, { separator: true }, { label: 'Save', event: 'macshop:file:save'}, { label: 'Save As...', event: 'macshop:file:saveas'}]},
        { title: 'Edit', items: [{ label: 'Undo', event: 'macshop:edit:undo'}, { separator: true}, { label: 'Deselect', event: 'macshop:edit:deselect'}]},
        { title: 'Layer', items: [{ label: 'New Layer', event: 'macshop:layer:new'}, { label: 'Delete Layer', event: 'macshop:layer:delete'}]},
        { title: 'Filter', items: [{ label: 'Generative Fill...', event: 'macshop:filter:genfill'}]}
    ]},
    { id: 'painter', name: 'Painter', icon: <PainterIcon />, component: PixelPainter, defaultSize: { width: 600, height: 500 }, menus: [
        { title: 'File', items: [{ label: 'New', event: 'painter:file:new' }, { label: 'Open...', event: 'painter:file:open' }, { separator: true }, { label: 'Save', event: 'painter:file:save' }, { label: 'Save As...', event: 'painter:file:saveas' }] },
        { title: 'Edit', items: [{ label: 'Undo', event: 'painter:edit:undo' }] },
        { title: 'Tools', items: [
            { label: 'Pencil', event: 'painter:tools:pencil' },
            { label: 'Eraser', event: 'painter:tools:eraser' },
            { label: 'Fill', event: 'painter:tools:fill' },
            { label: 'Line', event: 'painter:tools:line' },
            { label: 'Rectangle', event: 'painter:tools:rectangle' },
            { label: 'Oval', event: 'painter:tools:oval' }
        ]}
    ]},
    { id: 'zurg-cabin', name: 'Zurg\'s Cabin', icon: <ZurgCabinIcon />, component: ZurgCabin, defaultSize: { width: 800, height: 600 } },
    { id: 'old-pc', name: 'Old PC', icon: <TextAdventureIcon />, component: TextAdventure, defaultSize: { width: 500, height: 400 } },
    { id: 'cloud-mixer', name: 'Cloud Mixer', icon: <CloudMixerIcon />, component: CloudMixer, defaultSize: { width: 800, height: 600 }, menus: [
        { title: 'File', items: [{ label: 'New', event: 'cloudmixer:file:new'}, { label: 'Open...', event: 'cloudmixer:file:open'}, { separator: true }, { label: 'Save', event: 'cloudmixer:file:save'}, { label: 'Save As...', event: 'cloudmixer:file:saveas'}]},
        { title: 'Tools', items: [{ label: 'Color Cloud', event: 'cloudmixer:tool:color'}, { label: 'Water', event: 'cloudmixer:tool:water'}]},
        { title: 'Obstacles', items: [{ label: 'Circle', event: 'cloudmixer:obstacle:circle'}, { label: 'Line', event: 'cloudmixer:obstacle:line'}, { label: 'Box', event: 'cloudmixer:obstacle:box'}]},
        { title: 'Special', items: [{ label: 'Wormhole', event: 'cloudmixer:special:wormhole'}, { label: 'Blue Portal', event: 'cloudmixer:special:portal_blue'}, { label: 'Orange Portal', event: 'cloudmixer:special:portal_orange'}]},
    ]},
    { id: 'pixel-pegs', name: 'Pixel Pegs', icon: <PixelPegsIcon />, component: PixelPegs, defaultSize: { width: 430, height: 630 }, menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'pixelpegs:game:new' }] }] },
    { id: 'brick-breaker', name: 'Brick Breaker', icon: <BrickBreakerIcon />, component: BrickBreaker, defaultSize: { width: 420, height: 480 }, menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'brickbreaker:new' }] }] },
    { id: 'pong', name: 'Pong', icon: <PongIcon />, component: Pong, defaultSize: { width: 600, height: 400 } },
    { id: 'tetris', name: 'Tetris', icon: <TetrisIcon />, component: Tetris, defaultSize: { width: 380, height: 530 }, menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'tetris:new' }] }] },
    { id: 'pac-man', name: 'Pac-Man', icon: <PacManIcon />, component: PacMan, defaultSize: { width: 400, height: 480 }, menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'pacman:new' }] }] },
    { id: 'chirper', name: 'Chirper', icon: <ChirperIcon />, component: Chirper, defaultSize: { width: 900, height: 500 }, menus: [{ title: 'Feed', items: [{ label: 'Refresh', event: 'chirper:feed:refresh' }] }] },
    { id: 'motherload', name: 'Motherload', icon: <MotherloadIcon />, component: Motherload, defaultSize: { width: 800, height: 600 }, menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'motherload:game:new' }] }] },
    { id: 'stickies', name: 'Stickies', icon: <StickyNoteIcon />, component: () => null, defaultSize: { width: 0, height: 0 } },
    { id: 'stickynote-window', name: 'Sticky Note', icon: <StickyNoteIcon />, component: StickyNoteWindow, defaultSize: { width: 250, height: 250 } },
    { id: 'notebook', name: 'Notebook', icon: <NewNotebookIcon />, component: Notebook, defaultSize: { width: 800, height: 600 } },
    { id: 'campaign-weaver', name: 'Campaign Weaver', icon: <CampaignWeaverIcon />, component: CampaignWeaver, defaultSize: { width: 1000, height: 700 }, menus: [
        { title: 'File', items: [{ label: 'New', event: 'campaign:file:new'}, { label: 'Open...', event: 'campaign:file:open'}, { separator: true }, { label: 'Save', event: 'campaign:file:save'}, { label: 'Save As...', event: 'campaign:file:saveas'}, { separator: true }, { label: 'Link Document...', event: 'campaign:file:linkdocument' }] }
    ]},
    { id: 'calculator', name: 'Calculator', icon: <CalculatorIcon />, component: Calculator, defaultSize: { width: 250, height: 350 } },
    { id: 'clock', name: 'Clock', icon: <ClockIcon />, component: ClockApp, defaultSize: { width: 300, height: 300 } },
    { id: 'calendar', name: 'Calendar', icon: <CalendarIcon />, component: CalendarApp, defaultSize: { width: 450, height: 400 } },
];