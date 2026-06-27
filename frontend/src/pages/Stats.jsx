import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';
import { Zap, Trophy, Target, TrendingUp, AlertTriangle, Calendar, ChevronRight, Code2, Bug, MessageSquare, Lightbulb, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';

const categoryConfig = {
  frontend: { label: '🎨 Frontend', color: '#ec4899', bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
  backend: { label: '⚙️ Backend', color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  both: { label: '🔥 Full Stack', color: '#a78bfa', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
};

export default function Stats() {
  const { user, navigate, refreshStats, apiRequest, isLoggedIn, loading, getAvatarGradient } = useApp();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const formatActivityDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
    if (!hasTime) {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) { navigate('login'); return; }
    refreshStats();
  }, [isLoggedIn, loading]);

  if (loading || !user) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-slate-500">Loading stats...</div>
    </div>
  );

  const totalSolved = (user.problems_solved?.frontend || 0) +
    (user.problems_solved?.backend || 0) +
    (user.problems_solved?.both || 0);

  const pieData = [
    { name: 'Frontend', value: user.problems_solved?.frontend || 0, color: '#ec4899' },
    { name: 'Backend', value: user.problems_solved?.backend || 0, color: '#f59e0b' },
    { name: 'Full Stack', value: user.problems_solved?.both || 0, color: '#a78bfa' },
  ];

  // Use real skill values from the Stats model
  const radarData = [
    { subject: 'React', A: (user.frontendSkill || 0) },
    { subject: 'Node.js', A: (user.backendSkill || 0) },
    { subject: 'MongoDB', A: (Math.round((user.backendSkill || 0) * 0.9)) },
    { subject: 'Auth', A: ((user.fullstackSkill || 0))},
    { subject: 'Async', A: (Math.round((user.backendSkill || 0) * 0.85)) },
    { subject: 'CSS', A: ((user.frontendSkill || 0)*0.8) },
  ];
  
  const weakAreas = user.weak_areas || [];
  const recentActivity = user.recent_activity || [];

  // Get all available years from monthly_progress data
  const availableYears = useMemo(() => {
    const allData = user.monthly_progress || [];
    const years = new Set(allData.map(m => {
      const parts = m.month?.split(' ');
      return parts?.[1] ? parseInt(parts[1]) : new Date().getFullYear();
    }));
    years.add(new Date().getFullYear()); // always include current year
    return [...years].sort((a, b) => b - a); // descending
  }, [user.monthly_progress]);

  // Ensure monthly_progress always has data for the chart — filtered by selected year
  const monthlyProgress = useMemo(() => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const stored = user.monthly_progress || [];
    // Build a 12-month window for the selected year
    return monthNames.map((m, i) => {
      const label = `${m} ${selectedYear}`;
      const entry = stored.find(e => e.month === label);
      return { month: m, fullLabel: label, solved: entry ? entry.solved : 0 };
    });
  }, [user.monthly_progress, selectedYear]);

  // Show only months that have data OR months up to current month (for current year)
  const chartData = useMemo(() => {
    const now = new Date();
    const isCurrentYear = selectedYear === now.getFullYear();
    if (isCurrentYear) {
      return monthlyProgress.slice(0, now.getMonth() + 1);
    }
    return monthlyProgress;
  }, [monthlyProgress, selectedYear]);

  return (
    <motion.div
      className="min-h-screen pt-20 pb-12 px-4"
      style={{ background: '#0a0a0f' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Your Stats</h1>
            <p className="text-slate-500 text-sm">Track your debugging progress and weak areas</p>
          </div>
          <button
            onClick={() => navigate('projects')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Keep Debugging <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarGradient(user.id || user._id)} flex items-center justify-center text-white text-2xl font-black`}>
            {user.avatar}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
              <Badge icon={<Zap className="w-3.5 h-3.5" />} text={`${user.streak || 0} day streak`} color="text-amber-400 bg-amber-500/10 border-amber-500/20" />
              <Badge icon={<Trophy className="w-3.5 h-3.5" />} text={`${totalSolved} problems solved`} color="text-purple-400 bg-purple-500/10 border-purple-500/20" />
              <Badge icon={<Target className="w-3.5 h-3.5" />} text={`${Math.round(user.accuracy || 0)}% accuracy`} color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20" />
            </div>
          </div>
        </div>
 
        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Solved', value: totalSolved, icon: <Bug className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10', glow: '124, 58, 237' },
            { label: 'Accuracy', value: `${Math.round(user.accuracy || 0)}%`, icon: <Target className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: '16, 185, 129' },
            { label: 'Day Streak', value: user.streak || 0, icon: <Zap className="w-5 h-5" />, color: 'text-amber-400', bg: 'bg-amber-500/10', glow: '245, 158, 11' },
            { label: 'Best Streak', value: user.bestStreak || 0, icon: <Calendar className="w-5 h-5" />, color: 'text-blue-400', bg: 'bg-blue-500/10', glow: '59, 130, 246' },
            { label: 'Questions Asked', value: user.questionsAsked || 0, icon: <MessageSquare className="w-5 h-5" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', glow: '6, 182, 212' },
            { label: 'Hints Used', value: user.hintsUsed || 0, icon: <Lightbulb className="w-5 h-5" />, color: 'text-rose-400', bg: 'bg-rose-500/10', glow: '244, 63, 94' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl border border-white/8 bg-white/[0.03] stat-card-glow" style={{ '--glow-color': stat.glow }}>
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} mb-3`}>
                {stat.icon}
              </div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-slate-600 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Monthly Progress Bar Chart */}
          <div className="lg:col-span-2 p-5 rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-semibold text-sm">Monthly Progress</h3>
              </div>
              {/* Year Filter */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-medium focus:outline-none focus:border-purple-500 transition-colors cursor-pointer hover:bg-white/10"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr} style={{ background: '#0d0d1a' }}>{yr}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={24}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(val) => [val, 'Problems Solved']}
                  labelFormatter={(label) => `${label} ${selectedYear}`}
                />
                <Bar dataKey="solved" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Problems Solved" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie */}
          <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="flex items-center gap-2 mb-5">
              <Code2 className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold text-sm">By Category</h3>
            </div>
            <div className="flex justify-center mb-4">
              <PieChart width={140} height={140}>
                <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="space-y-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-400">{d.name}</span>
                  </div>
                  <span className="text-white font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills Radar + Weak Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Radar Chart */}
          <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold text-sm">Skill Radar</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                <Radar name="Skill" dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Weak Areas */}
          <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.03]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-semibold text-sm">Weak Areas to Improve</h3>
            </div>
            <div className="space-y-3">
              {weakAreas.length === 0 ? (
                <p className="text-slate-600 text-sm">No weak areas identified yet. Keep solving challenges!</p>
              ) : (
                weakAreas.map((area, i) => {
                  // Dynamically calculate mastery based on actual user skills and accuracy
                  const calculateMastery = (areaName) => {
                    const fSkill = user.frontendSkill || 0;
                    const bSkill = user.backendSkill || 0;
                    const fsSkill = user.fullstackSkill || 0;
                    const overall = user.accuracy || Math.round((fSkill + bSkill + fsSkill) / 3) || 0;

                    const name = areaName.toLowerCase();
                    let base = overall;
                    let multiplier = 0.85; // Weak areas are typically slightly below overall level

                    if (name.includes('react') || name.includes('frontend') || name.includes('css')) {
                      base = fSkill;
                      multiplier = 0.8;
                    } else if (name.includes('node') || name.includes('backend') || name.includes('api') || name.includes('database') || name.includes('mongodb')) {
                      base = bSkill;
                      multiplier = 0.8;
                    } else if (name.includes('full') || name.includes('both')) {
                      base = fsSkill;
                      multiplier = 0.8;
                    } else if (name.includes('bug') || name.includes('correctness') || name.includes('methodology')) {
                      base = overall;
                      multiplier = 0.75;
                    } else if (name.includes('analysis') || name.includes('detail') || name.includes('coverage')) {
                      base = overall;
                      multiplier = 0.85;
                    }

                    const mastery = Math.round(base * multiplier);
                    return Math.min(95, Math.max(10, mastery));
                  };

                  const pct = calculateMastery(area);
                  return (
                    <div key={area}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium">{area}</span>
                        <span className="text-slate-500">{pct}% mastery</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500"
                          style={{ width: `${pct}%`, transition: 'width 1s ease' }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium mb-1">💡 Recommendation</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {weakAreas.length > 0
                  ? <>Focus on <strong className="text-white">{weakAreas[0]}</strong> — you have the most room for improvement there. Try the medium difficulty projects in that category.</>
                  : <>Solve more challenges to get personalized improvement recommendations.</>}
              </p>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.03] mb-6">
          <h3 className="text-white font-semibold text-sm mb-4">Problems Solved by Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(user.problems_solved ?? { frontend: 0, backend: 0, both: 0 }).map(([cat, count]) => {
              const cfg = categoryConfig[cat];
              const pct = totalSolved > 0 ? Math.round((count / totalSolved) * 100) : 0;
              return (
                <div key={cat} className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-white font-black text-xl">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                  </div>
                  <p className="text-slate-600 text-xs mt-2">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-5 rounded-2xl border border-white/8 bg-white/[0.03]">
          <h3 className="text-white font-semibold text-sm mb-4">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-slate-500 text-sm">No activity yet. Start solving challenges!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((activity, i) => {
                const cfg = categoryConfig[activity.category] || categoryConfig.frontend;
                const isPassing = activity.score >= 70;
                return (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center text-sm shrink-0`}>
                      {activity.category === 'frontend' ? '🎨' : activity.category === 'backend' ? '⚙️' : '🔥'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{activity.project}</p>
                      <p className="text-slate-600 text-xs">{formatActivityDate(activity.date)}</p>
                    </div>
                    <div className={`text-sm font-bold ${isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
                      {activity.score}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}

function Badge({ icon, text, color }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${color}`}>
      {icon}
      {text}
    </div>
  );
}
