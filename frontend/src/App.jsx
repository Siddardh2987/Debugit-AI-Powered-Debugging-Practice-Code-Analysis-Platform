import React, { Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Debug from './pages/Debug';
import Stats from './pages/Stats';
import Upload from './pages/Upload';
import FilesList from './pages/FilesList';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login isSignupMode={false} />} />
          <Route path="/signup" element={<Login isSignupMode={true} />} />
          
          <Route path="/challenges" element={<Projects />} />
          <Route path="/debug" element={<Navigate to="/challenges" replace />} />
          <Route path="/debug/:id" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><Upload activeTabMode="upload" /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><Upload activeTabMode="myprojects" /></ProtectedRoute>} />
          <Route path="/uploaded-files" element={<ProtectedRoute><FilesList /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
          <div className="max-w-md w-full bg-[#0d0d1a] border border-red-500/20 rounded-2xl p-6 text-center shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4 font-bold">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              An unexpected error occurred in the application interface.
            </p>
            {this.state.error?.message && (
              <pre className="text-left text-xs bg-black/40 text-red-400 p-3 rounded-lg overflow-x-auto mb-6 max-h-32 mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-sm font-semibold transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppProvider>
  );
}
