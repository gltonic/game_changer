import { X, Target, Flame, Zap, Shield, Trophy, Crown, Lock, Check } from 'lucide-react'
import type { Achievement } from '../lib/gamification'

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

export function AchievementsModal({ isOpen, onClose, achievements }: AchievementsModalProps) {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  const renderIcon = (name: Achievement['iconName'], isUnlocked: boolean) => {
    const size = 20;
    const cls = isUnlocked ? 'text-[#d4af37]' : 'text-gray-600';
    switch (name) {
      case 'target': return <Target size={size} className={cls} />;
      case 'flame': return <Flame size={size} className={cls} fill={isUnlocked ? 'currentColor' : 'none'} />;
      case 'zap': return <Zap size={size} className={cls} fill={isUnlocked ? 'currentColor' : 'none'} />;
      case 'shield': return <Shield size={size} className={cls} fill={isUnlocked ? 'currentColor' : 'none'} />;
      case 'trophy': return <Trophy size={size} className={cls} />;
      case 'crown': return <Crown size={size} className={cls} fill={isUnlocked ? 'currentColor' : 'none'} />;
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative bg-[#080808] w-full max-w-[360px] max-h-[85vh] border border-[#d4af37]/30 p-6 rounded-[32px] shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-[#d4af37] text-[10px] font-mono tracking-widest uppercase mb-1">
              Трофеи и Заслуги
            </span>
            <h3 className="text-xl font-serif text-white">Достижения</h3>
            <span className="text-xs text-gray-400 mt-1 font-mono">
              Открыто {unlockedCount} из {achievements.length}
            </span>
          </div>

          <button 
            className="text-gray-500 hover:text-white transition-colors p-1"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar of Unlocks */}
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-6">
          <div 
            className="bg-[#d4af37] h-full shadow-[0_0_8px_rgba(212,175,55,0.7)] transition-all duration-500" 
            style={{ width: `${Math.round((unlockedCount / achievements.length) * 100)}%` }}
          />
        </div>

        {/* Achievements List */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1 pb-2">
          {achievements.map((ach) => (
            <div 
              key={ach.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5
                ${ach.isUnlocked 
                  ? 'bg-[#111111] border-[#d4af37]/30 shadow-[0_2px_15px_rgba(212,175,55,0.08)]' 
                  : 'bg-[#050505] border-white/5 opacity-65'
                }
              `}
            >
              <div 
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border
                  ${ach.isUnlocked 
                    ? 'bg-[#d4af37]/10 border-[#d4af37]/30 shadow-[0_0_12px_rgba(212,175,55,0.25)]' 
                    : 'bg-white/5 border-white/10 text-gray-600'
                  }
                `}
              >
                {renderIcon(ach.iconName, ach.isUnlocked)}
              </div>

              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium tracking-wide ${ach.isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                    {ach.title}
                  </h4>
                  {ach.isUnlocked ? (
                    <span className="text-[10px] text-[#d4af37] font-mono font-bold flex items-center gap-1 bg-[#d4af37]/10 px-2 py-0.5 rounded-full">
                      <Check size={11} strokeWidth={3} />
                      {ach.progressText}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                      <Lock size={11} />
                      {ach.progressText}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {ach.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
