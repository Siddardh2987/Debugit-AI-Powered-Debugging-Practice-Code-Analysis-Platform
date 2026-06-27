import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, FileCode, FileText, Calendar, HardDrive, CornerRightDown, ExternalLink, Copy, Check, X, ArrowLeft, Loader2 } from 'lucide-react';

export default function FilesList() {
  const { apiRequest, isLoggedIn, navigate, loading } = useApp();
  const [projects, setProjects] = useState([]);
  const [files, setFiles] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [extensionFilter, setExtensionFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      navigate('login');
      return;
    }
    fetchAndAggregateFiles();
  }, [isLoggedIn, loading]);

  const fetchAndAggregateFiles = async () => {
    try {
      setPageLoading(true);
      // Fetch all projects
      const { data: projectsData, error: projError } = await apiRequest('/api/projects');
      if (projError || !projectsData) {
        setPageLoading(false);
        return;
      }

      const projectsList = projectsData.projects || [];
      setProjects(projectsList);

      // Fetch detail for each project to get files (with content)
      const detailPromises = projectsList.map(async (project) => {
        const { data: projectDetails, error: detailError } = await apiRequest(`/api/projects/${project.id}`);
        if (!detailError && projectDetails && projectDetails.files) {
          return projectDetails.files.map(file => ({
            ...file,
            projectId: project.id,
            projectName: project.title,
            // Fallback for fields
            mimeType: file.mimeType || 'text/plain',
            createdAt: file.createdAt || project.createdAt || new Date().toISOString()
          }));
        }
        return [];
      });

      const aggregatedFilesLists = await Promise.all(detailPromises);
      const allFiles = aggregatedFilesLists.flat();
      setFiles(allFiles);
    } catch (err) {
      console.error('Error loading uploaded files:', err);
    } finally {
      setPageLoading(false);
    }
  };

  const getFileExtension = (filename) => {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts.pop().toLowerCase()}` : 'no ext';
  };

  // Get unique extensions
  const extensions = ['all', ...new Set(files.map(f => getFileExtension(f.fileName)))].filter(Boolean);

  // Filter and search logic
  const filteredFiles = files.filter(file => {
    const ext = getFileExtension(file.fileName);
    const matchesExt = extensionFilter === 'all' || ext === extensionFilter;
    const matchesSearch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesExt && matchesSearch;
  });

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0.00 KB';
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <button onClick={() => navigate('projects')} className="flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Projects
            </button>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileCode className="text-purple-500 w-8.5 h-8.5" />
              My Uploaded Files
            </h1>
            <p className="text-slate-400 text-sm">
              Browse, search, and inspect code files uploaded across all your dynamic projects.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2 text-sm text-purple-300 w-fit shrink-0">
            <HardDrive className="w-4 h-4" />
            <span>{files.length} Files Aggregated</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by filename or project title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1 w-fit">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <select
              value={extensionFilter}
              onChange={(e) => setExtensionFilter(e.target.value)}
              className="bg-transparent border-none text-slate-200 focus:outline-none text-sm pr-8 py-1.5 cursor-pointer font-medium"
            >
              <option value="all" className="bg-[#11111e] text-slate-200">All Extensions</option>
              {extensions.filter(ext => ext !== 'all').map(ext => (
                <option key={ext} value={ext} className="bg-[#11111e] text-slate-200">
                  {ext} ({files.filter(f => getFileExtension(f.fileName) === ext).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {pageLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Aggregating codebase uploads...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-2xl">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">No files found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {files.length === 0
                ? "You haven't uploaded any projects yet. Go to the Upload tab to add files!"
                : "No files match your current search queries or file extension filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">File Name</th>
                  <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                  <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type / Ext</th>
                  <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
                  <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Upload Date</th>
                  <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFiles.map((file, idx) => {
                  const ext = getFileExtension(file.fileName);
                  return (
                    <tr key={`${file.projectId}-${file.fileName}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-5 font-medium text-white text-sm max-w-xs truncate">
                        <span className="flex items-center gap-2.5">
                          <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                          <span title={file.fileName}>{file.fileName}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-300 text-sm max-w-xs truncate">
                        <span className="flex items-center gap-1.5" title={file.projectName}>
                          <CornerRightDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {file.projectName}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
                          {ext.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-300 text-sm">
                        {formatSize(file.size)}
                      </td>
                      <td className="py-4 px-5 text-slate-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDate(file.createdAt)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-right">
                        <button
                          onClick={() => setSelectedFile(file)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          View Code <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Viewer Modal */}
      <AnimatePresence>
        {selectedFile && (
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
                    <h2 className="text-lg font-bold text-white truncate" title={selectedFile.fileName}>
                      {selectedFile.fileName}
                    </h2>
                  </div>
                  <p className="text-slate-400 text-xs truncate">
                    Project: <span className="text-purple-300 font-medium">{selectedFile.projectName}</span> &bull; Size: {formatSize(selectedFile.size)} &bull; Type: {selectedFile.mimeType}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyCode(selectedFile.content)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setSelectedFile(null)}
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
                  {selectedFile.content ? (
                    selectedFile.content.split('\n').map((line, idx) => (
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
