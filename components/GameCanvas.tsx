
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState, GameZone, PlayerStats, GameTarget } from '../types';

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

const SHOUTS = [
  "Trinkets for sale!",
  "Knives and wares!",
  "Magic potions for sale!",
  "Fine armor here!",
  "Rare artifacts!",
  "Best prices in Aethelgard!",
  "Aether-infused goods!",
  "Step right up, traveler!"
];

const FANTASY_NAMES = [
  "Baelen", "Cormac", "Doran", "Elowen", "Faelan", "Garrick", 
  "Hestia", "Ivor", "Jora", "Kael", "Lira", "Marek", "Nola", "Orin", 
  "Phaedra", "Quill", "Rowan", "Silas", "Thane", "Ulric", "Vesper", 
  "Wren", "Xander", "Yara", "Kaelen", "Lyra", "Valen"
];

const GameCanvas: React.FC<GameCanvasProps> = (props) => {
  const { gameState, actionTrigger } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  }, [props]);

  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    player: THREE.Group;
    playerParts: { leftArm: THREE.Object3D, rightArm: THREE.Object3D, body: THREE.Object3D, weapon: THREE.Mesh, head: THREE.Object3D };
    playerNameplate: any;
    enemies: { group: THREE.Group; mesh: THREE.Mesh; type: string; level: number; hp: number; maxHp: number; lastHitTime: number; lastAttackTime: number; parts: any; nameplate: any; wanderTarget: THREE.Vector3, spawnOrigin: THREE.Vector3 }[];
    npcs: { group: THREE.Group; name: string; parts: any; nameplate: any, shoutPlate?: any, lastShoutTime: number, shoutInterval: number }[];
    portals: { mesh: THREE.Group; targetZone: GameZone }[];
    keys: Record<string, boolean>;
    clock: THREE.Clock;
    lastAttackTime: number;
    isAttacking: boolean;
    attackStartTime: number;
    lastRespawnTime: number;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    sun: THREE.DirectionalLight;
    shake: number;
    lastPortalTime: number;
    zoom: number;
    textures: { grass: THREE.CanvasTexture, dirt: THREE.CanvasTexture, stone: THREE.CanvasTexture, bark: THREE.CanvasTexture, leaves: THREE.CanvasTexture };
    ground: THREE.Mesh;
    instancedGrass: THREE.InstancedMesh | null;
  } | null>(null);

  const fastNoise = (ctx: CanvasRenderingContext2D, width: number, height: number, color1: string, color2: string, scale: number = 0.5) => {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const r1 = parseInt(color1.slice(1, 3), 16), g1 = parseInt(color1.slice(3, 5), 16), b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16), g2 = parseInt(color2.slice(3, 5), 16), b2 = parseInt(color2.slice(5, 7), 16);
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      let n = (Math.sin(x * scale * 0.1) + Math.cos(y * scale * 0.1)) * 0.5;
      n += (Math.sin(x * scale * 0.5 + y * scale * 0.2) + Math.cos(y * scale * 0.4 - x * scale * 0.1)) * 0.25;
      n += Math.random() * 0.1;
      const noise = THREE.MathUtils.clamp((n + 1) / 2, 0, 1);
      data[i] = r1 + (r2 - r1) * noise;
      data[i + 1] = g1 + (g2 - g1) * noise;
      data[i + 2] = b1 + (b2 - b1) * noise;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const generateProceduralTexture = (type: 'grass' | 'dirt' | 'stone' | 'bark' | 'leaves') => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    if (type === 'grass') fastNoise(ctx, size, size, '#0b1a0b', '#1a331a', 0.8);
    else if (type === 'dirt') fastNoise(ctx, size, size, '#1a1005', '#2b1a10', 1.2);
    else if (type === 'stone') fastNoise(ctx, size, size, '#111111', '#222222', 0.5);
    else if (type === 'bark') fastNoise(ctx, size, size, '#1a1110', '#2b1d1a', 2.0);
    else if (type === 'leaves') fastNoise(ctx, size, size, '#051405', '#0a2e0c', 1.5);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  };

  const createNameplate = (name: string, isPlayer: boolean = false, isNPC: boolean = false, isShout: boolean = false) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    
    if (isShout) {
      sprite.position.y = 12;
      sprite.scale.set(10, 2.5, 1);
      sprite.visible = false;
    } else {
      sprite.position.y = isPlayer ? 8.5 : isNPC ? 8.5 : 6.5;
      sprite.scale.set(8, 2, 1);
    }
    
    sprite.renderOrder = 999;
    return { canvas, context, texture, sprite, name, isPlayer, isNPC, isShout, lastHP: -1, lastMP: -1, lastText: "" };
  };

  const updateShoutplate = (np: any, text: string) => {
    if (np.lastText === text) return;
    np.lastText = text;
    const ctx = np.context;
    ctx.clearRect(0, 0, 512, 128);
    
    // Bubble background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.roundRect(64, 16, 384, 80, 20);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Bubble tail
    ctx.beginPath();
    ctx.moveTo(256 - 20, 96);
    ctx.lineTo(256 + 20, 96);
    ctx.lineTo(256, 120);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 24px Inter, sans-serif'; 
    ctx.textAlign = 'center'; 
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 256, 65);
    
    np.texture.needsUpdate = true;
  };

  const updateNameplate = (np: any, currentHp: number, maxHp: number, currentMp: number = 0, maxMp: number = 100) => {
    const hpRatio = Math.max(0, currentHp / maxHp);
    const mpRatio = Math.max(0, currentMp / maxMp);
    if (np.lastHP === hpRatio && np.lastMP === mpRatio) return;
    np.lastHP = hpRatio; np.lastMP = mpRatio;
    const ctx = np.context;
    ctx.clearRect(0, 0, 512, 128);
    ctx.font = 'bold 36px Cinzel, serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(np.name, 256 + 2, 44 + 2); 
    ctx.fillStyle = np.isNPC ? '#00ffcc' : (np.isPlayer ? '#ffffff' : '#ff4444');
    ctx.fillText(np.name, 256, 44);
    
    if (!np.isShout) {
      const barW = 240; const barH = 12; const startX = 256 - barW / 2; const startY = 60;
      ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(startX, startY, barW, barH);
      ctx.fillStyle = hpRatio > 0.3 ? '#ff3333' : '#ffcc00'; ctx.fillRect(startX, startY, barW * hpRatio, barH);
      if (np.isPlayer) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(startX, startY + 16, barW, 6);
        ctx.fillStyle = '#3399ff'; ctx.fillRect(startX, startY + 16, barW * mpRatio, 6);
      }
    }
    np.texture.needsUpdate = true;
  };

  const createHumanoid = (color: number, isPlayer: boolean = false, type: 'human' | 'wolf' | 'wraith' = 'human') => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: isPlayer ? 0.6 : 0.1 });
    let parts: any = {};
    if (type === 'human') {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 2.0, 4, 8), mat);
      body.position.y = 2.5; body.castShadow = true; group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), mat);
      head.position.y = 5.0; head.castShadow = true; group.add(head);
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-1.5, 3.8, 0);
      const leftArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.75, 4, 8), mat);
      leftArmMesh.position.y = -1.1; leftArmGroup.add(leftArmMesh);
      group.add(leftArmGroup);
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(1.5, 3.8, 0);
      const rightArmMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.75, 4, 8), mat);
      rightArmMesh.position.y = -1.1; rightArmGroup.add(rightArmMesh);
      group.add(rightArmGroup);
      parts = { body, head, leftArm: leftArmGroup, rightArm: rightArmGroup };
      if (isPlayer) {
        const weaponGroup = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.0, 0.4), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9 }));
        blade.position.y = 2.0; blade.castShadow = true; weaponGroup.add(blade);
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x442200 }));
        hilt.castShadow = true; weaponGroup.add(hilt);
        weaponGroup.position.set(0, -2.1, 0.3); weaponGroup.rotation.x = Math.PI / 2;
        rightArmGroup.add(weaponGroup);
        parts.weapon = blade;
      }
    } else if (type === 'wolf') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 3.0), mat);
      body.position.y = 1.5; group.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.25), mat);
      head.position.set(0, 2.5, 1.5); group.add(head);
      parts = { body, head };
    } else if (type === 'wraith') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.25, 8, 8), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.6 }));
      body.position.y = 5.0; group.add(body);
      parts = { body };
    }
    return { group, parts };
  };

  const spawnStall = (scene: THREE.Scene, x: number, z: number, facing: 'left' | 'right') => {
    const stallGroup = new THREE.Group();
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x442211 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(15, 1, 30), tableMat);
    table.position.y = 4; table.castShadow = true; table.receiveShadow = true;
    stallGroup.add(table);
    const legGeo = new THREE.BoxGeometry(1, 4, 1);
    const legPositions = [{x: 6.5, z: 14}, {x: -6.5, z: 14}, {x: 6.5, z: -14}, {x: -6.5, z: -14}];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(p.x, 2, p.z);
      stallGroup.add(leg);
    });
    const wareColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0xdddddd];
    for (let i = 0; i < 10; i++) {
      const type = Math.floor(Math.random() * 3);
      let mesh;
      const mat = new THREE.MeshStandardMaterial({ color: wareColors[Math.floor(Math.random() * wareColors.length)] });
      if (type === 0) mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), mat);
      else if (type === 1) mesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), mat);
      else mesh = new THREE.Mesh(new THREE.ConeGeometry(1, 3, 8), mat);
      mesh.position.set((Math.random()-0.5)*10, 5.5, (Math.random()-0.5)*24);
      mesh.castShadow = true;
      stallGroup.add(mesh);
    }
    stallGroup.position.set(facing === 'left' ? x - 25 : x + 25, 0, z);
    scene.add(stallGroup);
    return stallGroup;
  };

  const spawnTree = (scene: THREE.Scene, x: number, z: number, barkTex: THREE.Texture, leafTex: THREE.Texture) => {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 18, 8), new THREE.MeshStandardMaterial({ map: barkTex }));
    trunk.position.y = 9; trunk.castShadow = true; group.add(trunk);
    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(10, 1), new THREE.MeshStandardMaterial({ map: leafTex }));
    canopy.position.y = 18; canopy.castShadow = true; group.add(canopy);
    group.position.set(x, 0, z); group.name = "env_tree"; scene.add(group);
  };

  const spawnHouse = (scene: THREE.Scene, x: number, z: number, stoneTex: THREE.Texture, facing: 'left' | 'right') => {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x333333, side: THREE.DoubleSide });
    const w = 40; const h = 30; const d = 40;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), mat);
    floor.position.y = 0.5; floor.receiveShadow = true; group.add(floor);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(1, h, d), mat);
    backWall.position.set(facing === 'left' ? w/2 - 0.5 : -w/2 + 0.5, h/2, 0);
    backWall.castShadow = true; backWall.receiveShadow = true; group.add(backWall);
    const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), mat);
    sideWallL.position.set(0, h/2, d/2 - 0.5);
    sideWallL.castShadow = true; sideWallL.receiveShadow = true; group.add(sideWallL);
    const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), mat);
    sideWallR.position.set(0, h/2, -d/2 + 0.5);
    sideWallR.castShadow = true; sideWallR.receiveShadow = true; group.add(sideWallR);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.8, h * 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x221111 }));
    roof.position.y = h + (h * 0.4); roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    group.position.set(x, 0, z); group.name = "env_house"; scene.add(group);
  };

  const spawnGate = (scene: THREE.Scene, z: number, stoneTex: THREE.Texture) => {
    const group = new THREE.Group();
    const towerGeo = new THREE.BoxGeometry(30, 140, 30);
    const towerMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x0a0a0a });
    const leftTower = new THREE.Mesh(towerGeo, towerMat); leftTower.position.set(-65, 70, 0); leftTower.castShadow = true; group.add(leftTower);
    const rightTower = new THREE.Mesh(towerGeo, towerMat); rightTower.position.set(65, 70, 0); rightTower.castShadow = true; group.add(rightTower);
    const arch = new THREE.Mesh(new THREE.BoxGeometry(100, 30, 20), towerMat); arch.position.set(0, 120, 0); arch.castShadow = true; group.add(arch);
    group.position.set(0, 0, z); group.name = "env_castle_gate";
    scene.add(group);
  };

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
    sun.position.set(400, 800, 400); sun.castShadow = true;
    sun.shadow.camera.left = -1500; sun.shadow.camera.right = 1500; sun.shadow.camera.top = 1500; sun.shadow.camera.bottom = -1500;
    sun.shadow.mapSize.width = 4096; sun.shadow.mapSize.height = 4096;
    scene.add(sun);
    const textures = {
      grass: generateProceduralTexture('grass'), dirt: generateProceduralTexture('dirt'),
      stone: generateProceduralTexture('stone'), bark: generateProceduralTexture('bark'), leaves: generateProceduralTexture('leaves')
    };
    textures.grass.repeat.set(512, 512); textures.dirt.repeat.set(256, 256); textures.stone.repeat.set(128, 128);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshStandardMaterial({ map: textures.grass }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = "env_ground"; scene.add(ground);
    const grassBladeGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([-0.2, 0, 0, 0.2, 0, 0, 0, 3.2, 0]);
    grassBladeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const grassMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, grassColor: { value: new THREE.Color(0x0a1a0a) }, tipColor: { value: new THREE.Color(0x1a331a) } },
      vertexShader: `uniform float time; varying float vHeight; void main() { vec3 pos = position; vHeight = pos.y; float sway = sin(time * 2.0 + instanceMatrix[3][0] * 0.4 + instanceMatrix[3][2] * 0.4) * 0.5; pos.x += sway * (pos.y * pos.y) * 0.12; pos.z += sway * 0.4 * (pos.y * pos.y) * 0.08; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(pos, 1.0); }`,
      fragmentShader: `uniform vec3 grassColor; uniform vec3 tipColor; varying float vHeight; void main() { gl_FragColor = vec4(mix(grassColor, tipColor, vHeight / 3.2), 1.0); }`,
      side: THREE.DoubleSide
    });
    const instancedGrass = new THREE.InstancedMesh(grassBladeGeo, grassMat, 70000);
    instancedGrass.name = "env_instanced_grass"; scene.add(instancedGrass);
    const skyGeo = new THREE.SphereGeometry(4000, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: { topColor: { value: new THREE.Color(0x000511) }, bottomColor: { value: new THREE.Color(0x001122) }, offset: { value: 33 }, exponent: { value: 0.6 } },
      vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4( position, 1.0 ); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main() { float h = normalize( vWorldPosition + offset ).y; gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 ); }`,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));
    const { group: player, parts: pParts } = createHumanoid(0x1a3a9a, true);
    scene.add(player);
    const playerNameplate = createNameplate("You", true); player.add(playerNameplate.sprite);
    const clock = new THREE.Clock(); const keys: Record<string, boolean> = {};
    engineRef.current = { renderer, scene, camera, player, playerParts: pParts as any, playerNameplate, enemies: [], npcs: [], portals: [], keys, clock, lastAttackTime: 0, isAttacking: false, attackStartTime: 0, lastRespawnTime: 0, raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(), sun, shake: 0, lastPortalTime: 0, zoom: 1.0, textures, ground, instancedGrass };
    setIsEngineReady(true);
    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    const onWheel = (e: WheelEvent) => { if (engineRef.current) engineRef.current.zoom = Math.max(0.4, Math.min(2.5, engineRef.current.zoom + e.deltaY * 0.001)); };
    const onClick = (e: MouseEvent) => {
      if (!engineRef.current) return;
      const { mouse, raycaster, camera, enemies } = engineRef.current;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const targets = enemies.map(en => en.group);
      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        let hit = intersects[0].object; while (hit.parent && !hit.name.startsWith("enemy_")) hit = hit.parent as THREE.Mesh;
        const enemy = enemies.find(en => en.group === hit);
        if (enemy) callbacks.current.onTargetChange({ name: enemy.type, hp: enemy.hp, maxHp: enemy.maxHp, type: 'enemy' });
      } else {
        const npcTargets = engineRef.current.npcs.map(n => n.group);
        const npcIntersects = raycaster.intersectObjects(npcTargets, true);
        if (npcIntersects.length > 0) {
          let hit = npcIntersects[0].object; while (hit.parent && !hit.name.startsWith("npc_")) hit = hit.parent as THREE.Mesh;
          const npc = engineRef.current.npcs.find(n => n.group === hit);
          if (npc) {
            callbacks.current.onTargetChange({ name: npc.name, hp: 100, maxHp: 100, type: 'npc' });
            if (engineRef.current.player.position.distanceTo(npc.group.position) < 22) callbacks.current.onInteraction(npc.name);
          }
        } else callbacks.current.onTargetChange(null);
      }
    };
    window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel); window.addEventListener('click', onClick);
    const animate = () => {
        if (!engineRef.current) return;
        requestAnimationFrame(animate);
        const state = callbacks.current.gameState;
        const { renderer, scene, camera, player, playerParts, playerNameplate, instancedGrass, zoom, enemies, clock, npcs } = engineRef.current;
        const delta = clock.getDelta(); const time = clock.getElapsedTime();
        if (!(state.isPaused || state.isTransitioning || state.isGameOver)) {
            updateNameplate(playerNameplate, state.stats.health, state.stats.maxHealth, state.stats.mana, state.stats.maxMana);
            if (instancedGrass) { (instancedGrass.material as THREE.ShaderMaterial).uniforms.time.value = time; }
            npcs.forEach(npc => {
              if (npc.shoutPlate) {
                const elapsed = time - npc.lastShoutTime;
                if (elapsed > npc.shoutInterval) {
                   const msg = SHOUTS[Math.floor(Math.random() * SHOUTS.length)];
                   updateShoutplate(npc.shoutPlate, msg);
                   npc.shoutPlate.sprite.visible = true;
                   npc.lastShoutTime = time;
                } else if (elapsed > 3.0) { npc.shoutPlate.sprite.visible = false; }
              }
            });
            if (actionTrigger?.current?.type === 'attack') {
              actionTrigger.current.type = null;
              if (!engineRef.current.isAttacking && time - engineRef.current.lastAttackTime > 0.5) {
                engineRef.current.isAttacking = true;
                engineRef.current.attackStartTime = time;
                engineRef.current.lastAttackTime = time;
                if (state.target && state.target.type === 'enemy') {
                  const enemy = enemies.find(en => en.type === state.target?.name && en.group.position.distanceTo(player.position) < 25);
                  if (enemy) {
                    const dmg = Math.floor(Math.random() * 10) + 10 + (state.soulshotsActive ? 15 : 0);
                    enemy.hp -= dmg; enemy.lastHitTime = time;
                    callbacks.current.onDamageDealt(dmg);
                    callbacks.current.onTargetChange({ name: enemy.type, hp: enemy.hp, maxHp: enemy.maxHp, type: 'enemy' });
                    if (enemy.hp <= 0) {
                      callbacks.current.onEnemyDefeat(enemy.type, enemy.group.position.x, enemy.group.position.z);
                      scene.remove(enemy.group);
                      engineRef.current.enemies = engineRef.current.enemies.filter(en => en !== enemy);
                      callbacks.current.onTargetChange(null);
                    }
                  }
                }
              }
            }
            if (playerParts.weapon) {
              const ssActive = state.soulshotsActive;
              const mat = playerParts.weapon.material as THREE.MeshStandardMaterial;
              mat.emissive.setHex(ssActive ? 0x00aaff : 0x000000);
              mat.emissiveIntensity = ssActive ? 1.0 + Math.sin(time * 10) * 0.5 : 0;
            }
            const speed = 44 * delta; const moveVec = new THREE.Vector3(0, 0, 0);
            if (keys['KeyW']) moveVec.z -= speed; if (keys['KeyS']) moveVec.z += speed;
            if (keys['KeyA']) moveVec.x -= speed; if (keys['KeyD']) moveVec.x += speed;
            const isMoving = moveVec.length() > 0;
            const bob = isMoving ? Math.abs(Math.sin(time * 22)) * 0.45 : Math.sin(time * 2) * 0.1;
            if (isMoving) {
              player.position.add(moveVec); callbacks.current.onPlayerMove(player.position.x, player.position.z);
              player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, Math.atan2(moveVec.x, moveVec.z), 0.2);
              playerParts.leftArm.rotation.x = Math.sin(time * 22) * 0.95;
              if (!engineRef.current.isAttacking) playerParts.rightArm.rotation.x = -Math.sin(time * 22) * 0.95;
            } else {
              // Fix: Removed unexpected 4th argument 'delta' from THREE.MathUtils.lerp to match signature (x, y, t)
              playerParts.leftArm.rotation.x = THREE.MathUtils.lerp(playerParts.leftArm.rotation.x, Math.sin(time * 2) * 0.1, 0.1);
              // Fix: Removed unexpected 4th argument 'delta' from THREE.MathUtils.lerp to match signature (x, y, t)
              if (!engineRef.current.isAttacking) playerParts.rightArm.rotation.x = THREE.MathUtils.lerp(playerParts.rightArm.rotation.x, -Math.sin(time * 2) * 0.1, 0.1);
            }
            playerParts.body.position.y = 2.5 + bob;
            playerParts.head.position.y = 5.0 + bob;
            playerParts.leftArm.position.y = 3.8 + bob;
            playerParts.rightArm.position.y = 3.8 + bob;
            if (engineRef.current.isAttacking) {
              const attackElapsed = time - engineRef.current.attackStartTime;
              const attackDuration = 0.4;
              const progress = Math.min(1, attackElapsed / attackDuration);
              if (progress < 1) {
                const lunge = Math.sin(progress * Math.PI) * 1.5; 
                playerParts.rightArm.rotation.x = -Math.sin(progress * Math.PI) * 1.8;
                playerParts.body.position.z = lunge;
                playerParts.head.position.z = lunge;
                playerParts.leftArm.position.z = lunge;
                playerParts.rightArm.position.z = lunge;
              } else {
                engineRef.current.isAttacking = false;
                playerParts.body.position.z = 0; playerParts.head.position.z = 0; playerParts.leftArm.position.z = 0; playerParts.rightArm.position.z = 0;
              }
            }
            enemies.forEach(en => {
              if (en.hp > 0) {
                if (en.group.position.distanceTo(en.wanderTarget) < 5) {
                  en.wanderTarget.set(en.spawnOrigin.x + (Math.random() - 0.5) * 60, 0, en.spawnOrigin.z + (Math.random() - 0.5) * 60);
                }
                const moveDir = new THREE.Vector3().subVectors(en.wanderTarget, en.group.position).normalize();
                en.group.position.add(moveDir.multiplyScalar(8 * delta));
                en.group.rotation.y = THREE.MathUtils.lerp(en.group.rotation.y, Math.atan2(moveDir.x, moveDir.z), 0.1);
                updateNameplate(en.nameplate, en.hp, en.maxHp);
                if (time - en.lastHitTime < 0.2) en.group.position.x += Math.sin(time * 50) * 0.2;
              }
            });
            camera.position.lerp(new THREE.Vector3(player.position.x, player.position.y + 65 * zoom, player.position.z + 90 * zoom), 0.08);
            camera.lookAt(player.position.x, player.position.y + 5, player.position.z);
        }
        renderer.render(scene, camera);
    };
    animate();
    const handleResize = () => {
        if (!engineRef.current) return;
        const { camera, renderer } = engineRef.current;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('wheel', onWheel); window.removeEventListener('click', onClick);
        window.removeEventListener('resize', handleResize);
        if (containerRef.current && renderer.domElement) containerRef.current.removeChild(renderer.domElement);
        engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isEngineReady || !engineRef.current) return;
    const { scene, enemies, npcs, player, textures, ground, instancedGrass, renderer } = engineRef.current;
    const currentZone = gameState.zone;
    const toClear = scene.children.filter(obj => obj.name && (obj.name.startsWith('env_') || obj.name.startsWith('portal_') || obj.name.startsWith('enemy_') || obj.name.startsWith('npc_')));
    toClear.forEach(o => { if (o.name !== "env_instanced_grass") scene.remove(o); });
    engineRef.current.enemies = []; npcs.length = 0;
    player.position.set(0, 0, 0);
    const spawnNPC = (name: string, color: number, x: number, z: number, hasShout: boolean = false) => {
        const { group, parts } = createHumanoid(color);
        group.position.set(x, 0, z); group.name = "npc_" + name;
        const nameplate = createNameplate(name, false, true); 
        group.add(nameplate.sprite);
        updateNameplate(nameplate, 100, 100);
        let shoutPlate;
        if (hasShout) {
          shoutPlate = createNameplate("", false, false, true);
          group.add(shoutPlate.sprite);
        }
        scene.add(group); 
        npcs.push({ group, name, parts, nameplate, shoutPlate, lastShoutTime: 0, shoutInterval: 10 + Math.random() * 15 });
    };
    const spawnEnemy = (type: string, x: number, z: number, hp: number, model: 'human' | 'wolf' | 'wraith' = 'human') => {
      const color = type.includes('Wolf') ? 0x224422 : 0x444444;
      const { group, parts } = createHumanoid(color, false, model);
      group.position.set(x, 0, z); group.name = "enemy_" + type;
      const nameplate = createNameplate(type, false, false); group.add(nameplate.sprite);
      updateNameplate(nameplate, hp, hp);
      scene.add(group);
      engineRef.current?.enemies.push({ 
        group, mesh: group.children[0] as THREE.Mesh, type, level: 1, hp, maxHp: hp, 
        lastHitTime: 0, lastAttackTime: 0, parts, nameplate, 
        wanderTarget: new THREE.Vector3(x, 0, z), spawnOrigin: new THREE.Vector3(x, 0, z) 
      });
    };
    if (instancedGrass) {
      const density = currentZone === 'Castle' ? 22000 : (currentZone === 'Forest' ? 65000 : 8000);
      instancedGrass.count = density;
      const dummy = new THREE.Object3D();
      const area = 5000;
      const mat = instancedGrass.material as THREE.ShaderMaterial;
      if (currentZone === 'Forest') { mat.uniforms.grassColor.value.setHex(0x0a1a0a); mat.uniforms.tipColor.value.setHex(0x1a3a1a); }
      else if (currentZone === 'Castle') { 
        // Nice green simple color for outskirts
        mat.uniforms.grassColor.value.setHex(0x1a441a); 
        mat.uniforms.tipColor.value.setHex(0x3a773a); 
      }
      else { mat.uniforms.grassColor.value.setHex(0x1a1a1a); mat.uniforms.tipColor.value.setHex(0x2a2a2a); }
      
      for (let i = 0; i < density; i++) {
        const rx = (Math.random() - 0.5) * area; const rz = (Math.random() - 0.5) * area;
        const onTownPath = currentZone === 'Castle' && (Math.abs(rx) < 80 && rz <= 400 && rz >= -1100);
        const onForestPath = currentZone === 'Castle' && (Math.abs(rx) < 40 && rz < -1100);
        const onForkPath = currentZone === 'Castle' && (rz < -1400 && rz > -1800 && rx > 0 && rx < 400);
        if (!onTownPath && !onForestPath && !onForkPath) { dummy.position.set(rx, 0, rz); dummy.rotation.y = Math.random() * Math.PI; dummy.scale.setScalar(0.8 + Math.random() * 1.2); dummy.updateMatrix(); instancedGrass.setMatrixAt(i, dummy.matrix); }
        else { dummy.scale.setScalar(0); dummy.updateMatrix(); instancedGrass.setMatrixAt(i, dummy.matrix); }
      }
      instancedGrass.instanceMatrix.needsUpdate = true;
      instancedGrass.visible = true;
    }
    if (currentZone === 'Castle') {
        const vibrantGreen = 0x1a4d1a;
        scene.fog = new THREE.FogExp2(vibrantGreen, 0.00035); renderer.setClearColor(vibrantGreen);
        (ground.material as THREE.MeshStandardMaterial).map = textures.grass; 
        (ground.material as THREE.MeshStandardMaterial).color.setHex(0x225522); 
        const plaza = new THREE.Mesh(new THREE.CircleGeometry(100, 32), new THREE.MeshStandardMaterial({ map: textures.stone, color: 0x112211 }));
        plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.04, 0); plaza.name = "env_plaza"; scene.add(plaza);
        const townPath = new THREE.Mesh(new THREE.PlaneGeometry(80, 1100), new THREE.MeshStandardMaterial({ map: textures.stone, color: 0x050505 }));
        townPath.rotation.x = -Math.PI / 2; townPath.position.set(0, 0.05, -550); townPath.name = "env_path_town"; scene.add(townPath);
        
        // Forest Path Outskirts - Bottom to Top
        const forestPathMain = new THREE.Mesh(new THREE.PlaneGeometry(60, 2000), new THREE.MeshStandardMaterial({ map: textures.dirt, color: 0x111111 }));
        forestPathMain.rotation.x = -Math.PI / 2; forestPathMain.position.set(0, 0.05, -2100); forestPathMain.name = "env_path_outskirts_main"; scene.add(forestPathMain);
        
        // Road Forks towards the middle to the right and up (to the wolf den)
        const forkPath = new THREE.Mesh(new THREE.PlaneGeometry(60, 450), new THREE.MeshStandardMaterial({ map: textures.dirt, color: 0x111111 }));
        forkPath.rotation.x = -Math.PI / 2; forkPath.rotation.z = Math.PI / 2.8; forkPath.position.set(180, 0.05, -1650); forkPath.name = "env_path_fork"; scene.add(forkPath);
        
        let namePool = [...FANTASY_NAMES];
        // ONLY 2 rows of houses/shops nearest the plaza. All north of this are removed.
        for(let i = 0; i < 2; i++) {
          const zPos = -200 - i * 160;
          spawnHouse(scene, 100, zPos, textures.stone, 'left'); 
          spawnHouse(scene, -100, zPos, textures.stone, 'right');
          const lIdx = Math.floor(Math.random() * namePool.length);
          // First shopkeeper named Zephyr
          const lName = i === 0 ? "Zephyr" : (namePool.splice(lIdx, 1)[0] || `Merchant L${i}`);
          spawnStall(scene, 100, zPos, 'left'); spawnNPC(lName, 0x442200 + i * 100, 85, zPos, true);
          const rIdx = Math.floor(Math.random() * namePool.length);
          const rName = namePool.splice(rIdx, 1)[0] || `Merchant R${i}`;
          spawnStall(scene, -100, zPos, 'right'); spawnNPC(rName, 0x224400 + i * 100, -85, zPos, true);
        }
        
        // Gate is the entrance to the forest outskirts
        spawnGate(scene, -1100, textures.stone);
        spawnNPC('Town Guard', 0x555555, 35, -1050); spawnNPC('Town Guard', 0x555555, -35, -1050);
        
        const wallMat = new THREE.MeshStandardMaterial({ map: textures.stone, color: 0x0a0a0a });
        // Wall shortened to end exactly at the gate (-1100)
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(30, 100, 1200), wallMat);
        leftWall.position.set(-180, 50, -500); leftWall.name = "env_wall_l"; scene.add(leftWall);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(30, 100, 1200), wallMat);
        rightWall.position.set(180, 50, -500); rightWall.name = "env_wall_r"; scene.add(rightWall);
        
        // Forest Outskirts trees
        for (let i = 0; i < 220; i++) {
          const rx = (Math.random() - 0.5) * 3500; const rz = -1200 - Math.random() * 2500;
          const onPath = Math.abs(rx) < 80 || (rz < -1400 && rz > -1900 && rx > 0 && rx < 450);
          if (!onPath) spawnTree(scene, rx, rz, textures.bark, textures.leaves);
        }
        for (let i = 0; i < 8; i++) {
          const rx = (Math.random() - 0.5) * 500; const rz = -1400 - Math.random() * 1000;
          spawnEnemy('Outskirts Wolf', rx, rz, 80, 'wolf');
        }
        // Wolf Den location
        for (let i = 0; i < 5; i++) {
          spawnEnemy('Wolf Den Alpha', 380 + (Math.random()-0.5)*120, -1850 + (Math.random()-0.5)*120, 120, 'wolf');
        }
        spawnNPC('Gatekeeper Milia', 0xffffff, 0, 60); spawnNPC('Archmagister Valerius', 0xcca100, 40, 20); spawnNPC('Shopkeeper', 0x0088ff, -40, 20);
        const monument = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 2 }));
        monument.position.set(0, 10, 0); monument.name = "env_monument"; scene.add(monument);
    } else if (currentZone === 'Village') {
        const villageColor = 0x0a0510;
        scene.fog = new THREE.FogExp2(villageColor, 0.0035); renderer.setClearColor(villageColor);
        (ground.material as THREE.MeshStandardMaterial).map = textures.dirt; (ground.material as THREE.MeshStandardMaterial).color.setHex(0x1a1a1a);
        const path = new THREE.Mesh(new THREE.PlaneGeometry(60, 2000), new THREE.MeshStandardMaterial({ map: textures.stone, color: 0x222222 }));
        path.rotation.x = -Math.PI / 2; path.position.set(0, 0.05, 0); path.name = "env_path"; scene.add(path);
        for (let i = 0; i < 12; i++) spawnEnemy('Wraith', (Math.random()-0.5)*700, (Math.random()-0.5)*700, 80, 'wraith');
        spawnEnemy('Undead King', 0, -300, 150, 'human');
    } else if (currentZone === 'Forest') {
        const forestColor = 0x020802;
        scene.fog = new THREE.FogExp2(forestColor, 0.0018); renderer.setClearColor(forestColor);
        (ground.material as THREE.MeshStandardMaterial).map = textures.grass; (ground.material as THREE.MeshStandardMaterial).color.setHex(0x0a140a); 
        const path = new THREE.Mesh(new THREE.PlaneGeometry(50, 4000), new THREE.MeshStandardMaterial({ map: textures.dirt, color: 0x221111 }));
        path.rotation.x = -Math.PI / 2; path.position.set(0, 0.05, 0); path.name = "env_path"; scene.add(path);
        for (let i = 0; i < 250; i++) { const rx = (Math.random()-0.5)*4000; const rz = (Math.random()-0.5)*4000; if (Math.abs(rx) > 100) spawnTree(scene, rx, rz, textures.bark, textures.leaves); }
        for (let i = 0; i < 15; i++) spawnEnemy('Wolf', (Math.random()-0.5)*800, (Math.random()-0.5)*800, 60, 'wolf');
    }
    (ground.material as THREE.Material).needsUpdate = true;
  }, [isEngineReady, gameState.zone]);

  return <div ref={containerRef} className="absolute inset-0 bg-black" />;
};
export default GameCanvas;
