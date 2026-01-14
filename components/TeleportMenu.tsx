
import React from 'react';
import { GameZone } from '../types';

interface TeleportMenuProps {
  onClose: () => void;
  onTeleport: (zone: GameZone, cost: number) => void;
  currentZone: GameZone;
  gold: number;
}

const TeleportMenu: React.FC<TeleportMenuProps> = ({ onClose, onTeleport, currentZone, gold }) => {
  const destinations: { zone: GameZone; name: string; cost: number; desc: string }[] = [
    { zone: 'Castle', name: 'Aethelgard Castle Town', cost: 0, desc: 'The safe haven and seat of the world soul seekers.' },
    { zone: 'Forest', name: 'Forest of Whispers', cost: 50, desc: 'A dense woodland teeming with wild creatures.' },
    { zone: 'Village', name: 'Abandoned Ruins', cost: 150, desc: 'The remains of a grand fortress, now home to the undead.' }
  ];

  const availableDestinations = destinations.filter(d => d.zone !== currentZone);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-8">
      <div className="bg-zinc-900 border-2 border-white/10 w-full max-w-lg rounded-lg shadow-[0_0_100px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden animate-in zoom-in duration-200">
        
        <div className="bg-white/5 border-b border-white/5 p-6 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="rpg-font text-2xl text-white uppercase tracking-[0.2em]">Aether Gateways</h2>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Teleportation Service • Gatekeeper Milia</span>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors rpg-font text-xs uppercase tracking-widest"
          >
            [ Close ]
          </button>
        </div>

        <div className="p-8 space-y-4">
          <div className="flex justify-between items-center mb-4 bg-zinc-950/50 p-3 border border-white/5 rounded">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Available Aethertouch</span>
            <span className="text-sm text-amber-500 font-mono font-bold">{gold.toLocaleString()}</span>
          </div>

          {availableDestinations.map((dest, idx) => {
            const canAfford = gold >= dest.cost;
            return (
              <button
                key={idx}
                onClick={() => canAfford && onTeleport(dest.zone, dest.cost)}
                disabled={!canAfford}
                className={`w-full text-left p-4 rounded border transition-all flex justify-between items-center group
                  ${canAfford 
                    ? 'bg-zinc-800/50 border-white/5 hover:border-amber-500/50 hover:bg-zinc-800' 
                    : 'bg-zinc-950/50 border-zinc-800 opacity-40 cursor-not-allowed'}
                `}
              >
                <div className="flex flex-col">
                  <span className={`text-sm font-bold tracking-wide ${canAfford ? 'text-amber-200' : 'text-zinc-600'}`}>
                    {dest.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1 italic pr-4">
                    {dest.desc}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`text-xs font-mono font-bold ${canAfford ? 'text-amber-500' : 'text-red-900'}`}>
                    {dest.cost} AT
                  </span>
                  {canAfford && (
                    <span className="text-[8px] text-amber-500/0 group-hover:text-amber-500/60 uppercase font-bold tracking-tighter transition-all">
                      Gate Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-zinc-950 p-4 px-8 border-t border-white/5 text-[9px] text-zinc-600 italic text-center uppercase tracking-widest">
          "The Aether connects all things, for a price."
        </div>
      </div>
    </div>
  );
};

export default TeleportMenu;
