
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { ThemeSettings, ThemeContextType, ColorScheme, Font, Wallpaper, UIMode, DesktopMode } from './types';
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
                // Ensure new settings have default values if loading old state
                return { 
                    ...parsed, 
                    uiMode: parsed.uiMode || 'mac',
                    desktopMode: parsed.desktopMode || 'scrolling',
                };
            }
        } catch (error) {
            console.error("Error loading theme settings from localStorage", error);
        }
        // Default settings
        return {
            colorSchemeId: 'classic-mac',
            fontId: 'chicago',
            wallpaper: 'none',
            uiMode: 'mac',
            desktopMode: 'scrolling',
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
            setTheme(prev => ({ ...prev, colorSchemeId: id }));
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

    const getActiveColorScheme = useCallback((): ColorScheme => {
        return COLOR_SCHEMES.find(cs => cs.id === theme.colorSchemeId) || COLOR_SCHEMES[0];
    }, [theme.colorSchemeId]);

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
        colorSchemes: COLOR_SCHEMES,
        fonts: FONTS,
        getActiveColorScheme,
        getActiveFont,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
