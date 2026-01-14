
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, GameZone, PlayerStats, GameTarget } from '../types';

interface BoundingBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface GameCanvasProps {
  gameState: GameState;
  onInteraction: (npc: string) => void;
  onStatUpdate: (stats: Partial<PlayerStats>) => void;
  onZoneChange: (zone: GameZone) => void;
  onPlayerMove: (x: number, z: number) => void;
  onEnemyDefeat: (target: string, x: number, z: number) => void;
  onUseMana: (amount: number) => void;
  onTargetChange: (target: GameTarget | null) => void;
  onDamageDealt: (dmg: number) => void;
  onDamageTaken?: (dmg: number) => void;
  onPickupLoot: (id: string) => void;
  onAbilityUse: () => void;
  actionTrigger?: React.RefObject<{ type: 'attack' | 'skill' | null }>;
}

const GameCanvas: React.FC<GameCanvasProps> = (props) => {
  const { gameState, actionTrigger } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  const callbacks = useRef(props);
  useEffect(() => { callbacks.current = props; }, [props]);

  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    player: THREE.Group;
    playerParts: { leftArm: THREE.Object3D, rightArm: THREE.Object3D, body: THREE.Object3D, weapon: THREE.Mesh, head: THREE.Object3D };
    playerNameplate: any;
    enemies: { group: THREE.Group; mesh: THREE.Mesh; type: string; level: number; hp: number; maxHp: number; lastHitTime: number; lastAttackTime: number; parts: any; nameplate: any; wanderTarget: THREE.Vector3, spawnOrigin: THREE.Vector3 }[];
    npcs: { group: THREE.Group; name: string; parts: any; nameplate: any, shoutPlate?: any, lastShoutTime: number, shoutInterval: number }[];
    keys: Record<string, boolean>;
    clock: THREE.Clock;
    lastAttackTime: number;
    isAttacking: boolean;
    attackStartTime: number;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    zoom: number;
    textures: { grass: THREE.CanvasTexture, dirt: THREE.CanvasTexture, stone: THREE.CanvasTexture, floor: THREE.CanvasTexture };
    ground: THREE.Mesh;
    colliders: BoundingBox[];
  } | null>(null);

  const generateProceduralTexture = (color1: string, color2: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const r1 = parseInt(color1.slice(1, 3), 16), g1 = parseInt(color1.slice(3, 5), 16), b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16), g2 = parseInt(color2.slice(3, 5), 16), b2 = parseInt(color2.slice(5, 7), 16);
    for (let i = 0; i < 512 * 512; i++) {
      const n = Math.random();
      ctx.fillStyle = `rgb(${r1 + (r2 - r1) * n}, ${g1 + (g2 - g1) * n}, ${b1 + (b2 - b1) * n})`;
      ctx.fillRect(i % 512, Math.floor(i / 512), 1, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  };

  const createNameplate = (name: string, isPlayer = false, isNPC = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 12; // High billboard
    sprite.scale.set(10, 2.5, 1);
    return { context, texture, sprite, name, isPlayer, isNPC };
  };

  const updateNameplate = (np: any, hp: number, maxHp: number) => {
    const ctx = np.context;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 32px Cinzel'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    ctx.fillText(np.name, 256, 44);
    ctx.shadowBlur = 0;
    const ratio = Math.max(0, hp / maxHp);
    ctx.fillStyle = '#000'; ctx.fillRect(136, 60, 240, 10);
    ctx.fillStyle = np.isPlayer ? '#33ccff' : (np.isNPC ? '#00ffcc' : '#ff3333'); 
    ctx.fillRect(136, 60, 240 * ratio, 10);
    np.texture.needsUpdate = true;
  };

  const createHumanoid = (color: number, isPlayer = false) => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1, 2, 4, 8), mat);
    body.position.y = 2.5; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), mat);
    head.position.y = 5; group.add(head);
    const leftArm = new THREE.Group(); leftArm.position.set(-1.5, 3.8, 0); group.add(leftArm);
    const rightArm = new THREE.Group(); rightArm.position.set(1.5, 3.8, 0); group.add(rightArm);
    let weaponMesh = null;
    if (isPlayer) {
      weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 0.4), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 }));
      weaponMesh.position.set(0, -2, 0.3); weaponMesh.rotation.x = Math.PI/2;
      rightArm.add(weaponMesh);
    }
    return { group, parts: { leftArm, rightArm, body, head, weapon: weaponMesh } };
  };

  const checkCollision = (nextX: number, nextZ: number, colliders: BoundingBox[]) => {
    const margin = 2.5; // Player radius roughly
    for (const box of colliders) {
      if (nextX + margin > box.minX && nextX - margin < box.maxX &&
          nextZ + margin > box.minZ && nextZ - margin < box.maxZ) {
        return true;
      }
    }
    return false;
  };

  const spawnBuilding = (scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number, name: string, hasNorthDoor = false) => {
    const group = new THREE.Group();
    group.name = "env_building_" + name;
    
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const floorMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    
    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.15;
    group.add(floor);
    
    const h = 45;
    const t = 2; // wall thickness

    // Helper to add collider and mesh
    const addWall = (posX: number, posZ: number, wallW: number, wallD: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, h, wallD), wallMat);
      wall.position.set(posX, h / 2, posZ);
      group.add(wall);
      engineRef.current?.colliders.push({
        minX: x + posX - wallW / 2, maxX: x + posX + wallW / 2,
        minZ: z + posZ - wallD / 2, maxZ: z + posZ + wallD / 2
      });
    };

    // Left & Right Walls
    addWall(-w / 2, 0, t, d);
    addWall(w / 2, 0, t, d);

    // Back wall (North wall)
    if (!hasNorthDoor) {
      addWall(0, -d / 2, w, t);
    } else {
      const doorSize = 25;
      const wallPartW = (w - doorSize) / 2;
      addWall(-(w / 2) + (wallPartW / 2), -d / 2, wallPartW, t);
      addWall((w / 2) - (wallPartW / 2), -d / 2, wallPartW, t);
    }

    // Front wall (South wall) with door
    const doorSize = 25;
    const frontSideW = (w - doorSize) / 2;
    addWall(-(w / 2) + (frontSideW / 2), d / 2, frontSideW, t);
    addWall((w / 2) - (frontSideW / 2), d / 2, frontSideW, t);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(200, 500, 200); scene.add(sun);

    const textures = {
      grass: generateProceduralTexture('#0a1a0a', '#1a331a'),
      dirt: generateProceduralTexture('#1a1005', '#2b1a10'),
      stone: generateProceduralTexture('#111111', '#222222'),
      floor: generateProceduralTexture('#333333', '#444444')
    };
    textures.grass.repeat.set(200, 200);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: textures.grass }));
    ground.rotation.x = -Math.PI / 2; scene.add(ground);

    const { group: player, parts: pParts } = createHumanoid(0x1a3a9a, true);
    scene.add(player);
    const playerNameplate = createNameplate("Hero", true); player.add(playerNameplate.sprite);

    const clock = new THREE.Clock();
    const keys: Record<string, boolean> = {};
    engineRef.current = { renderer, scene, camera, player, playerParts: pParts as any, playerNameplate, enemies: [], npcs: [], keys, clock, lastAttackTime: 0, isAttacking: false, attackStartTime: 0, raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(), zoom: 1, textures, ground, colliders: [] };
    setIsEngineReady(true);

    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    const onClick = (e: MouseEvent) => {
      const state = callbacks.current.gameState;
      const { mouse, raycaster, camera, enemies, npcs } = engineRef.current!;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const enemyMeshes = enemies.map(en => en.group);
      const npcMeshes = npcs.map(n => n.group);
      const eIntersects = raycaster.intersectObjects(enemyMeshes, true);
      const nIntersects = raycaster.intersectObjects(npcMeshes, true);
      if (eIntersects.length > 0) {
        const found = enemies.find(en => en.group === eIntersects[0].object.parent || en.group === eIntersects[0].object.parent?.parent);
        if (found) callbacks.current.onTargetChange({ name: found.type, hp: found.hp, maxHp: found.maxHp, type: 'enemy' });
      } else if (nIntersects.length > 0) {
        const found = npcs.find(n => n.group === nIntersects[0].object.parent || n.group === nIntersects[0].object.parent?.parent);
        if (found) {
          callbacks.current.onTargetChange({ name: found.name, hp: 100, maxHp: 100, type: 'npc' });
          if (player.position.distanceTo(found.group.position) < 25) callbacks.current.onInteraction(found.name);
        }
      } else callbacks.current.onTargetChange(null);
    };

    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('click', onClick);

    const animate = () => {
      if (!engineRef.current) return;
      requestAnimationFrame(animate);
      const state = callbacks.current.gameState;
      const { scene, camera, player, playerParts, playerNameplate, enemies, clock, zoom, colliders } = engineRef.current;
      const delta = clock.getDelta(); const time = clock.getElapsedTime();

      if (!state.isPaused && !state.isTransitioning && !state.isGameOver) {
        updateNameplate(playerNameplate, state.stats.health, state.stats.maxHealth);
        
        let moveVec = new THREE.Vector3(0, 0, 0);
        if (keys['KeyW']) moveVec.z -= 45 * delta; if (keys['KeyS']) moveVec.z += 45 * delta;
        if (keys['KeyA']) moveVec.x -= 45 * delta; if (keys['KeyD']) moveVec.x += 45 * delta;
        
        if (moveVec.length() > 0) {
          const nextX = player.position.x + moveVec.x;
          const nextZ = player.position.z + moveVec.z;
          
          if (!checkCollision(nextX, player.position.z, colliders)) player.position.x = nextX;
          if (!checkCollision(player.position.x, nextZ, colliders)) player.position.z = nextZ;

          player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, Math.atan2(moveVec.x, moveVec.z), 0.1);
          playerParts.leftArm.rotation.x = Math.sin(time * 15) * 0.8;
          playerParts.rightArm.rotation.x = -Math.sin(time * 15) * 0.8;
          callbacks.current.onPlayerMove(player.position.x, player.position.z);
        }

        if (actionTrigger?.current?.type === 'attack') {
          actionTrigger.current.type = null;
          if (state.target && state.target.type === 'enemy') {
            const enemy = enemies.find(en => en.type === state.target?.name && en.group.position.distanceTo(player.position) < 25);
            if (enemy) {
              const dmg = Math.floor(Math.random() * 15) + 10;
              enemy.hp -= dmg; enemy.lastHitTime = time;
              callbacks.current.onDamageDealt(dmg);
              callbacks.current.onTargetChange({ ...state.target, hp: enemy.hp });
              if (enemy.hp <= 0) {
                scene.remove(enemy.group); engineRef.current.enemies = enemies.filter(en => en !== enemy);
                callbacks.current.onEnemyDefeat(enemy.type, enemy.group.position.x, enemy.group.position.z);
                callbacks.current.onTargetChange(null);
              }
            }
          }
        }

        enemies.forEach(en => {
          const dist = en.group.position.distanceTo(player.position);
          if (dist < 80) {
            const dir = new THREE.Vector3().subVectors(player.position, en.group.position).normalize();
            en.group.position.add(dir.multiplyScalar(15 * delta));
            en.group.rotation.y = Math.atan2(dir.x, dir.z);
            if (dist < 15 && time - en.lastAttackTime > 2) {
              en.lastAttackTime = time;
              callbacks.current.onDamageTaken?.(10);
            }
          }
          updateNameplate(en.nameplate, en.hp, en.maxHp);
        });

        camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 115 * zoom, player.position.z + 145 * zoom), 0.1);
        camera.lookAt(player.position.x, player.position.y + 5, player.position.z);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isEngineReady || !engineRef.current) return;
    const { scene, textures, enemies, npcs, player, colliders } = engineRef.current;
    scene.children.filter(o => o.name && o.name.startsWith('env_')).forEach(o => scene.remove(o));
    enemies.length = 0; npcs.length = 0; colliders.length = 0;
    player.position.set(0, 0, 0);

    const spawnNPC = (name: string, x: number, z: number, color = 0xcca100) => {
      const { group } = createHumanoid(color);
      group.position.set(x, 0, z); group.name = "npc_" + name;
      const np = createNameplate(name, false, true); group.add(np.sprite);
      updateNameplate(np, 100, 100);
      scene.add(group); npcs.push({ group, name, parts: {}, nameplate: np, lastShoutTime: 0, shoutInterval: 0 });
    };

    const spawnEnemy = (type: string, x: number, z: number, hp: number) => {
      const { group } = createHumanoid(0x444444);
      group.position.set(x, 0, z); group.name = "enemy_" + type;
      const np = createNameplate(type); group.add(np.sprite);
      updateNameplate(np, hp, hp);
      scene.add(group); enemies.push({ group, mesh: null as any, type, level: 1, hp, maxHp: hp, lastHitTime: 0, lastAttackTime: 0, parts: {}, nameplate: np, wanderTarget: new THREE.Vector3(), spawnOrigin: new THREE.Vector3() });
    };

    const citySize = 800;
    const wallGeo = new THREE.BoxGeometry(20, 100, 20);
    const wallMat = new THREE.MeshStandardMaterial({ map: textures.stone, color: 0x333333 });

    for (let i = -citySize/2; i <= citySize/2; i += 20) {
      if (Math.abs(i) > 40) {
        const wallN = new THREE.Mesh(wallGeo, wallMat); wallN.position.set(i, 50, -citySize/2); wallN.name="env_wall"; scene.add(wallN);
        colliders.push({ minX: i-10, maxX: i+10, minZ: -citySize/2-10, maxZ: -citySize/2+10 });
      }
      const wallS = new THREE.Mesh(wallGeo, wallMat); wallS.position.set(i, 50, citySize/2); wallS.name="env_wall"; scene.add(wallS);
      colliders.push({ minX: i-10, maxX: i+10, minZ: citySize/2-10, maxZ: citySize/2+10 });
      const wallW = new THREE.Mesh(wallGeo, wallMat); wallW.position.set(-citySize/2, 50, i); wallW.name="env_wall"; scene.add(wallW);
      colliders.push({ minX: -citySize/2-10, maxX: -citySize/2+10, minZ: i-10, maxZ: i+10 });
      const wallE = new THREE.Mesh(wallGeo, wallMat); wallE.position.set(citySize/2, 50, i); wallE.name="env_wall"; scene.add(wallE);
      colliders.push({ minX: citySize/2-10, maxX: citySize/2+10, minZ: i-10, maxZ: i+10 });
    }

    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(100, citySize), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pathNS.rotation.x = -Math.PI/2; pathNS.position.set(0, 0.1, 0); pathNS.name = "env_path"; scene.add(pathNS);
    const pathWE = new THREE.Mesh(new THREE.PlaneGeometry(citySize, 100), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    pathWE.rotation.x = -Math.PI/2; pathWE.position.set(0, 0.1, 0); pathWE.name = "env_path"; scene.add(pathWE);

    // --- REFINED BUILDING POSITIONS (MATCHING MAP) ---
    
    // Top Row
    spawnBuilding(scene, -300, -300, 120, 120, 0x440044, "Mage Guild");
    spawnNPC("Magister", -300, -320, 0xaa00aa);
    
    // Warrior Guild moved East to avoid blocking gate
    spawnBuilding(scene, 230, -350, 150, 100, 0x440000, "Warrior Guild");
    spawnNPC("Warrior Master", 230, -370, 0xaa0000);
    
    spawnBuilding(scene, 300, -300, 100, 100, 0x004444, "Gatekeeper");
    spawnNPC("Gatekeeper Milia", 300, -320, 0x00aaaa);

    // Center Row
    spawnBuilding(scene, -200, -100, 100, 80, 0x444444, "Newbie Guide");
    spawnNPC("Newbie Guide", -200, -110, 0x888888);

    spawnBuilding(scene, 300, -100, 150, 120, 0x444400, "Temple");
    spawnNPC("High Priest", 300, -120, 0xaaaa00);

    // Magic Shop at center with North and South doors
    spawnBuilding(scene, 0, 0, 100, 80, 0x4444ff, "Magic Shop", true);
    spawnNPC("Magic Seller", 0, -10, 0x8888ff);

    spawnBuilding(scene, -350, 0, 100, 120, 0x004400, "Archer Guild");
    spawnNPC("Master Archer", -350, -20, 0x00aa00);

    // Bottom Row
    spawnBuilding(scene, 0, 150, 150, 100, 0x442200, "Warehouse");
    spawnNPC("Warehouse Keeper", 0, 140, 0xaa5500);

    spawnBuilding(scene, 300, 150, 120, 100, 0x224400, "Grocery Store");
    spawnNPC("Grocery Seller", 300, 140, 0x55aa00);

    spawnBuilding(scene, -300, 300, 120, 120, 0x222222, "Blacksmith");
    spawnNPC("Blacksmith", -300, 280, 0x666666);
    spawnNPC("Zephyr", -220, 280, 0xffaa00);

    spawnBuilding(scene, 300, 300, 150, 120, 0x440000, "Weapons and Armor Shop");
    spawnNPC("Armor Seller", 300, 280, 0xaa4444);

    const forestPath = new THREE.Mesh(new THREE.PlaneGeometry(80, 1000), new THREE.MeshStandardMaterial({ color: 0x110500 }));
    forestPath.rotation.x = -Math.PI/2; forestPath.position.set(0, 0.1, -citySize/2 - 500); forestPath.name = "env_path"; scene.add(forestPath);
    
    for (let i = 0; i < 15; i++) {
      spawnEnemy("Wolf", (Math.random()-0.5)*300, -citySize/2 - 200 - Math.random()*600, 50);
    }

  }, [isEngineReady, gameState.zone]);

  return <div ref={containerRef} className="absolute inset-0 bg-black" />;
};
export default GameCanvas;
