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
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr || !users) return;

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

    // 2. Достаем квесты и логи за вчерашний день
    const { data: quests } = await supabase.from('quests').select('id').eq('user_id', user.id);
    
    // Если у юзера нет активных квестов - пропускаем
    if (!quests || quests.length === 0) continue;

    // Ищем логи (выполненные задания) за вчера
    // Так как supabase хранит в UTC, упрощенный запрос по дате (в MVP пойдет)
    const { data: logs } = await supabase.from('quest_logs')
      .select('quest_id')
      .eq('user_id', user.id)
      .gte('created_at', yesterdayStr + 'T00:00:00')
      .lte('created_at', yesterdayStr + 'T23:59:59');

    const completedQuestsCount = logs ? logs.length : 0;
    const allCompleted = completedQuestsCount >= quests.length;
    
    // Проверяем, использовал ли он щит вчера
    const usedShieldYesterday = user.last_shield_used_date === yesterdayStr;

    let lifeLost = false;

    if (!allCompleted) {
      if (usedShieldYesterday) {
        // Щит спас от потери жизни! Стрик просто не сбросился.
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
      streak: updatedStreak
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
