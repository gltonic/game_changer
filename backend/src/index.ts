import { Bot, InlineKeyboard } from 'grammy';
import { createClient } from '@supabase/supabase-js';
import * as cron from 'node-cron';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const miniAppUrl = process.env.MINI_APP_URL || 'https://example.com'; // We will replace this later

if (!botToken || !supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

// 1. Initialize Supabase Admin Client
// We use the Service Role key to bypass Row Level Security in the backend
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Initialize Telegram Bot
const bot = new Bot(botToken);

// Handle the /start command
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name;

  if (!userId) return;

  // Store or update the user in Supabase
  const { error } = await supabase.from('users').upsert({
    id: userId,
    username: username || '',
    first_name: firstName || ''
  });

  if (error) {
    console.error("Error saving user:", error);
  }

  // Create an inline button to open the Mini App
  const keyboard = new InlineKeyboard().webApp(
    "Open Game Changer 🚀",
    miniAppUrl
  );

  await ctx.reply(
    `Welcome to *Game Changer*, ${firstName}!\n\nI am your companion. I will remind you about your daily quests so you stay on track.\n\nTap the button below to start your journey.`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    }
  );
});

// 3. Setup CRON job for Push Notifications (Runs every minute)
cron.schedule('* * * * *', async () => {
  const now = new Date();
  
  // Format current time to HH:MM in UTC
  // Wait, if the user saved their local time "07:00", we might need to handle timezones.
  // For simplicity MVP: Assuming the saved reminder_time is the same timezone as the server/bot for now,
  // or we just compare the HH:MM strings. Let's use local server time.
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}:00`; 

  // console.log(`[CRON] Checking reminders for time: ${currentTime}`);

  // Find all active quests where reminder_time matches current time
  const { data: quests, error } = await supabase
    .from('quests')
    .select('id, user_id, title, reminder_time')
    .eq('reminder_time', currentTime);

  if (error) {
    console.error("Cron query error:", error);
    return;
  }

  if (quests && quests.length > 0) {
    for (const quest of quests) {
      try {
        // Send a Telegram message to the user
        await bot.api.sendMessage(
          quest.user_id,
          `🔥 Time for your quest: *${quest.title}*!\n\nOpen the app and mark it as completed!`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error(`Failed to send reminder to user ${quest.user_id}:`, err);
      }
    }
  }
});

// 4. Setup CRON job for Gamification (Runs at 00:01 every day)
cron.schedule('1 0 * * *', async () => {
  console.log('[CRON] Midnight check: Streaks and Lives...');
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterdayDate);

  // Окно вчерашнего дня в ISO для поиска в quest_logs (с 00:00:00 до 23:59:59 вчерашнего дня)
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr || !users) {
    console.error('[CRON] Error fetching users:', usersErr);
    return;
  }

  for (const user of users) {
    let updatedLives = user.lives ?? 3;
    let updatedShields = user.shields ?? 3;
    let updatedStreak = user.streak ?? 0;
    let updatedResetMonth = user.last_shield_reset_month;

    // 1. Сбрасываем щиты 1-го числа месяца
    if (updatedResetMonth !== currentMonthStr) {
      updatedShields = 3;
      updatedResetMonth = currentMonthStr;
    }

    // 2. Достаем квесты юзера
    const { data: quests, error: questsErr } = await supabase.from('quests').select('id').eq('user_id', user.id);
    if (questsErr || !quests || quests.length === 0) continue;

    // 3. Проверяем, выполнил ли юзер привычки за вчера
    // А) В приложении уже зафиксировано закрытие вчерашнего дня (или уже сегодняшнего)
    const userAlreadyClosedDay = user.last_active_date === yesterdayStr || user.last_active_date === todayStr;

    // Б) Проверяем логи выполнения именно за вчерашний день
    const { data: logs, error: logsErr } = await supabase.from('quest_logs')
      .select('quest_id')
      .eq('user_id', user.id)
      .gte('completed_at', startOfYesterday.toISOString())
      .lte('completed_at', endOfYesterday.toISOString());

    if (logsErr) {
      console.error(`[CRON] Error fetching quest_logs for user ${user.id}:`, logsErr);
      // При ошибке запроса не штрафуем пользователя!
      continue;
    }

    const completedQuestIds = new Set((logs || []).map(l => l.quest_id));
    const allQuestsLogged = quests.every(q => completedQuestIds.has(q.id));

    const allCompleted = userAlreadyClosedDay || allQuestsLogged;

    // Проверяем, использовал ли юзер щит именно для вчерашнего дня
    const usedShield = user.last_shield_used_date === yesterdayStr;

    let lifeLost = false;

    if (allCompleted) {
      // Все привычки выполнены!
      // Если стрик не был инкрементирован клиентом за вчера или сегодня, обновляем
      if (user.last_active_date !== yesterdayStr && user.last_active_date !== todayStr) {
        updatedStreak = (user.streak ?? 0) + 1;
      }
    } else {
      if (usedShield) {
        // Щит спас от потери жизни! Стрик не сбрасывается.
        console.log(`[CRON] User ${user.id} protected by shield for ${yesterdayStr}.`);
      } else {
        // Провал: Жизнь сгорает, Стрик обнуляется
        updatedLives = Math.max(0, updatedLives - 1);
        updatedStreak = 0;
        lifeLost = true;
      }
    }

    // Обновляем БД
    await supabase.from('users').update({
      shields: updatedShields,
      last_shield_reset_month: updatedResetMonth,
      lives: updatedLives,
      streak: updatedStreak,
      last_active_date: allCompleted ? (user.last_active_date || yesterdayStr) : user.last_active_date
    }).eq('id', user.id);

    // Отправляем пуш-уведомление в Телеграм, если жизнь сгорела
    if (lifeLost && user.alerts_enabled !== false) {
      try {
        await bot.api.sendMessage(
          user.id,
          `На шаг дальше от своей цели( 📉\n\nВчера были выполнены не все привычки. Вы потеряли 1 жизнь. Осталось жизней: ${updatedLives}.`
        );
      } catch (e) {
        console.error(`Failed to notify user ${user.id}:`, e);
      }
    }
  }
});

// Start the bot
bot.start({
  onStart: (botInfo) => {
    console.log(`🚀 Bot @${botInfo.username} is running...`);
  }
});
