
import React from 'react';
import { GameState, InventoryItem, PlayerStats } from '../types';

interface MenuProps {
  gameState: GameState;
  onClose: () => void;
  onOpenQuests: () => void;
  onEquip: (item: InventoryItem) => void;
  onUnequip: (slot: 'weapon' | 'armor' | 'cosmetic') => void;
  onUpdateVolume: (volume: number) => void;
}

const Menu: React.FC<MenuProps> = ({ 
  gameState,
  onClose, 
  onOpenQuests, 
  onEquip, 
  onUnequip,
  onUpdateVolume
}) => {
  const { stats, inventory, equippedWeapon, equippedArmor, equippedCosmetic, musicVolume, soulshotsActive } = gameState;

  // Calculate Combat Stats based on L2-ish logic
  const pAtk = Math.floor(stats.str * 1.5) + (equippedWeapon?.pAtk || 0) + (soulshotsActive ? 10 : 0);
  const mAtk = Math.floor(stats.int * 2.0) + (equippedWeapon?.mAtk || 0);
  const pDef = Math.floor(stats.con * 1.2) + (equippedArmor?.pDef || 0);
  const mDef = Math.floor(stats.men * 1.4) + (equippedArmor?.mDef || 0);
  const accuracy = Math.floor(stats.dex * 1.1) + 10;
  const critical = Math.floor(stats.dex * 0.8) + 5;
  const atkSpd = Math.floor(stats.dex * 10) + 200;
  const evasion = Math.floor(stats.dex * 0.9) + 10;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-6xl rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in duration-200">
        
        {/* Left Side: Detailed Character Stats */}
        <div className="p-8 border-r border-zinc-800 bg-zinc-950/50 w-full md:w-1/2 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-6">
            <h2 className="rpg-font text-2xl text-amber-500 uppercase tracking-widest">Character Profile</h2>
            <div className="text-right">
                <span className="bg-amber-900/40 px-2 py-0.5 rounded text-[10px] text-amber-300 font-bold border border-amber-500/20">Lv.{stats.level}</span>
            </div>
          </div>
          
          {/* Main Resource Bars */}
          <div className="space-y-3 mb-8 bg-black/40 p-4 rounded-lg border border-white/5 shadow-inner">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[10px] items-center mb-1">
                    <span className="text-zinc-500 uppercase tracking-tighter font-bold">HP</span>
                    <span className="text-red-400 font-mono font-bold">{stats.health} / {stats.maxHealth}</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-red-900 to-red-600 h-full transition-all duration-500" style={{ width: `${(stats.health/stats.maxHealth)*100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] items-center mb-1">
                    <span className="text-zinc-500 uppercase tracking-tighter font-bold">MP</span>
                    <span className="text-blue-400 font-mono font-bold">{stats.mana} / {stats.maxMana}</span>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-900 to-blue-600 h-full transition-all duration-500" style={{ width: `${(stats.mana/stats.maxMana)*100}%` }} />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] items-center mt-2 mb-1">
                <span className="text-zinc-500 uppercase tracking-tighter font-bold">CP</span>
                <span className="text-amber-400 font-mono font-bold">{stats.cp} / {stats.maxCp}</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-900 to-amber-600 h-full transition-all duration-500" style={{ width: `${(stats.cp/stats.maxCp)*100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Combat Stats Grid */}
            <div>
              <h3 className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4 border-b border-zinc-800 pb-1 font-bold">Combat Stats</h3>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                  <span className="text-zinc-500 uppercase">P. Atk</span>
                  <span className="text-amber-200 font-mono font-bold">{pAtk}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/2 rounded">
                  <span className="text-zinc-500 uppercase">M. Atk</span>
                  <span className="text-blue-300 font-mono font-bold">{mAtk}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                  <span className="text-zinc-500 uppercase">P. Def</span>
                  <span className="text-amber-200 font-mono font-bold">{pDef}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/2 rounded">
                  <span className="text-zinc-500 uppercase">M. Def</span>
                  <span className="text-blue-300 font-mono font-bold">{mDef}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                  <span className="text-zinc-500 uppercase">Accuracy</span>
                  <span className="text-zinc-300 font-mono">{accuracy}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/2 rounded">
                  <span className="text-zinc-500 uppercase">Evasion</span>
                  <span className="text-zinc-300 font-mono">{evasion}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                  <span className="text-zinc-500 uppercase">Critical</span>
                  <span className="text-red-400 font-mono font-bold">{critical}</span>
                </div>
                <div className="flex justify-between px-2 py-1 bg-white/2 rounded">
                  <span className="text-zinc-500 uppercase">Atk. Spd</span>
                  <span className="text-zinc-300 font-mono">{atkSpd}</span>
                </div>
              </div>
            </div>

            {/* Attributes Grid */}
            <div>
              <h3 className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4 border-b border-zinc-800 pb-1 font-bold">Basic Attributes</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex flex-col items-center bg-zinc-900 border border-white/5 p-2 rounded">
                  <span className="text-amber-500 font-bold text-lg leading-tight">{stats.str}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">STR</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900 border border-white/5 p-2 rounded">
                  <span className="text-amber-500 font-bold text-lg leading-tight">{stats.dex}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">DEX</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900 border border-white/5 p-2 rounded">
                  <span className="text-amber-500 font-bold text-lg leading-tight">{stats.con}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">CON</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900 border border-white/5 p-2 rounded">
                  <span className="text-blue-400 font-bold text-lg leading-tight">{stats.int}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">INT</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900 border border-white/5 p-2 rounded">
                  <span className="text-blue-400 font-bold text-lg leading-tight">{stats.wit}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">WIT</span>
                </div>
                <div className="flex flex-col items-center bg-zinc-900 border border-white/5 p-2 rounded">
                  <span className="text-blue-400 font-bold text-lg leading-tight">{stats.men}</span>
                  <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tighter">MEN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4 border-b border-zinc-800 pb-1">Audio Settings</h3>
            <div className="bg-zinc-900/80 p-4 rounded border border-zinc-800">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Master Music</span>
                <span className="text-[10px] text-amber-500 font-mono">{Math.round(musicVolume * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={musicVolume} 
                onChange={(e) => onUpdateVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Inventory & Equipment */}
        <div className="p-8 flex-1 flex flex-col bg-zinc-900">
          <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <h2 className="rpg-font text-2xl text-white uppercase tracking-widest">Aether Pack</h2>
                <div className="h-px w-32 bg-gradient-to-r from-zinc-700 to-transparent" />
              </div>
              <button 
                onClick={onClose}
                className="text-zinc-600 hover:text-white transition-colors rpg-font text-xs uppercase tracking-widest bg-zinc-800/50 px-4 py-2 rounded-full border border-white/5"
              >
                  [ Close ]
              </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="group bg-zinc-800/30 p-3 rounded border border-zinc-800 flex flex-col justify-between items-start transition-all hover:bg-zinc-800/50 relative">
                  <span className="text-[9px] text-zinc-500 mb-1 uppercase tracking-tighter">Weaponry</span>
                  <span className={`text-[11px] font-bold ${equippedWeapon ? 'text-amber-200' : 'text-zinc-600 italic'}`}>{equippedWeapon?.name || 'Empty'}</span>
                  {equippedWeapon && (
                    <button onClick={() => onUnequip('weapon')} className="absolute top-1 right-1 text-[8px] bg-red-900/20 text-red-500 px-1 rounded border border-red-900/30 hover:bg-red-500 hover:text-white transition-all">X</button>
                  )}
              </div>
              <div className="group bg-zinc-800/30 p-3 rounded border border-zinc-800 flex flex-col justify-between items-start transition-all hover:bg-zinc-800/50 relative">
                  <span className="text-[9px] text-zinc-500 mb-1 uppercase tracking-tighter">Protection</span>
                  <span className={`text-[11px] font-bold ${equippedArmor ? 'text-amber-200' : 'text-zinc-600 italic'}`}>{equippedArmor?.name || 'Empty'}</span>
                  {equippedArmor && (
                    <button onClick={() => onUnequip('armor')} className="absolute top-1 right-1 text-[8px] bg-red-900/20 text-red-500 px-1 rounded border border-red-900/30 hover:bg-red-500 hover:text-white transition-all">X</button>
                  )}
              </div>
              <div className="group bg-zinc-800/30 p-3 rounded border border-zinc-800 flex flex-col justify-between items-start transition-all hover:bg-zinc-800/50 relative">
                  <span className="text-[9px] text-zinc-500 mb-1 uppercase tracking-tighter">Artifact</span>
                  <span className={`text-[11px] font-bold ${equippedCosmetic ? 'text-purple-400' : 'text-zinc-600 italic'}`}>{equippedCosmetic?.name || 'Empty'}</span>
                  {equippedCosmetic && (
                    <button onClick={() => onUnequip('cosmetic')} className="absolute top-1 right-1 text-[8px] bg-red-900/20 text-red-500 px-1 rounded border border-red-900/30 hover:bg-red-500 hover:text-white transition-all">X</button>
                  )}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-3">
              {inventory.length === 0 ? (
                  <div className="col-span-full py-16 text-center">
                    <p className="text-zinc-600 italic mb-2">Your travel pack is empty.</p>
                  </div>
              ) : (
                  inventory.map((item, idx) => {
                    const isEquipped = item.id === equippedWeapon?.id || item.id === equippedArmor?.id || item.id === equippedCosmetic?.id;
                    return (
                      <button 
                          key={item.id || idx}
                          onClick={() => !isEquipped && onEquip(item)}
                          disabled={isEquipped}
                          className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center group relative overflow-hidden shadow-lg
                          ${isEquipped 
                              ? 'bg-amber-500/10 border-amber-500/50 cursor-default grayscale-[0.5]' 
                              : 'bg-zinc-800/80 border-zinc-700/50 hover:border-amber-500/50 hover:-translate-y-1 hover:shadow-amber-500/10 cursor-pointer'
                          }
                          `}
                      >
                          <div className={`text-xl mb-1 ${item.type === 'cosmetic' ? 'text-purple-400' : 'text-zinc-400'} group-hover:scale-110 transition-transform`}>
                            {item.type === 'weapon' && '⚔️'}
                            {item.type === 'armor' && '🛡️'}
                            {item.type === 'cosmetic' && '👑'}
                            {item.type === 'consumable' && '🧪'}
                            {item.type === 'quest' && '📜'}
                          </div>
                          <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-tighter text-center px-1 truncate w-full">{item.name}</span>
                          
                          {isEquipped && (
                            <div className="absolute top-0.5 right-0.5">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(245,158,11,1)]" />
                            </div>
                          )}
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">Total Weight</span>
                  <span className="text-sm text-white font-bold">{inventory.length} <span className="text-zinc-500 text-[10px]">ITEMS</span></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">Aethertouch</span>
                  <span className="text-sm text-amber-500 font-mono font-bold">{stats.gold.toLocaleString()}</span>
                </div>
              </div>
              <button 
                onClick={onOpenQuests}
                className="bg-amber-900/20 border border-amber-900/50 px-4 py-2 rounded rpg-font text-[10px] text-amber-500 hover:bg-amber-900/40 transition-all uppercase tracking-[0.2em]"
              >
                Quest Log (Q)
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
