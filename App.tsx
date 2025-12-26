
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; 
import StyleDNAVault from './components/StyleDNAVault';
import CreditShop from './components/CreditShop';
import LiveStudio from './components/LiveStudio';
import { 
  AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions, 
  LinguisticProfile, DocumentVersion, ErrorContext 
} from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry'; 
import { downloadDocx } from './services/exportService';
import { 
  Loader2, Cpu, Dna, Briefcase, Zap, AlertCircle, RefreshCcw, 
  Coins, Mic, Heart, History, UserCheck, Keyboard, Command, X, FileCheck 
} from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v6';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [scanProgress, setScanProgress] = useState({ percent: 0, step: '' });
  const [fixProgress, setFixProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [errorContext, setErrorContext] = useState<ErrorContext | null>(null);
  
  // Advanced Features: History & Versions
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [profiles, setProfiles] = useState<LinguisticProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [credits, setCredits] = useState(0);

  // --- SHORTCUT HANDLER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      
      // Cmd + Z: Undo
      if (isCmd && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Cmd + Y: Redo
      if (isCmd && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Cmd + Enter: Start Process
      if (isCmd && e.key === 'Enter') {
        if (!document) {
          const btn = window.document.querySelector('[data-action="main-scan"]');
          if (btn) (btn as HTMLButtonElement).click();
        } else if (analysis && status === AppStatus.IDLE) {
          const btn = window.document.querySelector('[data-action="main-fix"]');
          if (btn) (btn as HTMLButtonElement).click();
        }
      }
      // Cmd + S: Quick Export
      if (isCmd && e.key === 's') {
        e.preventDefault();
        if (fixResult) downloadDocx(fixResult.rewrittenText, 'Quick_Export', fixResult.bibliography);
        else if (document) downloadDocx(document.originalText, 'Original_Doc');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, analysis, status, fixResult, historyStack, historyIndex]);

  // --- HISTORY LOGIC ---
  const pushToHistory = (text: string) => {
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(text);
    if (newStack.length > 50) newStack.shift(); // Max 50 undos
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevText = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      if (fixResult) setFixResult({ ...fixResult, rewrittenText: prevText });
      else if (document) setDocument({ ...document, originalText: prevText });
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextText = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      if (fixResult) setFixResult({ ...fixResult, rewrittenText: nextText });
      else if (document) setDocument({ ...document, originalText: nextText });
    }
  };

  // --- SESSION INIT ---
  useEffect(() => {
    const initApp = async () => {
      try {
          const params = new URLSearchParams(window.location.search);
          if (params.get('admin_key') === 'plagiafix_master_2025') {
              setIsAdmin(true);
              return;
          } 

          const saved = localStorage.getItem(SESSION_KEY);
          if (saved) {
              const session = JSON.parse(saved);
              if (session.timestamp && (Date.now() - session.timestamp < 86400000)) {
                  if (session.document) {
                    setDocument(session.document);
                    pushToHistory(session.document.originalText);
                  }
                  if (session.analysis) setAnalysis(session.analysis);
                  if (session.fixResult) setFixResult(session.fixResult);
                  if (session.scoreHistory) setScoreHistory(session.scoreHistory);
                  if (session.profiles) setProfiles(session.profiles);
                  if (session.activeProfileId) setActiveProfileId(session.activeProfileId);
                  if (session.credits !== undefined) setCredits(session.credits);
                  if (session.versions) setVersions(session.versions);
              }
          }
      } catch (e) {
          console.error("Session restore failed:", e);
      } finally {
          setIsRestoring(false);
          setTimeout(() => Telemetry.logVisit().catch(() => null), 100);
      }
    };

    initApp();
  }, []);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) {
      toast.error('Synthesis engine offline. Check API connectivity.');
      return;
    }
    setDocument({ originalText: text, fileName });
    pushToHistory(text);
    setStatus(AppStatus.ANALYZING);
    setScanProgress({ percent: 0, step: 'Initializing Parallel Forensic Scan' });
    try {
      const result = await analyzeDocument(text, (percent, step) => setScanProgress({ percent, step }));
      setAnalysis(result);
      setScoreHistory([result.plagiarismScore]);
      setStatus(AppStatus.IDLE); 
      
      const newVersion: DocumentVersion = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        text,
        label: 'Original Audit',
        score: result.plagiarismScore
      };
      setVersions([newVersion]);
      
      Telemetry.logScan(text.length).catch(() => null);
    } catch (error: any) {
      let code = 'UNKNOWN_CORE_ERROR';
      let advice = 'Check your network connection and retry the scan.';
      
      if (error.message?.includes('429')) {
        code = 'RATE_LIMIT_EXCEEDED';
        advice = 'The neural clusters are busy. Please wait 60 seconds or switch to a different model tier.';
      } else if (error.message?.includes('403')) {
        code = 'API_KEY_EXPIRED';
        advice = 'The synthesis key has been revoked or expired. Please contact support or use a private key.';
      }

      setErrorContext({ code, message: error.message, actionableAdvice: advice });
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Analysis failed: ${error.message}`).catch(() => null);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!document || !analysis) return;

    setStatus(AppStatus.FIXING);
    const loadingToast = toast.loading('Synchronizing Identity DNA...');
    try {
      const activeProfile = profiles.find(p => p.id === activeProfileId);
      const styleSample = activeProfile?.sample;

      const result = await fixPlagiarism(
        document.originalText, 
        analysis.detectedIssues, 
        { ...options, styleProfileId: activeProfileId }, 
        analysis.sourcesFound || [], 
        (p) => setFixProgress(p),
        styleSample
      );
      
      setFixResult(result);
      pushToHistory(result.rewrittenText);
      setScoreHistory(prev => [...prev, result.newPlagiarismScore]);
      
      const newVersion: DocumentVersion = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        text: result.rewrittenText,
        label: `Humanized (${options.mode})`,
        score: result.newPlagiarismScore
      };
      setVersions(prev => [...prev, newVersion]);
      
      setStatus(AppStatus.COMPLETED);
      toast.dismiss(loadingToast);
      toast.success(`Analysis Complete: Output verified for submission.`, { icon: '✨' });
      Telemetry.logFix(document.originalText.length).catch(() => null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Forensic bypass failed. Check advice below.');
      setErrorContext({ 
        code: 'FIX_SYNTHESIS_FAILED', 
        message: error.message, 
        actionableAdvice: 'The text may be too complex for a single pass. Try reducing "Bypass Strength" or chunking the text.' 
      });
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Fix failed: ${error.message}`).catch(() => null);
    }
  };

  const handleUpdateRewrittenText = useCallback((newText: string) => {
      if (fixResult) {
        setFixResult(prev => prev ? { ...prev, rewrittenText: newText } : null);
        pushToHistory(newText);
      }
  }, [fixResult]);

  const handleReset = () => {
    localStorage.removeItem(SESSION_KEY);
    setDocument(null);
    setAnalysis(null);
    setFixResult(null);
    setScoreHistory([]);
    setVersions([]);
    setHistoryStack([]);
    setHistoryIndex(-1);
    setErrorContext(null);
    setStatus(AppStatus.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Restoring Secure Workspace...</span>
              </div>
          </div>
      );
  }

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? <AdminDashboard /> : (
        <div className="min-h-screen bg-[#f8fafc] font-sans overflow-x-hidden">
          <Header 
            credits={credits} 
            onOpenShop={() => setIsShopOpen(true)} 
          />
          
          <main className="py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
            
            {status === AppStatus.ERROR && errorContext && (
              <div className="max-w-3xl mx-auto py-10 sm:py-20 px-6 sm:px-12 bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl border border-rose-100 flex flex-col items-center text-center animate-in zoom-in duration-300">
                 <div className="p-4 sm:p-8 bg-rose-50 rounded-full mb-6 sm:mb-10">
                   <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-rose-500" />
                 </div>
                 <div className="bg-rose-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-6 font-heading">
                    {errorContext.code}
                 </div>
                 <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-6 font-heading">Neural Link Failed</h2>
                 <p className="text-base sm:text-xl text-slate-600 mb-8 sm:mb-12 leading-relaxed font-medium px-2 sm:px-0">
                    {errorContext.actionableAdvice}
                 </p>
                 <div className="w-full bg-slate-50 p-6 sm:p-8 rounded-[2rem] border border-slate-100 mb-10 text-left">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Logs</p>
                    <code className="text-[11px] sm:text-sm text-slate-500 font-mono break-all">{errorContext.message}</code>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                   <button 
                     onClick={handleReset}
                     className="px-8 sm:px-12 py-5 sm:py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 font-heading"
                   >
                     <RefreshCcw className="w-5 h-5" /> Return to Dashboard
                   </button>
                   <button 
                      onClick={() => window.open('https://linkedin.com/in/joseph-fashola', '_blank')}
                      className="px-8 sm:px-12 py-5 sm:py-6 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-4 font-heading"
                   >
                     Contact Engineer
                   </button>
                 </div>
              </div>
            )}

            {!document && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <div className="text-center mb-10 sm:mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-8">
                   <Zap className="w-4 h-4" /> V6.2 Pro Active
                </div>
                <h2 className="text-4xl sm:text-7xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-[0.85] font-heading">
                  Neutralize Institutional <br className="hidden sm:block"/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600">Surveillance Scanners</span>
                </h2>
                <p className="text-lg sm:text-2xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed px-4 sm:px-0">
                  Advanced adversarial humanization and linguistic DNA retention for the next generation of professional research.
                </p>

                <div className="mt-10 sm:mt-16 flex flex-col sm:flex-row justify-center gap-5 sm:gap-8 px-4">
                   <button 
                     onClick={() => setIsVaultOpen(true)}
                     className="group relative flex items-center justify-center gap-4 px-8 sm:px-10 py-5 sm:py-6 bg-slate-900 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all text-sm sm:text-base font-heading"
                   >
                     <Dna className="w-6 h-6 text-indigo-400 group-hover:rotate-180 transition-all duration-1000" />
                     {activeProfileId ? 'DNA Injected' : 'Capture Style DNA'}
                   </button>
                   
                   <button 
                     onClick={() => setIsLiveStudioOpen(true)}
                     className="flex items-center justify-center gap-4 px-8 sm:px-10 py-5 sm:py-6 bg-white border-2 border-slate-200 text-slate-900 rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all text-sm sm:text-base font-heading"
                   >
                      <Mic className="w-6 h-6 text-indigo-600" />
                      Live Studio Sync
                   </button>
                </div>
              </div>
            )}

            {status === AppStatus.ANALYZING && (
              <div className="flex flex-col items-center justify-center min-h-[400px] h-[60vh] sm:h-[600px] space-y-10 max-w-3xl mx-auto bg-white rounded-[3rem] sm:rounded-[4rem] shadow-2xl border border-indigo-100 animate-in zoom-in duration-300 px-8">
                <div className="relative">
                   <Cpu className="h-16 w-16 text-indigo-600 animate-pulse" />
                   <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-ping"></div>
                </div>
                <div className="text-center w-full max-w-md">
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter font-heading">{scanProgress.step}</h3>
                  <p className="text-xs sm:text-base text-slate-400 font-medium mt-3">Auditing across parallel adversarial threads...</p>
                  <div className="w-full h-4 sm:h-5 bg-slate-100 rounded-full mt-8 overflow-hidden border border-slate-50 p-1">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-500 shadow-[0_0_20px_rgba(79,70,229,0.5)]" style={{ width: `${scanProgress.percent}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {!document && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} />
            )}

            {document && analysis && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-1000">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-5 px-4 sm:px-10">
                   <div className="flex items-center gap-3 px-5 py-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <FileCheck className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs sm:text-sm font-black text-indigo-600 uppercase tracking-widest line-clamp-1">{document.fileName || 'Active Stream'}</span>
                   </div>
                   <div className="flex items-center gap-4 w-full sm:w-auto">
                     <button 
                       onClick={() => setIsHistoryOpen(true)}
                       className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 sm:px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm hover:border-indigo-500 transition-all font-heading"
                     >
                       <History className="w-5 h-5 text-indigo-500" />
                       Snapshots ({versions.length})
                     </button>
                     <div className="flex bg-slate-900 p-1.5 rounded-2xl gap-1.5 shadow-2xl">
                        <button 
                          onClick={handleUndo} 
                          disabled={historyIndex <= 0}
                          className="p-3 text-white hover:bg-white/10 rounded-xl disabled:opacity-20"
                          title="Undo (Cmd+Z)"
                        >
                           <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5 -scale-x-100" />
                        </button>
                        <button 
                          onClick={handleRedo} 
                          disabled={historyIndex >= historyStack.length - 1}
                          className="p-3 text-white hover:bg-white/10 rounded-xl disabled:opacity-20"
                          title="Redo (Cmd+Y)"
                        >
                           <RefreshCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                     </div>
                   </div>
                </div>

                <AnalysisView 
                  originalText={document.originalText}
                  analysis={analysis}
                  fixResult={fixResult}
                  status={status}
                  fixProgress={fixProgress}
                  onFix={handleFixPlagiarism}
                  onUpdateText={handleUpdateRewrittenText}
                  onReset={handleReset}
                  scoreHistory={scoreHistory}
                />
              </div>
            )}
          </main>

          {/* Version History Modal */}
          {isHistoryOpen && (
            <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-xl flex items-center justify-end p-0 sm:p-6">
               <div className="w-full sm:max-w-lg bg-white h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right sm:slide-in-from-bottom duration-500">
                  <div className="p-8 sm:p-10 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4 font-heading">
                       <History className="w-7 h-7 text-indigo-600" /> Studio History
                     </h3>
                     <button onClick={() => setIsHistoryOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all">
                       <X className="w-7 h-7 text-slate-400" />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 sm:space-y-6">
                     {versions.slice().reverse().map((v, i) => (
                       <div key={v.id} className="p-6 sm:p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] hover:border-indigo-400 transition-all cursor-pointer group" onClick={() => {
                          if (fixResult) setFixResult({ ...fixResult, rewrittenText: v.text, newPlagiarismScore: v.score });
                          else setDocument(prev => prev ? { ...prev, originalText: v.text } : null);
                          setIsHistoryOpen(false);
                          toast.success(`Restored snapshot: ${v.label}`);
                       }}>
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Audit #{versions.length - i}</span>
                                <span className="text-base font-black text-slate-900 uppercase font-heading">{v.label}</span>
                             </div>
                             <div className={`px-4 py-1 rounded-full text-[10px] font-black font-heading ${v.score < 5 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {v.score}% Risk
                             </div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium mb-5">{new Date(v.timestamp).toLocaleString()}</p>
                          <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-3 sm:opacity-0 sm:group-hover:opacity-100 transition-all font-heading">
                             Restore this instance <RefreshCcw className="w-3.5 h-3.5" />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {isVaultOpen && (
            <StyleDNAVault 
              profiles={profiles}
              activeProfileId={activeProfileId}
              onClose={() => setIsVaultOpen(false)}
              onProfileSelect={setActiveProfileId}
              onAddProfile={(p) => setProfiles(prev => [...prev, p])}
            />
          )}

          {isShopOpen && (
            <CreditShop 
              onClose={() => setIsShopOpen(false)}
              onPurchase={(amt) => setCredits(prev => prev + amt)}
            />
          )}

          {isLiveStudioOpen && (
            <LiveStudio 
              initialMode="IvyStealth"
              onCommit={(text) => {
                handleTextLoaded(text, 'Neural Studio Stream');
                setIsLiveStudioOpen(false);
              }}
              onClose={() => setIsLiveStudioOpen(false)}
            />
          )}
        </div>
      )}
    </>
  );
};

export default App;
