# Discord Quest Auto-Completion Bot

A selfbot that automatically completes **Discord Quests** with a Discord bot interface for easy control.

> [!CAUTION]
> As of April 7th 2026, Discord has expressed their intent to crack down on automating quest completion.
> 
> Use the script at your own risk.

> [!WARNING]
> **I take no responsibility for accounts that get blocked for using this repo.**

> [!CAUTION]
> **Using this on a user account is prohibited by the [Discord TOS](https://discord.com/terms) and can lead to account suspension.**

## ✨ Features

- Automatically **enrolls** and **completes** currently active quests
- Supported task types:
  - `WATCH_VIDEO`
  - `PLAY_ON_DESKTOP`
  - `PLAY_ON_XBOX` (untested)
  - `PLAY_ON_PLAYSTATION` (untested)
  - `PLAY_ACTIVITY` (untested)
  - `WATCH_VIDEO_ON_MOBILE`
  - `ACHIEVEMENT_IN_ACTIVITY`
- **Discord Slash Commands** for easy control
- **Deploy on Render** (free 24/7 hosting)
- **Persistent token storage** per user
- **Real-time status** and **log viewer**

## 📋 Slash Commands

| Command | Description |
|---------|-------------|
| `/token <token>` | Save your Discord token |
| `/complete` | Start auto-complete quest |
| `/mytoken` | View your saved token (partially hidden) |
| `/deltoken` | Delete your saved token |
| `/status` | View bot status & last 6 log lines |
| `/log [lines]` | View logs (default 6 lines) |
| `/help` | Show help menu |

## 🚀 Deploy on Render

### Prerequisites

1. **Discord Bot Token** - Create at [Discord Developer Portal](https://discord.com/developers/applications)
2. **GitHub Account** - For repository hosting
3. **Render Account** - For free hosting

### Step 1: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Give it a name
3. Go to **Bot** tab → Click **"Reset Token"** → Copy the token
4. Enable these Intents:
   - ✅ `MESSAGE CONTENT INTENT`
   - ✅ `SERVER MEMBERS INTENT`
   - ✅ `PRESENCE INTENT`
5. Invite bot to your server:
   - Go to **OAuth2** → **URL Generator**
   - Select `bot` and `applications.commands`
   - Select permissions: `Send Messages`, `Read Message History`
   - Copy URL → Open in browser → Select your server

### Step 2: Deploy on Render

1. **Push code to GitHub** (private repository recommended)
2. Go to [Render.com](https://render.com) and sign in
3. Click **"New +"** → Select **"Web Service"**
4. Connect your GitHub repository
5. Fill in the configuration:

| Field | Value |
|-------|-------|
| **Name** | `discord-quest-bot` (or your choice) |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm run start:bot` |

6. Add Environment Variables:

| Key | Value |
|-----|-------|
| `BOT_TOKEN` | Your Discord bot token |
| `NODE_VERSION` | `24.0.0` |

7. Click **"Create Web Service"**

### Step 3: Use the Bot

1. Go to your Discord server
2. Type `/help` to see all available commands
3. Save your user token: `/token <your_discord_token>`
4. Start quest: `/complete`

> [!IMPORTANT]
> The token you save with `/token` is your **Discord user token**, not the bot token!
> Get it from: Discord Desktop App → Ctrl+Shift+I → Network → Look for `Authorization` header.

## 📦 Local Development

> [!NOTE]
> **Node.js 24.0.0 or newer is required**

```bash
# Install dependencies
npm install

# Create config file
echo '{"botToken": "YOUR_BOT_TOKEN", "allowedUsers": []}' > config.json

# Start the bot
npm run start:bot