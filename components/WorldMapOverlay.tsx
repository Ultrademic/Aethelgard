
import React from 'react';
import { GameZone } from '../types';

interface WorldMapOverlayProps {
  zone: GameZone;
  playerPosition: { x: number; z: number };
  onClose: () => void;
}

const WorldMapOverlay: React.FC<WorldMapOverlayProps> = ({ zone, playerPosition, onClose }) => {
  const zoneInfo: Record<GameZone, { title: string; color: string; landmarks: { name: string; x: number; y: number }[] }> = {
    'Castle': {
      title: 'AETHELGARD CASTLE TOWN',
      color: '#stone',
      landmarks: [
        { name: 'Warrior Guild', x: 50, y: 15 },
        { name: 'Mage Guild', x: 20, y: 20 },
        { name: 'Gatekeeper', x: 80, y: 20 },
        { name: 'Magic Shop', x: 50, y: 50 },
        { name: 'Temple', x: 80, y: 45 },
        { name: 'Warehouse', x: 50, y: 75 },
        { name: 'Blacksmith', x: 20, y: 85 },
        { name: 'Armor Shop', x: 80, y: 85 },
        { name: 'North Gate', x: 50, y: 5 },
      ]
    },
    'Forest': {
      title: 'FOREST OF MIRRORS',
      color: '#66cc88',
      landmarks: [
        { name: 'Portal to Castle', x: 50, y: 90 },
        { name: 'Wolf Den', x: 80, y: 40 },
      ]
    },
    'Village': {
      title: 'ABANDONED RUINS',
      color: '#9988aa',
      landmarks: [
        { name: 'Portal to Forest', x: 50, y: 90 },
        { name: 'Throne Room', x: 50, y: 10 },
      ]
    }
  };

  const info = zoneInfo[zone];

  const mapCoord = (val: number) => {
    const scale = 500; // Increased scale for town
    return ((val + scale) / (scale * 2)) * 100;
  };

  const pX = mapCoord(playerPosition.x);
  const pY = mapCoord(playerPosition.z);

  return (
    <div 
        className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
        onClick={onClose}
    >
        <div className="w-[85%] h-[85%] border-2 border-white/5 bg-white/5 backdrop-blur-sm rounded-3xl relative p-8 pointer-events-auto">
            <div className="absolute top-4 left-4 rpg-font text-white/40 text-sm tracking-[0.4em]">AETHELGARD MAP (M)</div>
            <button 
                className="absolute top-4 right-8 text-zinc-500 hover:text-white rpg-font text-xs uppercase tracking-widest"
                onClick={onClose}
            >
                [ CLOSE ]
            </button>
            
            <div className="w-full h-full border border-white/10 rounded-2xl relative overflow-hidden bg-black/60">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                {info.landmarks.map((mark, i) => (
                    <div 
                        key={i} 
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                        style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                    >
                        <div className="w-2.5 h-2.5 border border-amber-500/50 rotate-45" />
                        <span className="text-[9px] text-zinc-500 rpg-font tracking-widest whitespace-nowrap bg-black/80 px-2 py-0.5 rounded border border-white/5">{mark.name}</span>
                    </div>
                ))}

                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                  style={{ left: `${pX}%`, top: `${pY}%` }}
                >
                    <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,1)] animate-pulse border-2 border-white" />
                    <span className="text-[10px] text-blue-400 font-bold uppercase mt-1 tracking-widest drop-shadow-md">CURRENT POSITION</span>
                </div>

                <div className="absolute bottom-12 left-12">
                    <h2 className="rpg-font text-5xl text-white/10 tracking-[0.3em]">{info.title}</h2>
                </div>
            </div>
        </div>
    </div>
  );
};

export default WorldMapOverlay;
