
import React from 'react';
import { DialogueOption } from '../types';

interface DialogueBoxProps {
  dialogue: { npc: string; message: string; options: DialogueOption[] };
  onClose: () => void;
  isLoading?: boolean;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ dialogue, onClose, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center p-8 z-40">
      <div className="bg-zinc-900 border-t-4 border-amber-900/80 w-full max-w-4xl shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="p-2 px-6 bg-amber-900/40 border-b border-amber-800/20 flex justify-between items-center">
            <span className="rpg-font text-amber-500 text-sm tracking-widest uppercase">{dialogue.npc}</span>
            {isLoading && <span className="text-[10px] text-amber-500/50 animate-pulse uppercase tracking-tighter">Connecting to world soul...</span>}
        </div>
        <div className="p-8 md:p-12">
            <div className={`text-xl text-zinc-100 mb-10 leading-relaxed italic transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
                "{dialogue.message}"
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dialogue.options.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={opt.action}
                        disabled={isLoading}
                        className="text-left bg-zinc-800/50 hover:bg-amber-900/40 border border-zinc-700 hover:border-amber-500/50 p-4 px-6 transition-all group flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="text-zinc-400 group-hover:text-white text-sm font-medium">{opt.text}</span>
                        <span className="text-amber-500/40 group-hover:text-amber-500 transition-colors">⟫</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
