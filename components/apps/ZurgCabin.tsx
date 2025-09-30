

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useApp } from '../../types';

interface AppProps {
  isActive: boolean;
  instanceId: string;
}

export const ZurgCabin: React.FC<AppProps> = ({ isActive, instanceId }) => {
    const { openApp } = useApp();
    const mountRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<THREE.Group | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const moveState = useRef({ forward: false, backward: false, left: false, right: false });
    const lookState = useRef({ up: false, down: false, left: false, right: false });
    const clock = useRef(new THREE.Clock());

    const [showInteractionPrompt, setShowInteractionPrompt] = useState(false);
    const canInteractRef = useRef(false);
    
    const collidables = useRef<THREE.Mesh[]>([]);
    const pcInteractionZone = useRef<THREE.Box3>(new THREE.Box3());

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;
        
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
        cameraRef.current = camera;
        
        const player = new THREE.Group();
        player.position.set(0, 1.6, 4);
        player.add(camera);
        scene.add(player);
        playerRef.current = player;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        currentMount.appendChild(renderer.domElement);
        
        const onKeyDown = (e: KeyboardEvent) => {
            if (!isActive) return;
            switch(e.code) {
                case 'KeyW': moveState.current.forward = true; break;
                case 'KeyS': moveState.current.backward = true; break;
                case 'KeyA': moveState.current.left = true; break;
                case 'KeyD': moveState.current.right = true; break;
                case 'ArrowUp': lookState.current.up = true; break;
                case 'ArrowDown': lookState.current.down = true; break;
                case 'ArrowLeft': lookState.current.left = true; break;
                case 'ArrowRight': lookState.current.right = true; break;
                case 'KeyE': if(canInteractRef.current) { openApp('old-pc'); } break;
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
             switch(e.code) {
                case 'KeyW': moveState.current.forward = false; break;
                case 'KeyS': moveState.current.backward = false; break;
                case 'KeyA': moveState.current.left = false; break;
                case 'KeyD': moveState.current.right = false; break;
                case 'ArrowUp': lookState.current.up = false; break;
                case 'ArrowDown': lookState.current.down = false; break;
                case 'ArrowLeft': lookState.current.left = false; break;
                case 'ArrowRight': lookState.current.right = false; break;
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        const materialOptions = { flatShading: true };
        const woodMat = new THREE.MeshStandardMaterial({ ...materialOptions, color: 0x8B4513 });
        const floorMat = new THREE.MeshStandardMaterial({ ...materialOptions, color: 0x4a2a0a });
        const wallHeight = 3.0;
        const wallThickness = 0.2;
        const roomSize = new THREE.Vector3(10, wallHeight, 10);
        
        const cabin = new THREE.Group();
        scene.add(cabin);

        const createWall = (size: [number, number, number], pos: [number, number, number], rotY = 0) => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(...size), woodMat);
            wall.position.set(...pos);
            wall.rotation.y = rotY;
            wall.castShadow = true;
            wall.receiveShadow = true;
            cabin.add(wall);
            collidables.current.push(wall);
        };
        
        const floor = new THREE.Mesh(new THREE.BoxGeometry(roomSize.x, 0.2, roomSize.z), floorMat);
        floor.position.y = 0;
        floor.receiveShadow = true;
        cabin.add(floor);
        collidables.current.push(floor);

        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomSize.x, 0.2, roomSize.z), woodMat);
        ceiling.position.y = roomSize.y;
        cabin.add(ceiling);
        
        createWall([roomSize.x, roomSize.y, wallThickness], [0, roomSize.y / 2, -roomSize.z / 2]);
        createWall([roomSize.x, roomSize.y, wallThickness], [0, roomSize.y / 2, roomSize.z / 2]);
        createWall([roomSize.z, roomSize.y, wallThickness], [-roomSize.x / 2, roomSize.y / 2, 0], Math.PI / 2);
        createWall([roomSize.z, roomSize.y, wallThickness], [roomSize.x / 2, roomSize.y / 2, 0], Math.PI / 2);

        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.7), woodMat);
        desk.position.set(0, 0.5, -4.5);
        cabin.add(desk);
        collidables.current.push(desk);

        const pc = new THREE.Group();
        const pcMaterial = new THREE.MeshStandardMaterial({...materialOptions, color: 0xddddcc});
        const screenMaterial = new THREE.MeshBasicMaterial({color: 0x1a1a1a});
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.1), pcMaterial);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), screenMaterial);
        screen.position.z = 0.051;
        pc.add(monitor, screen);
        pc.position.set(desk.position.x, 1.25, desk.position.z);
        cabin.add(pc);

        pc.updateWorldMatrix(true, false);
        const interactionHelper = new THREE.Box3().setFromObject(monitor);
        pcInteractionZone.current.copy(interactionHelper).expandByScalar(1.2);
        
        const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.1), woodMat);
        door.position.set(0, 1, (roomSize.z / 2) - wallThickness);
        cabin.add(door);

        scene.add(new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.2));
        const pcLight = new THREE.PointLight(0x99ffaa, 20, 5);
        pcLight.position.set(pc.position.x, pc.position.y, pc.position.z + 0.5);
        pcLight.castShadow = true;
        scene.add(pcLight);

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.current.getDelta();
            const moveSpeed = 3.0;
            const lookSpeed = 1.5;

            const localPlayerRef = playerRef.current;
            const localCameraRef = cameraRef.current;

            if (!localPlayerRef || !localCameraRef) {
                renderer.render(scene, camera);
                return;
            }

            const deltaYaw = (Number(lookState.current.left) - Number(lookState.current.right)) * lookSpeed * delta;
            localPlayerRef.rotation.y += deltaYaw;
            const deltaPitch = (Number(lookState.current.up) - Number(lookState.current.down)) * lookSpeed * delta;
            localCameraRef.rotation.x = THREE.MathUtils.clamp(localCameraRef.rotation.x + deltaPitch, -Math.PI / 2, Math.PI / 2);

            const moveDirection = new THREE.Vector3(
                Number(moveState.current.right) - Number(moveState.current.left), 0,
                Number(moveState.current.backward) - Number(moveState.current.forward)
            ).normalize().applyQuaternion(localPlayerRef.quaternion);
            
            const proposedPosition = localPlayerRef.position.clone().add(moveDirection.multiplyScalar(moveSpeed * delta));
            
            const playerBox = new THREE.Box3().setFromCenterAndSize(proposedPosition, new THREE.Vector3(0.5, 1.6, 0.5));
            let collision = false;
            for (const obj of collidables.current) {
                obj.updateWorldMatrix(true, false);
                const objBox = new THREE.Box3().setFromObject(obj);
                if (playerBox.intersectsBox(objBox)) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                localPlayerRef.position.copy(proposedPosition);
            }
            
            const canInteract = pcInteractionZone.current.containsPoint(localPlayerRef.position);
            canInteractRef.current = canInteract;
            setShowInteractionPrompt(canInteract);
            
            renderer.render(scene, camera);
        };
        animate();
        
        const onResize = () => {
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            if (currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [openApp, isActive]);

    return (
        <div className="w-full h-full relative bg-black">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-3xl pointer-events-none">+</div>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded-md pointer-events-none font-mono text-sm">
                <div>Move: WASD</div>
                <div>Look: Arrow Keys</div>
            </div>
            {showInteractionPrompt && (
                <div className="absolute top-1/2 mt-8 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white p-2 rounded-md pointer-events-none">
                    Press [E] to use PC
                </div>
            )}
        </div>
    );
};