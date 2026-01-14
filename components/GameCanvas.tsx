
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
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
    playerMixer?: THREE.AnimationMixer;
    playerActions: Record<string, THREE.AnimationAction>;
    currentAction?: string;
    playerNameplate: any;
    enemies: { group: THREE.Group; type: string; hp: number; maxHp: number; lastAttackTime: number; nameplate: any; mixer?: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction> }[];
    npcs: { group: THREE.Group; name: string; nameplate: any; mixer?: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction> }[];
    lootMeshes: Map<string, THREE.Group>;
    keys: Record<string, boolean>;
    clock: THREE.Clock;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    zoom: number;
    textures: { grass: THREE.CanvasTexture, dirt: THREE.CanvasTexture, stone: THREE.CanvasTexture, floor: THREE.CanvasTexture, sand: THREE.CanvasTexture };
    colliders: BoundingBox[];
    modelAsset?: any;
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
    sprite.position.y = 45;
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
    const r = 8.0; 
    for (const box of colliders) {
      if (x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ) return true;
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
    const h = 45, t = 2;
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
    const dw = 30;
    if (!northDoor) addWallSegment(0, -d/2, w, t);
    else {
      addWallSegment(-(w-dw)/4 - dw/2, -d/2, (w-dw)/2, t);
      addWallSegment((w-dw)/4 + dw/2, -d/2, (w-dw)/2, t);
    }
    if (northDoor) addWallSegment(0, d/2, w, t);
    else {
      addWallSegment(-(w-dw)/4 - dw/2, d/2, (w-dw)/2, t);
      addWallSegment((w-dw)/4 + dw/2, d/2, (w-dw)/2, t);
    }
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
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

  const createModelInstance = (asset: any, tintColor: number) => {
    const model = SkeletonUtils.clone(asset.scene);
    model.updateMatrixWorld(true);
    const scale = 18; 
    model.scale.set(scale, scale, scale);
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.color.lerp(new THREE.Color(tintColor), 0.5);
        child.frustumCulled = false;
      }
    });
    const mixer = new THREE.AnimationMixer(model);
    const actions: Record<string, THREE.AnimationAction> = {};
    asset.animations.forEach((clip: any) => {
      actions[clip.name] = mixer.clipAction(clip);
    });
    return { model, mixer, actions };
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000);
    containerRef.current.appendChild(renderer.domElement);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
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

    const player = new THREE.Group();
    player.name = "player_root";
    scene.add(player);
    const playerNameplate = createNameplate("Hero", true); player.add(playerNameplate.sprite);

    const pLight = new THREE.PointLight(0x33ccff, 1, 150);
    pLight.position.y = 20;
    player.add(pLight);

    const clock = new THREE.Clock();
    const keys: Record<string, boolean> = {};
    engineRef.current = { 
      renderer, scene, camera, player, playerActions: {}, 
      playerNameplate, enemies: [], npcs: [], 
      lootMeshes: new Map(), keys, clock, 
      raycaster: new THREE.Raycaster(), 
      mouse: new THREE.Vector2(), zoom: 1.2, textures, colliders: [] 
    };

    const loader = new GLTFLoader();
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb', (gltf) => {
      engineRef.current!.modelAsset = gltf;
      const { model, mixer, actions } = createModelInstance(gltf, 0xffffff);
      player.add(model);
      engineRef.current!.playerMixer = mixer;
      engineRef.current!.playerActions = actions;
      engineRef.current!.currentAction = 'Idle';
      actions['Idle']?.play();
      setIsEngineReady(true);
    }, undefined, (err) => console.error("Model load failed:", err));

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
        const found = enemies.find(en => en.group === eIntersects[0].object.parent || en.group === eIntersects[0].object.parent?.parent || en.group === eIntersects[0].object.parent?.parent?.parent);
        if (found) callbacks.current.onTargetChange({ name: found.type, hp: found.hp, maxHp: found.maxHp, type: 'enemy' });
      } else if (nIntersects.length > 0) {
        const found = npcs.find(n => n.group === nIntersects[0].object.parent || n.group === nIntersects[0].object.parent?.parent || n.group === nIntersects[0].object.parent?.parent?.parent);
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
      const { renderer, scene, camera, player, playerMixer, playerActions, playerNameplate, enemies, npcs, clock, zoom, colliders, lootMeshes } = engineRef.current;
      const delta = clock.getDelta(); const time = clock.getElapsedTime();

      if (playerMixer) playerMixer.update(delta);
      enemies.forEach(en => en.mixer?.update(delta));
      npcs.forEach(n => n.mixer?.update(delta));

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
        
        const isMoving = moveVec.lengthSq() > 0;
        const targetActionName = isMoving ? 'Run' : 'Idle';
        if (engineRef.current.currentAction !== targetActionName) {
          const prevAction = playerActions[engineRef.current.currentAction!];
          const nextAction = playerActions[targetActionName];
          if (prevAction && nextAction) {
            nextAction.reset().fadeIn(0.2).play();
            prevAction.fadeOut(0.2);
            engineRef.current.currentAction = targetActionName;
          }
        }

        if (isMoving) {
          const nextX = player.position.x + moveVec.x;
          const nextZ = player.position.z + moveVec.z;
          if (!checkCollision(nextX, player.position.z, colliders)) player.position.x = nextX;
          if (!checkCollision(player.position.x, nextZ, colliders)) player.position.z = nextZ;
          const targetRotation = Math.atan2(moveVec.x, moveVec.z);
          let diff = targetRotation - player.rotation.y;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          player.rotation.y += diff * 0.15;
          callbacks.current.onPlayerMove(player.position.x, player.position.z);
        }

        if (actionTrigger?.current?.type === 'attack') {
          actionTrigger.current.type = null;
          if (state.target && state.target.type === 'enemy') {
            const enemy = enemies.find(en => en.type === state.target?.name && en.group.position.distanceTo(player.position) < 65);
            if (enemy) {
              const dmg = Math.floor(Math.random() * 15) + 10;
              enemy.hp -= dmg;
              callbacks.current.onDamageDealt(dmg);
              callbacks.current.onTargetChange({ ...state.target, hp: enemy.hp });
              if (enemy.hp <= 0) {
                if (enemy.type === 'Training Dummy') {
                  enemy.hp = enemy.maxHp; // Dummies reset
                  callbacks.current.onTargetChange({ ...state.target, hp: enemy.hp });
                } else {
                  scene.remove(enemy.group); engineRef.current.enemies = enemies.filter(en => en !== enemy);
                  callbacks.current.onEnemyDefeat(enemy.type, enemy.group.position.x, enemy.group.position.z);
                  callbacks.current.onTargetChange(null);
                }
              }
            }
          }
        }

        enemies.forEach(en => {
          if (en.type === 'Training Dummy') {
            updateNameplate(en.nameplate, en.hp, en.maxHp);
            return;
          }
          const dist = en.group.position.distanceTo(player.position);
          if (dist < 150) {
            const dir = new THREE.Vector3().subVectors(player.position, en.group.position).normalize();
            en.group.position.add(dir.multiplyScalar(30 * delta));
            en.group.rotation.y = Math.atan2(dir.x, dir.z);
            if (en.actions['Run']) en.actions['Run'].play();
            if (dist < 30 && time - en.lastAttackTime > 2) {
              en.lastAttackTime = time;
              callbacks.current.onDamageTaken?.(10);
            }
          } else {
             if (en.actions['Idle']) en.actions['Idle'].play();
             if (en.actions['Run']) en.actions['Run']?.stop();
          }
          updateNameplate(en.nameplate, en.hp, en.maxHp);
        });

        camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 180 * zoom, player.position.z + 240 * zoom), 0.1);
        camera.lookAt(player.position.x, player.position.y + 18, player.position.z);
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
    if (!isEngineReady || !engineRef.current || !engineRef.current.modelAsset) return;
    const { scene, textures, enemies, npcs, player, colliders, modelAsset } = engineRef.current;
    
    scene.children.filter(o => o.name && o.name.startsWith('env_')).forEach(o => scene.remove(o));
    enemies.forEach(e => scene.remove(e.group));
    npcs.forEach(n => scene.remove(n.group));
    
    enemies.length = 0; npcs.length = 0; colliders.length = 0;
    player.position.set(0, 0, 150);

    const ground = scene.getObjectByName("ground") as THREE.Mesh;
    const groundMat = ground.material as THREE.MeshStandardMaterial;

    const spawnNPC = (name: string, x: number, z: number, color = 0xcca100, rotation = 0) => {
      const group = new THREE.Group();
      const { model, mixer, actions } = createModelInstance(modelAsset, color);
      group.add(model);
      group.position.set(x, 0, z); group.name = "npc_" + name;
      group.rotation.y = rotation;
      const np = createNameplate(name, false, true); group.add(np.sprite);
      updateNameplate(np, 100, 100);
      actions['Idle']?.play();
      scene.add(group); 
      npcs.push({ group, name, nameplate: np, mixer, actions });
    };

    const spawnEnemy = (type: string, x: number, z: number, hp: number) => {
      const group = new THREE.Group();
      const { model, mixer, actions } = createModelInstance(modelAsset, 0x444444); 
      group.add(model);
      group.position.set(x, 0, z); group.name = "enemy_" + type;
      const np = createNameplate(type); group.add(np.sprite);
      updateNameplate(np, hp, hp);
      actions['Idle']?.play();
      scene.add(group); 
      enemies.push({ group, type, hp, maxHp: hp, lastAttackTime: 0, nameplate: np, mixer, actions });
    };

    const spawnTrainingDummy = (x: number, z: number) => {
      const group = new THREE.Group();
      group.name = "env_dummy";
      const woodMat = new THREE.MeshStandardMaterial({ map: textures.dirt, color: 0x8b4513 });
      const strawMat = new THREE.MeshStandardMaterial({ map: textures.sand, color: 0xeedd88 });
      
      const post = new THREE.Mesh(new THREE.BoxGeometry(4, 30, 4), woodMat);
      post.position.y = 15;
      group.add(post);
      
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(6, 15, 4, 8), strawMat);
      body.position.y = 20;
      group.add(body);

      const crossBar = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 2), woodMat);
      crossBar.position.y = 25;
      group.add(crossBar);

      const np = createNameplate("Training Dummy");
      group.add(np.sprite);
      updateNameplate(np, 999, 999);

      group.position.set(x, 0, z);
      scene.add(group);
      enemies.push({ group, type: 'Training Dummy', hp: 999, maxHp: 999, lastAttackTime: 0, nameplate: np, actions: {} });
      colliders.push({ minX: x - 10, maxX: x + 10, minZ: z - 10, maxZ: z + 10 });
    };

    const spawnMagicWorkbench = (x: number, z: number) => {
      const group = new THREE.Group();
      group.name = "env_magic_table";
      const woodMat = new THREE.MeshStandardMaterial({ map: textures.dirt, color: 0x2b1a10 });
      const top = new THREE.Mesh(new THREE.BoxGeometry(45, 3, 20), woodMat);
      top.position.y = 10;
      group.add(top);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10, 1.5), woodMat);
        leg.position.set(i % 2 === 0 ? 20 : -20, 5, i < 2 ? 8 : -8);
        group.add(leg);
      }
      
      const spawnPotion = (posX: number, posZ: number, color: number) => {
        const pot = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 4, 8), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 }));
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
        neck.position.y = 2.5;
        const stopper = new THREE.Mesh(new THREE.SphereGeometry(0.7), new THREE.MeshStandardMaterial({ color: 0x331100 }));
        stopper.position.y = 3.2;
        pot.add(body, neck, stopper);
        pot.position.set(posX, 11.5, posZ);
        group.add(pot);
      };

      spawnPotion(-15, 0, 0xff0000);
      spawnPotion(-10, 3, 0x0000ff);
      spawnPotion(-12, -4, 0x00ff00);

      for (let i = 0; i < 5; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 }));
        coin.position.set(10 + Math.random() * 5, 11.5 + i * 0.6, Math.random() * 4 - 2);
        coin.rotation.y = Math.random() * Math.PI;
        group.add(coin);
      }

      group.position.set(x, 0, z);
      scene.add(group);
      colliders.push({ minX: x - 25, maxX: x + 25, minZ: z - 12, maxZ: z + 12 });
    };

    const spawnBlacksmithWorkbench = (x: number, z: number) => {
      const group = new THREE.Group();
      group.name = "env_workbench";
      const woodMat = new THREE.MeshStandardMaterial({ map: textures.dirt, color: 0x4d2600 });
      const top = new THREE.Mesh(new THREE.BoxGeometry(40, 4, 25), woodMat);
      top.position.y = 10;
      group.add(top);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), woodMat);
        leg.position.set(i % 2 === 0 ? 18 : -18, 5, i < 2 ? 10 : -10);
        group.add(leg);
      }
      
      const shield = new THREE.Group();
      const sBody = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1, 16), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 }));
      const sRim = new THREE.Mesh(new THREE.TorusGeometry(8, 0.5, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0 }));
      sRim.rotation.x = Math.PI / 2;
      shield.add(sBody, sRim);
      shield.position.set(-8, 12.5, 0);
      shield.rotation.x = 0.2;
      group.add(shield);

      const spawnSword = (posX: number, posZ: number, rotY: number) => {
        const sword = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 15, 0.2), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 }));
        blade.position.y = 7.5;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x553311 }));
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3), new THREE.MeshStandardMaterial({ color: 0x553311 }));
        hilt.position.y = -1.5;
        sword.add(blade, guard, hilt);
        sword.rotation.z = Math.PI / 2;
        sword.rotation.y = rotY;
        sword.position.set(posX, 12.5, posZ);
        group.add(sword);
      };

      spawnSword(8, -5, 0.5);
      spawnSword(12, 5, -0.3);

      group.position.set(x, 0, z);
      scene.add(group);
      colliders.push({ minX: x - 20, maxX: x + 20, minZ: z - 12, maxZ: z + 12 });
    };

    if (gameState.zone === 'Castle') {
      groundMat.map = textures.stone; groundMat.needsUpdate = true;
      const citySize = 800;
      const wallMat = new THREE.MeshStandardMaterial({ map: textures.stone, color: 0x333333 });
      const wallGeo = new THREE.BoxGeometry(20, 100, 20);
      for (let i = -citySize/2; i <= citySize/2; i += 20) {
        if (Math.abs(i) > 60) {
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
      const fountainGeo = new THREE.CylinderGeometry(40, 50, 10, 8);
      const fountain = new THREE.Mesh(fountainGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
      fountain.position.set(0, 5, 0); fountain.name = "env_fountain"; scene.add(fountain);
      const water = new THREE.Mesh(new THREE.SphereGeometry(30, 16, 16), new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6, emissive: 0x0044ff }));
      water.position.set(0, 20, 0); water.name = "env_fountain_core"; scene.add(water);
      colliders.push({ minX: -55, maxX: 55, minZ: -55, maxZ: 55 });

      spawnBuilding(scene, -320, -250, 100, 120, 0x440000, "Warrior Guild", false);
      spawnNPC("Warrior Master", -320, -170, 0xff0000, Math.PI); // Facing North
      spawnTrainingDummy(-285, -170);
      spawnTrainingDummy(-355, -170);

      spawnBuilding(scene, 320, -250, 100, 120, 0x000044, "Mage Guild", false);
      spawnNPC("Magister", 320, -170, 0x0000ff);
      spawnBuilding(scene, -320, 250, 100, 120, 0x004400, "Archer Guild", true);
      spawnNPC("Master Archer", -320, 170, 0x00ff00);
      spawnBuilding(scene, 320, 250, 100, 120, 0x333333, "Blacksmith Shop", true);
      spawnNPC("Blacksmith", 320, 170, 0x555555);
      spawnBlacksmithWorkbench(320, 140); // North of Blacksmith (Z decreases)

      spawnBuilding(scene, 0, 330, 120, 80, 0x440044, "Magic Shop", true);
      spawnNPC("Magic Seller", 0, 270, 0xaa00aa);
      spawnMagicWorkbench(0, 240); // North of Magic Seller

      spawnNPC("Aether Sage", 120, 0, 0xeeeeee);
      spawnNPC("Gatekeeper Milia", 250, 80, 0x00aaaa);
    } else if (gameState.zone === 'Forest') {
      groundMat.map = textures.grass; groundMat.needsUpdate = true;
      for (let i = 0; i < 40; i++) {
        const x = (Math.random()-0.5)*1500, z = (Math.random()-0.5)*1500;
        const tree = new THREE.Mesh(new THREE.BoxGeometry(10, 80, 10), new THREE.MeshStandardMaterial({ color: 0x4d2600 }));
        tree.position.set(x, 40, z); tree.name = "env_tree"; scene.add(tree);
        colliders.push({ minX: x-5, maxX: x+5, minZ: z-5, maxZ: z+5 });
      }
      for (let i = 0; i < 15; i++) spawnEnemy("Wolf", (Math.random()-0.5)*800, (Math.random()-0.5)*800, 50);
    } else if (gameState.zone === 'Village') {
      groundMat.map = textures.sand; groundMat.needsUpdate = true;
      for (let i = 0; i < 20; i++) {
        const x = (Math.random()-0.5)*1000, z = (Math.random()-0.5)*1000;
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
