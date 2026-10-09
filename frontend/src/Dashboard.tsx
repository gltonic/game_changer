import { Zap, Droplet, Check } from 'lucide-react'

interface DashboardProps {
  onOpenHabit: (quest: any) => void;
  quests: any[];
  overallProgressPct: number;
  focusStreak: number;
  todayProgressPct: number;
  completedTodayIds: string[];
}

export function Dashboard({ onOpenHabit, quests, overallProgressPct, focusStreak, todayProgressPct, completedTodayIds }: DashboardProps) {
  return (
    <>
      {/* Progress Bars */}
      <section className="flex flex-col gap-4">
        <div>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-[10px] uppercase tracking-widest text-white">Today's Progress</h2>
            <span className="text-[#d4af37] font-mono text-sm">{todayProgressPct}%</span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
             <div className="bg-[#d4af37] h-full shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all duration-500" style={{ width: `${todayProgressPct}%` }}></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-[10px] uppercase tracking-widest text-gray-500">Overall Progress</h2>
            <span className="text-gray-400 font-mono text-xs">{overallProgressPct}%</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
             <div className="bg-gray-500 h-full transition-all duration-500" style={{ width: `${overallProgressPct}%` }}></div>
          </div>
        </div>
      </section>

      {/* Today's Schedule */}
      <section className="flex flex-col gap-4">
         <div className="flex justify-between items-center mb-2">
           <h2 className="text-xs uppercase tracking-widest text-gray-500">Today's Schedule</h2>
         </div>

         {quests.length === 0 ? (
           <div className="bg-[#0a0a0a] border border-white/5 p-6 text-center rounded-2xl">
             <span className="text-gray-500 text-sm">No active quests. Go to Hub to add one!</span>
           </div>
         ) : (
           quests.map((quest) => {
             const isCompletedToday = completedTodayIds.includes(quest.id);
             return (
               <div 
                  key={quest.id}
                  className={`border border-white/5 p-4 relative group cursor-pointer transition-colors rounded-xl
                    ${isCompletedToday ? 'bg-[#050505] opacity-60' : 'bg-[#0a0a0a] hover:bg-[#111]'}
                  `}
                  onClick={() => onOpenHabit(quest)}
               >
                  {!isCompletedToday && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.8)] rounded-r-md"></div>
                  )}
                  <div className="flex justify-between items-center pl-3">
                     <div className="flex flex-col gap-1">
                        <span className={`font-medium tracking-wide text-sm ${isCompletedToday ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {quest.title}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {quest.total_days} Days · {quest.reminder_time ? quest.reminder_time.substring(0,5) : 'No Time'}
                        </span>
                     </div>
                     <button 
                       className={`h-10 w-10 shrink-0 border flex items-center justify-center transition-colors z-10 rounded-xl
                         ${isCompletedToday 
                            ? 'border-white/10 text-gray-500' 
                            : 'border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10'
                         }
                       `}
                       onClick={(e) => {
                         e.stopPropagation();
                         if (!isCompletedToday) onOpenHabit(quest);
                       }}
                     >
                        {isCompletedToday ? (
                          <Check size={16} />
                        ) : (
                          <Zap size={16} fill="currentColor" className="opacity-80" />
                        )}
                     </button>
                  </div>
               </div>
             )
           })
         )}
      </section>

      {/* Focus Streak */}
      <section className="mt-4 bg-[#0a0a0a] border border-white/5 p-6 flex justify-between items-center">
         <div className="flex flex-col">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Focus Streak</h3>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-light text-white">{focusStreak}</span>
               <span className="text-[10px] text-gray-500 uppercase tracking-widest">Days</span>
            </div>
         </div>
         <div className="text-[#d4af37]">
            <Droplet size={36} className="drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
         </div>
      </section>
    </>
  )
}
