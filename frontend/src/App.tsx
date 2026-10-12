import { useState, useEffect } from 'react'
import { LayoutDashboard, Route, Compass, X, Target, Play, Check, Zap, Settings, Plus, Bell, Heart, Shield, Droplet } from 'lucide-react'
import { Dashboard } from './Dashboard'
import { PathView } from './PathView'
import { supabase } from './lib/supabase'
import { CelebrationModal } from './components/CelebrationModal'
import { AchievementsModal } from './components/AchievementsModal'
import { calculateLevel, getRandomQuote, getAchievements, type Quote } from './lib/gamification'

function App() {
  const [activeTab, setActiveTab] = useState<'dash' | 'path' | 'hub'>('dash')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false)
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{
    isOpen: boolean;
    quote: Quote;
    earnedXp: number;
    questTitle: string;
    dayNumber: number;
  } | null>(null)
  
  // State for the Quest Form
  const [questTitle, setQuestTitle] = useState('Deep Work')
  const [questDesc, setQuestDesc] = useState('60 minutes of unbroken focus. No phone.')
  const [selectedDuration, setSelectedDuration] = useState(21)
  const [tgNotifs, setTgNotifs] = useState(true)
  const [reminderTime, setReminderTime] = useState('07:00')
  const [isSaving, setIsSaving] = useState(false)
  const [quests, setQuests] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [userDb, setUserDb] = useState<any>(null)
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null)
  const [selectedQuest, setSelectedQuest] = useState<any>(null)
  
  // Получаем реальный ID пользователя из Telegram, либо используем тестовый (если открыли просто в браузере)
  // @ts-ignore
  const tg = window.Telegram?.WebApp;
  const USER_ID = tg?.initDataUnsafe?.user?.id || 111111111;

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!tg?.HapticFeedback) return;
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {
      // Ignore in non-supported environments
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (tg) {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation?.();
    }
    fetchData();
  }, []);

  // Управление нативной кнопкой Назад в Telegram
  useEffect(() => {
    const canUseBackButton = tg?.isVersionAtLeast?.('6.1') && tg?.BackButton;
    if (!canUseBackButton) return;
    const isModalOpen = selectedDay !== null || isSettingsOpen || isFreezeModalOpen || isAchievementsOpen || !!celebrationData?.isOpen;
    const canGoBack = activeTab !== 'dash' || isModalOpen;

    if (canGoBack) {
      tg.BackButton.show();
      const handleBack = () => {
        if (celebrationData?.isOpen) setCelebrationData(null);
        else if (isAchievementsOpen) setIsAchievementsOpen(false);
        else if (selectedDay !== null) setSelectedDay(null);
        else if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isFreezeModalOpen) setIsFreezeModalOpen(false);
        else if (activeTab !== 'dash') setActiveTab('dash');
      };
      tg.BackButton.onClick(handleBack);
      return () => {
        tg.BackButton.offClick(handleBack);
      };
    } else {
      tg.BackButton.hide();
    }
  }, [activeTab, selectedDay, isSettingsOpen, isFreezeModalOpen, isAchievementsOpen, celebrationData]);

  const fetchData = async () => {
    const [questsRes, logsRes, userRes] = await Promise.all([
      supabase.from('quests').select('*').eq('user_id', USER_ID).order('created_at', { ascending: false }),
      supabase.from('quest_logs').select('*').eq('user_id', USER_ID),
      supabase.from('users').select('*').eq('id', USER_ID).single()
    ]);
    
    if (userRes.data) setUserDb(userRes.data);
    else if (userRes.error && userRes.error.code === 'PGRST116') {
       // Если юзера еще нет, создаем его с дефолтными значениями
       const { data: newUser } = await supabase.from('users').upsert({ 
         id: USER_ID, 
         first_name: tg?.initDataUnsafe?.user?.first_name || 'Test',
         username: tg?.initDataUnsafe?.user?.username || ''
       }).select().single();
       if (newUser) setUserDb(newUser);
    }

    if (questsRes.data) {
      setQuests(questsRes.data);
      // Select the first quest by default for Path tab if none is selected
      if (questsRes.data.length > 0 && !selectedQuest) {
        setSelectedQuest(questsRes.data[0]);
      }
    }
    if (logsRes.data) setLogs(logsRes.data);
  };

  const handleOpenHabit = (quest: any) => {
    triggerHaptic('light');
    setSelectedQuest(quest);
    setActiveTab('path');
    
    // Auto-open today's card
    const completedForThisQuest = logs.filter(l => l.quest_id === quest.id).length;
    const currentDay = Math.min(completedForThisQuest + 1, quest.total_days || 21);
    setSelectedDay(currentDay);
  };

  const handleCompleteDay = async () => {
    if (!selectedQuest || selectedDay === null) return;
    try {
      setIsSaving(true);
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('quest_logs').insert([
        { quest_id: selectedQuest.id, user_id: USER_ID, day_number: selectedDay, completed_at: nowIso }
      ]);
      if (error) {
        if (error.code === '23505') {
           alert('You already completed this day!');
        } else throw error;
      } else {
        triggerHaptic('success');
        
        const earnedXp = 50;
        const currentXp = userDb?.xp || 0;
        const newXp = currentXp + earnedXp;
        const updatePayload: any = { xp: newXp };

        // Проверяем, выполнил ли пользователь все свои квесты на сегодня
        const alreadyCompletedToday = completedTodayIds.includes(selectedQuest.id);
        const willBeCompletedCount = alreadyCompletedToday ? completedTodayIds.length : (completedTodayIds.length + 1);
        const allQuestsCompletedToday = quests.length > 0 && willBeCompletedCount >= quests.length;
        
        // Локальная календарная дата пользователя (YYYY-MM-DD)
        const d = new Date();
        const todayDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (allQuestsCompletedToday && userDb?.last_active_date !== todayDateStr) {
          updatePayload.streak = (userDb?.streak || 0) + 1;
          updatePayload.last_active_date = todayDateStr;
        }

        await supabase.from('users').update(updatePayload).eq('id', USER_ID);

        const savedDay = selectedDay;
        const savedQuestTitle = selectedQuest.title;

        await fetchData();
        setSelectedDay(null);

        // Открываем поздравительный экран с конфетти, мотивирующей цитатой и XP
        setCelebrationData({
          isOpen: true,
          quote: getRandomQuote(),
          earnedXp,
          questTitle: savedQuestTitle,
          dayNumber: savedDay
        });
      }
    } catch(e) {
      console.error(e);
      alert('Error completing day');
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // СТАТИСТИКА
  // ----------------------------------------------------
  const uniqueDates = new Set(logs.filter(l => l.completed_at).map(l => new Date(l.completed_at).toLocaleDateString()));
  const totalCompletedDays = uniqueDates.size;
  
  const totalExpectedDays = quests.reduce((acc, q) => acc + (q.total_days || 21), 0);
  const overallProgressPct = totalExpectedDays > 0 ? Math.round((totalCompletedDays / totalExpectedDays) * 100) : 0;
  
  const todayDateStr = new Date().toLocaleDateString();
  const completedTodayLogs = logs.filter(l => {
    return l.completed_at && new Date(l.completed_at).toLocaleDateString() === todayDateStr;
  });
  const completedTodayIds = completedTodayLogs.map(l => l.quest_id);
  const todayProgressPct = quests.length > 0 ? Math.round((completedTodayIds.length / quests.length) * 100) : 0;
  
  const currentDay = selectedQuest 
    ? (logs.filter(l => l.quest_id === selectedQuest.id).length + 1) 
    : 1;

  const handleSaveQuest = async () => {
    setIsSaving(true);
    try {
      // 1. Убеждаемся, что юзер существует (Upsert)
      await supabase.from('users').upsert({ 
        id: USER_ID, 
        first_name: tg?.initDataUnsafe?.user?.first_name || 'Test User',
        username: tg?.initDataUnsafe?.user?.username || ''
      });

      // 2. Сохраняем привычку в базу
      if (editingQuestId) {
        const { error } = await supabase.from('quests')
          .update({
            title: questTitle,
            description: questDesc,
            total_days: selectedDuration,
            reminder_time: tgNotifs ? reminderTime : null
          })
          .eq('id', editingQuestId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('quests').insert([
          { 
            user_id: USER_ID,
            title: questTitle,
            description: questDesc,
            total_days: selectedDuration,
            reminder_time: tgNotifs ? reminderTime : null
          }
        ]);
        if (error) throw error;
      }
      
      setIsSettingsOpen(false);
      fetchData();
      // Можно показать красивый toast-уведомление вместо алерта
      // alert('Mission saved successfully to Supabase! 🚀');
    } catch (err) {
      console.error(err);
      alert('Error saving mission.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuest = async () => {
    if (!editingQuestId) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this quest?');
    if (!confirmDelete) return;
    
    try {
      setIsSaving(true);
      const { error } = await supabase.from('quests').delete().eq('id', editingQuestId);
      if (error) throw error;
      setIsSettingsOpen(false);
      fetchData();
    } catch(e) {
      console.error(e);
      alert('Error deleting quest');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-black h-[100dvh] w-full flex justify-center font-sans text-gray-300 overflow-hidden">
      {/* Мобильный контейнер */}
      <div className="w-full max-w-[400px] h-full bg-[#050505] relative shadow-2xl border-x border-white/5 flex flex-col pb-20 overflow-hidden">
        
        {/* Background glow effects */}
        <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-[#d4af37] opacity-10 blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/4 right-[-50px] w-48 h-48 bg-[#d4af37] opacity-5 blur-[80px] pointer-events-none"></div>

        {activeTab === 'dash' && (
          <>
            <header className="px-6 pt-5 pb-3 flex flex-col gap-1 z-10 shrink-0">
              <h1 className="text-3xl font-serif text-white tracking-widest uppercase">Game Changer</h1>
              <p className="text-[#d4af37] text-xs font-mono tracking-[0.2em] uppercase opacity-80">Focus. Discipline. Freedom.</p>
              
              <div className="flex items-center justify-between px-2 mt-4 border-b border-white/10 pb-4">
                 <div className="flex flex-col items-center">
                    <span className="text-2xl font-light text-[#d4af37] flex items-center gap-2">
                      <Droplet size={20} fill="currentColor" />
                      {userDb?.streak || 0}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Streak</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-2xl font-light text-red-500 flex items-center gap-2">
                      <Heart size={20} fill="currentColor" />
                      {userDb?.lives ?? 3}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Lives</span>
                 </div>
                 <button 
                   className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                   onClick={() => setIsFreezeModalOpen(true)}
                 >
                    <span className="text-2xl font-light text-sky-400 flex items-center gap-2">
                      <Shield size={20} fill="currentColor" />
                      {userDb?.shields ?? 3}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-sky-400/70 mt-1">Shields</span>
                 </button>
              </div>
            </header>
            <main className="flex-1 px-6 flex flex-col gap-5 z-10 overflow-y-auto no-scrollbar pb-8">
              <Dashboard 
                onOpenHabit={handleOpenHabit} 
                quests={quests} 
                overallProgressPct={overallProgressPct}
                focusStreak={userDb?.streak || 0}
                todayProgressPct={todayProgressPct}
                completedTodayIds={completedTodayIds}
                levelInfo={calculateLevel(userDb?.xp || 0)}
                onOpenAchievements={() => setIsAchievementsOpen(true)}
              />
            </main>
          </>
        )}

        {activeTab === 'path' && (
          <main 
            className="flex-1 px-6 z-10 overflow-y-auto no-scrollbar"
            style={{
              maskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)'
            }}
          >
            {selectedQuest ? (
              <PathView 
                quest={selectedQuest}
                quests={quests}
                onSelectQuest={(quest: any) => {
                  setSelectedQuest(quest);
                }}
                logs={logs.filter(l => l.quest_id === selectedQuest.id)}
                onDayClick={setSelectedDay}
                userDb={userDb}
                onOpenShields={() => setIsFreezeModalOpen(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 mt-20">
                <Compass size={48} className="mb-4 opacity-50" />
                <p>Select a quest from the Hub<br/>to view your path.</p>
              </div>
            )}
          </main>
        )}

        {activeTab === 'hub' && (
          <main className="flex-1 px-6 py-8 z-10 overflow-y-auto no-scrollbar">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif text-white tracking-widest uppercase">Missions Hub</h2>
             </div>
             
             {/* My Active Slots */}
             <div className="flex flex-col gap-4">
                {quests.map(quest => (
                  <div key={quest.id} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#d4af37]/10 flex items-center justify-center border border-[#d4af37]/30 text-[#d4af37]">
                           <Zap size={22} fill="currentColor" />
                        </div>
                        <div>
                           <h3 className="text-white font-medium tracking-wide">{quest.title}</h3>
                           <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">{quest.total_days} Days • {quest.reminder_time ? quest.reminder_time.substring(0,5) : 'No Time'}</p>
                        </div>
                     </div>
                     <button 
                       className="text-gray-500 hover:text-white p-2 transition-colors"
                       onClick={() => {
                          setEditingQuestId(quest.id);
                          setQuestTitle(quest.title);
                          setQuestDesc(quest.description || '');
                          setSelectedDuration(quest.total_days || 21);
                          if (quest.reminder_time) {
                            setTgNotifs(true);
                            setReminderTime(quest.reminder_time.substring(0,5));
                          } else {
                            setTgNotifs(false);
                          }
                          setIsSettingsOpen(true);
                       }}
                     >
                        <Settings size={20} />
                     </button>
                  </div>
                ))}

                {/* Empty Slot */}
                {quests.length < 5 && (
                <div 
                  className="border border-dashed border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setEditingQuestId(null);
                    setQuestTitle('New Custom Quest');
                    setQuestDesc('Describe your daily action here...');
                    setSelectedDuration(21);
                    setTgNotifs(true);
                    setReminderTime('07:00');
                    setIsSettingsOpen(true);
                  }}
                >
                   <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10 text-gray-600">
                      <Plus size={24} />
                   </div>
                   <div>
                      <h3 className="text-gray-400 font-medium tracking-wide">Empty Slot ({quests.length + 1}/5)</h3>
                      <p className="text-gray-600 text-[10px] uppercase tracking-wider mt-0.5">Tap to add a new quest</p>
                   </div>
                </div>
                )}
             </div>

             {/* Account Settings */}
             <div className="mt-12">
                <h2 className="text-xs font-serif text-[#d4af37] tracking-widest uppercase mb-4">Account & Notifications</h2>
                <div className="bg-[#050505] border border-white/5 rounded-2xl flex flex-col overflow-hidden">
                   <div className="flex items-center justify-between p-5">
                      <div className="flex flex-col gap-1">
                         <span className="text-white font-medium text-sm">Streak Break Alerts</span>
                         <span className="text-gray-500 text-[10px] uppercase tracking-wider">Get Telegram DM if life is lost</span>
                      </div>
                      <button 
                        onClick={async () => {
                           const newVal = !(userDb?.alerts_enabled ?? true);
                           await supabase.from('users').update({ alerts_enabled: newVal }).eq('id', USER_ID);
                           fetchData();
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${userDb?.alerts_enabled !== false ? 'bg-[#d4af37]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${userDb?.alerts_enabled !== false ? 'left-7 bg-black' : 'left-1 bg-gray-500'}`} />
                      </button>
                   </div>
                </div>
             </div>
          </main>
        )}

        {/* TabBar */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-md border-t border-white/5 h-20 flex items-center justify-around px-2 z-40">
           <div 
             onClick={() => setActiveTab('dash')}
             className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'dash' ? 'text-[#d4af37]' : 'text-gray-600 hover:text-gray-400'}`}
           >
              <LayoutDashboard size={20} />
              <span className="text-[9px] uppercase tracking-widest mt-1">Dash</span>
           </div>
           <div 
             onClick={() => setActiveTab('path')}
             className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'path' ? 'text-[#d4af37]' : 'text-gray-600 hover:text-gray-400'}`}
           >
              <Route size={20} />
              <span className="text-[9px] uppercase tracking-widest mt-1">Path</span>
           </div>
           <div 
             onClick={() => setActiveTab('hub')}
             className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'hub' ? 'text-[#d4af37]' : 'text-gray-600 hover:text-gray-400'}`}
           >
              <Compass size={20} />
              <span className="text-[9px] uppercase tracking-widest mt-1">Hub</span>
           </div>
        </nav>

        {/* Шторка (Bottom Sheet) Настроек / Создания Привычки */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            <div className="relative bg-[#0a0a0a] border-t border-[#d4af37]/30 p-6 pb-12 rounded-t-[32px] shadow-[0_-10px_40px_rgba(212,175,55,0.15)] flex flex-col gap-6 animate-in slide-in-from-bottom-full duration-300">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full" />
              <button 
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={24} />
              </button>

              <h3 className="text-2xl font-serif text-white mt-2">Quest Settings</h3>

              <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[60vh] pb-4">
                
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Quest Name</label>
                  <input 
                    type="text" 
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]/50" 
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Daily Action</label>
                  <textarea 
                    rows={3} 
                    value={questDesc}
                    onChange={(e) => setQuestDesc(e.target.value)}
                    className="bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]/50 resize-none"
                  ></textarea>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">Path Length (Days)</label>
                  <div className="grid grid-cols-4 gap-2">
                     {[21, 30, 60, 90].map(d => (
                        <button 
                          key={d} 
                          onClick={() => setSelectedDuration(d)}
                          className={`py-2 rounded-xl border transition-colors ${selectedDuration === d ? 'bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37]' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}
                        >
                           {d}
                        </button>
                     ))}
                  </div>
                </div>

                {/* Telegram Notifications */}
                <div className="bg-[#050505] border border-white/10 rounded-xl p-4 flex flex-col gap-4">
                   <div className="flex items-center justify-between cursor-pointer" onClick={() => setTgNotifs(!tgNotifs)}>
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Bell size={16} />
                         </div>
                         <span className="text-white font-medium">Telegram Push</span>
                      </div>
                      <button 
                        className={`w-12 h-6 rounded-full relative transition-colors ${tgNotifs ? 'bg-[#d4af37]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${tgNotifs ? 'left-7 bg-black' : 'left-1 bg-gray-500'}`} />
                      </button>
                   </div>
                   
                   {tgNotifs && (
                     <>
                       <div className="w-full h-[1px] bg-white/5" />
                       <div className="flex justify-between items-center px-1">
                          <span className="text-gray-400 text-sm">Reminder Time</span>
                          <input 
                            type="time" 
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="bg-transparent text-white font-mono outline-none border-b border-white/20 pb-1 text-right cursor-pointer" 
                          />
                       </div>
                     </>
                   )}
                </div>

              </div>

              <div className="flex flex-col gap-3">
                <button 
                  disabled={isSaving}
                  className="w-full bg-[#d4af37] text-black font-bold text-lg py-4 rounded-2xl flex items-center justify-center hover:bg-[#b5952f] transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-50"
                  onClick={handleSaveQuest}
                >
                  {isSaving ? 'SAVING...' : 'SAVE QUEST'}
                </button>
                
                {editingQuestId && (
                  <button 
                    disabled={isSaving}
                    className="w-full bg-transparent border border-red-500/30 text-red-500 font-bold text-lg py-4 rounded-2xl flex items-center justify-center hover:bg-red-500/10 transition-all disabled:opacity-50"
                    onClick={handleDeleteQuest}
                  >
                    DELETE QUEST
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Шторка (Bottom Sheet) Карточки Дня */}
        {selectedDay !== null && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setSelectedDay(null)}
            />
            
            <div className="relative bg-[#050505] w-full max-w-[340px] border border-white/10 p-8 rounded-[32px] shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <button 
                className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors"
                onClick={() => setSelectedDay(null)}
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] mb-6">
                 <Target size={28} />
              </div>

              <span className="text-[#d4af37] text-[10px] font-mono tracking-widest uppercase mb-2">
                Mission Day {selectedDay}
              </span>
              <h3 className="text-xl font-serif text-white mb-6 leading-snug px-2">{selectedQuest?.title || 'Unknown Quest'}</h3>

              <div className="bg-[#0a0a0a] w-full border border-white/5 py-5 px-5 rounded-2xl mb-8">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedQuest?.description || 'Complete your daily action.'}
                  </p>
              </div>

              <button 
                className={`
                  w-full font-bold text-sm py-4 rounded-full flex items-center justify-center gap-2 transition-all tracking-widest uppercase
                  ${selectedDay <= currentDay 
                    ? 'bg-[#d4af37] text-black hover:bg-[#b5952f] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }
                `}
                onClick={() => {
                  if (selectedDay === currentDay) {
                    handleCompleteDay();
                  } else if (selectedDay < currentDay) {
                    setSelectedDay(null);
                  }
                }}
              >
                {selectedDay < currentDay ? (
                  <>
                    <Check size={18} /> Completed
                  </>
                ) : selectedDay === currentDay ? (
                  <>
                    <Play size={16} fill="currentColor" /> Finish It
                  </>
                ) : (
                  <>Locked</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Модалка Заморозки */}
        {isFreezeModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setIsFreezeModalOpen(false)}
            />
            
            <div className="relative bg-[#050505] w-full max-w-[340px] border border-sky-500/20 p-8 rounded-[32px] shadow-[0_0_50px_rgba(56,189,248,0.15)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <button 
                className="absolute top-5 right-5 text-gray-600 hover:text-white transition-colors"
                onClick={() => setIsFreezeModalOpen(false)}
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6">
                 <Shield size={32} fill="currentColor" />
              </div>

              <h3 className="text-xl font-serif text-white mb-2">Use a Shield?</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Freeze your streak for today. You won't lose a life if you miss your habits.
              </p>

              <div className="flex items-center gap-4 mb-8">
                 <span className="text-4xl font-light text-white">{userDb?.shields ?? 3}</span>
                 <span className="text-xs uppercase tracking-widest text-gray-500 text-left">Shields<br/>Left</span>
              </div>

              <button 
                className={`w-full font-bold text-sm py-4 rounded-full flex items-center justify-center gap-2 transition-all tracking-widest uppercase ${(userDb?.shields || 0) > 0 ? 'bg-sky-500 text-black hover:bg-sky-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.4)]' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                disabled={(userDb?.shields || 0) <= 0 || isSaving}
                onClick={async () => {
                  if ((userDb?.shields || 0) <= 0) return;
                  setIsSaving(true);
                  const d = new Date();
                  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  
                  if (userDb.last_shield_used_date === today) {
                    alert('You already used a shield today!');
                    setIsSaving(false);
                    return;
                  }

                  const { error } = await supabase.from('users').update({
                    shields: userDb.shields - 1,
                    last_shield_used_date: today
                  }).eq('id', USER_ID);

                  if (!error) {
                    await fetchData();
                    setIsFreezeModalOpen(false);
                  } else {
                    alert('Error using shield');
                  }
                  setIsSaving(false);
                }}
              >
                {isSaving ? 'Activating...' : ((userDb?.shields || 0) > 0 ? 'Activate Shield' : 'No Shields Left')}
              </button>
            </div>
          </div>
        )}

        {/* Модалка Празднования Дня (Конфетти, Цитата, XP) */}
        {celebrationData && (
          <CelebrationModal
            isOpen={celebrationData.isOpen}
            onClose={() => setCelebrationData(null)}
            quote={celebrationData.quote}
            earnedXp={celebrationData.earnedXp}
            questTitle={celebrationData.questTitle}
            dayNumber={celebrationData.dayNumber}
          />
        )}

        {/* Модалка Достижений */}
        <AchievementsModal
          isOpen={isAchievementsOpen}
          onClose={() => setIsAchievementsOpen(false)}
          achievements={getAchievements(userDb, logs)}
        />

      </div>
    </div>
  )
}

export default App
