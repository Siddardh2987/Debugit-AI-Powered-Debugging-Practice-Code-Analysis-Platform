import { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Bug, Zap, LogOut, BarChart2, FolderOpen, Upload,
  Folder, Menu, X, FileCode, User, ChevronDown, Settings
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { isLoggedIn, user, logout, navigate, getAvatarGradient } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
      style={{ background: 'rgba(10, 10, 20, 0.9)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={isLoggedIn ? '/challenges' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center group-hover:bg-purple-500 transition-colors">
              <Bug className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Debug<span className="text-purple-400">It</span>
            </span>
          </Link>

          {/* Desktop Nav Links — main nav only (Challenges + Upload) */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center gap-1">
              <NavLinkBtn icon={<FolderOpen className="w-4 h-4" />} label="Challenges" to="/challenges" />
              <NavLinkBtn icon={<Upload className="w-4 h-4" />} label="Upload" to="/upload" />
              <NavLinkBtn icon={<Folder className="w-4 h-4" />} label="My Projects" to="/projects" />
              <NavLinkBtn icon={<FileCode className="w-4 h-4" />} label="My Files" to="/uploaded-files" />
              <NavLinkBtn icon={<BarChart2 className="w-4 h-4" />} label="Stats" to="/stats" />
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Streak badge */}
                <div className="hidden sm:flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-semibold">{user?.streak ?? 0}d streak</span>
                </div>

                {/* ── Profile Dropdown ──────────────────────────────── */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(user?.id || user?._id)} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
                      {user?.avatar}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown panel */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/15 shadow-2xl shadow-black/40 overflow-hidden opaque-dropdown"
                      style={{ background: '#0c0c16', backdropFilter: 'none' }}
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-white/8">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(user?.id || user?._id)} flex items-center justify-center text-white text-base font-bold shrink-0`}>
                            {user?.avatar}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
                            {user?.username
                              ? <p className="text-slate-500 text-xs truncate font-mono">@{user.username}</p>
                              : <p className="text-slate-600 text-xs truncate">{user?.email}</p>
                            }
                          </div>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        <DropdownItem
                          icon={<User className="w-4 h-4" />}
                          label="My Profile"
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                        />
                        <DropdownItem
                          icon={<BarChart2 className="w-4 h-4" />}
                          label="My Stats"
                          to="/stats"
                          onClick={() => setDropdownOpen(false)}
                        />
                        <DropdownItem
                          icon={<Folder className="w-4 h-4" />}
                          label="My Projects"
                          to="/projects"
                          onClick={() => setDropdownOpen(false)}
                        />
                        <DropdownItem
                          icon={<FileCode className="w-4 h-4" />}
                          label="My Uploaded Files"
                          to="/uploaded-files"
                          onClick={() => setDropdownOpen(false)}
                        />
                      </div>

                      {/* Divider + logout */}
                      <div className="border-t border-white/8 p-1.5">
                        <button
                          onClick={() => { setDropdownOpen(false); logout(); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hamburger — mobile only */}
                <button
                  onClick={() => setMobileOpen(prev => !prev)}
                  className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="px-4 py-1.5 text-sm text-slate-300 hover:text-white transition-colors font-medium">
                  Login
                </Link>
                <Link to="/signup"
                  className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isLoggedIn && mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-3 flex flex-col gap-1"
          style={{ background: 'rgba(10, 10, 20, 0.97)' }}>
          <MobileNavLinkBtn icon={<FolderOpen className="w-4 h-4" />} label="Challenges" to="/challenges" onClick={() => setMobileOpen(false)} />
          <MobileNavLinkBtn icon={<Upload className="w-4 h-4" />} label="Upload" to="/upload" onClick={() => setMobileOpen(false)} />
          <MobileNavLinkBtn icon={<Folder className="w-4 h-4" />} label="My Projects" to="/projects" onClick={() => setMobileOpen(false)} />
          <MobileNavLinkBtn icon={<FileCode className="w-4 h-4" />} label="My Uploaded Files" to="/uploaded-files" onClick={() => setMobileOpen(false)} />
          <MobileNavLinkBtn icon={<BarChart2 className="w-4 h-4" />} label="My Stats" to="/stats" onClick={() => setMobileOpen(false)} />
          <MobileNavLinkBtn icon={<User className="w-4 h-4" />} label="Profile" to="/profile" onClick={() => setMobileOpen(false)} />
          <div className="border-t border-white/5 mt-1 pt-1">
            <button
              onClick={() => { setMobileOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

/* Desktop nav button */
function NavLinkBtn({ icon, label, to }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `nav-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`}>
      {icon}{label}
    </NavLink>
  );
}

/* Dropdown menu item */
function DropdownItem({ icon, label, to, onClick }) {
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-purple-600/20 text-purple-400'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}>
      {icon}{label}
    </NavLink>
  );
}

/* Mobile nav button */
function MobileNavLinkBtn({ icon, label, to, onClick }) {
  return (
    <NavLink to={to} onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
          isActive
            ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
        }`}>
      {icon}{label}
    </NavLink>
  );
}
