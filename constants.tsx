import React from 'react';
import { AppDefinition, IconProps } from './types';
import { WeeklyPlanner } from './components/apps/WeeklyPlanner';
import { Writer } from './components/apps/Writer';
import { Canvas } from './components/apps/Canvas';
import { AssistantIve } from './components/apps/AssistantIve';
import { WebBrowser } from './components/apps/WebBrowser';
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


export const AppleIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M15.5,5.63a2.4,2.4,0,0,1,1.93-1.42C17.2,5.25,16.7,6.1,16,6.6s-1.5,.53-1.89-.51S14,4.2,15.5,5.63Zm4.5-1.5A4.54,4.54,0,0,0,16.25,2,4.2,4.2,0,0,0,12.5,4.5,4.92,4.92,0,0,0,8,7.75c-1.88,2.25-2.5,5.5-1.25,8.25,1.5,1.5,3.12,2.5,5.25,2.5S17,17.25,18.5,15.75A5.1,5.1,0,0,0,21,11.25,4.42,4.42,0,0,0,20,4.13Z"/>
    </svg>
);

export const WindowsIcon: React.FC<IconProps> = ({ className = "h-6 w-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M3,12V3H12V12H3M3,21V13H12V21H3M13,3V12H21V3H13M13,21V13H21V21H13Z" />
    </svg>
);


const FinderIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75v6A2.25 2.25 0 006.75 21h10.5A2.25 2.25 0 0019.5 18.75v-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 15.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-.008z" />
        <circle cx="9" cy="11.25" r="1.125" fill="currentColor" />
        <circle cx="15" cy="11.25" r="1.125" fill="currentColor" />
    </svg>
);

const SettingsIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.008 1.11-1.212l.983-.328a2.25 2.25 0 012.122.983l.634 1.267c.21.421.613.74 1.065.856l1.267.316c.55.137.94.618.94 1.186v2.373c0 .568-.39.105-.94.1186l-1.267.316a2.25 2.25 0 01-1.065.856l-.634 1.267a2.25 2.25 0 01-2.122.983l-.983-.328a2.25 2.25 0 00-1.11-1.212A2.25 2.25 0 009 10.5v-1.5c0-.568.39-1.05.94-1.186l1.267-.316c.452-.116.855-.435 1.065-.856l.634-1.267a2.25 2.25 0 00-2.122-.983l-.983.328a2.25 2.25 0 00-1.11 1.212Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);


const PlannerIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const WriterIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const CanvasIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
    </svg>
);

const AssistantIveIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.207a.75.75 0 011.085.67V10.5m0 0h6m-6 0a.75.75 0 001.085.67l.415-.207M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const BrowserIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c-3.142 0-6.142 2.052-7.5 5.25m15 0c-1.358-3.198-4.358-5.25-7.5-5.25" />
    </svg>
);

const ZurgCabinIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m-3-1l-3 1.091m0 0l-3-1.091m6 2.182l-3-1.091M15 12.75l-3 1.091m-3-1.091l-3 1.091" />
    </svg>
);

const OldPcIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="4" width="18" height="12" rx="1" />
        <path d="M7 16v4h10v-4" />
        <path d="M10 8l4 4" />
        <path d="M14 8l-4 4" />
    </svg>
);

const MacWriteIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const CloudMixerIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.625c0-2.228 1.493-4.14 3.563-4.875 1.091-.35 2.283-.5 3.525-.5 2.213 0 4.35.61 6.203 1.708.925.55 1.785 1.22 2.532 2.003M21.75 15.625c0-2.228-1.493-4.14-3.563-4.875-1.091-.35-2.283-.5-3.525-.5-2.213 0-4.35.61-6.203 1.708-.925.55-1.785 1.22-2.532 2.003" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.625c0 2.228 1.493 4.14 3.563 4.875 1.091.35 2.283.5 3.525.5 2.213 0 4.35.61 6.203-1.708.925-.55 1.785 1.22 2.532-2.003M2.25 15.625c0 2.228 1.493 4.14 3.563 4.875 1.091.35 2.283.5 3.525.5 2.213 0 4.35.61 6.203-1.708.925-.55 1.785 1.22 2.532-2.003" />
    </svg>
);

const PixelPainterIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3v-6m-1.5-9a5.25 5.25 0 00-5.25 5.25v3.75m10.5 0V9.75a5.25 5.25 0 00-5.25-5.25h-.75" />
    </svg>
);

const MacShopIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15a2.25 2.25 0 012.25 2.25v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
);

const PixelPegsIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 110-18 9 9 0 010 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </svg>
);

const CalculatorIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V6.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 9.75h.008v.008H5.25V9.75zm3.75 0h.008v.008H9V9.75zm3.75 0h.008v.008h-.008V9.75zm3.75 0h.008v.008h-.008V9.75zm-7.5 3h.008v.008H9v-.008zm3.75 0h.008v.008h-.008v-.008zm3.75 0h.008v.008h-.008v-.008zm-7.5 3h.008v.008H9v-.008zm3.75 0h.008v.008h-.008v-.008zm3.75 0h.008v.008h-.008v-.008z" />
    </svg>
);

const ClockIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
);

const CalendarIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);

const BrickBreakerIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="5" width="4" height="2" />
        <rect x="10" y="5" width="4" height="2" />
        <rect x="16" y="5" width="4" height="2" />
        <rect x="7" y="8" width="4" height="2" />
        <rect x="13" y="8" width="4" height="2" />
        <path d="M7 19h10" />
        <circle cx="12" cy="15" r="1" />
    </svg>
);

const PongIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8v8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 8v8" />
        <circle cx="12" cy="12" r="1" />
    </svg>
);

const TetrisIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M13 3h-2v4h-4v2h4v4h2v-4h4V7h-4V3zM7 15v-2h2v2H7zm4 0v-2h2v2h-2zm4 0v-2h2v2h-2zm-4 4v-2h2v2h-2z" />
    </svg>
);

const PacManIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4.39 5.5L12 13.05l4.39 2.45L12.39 20h-.78l-4-4.5z" transform="rotate(-30 12 12)" />
    </svg>
);

