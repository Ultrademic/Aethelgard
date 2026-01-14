
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
        { name: 'Central Plaza', x: 50, y: 50 },
        { name: 'Gate of Mirages', x: 50, y: 10 },
        { name: 'Market District', x: 40, y: 50 },
        { name: 'Magic Academy', x: 60, y: 50 },
      ]
    },
    'Forest': {
      title: 'FOREST OF MIRRORS',
      color: '#66cc88',
      landmarks: [
        { name: 'Portal to Castle', x: 50, y: 90 },
        { name: 'Portal to Ruins', x: 50, y: 10 },
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
    const scale = 400;
    return ((val + scale) / (scale * 2)) * 100;
  };

  const pX = mapCoord(playerPosition.x);
  const pY = mapCoord(playerPosition.z);

  return (
    <div 
        className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
        onClick={onClose}
    >
        <div className="w-[80%] h-[80%] border-2 border-white/5 bg-white/5 backdrop-blur-sm rounded-3xl relative p-8 pointer-events-auto">
            <div className="absolute top-4 left-4 rpg-font text-white/40 text-sm tracking-[0.4em]">MAP OVERLAY (M)</div>
            <button 
                className="absolute top-4 right-8 text-zinc-500 hover:text-white rpg-font text-xs uppercase tracking-widest"
                onClick={onClose}
            >
                [ CLOSE ]
            </button>
            
            <div className="w-full h-full border border-white/10 rounded-2xl relative overflow-hidden bg-black/40">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-[10%] border border-white/10 rounded-xl bg-zinc-900/20" />

                {info.landmarks.map((mark, i) => (
                    <div 
                        key={i} 
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                        style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                    >
                        <div className="w-2.5 h-2.5 border-2 border-amber-500 rotate-45" />
                        <span className="text-[10px] text-zinc-400 rpg-font tracking-widest whitespace-nowrap bg-black/60 px-1 rounded">{mark.name}</span>
                    </div>
                ))}

                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
                  style={{ left: `${pX}%`, top: `${pY}%` }}
                >
                    <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,1)] animate-pulse border-2 border-white" />
                    <span className="text-[9px] text-blue-400 font-bold uppercase mt-1 tracking-widest drop-shadow-md">You</span>
                </div>

                <div className="absolute bottom-12 left-12">
                    <h2 className="rpg-font text-4xl text-white/20 tracking-[0.2em]">{info.title}</h2>
                </div>
            </div>
        </div>
    </div>
  );
};

export default WorldMapOverlay;
