import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Shield, Zap, Trophy, Target,
  Bug, ChevronRight, Edit3, Check, X, Loader2, AlertCircle,
  Star, Code2, MessageSquare, Lightbulb, LogOut, Lock, Eye, EyeOff, AtSign, CheckCircle2
} from 'lucide-react';

// ─── Reusable status message ──────────────────────────────────────────────────
function StatusMsg({ error, success }) {
  if (error) return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      <AlertCircle className="w-4 h-4 shrink-0" />{error}
    </div>
  );
  if (success) return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
      <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
    </div>
  );
  return null;
}

export default function Profile() {
  const { user, navigate, refreshStats, isLoggedIn, loading, apiRequest, logout, getAvatarGradient } = useApp();

  // ── Display name edit ──────────────────────────────────────────────────────
  const [editingName, setEditingName]     = useState(false);
  const [newName, setNewName]             = useState('');
  const [nameSaving, setNameSaving]       = useState(false);
  const [nameError, setNameError]         = useState('');
  const [nameSuccess, setNameSuccess]     = useState('');

  // ── Username (one-time) edit ───────────────────────────────────────────────
  const [editingUsername, setEditingUsername]   = useState(false);
  const [newUsername, setNewUsername]           = useState('');
  const [usernameSaving, setUsernameSaving]     = useState(false);
  const [usernameError, setUsernameError]       = useState('');
  const [usernameSuccess, setUsernameSuccess]   = useState('');

  // ── Password change ────────────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPw, setCurrentPw]               = useState('');
  const [newPw, setNewPw]                       = useState('');
  const [confirmPw, setConfirmPw]               = useState('');
  const [showCurrentPw, setShowCurrentPw]       = useState(false);
  const [showNewPw, setShowNewPw]               = useState(false);
  const [showConfirmPw, setShowConfirmPw]       = useState(false);
  const [pwSaving, setPwSaving]                 = useState(false);
  const [pwError, setPwError]                   = useState('');
  const [pwSuccess, setPwSuccess]               = useState('');

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) { navigate('login'); return; }
    refreshStats();
  }, [isLoggedIn, loading]);

  useEffect(() => {
    if (user?.name) setNewName(user.name);
  }, [user?.name]);

  if (loading || !user) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-slate-500 text-sm">Loading profile...</p>
      </div>
    </div>
  );

  const totalSolved = (user.problems_solved?.frontend || 0) +
    (user.problems_solved?.backend || 0) +
    (user.problems_solved?.both || 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveName = async () => {
    if (!newName.trim()) { setNameError('Name cannot be empty'); return; }
    if (newName.trim().length < 2) { setNameError('Name must be at least 2 characters'); return; }
    if (newName.trim().length > 50) { setNameError('Name must be less than 50 characters'); return; }

    setNameSaving(true);
    setNameError('');
    setNameSuccess('');

    const { data, error } = await apiRequest('/api/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: newName.trim() })
    });

    setNameSaving(false);
    if (error) { setNameError(error); }
    else {
      setNameSuccess('Name updated!');
      setEditingName(false);
      setTimeout(() => setNameSuccess(''), 3000);
      await refreshStats();
    }
  };

  const handleSaveUsername = async () => {
    const u = newUsername.trim().toLowerCase();
    if (!u) { setUsernameError('Username cannot be empty'); return; }
    if (u.length < 3) { setUsernameError('Username must be at least 3 characters'); return; }
    if (u.length > 30) { setUsernameError('Username must be less than 30 characters'); return; }
    if (!/^[a-z0-9_.-]+$/.test(u)) {
      setUsernameError('Only lowercase letters, numbers, underscores, dots, hyphens allowed');
      return;
    }

    setUsernameSaving(true);
    setUsernameError('');
    setUsernameSuccess('');

    const { data, error } = await apiRequest('/api/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ username: u })
    });

    setUsernameSaving(false);
    if (error) { setUsernameError(error); }
    else {
      setUsernameSuccess('Username set! This cannot be changed again.');
      setEditingUsername(false);
      setTimeout(() => setUsernameSuccess(''), 4000);
      await refreshStats();
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if ((user.hasPassword && !currentPw) || !newPw || !confirmPw) { setPwError('All fields are required'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(newPw)) { setPwError('New password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(newPw)) { setPwError('New password must contain at least one number'); return; }
    if (user.hasPassword && newPw === currentPw) { setPwError('New password must be different from current password'); return; }

    setPwSaving(true);
    const { data, error } = await apiRequest('/api/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword: user.hasPassword ? currentPw : undefined, newPassword: newPw, confirmPassword: confirmPw })
    });
    setPwSaving(false);

    if (error) { setPwError(error); }
    else {
      setPwSuccess('Password changed successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowPasswordForm(false);
      setTimeout(() => setPwSuccess(''), 4000);
      await refreshStats();
    }
  };

  const authProviderLabel = {
    local: 'Email & Password',
    google: 'Google Account',
    local_google: 'Email & Google'
  }[user.authProvider || 'local'] || 'Email & Password';

  const isLocalAccount = !user.authProvider || user.authProvider === 'local' || user.authProvider === 'local_google';

  const quickStats = [
    { label: 'Total Solved', value: totalSolved, icon: <Bug className="w-4 h-4" />, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', glow: '124, 58, 237' },
    { label: 'Accuracy', value: `${Math.round(user.accuracy || 0)}%`, icon: <Target className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', glow: '16, 185, 129' },
    { label: 'Day Streak', value: user.streak || 0, icon: <Zap className="w-4 h-4" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', glow: '245, 158, 11' },
    { label: 'Best Streak', value: user.bestStreak || 0, icon: <Star className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', glow: '59, 130, 246' },
    { label: 'Questions Asked', value: user.questionsAsked || 0, icon: <MessageSquare className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', glow: '6, 182, 212' },
    { label: 'Hints Used', value: user.hintsUsed || 0, icon: <Lightbulb className="w-4 h-4" />, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', glow: '244, 63, 94' },
  ];

  const categoryBreakdown = [
    { label: '🎨 Frontend', value: user.problems_solved?.frontend || 0, color: '#ec4899' },
    { label: '⚙️ Backend', value: user.problems_solved?.backend || 0, color: '#f59e0b' },
    { label: '🔥 Full Stack', value: user.problems_solved?.both || 0, color: '#a78bfa' },
  ];

  return (
    <motion.div
      className="min-h-screen pt-20 pb-12 px-4"
      style={{ background: '#0a0a0f' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">My Profile</h1>
            <p className="text-slate-500 text-sm">Manage your account and view your progress</p>
          </div>
          <button
            onClick={() => navigate('stats')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Full Stats <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Avatar & name card */}
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${getAvatarGradient(user.id || user._id)} flex items-center justify-center text-white text-4xl font-black mx-auto shadow-lg shadow-purple-500/20`}>
                  {user.avatar}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0a0a0f] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>

              {/* Name (editable) */}
              {editingName ? (
                <div className="space-y-2 mb-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setNameError(''); }}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-purple-500/50 text-white text-center text-lg font-bold focus:outline-none focus:border-purple-400 transition-colors"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNewName(user.name); } }}
                  />
                  <div className="flex gap-2 justify-center">
                    <button onClick={handleSaveName} disabled={nameSaving}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-60">
                      {nameSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => { setEditingName(false); setNewName(user.name); setNameError(''); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium transition-colors">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                  {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
                </div>
              ) : (
                <div className="mb-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                    <button onClick={() => setEditingName(true)}
                      className="p-1 rounded-md text-slate-600 hover:text-purple-400 transition-colors" title="Edit display name">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {nameSuccess && <p className="text-emerald-400 text-xs mb-1 flex items-center justify-center gap-1"><Check className="w-3 h-3" />{nameSuccess}</p>}

              {/* Username (if set) */}
              {user.usernameSet && (
                <div className="mt-1 mb-3">
                  <p className="text-slate-400 text-sm font-mono">@{user.username}</p>
                </div>
              )}

              <p className="text-slate-500 text-sm">{user.email}</p>

              {/* Streak badge */}
              <div className="flex items-center justify-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit mx-auto">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-semibold text-sm">{user.streak || 0} day streak</span>
              </div>

              {/* Logout button */}
              <button onClick={logout}
                className="mt-5 flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 text-sm font-medium transition-all">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>

            {/* Account details */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
              <h3 className="text-white font-semibold text-sm">Account Details</h3>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500 text-xs mb-0.5">Email Address</p>
                  <p className="text-white text-sm font-medium truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Sign-in Method</p>
                  <p className="text-white text-sm font-medium">
                    {user.authProvider === 'google' ? '🔵' : '📧'} {authProviderLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Account Status</p>
                  <p className="text-sm font-medium text-emerald-400">✓ Verified</p>
                </div>
              </div>
            </div>

            {/* ── Password change card ────────────────────────────────────── */}
            {/* ── Password change card ────────────────────────────────────── */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <h3 className="text-white font-semibold text-sm">{user.hasPassword ? 'Password' : 'Set Password'}</h3>
                </div>
                {!showPasswordForm && (
                  <button
                    onClick={() => { setShowPasswordForm(true); setPwError(''); setPwSuccess(''); }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    {user.hasPassword ? 'Change →' : 'Set Password →'}
                  </button>
                )}
              </div>

              {pwSuccess && !showPasswordForm && (
                <p className="text-emerald-400 text-xs flex items-center gap-1 mb-2">
                  <CheckCircle2 className="w-3 h-3" />{pwSuccess}
                </p>
              )}

              <AnimatePresence>
                {showPasswordForm && (
                  <motion.form
                    onSubmit={handleChangePassword}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {/* Current password */}
                    {user.hasPassword && (
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPw ? 'text' : 'password'}
                            value={currentPw}
                            onChange={e => { setCurrentPw(e.target.value); setPwError(''); }}
                            placeholder="Your current password"
                            className="w-full px-3 py-2 pr-9 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                            {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* New password */}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">{user.hasPassword ? 'New Password' : 'Password'}</label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                          placeholder="Min 8 chars, 1 uppercase, 1 number"
                          className="w-full px-3 py-2 pr-9 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <button type="button" onClick={() => setShowNewPw(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                          {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {/* Password strength hints */}
                      {newPw.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {[
                            { ok: newPw.length >= 8, label: '8+ chars' },
                            { ok: /[A-Z]/.test(newPw), label: 'Uppercase' },
                            { ok: /[0-9]/.test(newPw), label: 'Number' },
                          ].map(r => (
                            <span key={r.label} className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${r.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-white/5 border border-white/10 text-slate-600'}`}>
                              {r.ok ? '✓' : '○'} {r.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confirm new password */}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">{user.hasPassword ? 'Confirm New Password' : 'Confirm Password'}</label>
                      <div className="relative">
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPw}
                          onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                          placeholder="Repeat new password"
                          className={`w-full px-3 py-2 pr-9 rounded-lg bg-white/5 border text-white text-sm placeholder-slate-600 focus:outline-none transition-colors ${
                            confirmPw && newPw && confirmPw !== newPw
                              ? 'border-red-500/50 focus:border-red-500'
                              : confirmPw && confirmPw === newPw
                              ? 'border-emerald-500/50 focus:border-emerald-500'
                              : 'border-white/10 focus:border-purple-500'
                          }`}
                        />
                        <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                          {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <StatusMsg error={pwError} success={null} />

                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={pwSaving}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-60">
                        {pwSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Check className="w-3.5 h-3.5" /> {user.hasPassword ? 'Change Password' : 'Set Password'}</>}
                      </button>
                      <button type="button" onClick={() => { setShowPasswordForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); }}
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm font-medium transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {!showPasswordForm && (
                <p className="text-slate-600 text-xs">
                  {user.hasPassword ? 'Last changed: keep your account secure.' : 'No password set yet. Create one to enable email sign-in.'}
                </p>
              )}
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {quickStats.map((stat, i) => (
                <div key={i} className={`p-4 rounded-2xl border bg-white/[0.02] ${stat.bg} stat-card-glow`} style={{ '--glow-color': stat.glow }}>
                  <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} mb-3`}>
                    {stat.icon}
                  </div>
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-slate-500 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-semibold text-sm">Problems by Category</h3>
              </div>
              <div className="space-y-3">
                {categoryBreakdown.map(cat => {
                  const pct = totalSolved > 0 ? Math.round((cat.value / totalSolved) * 100) : 0;
                  return (
                    <div key={cat.label}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-slate-300 font-medium">{cat.label}</span>
                        <span className="text-slate-500">{cat.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cat.color }} />
                      </div>
                    </div>
                  );
                })}
                {totalSolved === 0 && (
                  <p className="text-slate-600 text-sm text-center py-4">Start solving challenges to see your breakdown!</p>
                )}
              </div>
            </div>

            {/* Skill levels */}
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-semibold text-sm">Skill Levels</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Frontend', value: user.frontendSkill || 0, color: '#ec4899' },
                  { label: 'Backend', value: user.backendSkill || 0, color: '#f59e0b' },
                  { label: 'Full Stack', value: user.fullstackSkill || 0, color: '#a78bfa' },
                ].map(skill => (
                  <div key={skill.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-300">{skill.label}</span>
                      <span className="text-slate-500 font-medium">{skill.value}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${skill.value}%`, background: skill.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas to focus */}
            {(user.weak_areas?.length > 0 || user.strength_areas?.length > 0) && (
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-purple-400" />
                  <h3 className="text-white font-semibold text-sm">Areas to Focus</h3>
                </div>
                {user.weak_areas?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Needs improvement</p>
                    <div className="flex flex-wrap gap-2">
                      {user.weak_areas.map(area => (
                        <span key={area} className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
                {user.strength_areas?.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {user.strength_areas.map(area => (
                        <span key={area} className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('projects')}
                className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-purple-500/30 hover:bg-purple-500/5 transition-all text-left group">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-colors">
                  <Bug className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-white font-semibold text-sm">Challenges</p>
                <p className="text-slate-500 text-xs mt-0.5">Solve more bugs</p>
              </button>
              <button onClick={() => navigate('upload')}
                className="p-4 rounded-2xl border border-white/8 bg-white/[0.02] hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left group">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                  <Code2 className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-white font-semibold text-sm">Upload Project</p>
                <p className="text-slate-500 text-xs mt-0.5">Get AI debugging help</p>
              </button>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
