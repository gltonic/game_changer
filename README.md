# Game Changer 🎯

Game Changer is an elite habit-tracking and productivity Mini App for Telegram. 
Built for those who want to build discipline through gamification.

## Features
- **Telegram Mini App Integration**: Seamlessly works inside Telegram as a Web App.
- **Gamified Habits**: Keep your "Streak" alive. If you fail, you lose a "Life" (❤️).
- **Shields (Freeze)**: Use limited monthly shields to freeze your streak on rest days.
- **Push Notifications**: Receive automated reminders and penalty notifications via the Telegram Bot.
- **Clean UI**: Beautiful, dark-mode minimalist interface focused on reducing friction.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite, Lucide Icons.
- **Backend**: Node.js, Grammy (Telegram Bot framework), node-cron.
- **Database**: Supabase (PostgreSQL).

## Project Structure
- `/frontend`: The React UI built as a Telegram Web App.
- `/backend`: The Telegram Bot responsible for notifications and midnight streak calculations.

## Installation

### Frontend
1. cd `frontend`
2. Run `npm install`
3. Run `npm run dev`
4. Make sure to set your `.env` variables (e.g. `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

### Backend
1. cd `backend`
2. Run `npm install`
3. Rename `.env.example` to `.env` and fill in your keys (`TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Run `npm start` (or use `pm2 start npm --name "bot" -- start` for production).

## Roadmap
- [ ] Implement robust RLS (Row Level Security) in Supabase.
- [ ] Add Guidelines/Marketplace for habits.
- [ ] Introduce User Levels & XP.

---
*Focus. Discipline. Freedom.*
