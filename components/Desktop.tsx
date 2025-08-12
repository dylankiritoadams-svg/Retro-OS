import React from 'react';
import { useFileSystem } from '../FileSystemContext';
import { useApp } from '../App';
import { VFSFile, VFSFolder, VFSNode } from '../types';
import { APPS } from '../constants';

const FolderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-12 w-12 text-black">
      <path fill="#FFFFFF" stroke="#000000" strokeWidth="1" d="M2.25 8.25h19.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V8.25z" />
      <path fill="#f0f0f0" stroke="#000000" strokeWidth="1" d="M4.5 4.5h5.25l2.25 3h7.5a1.5 1.5 0 011.5 1.5v-3a1.5 1.5 0 00-1.5-1.5H6a1.5 1.5 0 00-1.5 1.5v1.5z" />
    </svg>
);

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
            onDoubleClick={handleDoubleClick}
            className="flex flex-col items-center justify-start text-center w-24 h-24 p-2 rounded-md hover:bg-[rgba(255,255,255,0.2)] focus:bg-[rgba(0,0,0,0.2)] focus:outline-none"
        >
            <div className="w-12 h-12 flex items-center justify-center">
                {icon}
            </div>
            <p className="text-xs mt-1 break-words w-full" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
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