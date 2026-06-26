import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  X, Send, Lightbulb, ChevronDown, CheckCircle2, AlertCircle,
  Loader2, RotateCcw, FileCode2, Bot, User as UserIcon, Plus,
  Terminal, Bug, Trophy, ArrowRight, FileText, Maximize2
} from 'lucide-react';
import { mockProjects } from '../data/mockProjects';
import { useApp } from '../context/AppContext';

const categoryConfig = {
  frontend: { label: '🎨 Frontend', color: 'text-pink-400' },
  backend: { label: '⚙️ Backend', color: 'text-amber-400' },
  both: { label: '🔥 Full Stack', color: 'text-purple-400' },
};

export default function Debug() {
  const { pageParams, navigate, user, apiRequest, isLoggedIn, loading } = useApp();
  const projectId = pageParams.projectId;

  const [project, setProject] = useState(null);
  const [activeFile, setActiveFile] = useState('');
  const [fileContents, setFileContents] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [terminalLines, setTerminalLines] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('chat');
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [hintLevel, setHintLevel] = useState(1); // tracks progressive hint level 1-3
  const chatBottomRef = useRef(null);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) { navigate('login'); return; }
    if (!projectId) { navigate('projects'); return; }

    const loadProject = async () => {
      // Use /api/challenges for curated challenges
      const { data, error } = await apiRequest(`/api/challenges/${projectId}`);
      let currentProj = null;

      if (!error && data) {
        currentProj = {
          id: data._id || data.id,
          project_title: data.title,
          description: data.description,
          category: data.category,
          difficulty: data.difficulty,
          tags: data.tags || [],
          solvers: data.solvers || 0,
          accuracy: data.accuracy || 0,
          hint: data.hint,
          files: data.files.map(f => ({
            filename: f.filename,
            language: f.language,
            type: f.type,
            buggy_code: f.buggyCode,
            correct_code: f.correctCode,
            bug_explanation: f.bugExplanation
          }))
        };
      } else {
        // Fallback to offline mock data
        currentProj = mockProjects.find(p => p.id === projectId) || mockProjects[0];
      }

      setProject(currentProj);
      setActiveFile(currentProj.files[0].filename);
      
      // Load saved code content or initialize from buggy_code
      const savedCode = localStorage.getItem(`debug_code_${user?.id}_${projectId}`);
      if (savedCode) {
        try {
          setFileContents(JSON.parse(savedCode));
        } catch {
          const init = {};
          currentProj.files.forEach(f => { init[f.filename] = f.buggy_code; });
          setFileContents(init);
        }
      } else {
        const init = {};
        currentProj.files.forEach(f => { init[f.filename] = f.buggy_code; });
        setFileContents(init);
      }

      setTerminalLines([
        '$ Challenge loaded: ' + currentProj.project_title,
        '$ ' + currentProj.files.length + ' file(s) opened',
        '$ ' + currentProj.description,
        '$ Ready to debug...',
      ]);

      // Load saved chat history from backend
      const chatRes = await apiRequest(`/api/challenges/${projectId}/chat`);
      if (!chatRes.error && chatRes.data && chatRes.data.chatHistory && chatRes.data.chatHistory.length > 0) {
        setChatMessages(chatRes.data.chatHistory.map(m => ({
          role: m.role,
          content: m.content,
          isHint: m.isHint,
          hintLevel: m.hintLevel,
          timestamp: new Date(m.timestamp)
        })));
      } else {
        setChatMessages([
          {
            role: 'assistant',
            content: `👋 Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your AI debugging assistant.\n\nI'm here to give you **hints** — not spoil the answer! 😄\n\nYou're working on **${currentProj.project_title}**. ${currentProj.description}\n\nAsk me anything when you're stuck!`,
            timestamp: new Date(),
          },
        ]);
      }
    };

    loadProject();
  }, [projectId, isLoggedIn, loading, user?.id]);

  useEffect(() => {
    if (projectId && user?.id && Object.keys(fileContents).length > 0) {
      localStorage.setItem(`debug_code_${user.id}_${projectId}`, JSON.stringify(fileContents));
    }
  }, [fileContents, projectId, user?.id]);

  if (!project || Object.keys(fileContents).length === 0) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading project workspace...</p>
        </div>
      </div>
    );
  }

  const currentFile = project.files.find(f => f.filename === activeFile) || project.files[0];
  const currentContent = fileContents[activeFile] || '';

  const handleEditorChange = (value) => {
    if (value !== undefined) {
      setFileContents(prev => ({ ...prev, [activeFile]: value }));
    }
  };

  const resetFile = () => {
    setFileContents(prev => ({ ...prev, [activeFile]: currentFile.buggy_code }));
    setTerminalLines(prev => [...prev, `$ Reset ${activeFile} to original`]);
  };

  const sendHint = async () => {
    setChatLoading(true);
    // Determine current hint level: count assistant messages to escalate levels
    const currentLevel = Math.min(
      Math.max(0, ...chatMessages.filter(m => m.isHint).map(m => m.hintLevel || 0)) + 1,
      3
    );
    const levelLabel = currentLevel === 1 ? 'Level 1 — General' : currentLevel === 2 ? 'Level 2 — Focused' : 'Level 3 — Strong';
    setTerminalLines(prev => [...prev, `$ Requesting hint (${levelLabel})...`]);

    const history = chatMessages.map(m => ({ 
      role: m.role, 
      content: m.content,
      isHint: m.isHint,
      hintLevel: m.hintLevel
    }));
    const { data, error } = await apiRequest(`/api/challenges/${project.id}/hint`, {
      method: 'POST',
      body: JSON.stringify({
        filename: activeFile,
        userCode: fileContents[activeFile],
        chatHistory: history,
        userMessage: null,
        hintLevel: currentLevel
      })
    });

    let hint;
    if (!error && data && data.hint) {
      hint = data.hint;
    } else {
      console.warn("AI hint engine is offline. Using local project fallbacks.");
      setTerminalLines(prev => [
        ...prev, 
        '$ [Warning] AI hint engine is offline. We will be right back...'
      ]);
      const getHints = () => {
        if (project && project.hints && project.hints.length > 0) {
          return project.hints.map(h => h.text);
        }
        return [
          project.hint || "💡 Look carefully at the logic in this file.",
          "🔍 Try using console.logs to trace the data flow.",
          "🎯 Examine the variable scope and assignments."
        ];
      };
      const hints = getHints();
      const hintIndex = Math.max(0, ...chatMessages.filter(m => m.isHint).map(m => m.hintLevel || 0)) % hints.length;
      hint = `⚠️ **System Note:** AI Hint Engine is offline! We will be right back... \n\nFallback Hint: ${hints[hintIndex] || project.hint || "💡 Look carefully at the logic in this file."}`;
    }

    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: hint,
      isHint: true,
      hintLevel: currentLevel,
      timestamp: new Date()
    }]);
    setChatLoading(false);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setChatLoading(true);

    const history = chatMessages.map(m => ({ 
      role: m.role, 
      content: m.content,
      isHint: m.isHint,
      hintLevel: m.hintLevel
    }));
    // Current hint level for contextual response
    const currentLevel = Math.min(
      Math.max(0, ...chatMessages.filter(m => m.isHint).map(m => m.hintLevel || 0)),
      3
    );

    const { data, error } = await apiRequest(`/api/challenges/${project.id}/hint`, {
      method: 'POST',
      body: JSON.stringify({
        filename: activeFile,
        userCode: fileContents[activeFile],
        chatHistory: history,
        userMessage: userMsg,
        hintLevel: currentLevel
      })
    });

    let responseText;
    if (!error && data && data.hint) {
      responseText = data.hint;
    } else {
      // Local fallback chatbot responder
      responseText = generateAIResponse(userMsg, project, activeFile);
    }

    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: responseText,
      isHint: false,
      timestamp: new Date()
    }]);
    setChatLoading(false);
  };

  const newChat = async () => {
    setChatMessages([{
      role: 'assistant',
      content: `🔄 New chat started! I'm still here to help with **${project.project_title}**.\n\nWhat are you working on?`,
      timestamp: new Date(),
    }]);
    await apiRequest(`/api/challenges/${project.id}/chat`, { method: 'DELETE' });
  };

  // ── Inline offline scoring fallback ──────────────────────────────────────────
  const offlineEvaluate = (proj, contents) => {
    const perFile = proj.files.map(f => {
      const submitted = (contents[f.filename] || '').trim();
      const correct   = (f.correct_code || '').trim();
      const buggy     = (f.buggy_code   || '').trim();

      // similarity: what fraction of correct lines appear in submitted code
      const correctLines  = correct.split('\n').filter(Boolean);
      const submittedText = submitted;
      const matches = correctLines.filter(line => submittedText.includes(line.trim())).length;
      const similarity = correctLines.length > 0 ? matches / correctLines.length : 0;

      // unchanged from buggy means nothing was fixed
      const unchanged = submitted === buggy;
      const fileScore = unchanged ? 0 : Math.round(similarity * 100);
      const fixed = fileScore >= 70;

      return {
        filename: f.filename,
        score:    fileScore,
        fixed,
        comment: fixed
          ? 'Looks good! The key issues in this file appear to be resolved.'
          : unchanged
            ? 'No changes detected in this file.'
            : 'Some issues remain — review the logic carefully.'
      };
    });

    const avgScore = Math.round(perFile.reduce((sum, f) => sum + f.score, 0) / perFile.length);
    const fixedFiles = perFile.filter(f => f.fixed);
    const brokenFiles = perFile.filter(f => !f.fixed);

    return {
      score:    avgScore,
      feedback: avgScore >= 70
        ? `Great job! You fixed ${fixedFiles.length} of ${perFile.length} file(s). The code looks correct.`
        : `You fixed ${fixedFiles.length} of ${perFile.length} file(s). Keep going — check the remaining files more carefully.`,
      strengths:    fixedFiles.map(f => `${f.filename} — bug appears resolved`),
      improvements: brokenFiles.map(f => `${f.filename} — review the logic again`),
      perFile
    };
  };

  const submitFix = async () => {
    setSubmitting(true);
    setTerminalLines(prev => [...prev, '$ Submitting fix...', '$ Sending files to Gemini AI...']);

    try {
      // Use challenge-specific submit endpoint
      const { data, error } = await apiRequest(`/api/challenges/${project.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          files: fileContents
        })
      });

      let result;
      if (!error && data) {
        result = data;
      } else {
        // Offline fallback — no external dependency needed
        result = offlineEvaluate(project, fileContents);
      }

      setAiResult(result);
      setShowResult(true);
      setTerminalLines(prev => [...prev,
        `$ AI evaluation complete`,
        `$ Score: ${result.score}/100`,
        result.score >= 70 ? '$ ✅ Fix accepted!' : '$ ❌ Keep trying...'
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const lang = getMonacoLanguage(currentFile.language);

  return (
    <div className="h-screen flex flex-col pt-16 overflow-hidden" style={{ background: '#0d0d1a' }}>
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-black/30 shrink-0">
        <button onClick={() => navigate('projects')} className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1">
          ← Projects
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-white font-medium text-sm">{project.project_title}</span>
        <div className={`text-xs font-medium ${(categoryConfig[project.category] || categoryConfig.both).color}`}>
          {(categoryConfig[project.category] || categoryConfig.both).label}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={submitFix}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-70 glow-green"
          >
            {submitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Submit Fix</>
            )}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Editor Area */}
        <div className={`flex flex-col ${editorFullscreen ? 'w-full' : 'flex-1'} overflow-hidden`}>
          {/* File Tabs */}
          <div className="flex items-center gap-0 border-b border-white/5 bg-black/20 overflow-x-auto shrink-0">
            {project.files.map(file => (
              <FileTab
                key={file.filename}
                file={file}
                active={activeFile === file.filename}
                onClick={() => setActiveFile(file.filename)}
              />
            ))}
            <div className="ml-auto px-3 flex items-center gap-2">
              <button
                onClick={resetFile}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors py-2"
                title="Reset to original buggy code"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() => setEditorFullscreen(!editorFullscreen)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors py-2"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              key={activeFile} // forces clean remount when switching files
              height="100%"
              language={lang}
              value={currentContent}
              onChange={handleEditorChange}
              theme="vs-dark"
              beforeMount={(monaco) => {
                // Enable JSX/TSX support — eliminates false red squiggles
                monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                  target: monaco.languages.typescript.ScriptTarget.Latest,
                  allowNonTsExtensions: true,
                  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                  module: monaco.languages.typescript.ModuleKind.CommonJS,
                  noEmit: true,
                  esModuleInterop: true,
                  jsx: monaco.languages.typescript.JsxEmit.React,
                  reactNamespace: 'React',
                  allowJs: true,
                  typeRoots: ['node_modules/@types'],
                });
                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: false,
                });
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                  target: monaco.languages.typescript.ScriptTarget.Latest,
                  allowNonTsExtensions: true,
                  jsx: monaco.languages.typescript.JsxEmit.React,
                  noEmit: true,
                  allowJs: true,
                });
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: false,
                });
              }}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                lineNumbers: 'on',
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                wordWrap: 'on',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                contextmenu: true,
              }}
            />
          </div>

          {/* Terminal */}
          {!editorFullscreen && (
            <div className="h-36 border-t border-white/5 bg-black/60 flex flex-col shrink-0">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 shrink-0">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <Terminal className="w-3 h-3 text-slate-500 ml-1" />
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Terminal</span>
                <button
                  onClick={() => setTerminalLines([])}
                  className="ml-auto text-xs text-slate-700 hover:text-slate-400 transition-colors mono"
                  title="Clear terminal"
                >
                  clear
                </button>
              </div>
              {/* Terminal output — scrollable */}
              <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {terminalLines.map((line, i) => (
                  <div key={i} className={`text-xs mono ${
                    line.includes('Error') || line.includes('❌') ? 'text-red-400' :
                    line.includes('✅') ? 'text-emerald-400' :
                    line.includes('Score') ? 'text-purple-400' :
                    line.includes('Sending') || line.includes('Requesting') ? 'text-blue-400' :
                    line.includes('Reset') ? 'text-amber-400' :
                    'text-slate-400'
                  }`}>
                    {line}
                  </div>
                ))}
                {/* Blinking cursor at bottom */}
                <div className="text-xs mono text-slate-500 flex items-center gap-1">
                  <span>$</span>
                  <span className="inline-block w-1.5 h-3 bg-slate-500 cursor-blink" />
                </div>
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        {!editorFullscreen && (
          <div className="w-80 lg:w-96 flex flex-col border-l border-white/5 bg-black/20">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-white/5 shrink-0">
              <SidebarTab
                label="AI Hint Chat"
                icon={<Bot className="w-3.5 h-3.5" />}
                active={sidebarTab === 'chat'}
                onClick={() => setSidebarTab('chat')}
              />
              <SidebarTab
                label="Files Info"
                icon={<FileText className="w-3.5 h-3.5" />}
                active={sidebarTab === 'files'}
                onClick={() => setSidebarTab('files')}
              />
            </div>

            {sidebarTab === 'chat' ? (
              <ChatPanel
                messages={chatMessages}
                input={chatInput}
                loading={chatLoading}
                onInput={setChatInput}
                onSend={sendMessage}
                onHint={sendHint}
                onNewChat={newChat}
                chatBottomRef={chatBottomRef}
              />
            ) : (
              <FilesInfoPanel project={project} activeFile={activeFile} onFileSelect={setActiveFile} />
            )}
          </div>
        )}
      </div>

      {/* Result Modal */}
      {showResult && aiResult && (
        <ResultModal
          result={aiResult}
          project={project}
          onClose={() => setShowResult(false)}
          onRetry={() => { setShowResult(false); setAiResult(null); }}
          onNext={() => navigate('projects')}
        />
      )}
    </div>
  );
}

function FileTab({ file, active, onClick }) {
  const typeColor = file.type === 'frontend' ? 'text-pink-400' : 'text-amber-400';
  return (
    <button
      onClick={onClick}
      className={`file-tab flex items-center gap-2 px-4 py-2.5 text-xs border-r border-white/5 whitespace-nowrap transition-colors ${
        active
          ? 'bg-[#1e1e2e] text-white border-b-2 border-b-purple-500'
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
      }`}
    >
      <FileCode2 className={`w-3.5 h-3.5 ${active ? typeColor : 'text-slate-600'}`} />
      {file.filename}
    </button>
  );
}

function SidebarTab({ label, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-tab flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-b-2 ${
        active
          ? 'text-purple-400 border-purple-500 bg-purple-500/5'
          : 'text-slate-500 border-transparent hover:text-slate-300'
      }`}
    >
      {icon}{label}
    </button>
  );
}

