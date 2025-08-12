import { ColorScheme, Font } from './types';

export const FONTS: Font[] = [
    { id: 'dotgothic16', name: 'DotGothic16', fontFamily: "'DotGothic16', sans-serif" },
    { id: 'pixelify', name: 'Pixelify Sans', fontFamily: "'Pixelify Sans', sans-serif" },
    { id: 'cutive', name: 'Cutive Mono', fontFamily: "'Cutive Mono', monospace" },
    { id: 'vt323', name: 'VT323', fontFamily: "'VT323', monospace" },
    { id: 'press-start', name: 'Press Start 2P', fontFamily: "'Press Start 2P', cursive" },
];

export const COLOR_SCHEMES: ColorScheme[] = [
    {
        id: 'classic',
        name: 'Classic White',
        colors: {
            '--bg-color': '#d1d5db',
            '--text-color': '#000000',
            '--window-bg': '#ffffff',
            '--header-bg': '#ffffff',
            '--active-title-bar-bg': '#9ca3af',
            '--button-bg': '#E5E7EB',
            '--button-text': '#000000',
            '--button-active-bg': '#000000',
            '--button-active-text': '#FFFFFF',
        }
    },
    {
        id: 'dark',
        name: 'Classic Dark',
        colors: {
            '--bg-color': '#1f2937',
            '--text-color': '#f3f4f6',
            '--window-bg': '#374151',
            '--header-bg': '#4b5563',
            '--active-title-bar-bg': '#1f2937',
            '--button-bg': '#4B5563',
            '--button-text': '#F3F4F6',
            '--button-active-bg': '#F9FAFB',
            '--button-active-text': '#111827',
        }
    },
    {
        id: 'beige',
        name: 'Beige',
        colors: {
            '--bg-color': '#f5f5dc',
            '--text-color': '#5d4037',
            '--window-bg': '#fffbf0',
            '--header-bg': '#fffbf0',
            '--active-title-bar-bg': '#d2b48c',
             '--button-bg': '#F5F5DC',
            '--button-text': '#5D4037',
            '--button-active-bg': '#5D4037',
            '--button-active-text': '#FFFBF0',
        }
    }
];

export const GLASS_HUES: { name: string, value: string }[] = [
    { name: 'sky', value: 'rgba(135, 206, 235, 0.2)' },
    { name: 'mint', value: 'rgba(152, 251, 152, 0.2)' },
    { name: 'rose', value: 'rgba(255, 228, 225, 0.2)' },
    { name: 'lavender', value: 'rgba(230, 230, 250, 0.2)' },
    { name: 'sun', value: 'rgba(255, 250, 205, 0.2)' },
    { name: 'none', value: 'rgba(255, 255, 255, 0.1)' },
];
