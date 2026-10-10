import { useEffect } from 'react'
import { Sparkles, Trophy, Check, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Quote } from '../lib/gamification'

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  earnedXp: number;
  questTitle: string;
  dayNumber: number;
}

export function CelebrationModal({
  isOpen,
  onClose,
  quote,
  earnedXp,
  questTitle,
  dayNumber
}: CelebrationModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Trigger multi-stage confetti
      const end = Date.now() + 1200;
      const colors = ['#d4af37', '#ffffff', '#ffd700', '#38bdf8'];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative bg-[#080808] w-full max-w-[340px] border border-[#d4af37]/40 p-6 rounded-[32px] shadow-[0_0_60px_rgba(212,175,55,0.25)] flex flex-col items-center text-center animate-in zoom-in-95 duration-300 overflow-hidden">
        
        {/* Glow orb */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#d4af37] opacity-20 blur-[60px] pointer-events-none"></div>

        {/* Badge Icon */}
        <div className="relative mb-4 mt-2">
          <div className="w-20 h-20 rounded-full bg-[#d4af37]/15 border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.4)] animate-bounce duration-1000">
            <Check size={36} strokeWidth={3} className="drop-shadow-[0_0_8px_rgba(212,175,55,0.9)]" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-black border border-[#d4af37] rounded-full p-1 text-[#d4af37]">
            <Sparkles size={14} fill="currentColor" />
          </div>
        </div>

        {/* Title */}
        <span className="text-[#d4af37] text-[10px] font-mono tracking-[0.25em] uppercase mb-1 flex items-center gap-1.5">
          <Sparkles size={12} fill="currentColor" />
          День пройден
          <Sparkles size={12} fill="currentColor" />
        </span>
        <h3 className="text-xl font-serif text-white mb-1">
          {questTitle}
        </h3>
        <span className="text-xs font-mono text-gray-500 mb-4">
          День {dayNumber} успешно зафиксирован
        </span>

        {/* XP Reward Card */}
        <div className="w-full bg-[#111111] border border-white/10 rounded-2xl p-3 flex items-center justify-between mb-5 shadow-inner">
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-xl bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/20">
              <Trophy size={16} />
            </div>
            <span className="text-xs uppercase tracking-wider text-gray-400 font-medium">Награда за день</span>
          </div>
          <span className="font-mono font-bold text-[#d4af37] text-sm pr-2 bg-[#d4af37]/10 px-2.5 py-1 rounded-full border border-[#d4af37]/30 shadow-[0_0_10px_rgba(212,175,55,0.3)]">
            +{earnedXp} XP
          </span>
        </div>

        {/* Motivational Quote Box */}
        <div className="w-full bg-[#0d0d0d] border border-white/5 p-4 rounded-2xl mb-6 relative">
          <p className="text-gray-300 text-xs italic leading-relaxed font-serif mb-2">
            «{quote.text}»
          </p>
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#d4af37] opacity-90 block text-right">
            — {quote.author}
          </span>
        </div>

        {/* Continue Button */}
        <button 
          onClick={onClose}
          className="w-full bg-[#d4af37] text-black font-bold text-sm py-4 rounded-full flex items-center justify-center gap-2 tracking-widest uppercase hover:bg-[#b5952f] transition-all shadow-[0_0_25px_rgba(212,175,55,0.35)] cursor-pointer"
        >
          <span>Продолжить</span>
          <ArrowRight size={16} />
        </button>

      </div>
    </div>
  );
}
