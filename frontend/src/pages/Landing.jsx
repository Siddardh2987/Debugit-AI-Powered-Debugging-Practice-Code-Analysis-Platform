import { ArrowRight, Bug, Zap, Brain, Code2, GitBranch, Shield, Star, CheckCircle, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Landing() {
  const { navigate } = useApp();

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background hero image */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'url(/hero-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-40 left-10 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(ellipse, #2563eb 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-sm text-purple-300 font-medium">Not LeetCode. Not DSA. Real debugging.</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            Debug Real
            <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #60a5fa)' }}>
              Broken Projects
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Fix frontend bugs, backend bugs, or both. AI checks your fix and gives feedback.
            Train for your actual job — not whiteboard interviews.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('projects')}  // 🧪 TEMP: skip login
              className="group flex items-center gap-2 px-8 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-base transition-all duration-200 glow-purple"
            >
              Start Debugging Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('projects')}
              className="flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold text-base transition-all"
            >
              Browse Projects
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            {[
              { label: 'Projects Available', value: '50+' },
              { label: 'Developers Joined', value: '2.4k' },
              { label: 'Bugs Fixed', value: '18k' },
              { label: 'AI Accuracy', value: '97%' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Code preview */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0d0d1a] text-left">
              {/* Editor top bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-black/40 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                </div>
                <div className="flex ml-3 gap-0">
                  {['authController.js', 'Login.jsx', 'authMiddleware.js'].map((f, i) => (
                    <div key={f} className={`px-3 py-1 text-xs border-r border-white/5 ${i === 0 ? 'text-white bg-[#1e1e2e] border-t-2 border-t-purple-500' : 'text-slate-600'}`}>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              {/* Code */}
              <pre className="p-5 text-xs leading-6 overflow-x-auto mono" style={{ color: '#cdd6f4' }}>
                <code>{`const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  `}<span style={{color:'#f38ba8'}}>// 🐛 BUG: Arguments are reversed!</span>{`
  `}<span style={{color:'#f38ba8'}}>const isMatch = await bcrypt.compare(user.password, password);</span>{`

  `}<span style={{color:'#a6e3a1'}}>// ✅ FIX: correct order is (plaintext, hash)</span>{`
  `}<span style={{color:'#a6e3a1'}}>// const isMatch = await bcrypt.compare(password, user.password);</span>{`
  
  if (!isMatch) return res.status(401).json({ message: 'Invalid' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
};`}</code>
              </pre>
              {/* Terminal */}
              <div className="px-5 py-3 bg-black/30 border-t border-white/5 text-xs mono text-slate-600">
                <span className="text-red-400">Error:</span> Users cannot login — invalid credentials returned always
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Three steps from picking a project to getting AI feedback on your fix.</p>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: <FolderOpen />,
                title: 'Pick a Broken Project',
                desc: 'Browse real broken projects filtered by Frontend, Backend, or Full-Stack. Choose your difficulty.',
                color: 'from-purple-500/20 to-purple-600/10',
                border: 'border-purple-500/20',
              },
              {
                step: '02',
                icon: <Code2 />,
                title: 'Fix Bugs in VS Code Editor',
                desc: 'Open files in Monaco Editor — exactly like VS Code. Switch tabs, read errors, find and fix the bugs.',
                color: 'from-blue-500/20 to-blue-600/10',
                border: 'border-blue-500/20',
              },
              {
                step: '03',
                icon: <Brain />,
                title: 'AI Reviews Your Fix',
                desc: 'Submit all files at once. Gemini AI checks your fix against the original, gives score and detailed feedback.',
                color: 'from-emerald-500/20 to-emerald-600/10',
                border: 'border-emerald-500/20',
              },
            ].map((item, i) => (
              <div key={i} className={`relative p-6 rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} fade-in`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute top-4 right-4 text-5xl font-black text-white/5">{item.step}</div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div> */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {[
    {
      step: '01',
      icon: <FolderOpen />,
      title: 'Pick a Broken Project',
      desc: 'Browse real broken projects filtered by Frontend, Backend, or Full-Stack. Choose your difficulty.',
      color: 'from-purple-500/20 to-purple-600/10',
      border: 'border-purple-500/20',
      numberHover: 'group-hover:text-purple-400/30',
    },
    {
      step: '02',
      icon: <Code2 />,
      title: 'Fix Bugs in VS Code Editor',
      desc: 'Open files in Monaco Editor — exactly like VS Code. Switch tabs, read errors, find and fix the bugs.',
      color: 'from-blue-500/20 to-blue-600/10',
      border: 'border-blue-500/20',
      numberHover: 'group-hover:text-blue-400/30',
    },
    {
      step: '03',
      icon: <Brain />,
      title: 'AI Reviews Your Fix',
      desc: 'Submit all files at once. Gemini AI checks your fix against the original, gives score and detailed feedback.',
      color: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/20',
      numberHover: 'group-hover:text-emerald-400/30',
    },
  ].map((item, i) => (
    <div
      key={i}
      className={`group relative p-6 rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} fade-in overflow-hidden`}
      style={{ animationDelay: `${i * 100}ms` }}
    >
      <div
        className={`
          absolute top-4 right-4
          text-5xl font-black
          text-white/5
          transition-all duration-500 ease-out
          group-hover:scale-150
          group-hover:-translate-y-1
          group-hover:rotate-6
          ${item.numberHover}
        `}
      >
        {item.step}
      </div>

      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4 transition-transform duration-300 group-hover:scale-110">
        {item.icon}
      </div>

      <h3 className="text-lg font-bold text-white mb-2 transition-colors duration-300 group-hover:text-white">
        {item.title}
      </h3>

      <p className="text-slate-400 text-sm leading-relaxed transition-colors duration-300 group-hover:text-slate-300">
        {item.desc}
      </p>
    </div>
  ))}
</div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Debug What You Want</h2>
            <p className="text-slate-400 max-w-lg mx-auto">Filter projects by what you need to practice.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CategoryCard
              icon="🎨"
              title="Frontend Issues"
              subtitle="React · JS · CSS"
              items={['useState mutation bugs', 'useEffect infinite loops', 'Component re-render issues', 'CSS layout problems', 'Event handler bugs']}
              color="from-pink-500/10 to-rose-600/5"
              border="border-pink-500/20"
              tag="frontend"
              onClick={(tag) => navigate('projects', { category: tag })}
            />
            <CategoryCard
              icon="⚙️"
              title="Backend Issues"
              subtitle="Node · Express · MongoDB"
              items={['Route ordering errors', 'Async/await mistakes', 'MongoDB query bugs', 'Middleware placement', 'JWT/Auth issues']}
              color="from-amber-500/10 to-orange-600/5"
              border="border-amber-500/20"
              tag="backend"
              onClick={(tag) => navigate('projects', { category: tag })}
            />
            <CategoryCard
              icon="🔥"
              title="Full Stack Both"
              subtitle="Frontend + Backend"
              items={['API contract mismatches', 'Auth flow broken', 'Race conditions', 'CORS + token issues', 'Data flow bugs']}
              color="from-purple-500/10 to-violet-600/5"
              border="border-purple-500/20"
              tag="both"
              onClick={(tag) => navigate('projects', { category: tag })}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Real Developers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Code2 className="w-5 h-5" />, title: 'Monaco Editor', desc: 'Full VS Code experience — syntax highlighting, multi-file tabs, real error display.' },
              { icon: <Brain className="w-5 h-5" />, title: 'Gemini AI Judge', desc: 'AI checks all your files together in one request. Score + per-file feedback.' },
              { icon: <Bug className="w-5 h-5" />, title: 'AI Hint Chatbot', desc: 'Stuck? Ask the AI for hints. It guides you without spoiling the answer.' },
              { icon: <GitBranch className="w-5 h-5" />, title: 'Multi-file Projects', desc: 'Debug across 3-5 files just like a real codebase. Frontend + backend together.' },
              { icon: <Shield className="w-5 h-5" />, title: 'JWT Auth', desc: 'Google OAuth or email/password. Cross-origin safe JWT Bearer Token auth.' },
              { icon: <Zap className="w-5 h-5" />, title: 'Stats & Streaks', desc: 'Track accuracy, weak areas, and daily debugging streaks.' },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-xl bg-white/[0.03] border border-white/8 hover:border-purple-500/30 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:bg-purple-500/30 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Quote */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-8 rounded-2xl border border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="text-xl text-white font-medium leading-relaxed mb-6">
              {/* "Unlike LeetCode which focuses on DSA, DebugIt focuses on debugging real broken projects
              — exactly what developers do on the job every single day."
               */}
               "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it."
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold">
                {/* R */}
                BK
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm">Brian Kernighan</div>
                <div className="text-slate-500 text-xs">
                  {/* Senior Frontend Dev at Stripe */}
                  Computer Scientist, Co-creator of C and Unix
                  </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Debug?</h2>
          <p className="text-slate-400 mb-8">Join 2,400+ developers practicing real project debugging.</p>
          <button
            onClick={() => navigate('projects')}  // 🧪 TEMP: skip login
            className="group inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-base transition-all glow-purple"
          >
            Start for Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500" /> Free tier available</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500" /> 50+ projects</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold">DebugIt</span>
            <span className="text-slate-600 text-sm ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <span>Built with ❤️ for real developers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FolderOpen({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function CategoryCard({ icon, title, subtitle, items, color, border, tag, onClick }) {
  return (
    <div
      onClick={() => onClick(tag)}
      className={`p-6 rounded-2xl bg-gradient-to-br ${color} border ${border} cursor-pointer hover:scale-[1.02] transition-transform`}
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-5">{subtitle}</p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
