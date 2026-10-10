export interface LevelInfo {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  progressPct: number;
  currentLevelXp: number;
  neededLevelXp: number;
}

export const LEVELS = [
  { level: 1, title: 'Novice', minXp: 0, maxXp: 150 },
  { level: 2, title: 'Disciple', minXp: 150, maxXp: 400 },
  { level: 3, title: 'Focus Warrior', minXp: 400, maxXp: 800 },
  { level: 4, title: 'Discipline Master', minXp: 800, maxXp: 1500 },
  { level: 5, title: 'Game Changer', minXp: 1500, maxXp: 3000 },
];

export function calculateLevel(xp: number): LevelInfo {
  const currentXp = Math.max(0, xp || 0);
  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    if (currentXp < lvl.maxXp || i === LEVELS.length - 1) {
      const needed = lvl.maxXp - lvl.minXp;
      const earned = Math.min(needed, currentXp - lvl.minXp);
      const progressPct = Math.min(100, Math.round((earned / needed) * 100));
      return {
        level: lvl.level,
        title: lvl.title,
        minXp: lvl.minXp,
        maxXp: lvl.maxXp,
        progressPct,
        currentLevelXp: earned,
        neededLevelXp: needed,
      };
    }
  }
  return {
    level: 5,
    title: 'Game Changer',
    minXp: 1500,
    maxXp: 3000,
    progressPct: 100,
    currentLevelXp: 1500,
    neededLevelXp: 1500,
  };
}

export interface Quote {
  text: string;
  author: string;
}

export const MOTIVATIONAL_QUOTES: Quote[] = [
  {
    text: "Дисциплина — это решение делать то, чего не хочется, чтобы достичь того, о чем мечтаешь.",
    author: "Марк Аврелий"
  },
  {
    text: "Мы являемся тем, что постоянно делаем. Совершенство — это не действие, а привычка.",
    author: "Аристотель"
  },
  {
    text: "Трудности делают сильным только того, кто встречает их лицом к лицу.",
    author: "Сенека"
  },
  {
    text: "Победа над самим собой — единственное настоящее величие.",
    author: "Платон"
  },
  {
    text: "Не бойся медлить, бойся остановиться.",
    author: "Восточная мудрость"
  },
  {
    text: "Боль временна. Гордость за победу над своей ленью — вечна.",
    author: "Дэвид Гоггинс"
  },
  {
    text: "Не жди вдохновения. Дисциплина рождает вдохновение, а не наоборот.",
    author: "Брюс Ли"
  },
  {
    text: "Маленькие ежедневные победы со временем приводят к колоссальным результатам.",
    author: "Робин Шарма"
  }
];

export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: 'target' | 'flame' | 'zap' | 'shield' | 'trophy' | 'crown';
  isUnlocked: boolean;
  progressText: string;
}

export function getAchievements(userDb: any, logs: any[]): Achievement[] {
  const streak = userDb?.streak || 0;
  const totalDays = logs.length;
  const hasShield = (userDb?.shields ?? 3) < 3 || !!userDb?.last_shield_used_date;

  return [
    {
      id: 'first_step',
      title: 'Первый Шаг',
      description: 'Закройте свой первый день любой привычки',
      iconName: 'target',
      isUnlocked: totalDays >= 1,
      progressText: totalDays >= 1 ? 'Выполнено' : `${totalDays}/1`
    },
    {
      id: 'streak_3',
      title: 'Искра Воли',
      description: 'Удержите стрик 3 дня подряд без пропусков',
      iconName: 'zap',
      isUnlocked: streak >= 3,
      progressText: streak >= 3 ? 'Выполнено' : `${streak}/3 дн.`
    },
    {
      id: 'streak_7',
      title: 'Железная Дисциплина',
      description: 'Достигните стрика в 7 дней подряд',
      iconName: 'flame',
      isUnlocked: streak >= 7,
      progressText: streak >= 7 ? 'Выполнено' : `${streak}/7 дн.`
    },
    {
      id: 'shield_master',
      title: 'Хранитель Очага',
      description: 'Активируйте заморозку и спасите свой стрик',
      iconName: 'shield',
      isUnlocked: hasShield,
      progressText: hasShield ? 'Выполнено' : 'Не использован'
    },
    {
      id: 'milestone_10',
      title: 'Мастер Фокуса',
      description: 'Закройте суммарно 10 дней в любых привычках',
      iconName: 'trophy',
      isUnlocked: totalDays >= 10,
      progressText: totalDays >= 10 ? 'Выполнено' : `${totalDays}/10 дн.`
    },
    {
      id: 'game_changer',
      title: 'Game Changer',
      description: 'Завершите 21-дневный цикл трансформации',
      iconName: 'crown',
      isUnlocked: totalDays >= 21,
      progressText: totalDays >= 21 ? 'Выполнено' : `${totalDays}/21 дн.`
    }
  ];
}
