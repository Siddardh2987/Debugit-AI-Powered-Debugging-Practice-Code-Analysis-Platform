import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload as UploadIcon, X, FileCode2, Send, Bot, User as UserIcon,
  Plus, Loader2, CheckCircle2, AlertCircle, Folder, Trash2,
  ArrowLeft, RefreshCw, Clock, Files, FileCode, FileText, Copy, Check, ExternalLink
} from 'lucide-react';

const ALLOWED_EXTS = ['.js', '.jsx', '.css', '.html', '.json', '.md', '.env.example', '.gitignore', '.dockerignore'];

export default function Upload({ activeTabMode = 'upload' }) {
  const { navigate, apiRequest, isLoggedIn, loading, pageParams } = useApp();
  const activeTab = activeTabMode; // 'upload' | 'myprojects'
  const [myProjects, setMyProjects] = useState([]);
  const myProjectsRef = useRef([]);
  myProjectsRef.current = myProjects; // always in sync, without triggering effects
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const [viewingProjectId, setViewingProjectId] = useState(null);
  const [viewingProjectDetails, setViewingProjectDetails] = useState(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleViewFiles = async (projectId) => {
    setViewingProjectId(projectId);
    setFilesLoading(true);
    setViewingProjectDetails(null);
    setViewingFile(null);
    const { data, error } = await apiRequest(`/api/projects/${projectId}`);
    setFilesLoading(false);
    if (!error && data) {
      setViewingProjectDetails(data);
    } else {
      setViewingProjectId(null);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) { navigate('login'); return; }

    if (pageParams.projectId) {
      const fetchProjectDetails = async () => {
        const { data, error } = await apiRequest(`/api/projects/${pageParams.projectId}`);
        if (!error && data) {
          setSelectedProject(data);
        } else {
          navigate('upload');
        }
      };
      fetchProjectDetails();
    } else {
      fetchMyProjects();
      setSelectedProject(null);
    }
  }, [isLoggedIn, loading, pageParams.projectId]);

  useEffect(() => {
    if (loading || !isLoggedIn) return;

    // Poll every 4 seconds — use ref so this effect doesn't restart on every project update
    const interval = setInterval(() => {
      const hasActiveAnalysis = myProjectsRef.current.some(p => !p.summarized);
      if (!hasActiveAnalysis) {
        clearInterval(interval); // all done — stop polling
        return;
      }
      fetchMyProjects(false); // silent refresh (no full page loader)
    }, 4000);

    return () => clearInterval(interval);
  }, [isLoggedIn, loading]); // myProjects removed — ref used instead

  const fetchMyProjects = async (showLoading = true) => {
    if (showLoading) setProjectsLoading(true);
    const { data, error } = await apiRequest('/api/projects');
    if (!error && data) setMyProjects(data.projects || []);
    if (showLoading) setProjectsLoading(false);
  };

  const openChat = (project) => {
    navigate('upload', { projectId: project.id });
  };
  const closeChat = () => {
    navigate('upload');
    setSelectedProject(null);
    fetchMyProjects();
  };

  if (selectedProject) {
    return <ProjectChat project={selectedProject} onBack={closeChat} />;
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('projects')} className="flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Challenges
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Upload Your Project</h1>
          <p className="text-slate-400 text-base">Upload your codebase and get AI-powered debugging assistance.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          {[
            { id: 'upload', label: 'Upload New' },
            { id: 'myprojects', label: `My Projects${myProjects.length ? ` (${myProjects.length})` : ''}` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id === 'upload' ? 'upload' : 'myprojects')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'upload' ? (
          <UploadForm onSuccess={(proj) => { navigate('myprojects'); fetchMyProjects(); }} />
        ) : (
          <MyProjectsList
            projects={myProjects}
            loading={projectsLoading}
            onRefresh={fetchMyProjects}
            onOpen={openChat}
            onViewFiles={handleViewFiles}
            onDelete={async (id, title) => {
              if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
              await apiRequest(`/api/projects/${id}`, { method: 'DELETE' });
              fetchMyProjects();
            }}
          />
        )}
      </div>

      {/* Project Files Modal */}
      <AnimatePresence>
        {viewingProjectId && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl max-h-[80vh] bg-[#0d0d1a] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {viewingProjectDetails ? viewingProjectDetails.title : 'Loading project...'}
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {viewingProjectDetails ? `${viewingProjectDetails.files?.length || 0} Files Uploaded` : ''}
                  </p>
                </div>
                <button
                  onClick={() => { setViewingProjectId(null); setViewingProjectDetails(null); }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {filesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
                    <p className="text-slate-400 text-sm">Retrieving uploaded files...</p>
                  </div>
                ) : viewingProjectDetails && viewingProjectDetails.files && viewingProjectDetails.files.length > 0 ? (
                  <div className="space-y-2">
                    {viewingProjectDetails.files.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => setViewingFile({
                          ...file,
                          projectName: viewingProjectDetails.title
                        })}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileCode className="w-4 h-4 text-purple-400 group-hover:text-purple-300 shrink-0" />
                          <span className="text-white text-sm font-medium font-mono truncate">{file.fileName}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                          <span className="text-purple-400 group-hover:text-purple-300 text-xs font-semibold flex items-center gap-1">
                            View <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No files in this project</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Code Viewer Modal (Sub-modal) */}
      <AnimatePresence>
        {viewingFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-[#0d0d1a] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="min-w-0 flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <FileCode className="w-5 h-5 text-purple-400 shrink-0" />
                    <h2 className="text-lg font-bold text-white truncate" title={viewingFile.fileName}>
                      {viewingFile.fileName}
                    </h2>
                  </div>
                  <p className="text-slate-400 text-xs truncate">
                    Project: <span className="text-purple-300 font-medium">{viewingFile.projectName}</span> &bull; Size: {(viewingFile.size / 1024).toFixed(2)} KB &bull; Type: {viewingFile.mimeType || 'text/plain'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyCode(viewingFile.content)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Code Content */}
              <div className="flex-1 overflow-auto bg-black/40 p-6 font-mono text-sm leading-relaxed text-slate-300 select-text">
                <pre className="mono">
                  {viewingFile.content ? (
                    viewingFile.content.split('\n').map((line, idx) => (
                      <div key={idx} className="flex hover:bg-white/5 px-2 rounded -mx-2">
                        <span className="w-10 text-right select-none pr-4 text-slate-600 text-xs leading-6">{idx + 1}</span>
                        <span className="text-slate-300 whitespace-pre-wrap break-all leading-6">{line || ' '}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">Empty file</div>
                  )}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Upload Form ──────────────────────────────────────────────────────────────

function UploadForm({ onSuccess }) {
  const { apiRequest } = useApp();
  const [files, setFiles] = useState([]);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedName, setPastedName] = useState('index.js');
  const [pastedContent, setPastedContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return ALLOWED_EXTS.includes(ext) || f.name.endsWith('.env.example');
    });
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !existing.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const addPastedFile = (e) => {
    if (e) e.preventDefault();
    if (!pastedContent.trim() || !pastedName.trim()) return;

    // Validate file extension
    const ext = '.' + pastedName.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext) && !pastedName.endsWith('.env.example')) {
      setError(`Invalid file extension. Allowed extensions are: ${ALLOWED_EXTS.join(', ')}`);
      return;
    }

    const blob = new Blob([pastedContent], { type: 'text/plain' });
    const file = new File([blob], pastedName, { type: 'text/plain' });
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      if (existing.has(pastedName)) return prev;
      return [...prev, file];
    });
    setPastedContent('');
    setPastedName('index.js');
    setError(''); // Clear error state on success
    setPasteMode(false);
  };

  const handleUpload = async () => {
    if (!files.length) { setError('Add at least one file.'); return; }
    if (!title.trim()) { setError('Give your project a title.'); return; }

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const oversizedFile = files.find(f => f.size > MAX_FILE_SIZE);
    if (oversizedFile) {
      setError(`File "${oversizedFile.name}" is too large. Maximum size is 2MB.`);
      return;
    }

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    files.forEach(f => formData.append('files', f));

    const { data, error: err } = await apiRequest('/api/projects/upload', {
      method: 'POST',
      body: formData,
      headers: {} // let browser set Content-Type for FormData
    });

    setUploading(false);
    if (err) { setError(err); return; }
    if (data) onSuccess(data.project);
  };

  return (
    <div className="space-y-6">
      {/* Project info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-base font-medium text-slate-200 mb-2">Project Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="My React App"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all text-base"
          />
        </div>
        <div>
          <label className="block text-base font-medium text-slate-200 mb-2">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of the issue..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all text-base"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
          dragOver
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-white/10 hover:border-purple-500/50 hover:bg-white/[0.02]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTS.join(',')}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-purple-500/20' : 'bg-white/5'}`}>
          <UploadIcon className={`w-7 h-7 ${dragOver ? 'text-purple-400' : 'text-slate-500'}`} />
        </div>
        <p className="text-white font-semibold text-lg mb-1">Drop your files here</p>
        <p className="text-slate-400 text-base mb-3">or click to browse</p>
        <p className="text-slate-500 text-sm">{ALLOWED_EXTS.slice(0, 8).join(', ')} and more • Max 50 files • 2MB each</p>
      </div>

      {/* Paste code toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <button
          type="button"
          onClick={() => setPasteMode(!pasteMode)}
          className="text-xs text-slate-500 hover:text-purple-400 transition-colors whitespace-nowrap"
        >
          {pasteMode ? 'Hide paste editor' : '+ Paste code instead'}
        </button>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <AnimatePresence>
        {pasteMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={pastedName}
                  onChange={e => setPastedName(e.target.value)}
                  placeholder="filename.js"
                  className="w-40 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={addPastedFile}
                  disabled={!pastedContent.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Add File
                </button>
              </div>
              <textarea
                value={pastedContent}
                onChange={e => setPastedContent(e.target.value)}
                placeholder="Paste your code here..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      {files.length > 0 && (
        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
          <p className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-3">{files.length} file{files.length !== 1 ? 's' : ''} ready</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map(f => (
              <div key={f.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <FileCode2 className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-white text-sm font-mono flex-1 truncate">{f.name}</span>
                <span className="text-slate-500 text-xs">{(f.size / 1024).toFixed(1)}KB</span>
                <button onClick={() => removeFile(f.name)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !files.length || !title.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-base transition-opacity disabled:opacity-50 hover:opacity-90"
      >
        {uploading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Uploading & Analyzing...</>
        ) : (
          <><UploadIcon className="w-5 h-5" /> Upload & Start AI Analysis</>
        )}
      </button>

      <p className="text-sm text-slate-500 text-center">
        Files are processed by Gemini AI to generate summaries. You can start chatting immediately after upload.
      </p>
    </div>
  );
}

// ─── My Projects List ─────────────────────────────────────────────────────────

function MyProjectsList({ projects, loading, onRefresh, onOpen, onDelete, onViewFiles }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📂</div>
        <p className="text-slate-400 text-lg font-medium">No projects uploaded yet</p>
        <p className="text-slate-600 text-sm mt-2">Upload your first project to get AI debugging help</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        <button onClick={onRefresh} className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {projects.map(proj => (
          <motion.div
            key={proj.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold truncate">{proj.title}</h3>
                  {proj.summarized ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> AI Ready
                    </span>
                  ) : proj.summarizing ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
                {proj.description && (
                  <p className="text-slate-500 text-sm mb-2 truncate">{proj.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Files className="w-3 h-3" /> {proj.fileCount} file{proj.fileCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onViewFiles(proj.id)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 text-xs font-semibold transition-colors"
                >
                  View Files
                </button>
                <button
                  onClick={() => onOpen(proj)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
                >
                  Debug with AI
                </button>
                <button
                  onClick={() => onDelete(proj.id, proj.title)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/8 hover:border-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ProjectChat({ project, onBack }) {
  const { apiRequest, user } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      setHistoryLoading(true);
      const { data, error } = await apiRequest(`/api/projects/${project.id}`);
      if (!error && data && data.chatHistory && data.chatHistory.length > 0) {
        setMessages(data.chatHistory.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp)
        })));
      } else {
        setMessages([
          {
            role: 'assistant',
            content: `👋 Hi ${user?.name?.split(' ')[0] || 'there'}! I've analyzed **${project.title}**.\n\n${project.summarized ? "I've read your code and I'm ready to help you debug it! Ask me anything — what's going wrong?" : "I'm still analyzing your code in the background. You can ask questions and I'll do my best to help!"}\n\n**Instructions:**\n1. Upload part/section/group of files of the project.\n2. In the chat, upload or reference the specific area/code snippet you want to discuss.`,
            timestamp: new Date()
          }
        ]);
      }
      setHistoryLoading(false);
    };
    fetchChatHistory();
  }, [project.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setLoading(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const { data, error } = await apiRequest('/api/projects/chat', {
      method: 'POST',
      body: JSON.stringify({ projectId: project.id, userMessage: userMsg, chatHistory: history })
    });

    const response = (!error && data)
      ? data.hint
      : `I'm having trouble connecting right now. Try again in a moment. Your question: "${userMsg}"`;

    setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
    setLoading(false);
  };

  if (historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d1a' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-16" style={{ background: '#0d0d1a' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-black/30 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> My Projects
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-white font-medium text-sm">{project.title}</span>
        {project.summarized ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> AI Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Loader2 className="w-3 h-3 animate-spin" /> Analyzing...
          </span>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
              msg.role === 'user' ? 'bg-purple-600' : 'bg-slate-700'
            }`}>
              {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-tr-none'
                : 'bg-white/5 text-slate-300 border border-white/8 rounded-tl-none'
            }`}>
              {msg.content.split('\n').map((line, li) => (
                <p key={li} className={li > 0 ? 'mt-1' : ''}>
                  {line.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={pi} className="font-semibold">{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 bg-white/5 border border-white/8 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-black/20 max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about your code... (e.g. Why is my login not working?)"
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-700 mt-2 text-center">AI provides hints, not direct solutions. Ask about specific bugs or behaviors.</p>
      </div>
    </div>
  );
}
