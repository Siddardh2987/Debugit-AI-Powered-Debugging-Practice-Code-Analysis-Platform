# 🐛 DebugIt

> A full-stack debugging practice platform. Fix real broken project files in a Monaco editor, submit your fix, and get AI-powered scoring with per-file feedback.

---

## 🧠 What Is DebugIt?

DebugIt gives you **real broken project files** — not toy algorithms, not DSA puzzles. You open them in a VS Code–style editor, find the bugs, fix them, and Gemini AI checks whether your fix is correct.

> *"Not LeetCode. Not DSA. Real project debugging — like your actual job."*

---

## ✅ What Is Fully Implemented

### 🖥️ Frontend — React + Vite + Tailwind CSS 4

**Pages:**

| Page | Route Key | Description |
|------|-----------|-------------|
| Landing | `landing` | Hero section, animated code preview, How It Works, category cards, features grid, testimonial, CTA, footer |
| Login / Signup | `login` | Email + password form, Google OAuth button, Framer Motion entrance animation, demo mode hint |
| Projects | `projects` | Grid of project cards with stagger animation, filter by category + difficulty + search, project mode modal |
| Debug | `debug` | Monaco editor, file tabs, AI hint chatbot, terminal panel, submit fix, AI result modal |
| Stats | `stats` | Recharts bar + radar charts, accuracy ring, streak tracker, weak areas, recent activity |

---

### 🗂️ File Structure

```
debugit-platform-concept/
├── public/
│   └── hero-bg.jpg                  # Landing page hero background
├── src/
│   ├── main.jsx                     # App entry — GoogleOAuthProvider wrapper
│   ├── App.jsx                      # Router — page switching by state
│   ├── index.css                    # Global styles, animations, scrollbar, glow effects
│   ├── components/
│   │   └── Navbar.jsx               # Fixed top nav, logo, streak badge, logout
│   ├── context/
│   │   └── AppContext.jsx           # Global state: auth, navigation, apiRequest with fallback
│   ├── data/
│   │   └── mockProjects.js          # 6 offline mock projects (frontend/backend/fullstack)
│   ├── pages/
│   │   ├── Landing.jsx              # Marketing landing page
│   │   ├── Login.jsx                # Auth page (email + Google OAuth)
│   │   ├── Projects.jsx             # Project browser with filters
│   │   ├── Debug.jsx                # Main debugging workspace
│   │   └── Stats.jsx                # User stats and progress dashboard
│   └── utils/
│       └── scoring.js               # Local deterministic scoring fallback
└── backend/
    ├── src/
    │   ├── index.js                 # Express server, CORS, routes, DB connect
    │   ├── config/
    │   │   └── db.js                # Mongoose connect + auto-seed trigger
    │   ├── controllers/
    │   │   ├── authController.js    # Login, signup, Google OAuth, /me
    │   │   └── aiController.js      # Hint chatbot + evaluate submission
    │   ├── data/
    │   │   └── projects.js          # 6 real seeded projects with buggy/correct code
    │   ├── middleware/
    │   │   └── authMiddleware.js    # JWT Bearer token verification
    │   ├── models/
    │   │   ├── User.js              # Mongoose User schema
    │   │   └── Project.js           # Mongoose Project schema
    │   ├── routes/
    │   │   ├── authRoutes.js        # POST /login, /signup, /google, GET /me
    │   │   ├── aiRoutes.js          # POST /hint, /evaluate
    │   │   ├── projectRoutes.js     # GET /projects, /projects/:id
    │   │   └── userRoutes.js        # GET /users/stats
    │   └── services/
    │       └── evaluator.js         # Multi-stage AI evaluation pipeline
    ├── .env                         # Backend secrets (MONGO_URI, JWT_SECRET, GEMINI_API_KEY)
    └── .env.example                 # Template for environment variables
```

---

### ⚙️ Backend — Node.js + Express + MongoDB

| Feature | Details |
|---------|---------|
| **Auth** | JWT HttpOnly cookie + Bearer token, bcrypt password hashing, Google OAuth via `google-auth-library` |
| **Projects API** | `GET /api/projects` — list all; `GET /api/projects/:id` — single project with files |
| **AI Hint API** | `POST /api/ai/hint` — Gemini-powered chatbot that guides without spoiling |
| **AI Evaluate API** | `POST /api/ai/evaluate` — multi-stage scoring pipeline |
| **Auto-seeding** | 6 projects auto-seeded to MongoDB on first startup |
| **Health check** | `GET /health` — confirms server and DB status |

#### 🧠 Evaluation Pipeline (`evaluator.js`)
1. **Deterministic pass** — exact/near-exact match against known correct code (fast, no API call)
2. **Gemini chunking pass** — files sent in chunks to respect 15 RPM rate limit (1.5s delay between chunks)
3. **Integration pass** — full multi-file context review by Gemini for cross-file bug detection
4. **Fallback** — if Gemini is unavailable, deterministic scoring is returned

---

### 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` |
| Surface | `#0d0d1a` |
| Primary | `#7c3aed` (purple-600) |
| Accent | `#a78bfa` / `#60a5fa` gradient |
| Success | `#10b981` (emerald-500) |
| Danger | `#ef4444` (red-500) |
| Font | Inter (body), JetBrains Mono (code) |

