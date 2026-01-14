
import React from 'react';
import { CharacterClass } from '../types';

interface ClassSelectionProps {
  onSelect: (cls: CharacterClass) => void;
}

const ClassSelection: React.FC<ClassSelectionProps> = ({ onSelect }) => {
  const classes: { name: CharacterClass; desc: string; stats: string }[] = [
    { name: 'Warrior', desc: 'Masters of the blade and plate armor. High defense and powerful strikes.', stats: 'HP: 150 | STR: 15' },
    { name: 'Mage', desc: 'Channelers of the world soul. Fragile, but possess immense mana reserves.', stats: 'MP: 150 | STR: 5' },
    { name: 'Archer', desc: 'Agile hunters who strike from the shadows. Balanced and swift.', stats: 'HP: 100 | MP: 80' },
  ];

  return (
    <div className="fixed inset-0 bg-black z-[110] flex items-center justify-center p-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533134486753-c8176974b68c?auto=format&fit=crop&q=80&w=2000')] bg-cover opacity-20 scale-110 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black pointer-events-none" />
        
        <div className="relative w-full max-w-6xl">
            <div className="text-center mb-16 animate-in slide-in-from-top duration-1000">
                <h1 className="rpg-font text-6xl text-amber-500 mb-4 tracking-[0.4em] drop-shadow-2xl">THE AWAKENING</h1>
                <p className="text-zinc-500 text-sm tracking-widest uppercase">Choose your legacy to enter Aethelgard</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {classes.map((c, i) => (
                    <button
                        key={c.name}
                        onClick={() => onSelect(c.name)}
                        className="group relative bg-zinc-900/60 border border-zinc-800 p-8 rounded-lg overflow-hidden transition-all hover:border-amber-500 hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-in slide-in-from-bottom duration-700"
                        style={{ animationDelay: `${i * 150}ms` }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full group-hover:bg-amber-500/10 transition-colors" />
                        
                        <h2 className="rpg-font text-3xl text-white mb-4 tracking-wider group-hover:text-amber-500 transition-colors">{c.name}</h2>
                        <div className="h-0.5 w-12 bg-amber-900 mb-6 group-hover:w-full transition-all duration-500" />
                        
                        <p className="text-zinc-400 text-sm leading-relaxed mb-8 italic">"{c.desc}"</p>
                        
                        <div className="bg-black/40 p-3 rounded border border-white/5 flex justify-between items-center group-hover:border-amber-900/40">
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Base Potential</span>
                            <span className="text-[10px] text-amber-500 font-mono">{c.stats}</span>
                        </div>

                        <div className="mt-8 text-center text-xs text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity tracking-[0.3em] uppercase">
                            Awaken →
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div className="absolute bottom-8 text-zinc-700 text-[10px] tracking-[0.5em] uppercase">
            aethelgard chronicle • legacy of the seven seals
        </div>
    </div>
  );
};

export default ClassSelection;
