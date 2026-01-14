
export type CharacterClass = 'Warrior' | 'Mage' | 'Archer';

export interface PlayerStats {
  // Primary Resources
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  cp: number;
  maxCp: number;
  
  // Basic Attributes (L2 Style)
  str: number; // Strength: P.Atk
  dex: number; // Dexterity: Atk.Spd, Accuracy, Evasion, Critical
  con: number; // Constitution: HP, Weight Limit
  int: number; // Intelligence: M.Atk
  wit: number; // Wit: Casting Spd, M.Crit
  men: number; // Mental: MP, M.Def
  
  level: number;
  xp: number;
  gold: number; // Aethertouch
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'cosmetic';
  pAtk?: number;
  mAtk?: number;
  pDef?: number;
  mDef?: number;
  cost?: number;
}

export interface Quest {
  id: number;
  title: string;
  objective: string;
  target: string;
  count: number;
  progress: number;
  active: boolean;
  completed: boolean;
  rewardGold: number;
  rewardItem?: string;
  repeatable?: boolean;
  completedCount: number;
}

export interface GroundItem {
  id: string;
  name: string;
  amount: number;
  type: 'gold' | 'item';
  position: { x: number; z: number };
}

export type GameZone = 'Village' | 'Forest' | 'Castle';

export interface GameTarget {
  name: string;
  hp: number;
  maxHp: number;
  type: string;
}

export interface GameState {
  playerClass: CharacterClass | null;
  zone: GameZone;
  stats: PlayerStats;
  inventory: InventoryItem[];
  equippedWeapon: InventoryItem | null;
  equippedArmor: InventoryItem | null;
  equippedCosmetic: InventoryItem | null;
  quests: Quest[];
  dialogue: { npc: string; message: string; options: DialogueOption[] } | null;
  isPaused: boolean;
  isGameOver: boolean;
  lastAbilityTime: number;
  abilityCooldown: number; // in ms
  target: GameTarget | null;
  logs: string[];
  soulshotsActive: boolean;
  groundItems: GroundItem[];
  showMap: boolean;
  showQuestWindow: boolean;
  isTransitioning: boolean;
  playerPosition: { x: number; z: number };
  musicEnabled: boolean;
  musicVolume: number;
}

export interface DialogueOption {
  text: string;
  action: () => void;
}
