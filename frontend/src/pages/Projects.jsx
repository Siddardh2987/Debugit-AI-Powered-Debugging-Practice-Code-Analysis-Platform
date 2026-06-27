import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, ChevronRight, Users, Target, Clock, Tag, Flame, Lock, X, ArrowRight, FileCode2, Loader2, Upload } from 'lucide-react';
import { mockProjects } from '../data/mockProjects';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const categoryConfig = {
  frontend: { label: '🎨 Frontend', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20', dot: 'bg-pink-400' },
  backend: { label: '⚙️ Backend', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  both: { label: '🔥 Full Stack', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-400' },
};

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  easy: { label: 'Easy', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  medium: { label: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  hard: { label: 'Hard', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  expert: { label: 'Expert', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

const fixModeOptions = [
  {
    id: 'frontend',
    icon: '🎨',
    label: 'Fix Frontend Issues',
    desc: 'React, JS, CSS bugs only',
    color: 'border-pink-500/30 hover:border-pink-500/60 hover:bg-pink-500/5',
    active: 'border-pink-500 bg-pink-500/10',
    types: ['frontend'],
  },
  {
    id: 'backend',
    icon: '⚙️',
    label: 'Fix Backend Issues',
    desc: 'Node.js, API, Express bugs only',
    color: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5',
    active: 'border-amber-500 bg-amber-500/10',
    types: ['backend'],
  },
  {
    id: 'both',
    icon: '🔥',
    label: 'Fix Frontend + Backend Both',
    desc: 'Full stack debugging challenge',
    color: 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5',
    active: 'border-purple-500 bg-purple-500/10',
    types: ['frontend', 'backend'],
  },
];

export default function Projects() {
  const { navigate, isLoggedIn, apiRequest, user } = useApp();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const getProjectStatus = (project) => {
    if (!user || !user.recent_activity) return 'pending';
    const activities = user.recent_activity.filter(a => 
      (a.challengeId && String(a.challengeId) === String(project.id)) ||
      (a.project && a.project.toLowerCase() === project.project_title.toLowerCase())
    );
    if (activities.length === 0) return 'pending';
    const hasSolved = activities.some(a => a.score >= 70);
    return hasSolved ? 'solved' : 'attempted';
  };
  const [selectedProject, setSelectedProject] = useState(null);
  const prevSearchRef = useRef(search);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'all') queryParams.append('category', categoryFilter);
      if (diffFilter !== 'all') queryParams.append('difficulty', diffFilter);
      if (search.trim()) queryParams.append('q', search.trim());

      const { data, error } = await apiRequest(`/api/challenges?${queryParams.toString()}`);

      if (!error && data) {
        const formatted = data.map(p => ({
          id: p._id || p.id,
          project_title: p.title,
          description: p.description,
          category: p.category,
          difficulty: p.difficulty,
          tags: p.tags || [],
          solvers: p.solvers || 0,
          accuracy: p.accuracy || 0,
          hint: p.hint,
          files: (p.files || []).map(f => ({
            filename: f.filename,
            language: f.language,
            type: f.type,
            buggy_code: f.buggyCode
          }))
        }));
        setProjects(formatted);
      } else {
        // Fallback to offline mock data
        const filtered = mockProjects.filter(p => {
          const matchSearch = !search.trim() ||
            p.project_title.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase()) ||
            p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
          const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
          const matchDiff = diffFilter === 'all' || p.difficulty === diffFilter;
          return matchSearch && matchCat && matchDiff;
        });
        setProjects(filtered);
      }
      setLoading(false);
    };

    // Fix 2: debounce only when user is typing in search, not when clicking filters
    const isSearchChange = prevSearchRef.current !== search;
    prevSearchRef.current = search;
    const delay = isSearchChange ? 250 : 0;

    const timer = setTimeout(fetchProjects, delay);
    return () => clearTimeout(timer);
  }, [categoryFilter, diffFilter, search]);

  const openProject = (project) => {
    if (!isLoggedIn) {
      navigate('login');
      return;
    }
    if (project.category !== 'both') {
      navigate('debug', { projectId: project.id });
    } else {
      setSelectedProject(project);
    }
  };

  const startDebug = (project) => {
    setSelectedProject(null);
    navigate('debug', { projectId: project.id });
  };

  const filteredProjects = projects.filter(p => {
    if (statusFilter === 'all') return true;
    return getProjectStatus(p) === statusFilter;
  });

  return (
    <div className="min-h-screen pt-20 pb-12 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Broken Projects</h1>
            <p className="text-slate-500">Pick a project, find the bugs, fix them. AI checks your work.</p>
          </div>
          {/* Upload CTA */}
          <motion.button
            onClick={() => isLoggedIn ? navigate('upload') : navigate('login')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Upload className="w-4 h-4" />
            Upload My Project
          </motion.button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all text-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Category filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {['all', 'frontend', 'backend', 'both'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat === 'frontend' ? '🎨 Frontend' : cat === 'backend' ? '⚙️ Backend' : '🔥 Both'}
                </button>
              ))}
            </div>

            {/* Difficulty filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {['all', 'easy', 'medium', 'hard'].map(d => (
                <button
                  key={d}
                  onClick={() => setDiffFilter(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    diffFilter === d
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d === 'all' ? 'All Levels' : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            {/* Status filter */}
            {isLoggedIn && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                {['all', 'solved', 'attempted', 'pending'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {status === 'all' ? 'All Status' : status === 'solved' ? '✅ Solved' : status === 'attempted' ? '⏳ Attempted' : '📝 Pending'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2 mb-5 text-sm text-slate-500">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          ) : (
            <Filter className="w-4 h-4" />
          )}
          <span>{loading ? 'Loading challenges...' : `${filteredProjects.length} challenge${filteredProjects.length !== 1 ? 's' : ''} found`}</span>
        </div>

        {/* Fix 3: Skeleton loading cards while fetching */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            {filteredProjects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                isLoggedIn={isLoggedIn}
                status={getProjectStatus(project)}
                onClick={() => openProject(project)}
              />
            ))}
          </motion.div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-400 text-lg font-medium">No challenges found</p>
            <p className="text-slate-600 text-sm mt-2">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearch(''); setCategoryFilter('all'); setDiffFilter('all'); setStatusFilter('all'); }}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-sm hover:bg-purple-600/30 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Project Mode Selection Modal */}
      {selectedProject && (
        <ProjectModeModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onStart={() => startDebug(selectedProject)}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, index, isLoggedIn, status, onClick }) {
  const cat = categoryConfig[project.category] || categoryConfig.frontend;
  const diff = difficultyConfig[project.difficulty] || difficultyConfig.medium;

  return (
    <motion.div
      onClick={onClick}
      className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-purple-500/40 hover:bg-white/[0.06] cursor-pointer transition-all duration-200"
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 pr-2">
          <h3 className="text-white font-semibold text-base leading-tight group-hover:text-purple-300 transition-colors">
            {project.project_title}
          </h3>
        </div>
        <div className="flex flex-col gap-1 items-end shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium ${diff.color}`}>
            {diff.label}
          </span>
          {isLoggedIn && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold ${
              status === 'solved'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : status === 'attempted'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-white/5 text-slate-500 border-white/5'
            }`}>
              {status === 'solved' ? 'Solved' : status === 'attempted' ? 'Attempted' : 'Pending'}
            </span>
          )}
        </div>
      </div>

      <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-2">
        {project.description}
      </p>

      {/* Category badge */}
      <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${cat.color} mb-4`}>
        <div className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
        {cat.label}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.tags.slice(0, 3).map(tag => (
          <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-500 border border-white/5">
            <Tag className="w-3 h-3" />
            {tag}
          </span>
        ))}
        {project.tags.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-600">
            +{project.tags.length - 3}
          </span>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {(project.solvers || 0).toLocaleString()} solved
          </span>
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {project.accuracy}% accuracy
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {project.files?.length || 1} file{(project.files?.length || 1) !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={`flex items-center gap-1 text-xs font-medium transition-all duration-200 ${
          isLoggedIn ? 'text-purple-400 group-hover:gap-2' : 'text-slate-600'
        }`}>
          {isLoggedIn ? (
            <>Debug <ChevronRight className="w-3 h-3" /></>
          ) : (
            <><Lock className="w-3 h-3" /> Login</>
          )}
        </div>
      </div>

      {project.difficulty === 'hard' && (
        <div className="absolute top-4 right-12">
          <Flame className="w-4 h-4 text-red-500/40" />
        </div>
      )}
    </motion.div>
  );
}

// Fix 3: Skeleton card shown while challenges are loading
function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 animate-pulse">
      {/* Title + difficulty badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 bg-white/8 rounded-lg w-3/5" />
        <div className="h-5 bg-white/8 rounded-lg w-14" />
      </div>
      {/* Description lines */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-4/5" />
      </div>
      {/* Category badge */}
      <div className="h-6 bg-white/8 rounded-lg w-28 mb-4" />
      {/* Tags */}
      <div className="flex gap-2 mb-4">
        <div className="h-5 bg-white/5 rounded w-16" />
        <div className="h-5 bg-white/5 rounded w-20" />
        <div className="h-5 bg-white/5 rounded w-14" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex gap-4">
          <div className="h-3 bg-white/5 rounded w-16" />
          <div className="h-3 bg-white/5 rounded w-14" />
        </div>
        <div className="h-3 bg-white/8 rounded w-10" />
      </div>
    </div>
  );
}

function ProjectModeModal({ project, onClose, onStart }) {
  const [selectedMode, setSelectedMode] = useState('both');

  const availableModes = fixModeOptions.filter(mode => {
    if (project.category === 'frontend') return mode.id === 'frontend';
    if (project.category === 'backend') return mode.id === 'backend';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">{project.project_title}</h2>
            <p className="text-slate-500 text-sm">{project.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors ml-4 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-slate-400 mb-4 font-medium">What do you want to fix?</p>
          <div className="space-y-3">
            {availableModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                  selectedMode === mode.id ? mode.active : `border-white/8 bg-white/[0.02] ${mode.color}`
                }`}
              >
                <span className="text-2xl">{mode.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{mode.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{mode.desc}</p>
                </div>
                {selectedMode === mode.id && (
                  <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">Files you'll debug</p>
            <div className="space-y-1.5">
              {(project.files || [])
                .filter(f => {
                  const mode = availableModes.find(m => m.id === selectedMode);
                  return mode?.types.includes(f.type) ?? true;
                })
                .map(file => (
                  <div key={file.filename} className="flex items-center gap-2 text-xs">
                    <FileCode2 className={`w-3.5 h-3.5 ${file.type === 'frontend' ? 'text-pink-400' : 'text-amber-400'}`} />
                    <span className="text-slate-400 font-mono">{file.filename}</span>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                      file.type === 'frontend' ? 'bg-pink-500/10 text-pink-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>{file.type}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-slate-400 text-sm font-medium border border-white/8 transition-colors">
            Cancel
          </button>
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
          >
            Start Debugging <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
