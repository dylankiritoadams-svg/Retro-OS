import type { ColorScheme, Font } from './types';

export const FONTS: Font[] = [
    { id: 'chicago', name: 'Chicago', fontFamily: "'Pixelify Sans', sans-serif" },
    { id: 'cutive', name: 'Cutive Mono', fontFamily: "'Cutive Mono', monospace" },
    { id: 'vt323', name: 'VT323', fontFamily: "'VT323', monospace" },
    { id: 'press-start', name: 'Press Start 2P', fontFamily: "'Press Start 2P', cursive" },
];

export const COLOR_SCHEMES: ColorScheme[] = [
    {
        id: 'classic-mac',
        name: 'Classic Mac',
        colors: {
            '--desktop-bg': '#cccccc',
            '--desktop-pattern': '#000000',
            '--text-color': '#000000',
            '--window-bg': '#ffffff',
            '--header-bg': '#ffffff',
            '--button-bg': '#ffffff',
            '--button-text': '#000000',
            '--button-active-bg': '#000000',
            '--button-active-text': '#FFFFFF',
        }
    },
    {
        id: 'dark',
        name: 'Classic Dark',
        colors: {
            '--desktop-bg': '#000000',
            '--desktop-pattern': '#ffffff',
            '--text-color': '#ffffff',
            '--window-bg': '#000000',
            '--header-bg': '#000000',
            '--button-bg': '#000000',
            '--button-text': '#ffffff',
            '--button-active-bg': '#ffffff',
            '--button-active-text': '#000000',
        }
    },
];

export const GLASS_HUES: { name: string, value: string }[] = [
    { name: 'sky', value: 'rgba(135, 206, 235, 0.2)' },
    { name: 'mint', value: 'rgba(152, 251, 152, 0.2)' },
    { name: 'rose', value: 'rgba(255, 228, 225, 0.2)' },
    { name: 'lavender', value: 'rgba(230, 230, 250, 0.2)' },
    { name: 'sun', value: 'rgba(255, 250, 205, 0.2)' },
    { name: 'none', value: 'rgba(255, 255, 255, 0.1)' },
];
