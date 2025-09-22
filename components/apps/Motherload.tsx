

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { globalEmitter } from '../../events';
import type { MotherloadPlayerState, MotherloadUpgrade, OreType, Tile } from '../../types';

// --- GAME CONSTANTS ---
const WORLD_WIDTH = 100;
const WORLD_HEIGHT = 500;
const TILE_SIZE = 10;
const CAMERA_ZOOM = 1.2;
const GRAVITY = -0.1;
const PLAYER_SIZE = TILE_SIZE * 0.8;

const ORE_TYPES: OreType[] = [
    { name: 'Empty', color: 0x000000, hardness: 0, value: 0, rarity: [0, 0], density: 0 },
    { name: 'Soil', color: 0x9b7653, hardness: 1, value: 0, rarity: [0, 50], density: 1 },
    { name: 'Bronze', color: 0xcd7f32, hardness: 2, value: 10, rarity: [10, 100], density: 0.1 },
    { name: 'Silver', color: 0xc0c0c0, hardness: 3, value: 50, rarity: [50, 200], density: 0.08 },
    { name: 'Gold', color: 0xffd700, hardness: 4, value: 250, rarity: [150, 350], density: 0.05 },
    { name: 'Platinum', color: 0xe5e4e2, hardness: 5, value: 1000, rarity: [300, 450], density: 0.03 },
    { name: 'Unobtainium', color: 0x4d0099, hardness: 6, value: 5000, rarity: [450, 500], density: 0.02 },
    { name: 'Bedrock', color: 0x333333, hardness: 99, value: 0, rarity: [498, 500], density: 1 },
];

const UPGRADE_SPECS: Record<keyof MotherloadPlayerState['upgrades'], { name: string; baseCost: number; costMultiplier: number; baseValue: number; valueMultiplier: number, maxLevel: number }> = {
    drill: { name: "Drill", baseCost: 100, costMultiplier: 2.5, baseValue: 1, valueMultiplier: 1, maxLevel: 6 },
    engine: { name: "Engine", baseCost: 150, costMultiplier: 2, baseValue: 0.2, valueMultiplier: 1.2, maxLevel: 5 },
    fuelTank: { name: "Fuel Tank", baseCost: 100, costMultiplier: 2, baseValue: 100, valueMultiplier: 1.5, maxLevel: 5 },
    cargoBay: { name: "Cargo Bay", baseCost: 100, costMultiplier: 2.2, baseValue: 10, valueMultiplier: 2, maxLevel: 5 },
    hull: { name: "Hull", baseCost: 120, costMultiplier: 2.1, baseValue: 100, valueMultiplier: 1.5, maxLevel: 5 },
    radiator: { name: "Radiator", baseCost: 200, costMultiplier: 1.8, baseValue: 1, valueMultiplier: 1, maxLevel: 5 },
};

const getInitialPlayerState = (): MotherloadPlayerState => {
    const upgrades: any = {};
    for (const key in UPGRADE_SPECS) {
        const spec = UPGRADE_SPECS[key as keyof typeof UPGRADE_SPECS];
        upgrades[key] = { level: 1, cost: spec.baseCost, value: spec.baseValue, maxLevel: spec.maxLevel };
    }
    return {
        cash: 0,
        fuel: 100, maxFuel: 100,
        hull: 100, maxHull: 100,
        cargo: {}, maxCargo: 10,
        depth: 0,
        upgrades,
    };
};


// --- REACT UI COMPONENTS ---

const HUD: React.FC<{ state: MotherloadPlayerState }> = React.memo(({ state }) => {
    const cargoTotal = Object.values(state.cargo).reduce((a, b) => a + b, 0);
    return (
        <div className="absolute top-0 left-0 right-0 p-2 text-white font-mono text-sm bg-black bg-opacity-40 select-none pointer-events-none grid grid-cols-5 gap-2">
            <div>Cash: ${state.cash}</div>
            <div>Depth: {Math.floor(state.depth)}m</div>
            <div>Fuel: {Math.ceil(state.fuel)} / {state.maxFuel}</div>
            <div>Hull: {Math.ceil(state.hull)} / {state.maxHull}</div>
            <div>Cargo: {cargoTotal} / {state.maxCargo}</div>
        </div>
    );
});

