
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import type { NotebookNode, NotebookSection, NotebookPage, NotebookDrawingData, NotebookPageStyle, NotebookContextType, NotebookPageType } from './types';

const NotebookContext = createContext<NotebookContextType | undefined>(undefined);

export const useNotebook = (): NotebookContextType => {
    const context = useContext(NotebookContext);
    if (!context) throw new Error('useNotebook must be used within a NotebookProvider');
    return context;
};

const NOTEBOOK_STORAGE_KEY = 'retro_os_notebook_state';

const createInitialState = (): { rootId: string, nodes: Record<string, NotebookNode> } => {
    const rootId = 'root-section';
    const rootSection: NotebookSection = { id: rootId, parentId: '', name: 'My Notebooks', type: 'section', childrenIds: [], isOpen: true };
    return {
        rootId,
        nodes: { [rootId]: rootSection },
    };
};

export const NotebookProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<{ rootId: string, nodes: Record<string, NotebookNode> }>(() => {
        try {
            const stored = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
            return stored ? JSON.parse(stored) : createInitialState();
        } catch {
            return createInitialState();
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error("Failed to save notebook state:", e);
        }
    }, [state]);

    const getNode = useCallback((id: string) => state.nodes[id], [state.nodes]);

    const getChildren = useCallback((id: string) => {
        const node = getNode(id);
        if (node?.type === 'section') {
            return (node as NotebookSection).childrenIds.map(childId => getNode(childId)).filter(Boolean) as NotebookNode[];
        }
        return [];
    }, [getNode]);

    const createNode = useCallback((type: 'page' | 'section', parentId: string, pageType: NotebookPageType = 'text') => {
        const parentNode = getNode(parentId);
        if (!parentNode || parentNode.type !== 'section') return;

        const newNodeId = `${type}-${Date.now()}`;
        let newNode: NotebookPage | NotebookSection;
        const isTopLevel = parentId === state.rootId;

        if (type === 'page') {
            newNode = {
                id: newNodeId,
                parentId,
                name: 'Untitled Page',
                type: 'page',
                pageType,
                style: 'blank',
                content: pageType === 'text' ? '' : { paths: [] },
            };
        } else { // 'section'
            newNode = {
                id: newNodeId,
                parentId,
                name: isTopLevel ? 'New Notebook' : 'New Section',
                type: 'section',
                childrenIds: [],
                isOpen: true,
            };
        }

        setState(prevState => {
            const newNodes = { ...prevState.nodes };
            newNodes[newNodeId] = newNode;
            const updatedParent = { ...newNodes[parentId] as NotebookSection };
            updatedParent.childrenIds = [...updatedParent.childrenIds, newNodeId];
            newNodes[parentId] = updatedParent;
            return { ...prevState, nodes: newNodes };
        });
    }, [getNode, state.rootId]);

    const deleteNode = useCallback((id: string) => {
        if (id === state.rootId) return;

        setState(prevState => {
            const nodesToDelete = new Set<string>([id]);
            const queue = [id];

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const node = prevState.nodes[currentId];
                if (node?.type === 'section') {
                    (node as NotebookSection).childrenIds.forEach(childId => {
                        nodesToDelete.add(childId);
                        queue.push(childId);
                    });
                }
            }
            
            const newNodes = { ...prevState.nodes };
            const nodeToDelete = newNodes[id];
            if (!nodeToDelete) return prevState;

            const parent = newNodes[nodeToDelete.parentId] as NotebookSection;
            if (parent) {
                const updatedParent = { ...parent, childrenIds: parent.childrenIds.filter(childId => childId !== id) };
                newNodes[parent.id] = updatedParent;
            }

            nodesToDelete.forEach(nodeId => delete newNodes[nodeId]);
            
            return { ...prevState, nodes: newNodes };
        });
    }, [state.rootId]);
    
    const updateNodeName = useCallback((id: string, name: string) => {
        setState(prevState => {
            if (!prevState.nodes[id]) return prevState;
            const newNodes = { ...prevState.nodes };
            newNodes[id] = { ...newNodes[id], name };
            return { ...prevState, nodes: newNodes };
        });
    }, []);

    const updatePageContent = useCallback((id: string, content: string | NotebookDrawingData) => {
        setState(prevState => {
            const node = prevState.nodes[id];
            if (!node || node.type !== 'page') return prevState;
            
            const newNodes = { ...prevState.nodes };
            const updatedPage = { ...node as NotebookPage, content };
            
            if (typeof content === 'string') {
                const firstLine = content.split('\n')[0].trim();
                updatedPage.name = firstLine || 'Untitled Page';
            }

            newNodes[id] = updatedPage;
            return { ...prevState, nodes: newNodes };
        });
    }, []);
    
    const updatePageStyle = useCallback((id: string, style: NotebookPageStyle) => {
        setState(prevState => {
             const node = prevState.nodes[id];
            if (!node || node.type !== 'page') return prevState;
            const newNodes = { ...prevState.nodes };
            newNodes[id] = { ...(node as NotebookPage), style };
            return { ...prevState, nodes: newNodes };
        });
    }, []);
    
    const toggleSectionOpen = useCallback((id: string) => {
        setState(prevState => {
            const node = prevState.nodes[id];
            if (!node || node.type !== 'section') return prevState;
            const newNodes = { ...prevState.nodes };
            const sectionNode = node as NotebookSection;
            newNodes[id] = { ...sectionNode, isOpen: !sectionNode.isOpen };
            return { ...prevState, nodes: newNodes };
        });
    }, []);

    const moveNode = useCallback((draggedId: string, dropTargetId: string) => {
        setState(prevState => {
            const draggedNode = prevState.nodes[draggedId];
            const dropTargetNode = prevState.nodes[dropTargetId];
            if (!draggedNode || !dropTargetNode || draggedId === dropTargetId) return prevState;
            
            let current: NotebookNode | undefined = dropTargetNode;
            while (current) {
                if (current.id === draggedId) return prevState; // Prevent nesting inside self
                current = prevState.nodes[current.parentId];
            }
            
            const newNodes = { ...prevState.nodes };

            const oldParent = newNodes[draggedNode.parentId] as NotebookSection;
            if (oldParent) {
                const updatedOldParent = { ...oldParent, childrenIds: oldParent.childrenIds.filter(id => id !== draggedId) };
                newNodes[oldParent.id] = updatedOldParent;
            }

            let newParent: NotebookSection;
            let dropIndex: number;

            if (dropTargetNode.type === 'section') {
                newParent = { ...newNodes[dropTargetId] as NotebookSection };
                dropIndex = newParent.childrenIds.length;
                newParent.childrenIds.push(draggedId);
            } else { 
                newParent = { ...newNodes[dropTargetNode.parentId] as NotebookSection };
                dropIndex = newParent.childrenIds.indexOf(dropTargetId);
                newParent.childrenIds.splice(dropIndex, 0, draggedId);
            }
            newNodes[newParent.id] = newParent;
            
            newNodes[draggedId] = { ...draggedNode, parentId: newParent.id };

            return { ...prevState, nodes: newNodes };
        });
    }, []);

    const value: NotebookContextType = {
        nodes: state.nodes,
        rootId: state.rootId,
        getNode,
        getChildren,
        createNode,
        deleteNode,
        updateNodeName,
        updatePageContent,
        updatePageStyle,
        toggleSectionOpen,
        moveNode,
    };

    return <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>;
};
