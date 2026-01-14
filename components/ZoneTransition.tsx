
import React from 'react';
import { GameZone } from '../types';

interface ZoneTransitionProps {
  zone: GameZone;
}

const ZoneTransition: React.FC<ZoneTransitionProps> = ({ zone }) => {
  const zoneNames: Record<GameZone, string> = {
    'Castle': 'AETHELGARD CASTLE TOWN',
    'Village': 'ABANDONED RUINS',
    'Forest': 'FOREST OF MIRRORS'
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-black pointer-events-none" />
      
      <div className="rpg-font text-amber-500 text-6xl text-center px-4 tracking-[0.3em] mb-4 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
        {zoneNames[zone]}
      </div>
      
      <div className="h-0.5 w-64 bg-gradient-to-r from-transparent via-amber-900 to-transparent animate-in zoom-in duration-1000 delay-500" />
      
      <div className="mt-6 text-zinc-500 rpg-font text-xs tracking-[0.5em] uppercase opacity-50">
        Entering Territory
      </div>

      <div className="absolute bottom-12 flex gap-4">
          <div className="w-2 h-2 rounded-full bg-amber-500/20 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-amber-500/40 animate-pulse delay-75" />
          <div className="w-2 h-2 rounded-full bg-amber-500/20 animate-pulse delay-150" />
      </div>
    </div>
  );
};

export default ZoneTransition;
