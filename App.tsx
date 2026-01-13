
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; 
import StyleDNAVault, { SYSTEM_ARCHETYPES } from './components/StyleDNAVault';
import LiveStudio from './components/LiveStudio';
import HistoryModal from './components/HistoryModal';
import RatingModal from './components/RatingModal';
import LaunchBanner from './components/LaunchBanner';
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions, LinguisticProfile, DocumentVersion, ErrorContext } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry';
import { 
  Dna, Zap, AlertCircle, RefreshCcw, Mic, Shield, 
  GraduationCap, Sparkles, Star, ShieldCheck, Heart,
  FileSearch, Presentation, ScrollText, Globe, Layers, Fingerprint, 
  Search, ShieldAlert, CheckCircle, FileText, Globe2, Cpu, BarChart3, Binary, User, Linkedin, Twitter, ArrowRight, MousePointer2, Monitor, ShieldCheck as ShieldIcon,
  Lock, Settings, Eye
} from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v14_final';
const THEME_KEY = 'plagiafix_theme_preference';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [activeDocument, setActiveDocument] = useState<DocumentState | null>(null);
  const [docTitle, setDocTitle] = useState('My Document Analysis');
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
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  
  // Admin state (accessible via URL param only now)
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  
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
        document: activeDocument, analysis, fixResult, profiles, activeProfileId, versions, docTitle, timestamp: Date.now()
      }));
    }
  }, [activeDocument, analysis, fixResult, profiles, activeProfileId, versions, docTitle]);

  useEffect(() => {
    const initApp = async () => {
      try {
          const params = new URLSearchParams(window.location.search);
          if (params.get('admin_key') === 'plagiafix_master_2025') { 
            setIsAdmin(true); 
            setAdminUnlocked(true);
            setIsRestoring(false);
            return; 
          } 
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
                  if (session.docTitle) setDocTitle(session.docTitle);
              }
          }
          Telemetry.logVisit();
      } catch (e) { 
        console.error("Connection failure", e); 
      } finally { 
        setIsRestoring(false); 
      }
    };
    initApp();
  }, []);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) { toast.error('API Key Missing.'); return; }
    setActiveDocument({ originalText: text, fileName });
    setDocTitle(fileName.replace(/\.[^/.]+$/, ""));
    setStatus(AppStatus.ANALYZING);
    try {
      const result = await analyzeDocument(text, (percent, step) => setScanProgress({ percent, step }));
      setAnalysis(result);
      setStatus(AppStatus.IDLE); 
      setVersions([{ id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text, label: 'Initial Check', score: result.plagiarismScore }]);
      Telemetry.logScan(text.length, result.detectedIssues);
    } catch (error: any) {
      setErrorContext({ code: 'SCAN_FAILURE', message: error.message, actionableAdvice: 'Please try again.' });
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
      setVersions(prev => [...prev, { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text: result.rewrittenText, label: `Improved Version`, score: result.newAiProbability }]);
      setStatus(AppStatus.COMPLETED);
      
      toast.success(`Humanization Complete! All features are free.`, { icon: '🎓' });
      
      Telemetry.logFix(result.rewrittenText.length);
    } catch (error: any) {
      setErrorContext({ code: 'FIX_FAILURE', message: error.message, actionableAdvice: 'Try a shorter document.' });
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
    setDocTitle('My Document Analysis');
    localStorage.removeItem(SESSION_KEY);
  };

  const handleRestoreVersion = (version: DocumentVersion) => {
    if (version.label === 'Initial Check') {
      setFixResult(null);
    } else {
      setFixResult(prev => ({
        ...(prev || { 
          newPlagiarismScore: 0, 
          improvementsMade: [], 
          fidelityMap: [{ subject: 'Human Score', A: 100 - version.score, fullMark: 100 }] 
        }),
        rewrittenText: version.text,
        newAiProbability: version.score
      }));
    }
    setIsHistoryOpen(false);
    toast.success(`Restored: ${version.label}`);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (isRestoring) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black uppercase text-[10px] tracking-[0.4em] gap-4">
    <RefreshCcw className="w-8 h-8 animate-spin text-indigo-500" />
    Initializing...
  </div>;

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? (
        <div className="relative">
          <AdminDashboard />
          <button 
            onClick={() => setIsAdmin(false)}
            className="fixed bottom-10 right-10 z-[200] px-6 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl border border-indigo-100 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
          >
            <Eye className="w-4 h-4" /> Exit Admin View
          </button>
        </div>
      ) : (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070a0f] font-sans selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900/40 dark:selection:text-indigo-200 overflow-x-hidden transition-colors duration-300">
          <LaunchBanner />
          <Header darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
          
          <main className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12">
            {status === AppStatus.ERROR && errorContext && (
              <div className="max-w-4xl mx-auto py-24 px-16 bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-rose-100 dark:border-rose-900/30 flex flex-col items-center text-center">
                 <AlertCircle className="w-20 h-20 text-rose-500 mb-10" />
                 <h2 className="text-5xl font-black text-slate-900 dark:text-white uppercase mb-6">Error</h2>
                 <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">{errorContext.message}</p>
                 <button onClick={() => setStatus(AppStatus.IDLE)} className="px-16 py-7 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Try Again</button>
              </div>
            )}

            {(!activeDocument || !analysis) && status !== AppStatus.ANALYZING && status !== AppStatus.FIXING && status !== AppStatus.ERROR && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="flex flex-col items-center text-center mb-16">
                  <h2 className="text-5xl md:text-[6.5rem] font-black text-slate-900 dark:text-white mb-8 tracking-tighter uppercase leading-[0.85] font-heading max-w-5xl">
                    Free Smart Writing <br/>
                    <span className="text-indigo-600">Assistant</span>
                  </h2>
                  <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mb-12 leading-relaxed">
                    Scan hundreds of pages for AI and plagiarism instantly. Our forensic engine makes your writing sound 100% human, for free.
                  </p>
                  
                  <div className="flex justify-center gap-4 mb-16">
                    <button onClick={() => setIsVaultOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-black dark:hover:bg-slate-700 text-[11px]"><Dna className="w-4 h-4 text-indigo-400" /> Writing Styles</button>
                    <button onClick={() => setIsLiveStudioOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:border-indigo-400 text-[11px]"><Mic className="w-4 h-4 text-indigo-600" /> Voice Mode</button>
                  </div>
                </div>

                <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} />

                <div className="mt-40 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center bg-white dark:bg-slate-900 rounded-[4rem] p-12 lg:p-20 border border-slate-100 dark:border-slate-800 shadow-2xl">
                   <div className="space-y-8">
                      <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-full">
                         <Heart className="w-4 h-4 text-rose-500 fill-current" />
                         <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">The Maker's Story</span>
                      </div>
                      <h3 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none font-heading">Why I Built <span className="text-indigo-600">PlagiaFix.</span></h3>
                      <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Hi, I'm Joseph. I noticed that high-performing writers and non-native speakers were being unfairly flagged by AI detectors just for writing structured English.
                        <br/><br/>
                        I built this tool to level the playing field. It uses advanced "Style DNA" matching to ensure your hard work stays your own, protecting your academic and creative reputation from robotic scanners.
                      </p>
                      <div className="flex items-center gap-6 pt-4">
                         <a href="https://linkedin.com/in/joseph-fashola" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all">
                            <Linkedin className="w-4 h-4" /> Connect with Joseph
                         </a>
                      </div>
                   </div>
                   <div className="relative">
                      <div className="absolute inset-0 bg-indigo-600 rounded-[3rem] rotate-3 opacity-10"></div>
                      <div className="relative bg-slate-900 rounded-[3rem] p-12 text-white space-y-8 shadow-2xl overflow-hidden border border-white/5">
                         <div className="absolute top-0 right-0 p-8 opacity-10"><Dna className="w-40 h-40" /></div>
                         <div className="flex items-center gap-4">
                            <ShieldCheck className="w-8 h-8 text-indigo-400" />
                            <h4 className="text-xl font-black uppercase tracking-tight">Our Mission</h4>
                         </div>
                         <div className="space-y-4">
                            {[
                               "Defend your academic and professional integrity.",
                               "Bypass algorithms that flag human creativity.",
                               "Provide free, high-grade tools for everyone."
                            ].map((item, i) => (
                               <div key={i} className="flex items-center gap-4 text-slate-400 font-bold text-sm">
                                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                  {item}
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-40 space-y-16">
                  <div className="text-center max-w-4xl mx-auto space-y-4">
                    <h2 className="text-4xl lg:text-[4.5rem] font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none font-heading">
                      THE V14 ENGINE ECOSYSTEM
                    </h2>
                    <p className="text-sm md:text-md text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed max-w-2xl mx-auto">
                      Professional tools to help you write, clean, and present research at scale. Completely free for everyone.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4">
                    {[
                      {
                        title: "FORENSIC PURGE",
                        description: "Scan documents up to 500+ pages. Our engine cleans up plagiarism and makes your writing flow better while keeping your facts 100% accurate.",
                        icon: <Search className="w-6 h-6 text-white" />
                      },
                      {
                        title: "LINGUISTIC DNA",
                        description: "Mirror your unique writing style perfectly. Upload your past work to the DNA Vault so every paper you fix sounds exactly like you.",
                        icon: <Fingerprint className="w-6 h-6 text-white" />
                      },
                      {
                        title: "ADVERSARIAL BYPASS",
                        description: "Built for 0% detection. We remove the hidden 'patterns' that tools like Turnitin and GPTZero look for, making your work completely human.",
                        icon: <ShieldIcon className="w-6 h-6 text-white" />
                      },
                      {
                        title: "SYNTHESIS MEMOS",
                        description: "Turn giant research papers into short professional memos instantly. Perfect for busy students and executive review boards.",
                        icon: <FileText className="w-6 h-6 text-white" />
                      },
                      {
                        title: "NEURAL SLIDES",
                        description: "One-click slide creation. Our engine takes your document and builds a full presentation with bullet points and speaker notes for you.",
                        icon: <Monitor className="w-6 h-6 text-white" />
                      },
                      {
                        title: "LIVE GROUNDING",
                        description: "Smart citations. Every document we improve gets real citations from the web in the styles you need (APA, MLA, Harvard).",
                        icon: <Globe className="w-6 h-6 text-white" />
                      }
                    ].map((feature, i) => (
                      <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] p-12 flex flex-col items-center text-center shadow-sm hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-500">
                        <div className="bg-slate-900 dark:bg-slate-800 p-5 rounded-2xl mb-8 shadow-xl">
                          {feature.icon}
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 font-heading">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-[1.8] max-w-sm">
                          {feature.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm border border-slate-50 dark:border-slate-800">
                       <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-2">
                          <Star className="w-6 h-6 text-indigo-600 dark:text-indigo-400 fill-current" />
                       </div>
                       <h5 className="text-4xl font-black text-slate-900 dark:text-white font-heading">4.9/5.0</h5>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INSTITUTIONAL RATING</p>
                    </div>

                    <div className="bg-[#0f172a] rounded-[3rem] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl relative overflow-hidden group">
                       <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
                       <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-2 border border-white/10 relative z-10">
                          <ShieldCheck className="w-6 h-6 text-indigo-400" />
                       </div>
                       <h5 className="text-4xl font-black text-white font-heading relative z-10">99.9%</h5>
                       <p className="text-[10px] font-black text-indigo-300/60 uppercase tracking-widest relative z-10">STEALTH SUCCESS RATE</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm border border-slate-50 dark:border-slate-800">
                       <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-2">
                          <Heart className="w-6 h-6 text-rose-500 fill-current" />
                       </div>
                       <h5 className="text-3xl font-black text-slate-900 dark:text-white font-heading">Join Flow</h5>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RATE OUR V14 ENGINE</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 dark:bg-indigo-600 rounded-[4rem] p-12 lg:p-20 text-white flex flex-col lg:flex-row items-center justify-between gap-12 overflow-hidden relative shadow-2xl shadow-indigo-500/20">
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><ShieldCheck className="w-64 h-64" /></div>
                    <div className="space-y-6 relative z-10 max-w-2xl">
                       <h3 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none font-heading">Sovereign Protection for the <span className="text-indigo-400 dark:text-indigo-200">Modern Scholar.</span></h3>
                       <p className="text-lg text-indigo-100/70 font-medium">
                         Don't let algorithms define your intelligence. Start using the same forensic tools that top researchers use to protect their work.
                       </p>
                    </div>
                    <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 relative z-10 group">
                      Get Started Now <MousePointer2 className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
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
          {isLiveStudioOpen && <LiveStudio initialMode="IvyStealth" onCommit={(text) => { handleTextLoaded(text, 'Text Input'); setIsLiveStudioOpen(false); }} onClose={() => setIsLiveStudioOpen(false)} />}
          {isHistoryOpen && <HistoryModal versions={versions} onRestore={handleRestoreVersion} onClose={() => setIsHistoryOpen(false)} />}
          {isRatingOpen && <RatingModal onClose={() => setIsRatingOpen(false)} />}
          
          <footer className="py-20 px-12 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 mt-40">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="w-6 h-6 text-white" /></div>
                    <span className="text-2xl font-black font-heading tracking-tighter uppercase text-slate-900 dark:text-white">PlagiaFix</span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-10">
                   {adminUnlocked && (
                     <button 
                       onClick={() => setIsAdmin(true)}
                       className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 uppercase tracking-widest transition-all animate-in fade-in slide-in-from-left-4"
                     >
                       <Settings className="w-3.5 h-3.5" /> Node Admin
                     </button>
                   )}
                   <button onClick={() => setIsRatingOpen(true)} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-800 dark:hover:text-indigo-300 transition-all"><Star className="w-4 h-4 fill-current" /> Give Feedback</button>
                   <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                     By Joseph Fashola
                   </span>
                </div>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default App;
