
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { ThemeSettings, ThemeContextType, ColorScheme, Font, Wallpaper, UIMode, DesktopMode, AnimationSpeed } from './types';
import { COLOR_SCHEMES, FONTS } from './theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

const THEME_SETTINGS_KEY = 'retro_os_theme_settings';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<ThemeSettings>(() => {
        try {
            const storedSettings = localStorage.getItem(THEME_SETTINGS_KEY);
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                return { 
                    ...parsed, 
                    uiMode: parsed.uiMode || 'mac',
                    desktopMode: parsed.desktopMode || 'fixed',
                    animationSpeed: parsed.animationSpeed || 'smooth',
                    customColors: parsed.customColors || {},
                    systemVersion: parsed.systemVersion || '1.0.0',
                };
            }
        } catch (error) {
            console.error("Error loading theme settings from localStorage", error);
        }
        return {
            colorSchemeId: 'classic-mac',
            fontId: 'chicago',
            wallpaper: 'none',
            uiMode: 'mac',
            desktopMode: 'fixed',
            animationSpeed: 'smooth',
            customColors: {},
            systemVersion: '1.0.0',
        };
    });

    useEffect(() => {
        try {
            localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(theme));
        } catch (error) {
            console.error("Error saving theme settings to localStorage", error);
        }
    }, [theme]);

    const setColorScheme = useCallback((id: string) => {
        if (COLOR_SCHEMES.some(cs => cs.id === id)) {
            setTheme(prev => ({ ...prev, colorSchemeId: id, customColors: {} }));
        }
    }, []);

    const setFont = useCallback((id: string) => {
        if (FONTS.some(f => f.id === id)) {
            setTheme(prev => ({ ...prev, fontId: id }));
        }
    }, []);

    const setWallpaper = useCallback((wallpaper: Wallpaper) => {
        setTheme(prev => ({ ...prev, wallpaper }));
    }, []);
    
    const setUiMode = useCallback((mode: UIMode) => {
        setTheme(prev => ({ ...prev, uiMode: mode }));
    }, []);

    const setDesktopMode = useCallback((mode: DesktopMode) => {
        setTheme(prev => ({ ...prev, desktopMode: mode }));
    }, []);

    const setAnimationSpeed = useCallback((speed: AnimationSpeed) => {
        setTheme(prev => ({ ...prev, animationSpeed: speed }));
    }, []);

    const setCustomColor = useCallback((key: string, value: string) => {
        setTheme(prev => ({
            ...prev,
            customColors: { ...prev.customColors, [key]: value }
        }));
    }, []);

    const updateSystem = useCallback(async () => {
        // Simulate update logic
        setTheme(prev => ({ ...prev, systemVersion: '2.0.1 (Neo Edition)' }));
    }, []);

    const getActiveColorScheme = useCallback((): ColorScheme => {
        const base = COLOR_SCHEMES.find(cs => cs.id === theme.colorSchemeId) || COLOR_SCHEMES[0];
        return {
            ...base,
            colors: { ...base.colors, ...theme.customColors }
        };
    }, [theme.colorSchemeId, theme.customColors]);

    const getActiveFont = useCallback((): Font => {
        return FONTS.find(f => f.id === theme.fontId) || FONTS[0];
    }, [theme.fontId]);

    const value: ThemeContextType = {
        theme,
        setColorScheme,
        setFont,
        setWallpaper,
        setUiMode,
        setDesktopMode,
        setAnimationSpeed,
        setCustomColor,
        updateSystem,
        colorSchemes: COLOR_SCHEMES,
        fonts: FONTS,
        getActiveColorScheme,
        getActiveFont,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
