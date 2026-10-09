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
// Start the bot
bot.start({
    onStart: (botInfo) => {
        console.log(`🚀 Bot @${botInfo.username} is running...`);
    }
});
//# sourceMappingURL=index.js.map