// Render markdown bold (**text**) in chat messages
function renderContent(text) {
  return text.split(/\*\*([^*]+)\*\*/).map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-white">{part}</strong> : part
  );
}

function ChatPanel({ messages, input, loading, onInput, onSend, onHint, onNewChat, chatBottomRef }) {
  const hintCount = Math.max(0, ...messages.filter(m => m.isHint).map(m => m.hintLevel || 0));
  const allHintsUsed = hintCount >= 3;
  const nextLevel = allHintsUsed ? 3 : hintCount + 1;
  const levelColors = { 1: 'text-amber-400 border-amber-500/20 bg-amber-500/10', 2: 'text-orange-400 border-orange-500/20 bg-orange-500/10', 3: 'text-red-400 border-red-500/20 bg-red-500/10' };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs text-slate-400 font-medium">AI Hint Mentor</span>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        </div>
        <button onClick={onNewChat} className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors">
          <Plus className="w-3 h-3" /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs ${
              msg.role === 'user' ? 'bg-purple-600' : msg.isHint ? 'bg-amber-600' : 'bg-slate-700'
            }`}>
              {msg.role === 'user' ? <UserIcon className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
            </div>
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-purple-600 text-white rounded-tr-none'
                : msg.isHint
                ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20 rounded-tl-none'
                : 'bg-white/5 text-slate-300 border border-white/5 rounded-tl-none'
            }`}>
              {msg.isHint && msg.hintLevel && (
                <div className="text-xs text-amber-400/60 font-semibold mb-1 uppercase tracking-wider">
                  Level {msg.hintLevel} Hint
                </div>
              )}
              {msg.content.split('\n').map((line, li) => (
                <p key={li} className={li > 0 ? 'mt-1' : ''}>{renderContent(line)}</p>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-3 h-3 text-white" />
            </div>
            <div className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl rounded-tl-none">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      <div className="px-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={onHint}
          disabled={loading || allHintsUsed}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
            allHintsUsed
              ? 'text-slate-500 border-white/5 bg-white/5'
              : levelColors[nextLevel]
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          {allHintsUsed ? 'All hints used (3/3)' : `Get Hint — Level ${nextLevel}/3`}
        </button>
      </div>

      <div className="p-3 border-t border-white/5 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => onInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder="Ask the AI mentor..."
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

function FilesInfoPanel({ project, activeFile, onFileSelect }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="p-3 rounded-xl bg-white/3 border border-white/8">
        <h3 className="text-white font-semibold text-sm mb-1">{project.project_title}</h3>
        <p className="text-slate-500 text-xs leading-relaxed">{project.description}</p>
      </div>

      <div>
        <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-2">Files ({project.files.length})</p>
        <div className="space-y-1.5">
          {project.files.map(file => (
            <button
              key={file.filename}
              onClick={() => onFileSelect(file.filename)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                activeFile === file.filename
                  ? 'bg-purple-500/10 border border-purple-500/30'
                  : 'bg-white/3 border border-white/5 hover:border-white/15'
              }`}
            >
              <FileCode2 className={`w-4 h-4 shrink-0 ${
                file.type === 'frontend' ? 'text-pink-400' : 'text-amber-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{file.filename}</p>
                <p className="text-slate-600 text-xs capitalize">{file.type}</p>
              </div>
              <Bug className="w-3 h-3 text-red-400/50 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowHint(!showHint)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/10 transition-colors"
        >
          <span className="flex items-center gap-2"><Lightbulb className="w-3.5 h-3.5" /> Project Hint</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHint ? 'rotate-180' : ''}`} />
        </button>
        {showHint && (
          <div className="mt-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-300/80 text-xs leading-relaxed">
            {project.hint}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-2">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-1 rounded-md bg-white/5 text-slate-500 border border-white/5">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultModal({ result, project, onClose, onRetry, onNext }) {
  const isPassing = result.score >= 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] fade-in">
        <div className={`p-6 text-center border-b border-white/5 shrink-0 ${isPassing ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
          <div className="flex justify-end mb-2">
            <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-5xl mb-3">
            {isPassing ? '🎉' : '🤔'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {isPassing ? 'Great Fix!' : 'Keep Trying'}
          </h2>
          <p className="text-slate-400 text-sm">{project.project_title}</p>

          <div className="mt-4 flex items-center justify-center">
            <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center ${
              isPassing ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 bg-red-500/10'
            }`}>
              <span className={`text-2xl font-black ${isPassing ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.score}
              </span>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-2">out of 100</p>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* AI Feedback */}
          <div className="p-3 rounded-xl bg-white/3 border border-white/8">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">AI Feedback</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{result.feedback || result.summary}</p>
          </div>

          {/* Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-2">✅ Strengths</p>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-emerald-300 text-xs flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {result.improvements && result.improvements.length > 0 && result.score < 100 && (
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-2">🔧 Areas to Improve</p>
              <ul className="space-y-1">
                {result.improvements.map((im, i) => (
                  <li key={i} className="text-amber-300 text-xs flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />{im}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* File Breakdown */}
          {result.perFile && result.perFile.length > 0 && (
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-2">File Breakdown</p>
              <div className="space-y-2">
                {result.perFile.map((f, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                    f.fixed
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    {f.fixed
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs font-medium">{f.filename}</span>
                        <span className={`text-xs font-bold ${f.fixed ? 'text-emerald-400' : 'text-red-400'}`}>
                          {f.score}/100
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed">{f.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex gap-3 shrink-0">
          <button
            onClick={onRetry}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium border border-white/10 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onNext}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            <Trophy className="w-4 h-4" />
            {isPassing ? 'Next Challenge' : 'Browse Challenges'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Helper functions ----

function getMonacoLanguage(lang) {
  const map = {
    jsx: 'javascript',
    tsx: 'typescript',
    javascript: 'javascript',
    typescript: 'typescript',
    css: 'css',
    html: 'html',
    json: 'json',
  };
  return map[lang] || 'javascript';
}

function generateAIResponse(userMsg, project, activeFile) {
  const msg = userMsg.toLowerCase();

  if (msg.includes('hint') || msg.includes('help') || msg.includes('stuck')) {
    return `I can't give you the direct answer, but here's a nudge:\n\nFor **${activeFile}**, think about what the function is supposed to do vs what it actually does.\n\nTry adding console.log statements to trace the data flow. What values do you expect vs what do you get?`;
  }
  if (msg.includes('bug') || msg.includes('error') || msg.includes('broken')) {
    return `There ${project.files.length > 1 ? 'are bugs' : 'is a bug'} in this project. Without spoiling it:\n\n🔍 Read each line carefully\n🔍 Think about data types\n🔍 Check function argument order\n🔍 Look for spelling mistakes in variable/field names\n\nWant a more specific hint?`;
  }
  if (msg.includes('correct') || msg.includes('right') || msg.includes('solution')) {
    return `I'm not able to show you the solution directly — that would defeat the purpose! 😄\n\nBut click **"Get a Hint"** and I'll give you progressively more specific hints. You've got this!`;
  }
  if (msg.includes('what') && msg.includes('file')) {
    return `You have ${project.files.length} file${project.files.length > 1 ? 's' : ''} to debug:\n\n${project.files.map(f => `• **${f.filename}** (${f.type})`).join('\n')}\n\nStart with the file most likely related to the symptom: "${project.description}"`;
  }

  const fallbacks = [
    `Good question! For **${project.project_title}**: ${project.hint}`,
    `Think about what "${project.description}" means from a code perspective. Which file would cause that behavior?`,
    `I'm here to help without spoiling. What specific behavior are you confused about? What did you expect vs what happened?`,
    `Take a step back. Read the error description: "${project.description}". Which part of the code is responsible for that feature?`,
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
