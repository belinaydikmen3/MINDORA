# MINDORA

MINDORA is a modern, local-first cognitive training web application designed to exercise memory, attention, processing speed, problem-solving, and spatial reasoning. Built with an editorial design aesthetic, responsive interaction paradigms, and adaptive difficulty algorithms, MINDORA delivers a complete brain training playground running entirely in the browser with zero external backend dependencies.

---

## ✨ Features

- **15 Original Cognitive Games**: A diverse library of exercises spanning 5 key cognitive categories, featuring distinct gameplay mechanics rather than visual reskins.
- **Adaptive Difficulty Engine**: A rule-based difficulty system (Levels 1–5) that continuously tracks rolling performance, accuracy trends, and streaks to adjust parameters dynamically.
- **Personalized Daily Routine (Daily Routine 2.0)**: Automatically generates targeted 5- to 20-minute daily training circuits focused on user weaknesses, favorite exercises, and category preferences.
- **Weighted Scoring Engine**: Calculates normalized session scores (0–9999) taking into account accuracy bonuses, reaction time ratios, logarithmic streaks, and category-weighted difficulty multipliers.
- **Progress Tracking & Analytics**: Interactive SVG performance curves, category breakdown ratings, reaction-time trends, and training session history across 7-day, 30-day, and 90-day intervals.
- **Achievement & Milestone System**: Automated detection of training milestones, streak achievements, category mastery, and speed benchmarks with unobtrusive notification toasts.
- **Customizable User Profile & Settings**: Adjust daily training duration targets, toggle or exclude specific cognitive categories, configure audio volume, select favorite games, and set reduced motion or animation intensity.
- **Zero-Latency Web Audio Engine**: Custom sound synthesis using the native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`) for clear acoustic feedback without external audio files.
- **100% Local-First Architecture**: All session records, user stats, and preferences persist directly in `localStorage` with error-resilient schema parsing and one-click data purge controls.

---

## 🧠 Core Experience

### Cognitive Exercise Catalog

MINDORA organizes its 15 cognitive exercises into five fundamental cognitive domains:

| Exercise | Category | Focus & Primary Mechanic |
| :--- | :--- | :--- |
| **Neural Shift** *(Signature)* | Memory | Dynamic neural network pathway reproduction with shifting cognitive rules (Repeat, Reverse, Skip, Shift) rendered on HTML5 Canvas. |
| **Memory Matrix** | Memory | Spatial grid matrix recall challenging visual working memory across expanding board dimensions. |
| **Echo Recall** | Memory | Harmonic sequence pad memory requiring reproduction of resonant tonal chimes in forward or reverse order. |
| **Signal Switch** | Attention | Executive flexibility task inspired by Wisconsin/Stroop paradigms; rapidly switch sorting criteria between Color, Shape, and Count. |
| **Silent Sequence** | Attention | Sustained visual attention and change blindness challenge; detect subtle symbol mutations behind rapid shutter occlusions. |
| **Rapid Match** | Speed | High-tempo visual comparison requiring immediate binary decisions (Match / Different) under strict per-round time limits. |
| **Time Navigator** | Speed | Perceptual speed and classification reflex training; evaluate rapid stimuli using dual-key inputs (Yes / No). |
| **Logic Chains** | Problem Solving | Inductive reasoning puzzles; identify underlying transformation rules across geometric sequences and select the completing element. |
| **Pattern Forge** | Problem Solving | Symbolic logic and procedural glyph transformations; deduce multi-attribute permutations to complete matrices. |
| **Number Cascade** | Problem Solving | Rapid numerical reasoning; extrapolate arithmetic, geometric, alternating, and Fibonacci progressions. |
| **Word Circuit** | Problem Solving | Semantic relational analogies; complete relational bridges across functional, structural, and conceptual dimensions. |
| **Balance Lab** | Problem Solving | Transitive inference; analyze comparative dual-pan balance scales to deduce relative mass hierarchies. |
| **Orbit Tracker** | Spatial | Multi-object tracking; follow target objects moving dynamically along orbital trajectories after they disguise among distractors. |
| **Route Weaver** | Spatial | Spatial navigation memory; memorize high-density vector pathways through nodal mazes and trace the exact route. |
| **Memory Mosaic** | Spatial | Chromatic layout reconstruction; memorize multi-hue palette arrangements and repaint tiles back from memory. |

### Adaptive Difficulty

The adaptive engine (`src/engine/adaptiveEngine.ts`) evaluates user metrics over a sliding window of recent sessions:
- **Promotion (+1 Difficulty)**: Triggered when average accuracy reaches $\ge 85\%$ alongside non-negative score trends, or upon 3 consecutive high-accuracy rounds.
- **Demotion (-1 Difficulty)**: Triggered when average accuracy drops below $55\%$, or upon 2 consecutive failed rounds.
- **Parameters Adjusted**: Time limits, stimulus display windows, distraction density, pattern length, and grid dimensions scale smoothly from Level 1 to Level 5.

### Scoring Model

Sessions are scored (`src/engine/scoring.ts`) through a multi-factor formula:
$$\text{Score} = \text{Base} \times (0.5 + \text{Acc} \cdot w_{\text{acc}}) \times (0.5 + \text{SpeedRatio} \cdot 0.5 \cdot w_{\text{spd}}) \times (1 + \log_2(\text{Streak}) \cdot 0.1 \cdot w_{\text{str}}) \times (0.5 + \text{Diff} \cdot 0.4 \cdot w_{\text{diff}})$$

Category-specific weighting emphasizes speed for Speed exercises, accuracy for Problem Solving, and retention for Memory.

---

## 🛠️ Tech Stack

- **UI Framework**: [React 19](https://react.dev/) (`19.2.x`)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (`~6.0.2`)
- **Build Tool & Dev Server**: [Vite 8](https://vite.dev/) (`^8.3.0`) with `@vitejs/plugin-react`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`^4.3.3`) with `@tailwindcss/vite`
- **Routing**: [React Router 7](https://reactrouter.com/) (`^7.18.4`)
- **Linter**: [Oxlint](https://oxc.rs/) (`^1.81.0`)
- **Testing**: [tsx](https://github.com/privatenumber/tsx) (`^4.23.15`) with Node.js built-in `node:assert`
- **Audio**: Web Audio API (`AudioContext`, synthetic waveform oscillators)
- **Graphics**: HTML5 Canvas 2D API (Neural Shift interactive graph) & Scalable Vector Graphics (SVG)

---

## 📂 Project Structure

```text
lumosity/
├── public/                 # Static public assets (favicon.svg, icons.svg)
├── src/
│   ├── assets/             # Bundled illustrations and vector graphics
│   ├── components/         # Global shared UI components (Layout, Navigation, ScoreRing, StatCard, etc.)
│   ├── data/               # Static configurations and registries
│   │   ├── achievements.ts # Achievement unlock rules and metadata
│   │   ├── demoData.ts     # Realistic mock dataset generator for dev/preview
│   │   └── games.ts        # Central 15-game catalog registry and category lookups
│   ├── engine/             # Core computational logic
│   │   ├── adaptiveEngine.ts # Rule-based difficulty scaling and state tracking
│   │   └── scoring.ts      # Multi-variable scoring formulas and percentile calculation
│   ├── games/              # Implementations for all 15 cognitive exercises
│   │   ├── components/     # Shared game lifecycle UI (GameIntro, HUD, Pause, Results)
│   │   ├── NeuralShift/    # Canvas-based signature neural pathway game
│   │   └── ...             # Individual game modules (MemoryMatrix, SignalSwitch, etc.)
│   ├── hooks/              # Reusable React hooks
│   │   └── useGameSession.ts # Standardized game lifecycle state machine
│   ├── pages/              # Primary route views
│   │   ├── Dashboard.tsx   # Daily overview, streak tracker, cognitive scores
│   │   ├── DailyTraining.tsx # Sequential daily circuit execution
│   │   ├── GamesPage.tsx   # Filterable 15-game library
│   │   ├── GameScreen.tsx  # Dynamic lazy-loaded game shell & error boundary
│   │   ├── Onboarding.tsx  # Initial profile creation & baseline preferences
│   │   ├── Profile.tsx     # Settings, audio controls, category filters, reset data
│   │   └── Progress.tsx    # Longitudinal analytics, accuracy charts, history
│   ├── services/           # Application service layers
│   │   ├── achievementChecker.ts # Event-driven achievement evaluator
│   │   ├── audio.ts        # Web Audio API procedural sound synthesizer
│   │   ├── dailyRoutine.ts # Circuit generator and routine modifier
│   │   └── storage.ts      # Type-safe localStorage persistence wrapper
│   ├── types/              # Comprehensive TypeScript interfaces and domain types
│   ├── App.tsx             # Root route declarations and onboarding guards
│   ├── index.css           # Global CSS variables, custom typography, and Tailwind tokens
│   └── main.tsx            # Application entry point with BrowserRouter
├── tests/
│   └── functional_validation.test.ts # End-to-end headless integration and logic test suite
├── package.json            # Scripts and project dependencies
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build and plugin setup
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher recommended
- **npm**: `v9.x` or higher

