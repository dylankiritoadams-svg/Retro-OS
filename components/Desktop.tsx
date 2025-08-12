import React from 'react';
import { useFileSystem } from '../FileSystemContext';
import { useApp } from '../App';
import { VFSFile } from '../types';
import { APPS } from '../constants';

const DesktopIcon: React.FC<{ node: VFSFile }> = ({ node }) => {
    const { openApp } = useApp();
    
    const handleDoubleClick = () => {
        if (node.fileType === 'app') {
            openApp(node.appId);
        } else if (node.fileType === 'document' && node.contentId) {
            openApp(node.appId, { documentIdToOpen: node.contentId });
        }
    };

    const appDef = APPS.find(a => a.id === node.appId);
    const icon = appDef?.icon;

    return (
        <button
            onDoubleClick={handleDoubleClick}
            className="flex flex-col items-center justify-start text-center w-24 h-24 p-2 rounded-md hover:bg-[rgba(255,255,255,0.2)] focus:bg-[rgba(0,0,0,0.2)] focus:outline-none"
        >
            <div className="w-12 h-12 flex items-center justify-center">
                {icon ? React.cloneElement(icon, { className: "h-10 w-10" }) : '📄'}
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
            {desktopItems.map(node => {
                if (node.type === 'file') {
                    return <DesktopIcon key={node.id} node={node as VFSFile} />;
                }
                // Later, can add folder icons here
                return null;
            })}
        </div>
    );
};

export default Desktop;
