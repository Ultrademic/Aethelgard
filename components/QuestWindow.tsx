
import React from 'react';
import { Quest, CharacterClass } from '../types';

interface QuestWindowProps {
  quests: Quest[];
  onClose: () => void;
  zone: string;
  playerClass: CharacterClass | null;
}

const QuestWindow: React.FC<QuestWindowProps> = ({ quests, onClose, zone, playerClass }) => {
  const activeQuests = quests.filter(q => q.active);
  const completedQuests = quests.filter(q => q.completed);

  const getClassReward = () => {
    if (playerClass === 'Mage') return "Purple Wizard Hat";
    if (playerClass === 'Archer') return "Green Ranger Cap";
    if (playerClass === 'Warrior') return "Red Combat Bandana";
    return "Class Artifact";
  };

  const getRewardColor = () => {
    if (playerClass === 'Mage') return "text-purple-400";
    if (playerClass === 'Archer') return "text-green-400";
    if (playerClass === 'Warrior') return "text-red-400";
    return "text-amber-500";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-8">
      <div className="bg-zinc-900 border-2 border-amber-900/40 w-full max-w-3xl rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in duration-200">
        
        <div className="bg-amber-900/20 border-b border-amber-900/30 p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="rpg-font text-3xl text-amber-500 uppercase tracking-[0.2em]">Quest Journal</h2>
            <div className="h-px w-24 bg-gradient-to-r from-amber-500 to-transparent opacity-30" />
          </div>
          <button 
            onClick={onClose}
            className="rpg-font text-xs text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            [ Close (Q) ]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          <div className="mb-12">
            <h3 className="rpg-font text-sm text-amber-700 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              Ongoing Objectives
            </h3>
            
            {activeQuests.length === 0 ? (
              <p className="text-zinc-600 italic text-sm py-4 border-l border-zinc-800 pl-4">No active quests in your journal. Speak to Archmagister Valerius in Aetheris Reach to find tasks.</p>
            ) : (
              <div className="space-y-6">
                {activeQuests.map(q => (
                  <div key={q.id} className="bg-zinc-800/30 border border-zinc-700/50 p-5 rounded-lg group hover:border-amber-900/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-amber-200 font-bold tracking-wide">{q.title} {q.repeatable && <span className="text-[8px] border border-amber-900/50 px-1 rounded ml-2 opacity-50">REPEATABLE</span>}</h4>
                        <p className="text-xs text-zinc-500 mt-1 italic leading-relaxed">"A challenge issued by the Archmagister of Aetheris Reach."</p>
                      </div>
                      <div className="bg-zinc-950 px-3 py-1 rounded text-[10px] font-mono text-amber-500 border border-amber-900/30">
                        {q.progress} / {q.count} {q.target}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800/50">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-zinc-600 uppercase font-bold">Reward</span>
                          <span className="text-xs text-amber-500 font-mono">{q.rewardGold} Aethertouch</span>
                        </div>
                        {q.id === 1 && q.completedCount === 0 && (
                          <div className="flex flex-col border-l border-zinc-700 pl-4">
                            <span className="text-[8px] text-zinc-600 uppercase font-bold">Legacy Reward ({playerClass})</span>
                            <span className={`text-xs ${getRewardColor()} font-bold`}>{getClassReward()}</span>
                          </div>
                        )}
                      </div>
                      {q.progress >= q.count ? (
                        <span className="text-[10px] text-green-400 rpg-font tracking-widest animate-pulse font-bold">Return to Archmagister</span>
                      ) : (
                        <span className="text-[10px] text-zinc-600 rpg-font tracking-widest uppercase">In Progress</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {completedQuests.length > 0 && (
            <div>
              <h3 className="rpg-font text-sm text-zinc-700 uppercase tracking-widest mb-6">Legends Foretold</h3>
              <div className="space-y-3 opacity-60">
                {completedQuests.map(q => (
                  <div key={q.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded flex justify-between items-center">
                    <div>
                      <h4 className="text-zinc-500 text-sm">{q.title} (Completed {q.completedCount}x)</h4>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-tighter mt-1">Accomplished in {zone === 'Village' ? 'Aetheris Reach' : zone}</p>
                    </div>
                    <span className="text-green-900/50 text-[10px] rpg-font uppercase font-bold">Done</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="bg-zinc-950 p-4 px-8 border-t border-zinc-800/50 flex justify-between items-center">
          <span className="text-[9px] text-zinc-600 tracking-[0.4em] uppercase">Chronicle Journal • Vol. I</span>
          <span className="text-[9px] text-amber-900 font-bold uppercase tracking-widest">Aetheris Chronicle</span>
        </div>
      </div>
    </div>
  );
};

export default QuestWindow;
