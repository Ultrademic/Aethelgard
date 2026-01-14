
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, GameZone, PlayerStats, GameTarget, GroundItem } from '../types';

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
    lootMeshes: Map<string, THREE.Group>;
    keys: Record<string, boolean>;
    clock: THREE.Clock;
    lastAttackTime: number;
    isAttacking: boolean;
    attackStartTime: number;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    zoom: number;
    textures: { grass: THREE.CanvasTexture, dirt: THREE.CanvasTexture, stone: THREE.CanvasTexture, floor: THREE.CanvasTexture, sand: THREE.CanvasTexture };
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
    // Adjusted height for even larger models
    sprite.position.y = 50;
    sprite.scale.set(15, 3.75, 1);
    return { context, texture, sprite, name, isPlayer, isNPC };
  };

  const updateNameplate = (np: any, hp: number, maxHp: number) => {
    const ctx = np.context;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 36px Cinzel'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    ctx.fillText(np.name, 256, 44);
    const ratio = Math.max(0, hp / maxHp);
    ctx.fillStyle = '#000'; ctx.fillRect(136, 60, 240, 10);
    ctx.fillStyle = np.isPlayer ? '#33ccff' : (np.isNPC ? '#00ffcc' : '#ff3333'); 
    ctx.fillRect(136, 60, 240 * ratio, 10);
    np.texture.needsUpdate = true;
  };

  const checkCollision = (x: number, z: number, colliders: BoundingBox[]) => {
    const r = 8.0; // Slightly larger radius for scaled characters
    for (const box of colliders) {
      if (x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ) {
        return true;
      }
    }
    return false;
  };

  const spawnBuilding = (scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number, name: string, northDoor = false) => {
    const group = new THREE.Group();
    group.name = "env_building_" + name;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const floorMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.15;
    group.add(floor);
    
    const h = 45; const t = 2;

    const addWallSegment = (posX: number, posZ: number, wallW: number, wallD: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, h, wallD), wallMat);
      wall.position.set(posX, h/2, posZ);
      group.add(wall);
      engineRef.current?.colliders.push({
        minX: x + posX - wallW/2, maxX: x + posX + wallW/2,
        minZ: z + posZ - wallD/2, maxZ: z + posZ + wallD/2
      });
    };

    addWallSegment(-w/2, 0, t, d);
    addWallSegment(w/2, 0, t, d);
    if (!northDoor) addWallSegment(0, -d/2, w, t);
    else {
      const dw = 30;
      addWallSegment(-(w-dw)/4 - dw/2, -d/2, (w-dw)/2, t);
      addWallSegment((w-dw)/4 + dw/2, -d/2, (w-dw)/2, t);
    }
    const dw = 30;
    addWallSegment(-(w-dw)/4 - dw/2, d/2, (w-dw)/2, t);
    addWallSegment((w-dw)/4 + dw/2, d/2, (w-dw)/2, t);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
  };

  const createHumanoid = (color: number, isPlayer = false) => {
    // SCALING: Door height is 45. Target height is 3/4 of that (approx 33-34 units).
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color });
    
    // Body is a capsule. radius=5, length=12. Total height = 12 + 5 + 5 = 22.
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(5, 12, 4, 8), mat);
    body.position.y = 14; group.add(body);
    
    // Head radius 4.5. Positioned to bring total height to ~33.
    const head = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 8), mat);
    head.position.y = 28; group.add(head);
    
    const leftArm = new THREE.Group(); 
    leftArm.position.set(-8, 20, 0); 
    group.add(leftArm);
    
    const rightArm = new THREE.Group(); 
    rightArm.position.set(8, 20, 0); 
    group.add(rightArm);
    
    let weaponMesh = null;
    if (isPlayer) {
      weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 20, 2), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 }));
      weaponMesh.position.set(0, -10, 1.5); 
      weaponMesh.rotation.x = Math.PI/2;
      rightArm.add(weaponMesh);
    }
    return { group, parts: { leftArm, rightArm, body, head, weapon: weaponMesh } };
  };

  const createLootMesh = (loot: GroundItem) => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: loot.type === 'gold' ? 0xffd700 : 0x8b4513 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), mat);
    mesh.position.y = 2;
    group.add(mesh);
    group.position.set(loot.position.x, 0, loot.position.z);
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
      floor: generateProceduralTexture('#333333', '#444444'),
      sand: generateProceduralTexture('#443311', '#554422')
    };
    textures.grass.repeat.set(200, 200);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: textures.grass }));
    ground.rotation.x = -Math.PI / 2; ground.name = "ground"; scene.add(ground);

    const { group: player, parts: pParts } = createHumanoid(0x1a3a9a, true);
    scene.add(player);
    const playerNameplate = createNameplate("Hero", true); player.add(playerNameplate.sprite);

    const clock = new THREE.Clock();
    const keys: Record<string, boolean> = {};
    engineRef.current = { renderer, scene, camera, player, playerParts: pParts as any, playerNameplate, enemies: [], npcs: [], lootMeshes: new Map(), keys, clock, lastAttackTime: 0, isAttacking: false, attackStartTime: 0, raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(), zoom: 1, textures, colliders: [] };
    setIsEngineReady(true);

    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    const onWheel = (e: WheelEvent) => {
      if (engineRef.current) engineRef.current.zoom = Math.max(0.3, Math.min(2.5, engineRef.current.zoom + e.deltaY * 0.001));
    };
    const onClick = (e: MouseEvent) => {
      const { mouse, raycaster, camera, enemies, npcs, lootMeshes, player } = engineRef.current!;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      
      const enemyMeshes = enemies.map(en => en.group);
      const npcMeshes = npcs.map(n => n.group);
      const lootList = Array.from(lootMeshes.entries());
      const lootMeshObjects = lootList.map(([id, group]) => group);

      const eIntersects = raycaster.intersectObjects(enemyMeshes, true);
      const nIntersects = raycaster.intersectObjects(npcMeshes, true);
      const lIntersects = raycaster.intersectObjects(lootMeshObjects, true);

      if (lIntersects.length > 0) {
        const foundId = lootList.find(([id, group]) => group === lIntersects[0].object.parent || group === lIntersects[0].object)?.[0];
        if (foundId && player.position.distanceTo(lIntersects[0].point) < 60) {
          callbacks.current.onPickupLoot(foundId);
          return;
        }
      }

      if (eIntersects.length > 0) {
        const found = enemies.find(en => en.group === eIntersects[0].object.parent || en.group === eIntersects[0].object.parent?.parent);
        if (found) callbacks.current.onTargetChange({ name: found.type, hp: found.hp, maxHp: found.maxHp, type: 'enemy' });
      } else if (nIntersects.length > 0) {
        const found = npcs.find(n => n.group === nIntersects[0].object.parent || n.group === nIntersects[0].object.parent?.parent);
        if (found) {
          callbacks.current.onTargetChange({ name: found.name, hp: 100, maxHp: 100, type: 'npc' });
          if (player.position.distanceTo(found.group.position) < 60) callbacks.current.onInteraction(found.name);
        }
      } else callbacks.current.onTargetChange(null);
    };

    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel); window.addEventListener('click', onClick);

    const animate = () => {
      if (!engineRef.current) return;
      requestAnimationFrame(animate);
      const state = callbacks.current.gameState;
      const { scene, camera, player, playerParts, playerNameplate, enemies, clock, zoom, colliders, lootMeshes } = engineRef.current;
      const delta = clock.getDelta(); const time = clock.getElapsedTime();

      // Sync Loot
      state.groundItems.forEach(loot => {
        if (!lootMeshes.has(loot.id)) {
          const m = createLootMesh(loot);
          scene.add(m);
          lootMeshes.set(loot.id, m);
        }
      });
      lootMeshes.forEach((mesh, id) => {
        if (!state.groundItems.some(i => i.id === id)) {
          scene.remove(mesh);
          lootMeshes.delete(id);
        } else {
          mesh.rotation.y += delta * 2;
          mesh.position.y = 1.0 + Math.sin(time * 3) * 1.5;
        }
      });

      if (!state.isPaused && !state.isTransitioning && !state.isGameOver) {
        updateNameplate(playerNameplate, state.stats.health, state.stats.maxHealth);
        
        let moveVec = new THREE.Vector3(0, 0, 0);
        if (keys['KeyW']) moveVec.z -= 80 * delta; if (keys['KeyS']) moveVec.z += 80 * delta;
        if (keys['KeyA']) moveVec.x -= 80 * delta; if (keys['KeyD']) moveVec.x += 80 * delta;
        
        if (moveVec.length() > 0) {
          const nextX = player.position.x + moveVec.x;
          const nextZ = player.position.z + moveVec.z;
          if (!checkCollision(nextX, player.position.z, colliders)) player.position.x = nextX;
          if (!checkCollision(player.position.x, nextZ, colliders)) player.position.z = nextZ;
          player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, Math.atan2(moveVec.x, moveVec.z), 0.1);
          
          playerParts.leftArm.rotation.x = Math.sin(time * 10) * 1.2;
          playerParts.rightArm.rotation.x = -Math.sin(time * 10) * 1.2;
          callbacks.current.onPlayerMove(player.position.x, player.position.z);
        } else {
          playerParts.leftArm.rotation.x = THREE.MathUtils.lerp(playerParts.leftArm.rotation.x, 0, 0.1);
          playerParts.rightArm.rotation.x = THREE.MathUtils.lerp(playerParts.rightArm.rotation.x, 0, 0.1);
        }

        if (actionTrigger?.current?.type === 'attack') {
          actionTrigger.current.type = null;
          if (state.target && state.target.type === 'enemy') {
            const enemy = enemies.find(en => en.type === state.target?.name && en.group.position.distanceTo(player.position) < 50);
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
          if (dist < 150) {
            const dir = new THREE.Vector3().subVectors(player.position, en.group.position).normalize();
            en.group.position.add(dir.multiplyScalar(30 * delta));
            en.group.rotation.y = Math.atan2(dir.x, dir.z);
            if (dist < 30 && time - en.lastAttackTime > 2) {
              en.lastAttackTime = time;
              callbacks.current.onDamageTaken?.(10);
            }
          }
          updateNameplate(en.nameplate, en.hp, en.maxHp);
        });

        camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 180 * zoom, player.position.z + 240 * zoom), 0.1);
        camera.lookAt(player.position.x, player.position.y + 15, player.position.z);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('wheel', onWheel); window.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isEngineReady || !engineRef.current) return;
    const { scene, textures, enemies, npcs, player, colliders } = engineRef.current;
    
    scene.children.filter(o => o.name && o.name.startsWith('env_')).forEach(o => scene.remove(o));
    enemies.forEach(e => scene.remove(e.group));
    npcs.forEach(n => scene.remove(n.group));
    
    enemies.length = 0; npcs.length = 0; colliders.length = 0;
    player.position.set(0, 0, 0);

    const ground = scene.getObjectByName("ground") as THREE.Mesh;
    const groundMat = ground.material as THREE.MeshStandardMaterial;

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

    if (gameState.zone === 'Castle') {
      groundMat.map = textures.stone; groundMat.needsUpdate = true;
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

      // CENTRAL FOUNTAIN (Visual centerpiece)
      const fountainGeo = new THREE.CylinderGeometry(40, 50, 10, 8);
      const fountainMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const fountain = new THREE.Mesh(fountainGeo, fountainMat);
      fountain.position.set(0, 5, 0); fountain.name = "env_fountain"; scene.add(fountain);
      const waterGeo = new THREE.SphereGeometry(30, 16, 16);
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6, emissive: 0x0044ff });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.set(0, 20, 0); water.name = "env_fountain_core"; scene.add(water);
      colliders.push({ minX: -50, maxX: 50, minZ: -50, maxZ: 50 });

      // GUILDS & SHOPS
      spawnBuilding(scene, -200, -350, 100, 100, 0x440000, "Warrior Guild");
      spawnNPC("Warrior Master", -200, -280, 0xaa0000);

      spawnBuilding(scene, 200, -350, 100, 100, 0x000044, "Mage Guild");
      spawnNPC("Magister", 200, -280, 0x0000ff);

      spawnBuilding(scene, -200, 350, 100, 100, 0x004400, "Archer Guild");
      spawnNPC("Master Archer", -200, 280, 0x00ff00);

      spawnBuilding(scene, 200, 350, 100, 100, 0x333333, "Blacksmith Shop");
      spawnNPC("Blacksmith", 200, 280, 0x555555);

      spawnBuilding(scene, 0, -350, 120, 80, 0x440044, "Magic Shop");
      spawnNPC("Magic Seller", 0, -290, 0xaa00aa);

      spawnNPC("Aether Sage", 100, -100, 0xeeeeee);
      spawnNPC("Gatekeeper Milia", 350, 0, 0x00aaaa);
      
    } else if (gameState.zone === 'Forest') {
      groundMat.map = textures.grass; groundMat.needsUpdate = true;
      for (let i = 0; i < 40; i++) {
        const x = (Math.random()-0.5)*1500; const z = (Math.random()-0.5)*1500;
        const tree = new THREE.Mesh(new THREE.BoxGeometry(10, 80, 10), new THREE.MeshStandardMaterial({ color: 0x4d2600 }));
        tree.position.set(x, 40, z); tree.name = "env_tree"; scene.add(tree);
        colliders.push({ minX: x-5, maxX: x+5, minZ: z-5, maxZ: z+5 });
      }
      for (let i = 0; i < 15; i++) spawnEnemy("Wolf", (Math.random()-0.5)*800, (Math.random()-0.5)*800, 50);
    } else if (gameState.zone === 'Village') {
      groundMat.map = textures.sand; groundMat.needsUpdate = true;
      for (let i = 0; i < 20; i++) {
        const x = (Math.random()-0.5)*1000; const z = (Math.random()-0.5)*1000;
        const ruin = new THREE.Mesh(new THREE.BoxGeometry(30, Math.random()*40, 30), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        ruin.position.set(x, 15, z); ruin.name = "env_ruin"; scene.add(ruin);
        colliders.push({ minX: x-15, maxX: x+15, minZ: z-15, maxZ: z+15 });
      }
      for (let i = 0; i < 10; i++) spawnEnemy("Skeleton", (Math.random()-0.5)*800, (Math.random()-0.5)*800, 100);
    }

  }, [isEngineReady, gameState.zone]);

  return <div ref={containerRef} className="absolute inset-0 bg-black" />;
};
export default GameCanvas;
