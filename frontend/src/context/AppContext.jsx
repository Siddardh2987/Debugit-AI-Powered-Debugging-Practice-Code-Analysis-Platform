import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AppContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigateHook = useNavigate();

  // Derive currentPage from URL path
  let currentPage = 'landing';
  if (location.pathname === '/login') {
    currentPage = 'login';
  } else if (location.pathname === '/signup') {
    currentPage = 'signup';
  } else if (location.pathname === '/challenges') {
    currentPage = 'projects';
  } else if (location.pathname === '/stats') {
    currentPage = 'stats';
  } else if (location.pathname === '/upload') {
    currentPage = 'upload';
  } else if (location.pathname.startsWith('/projects')) {
    currentPage = 'myprojects';
  } else if (location.pathname.startsWith('/debug')) {
    currentPage = 'debug';
  }

  // Derive pageParams from URL path or query params
  const pageParams = {};
  const matchDebug = location.pathname.match(/^\/debug\/([^/]+)/);
  if (matchDebug) {
    pageParams.projectId = matchDebug[1];
  }
  const searchParams = new URLSearchParams(location.search);
  if (searchParams.has('id')) {
    pageParams.projectId = searchParams.get('id');
  }

  // ─── API Helper ────────────────────────────────────────────────────────────

  const apiRequest = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('debugit_token');
    const headers = {
      ...options.headers,
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use API_BASE if set, otherwise rely on Vite dev proxy (same-origin /api/*)
    const baseUrl = API_BASE || '';

    try {
      const response = await fetch(`${baseUrl}${url}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (response.status === 401) {
        localStorage.removeItem('debugit_token');
        setIsLoggedIn(false);
        setUser(null);
        navigateHook('/login');
        return { error: 'Session expired. Please log in again.' };
      }

      const contentType = response.headers.get('content-type');
      let data = {};
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || 'API request failed' };
      }

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      return { data };
    } catch (err) {
      console.warn(`API call to ${url} failed:`, err.message);
      return { error: err.message };
    }
  }, [navigateHook]);

  // ─── Session Restore ───────────────────────────────────────────────────────

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('debugit_token');
      if (token) {
        const [meRes, statsRes] = await Promise.all([
          apiRequest('/api/auth/me'),
          apiRequest('/api/stats')
        ]);
        if (!meRes.error && meRes.data) {
          setIsLoggedIn(true);
          const statsData = (!statsRes.error && statsRes.data) ? statsRes.data.stats : null;
          setUser(normalizeUser(meRes.data.user, statsData));
        } else {
          localStorage.removeItem('debugit_token');
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // ─── Normalize backend user to match what Stats.jsx etc. expect ────────────

  const normalizeUser = (data, statsData = null) => ({
    id: data.id || data._id,
    name: data.name,
    email: data.email,
    username: data.username || null,
    usernameSet: data.usernameSet || false,
    authProvider: data.authProvider || 'local',
    avatar: data.avatar || data.name?.slice(0, 2).toUpperCase() || 'U',
    problems_solved: data.problems_solved || { frontend: 0, backend: 0, both: 0 },
    hasPassword: data.hasPassword ?? false,
    accuracy: statsData?.averageScore ?? data.accuracy ?? 0,
    streak: statsData?.currentStreak ?? data.streak ?? 0,
    bestStreak: statsData?.bestStreak ?? data.bestStreak ?? 0,
    hintsUsed: statsData?.hintsUsed ?? data.hintsUsed ?? 0,
    questionsAsked: statsData?.questionsAsked ?? 0,
    projectsUploaded: statsData?.projectsUploaded ?? 0,
    frontendSkill: statsData?.frontendSkill ?? data.frontendSkill ?? 0,
    backendSkill: statsData?.backendSkill ?? data.backendSkill ?? 0,
    fullstackSkill: statsData?.fullstackSkill ?? data.fullstackSkill ?? 0,
    weak_areas: statsData?.weakAreas ?? data.weak_areas ?? [],
    strength_areas: statsData?.strengthAreas ?? [],
    recent_activity: statsData?.recentActivity
      ? statsData.recentActivity.slice().reverse().map(a => ({
          challengeId: a.challengeId,
          project: a.challengeTitle,
          category: a.category,
          score: a.score,
          date: a.date
        }))
      : (data.recent_activity || []),
    monthly_progress: (() => {
      if (statsData?.monthlyProgress?.length) return statsData.monthlyProgress;
      if (data.monthly_progress?.length) return data.monthly_progress;
      // Generate last 6 months with year to match backend "Jun 2026" format
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const now = new Date();
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, solved: 0 };
      });
    })()
  });

  // ─── Auth Actions ──────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { data, error } = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!error && data) {
      localStorage.setItem('debugit_token', data.accessToken);
      setIsLoggedIn(true);
      // Fetch full stats right away
      const statsRes = await apiRequest('/api/stats');
      const statsData = (!statsRes.error && statsRes.data) ? statsRes.data.stats : null;
      setUser(normalizeUser(data.user, statsData));
      return { success: true };
    }
    return { success: false, message: error || 'Login failed' };
  };

  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);

  const signup = async (name, email, password) => {
    const { data, error } = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (!error && data) {
      setPendingToken(data.accessToken);
      setPendingUser(data.user);
      return { 
        success: true, 
        user: { ...data.user, isAccountVerified: false }, 
        verificationPending: true 
      };
    }
    return { success: false, message: error || 'Signup failed' };
  };

  const verifyOtp = async (email, otp) => {
    const { data, error } = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    if (!error && data) {
      const token = pendingToken;
      if (token) {
        localStorage.setItem('debugit_token', token);
        setIsLoggedIn(true);
        const statsRes = await apiRequest('/api/stats');
        const statsData = (!statsRes.error && statsRes.data) ? statsRes.data.stats : null;
        
        const meRes = await apiRequest('/api/auth/me');
        const userData = (!meRes.error && meRes.data) ? meRes.data.user : pendingUser;
        
        setUser(normalizeUser(userData, statsData));
        setPendingToken(null);
        setPendingUser(null);
      }
      return { success: true, message: data.message || 'Account verified successfully' };
    }
    return { success: false, message: error || 'Verification failed' };
  };

  const navigate = (page, params) => {
    let target = '/';
    if (page === 'landing') target = '/';
    else if (page === 'login') target = '/login';
    else if (page === 'signup') target = '/signup';
    else if (page === 'projects') {
      target = params?.category ? `/challenges?category=${params.category}` : '/challenges';
    }
    else if (page === 'stats') target = '/stats';
    else if (page === 'profile') target = '/profile';
    else if (page === 'upload') {
      target = params?.projectId ? `/projects?id=${params.projectId}` : '/upload';
    } else if (page === 'myprojects') {
      target = params?.projectId ? `/projects?id=${params.projectId}` : '/projects';
    } else if (page === 'debug') {
      if (!params?.projectId) {
        console.warn('navigate("debug") called without projectId — going to /challenges instead');
        target = '/challenges';
      } else {
        target = `/debug/${params.projectId}`;
      }
    }
    navigateHook(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loginWithGoogleToken = async (idToken, isSignup = false) => {
    const { data, error } = await apiRequest('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: idToken, isSignup }),
    });
    if (!error && data) {
      localStorage.setItem('debugit_token', data.accessToken);
      setIsLoggedIn(true);
      const statsRes = await apiRequest('/api/stats');
      const statsData = (!statsRes.error && statsRes.data) ? statsRes.data.stats : null;
      setUser(normalizeUser(data.user, statsData));
      navigate('projects');
      return { success: true };
    }
    return { success: false, message: error || 'Google sign-in failed' };
  };

  const getAvatarGradient = (userId) => {
    const gradients = [
      'from-purple-600 to-indigo-600',
      'from-blue-600 to-cyan-500',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600',
      'from-amber-500 to-orange-600',
      'from-violet-600 to-fuchsia-600',
      'from-sky-500 to-blue-600',
      'from-red-500 to-rose-600',
    ];
    if (!userId) return gradients[0];
    let hash = 0;
    const str = String(userId);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const logout = async () => {
    navigate('landing');
    await apiRequest('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('debugit_token');
    setIsLoggedIn(false);
    setUser(null);
  };

  const refreshStats = async () => {
    if (isLoggedIn) {
      // Fetch both user profile and full stats in parallel
      const [meRes, statsRes] = await Promise.all([
        apiRequest('/api/auth/me'),
        apiRequest('/api/stats')
      ]);
      if (!meRes.error && meRes.data) {
        const statsData = (!statsRes.error && statsRes.data) ? statsRes.data.stats : null;
        setUser(normalizeUser(meRes.data.user, statsData));
      }
    }
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn,
      user,
      loading,
      login,
      signup,
      verifyOtp,
      loginWithGoogleToken,
      logout,
      currentPage,
      navigate,
      pageParams,
      apiRequest,
      refreshStats,
      getAvatarGradient
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