const ChirperIcon: React.FC<IconProps> = ({ className = "h-8 w-8 text-black" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24" stroke="white" strokeWidth={1}>
        <path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2ZM12,20a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"/>
        <path d="M16.29,10.29l-4,4a1,1,0,0,1-1.41,0l-4-4a1,1,0,0,1,1.41-1.41L12,12.17l3.29-3.29a1,1,0,0,1,1.41,1.41Z"/>
    </svg>
);


export const APPS: AppDefinition[] = [
    {
        id: 'finder',
        name: 'Finder',
        icon: <FinderIcon />,
        component: Finder,
        defaultSize: { width: 700, height: 500 },
        menus: [],
    },
    {
        id: 'settings',
        name: 'System Settings',
        icon: <SettingsIcon />,
        component: SystemSettings,
        defaultSize: { width: 450, height: 400 },
        menus: [],
    },
    {
        id: 'chirper',
        name: 'Chirper',
        icon: <ChirperIcon />,
        component: Chirper,
        defaultSize: { width: 900, height: 600 },
        menus: [
            {
                title: 'Feed',
                items: [
                    { label: 'Refresh', event: 'chirper:feed:refresh' },
                ]
            }
        ],
    },
    {
        id: 'calculator',
        name: 'Calculator',
        icon: <CalculatorIcon />,
        component: Calculator,
        defaultSize: { width: 300, height: 400 },
    },
    {
        id: 'clock',
        name: 'Clock',
        icon: <ClockIcon />,
        component: ClockApp,
        defaultSize: { width: 300, height: 330 },
    },
    {
        id: 'calendar',
        name: 'Calendar',
        icon: <CalendarIcon />,
        component: CalendarApp,
        defaultSize: { width: 380, height: 380 },
    },
    {
        id: 'brick-breaker',
        name: 'Brick Breaker',
        icon: <BrickBreakerIcon />,
        component: BrickBreaker,
        defaultSize: { width: 420, height: 500 },
        menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'brickbreaker:new' }] }],
    },
    {
        id: 'pong',
        name: 'Pong',
        icon: <PongIcon />,
        component: Pong,
        defaultSize: { width: 600, height: 430 },
    },
    {
        id: 'tetris',
        name: 'Tetris',
        icon: <TetrisIcon />,
        component: Tetris,
        defaultSize: { width: 380, height: 550 },
        menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'tetris:new' }] }],
    },
    {
        id: 'pac-man',
        name: 'Pac-Man',
        icon: <PacManIcon />,
        component: PacMan,
        defaultSize: { width: 500, height: 580 },
        menus: [{ title: 'Game', items: [{ label: 'New Game', event: 'pacman:new' }] }],
    },
    {
        id: 'pixel-pegs',
        name: 'Pixel Pegs',
        icon: <PixelPegsIcon />,
        component: PixelPegs,
        defaultSize: { width: 450, height: 650 },
        menus: [
            {
                title: 'Game',
                items: [
                    { label: 'New Game', event: 'pixelpegs:game:new' },
                ]
            }
        ],
    },
    {
        id: 'macshop',
        name: 'MacShop',
        icon: <MacShopIcon />,
        component: MacShop,
        defaultSize: { width: 800, height: 600 },
        menus: [
            {
                title: 'File',
                items: [
                    { label: 'New', event: 'macshop:file:new' },
                    { label: 'Open...', event: 'macshop:file:open' },
                    { label: 'Save', event: 'macshop:file:save' },
                    { label: 'Save As...', event: 'macshop:file:saveas' },
                ]
            },
            {
                title: 'Edit',
                items: [
                    { label: 'Undo', event: 'macshop:edit:undo' },
                    { label: 'Deselect', event: 'macshop:edit:deselect' },
                ]
            },
            {
                title: 'Layer',
                items: [
                    { label: 'New Layer', event: 'macshop:layer:new' },
                    { label: 'Delete Layer', event: 'macshop:layer:delete' },
                ]
            },
            {
                title: 'Filter',
                items: [
                    { label: 'Generative Fill...', event: 'macshop:filter:genfill' },
                ]
            }
        ],
    },
    {
        id: 'macwrite',
        name: 'MacWrite V',
        icon: <MacWriteIcon />,
        component: MacWrite,
        defaultSize: { width: 640, height: 480 },
        menus: [
            {
                title: 'File',
                items: [
                    { label: 'New', event: 'macwrite:file:new' },
                    { label: 'Open...', event: 'macwrite:file:open' },
                    { label: 'Save', event: 'macwrite:file:save' },
                    { label: 'Save As...', event: 'macwrite:file:saveas' },
                ]
            },
            {
                title: 'Edit',
                items: [
                    { label: 'Undo', event: 'macwrite:edit:undo' },
                    { label: '', event: '', separator: true },
                    { label: 'Cut', event: 'macwrite:edit:cut' },
                    { label: 'Copy', event: 'macwrite:edit:copy' },
                    { label: 'Paste', event: 'macwrite:edit:paste' },
                ]
            },
            {
                title: 'Font',
                items: [
                    { label: 'Chicago', event: 'macwrite:font:chicago' },
                    { label: 'Courier', event: 'macwrite:font:courier' },
                    { label: 'Helvetica', event: 'macwrite:font:helvetica' },
                    { label: 'Times', event: 'macwrite:font:times' },
                ]
            },
            {
                title: 'Size',
                items: [
                    { label: '9 Point', event: 'macwrite:size:9' },
                    { label: '10 Point', event: 'macwrite:size:10' },
                    { label: '12 Point', event: 'macwrite:size:12' },
                    { label: '14 Point', event: 'macwrite:size:14' },
                    { label: '18 Point', event: 'macwrite:size:18' },
                    { label: '24 Point', event: 'macwrite:size:24' },
                ]
            },
            {
                title: 'Style',
                items: [
                    { label: 'Bold', event: 'macwrite:style:bold' },
                    { label: 'Italic', event: 'macwrite:style:italic' },
                    { label: 'Underline', event: 'macwrite:style:underline' },
                ]
            },
            {
                title: 'Format',
                items: [
                    { label: 'Align Left', event: 'macwrite:format:left' },
                    { label: 'Align Center', event: 'macwrite:format:center' },
                    { label: 'Align Right', event: 'macwrite:format:right' },
                ]
            }
        ],
    },
    {
        id: 'pixel-painter',
        name: 'MacPainter',
        icon: <PixelPainterIcon />,
        component: PixelPainter,
        defaultSize: { width: 640, height: 480 },
        menus: [
            {
                title: 'File',
                items: [
                    { label: 'New', event: 'pixelpainter:file:new' },
                    { label: 'Open...', event: 'pixelpainter:file:open' },
                    { label: 'Save', event: 'pixelpainter:file:save' },
                    { label: 'Save As...', event: 'pixelpainter:file:saveas' },
                ]
            },
            {
                title: 'Edit',
                items: [
                    { label: 'Undo', event: 'pixelpainter:edit:undo' },
                ]
            },
            {
                title: 'Tools',
                items: [
                    { label: 'Pencil', event: 'pixelpainter:tools:pencil' },
                    { label: 'Eraser', event: 'pixelpainter:tools:eraser' },
                    { label: 'Line', event: 'pixelpainter:tools:line' },
                    { label: 'Fill Bucket', event: 'pixelpainter:tools:fill' },
                    { label: 'Rectangle', event: 'pixelpainter:tools:rectangle' },
                    { label: 'Oval', event: 'pixelpainter:tools:oval' },
                ]
            }
        ]
    },
    {
        id: 'cloud-mixer',
        name: 'iCloud Mixer',
        icon: <CloudMixerIcon />,
        component: CloudMixer,
        defaultSize: { width: 600, height: 500 },
        menus: [
            {
                title: 'File',
                items: [
                    { label: 'New', event: 'cloudmixer:file:new' },
                    { label: 'Open...', event: 'cloudmixer:file:open' },
                    { label: 'Save', event: 'cloudmixer:file:save' },
                    { label: 'Save As...', event: 'cloudmixer:file:saveas' },
                ]
            },
            {
                title: 'Tools',
                items: [
                    { label: 'Color Cloud', event: 'cloudmixer:tool:color' },
                    { label: 'Water', event: 'cloudmixer:tool:water' },
                ]
            },
            {
                title: 'Obstacles',
                items: [
                    { label: 'Circle', event: 'cloudmixer:obstacle:circle' },
                    { label: 'Line', event: 'cloudmixer:obstacle:line' },
                    { label: 'Box', event: 'cloudmixer:obstacle:box' },
                ]
            },
            {
                title: 'Special',
                items: [
                    { label: 'Wormhole', event: 'cloudmixer:special:wormhole' },
                    { label: 'Blue Portal', event: 'cloudmixer:special:portal_blue' },
                    { label: 'Orange Portal', event: 'cloudmixer:special:portal_orange' },
                ]
            }
        ],
    },
    {
        id: 'planner',
        name: 'MacPlanner',
        icon: <PlannerIcon />,
        component: WeeklyPlanner,
        defaultSize: { width: 640, height: 480 },
        menus: [],
    },
    {
        id: 'writer',
        name: 'Mac Cards',
        icon: <WriterIcon />,
        component: Writer,
        defaultSize: { width: 700, height: 500 },
        menus: [
            {
                title: 'File',
                items: [
                    { label: 'Save Card', event: 'writer:file:save' },
                ]
            },
            {
                title: 'AI',
                items: [
                    { label: 'Continue', event: 'writer:ai:continue' },
                    { label: 'Improve', event: 'writer:ai:improve' },
                    { label: 'Suggest Title', event: 'writer:ai:title' },
                ]
            }
        ],
    },
    {
        id: 'canvas',
        name: 'Mac Canvas',
        icon: <CanvasIcon />,
        component: Canvas,
        defaultSize: { width: 800, height: 600 },
        menus: [
            {
                title: 'File',
                items: [
                    { label: 'New Canvas', event: 'canvas:file:new' },
                    { label: 'Open...', event: 'canvas:file:open' },
                    { label: 'Save', event: 'canvas:file:save' },
                    { label: 'Save As...', event: 'canvas:file:saveas' },
                ]
            },
            {
                title: 'Edit',
                items: [
                    { label: 'Delete Selection', event: 'canvas:edit:delete' },
                ]
            },
            {
                title: 'Tools',
                items: [
                    { label: 'Select', event: 'canvas:tools:select' },
                    { label: 'Box', event: 'canvas:tools:box' },
                    { label: 'Line', event: 'canvas:tools:line' },
                ]
            }
        ],
    },
    {
        id: 'assistant',
        name: 'Assistant Ive',
        icon: <AssistantIveIcon />,
        component: AssistantIve,
        defaultSize: { width: 600, height: 450 },
        menus: [],
    },
    {
        id: 'browser',
        name: 'Web Stalker',
        icon: <BrowserIcon />,
        component: WebBrowser,
        defaultSize: { width: 800, height: 600 },
        menus: [],
    },
    {
        id: 'zurg-cabin',
        name: 'Zurg Cabin',
        icon: <ZurgCabinIcon />,
        component: ZurgCabin,
        defaultSize: { width: 800, height: 600 },
        menus: [],
    },
    {
        id: 'old-pc',
        name: 'Old PC',
        icon: <OldPcIcon />,
        component: TextAdventure,
        defaultSize: { width: 640, height: 480 },
        menus: [],
    }
];