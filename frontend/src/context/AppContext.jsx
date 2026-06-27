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

