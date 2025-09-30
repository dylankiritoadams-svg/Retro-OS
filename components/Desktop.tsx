

import React from 'react';
import { useFileSystem } from '../FileSystemContext';
import { useApp } from '../types';
import type { VFSFile, VFSFolder, VFSNode } from '../types';
import { APPS, FolderIcon } from '../constants';

const DesktopItem: React.FC<{ node: VFSNode }> = ({ node }) => {
    const { openApp } = useApp();

    const handleDoubleClick = () => {
        if (node.type === 'folder') {
             openApp('finder', { pathToOpen: `/Desktop/${node.name}` });
        } else if (node.type === 'file') {
            const file = node as VFSFile;
            if (file.fileType === 'app') {
                openApp(file.appId);
            } else if (file.fileType === 'document' && file.contentId) {
                openApp(file.appId, { documentIdToOpen: file.contentId });
            }
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
        if (node.type === 'file') {
            (e.dataTransfer as any).setData('application/vfs-node-id', node.id);
        } else {
            e.preventDefault();
        }
    };
    
    let icon;
    if (node.type === 'folder') {
        icon = <FolderIcon />;
    } else {
        const file = node as VFSFile;
        const appDef = APPS.find(a => a.id === file.appId);
        icon = appDef?.icon ? React.cloneElement(appDef.icon, { className: "h-10 w-10" }) : '📄';
    }

    return (
        <button
            draggable
            onDragStart={handleDragStart}
            onDoubleClick={handleDoubleClick}
            className="flex flex-col items-center justify-start text-center w-24 h-24 p-2 focus:bg-black focus:text-white focus:outline-none"
        >
            <div className="w-12 h-12 flex items-center justify-center">
                {icon}
            </div>
            <p className="text-xs mt-1 break-words w-full text-white" style={{ textShadow: '1px 1px 2px #000' }}>
                {node.name}
            </p>
        </button>
    );
};


const Desktop: React.FC = () => {
    const { findNodeByPath, getChildren } = useFileSystem();
    const desktopFolder = findNodeByPath('/Desktop');

    if (!desktopFolder) return null;

    const desktopItems = getChildren(desktopFolder.id);

    return (
        <div className="absolute inset-0 p-4 grid grid-cols-[repeat(auto-fill,6rem)] grid-rows-[repeat(auto-fill,6rem)] gap-2 content-start">
            {desktopItems.map(node => <DesktopItem key={node.id} node={node} />)}
        </div>
    );
};

export default Desktop;