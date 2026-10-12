"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const grammy_1 = require("grammy");
const supabase_js_1 = require("@supabase/supabase-js");
const cron = __importStar(require("node-cron"));
const dotenv = __importStar(require("dotenv"));
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
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// 2. Initialize Telegram Bot
const bot = new grammy_1.Bot(botToken);
// Handle the /start command
bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;
    if (!userId)
        return;
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
    const keyboard = new grammy_1.InlineKeyboard().webApp("Open Game Changer 🚀", miniAppUrl);
    await ctx.reply(`Welcome to *Game Changer*, ${firstName}!\n\nI am your companion. I will remind you about your daily quests so you stay on track.\n\nTap the button below to start your journey.`, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
    });
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
                await bot.api.sendMessage(quest.user_id, `🔥 Time for your quest: *${quest.title}*!\n\nOpen the app and mark it as completed!`, { parse_mode: 'Markdown' });
            }
            catch (err) {
                console.error(`Failed to send reminder to user ${quest.user_id}:`, err);
            }
        }
    }
});
// 4. Setup CRON job for Gamification (Runs at 00:01 every day)
cron.schedule('1 0 * * *', async () => {
    console.log('[CRON] Midnight check: Streaks and Lives...');
    const now = new Date();
    const currentMonthStr = now.toISOString().substring(0, 7); // YYYY-MM
    // UTC dates
    const todayUtc = now.toISOString().split('T')[0];
    const yesterdayDateUtc = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayUtc = yesterdayDateUtc.toISOString().split('T')[0];
    // Local dates
    const formatLocalDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const todayLocal = formatLocalDate(now);
    const yesterdayDateLocal = new Date(now);
    yesterdayDateLocal.setDate(yesterdayDateLocal.getDate() - 1);
    const yesterdayLocal = formatLocalDate(yesterdayDateLocal);
    // Set of valid dates representing "yesterday" or "today" in any relevant timezone
    const validRecentDates = new Set([yesterdayUtc, yesterdayLocal, todayUtc, todayLocal]);
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
        if (questsErr || !quests || quests.length === 0)
            continue;
        // 3. Проверяем, выполнил ли юзер привычки
        // А) В приложении уже зафиксировано закрытие дня (user.last_active_date совпадает с недавней датой)
        const userAlreadyClosedDay = Boolean(user.last_active_date && validRecentDates.has(user.last_active_date));
        // Б) Проверяем логи выполнения за последние 30 часов
        const windowStart = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
        const { data: logs, error: logsErr } = await supabase.from('quest_logs')
            .select('quest_id')
            .eq('user_id', user.id)
            .gte('completed_at', windowStart);
        if (logsErr) {
            console.error(`[CRON] Error fetching quest_logs for user ${user.id}:`, logsErr);
            // При ошибке запроса не штрафуем пользователя!
            continue;
        }
        const completedQuestIds = new Set((logs || []).map(l => l.quest_id));
        const allQuestsLogged = quests.every(q => completedQuestIds.has(q.id));
        const allCompleted = userAlreadyClosedDay || allQuestsLogged;
        // Проверяем, использовал ли он щит
        const usedShield = Boolean(user.last_shield_used_date && validRecentDates.has(user.last_shield_used_date));
        let lifeLost = false;
        if (allCompleted) {
            // Все привычки выполнены!
            // Если стрик не был инкрементирован клиентом, обновляем
            if (!user.last_active_date || !validRecentDates.has(user.last_active_date)) {
                updatedStreak = (user.streak ?? 0) + 1;
            }
        }
        else {
            if (usedShield) {
                // Щит спас от потери жизни! Стрик не сбрасывается.
                console.log(`[CRON] User ${user.id} protected by shield.`);
            }
            else {
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
            last_active_date: allCompleted ? (user.last_active_date || yesterdayUtc) : user.last_active_date
        }).eq('id', user.id);
        // Отправляем пуш-уведомление в Телеграм, если жизнь сгорела
        if (lifeLost && user.alerts_enabled !== false) {
            try {
                await bot.api.sendMessage(user.id, `На шаг дальше от своей цели( 📉\n\nВчера были выполнены не все привычки. Вы потеряли 1 жизнь. Осталось жизней: ${updatedLives}.`);
            }
            catch (e) {
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
