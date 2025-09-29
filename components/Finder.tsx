import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFileSystem } from '../FileSystemContext';
import { useApp } from '../App';
import { VFSNode, VFSFolder, VFSFile } from '../../types';
import { APPS } from '../../constants';

interface AppProps {
  isActive: boolean;
  instanceId: string;
  pathToOpen?: string;
}

const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const DocumentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;

const FileIcon: React.FC<{ node: VFSFile }> = ({ node }) => {
    const appDef = APPS.find(a => a.id === node.appId);
    if (appDef && node.fileType === 'app') {
        return React.cloneElement(appDef.icon, { className: "h-12 w-12" });
    }
    return <DocumentIcon />;
};

const FileItem: React.FC<{ node: VFSNode, onOpen: (node: VFSNode) => void }> = ({ node, onOpen }) => {
     const handleDragStart = (e: React.DragEvent) => {
        if (node.type === 'file') {
            (e.dataTransfer as any).setData('application/vfs-node-id', node.id);
        } else {
            e.preventDefault();
        }
    };
    
    return (
        <button
            draggable
            onDragStart={handleDragStart}
            onDoubleClick={() => onOpen(node)}
            className="flex flex-col items-center text-center w-24 p-2 rounded-md hover:bg-gray-200 focus:bg-gray-300 focus:outline-none"
        >
            <div className="w-12 h-12 flex items-center justify-center">
                {node.type === 'folder' ? <FolderIcon /> : <FileIcon node={node as VFSFile} />}
            </div>
            <p className="text-xs mt-1 break-words w-full">{node.name}</p>
        </button>
    );
};


export const Finder: React.FC<AppProps> = ({ isActive, instanceId, pathToOpen }) => {
    const { getNode, getChildren, findNodeByPath } = useFileSystem();
    const { openApp } = useApp();
    const [currentNodeId, setCurrentNodeId] = useState<string>('root');
    
    useEffect(() => {
        if (pathToOpen) {
            const node = findNodeByPath(pathToOpen);
            if (node) {
                setCurrentNodeId(node.id);
            }
        }
    }, [pathToOpen, findNodeByPath]);
    
    const currentNode = useMemo(() => getNode(currentNodeId), [currentNodeId, getNode]);
    const currentChildren = useMemo(() => getChildren(currentNodeId), [currentNodeId, getChildren]);

    const handleOpen = (node: VFSNode) => {
        if (node.type === 'folder') {
            setCurrentNodeId(node.id);
        } else if (node.type === 'file') {
            const file = node as VFSFile;
            if (file.fileType === 'app') {
                openApp(file.appId);
            } else if (file.fileType === 'document' && file.contentId) {
                openApp(file.appId, { documentIdToOpen: file.contentId });
            }
        }
    };
    
    const handleBack = () => {
        if (currentNode?.parentId) {
            setCurrentNodeId(currentNode.parentId);
        }
    };
    
    const getPath = useCallback(() => {
        const path: string[] = [];
        let current = currentNode;
        while(current) {
            path.unshift(current.name);
            current = current.parentId ? getNode(current.parentId) : undefined;
        }
        return path.join(' ▸ ');
    }, [currentNode, getNode]);

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 text-black">
            <header className="flex-shrink-0 p-1 border-b-2 border-gray-300 flex items-center space-x-2">
                <button 
                    onClick={handleBack} 
                    disabled={!currentNode?.parentId}
                    className="px-2 py-0.5 border-2 border-black bg-white active:bg-gray-200 disabled:opacity-50"
                >
                    ‹
                </button>
                <div className="font-bold">{currentNode?.name}</div>
                <div className="flex-grow text-sm text-gray-500 truncate">{getPath()}</div>
            </header>
            <main className="flex-grow p-2 overflow-y-auto">
                <div className="grid grid-cols-[repeat(auto-fill,6rem)] gap-4">
                    {currentChildren.map(node => (
                        <FileItem key={node.id} node={node} onOpen={handleOpen} />
                    ))}
                </div>
                {currentChildren.length === 0 && (
                     <p className="text-center text-gray-500 mt-8">This folder is empty.</p>
                )}
            </main>
        </div>
    );
};