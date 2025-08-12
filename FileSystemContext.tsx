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

        // Shortcut on /Desktop
        const shortcutFile: VFSFile = {
            id: `vfs-shortcut-${app.id}`,
            name: app.name,
            type: 'file',
            parentId: 'desktop',
            fileType: 'app',
            appId: app.id,
            icon: app.icon,
        };
        nodes[shortcutFile.id] = shortcutFile;
        desktop.childrenIds.push(shortcutFile.id);
    });

    return nodes;
};

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [nodes, setNodes] = useState<Record<string, VFSNode>>(() => {
        try {
            const storedVFS = window.localStorage.getItem(STORAGE_KEY);
            return storedVFS ? JSON.parse(storedVFS) : generateInitialFileSystem();
        } catch (error) {
            console.error("Error loading VFS from localStorage", error);
            return generateInitialFileSystem();
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
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
        const parts = path.split('/').filter(p => p);
        
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
