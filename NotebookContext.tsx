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
            // FIX: Ensure setState updater function returns the new state.
            if (nodeToDelete && nodeToDelete.parentId && newNodes[nodeToDelete.parentId]) {
                const parent = newNodes[nodeToDelete.parentId] as NotebookSection;
                if (parent) {
                    // FIX: Add type assertion to NotebookSection to resolve excess property checking error.
                    newNodes[parent.id] = {
                        ...parent,
                        childrenIds: parent.childrenIds.filter(childId => childId !== id)
                    } as NotebookSection;
                }
            }
    
            nodesToDelete.forEach(deleteId => {
                delete newNodes[deleteId];
            });
    
            return { ...prevState, nodes: newNodes };
        });
    }, [state.rootId]);

    const updateNodeName = useCallback((id: string, name: string) => {
        setState(prevState => {
            const node = prevState.nodes[id];
            if (node) {
                const newNodes = { ...prevState.nodes, [id]: { ...node, name } };
                return { ...prevState, nodes: newNodes };
            }
            return prevState;
        });
    }, []);

    const updatePageContent = useCallback((id: string, content: string | NotebookDrawingData) => {
        setState(prevState => {
            const node = prevState.nodes[id];
            if (node?.type === 'page') {
                const newNodes = { ...prevState.nodes, [id]: { ...node, content } };
                return { ...prevState, nodes: newNodes };
            }
            return prevState;
        });
    }, []);

    const updatePageStyle = useCallback((id: string, style: NotebookPageStyle) => {
        setState(prevState => {
            const node = prevState.nodes[id];
            if (node?.type === 'page') {
                const newNodes = { ...prevState.nodes, [id]: { ...node, style } };
                return { ...prevState, nodes: newNodes };
            }
            return prevState;
        });
    }, []);

    const toggleSectionOpen = useCallback((id: string) => {
        setState(prevState => {
            const node = prevState.nodes[id];
            if (node?.type === 'section') {
                const newNodes = { ...prevState.nodes, [id]: { ...node, isOpen: !(node as NotebookSection).isOpen } };
                return { ...prevState, nodes: newNodes };
            }
            return prevState;
        });
    }, []);

    const moveNode = useCallback((draggedId: string, dropTargetId: string) => {
        setState(prevState => {
            const newNodes = { ...prevState.nodes };
            const draggedNode = newNodes[draggedId];
            const dropTargetNode = newNodes[dropTargetId];
            if (!draggedNode || !dropTargetNode || draggedId === dropTargetId) return prevState;

            // Prevent dragging a parent into its child
            let parentCheck = dropTargetNode;
            while(parentCheck) {
                if (parentCheck.id === draggedId) return prevState;
                parentCheck = newNodes[parentCheck.parentId];
            }

            // Remove from old parent
            const oldParent = newNodes[draggedNode.parentId] as NotebookSection;
            if (oldParent) {
                // FIX: Add type assertion to NotebookSection to resolve excess property checking error.
                newNodes[oldParent.id] = { ...oldParent, childrenIds: oldParent.childrenIds.filter(id => id !== draggedId) } as NotebookSection;
            }

            // Add to new parent
            let newParentId: string;
            let newChildrenIds: string[];

            if (dropTargetNode.type === 'section') {
                newParentId = dropTargetId;
                const newParent = newNodes[newParentId] as NotebookSection;
                newChildrenIds = [...newParent.childrenIds, draggedId];
            } else {
                newParentId = dropTargetNode.parentId;
                const newParent = newNodes[newParentId] as NotebookSection;
                const dropIndex = newParent.childrenIds.indexOf(dropTargetId);
                newChildrenIds = [...newParent.childrenIds];
                newChildrenIds.splice(dropIndex + 1, 0, draggedId);
            }
            
            const newParent = newNodes[newParentId] as NotebookSection;
            if(newParent) {
                 // FIX: Add type assertion to NotebookSection to resolve excess property checking error.
                 newNodes[newParentId] = { ...newParent, childrenIds: newChildrenIds } as NotebookSection;
                 newNodes[draggedId] = { ...draggedNode, parentId: newParentId };
            }
            
            return { ...prevState, nodes: newNodes };
        });
    }, []);
    
    // FIX: Provide a value for the context and return the provider component to fix component type error.
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
