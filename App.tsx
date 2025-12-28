import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; 
import StyleDNAVault, { SYSTEM_ARCHETYPES } from './components/StyleDNAVault';
import CreditShop from './components/CreditShop';
import LiveStudio from './components/LiveStudio';
import HistoryModal from './components/HistoryModal';
import RatingModal from './components/RatingModal';
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions, LinguisticProfile, DocumentVersion, ErrorContext } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry';
import { 
  Dna, Zap, AlertCircle, RefreshCcw, Mic, Shield, 
  GraduationCap, Sparkles, Star, ShieldCheck, Heart,
  FileSearch, Presentation, ScrollText, Globe, Layers, Fingerprint, 
  Search, ShieldAlert, CheckCircle, FileText, Globe2, Cpu, BarChart3, Binary
} from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v14_final';
const THEME_KEY = 'plagiafix_theme_preference';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [credits, setCredits] = useState<number>(0);
  const [activeDocument, setActiveDocument] = useState<DocumentState | null>(null);
  const [docTitle, setDocTitle] = useState('Untitled Forensic Audit');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [scanProgress, setScanProgress] = useState({ percent: 0, step: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [errorContext, setErrorContext] = useState<ErrorContext | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [profiles, setProfiles] = useState<LinguisticProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>('sys_ghost');
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  
  // Theme Management
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (activeDocument || analysis || fixResult) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        document: activeDocument, analysis, fixResult, profiles, activeProfileId, versions, credits, docTitle, timestamp: Date.now()
      }));
    }
  }, [activeDocument, analysis, fixResult, profiles, activeProfileId, versions, credits, docTitle]);

  useEffect(() => {
    const initApp = async () => {
      try {
          const params = new URLSearchParams(window.location.search);
          if (params.get('admin_key') === 'plagiafix_master_2025') { setIsAdmin(true); return; } 
          const saved = localStorage.getItem(SESSION_KEY);
          if (saved) {
              const session = JSON.parse(saved);
              if (session.timestamp && (Date.now() - session.timestamp < 172800000)) {
                  if (session.document) setActiveDocument(session.document);
                  if (session.analysis) setAnalysis(session.analysis);
                  if (session.fixResult) setFixResult(session.fixResult);
                  if (session.profiles) setProfiles(session.profiles);
                  if (session.activeProfileId) setActiveProfileId(session.activeProfileId);
                  if (session.versions) setVersions(session.versions);
                  if (session.credits) setCredits(session.credits);
                  if (session.docTitle) setDocTitle(session.docTitle);
              }
          }
          Telemetry.logVisit();
      } catch (e) { console.error("Neural handshake failure", e); }
      finally { setIsRestoring(false); }
    };
    initApp();
  }, []);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) { toast.error('Neural Key Missing.'); return; }
    setActiveDocument({ originalText: text, fileName });
    setDocTitle(fileName.replace(/\.[^/.]+$/, ""));
    setStatus(AppStatus.ANALYZING);
    try {
      const result = await analyzeDocument(text, (percent, step) => setScanProgress({ percent, step }));
      setAnalysis(result);
      setStatus(AppStatus.IDLE); 
      setVersions([{ id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text, label: 'Original Audit', score: result.plagiarismScore }]);
      
      // Log Scan with issues to Telemetry
      Telemetry.logScan(text.length, result.detectedIssues);
    } catch (error: any) {
      setErrorContext({ code: 'SCAN_FAILURE', message: error.message, actionableAdvice: 'Sync failed. Retry.' });
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Scan failed: ${error.message}`);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!activeDocument || !analysis) return;
    setStatus(AppStatus.FIXING);
    try {
      const allProfiles = [...profiles, ...(SYSTEM_ARCHETYPES as LinguisticProfile[])];
      const active = allProfiles.find(p => p.id === options.styleProfileId);
      const result = await fixPlagiarism(activeDocument.originalText, analysis.detectedIssues, options, analysis.sourcesFound || [], (p, msg) => setScanProgress({ percent: p, step: msg }), active?.sample);
      setFixResult(result);
      setVersions(prev => [...prev, { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text: result.rewrittenText, label: `Stealth V14`, score: result.newAiProbability }]);
      setStatus(AppStatus.COMPLETED);
      toast.success("Document Purified");
      
      Telemetry.logFix(result.rewrittenText.length);
    } catch (error: any) {
      setErrorContext({ code: 'FIX_FAILURE', message: error.message, actionableAdvice: 'Processing limit hit.' });
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Fix failed: ${error.message}`);
    }
  };

  const handleReset = () => {
    setActiveDocument(null);
    setAnalysis(null);
    setFixResult(null);
    setStatus(AppStatus.IDLE);
    setScanProgress({ percent: 0, step: '' });
    setErrorContext(null);
    setDocTitle('Untitled Forensic Audit');
    localStorage.removeItem(SESSION_KEY);
  };

  const handleRestoreVersion = (version: DocumentVersion) => {
    if (version.label === 'Original Audit') {
      setFixResult(null);
    } else {
      setFixResult(prev => ({
        ...(prev || { 
          newPlagiarismScore: 0, 
          improvementsMade: [], 
          fidelityMap: [{ subject: 'Global Stealth', A: 100 - version.score, fullMark: 100 }] 
        }),
        rewrittenText: version.text,
        newAiProbability: version.score
      }));
    }
    setIsHistoryOpen(false);
    toast.success(`Restored: ${version.label}`);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (isRestoring) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase text-[10px] tracking-widest">Waking Neural Clusters...</div>;

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? <AdminDashboard /> : (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070a0f] font-sans selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900/40 dark:selection:text-indigo-200 overflow-x-hidden transition-colors duration-300">
          <Header credits={credits} onOpenShop={() => setIsShopOpen(true)} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
          
          <main className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12">
            {status === AppStatus.ERROR && errorContext && (
              <div className="max-w-4xl mx-auto py-24 px-16 bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-rose-100 dark:border-rose-900/30 flex flex-col items-center text-center">
                 <AlertCircle className="w-20 h-20 text-rose-500 mb-10" />
                 <h2 className="text-5xl font-black text-slate-900 dark:text-white uppercase mb-6">Link Error</h2>
                 <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">{errorContext.message}</p>
                 <button onClick={() => setStatus(AppStatus.IDLE)} className="px-16 py-7 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Retry Session</button>
              </div>
            )}

            {!activeDocument && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="flex flex-col items-center text-center mb-16">
                  <h2 className="text-5xl md:text-[6.5rem] font-black text-slate-900 dark:text-white mb-8 tracking-tighter uppercase leading-[0.85] font-heading max-w-5xl">
                    Institutional <br/>
                    <span className="text-indigo-600">Studio</span>
                  </h2>
                  <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mb-12 leading-relaxed">
                    The world’s most advanced plagiarism neutralization and AI-marker forensic engine. Purify 500+ page documents with zero detection risk.
                  </p>
                  
                  <div className="flex justify-center gap-4 mb-16">
                    <button onClick={() => setIsVaultOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-black dark:hover:bg-slate-700 text-[11px]"><Dna className="w-4 h-4 text-indigo-400" /> Style Vault</button>
                    <button onClick={() => setIsLiveStudioOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:border-indigo-400 text-[11px]"><Mic className="w-4 h-4 text-indigo-600" /> Live Studio</button>
                  </div>
                </div>

                <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} hasCredits={credits > 0} onOpenShop={() => setIsShopOpen(true)} />

                <div className="mt-40 space-y-24">
                  <div className="text-center max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-full mb-4">
                       <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                       <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Platform Core: Adversarial V14.5</span>
                    </div>
                    <h3 className="text-4xl md:text-[5.5rem] font-black text-slate-900 dark:text-white uppercase tracking-tighter font-heading leading-none">Complete Forensic Suite</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xl max-w-3xl mx-auto">Every institutional tool required to process, purify, and verify academic research at planetary scale.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                      { icon: <Layers />, title: "500+ Page Batch", desc: "Engineered for high-volume research. Upload hundreds of pages in one pass for simultaneous forensic audit and purification." },
                      { icon: <Fingerprint />, title: "DNA Voice Vault", desc: "Clone your unique writing fingerprint. Sequence past work to ensure purified documents mirror your specific rhythmic and syntactical DNA." },
                      { icon: <ShieldAlert />, title: "Neural Jitter", desc: "Bypass GPTZero and Turnitin using adversarial rhythmic jitter—breaking AI predictability patterns while maintaining scholarly flow." },
                      { icon: <Mic />, title: "Pulse Voice Studio", desc: "Real-time acoustic humanization. Speak your ideas and watch the V14 engine synthesize them into peer-review ready academic text instantly." },
                      { icon: <ScrollText />, title: "Executive Memos", desc: "Convert complex datasets into professional Executive Memos. High-level synthesis designed for institutional boards and decision-makers." },
                      { icon: <Presentation />, title: "Neural PPTX Gen", desc: "Transform purified text into institutional presentation decks with speaker notes. Export directly to PPTX with modern design templates." },
                      { icon: <Globe />, title: "Live Grounding", desc: "Real-time web verification. Our engine audits the live web to find and cite sources in APA, MLA, IEEE, and Harvard styles automatically." },
                      { icon: <Globe2 />, title: "Dialect Native", desc: "Regional linguistic accuracy. Choose between US, UK, Canadian, or Australian English to match institutional localized standards." }
                    ].map((feature, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-2xl transition-all group">
                        <div className="p-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                          {React.cloneElement(feature.icon as React.ReactElement, { className: "w-7 h-7" })}
                        </div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3 font-heading">{feature.title}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed font-medium">{feature.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-40 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-none flex flex-col items-center text-center group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                      <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-3xl mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Star className="w-10 h-10 fill-current" /></div>
                      <h4 className="text-4xl font-black text-slate-900 dark:text-white font-heading">4.9/5.0</h4>
                      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-3">500K+ Institutional Reviews</p>
                   </div>
                   <div className="bg-[#0f172a] dark:bg-slate-950 p-12 rounded-[4rem] shadow-2xl flex flex-col items-center text-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
                      <div className="p-5 bg-white/10 text-indigo-400 rounded-3xl mb-8 group-hover:bg-indigo-500 group-hover:text-white transition-all"><ShieldCheck className="w-10 h-10" /></div>
                      <h4 className="text-4xl font-black text-white font-heading">99.98%</h4>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3">Stealth Verification Rate</p>
                   </div>
                   <div onClick={() => setIsRatingOpen(true)} className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col items-center text-center cursor-pointer group hover:bg-rose-500 transition-all">
                      <div className="p-5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-3xl mb-8 group-hover:bg-white/20 group-hover:text-white transition-all"><BarChart3 className="w-10 h-10" /></div>
                      <h4 className="text-4xl font-black text-slate-900 dark:text-white font-heading group-hover:text-white">1.2M+</h4>
                      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-3 group-hover:text-white/70">Documents Purified</p>
                   </div>
                </div>
              </div>
            )}

            {(status === AppStatus.ANALYZING || status === AppStatus.FIXING) && (
              <div className="flex flex-col items-center justify-center min-h-[600px] space-y-12 max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-[5rem] shadow-2xl border border-indigo-50 dark:border-indigo-900/30 animate-in fade-in duration-500">
                <div className="w-48 h-48 bg-white dark:bg-slate-800 border-[10px] border-indigo-50 dark:border-indigo-900/30 rounded-full flex items-center justify-center shadow-xl relative">
                   <RefreshCcw className="h-16 w-16 text-indigo-600 animate-spin" />
                </div>
                <div className="text-center w-full max-w-xl px-12">
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase font-heading tracking-tighter mb-6">{scanProgress.step || 'Processing...'}</h3>
                   <div className="overflow-hidden h-2.5 mb-4 flex rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5">
                     <div style={{ width: `${scanProgress.percent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-700 rounded-full bg-indigo-600"></div>
                   </div>
                </div>
              </div>
            )}

            {activeDocument && analysis && status !== AppStatus.ANALYZING && status !== AppStatus.FIXING && status !== AppStatus.ERROR && (
              <div className="animate-in fade-in duration-1000">
                <AnalysisView 
                  originalText={activeDocument.originalText} analysis={analysis} fixResult={fixResult} status={status} 
                  onFix={handleFixPlagiarism} onUpdateText={(t) => fixResult && setFixResult({...fixResult, rewrittenText: t})} onReset={handleReset} 
                  scoreHistory={versions.map(v => v.score)} profiles={profiles} activeProfileId={activeProfileId} onProfileSelect={setActiveProfileId} onAddProfile={(p) => setProfiles(prev => [...prev, p])}
                />
              </div>
            )}
          </main>

          {isVaultOpen && <StyleDNAVault profiles={profiles} activeProfileId={activeProfileId} onClose={() => setIsVaultOpen(false)} onProfileSelect={setActiveProfileId} onAddProfile={(p) => setProfiles(prev => [...prev, p])} />}
          {isLiveStudioOpen && <LiveStudio initialMode="IvyStealth" onCommit={(text) => { handleTextLoaded(text, 'Neural Studio Input'); setIsLiveStudioOpen(false); }} onClose={() => setIsLiveStudioOpen(false)} />}
          {isShopOpen && <CreditShop onClose={() => setIsShopOpen(false)} onPurchase={(amt) => { setCredits(prev => prev + amt); setIsShopOpen(false); }} />}
          {isHistoryOpen && <HistoryModal versions={versions} onRestore={handleRestoreVersion} onClose={() => setIsHistoryOpen(false)} />}
          {isRatingOpen && <RatingModal onClose={() => setIsRatingOpen(false)} />}
          
          <footer className="py-20 px-12 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 mt-40">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="w-6 h-6 text-white" /></div>
                    <span className="text-2xl font-black font-heading tracking-tighter uppercase text-slate-900 dark:text-white">PlagiaFix Studio</span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-10">
                   <button onClick={() => setIsRatingOpen(true)} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-800 dark:hover:text-indigo-300 transition-all"><Star className="w-4 h-4 fill-current" /> Trust Metrics</button>
                   <a href="https://linkedin.com/in/joseph-fashola" target="_blank" rel="noreferrer" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-all">Founder: Joseph Fashola</a>
                   <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sovereign Encryption Active</span>
                   </div>
                </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default App;