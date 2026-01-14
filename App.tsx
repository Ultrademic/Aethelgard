
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CharacterClass, GameState, PlayerStats, GameZone, InventoryItem, Quest, DialogueOption, GameTarget, GroundItem } from './types';
import { INITIAL_STATS, INITIAL_QUESTS, SHOP_ITEMS } from './constants';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Menu from './components/Menu';
import DialogueBox from './components/DialogueBox';
import ZoneTransition from './components/ZoneTransition';
import ClassSelection from './components/ClassSelection';
import WorldMapOverlay from './components/WorldMapOverlay';
import QuestWindow from './components/QuestWindow';
import TeleportMenu from './components/TeleportMenu';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    playerClass: null,
    zone: 'Castle',
    stats: INITIAL_STATS['Warrior'],
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    equippedCosmetic: null,
    quests: INITIAL_QUESTS,
    dialogue: null,
    isPaused: false,
    isGameOver: false,
    lastAbilityTime: 0,
    abilityCooldown: 5000,
    target: null,
    logs: ["Welcome to Aethelgard Castle Town. Your journey begins."],
    soulshotsActive: false,
    groundItems: [],
    showMap: false,
    showQuestWindow: false,
    isTransitioning: false,
    playerPosition: { x: 0, z: 0 },
    musicEnabled: true,
    musicVolume: 0.4,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showTeleportMenu, setShowTeleportMenu] = useState(false);
  const [isHit, setIsHit] = useState(false);
  const actionTrigger = useRef<{ type: 'attack' | 'skill' | null }>({ type: null });

  // Handle Background Music
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('aethelgard_theme.mp3');
      audioRef.current.loop = true;
    }

    if (gameState.musicEnabled && gameState.playerClass && !gameState.isGameOver) {
      audioRef.current.volume = gameState.musicVolume;
      audioRef.current.play().catch(e => console.log("Music play blocked by browser. Need interaction."));
    } else {
      audioRef.current.pause();
    }
  }, [gameState.musicEnabled, gameState.playerClass, gameState.musicVolume, gameState.isGameOver]);

  const addLog = useCallback((msg: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [msg, ...prev.logs].slice(0, 10)
    }));
  }, []);

  const selectClass = (cls: CharacterClass) => {
    setGameState(prev => ({ 
      ...prev, 
      playerClass: cls, 
      stats: { ...INITIAL_STATS[cls] } 
    }));
    addLog(`Destiny chosen: The path of the ${cls}.`);
  };

  const startZoneTransition = useCallback((nextZone: GameZone) => {
    if (gameState.isTransitioning) return;
    setGameState(prev => ({ ...prev, isTransitioning: true }));
    addLog(`Entering ${nextZone}...`);
    setTimeout(() => {
      setGameState(prev => ({ ...prev, zone: nextZone, playerPosition: { x: 0, z: 0 } }));
    }, 1000);
    setTimeout(() => {
      setGameState(prev => ({ ...prev, zone: nextZone, isTransitioning: false }));
    }, 2000);
  }, [gameState.isTransitioning, addLog]);

  const handleRespawn = () => {
    addLog("Returning to the safety of Aethelgard Castle Town...");
    setGameState(prev => ({
      ...prev,
      isGameOver: false,
      zone: 'Castle',
      playerPosition: { x: 0, z: 0 },
      stats: { 
        ...prev.stats, 
        health: prev.stats.maxHealth, 
        mana: prev.stats.maxMana,
        xp: Math.max(0, prev.stats.xp - 50) 
      }
    }));
  };

  const spawnLoot = useCallback((x: number, z: number, type: 'gold' | 'item', amount: number, name: string) => {
    setGameState(prev => ({
      ...prev,
      groundItems: [...prev.groundItems, { id: Math.random().toString(), name, amount, type, position: { x, z } }]
    }));
  }, []);

  const pickupLoot = useCallback((id: string) => {
    setGameState(prev => {
      const item = prev.groundItems.find(i => i.id === id);
      if (!item) return prev;
      addLog(item.type === 'gold' ? `Picked up ${item.amount} Aethertouch.` : `Found ${item.name}!`);
      const newStats = { ...prev.stats };
      if (item.type === 'gold') newStats.gold += item.amount;
      return {
        ...prev,
        stats: newStats,
        inventory: item.type === 'item' ? [...prev.inventory, SHOP_ITEMS.find(i => i.name === item.name) || { id: 'tmp', name: item.name, type: 'quest' } as InventoryItem] : prev.inventory,
        groundItems: prev.groundItems.filter(i => i.id !== id)
      };
    });
  }, [addLog]);

  const handleInteraction = useCallback(async (npc: string) => {
    if (npc === 'Gatekeeper Milia') {
      const message = "Greetings, traveler. The Aether flows through the gates of the Castle Town. Where does your path lead today?";
      setGameState(prev => ({
        ...prev,
        dialogue: {
          npc: 'Gatekeeper Milia',
          message,
          options: [
            { text: "Teleport to distant lands", action: () => { setShowTeleportMenu(true); setGameState(p => ({ ...p, dialogue: null })); } },
            { text: "Farewell", action: () => setGameState(p => ({ ...p, dialogue: null })) }
          ]
        }
      }));
      return;
    }

    if (npc === 'Archmagister Valerius') {
      const readyQuest = gameState.quests.find(q => q.active && q.progress >= q.count);
      const message = readyQuest 
        ? `Ah, I see the glow of success in your eyes. Is the task done?`
        : "May the Aether guide your steps through the ruins.";

      const options: DialogueOption[] = [];
      if (readyQuest) {
        options.push({ text: `Turn In Quest: ${readyQuest.title}`, action: () => completeQuest(readyQuest.id) });
      } else {
        const nextQuest = gameState.quests.find(q => !q.active && (!q.completed || q.repeatable));
        if (nextQuest) options.push({ text: `Quest: ${nextQuest.title}`, action: () => acceptQuest(nextQuest.id) });
      }
      options.push({ text: "Farewell", action: () => setGameState(p => ({ ...p, dialogue: null })) });
      setGameState(prev => ({ ...prev, dialogue: { npc: 'Archmagister Valerius', message, options } }));
    }
    
    if (npc === 'Shopkeeper') {
      setGameState(prev => ({
        ...prev,
        dialogue: {
          npc: 'Shopkeeper',
          message: "Welcome to the capital armory. We have basic equipment to keep you alive.",
          options: SHOP_ITEMS.filter(i => i.type !== 'cosmetic').map(item => ({ text: `${item.name} (${item.cost} AT)`, action: () => buyItem(item) })).concat([{ text: "Leave", action: () => setGameState(p => ({ ...p, dialogue: null })) }])
        }
      }));
    }
  }, [gameState.quests, gameState.stats.level, gameState.playerClass]);

  const handleTeleport = (targetZone: GameZone, cost: number) => {
    if (gameState.stats.gold < cost) {
      setGameState(prev => ({
        ...prev,
        dialogue: {
          npc: 'Gatekeeper Milia',
          message: "You lack the Aethertouch required for this journey.",
          options: [{ text: "I understand", action: () => setGameState(p => ({ ...p, dialogue: null })) }]
        }
      }));
      setShowTeleportMenu(false);
      return;
    }
    setGameState(prev => ({ ...prev, stats: { ...prev.stats, gold: prev.stats.gold - cost } }));
    setShowTeleportMenu(false);
    startZoneTransition(targetZone);
  };

  const completeQuest = (id: number) => {
    setGameState(prev => {
      const quest = prev.quests.find(q => q.id === id);
      if (!quest) return prev;
      addLog(`Quest Completed: ${quest.title}.`);
      return { 
        ...prev, 
        stats: { ...prev.stats, gold: prev.stats.gold + quest.rewardGold, xp: prev.stats.xp + 100 }, 
        dialogue: null,
        quests: prev.quests.map(q => q.id === id ? { ...q, active: false, completed: true, completedCount: q.completedCount + 1, progress: 0 } : q),
      };
    });
  };

  const acceptQuest = (id: number) => {
    setGameState(prev => {
      const quest = prev.quests.find(q => q.id === id);
      if (quest) addLog(`Quest Accepted: ${quest.title}`);
      return { 
        ...prev, 
        quests: prev.quests.map(q => q.id === id ? { ...q, active: true, progress: 0 } : q), 
        dialogue: null 
      };
    });
  };

  const buyItem = (item: InventoryItem) => {
    setGameState(prev => {
      if (prev.stats.gold < (item.cost || 0)) return prev;
      addLog(`Purchased ${item.name}.`);
      return {
        ...prev,
        stats: { ...prev.stats, gold: prev.stats.gold - (item.cost || 0) },
        inventory: [...prev.inventory, { ...item, id: Math.random().toString() }],
        dialogue: null
      };
    });
  };

  const equipItem = (item: InventoryItem) => {
    setGameState(prev => {
      addLog(`Equipped ${item.name}.`);
      if (item.type === 'weapon') return { ...prev, equippedWeapon: item };
      if (item.type === 'armor') return { ...prev, equippedArmor: item };
      if (item.type === 'cosmetic') return { ...prev, equippedCosmetic: item };
      return prev;
    });
  };

  const unequipItem = (slot: 'weapon' | 'armor' | 'cosmetic') => {
    setGameState(prev => {
      const item = slot === 'weapon' ? prev.equippedWeapon : slot === 'armor' ? prev.equippedArmor : prev.equippedCosmetic;
      if (item) addLog(`Unequipped ${item.name}.`);
      return {
        ...prev,
        [slot === 'weapon' ? 'equippedWeapon' : slot === 'armor' ? 'equippedArmor' : 'equippedCosmetic']: null
      };
    });
  };

  const updateStats = (newStats: Partial<PlayerStats>) => {
    setGameState(prev => {
      const updated = { ...prev.stats, ...newStats };
      if (updated.xp >= updated.level * 100) {
          addLog(`ASCENSION! LEVEL ${updated.level + 1}!`);
          updated.level += 1;
          updated.xp = 0;
          updated.health = updated.maxHealth;
      }
      return { ...prev, stats: updated };
    });
  };

  const updatePlayerPosition = useCallback((x: number, z: number) => {
    setGameState(prev => ({ ...prev, playerPosition: { x, z } }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
      if (e.key === 'm' || e.key === 'M') setGameState(prev => ({ ...prev, showMap: !prev.showMap }));
      if (e.key === 'q' || e.key === 'Q') setGameState(prev => ({ ...prev, showQuestWindow: !prev.showQuestWindow }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleManualAction = (type: 'attack' | 'skill') => {
    actionTrigger.current = { type };
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white selection:bg-amber-500/30">
      <GameCanvas 
        gameState={gameState} 
        onInteraction={handleInteraction}
        onStatUpdate={updateStats}
        onZoneChange={startZoneTransition}
        onPlayerMove={updatePlayerPosition}
        onEnemyDefeat={(type, x, z) => {
          addLog(`${type} slain.`);
          spawnLoot(x, z, 'gold', Math.floor(Math.random() * 20) + 15, 'Aethertouch');
          setGameState(prev => ({
            ...prev,
            quests: prev.quests.map(q => (q.active && q.target === type) ? { ...q, progress: Math.min(q.count, q.progress + 1) } : q)
          }));
        }}
        onUseMana={(amt) => setGameState(prev => ({ ...prev, stats: { ...prev.stats, mana: Math.max(0, prev.stats.mana - amt) } }))}
        onTargetChange={(target) => setGameState(prev => ({ ...prev, target }))}
        onDamageDealt={(dmg) => addLog(`Dealt ${dmg} damage.`)}
        onDamageTaken={(dmg) => {
           setIsHit(true);
           setTimeout(() => setIsHit(false), 200);
           setGameState(prev => {
             const newHp = Math.max(0, prev.stats.health - dmg);
             if (newHp <= 0) return { ...prev, stats: { ...prev.stats, health: 0 }, isGameOver: true };
             return { ...prev, stats: { ...prev.stats, health: newHp } };
           });
        }}
        onPickupLoot={pickupLoot}
        onAbilityUse={() => setGameState(prev => ({ ...prev, lastAbilityTime: Date.now() }))}
        actionTrigger={actionTrigger}
      />

      {isHit && <div className="absolute inset-0 bg-red-600/30 pointer-events-none z-[120] animate-pulse" />}

      {gameState.isGameOver && (
        <div className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
          <h2 className="rpg-font text-6xl text-red-600 tracking-[0.4em] mb-4">CRITICALLY WOUNDED</h2>
          <p className="text-zinc-500 text-sm tracking-widest uppercase mb-12">Your soul has drifted too far from the world flow...</p>
          <button 
            onClick={handleRespawn}
            className="px-12 py-4 bg-zinc-900 border border-zinc-700 hover:border-amber-500 text-amber-500 rpg-font tracking-widest transition-all hover:bg-zinc-800 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
          >
            RETURN TO THE CASTLE TOWN
          </button>
          <p className="mt-8 text-[9px] text-zinc-700 uppercase tracking-widest italic">- Penalty: Loss of Soul Essence (XP) -</p>
        </div>
      )}

      {!gameState.playerClass && <ClassSelection onSelect={selectClass} />}

      {gameState.playerClass && (
        <>
          <HUD 
            gameState={gameState} 
            onToggleSoulshot={() => setGameState(prev => ({ ...prev, soulshotsActive: !prev.soulshotsActive }))}
            onToggleMap={() => setGameState(prev => ({ ...prev, showMap: !prev.showMap }))}
            onToggleQuests={() => setGameState(p => ({ ...p, showQuestWindow: !p.showQuestWindow }))}
            onToggleMusic={() => setGameState(p => ({ ...p, musicEnabled: !p.musicEnabled }))}
            onAttack={() => handleManualAction('attack')}
            onSkill={() => handleManualAction('skill')}
          />
          {gameState.isTransitioning && <ZoneTransition zone={gameState.zone} />}
          {gameState.dialogue && <DialogueBox dialogue={gameState.dialogue} onClose={() => setGameState(p => ({ ...p, dialogue: null }))} />}
          {showTeleportMenu && <TeleportMenu onClose={() => setShowTeleportMenu(false)} onTeleport={handleTeleport} currentZone={gameState.zone} gold={gameState.stats.gold} />}
          {gameState.isPaused && (
            <Menu 
              gameState={gameState}
              onClose={() => setGameState(p => ({ ...p, isPaused: false }))} 
              onOpenQuests={() => setGameState(p => ({ ...p, isPaused: false, showQuestWindow: true }))}
              onEquip={equipItem}
              onUnequip={unequipItem}
              onUpdateVolume={(v) => setGameState(p => ({ ...p, musicVolume: v }))}
            />
          )}
          {gameState.showMap && <WorldMapOverlay zone={gameState.zone} playerPosition={gameState.playerPosition} onClose={() => setGameState(p => ({ ...p, showMap: false }))} />}
          {gameState.showQuestWindow && <QuestWindow quests={gameState.quests} onClose={() => setGameState(p => ({ ...p, showQuestWindow: false }))} zone={gameState.zone} playerClass={gameState.playerClass} />}
        </>
      )}
    </div>
  );
};

export default App;
