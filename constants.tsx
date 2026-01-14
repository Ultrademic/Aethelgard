
import { CharacterClass, InventoryItem, PlayerStats } from './types';

export const INITIAL_STATS: Record<CharacterClass, PlayerStats> = {
  Warrior: {
    health: 150, maxHealth: 150,
    mana: 50, maxMana: 50,
    cp: 100, maxCp: 100,
    str: 40, dex: 30, con: 43, int: 21, wit: 11, men: 25,
    level: 1, xp: 0, gold: 100,
  },
  Mage: {
    health: 80, maxHealth: 80,
    mana: 150, maxMana: 150,
    cp: 60, maxCp: 60,
    str: 22, dex: 21, con: 27, int: 40, wit: 20, men: 40,
    level: 1, xp: 0, gold: 100,
  },
  Archer: {
    health: 100, maxHealth: 100,
    mana: 80, maxMana: 80,
    cp: 80, maxCp: 80,
    str: 36, dex: 35, con: 32, int: 23, wit: 14, men: 26,
    level: 1, xp: 0, gold: 100,
  },
};

export const SHOP_ITEMS: InventoryItem[] = [
  { id: 'wooden_sword', name: 'Wooden Sword (No Grade)', type: 'weapon', pAtk: 2, mAtk: 1, cost: 50 },
  { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', pAtk: 8, mAtk: 4, cost: 150 },
  { id: 'leather_armor', name: 'Leather Armor', type: 'armor', pDef: 5, cost: 80 },
  { id: 'royal_sword', name: 'Royal Sword', type: 'weapon', pAtk: 22, mAtk: 12, cost: 450 },
  { id: 'royal_armor', name: 'Royal Armor', type: 'armor', pDef: 15, cost: 350 },
  { id: 'wizard_hat', name: 'Purple Wizard Hat', type: 'cosmetic', cost: 0 },
  { id: 'ranger_hat', name: 'Green Ranger Cap', type: 'cosmetic', cost: 0 },
  { id: 'combat_hat', name: 'Red Combat Bandana', type: 'cosmetic', cost: 0 },
];

export const INITIAL_QUESTS: any[] = [
  {
    id: 1,
    title: 'The Wolf Menace',
    objective: 'kill',
    target: 'Wolf',
    count: 5,
    progress: 0,
    active: false,
    completed: false,
    rewardGold: 50,
    repeatable: true,
    completedCount: 0,
  },
  {
    id: 2,
    title: 'Fur Collection',
    objective: 'collect',
    target: 'WolfPelt',
    count: 3,
    progress: 0,
    active: false,
    completed: false,
    rewardGold: 75,
    completedCount: 0,
  },
  {
    id: 3,
    title: 'Aetheris Guardian',
    objective: 'talk',
    target: 'Elder',
    count: 1,
    progress: 0,
    active: false,
    completed: false,
    rewardGold: 20,
    completedCount: 0,
  },
  {
    id: 4,
    title: 'Undead King Fall',
    objective: 'kill',
    target: 'Undead King',
    count: 1,
    progress: 0,
    active: false,
    completed: false,
    rewardGold: 500,
    completedCount: 0,
  },
];