const Shop: React.FC<{ state: MotherloadPlayerState; onAction: (action: string, payload?: any) => void }> = React.memo(({ state, onAction }) => {
    const cargoValue = Object.entries(state.cargo).reduce((sum, [oreName, amount]) => {
        const ore = ORE_TYPES.find(o => o.name === oreName);
        return sum + (ore ? ore.value * amount : 0);
    }, 0);

    return (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center font-mono">
            <div className="bg-gray-800 text-white p-4 border-4 border-gray-500 w-[700px] h-[500px] flex flex-col">
                <h1 className="text-2xl text-center mb-4">Mars Surface Station</h1>
                <div className="flex-grow flex space-x-4 overflow-hidden">
                    {/* --- Left Panel: Services --- */}
                    <div className="w-1/3 flex flex-col space-y-4">
                        <div className="border p-2">
                            <h2 className="text-lg text-yellow-400">Services</h2>
                            <button onClick={() => onAction('refuel')} className="w-full text-left p-1 mt-2 bg-blue-600 hover:bg-blue-500">Refuel (Cost: ${Math.ceil(state.maxFuel - state.fuel)})</button>
                            <button onClick={() => onAction('repair')} className="w-full text-left p-1 mt-1 bg-green-600 hover:bg-green-500">Repair (Cost: ${Math.ceil(state.maxHull - state.hull) * 2})</button>
                        </div>
                        <div className="border p-2 flex-grow flex flex-col">
                             <h2 className="text-lg text-yellow-400">Cargo Hold</h2>
                             <div className="flex-grow overflow-y-auto my-2 bg-black bg-opacity-30 p-1">
                                {Object.entries(state.cargo).length > 0 ? Object.entries(state.cargo).map(([name, amount]) => (
                                    <div key={name} className="flex justify-between">
                                        <span>{name} x{amount}</span>
                                        <span>${(ORE_TYPES.find(o=>o.name===name)?.value || 0) * amount}</span>
                                    </div>
                                )) : <p className="text-gray-400">Empty</p>}
                             </div>
                             <button onClick={() => onAction('sell')} className="w-full text-left p-1 bg-purple-600 hover:bg-purple-500">Sell Ores (Value: ${cargoValue})</button>
                        </div>
                    </div>
                    {/* --- Right Panel: Upgrades --- */}
                    <div className="w-2/3 border p-2 flex flex-col">
                        <h2 className="text-lg text-yellow-400">Upgrades</h2>
                        <div className="flex-grow overflow-y-auto mt-2 space-y-1">
                            {Object.entries(state.upgrades).map(([key, upg]) => {
                                const spec = UPGRADE_SPECS[key as keyof typeof UPGRADE_SPECS];
                                const isMax = upg.level >= upg.maxLevel;
                                return (
                                    <button key={key} disabled={isMax || state.cash < upg.cost} onClick={() => onAction('upgrade', key)}
                                        className="w-full text-left p-1 flex justify-between bg-gray-700 hover:bg-gray-600 disabled:bg-gray-900 disabled:text-gray-500">
                                        <span>{spec.name} (Lvl {upg.level})</span>
                                        <span>{isMax ? 'MAX' : `$${upg.cost}`}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                 <button onClick={() => onAction('exit_shop')} className="w-full text-center p-2 mt-4 bg-red-700 hover:bg-red-600">LEAVE HANGAR</button>
            </div>
        </div>
    );
});

const GameOver: React.FC<{ onNewGame: () => void; score: number }> = ({ onNewGame, score }) => (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center font-mono text-white">
        <h1 className="text-5xl text-red-500 mb-4">GAME OVER</h1>
        <p className="text-xl mb-4">Final Score: ${score}</p>
        <button onClick={onNewGame} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-2xl">New Game</button>
    </div>
);


// --- MAIN GAME COMPONENT ---

export const Motherload: React.FC<{ isActive: boolean, instanceId: string }> = ({ isActive, instanceId }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const newGameRef = useRef<() => void>(() => {});

    // React state is used only for triggering UI updates (HUD, shop, game over)
    const [uiState, setUiState] = useState(getInitialPlayerState());
    const [showShop, setShowShop] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);

    // Menu event handler
    useEffect(() => {
        if (!isActive) return;
        const handler = (data: { instanceId: string }) => {
            if (data.instanceId === instanceId) {
                newGameRef.current();
            }
        };
        globalEmitter.subscribe('motherload:game:new', handler);
        return () => {
            globalEmitter.unsubscribe('motherload:game:new', handler);
        };
    }, [isActive]);
    
    // Main game setup and loop effect
    useEffect(() => {
        let animationFrameId: number;
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const clock = new THREE.Clock();
        const state = { current: getInitialPlayerState() };
        let worldGrid: Tile[][] = [];
        const inputState = { left: false, right: false, up: false, down: false };
        let lastUiUpdate = 0;
        const miningCooldown = { current: 0 };

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x110804);
        scene.fog = new THREE.Fog(0x110804, 100, 300);

        const camera = new THREE.OrthographicCamera();
        camera.position.z = 100;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        currentMount.appendChild(renderer.domElement);

        const playerBody = new THREE.Mesh(
            new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE),
            new THREE.MeshStandardMaterial({ color: 0xff0000, flatShading: true })
        );
        const player = { body: playerBody, velocity: new THREE.Vector2(0, 0) };
        scene.add(player.body);

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const playerLight = new THREE.PointLight(0xffffff, 150, 200);
        scene.add(playerLight);

        let instancedMeshes: Record<number, THREE.InstancedMesh> = {};

        const generateWorld = () => {
            const grid: Tile[][] = Array(WORLD_HEIGHT).fill(null).map(() => Array(WORLD_WIDTH).fill(null));
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                for (let x = 0; x < WORLD_WIDTH; x++) {
                    if (y < 5) {
                        grid[y][x] = { typeId: 0 };
                        continue;
                    }
                    const possibleOres = ORE_TYPES.map((ore, id) => ({ ...ore, id }))
                        .filter(ore => ore.id > 0 && y >= ore.rarity[0] && y <= ore.rarity[1]);
                    
                    let placed = false;
                    for(const ore of possibleOres) {
                        if (Math.random() < ore.density) {
                            grid[y][x] = { typeId: ore.id };
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) grid[y][x] = { typeId: 1 };
                }
            }
            worldGrid = grid;
        };

        const setupInstancedMeshes = () => {
            const tempMatrix = new THREE.Matrix4();
            ORE_TYPES.forEach((ore, typeId) => {
                if (typeId === 0) return;
                const mesh = new THREE.InstancedMesh(
                    new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE),
                    new THREE.MeshStandardMaterial({ color: ore.color }),
                    WORLD_WIDTH * WORLD_HEIGHT
                );
                mesh.name = ore.name;
                let count = 0;
                for (let y = 0; y < WORLD_HEIGHT; y++) {
                    for (let x = 0; x < WORLD_WIDTH; x++) {
                        if (worldGrid[y]?.[x]?.typeId === typeId) {
                            tempMatrix.setPosition(x * TILE_SIZE + TILE_SIZE / 2, -y * TILE_SIZE - TILE_SIZE / 2, 0);
                            mesh.setMatrixAt(count, tempMatrix);
                            worldGrid[y][x]!.instanceId = count++;
                        }
                    }
                }
                mesh.count = count;
                mesh.instanceMatrix.needsUpdate = true;
                instancedMeshes[typeId] = mesh;
                scene.add(mesh);
            });
        };
        
        const newGame = () => {
            state.current = getInitialPlayerState();
            setUiState(getInitialPlayerState());
            setIsGameOver(false);
            setShowShop(false);

            player.body.position.set(WORLD_WIDTH * TILE_SIZE / 2, -TILE_SIZE, 0);
            player.velocity.set(0, 0);

            Object.values(instancedMeshes).forEach(mesh => {
                if(mesh.parent) mesh.parent.remove(mesh);
                mesh.dispose();
            });
            instancedMeshes = {};
            
            generateWorld();
            setupInstancedMeshes();
        };
        newGameRef.current = newGame;

        const handleShopAction = (action: string, payload?: any) => {
            const s = state.current;
            switch(action) {
                case 'refuel': {
                    const cost = Math.ceil(s.maxFuel - s.fuel);
                    if (s.cash >= cost) { s.cash -= cost; s.fuel = s.maxFuel; }
                    break;
                }
                case 'repair': {
                    const cost = Math.ceil(s.maxHull - s.hull) * 2;
                    if (s.cash >= cost) { s.cash -= cost; s.hull = s.maxHull; }
                    break;
                }
                case 'sell': {
                    const cargoValue = Object.entries(s.cargo).reduce((sum, [oreName, amount]) => {
                        const ore = ORE_TYPES.find(o => o.name === oreName);
                        return sum + (ore ? ore.value * amount : 0);
                    }, 0);
                    s.cash += cargoValue;
                    s.cargo = {};
                    break;
                }
                case 'upgrade': {
                    const key = payload as keyof typeof s.upgrades;
                    const upg = s.upgrades[key];
                    if (s.cash >= upg.cost && upg.level < upg.maxLevel) {
                        s.cash -= upg.cost;
                        upg.level++;
                        const spec = UPGRADE_SPECS[key];
                        upg.cost = Math.floor(upg.cost * spec.costMultiplier);
                        upg.value = upg.value * spec.valueMultiplier;

                        s.maxFuel = s.upgrades.fuelTank.value;
                        s.maxCargo = s.upgrades.cargoBay.value;
                        s.maxHull = s.upgrades.hull.value;
                    }
                    break;
                }
                case 'exit_shop': {
                    setShowShop(false);
                    player.body.position.y = -TILE_SIZE * 1.5;
                    player.velocity.set(0, 0);
                    break;
                }
            }
            setUiState({ ...s });
        };
        
        currentMount.addEventListener('motherload:shopAction', ((e: CustomEvent) => {
            const { action, payload } = e.detail;
            handleShopAction(action, payload);
        }) as EventListener);

        const removeTile = (x: number, y: number): boolean => {
            if (y < 0 || y >= WORLD_HEIGHT || x < 0 || x >= WORLD_WIDTH) return false;
            const tile = worldGrid[y]?.[x];
            if (!tile || tile.typeId === 0) return false;
        
            const ore = ORE_TYPES[tile.typeId];
            if (state.current.upgrades.drill.value < ore.hardness) return false;
        
            const cargoTotal = Object.values(state.current.cargo).reduce((a, b) => a + b, 0);
            if (cargoTotal >= state.current.maxCargo) return false;
        
            if (ore.value > 0) {
                state.current.cargo[ore.name] = (state.current.cargo[ore.name] || 0) + 1;
            }
        
            const mesh = instancedMeshes[tile.typeId];
            if (mesh && tile.instanceId !== undefined) {
                const lastIndex = mesh.count - 1;
                const tempMatrix = new THREE.Matrix4();
                mesh.getMatrixAt(lastIndex, tempMatrix);
                mesh.setMatrixAt(tile.instanceId, tempMatrix);
        
                const [movedX, movedY] = [Math.floor(tempMatrix.elements[12] / TILE_SIZE), Math.floor(-tempMatrix.elements[13] / TILE_SIZE)];
                if(worldGrid[movedY]?.[movedX]) {
                    worldGrid[movedY][movedX]!.instanceId = tile.instanceId;
                }
        
                mesh.count--;
                mesh.instanceMatrix.needsUpdate = true;
            }
            worldGrid[y][x] = { typeId: 0 };
            return true;
        };
        
        const handleMining = (delta: number) => {
            if (miningCooldown.current > 0) {
                miningCooldown.current -= delta;
                return;
            }

            let mined = false;
            const px = Math.floor(player.body.position.x / TILE_SIZE);
            const py = Math.floor(-player.body.position.y / TILE_SIZE);

            if (inputState.down) {
                if (removeTile(px, py + 1)) mined = true;
            } else if (inputState.up) {
                if (removeTile(px, py - 1)) mined = true;
            } else if (inputState.left) {
                if (removeTile(px - 1, py)) mined = true;
            } else if (inputState.right) {
                if (removeTile(px + 1, py)) mined = true;
            }

            if (mined) {
                miningCooldown.current = 0.2; // 200ms cooldown
                state.current.fuel -= 0.5; // Mining consumes a bit of fuel
            }
        };

        const updateGame = (delta: number) => {
            // Apply forces
            player.velocity.y += GRAVITY;
            if (inputState.up && state.current.fuel > 0) {
                player.velocity.y += state.current.upgrades.engine.value;
                state.current.fuel -= 0.2;
            }
            if (inputState.down && state.current.fuel > 0) {
                player.velocity.y -= state.current.upgrades.engine.value * 0.5;
                state.current.fuel -= 0.1;
            }
            if (inputState.left && state.current.fuel > 0) {
                player.velocity.x -= state.current.upgrades.engine.value * 0.7;
                state.current.fuel -= 0.1;
            }
            if (inputState.right && state.current.fuel > 0) {
                player.velocity.x += state.current.upgrades.engine.value * 0.7;
                state.current.fuel -= 0.1;
            }
            state.current.fuel = Math.max(0, state.current.fuel);

            // Apply drag
            player.velocity.x *= 0.95;
            player.velocity.y *= 0.98;
            
            // Clamp velocity
            player.velocity.clampLength(0, TILE_SIZE * 0.8);
            
            const proposedPos = player.body.position.clone().add(new THREE.Vector3(player.velocity.x, player.velocity.y, 0).multiplyScalar(delta * 20));

            // --- AXIS-SEPARATED COLLISION DETECTION & RESPONSE ---
            const playerHalfSize = PLAYER_SIZE / 2;
            const damageThreshold = 8.0;
            const damageMultiplier = 3;

            // --- Y-AXIS COLLISION ---
            let newPosY = proposedPos.y;
            const p_left_world_x = player.body.position.x - playerHalfSize;
            const p_right_world_x = player.body.position.x + playerHalfSize;
            const p_top_world_pro_y = -newPosY - playerHalfSize;
            const p_bottom_world_pro_y = -newPosY + playerHalfSize;

            const tile_left_x = Math.floor(p_left_world_x / TILE_SIZE);
            const tile_right_x = Math.floor(p_right_world_x / TILE_SIZE);
            const tile_check_y = player.velocity.y <= 0 
                ? Math.floor(p_bottom_world_pro_y / TILE_SIZE) // Moving down
                : Math.floor(p_top_world_pro_y / TILE_SIZE);     // Moving up

            let collisionY = false;
            for (let x = tile_left_x; x <= tile_right_x; x++) {
                if (worldGrid[tile_check_y]?.[x]?.typeId > 0) {
                    collisionY = true;
                    break;
                }
            }

            if (collisionY) {
                const impactVelocity = Math.abs(player.velocity.y);
                if (impactVelocity > damageThreshold) {
                    state.current.hull -= (impactVelocity - damageThreshold) * damageMultiplier;
                }
                if (player.velocity.y < 0) { // Moving down
                    newPosY = -(tile_check_y * TILE_SIZE - playerHalfSize);
                } else if (player.velocity.y > 0) { // Moving up
                    newPosY = -((tile_check_y + 1) * TILE_SIZE + playerHalfSize);
                }
                player.velocity.y = 0;
            }
            player.body.position.y = newPosY;

            // --- X-AXIS COLLISION ---
            let newPosX = proposedPos.x;
            const p_top_world_res_y = -player.body.position.y - playerHalfSize;
            const p_bottom_world_res_y = -player.body.position.y + playerHalfSize;
            const p_left_world_pro_x = newPosX - playerHalfSize;
            const p_right_world_pro_x = newPosX + playerHalfSize;

            const tile_top_y = Math.floor(p_top_world_res_y / TILE_SIZE);
            const tile_bottom_y = Math.floor(p_bottom_world_res_y / TILE_SIZE);
            const tile_check_x = player.velocity.x >= 0
                ? Math.floor(p_right_world_pro_x / TILE_SIZE) // Moving right
                : Math.floor(p_left_world_pro_x / TILE_SIZE);  // Moving left

            let collisionX = false;
            for (let y = tile_top_y; y <= tile_bottom_y; y++) {
                if (worldGrid[y]?.[tile_check_x]?.typeId > 0) {
                    collisionX = true;
                    break;
                }
            }

            if (collisionX) {
                const impactVelocity = Math.abs(player.velocity.x);
                if (impactVelocity > damageThreshold) {
                     state.current.hull -= (impactVelocity - damageThreshold) * damageMultiplier;
                }
                if (player.velocity.x > 0) { // Moving right
                    newPosX = tile_check_x * TILE_SIZE - playerHalfSize;
                } else if (player.velocity.x < 0) { // Moving left
                    newPosX = (tile_check_x + 1) * TILE_SIZE + playerHalfSize;
                }
                player.velocity.x = 0;
            }
            player.body.position.x = newPosX;
            
            handleMining(delta);

            // Update depth and other state
            state.current.depth = -player.body.position.y / TILE_SIZE;
            state.current.hull = Math.max(0, state.current.hull);
            
            if (state.current.hull <= 0) setIsGameOver(true);
            if (player.body.position.y >= 0 && !showShop) setShowShop(true);
            
            // Update camera and light
            camera.position.x = player.body.position.x;
            camera.position.y = player.body.position.y;
            playerLight.position.copy(player.body.position);
        };
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();

            if (showShop || isGameOver) {
                 // Still render the scene to show the shop/game over screen over it
                 renderer.render(scene, camera);
                 return;
            }
            
            updateGame(delta);
            
            if (clock.elapsedTime - lastUiUpdate > 0.1) {
                 setUiState({ ...state.current });
                 lastUiUpdate = clock.elapsedTime;
            }
            
            renderer.render(scene, camera);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isActive || showShop || isGameOver) return;
            switch(e.code) {
                case 'KeyW': case 'ArrowUp': inputState.up = true; break;
                case 'KeyS': case 'ArrowDown': inputState.down = true; break;
                case 'KeyA': case 'ArrowLeft': inputState.left = true; break;
                case 'KeyD': case 'ArrowRight': inputState.right = true; break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch(e.code) {
                case 'KeyW': case 'ArrowUp': inputState.up = false; break;
                case 'KeyS': case 'ArrowDown': inputState.down = false; break;
                case 'KeyA': case 'ArrowLeft': inputState.left = false; break;
                case 'KeyD': case 'ArrowRight': inputState.right = false; break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                renderer.setSize(width, height);
                camera.left = -width / 2 * CAMERA_ZOOM;
                camera.right = width / 2 * CAMERA_ZOOM;
                camera.top = height / 2 * CAMERA_ZOOM;
                camera.bottom = -height / 2 * CAMERA_ZOOM;
                camera.updateProjectionMatrix();
            }
        });
        resizeObserver.observe(currentMount);

        newGame();
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.unobserve(currentMount);
            if (currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            Object.values(instancedMeshes).forEach(mesh => mesh.dispose());
        };
    }, [isActive]);

    const handleShopActionWrapper = (action: string, payload?: any) => {
        const root = mountRef.current;
        if(root){
            // This is a bit of a hack to communicate from React UI back to the imperative game loop.
            // A more robust solution would involve a shared state manager or an event bus.
            const event = new CustomEvent('motherload:shopAction', { detail: { action, payload } });
            root.dispatchEvent(event);
        }
    }

    return (
        <div className="w-full h-full bg-gray-900 text-white relative" onMouseDown={e => e.stopPropagation()}>
            <div ref={mountRef} className="w-full h-full cursor-none" />
            <HUD state={uiState} />
            {showShop && <Shop state={uiState} onAction={handleShopActionWrapper} />}
            {isGameOver && <GameOver onNewGame={newGameRef.current} score={uiState.cash} />}
        </div>
    );
};