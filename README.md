# LEVELING ⚡

**Hayotning har bir sohasini darajaga ko'taring**

A premium futuristic life-gamification PWA. RPG-style evolution of productivity — levels up 7 life areas like a character in a game. Inspired by Solo Leveling, RPG skill trees, Apple design, and Notion minimalism.

🌐 **Live**: https://xarpbek.github.io/leveling

## Features

### Core gamification
- **7 life areas** — Body 💪, Mind 🧠, Heart ❤️, Wealth 💰, Social 🤝, Craft 🎨, Spirit 🎯
- **Exponential XP/leveling** per area, independent levels + Total Power = sum
- **7 ranks** — Beginner → Apprentice → Adept → Expert → Master → Legend → Mythic
- **12-stage evolving productivity pet** with happiness/energy decay
- **Combo system** — 3+ areas/day = bonus, all 7 = "PERFECT DAY"
- **Streak system** with skip-shields earned every 7 days
- **52 achievements** (common → rare → epic → legendary) with confetti unlocks
- **12 unlockable titles** (Iron Will, Bookworm, Zen Master, …)
- **Hidden quests** with secret unlock conditions
- **Real-world quests** (LEVELING Pro) — push outside comfort zone

### 13 pages
1. 🏠 **Dashboard** — Total Power hero, rank, 7-area tiles, radar chart, daily quests, streak, pet, daily boss, quote
2. 🌳 **Skill Tree** — 7 expandable branches with subskills, glow on high level, dim on neglected
3. ⚔️ **Boss Battles** — HP-bar bosses (Mini 7d / Elite 30d / Epic 100d / Legendary 365d), damage log
4. 📜 **Quest Log** — Daily/weekly/monthly/epic/hidden + Real-world (Pro) quests
5. 🎮 **Character Sheet** — Avatar (evolves with level), 7 stat bars, titles, achievement showcase
6. 🎯 **Habits** — Daily/weekly habits, streaks, 365-day heatmap, 12 templates, difficulty XP
7. ✓ **Tasks** — List + Kanban views, priorities, deadlines, **voice input** (Web Speech API)
8. 🔥 **Focus Mode** — Cinematic fullscreen Pomodoro (25/45/60/90 min), 6 ambient sounds, motivational quote
9. 📊 **Analytics** — Radar/line/pie charts, week & month comparison, streak history, life balance score, print report
10. 🏆 **Achievements** — 52 achievements with rarity colors, locked/unlocked states
11. 🛒 **Rewards Shop** — Themes, pet skins, avatar frames, sound packs, **custom titles**
12. 🗺️ **Timeline** (LEVELING X) — Lifetime journey milestones in chronological order
13. ⚙️ **Settings** — Theme/accent/lang, sound/haptics/notifications, LEVELING+ toggle, data export/import, keyboard shortcuts, about

### Premium UX
- **Web Audio API** synth sounds (no external files): XP chime, level-up arpeggio, achievement fanfare, boss victory, quest ding, perfect-day fanfare
- **6 ambient sounds**: rain, forest, ocean, cafe, white noise, pink noise
- **Canvas confetti** particle system with celebration bursts
- **Glassmorphism cards** with soft inner glow
- **60fps animations** (cubic-bezier, GPU transforms)
- **Inter** (UI) + **Orbitron / Space Grotesk** (numbers/levels)
- **Light/Dark/System** theme with **7 area accent colors** + auto contrast (--on-accent computed via luminance)
- **Mobile-first responsive** (375px → desktop)
- **Vibration API** haptics (toggleable)
- **Notification API** reminders (with permission flow)
- **Web Speech API** voice input on task creation
- **Smooth page transitions** (fade + slide)
- **Level-up overlay** with radial glow burst, particle confetti, sound

### PWA
- **Service Worker** — network-first for app shell, cache-first for libs/fonts, offline navigation fallback
- **Installable** with manifest + apple-touch-icon
- **Generated neon lightning bolt icons** (192/512/maskable, dependency-free Python generator in `tools/make_icons.py`)
- **PWA shortcuts** for Focus, Quests, Skill Tree

### Architecture
- **Vanilla JavaScript** — no framework, modular files
- **Single-page hash router** — 13 routes, smooth transitions
- **localStorage** persistence with debounced saves
- **JSON export/import** for backups
- **Print CSS** for PDF-quality reports via browser print
- **3 languages**: O'zbek (default), English, Русский

## Project structure

```
/
├── index.html              PWA shell + overlays
├── manifest.json           PWA manifest
├── sw.js                   Service worker
├── style.css               Design system (dark cyberpunk + Apple)
├── icons/                  Generated PNG icons
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
├── js/
│   ├── i18n.js             3-language translations + t() helper
│   ├── data.js             Constants, state model, localStorage, demo seed
│   ├── audio.js            Web Audio synth SFX + ambient sounds
│   ├── confetti.js         Canvas particle system
│   ├── charts.js           Chart.js wrappers (radar/line/pie)
│   ├── gamification.js     XP, levels, ranks, pet, combos, achievements, titles
│   ├── ui.js               13 page renderers + overlays + onboarding + tour
│   ├── core.js             Router, navigation, theme, modals, topbar, toasts
│   └── app.js              Bootstrap + event wiring + service worker registration
├── tools/
│   └── make_icons.py       Dependency-free PNG icon generator
└── README.md
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`9` | Jump between pages |
| `L` | Open Quick Log |
| `Esc` | Close modal / sheet / focus overlay |

## Local development

```bash
# Serve with any static server, e.g.:
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push to `main`
2. Enable GitHub Pages in repository settings → Source: `main`, folder: `/`
3. Site will be live at https://{owner}.github.io/leveling

## License

MIT