**CSS Effects (in `index.css`):**
- `.glow-purple` / `.glow-green` / `.glow-red` — box-shadow glow
- `.gradient-border` — animated rotating gradient border
- `.fade-in` — slide-up fade entrance
- `.pulse-dot` — pulsing live indicator
- `.cursor-blink` — blinking terminal cursor
- `.slide-in` — slide in from left

---

### 🎬 Animations — Framer Motion

| Page | Animation |
|------|-----------|
| Login | Card slides up from `y=30` + fades in on mount |
| Projects | Grid staggers each card at 70ms intervals |
| ProjectCard | Slides from `y=20`, `whileHover scale(1.015)`, `whileTap scale(0.98)` |
| Stats | Full page slides up from `y=20` on mount |

---

### 🖥️ Monaco Editor Features

| Feature | Status |
|---------|--------|
| VS Code dark theme (`vs-dark`) | ✅ |
| Multi-file tab switching | ✅ |
| `key={activeFile}` — clean remount on tab switch | ✅ |
| JSX/TSX support via `beforeMount` | ✅ — no false red squiggles |
| Syntax highlighting (JS, JSX, TS, CSS, JSON) | ✅ |
| JetBrains Mono font + ligatures | ✅ |
| Word wrap, smooth scroll, cursor blink | ✅ |
| Fullscreen mode toggle | ✅ |
| Reset file to original buggy code | ✅ |

---

### 🖥️ Terminal Panel

| Feature | Status |
|---------|--------|
| Shows project load status | ✅ |
| Updates on file reset | ✅ |
| Updates on submit + AI result | ✅ |
| Auto-scrolls to latest line | ✅ |
| macOS-style traffic light header | ✅ |
| `clear` button | ✅ |
| Blinking cursor `$ █` | ✅ |
| Color-coded output (red/green/purple/blue/amber) | ✅ |

---

### 🤖 AI Hint Chatbot

| Feature | Status |
|---------|--------|
| Guided hints without spoiling the answer | ✅ |
| Uses current file content as context | ✅ |
| Full chat history sent to Gemini | ✅ |
| "Get Hint" quick button | ✅ |
| "New Chat" reset button | ✅ |
| Offline fallback (pre-written hints per file) | ✅ |
| Auto-scroll to latest message | ✅ |

---

### 🔐 Authentication Flow

```
User submits email + password
       ↓
POST /api/auth/login  →  bcrypt.compare  →  JWT signed  →  HttpOnly cookie + JSON token
       ↓
AppContext stores { name, email, avatar, streak }
       ↓
Navbar shows avatar + streak badge
```

**Demo Mode (no backend):**
- Any email + password (6+ chars) logs in
- Google button uses mock token
- All API calls fall back to mock data + local scoring

---

### 📦 Projects — 6 Seeded Challenges

| # | Title | Category | Difficulty |
|---|-------|----------|------------|
| 1 | Auth Bug: Login Never Works | Backend | Medium |
| 2 | React Todo App: State Mutations | Frontend | Easy |
| 3 | Express Route Ordering Bug | Backend | Hard |
| 4 | React Dashboard: Infinite Loop | Frontend | Medium |
| 5 | Full Stack Auth: JWT + Google | Full Stack | Hard |
| 6 | MongoDB + React: Data Not Saving | Full Stack | Medium |

---

### 📊 Stats Page

- **Summary cards** — Total solved, accuracy %, current streak, best streak
- **Bar chart** — Submissions per day (last 7 days) via Recharts
- **Radar chart** — Skill breakdown: React, Node, CSS, Express, MongoDB, Auth
- **Accuracy ring** — SVG circular progress indicator
- **Weak areas** — Highlighted categories needing improvement
- **Recent activity** — Last 5 project attempts with scores

---

## 🚀 Running the Project

### Frontend

```bash
cd debugit-platform-concept
npm install
npm run dev
# → http://localhost:5173
```

### Backend (optional — for real AI + MongoDB)

```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY, GOOGLE_CLIENT_ID
npm run dev
# → http://localhost:5000
```

### Environment Variables

**Frontend** (`.env` in project root):
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

**Backend** (`backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/debugit
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
```

> ⚡ **No `.env` needed for demo mode** — the app works fully offline with mock data and local scoring.

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion 11 |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Charts | Recharts |
| Icons | Lucide React |
| Auth (frontend) | `@react-oauth/google` |
| Backend | Node.js + Express 4 |
| Database | MongoDB + Mongoose |
| AI | Google Gemini (`@google/genai`) |
| Auth (backend) | JWT + bcryptjs + google-auth-library |

---

## 📝 Notes

- The platform runs in **demo mode** if no backend `.env` is set — all features work with mock data
- Gemini evaluation respects the **15 RPM rate limit** via 1.5s delays between file chunks  
- Monaco editor uses `key={activeFile}` to force clean remount on tab switch — prevents stale editor state
- All pages use **Framer Motion** entrance animations consistent with the dark-theme aesthetic
