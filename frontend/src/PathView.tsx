import { Check, Heart, Shield, Droplet } from 'lucide-react'
import { useEffect } from 'react'

interface PathViewProps {
  quest: any;
  quests: any[];
  onSelectQuest: (quest: any) => void;
  logs: any[];
  onDayClick: (day: number) => void;
}

export function PathView({ quest, quests, onSelectQuest, logs, onDayClick }: PathViewProps) {
  const totalDays = quest.total_days || 21;
  const completedDaysCount = logs.length;
  // Если все дни пройдены, то currentDay не может превышать totalDays
  const currentDay = Math.min(completedDaysCount + 1, totalDays);

  const days = Array.from({ length: totalDays }, (_, i) => totalDays - i);
  const getOffsetX = (day: number) => Math.sin(day * 0.7) * 70;

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById(`day-node-${currentDay}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [currentDay, quest.id]);

  return (
    <div className="flex flex-col items-center w-full pb-32">
      {/* Закрепленный заголовок (Sticky Header) */}
      <div className="sticky top-0 -mx-6 px-6 w-[calc(100%+3rem)] bg-[#050505]/95 backdrop-blur-md border-b border-white/5 py-4 z-40 flex flex-col gap-4">
        {/* Верхний ряд: Геймификация (Стрик и Жизни) */}
        <div className="flex justify-between items-center w-full">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[#d4af37] bg-[#d4af37]/10 px-3 py-1 rounded-full border border-[#d4af37]/20">
                 <Droplet size={16} fill="currentColor" className="drop-shadow-[0_0_5px_rgba(212,175,55,0.8)]" />
                 <span className="font-mono font-bold text-sm">23</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                 <Heart size={16} fill="currentColor" className="drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                 <span className="font-mono font-bold text-sm">3</span>
              </div>
           </div>
           
           <div className="flex items-center gap-1.5 text-sky-400 bg-sky-400/10 px-3 py-1 rounded-full border border-sky-400/20">
              <Shield size={16} fill="currentColor" className="drop-shadow-[0_0_5px_rgba(56,189,248,0.8)]" />
           </div>
        </div>

        {/* Нижний ряд: Список миссий (Горизонтальный скролл) */}
        <div className="w-full flex flex-col gap-2 mt-2">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] uppercase tracking-widest text-gray-500">Select Mission</span>
            <span className="font-mono text-[#d4af37] text-xs">DAY {completedDaysCount} / {totalDays}</span>
          </div>
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
             {quests.map(q => (
               <button
                 key={q.id}
                 onClick={() => onSelectQuest(q)}
                 className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-colors border
                   ${q.id === quest.id 
                     ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                     : 'bg-[#0a0a0a] border-white/10 text-gray-400 hover:bg-[#111]'}
                 `}
               >
                 {q.title}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col relative mt-10">
        {days.map((day) => {
          const isPassed = day <= completedDaysCount;
          const isCurrent = day === completedDaysCount + 1;
          const isFuture = day > completedDaysCount + 1;
          const currX = getOffsetX(day);
          const nextX = day > 1 ? getOffsetX(day - 1) : currX;
          const isLineActive = day <= currentDay;

          return (
            <div key={day} id={`day-node-${day}`} className="relative h-24 w-full flex justify-center items-center">
              {day > 1 && (
                <svg 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[200px] h-24 overflow-visible pointer-events-none" 
                  style={{ zIndex: 0 }}
                >
                  <path 
                    d={`M ${100 + currX} 0 C ${100 + currX} 48, ${100 + nextX} 48, ${100 + nextX} 96`}
                    fill="none"
                    stroke={isLineActive ? "#d4af37" : "rgba(255,255,255,0.05)"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    style={{ filter: isLineActive ? 'drop-shadow(0px 0px 8px rgba(212,175,55,0.6))' : 'none' }}
                  />
                </svg>
              )}
              <div 
                className="z-10 transition-transform duration-500 hover:scale-110 cursor-pointer"
                style={{ transform: `translateX(${currX}px)` }}
                onClick={() => onDayClick(day)}
              >
                <div 
                  className={`
                    relative flex items-center justify-center rounded-full transition-all duration-300
                    ${isPassed ? 'w-14 h-14 bg-[#0a0a0a] border-2 border-[#d4af37] text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : ''}
                    ${isCurrent ? 'w-16 h-16 bg-[#d4af37] border-2 border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.8)] text-black animate-pulse' : ''}
                    ${isFuture ? 'w-14 h-14 bg-[#050505] border border-white/10 text-gray-700' : ''}
                  `}
                >
                  {isPassed ? (
                    <Check size={24} className="drop-shadow-[0_0_5px_rgba(212,175,55,1)]" strokeWidth={3} />
                  ) : (
                    <span className={`font-mono font-bold ${isCurrent ? 'text-2xl' : 'text-lg'}`}>
                      {day}
                    </span>
                  )}
                  {isCurrent && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-[120%] bg-[#050505] border border-[#d4af37]/30 px-3 py-1 rounded shadow-lg whitespace-nowrap animate-none">
                      <span className="text-xs text-[#d4af37] font-bold tracking-widest uppercase flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-ping"></span>
                        Day {day}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
