import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { VFSNode, VFSFolder, VFSFile, FileSystemContextType } from './types';
import { APPS } from './constants';

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const useFileSystem = (): FileSystemContextType => {
    const context = useContext(FileSystemContext);
    if (!context) {
        throw new Error('useFileSystem must be used within a FileSystemProvider');
    }
    return context;
};

const STORAGE_KEY = 'retro_os_vfs';

const generateInitialFileSystem = (): Record<string, VFSNode> => {
    const root: VFSFolder = { id: 'root', name: 'Macintosh HD', type: 'folder', parentId: null, childrenIds: ['desktop', 'apps', 'docs'] };
    const desktop: VFSFolder = { id: 'desktop', name: 'Desktop', type: 'folder', parentId: 'root', childrenIds: [] };
    const apps: VFSFolder = { id: 'apps', name: 'Applications', type: 'folder', parentId: 'root', childrenIds: [] };
    const docs: VFSFolder = { id: 'docs', name: 'Documents', type: 'folder', parentId: 'root', childrenIds: [] };
    
    const nodes: Record<string, VFSNode> = {
        'root': root,
        'desktop': desktop,
        'apps': apps,
        'docs': docs,
    };

    // Create folders on Desktop
    const gamesFolder: VFSFolder = { id: 'desktop-games', name: 'Games', type: 'folder', parentId: 'desktop', childrenIds: [] };
    const utilsFolder: VFSFolder = { id: 'desktop-utils', name: 'Utilities', type: 'folder', parentId: 'desktop', childrenIds: [] };
    const creativeFolder: VFSFolder = { id: 'desktop-creative', name: 'Apps', type: 'folder', parentId: 'desktop', childrenIds: [] };
    const devAppsFolder: VFSFolder = { id: 'desktop-dev-apps', name: 'Dev Apps', type: 'folder', parentId: creativeFolder.id, childrenIds: [] };


    nodes[gamesFolder.id] = gamesFolder;
    nodes[utilsFolder.id] = utilsFolder;
    nodes[creativeFolder.id] = creativeFolder;
    nodes[devAppsFolder.id] = devAppsFolder;
    desktop.childrenIds.push(gamesFolder.id, creativeFolder.id, utilsFolder.id);
    creativeFolder.childrenIds.push(devAppsFolder.id);

    // Define categories
    const gameAppIds = new Set(['brick-breaker', 'pong', 'tetris', 'pac-man', 'pixel-pegs', 'zurg-cabin', 'old-pc', 'motherload']);
    const utilityAppIds = new Set(['calculator', 'clock', 'calendar', 'planner', 'tasks', 'finder', 'settings', 'stickies', 'media-player', 'mixtape', 'ireader']);
    const creativeAppsToKeep = new Set(['notebook', 'cards', 'macshop', 'macwrite', 'canvas', 'painter', 'campaign-weaver']);

    APPS.forEach(app => {
        // App file in /Applications
        const appFile: VFSFile = {
            id: `vfs-app-${app.id}`,
            name: app.name,
            type: 'file',
            parentId: 'apps',
            fileType: 'app',
            appId: app.id,
            icon: app.icon,
        };
        nodes[appFile.id] = appFile;
        apps.childrenIds.push(appFile.id);

        if (app.id === 'stickynote-window') return; // Don't create a shortcut for the hidden note window

        // Shortcut on Desktop inside a category folder
        let parentFolder: VFSFolder;
        if (gameAppIds.has(app.id)) {
            parentFolder = gamesFolder;
        } else if (utilityAppIds.has(app.id)) {
            parentFolder = utilsFolder;
        } else if (creativeAppsToKeep.has(app.id)) {
            parentFolder = creativeFolder;
        } else {
            parentFolder = devAppsFolder;
        }


        const shortcutFile: VFSFile = {
            id: `vfs-shortcut-${app.id}`,
            name: app.name,
            type: 'file',
            parentId: parentFolder.id,
            fileType: 'app',
            appId: app.id,
            icon: app.icon,
        };
        nodes[shortcutFile.id] = shortcutFile;
        parentFolder.childrenIds.push(shortcutFile.id);
    });

    return nodes;
};

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [nodes, setNodes] = useState<Record<string, VFSNode>>(() => {
        try {
            const storedVFS = localStorage.getItem(STORAGE_KEY);
            return storedVFS ? JSON.parse(storedVFS) : generateInitialFileSystem();
        } catch (error) {
            console.error("Error loading VFS from localStorage", error);
            return generateInitialFileSystem();
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
        } catch (error) {
            console.error("Error saving VFS to localStorage", error);
        }
    }, [nodes]);
    
    const getRoot = useCallback(() => nodes['root'] as VFSFolder, [nodes]);
    
    const getNode = useCallback((id: string) => nodes[id], [nodes]);

    const getChildren = useCallback((folderId: string) => {
        const folder = nodes[folderId];
        if (folder?.type !== 'folder') return [];
        return (folder as VFSFolder).childrenIds.map(id => nodes[id]).filter(Boolean);
    }, [nodes]);

    const findNodeByPath = useCallback((path: string): VFSNode | undefined => {
        if (path === '/') return getRoot();
        // Remove leading slash for splitting, but handle root case first.
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        const parts = cleanPath.split('/').filter(p => p);
        
        let currentNode: VFSNode | undefined = getRoot();
        for (const part of parts) {
            if (currentNode?.type !== 'folder') return undefined;
            const children = getChildren(currentNode.id);
            currentNode = children.find(child => child.name === part);
            if (!currentNode) return undefined;
        }
        return currentNode;

    }, [nodes, getRoot, getChildren]);
    
    const createFile = useCallback((name: string, parentId: string, fileType: 'app' | 'document', appId: string, contentId?: string): VFSFile => {
        const parent = nodes[parentId];
        if (parent?.type !== 'folder') {
            throw new Error(`Parent ${parentId} is not a folder.`);
        }
        
        const newFile: VFSFile = {
            id: `vfs-${Date.now()}-${Math.random()}`,
            name,
            parentId,
            type: 'file',
            fileType,
            appId,
            contentId
        };

        setNodes(prev => {
            const newNodes = { ...prev };
            newNodes[newFile.id] = newFile;
            const updatedParent = { ...(newNodes[parentId] as VFSFolder) };
            updatedParent.childrenIds = [...updatedParent.childrenIds, newFile.id];
            newNodes[parentId] = updatedParent;
            return newNodes;
        });

        return newFile;
    }, [nodes]);


    const value: FileSystemContextType = {
        nodes,
        getRoot,
        getNode,
        getChildren,
        findNodeByPath,
        createFile,
    };

    return <FileSystemContext.Provider value={value}>{children}</FileSystemContext.Provider>;
};