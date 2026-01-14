
import React, { useEffect, useState } from 'react';
import { GameState } from '../types';

interface HUDProps {
  gameState: GameState;
  onToggleSoulshot: () => void;
  onToggleMap: () => void;
  onToggleQuests: () => void;
  onToggleMusic?: () => void;
  onAttack?: () => void;
  onSkill?: () => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onToggleSoulshot, onToggleMap, onToggleQuests, onToggleMusic, onAttack, onSkill }) => {
  const { stats, playerClass, zone, quests, target, logs, soulshotsActive, lastAbilityTime, abilityCooldown, playerPosition, musicEnabled } = gameState;
  
  const [cdPercent, setCdPercent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastAbilityTime;
      const progress = Math.max(0, 1 - elapsed / abilityCooldown);
      setCdPercent(progress * 100);
    }, 50);
    return () => clearInterval(interval);
  }, [lastAbilityTime, abilityCooldown]);

  const hpPercent = (stats.health / stats.maxHealth) * 100;
  const manaPercent = (stats.mana / stats.maxMana) * 100;
  const xpPercent = (stats.xp / (stats.level * 100)) * 100;

  const activeQuests = quests.filter(q => q.active && !q.completed);

  const handleActionClick = (e: React.MouseEvent, num: number) => {
    e.stopPropagation(); 
    if (num === 1) onAttack?.();
    if (num === 2) onSkill?.();
    if (num === 3) onToggleSoulshot();
  };

  const mapScale = 400;
  const mapX = (playerPosition.x / mapScale) * 100;
  const mapY = (playerPosition.z / mapScale) * 100;

  return (
    <div className="fixed inset-0 pointer-events-none select-none">
      
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-zinc-900/95 border-2 border-amber-900/60 p-4 shadow-2xl min-w-[280px] backdrop-blur-sm">
            <div className="flex justify-between items-center mb-3">
                <span className="rpg-font text-amber-500 text-lg uppercase tracking-wider">{playerClass}</span>
                <span className="bg-amber-900/40 px-2 py-0.5 rounded text-[10px] text-amber-300 font-bold border border-amber-500/20">Lv.{stats.level}</span>
            </div>
            <div className="space-y-2">
                <div className="relative h-2 bg-zinc-800 rounded-sm border border-zinc-700 overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-all duration-500" style={{ width: `${hpPercent}%` }} />
                </div>
                <div className="relative h-2 bg-zinc-800 rounded-sm border border-zinc-700 overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-900 via-blue-600 to-blue-500 transition-all duration-500" style={{ width: `${manaPercent}%` }} />
                </div>
            </div>
            <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                <div className="h-full bg-amber-500/80 shadow-[0_0_5px_rgba(245,158,11,0.5)]" style={{ width: `${xpPercent}%` }} />
            </div>
        </div>

        {activeQuests.length > 0 && (
          <div className="mt-6 space-y-3 max-w-[220px]">
            <h4 className="rpg-font text-amber-600 text-[10px] tracking-[0.2em] uppercase border-b border-amber-900/30 pb-1">Active Quests</h4>
            {activeQuests.map(q => (
              <div key={q.id} className="bg-black/40 border-l-2 border-amber-600 p-2 pl-3 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-zinc-100 mb-1">{q.title}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-tighter">{q.target}</span>
                  <span className={`text-[9px] font-mono ${q.progress >= q.count ? 'text-green-400' : 'text-amber-500'}`}>
                    {q.progress} / {q.count}
                  </span>
                </div>
                {q.progress >= q.count && (
                  <p className="text-[7px] text-green-400/80 animate-pulse mt-1 font-bold">READY FOR TURN-IN</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[350px]">
        {target && (
          <div className="bg-zinc-900/95 border-2 border-amber-900/80 p-1 px-3 shadow-2xl animate-in fade-in slide-in-from-top-4 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="rpg-font text-xs text-amber-500 font-bold uppercase tracking-widest">{target.name}</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-tighter">HP: {Math.max(0, Math.floor(target.hp))}</span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700">
              <div 
                className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300"
                style={{ width: `${(target.hp / target.maxHp) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex gap-2 mb-2">
            <button 
              onClick={onToggleMusic}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all backdrop-blur-md shadow-lg
                ${musicEnabled ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-zinc-900/60 border-zinc-700 text-zinc-600'}
              `}
              title="Toggle Music"
            >
              <span className="text-sm">{musicEnabled ? '🔊' : '🔇'}</span>
            </button>
            <div className="w-32 h-32 rounded-full border-2 border-amber-900/50 bg-zinc-900/80 backdrop-blur-sm relative overflow-hidden flex items-center justify-center shadow-2xl cursor-pointer group hover:border-amber-500 transition-colors" onClick={onToggleMap}>
                <div className="absolute inset-0 border border-white/5 opacity-20 flex items-center justify-center">
                    <div className="w-px h-full bg-white/20" />
                    <div className="h-px w-full bg-white/20" />
                </div>
                <div 
                  className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse absolute" 
                  style={{ 
                    left: `calc(50% + ${mapX}px)`, 
                    top: `calc(50% + ${mapY}px)`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-zinc-500 font-bold">N</div>
            </div>
          </div>
          <div className="bg-zinc-900/90 border border-amber-900/30 px-4 py-1 rounded shadow-lg">
              <span className="rpg-font text-amber-600 text-[10px] tracking-[0.2em] uppercase">{zone === 'Village' ? 'Aetheris Reach' : zone} (M)</span>
          </div>
      </div>

      <div className="absolute bottom-4 left-4 w-72 h-36 overflow-hidden bg-black/60 border border-white/5 p-3 rounded backdrop-blur-sm pointer-events-auto">
          <div className="flex flex-col-reverse gap-1.5 h-full overflow-y-auto scrollbar-hide">
              {logs.map((log, i) => (
                  <p key={i} className={`text-[10px] leading-tight font-medium ${log.includes('damage') ? 'text-red-400' : (log.includes('Picked up') || log.includes('Accepted') ? 'text-amber-400' : 'text-zinc-300')}`}>
                      <span className="text-zinc-600 mr-2 tabular-nums">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                      {log}
                  </p>
              ))}
          </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
          <div className="flex gap-1 p-1 bg-zinc-950/80 border-t-2 border-x-2 border-amber-900/50 rounded-t-lg shadow-2xl backdrop-blur-md">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                  <div 
                    key={num} 
                    className={`w-12 h-13 bg-zinc-900 border-2 rounded shadow-inner flex flex-col items-center justify-center transition-all cursor-pointer hover:-translate-y-1 hover:border-amber-500 relative overflow-hidden
                    ${num === 1 ? 'border-amber-600 bg-amber-600/10' : 'border-zinc-800'}
                    ${num === 3 && soulshotsActive ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : ''}
                    `}
                    onClick={(e) => handleActionClick(e, num)}
                  >
                      {num === 2 && cdPercent > 0 && (
                          <div 
                            className="absolute bottom-0 left-0 w-full bg-blue-500/20 backdrop-invert-[0.1] transition-all"
                            style={{ height: `${cdPercent}%` }}
                          />
                      )}
                      <span className="text-[7px] text-zinc-600 font-bold mb-1 uppercase tracking-tighter z-10">F{num}</span>
                      <div className="text-[9px] font-bold text-center leading-none z-10 tracking-tighter">
                          {num === 1 && 'ATTACK'}
                          {num === 2 && 'SKILL'}
                          {num === 3 && (soulshotsActive ? 'SS: ON' : 'SS: OFF')}
                          {num > 3 && '-'}
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-900/20" />
                  </div>
              ))}
          </div>
          <div className="w-[110%] h-1 bg-gradient-to-r from-transparent via-amber-900/20 to-transparent blur-sm" />
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
          <div className="bg-zinc-900/95 border-2 border-amber-900/40 p-2 px-6 rounded-sm flex items-center gap-4 shadow-2xl backdrop-blur-sm">
              <span className="rpg-font text-amber-500 text-xl font-bold tracking-widest tabular-nums">
                {stats.gold.toLocaleString()} 
                <span className="text-[10px] tracking-[0.3em] text-zinc-500 ml-2 uppercase font-sans">Aethertouch</span>
              </span>
          </div>
          <div className="text-[9px] text-zinc-600 rpg-font tracking-widest uppercase opacity-50 flex gap-4">
            <span onClick={(e) => { e.stopPropagation(); onToggleQuests(); }} className="cursor-pointer hover:text-amber-500 transition-colors">Q: Quests</span>
            <span>Esc: Menu | M: Map</span>
          </div>
      </div>

    </div>
  );
};

export default HUD;