### Installation

Clone the repository and install project dependencies:

```bash
git clone <repository-url>
cd lumosity
npm install
```

### Development Server

Start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### Production Build & Preview

Verify types and compile the optimized production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

### Running Tests & Linting

Run the automated functional validation test suite:

```bash
npm test
```

Run Oxlint to check code quality:

```bash
npm run lint
```

---

## 🎮 How It Works

1. **Onboarding**: On initial launch, users are guided through a lightweight setup to set their name, daily target duration (5, 10, 15, or 20 minutes), and primary cognitive focus.
2. **Dashboard**: Serves as the central hub showing current training streaks, category scores, quick access to the daily circuit, and the signature game *Neural Shift*.
3. **Daily Circuit Training**: Users can launch an automatically balanced sequence of exercises tailored to their weakest categories and favorite exercises, or customize the games before starting.
4. **Game Session Lifecycle**:
   - `Intro`: Outlines objectives, instructions, estimated duration, and current adaptive level.
   - `Countdown`: 3-2-1 visual and acoustic countdown.
   - `Playing`: Interactive gameplay with keyboard shortcuts (1–4, Arrow keys) or direct clicks, HUD timers, score counters, and streak bonuses.
   - `Pause`: Allows pausing without losing round progress.
   - `Results`: Detailed summary displaying total score, accuracy percentage, average reaction time, personal best comparisons, and difficulty adjustments.
5. **Longitudinal Progress**: Every completed session feeds into the progress analytics engine to update historical category trends, streaks, and achievement status.

---

## 🔐 Privacy / Data

- **Local-First Architecture**: MINDORA stores 100% of its data in the browser's `localStorage`.
- **No Remote Tracking**: No external analytics, trackers, telemetry, third-party cookies, or remote server pings are included in the codebase.
- **Offline Operation**: Can run entirely offline once loaded in the browser.
- **Full Data Control**: Users can clear session history, toggle demo datasets, or execute a complete factory reset directly from the **Profile** screen (`clearAllData()`).

---

## 🗺️ Planned Improvements

The current architecture is structured to support future enhancements:
- **Export & Import Data**: Ability to export user session history as JSON and restore it across devices.
- **IndexedDB Storage Layer**: Optional migration from `localStorage` to IndexedDB for users with thousands of historical sessions.
- **Progressive Web App (PWA)**: Web app manifest and service worker integration for installable offline desktop and mobile experiences.
- **Custom Soundscapes**: Additional Web Audio synth presets (ambient focus drones, mechanical clicks).

---

## 📜 License

This project is configured as a private repository (`"private": true` in `package.json`). All rights reserved.
