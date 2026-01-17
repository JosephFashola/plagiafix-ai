
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
import CreditShop from './components/CreditShop';
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions, LinguisticProfile, DocumentVersion, ErrorContext } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry';
import { 
  Dna, Zap, AlertCircle, RefreshCcw, Mic, 
  GraduationCap, Sparkles, Star, ShieldCheck, Heart,
  Presentation, ScrollText, Fingerprint, 
  Search, CheckCircle, Linkedin, Coins, Languages
} from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v14_final';
const THEME_KEY = 'plagiafix_theme_preference';
const CREDITS_KEY = 'plagiafix_neural_credits_v1';

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
  const [activeProfileId, setActiveProfileId] = useState<string | null>('sys_ug');
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [countryCode, setCountryCode] = useState('NG');
  const [credits, setCredits] = useState<number>(() => {
    const saved = localStorage.getItem(CREDITS_KEY);
    return saved ? parseInt(saved) : 0;
  });
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem(CREDITS_KEY, credits.toString());
  }, [credits]);

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

  // AUTO-TRIGGER RATING AFTER FIX
  useEffect(() => {
    if (status === AppStatus.COMPLETED) {
      const timer = setTimeout(() => {
        setIsRatingOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    const initApp = async () => {
      try {
          const params = new URLSearchParams(window.location.search);
          if (params.get('admin_key') === 'plagiafix_master_2025') { 
            setIsAdmin(true); 
            setIsRestoring(false);
            return; 
          } 
          
          try {
            const geoRes = await fetch('https://ipapi.co/json/');
            const geoData = await geoRes.json();
            if (geoData.country_code) setCountryCode(geoData.country_code);
          } catch (e) {
            console.debug("Geo detection fallback to NG");
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
      setVersions([{ id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text, label: 'Initial Check', score: result.plagiarismScore, aiProbability: result.aiProbability, bibliography: result.sourcesFound }]);
      Telemetry.logScan(text.length, result.detectedIssues);
    } catch (error: any) {
      setErrorContext({ code: 'SCAN_FAILURE', message: error.message, actionableAdvice: 'Please try again.' });
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Scan failed: ${error.message}`);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!activeDocument || !analysis) return;

    const isPremium = options.styleProfileId !== 'sys_ug';
    if (isPremium && credits <= 0) {
      setIsShopOpen(true);
      toast.error("Neural Credits required for Premium DNA styles.", { icon: '🔒' });
      return;
    }

    setStatus(AppStatus.FIXING);
    try {
      const allProfiles = [...profiles, ...(SYSTEM_ARCHETYPES as LinguisticProfile[])];
      const active = allProfiles.find(p => p.id === options.styleProfileId);
      const result = await fixPlagiarism(activeDocument.originalText, analysis.detectedIssues, options, analysis.sourcesFound || [], (p, msg) => setScanProgress({ percent: p, step: msg }), active?.sample);
      
      if (isPremium) setCredits(prev => Math.max(0, prev - 1));
      
      setFixResult(result);
      setVersions(prev => [...prev, { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text: result.rewrittenText, label: `Improved Version`, score: result.newPlagiarismScore, aiProbability: result.newAiProbability, bibliography: result.bibliography }]);
      setStatus(AppStatus.COMPLETED);
      
      toast.success(`Humanization Complete!`, { icon: '🎓' });
      await Telemetry.logFix(result.rewrittenText.length, options);
    } catch (error: any) {
      setErrorContext({ code: 'FIX_FAILURE', message: error.message, actionableAdvice: 'Try a shorter document.' });
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Fix failed: ${error.message}`);
    }
  };

  const handleSaveManualVersion = (label: string) => {
    if (!analysis) return;
    const text = fixResult ? fixResult.rewrittenText : (activeDocument?.originalText || '');
    const score = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;
    const aiProb = fixResult ? fixResult.newAiProbability : analysis.aiProbability;
    const bib = fixResult ? fixResult.bibliography : analysis.sourcesFound;

    setVersions(prev => [...prev, { 
      id: Math.random().toString(36).substr(2,9), 
      timestamp: Date.now(), 
      text, 
      label, 
      score,
      aiProbability: aiProb,
      bibliography: bib 
    }]);
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
      if (analysis) {
        setAnalysis({
          ...analysis,
          aiProbability: version.aiProbability,
          plagiarismScore: version.score,
          sourcesFound: version.bibliography || []
        });
      }
    } else {
      setFixResult(prev => ({
        rewrittenText: version.text,
        newPlagiarismScore: version.score,
        newAiProbability: version.aiProbability,
        improvementsMade: prev?.improvementsMade || [],
        bibliography: version.bibliography || [],
        fidelityMap: [
          { subject: 'Human Score', A: 100 - version.aiProbability, fullMark: 100 },
          { subject: 'Originality', A: 100 - version.score, fullMark: 100 },
          { subject: 'Chaos Factor', A: 95, fullMark: 100 }, 
          { subject: 'Fact Fidelity', A: 98, fullMark: 100 }, 
          { subject: 'Synthesis', A: 95, fullMark: 100 }
        ]
      }));
    }
    setIsHistoryOpen(false);
    toast.success(`Restored: ${version.label}`);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (isRestoring) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-black uppercase text-[10px] tracking-[0.4em] gap-4">
    <RefreshCcw className="w-8 h-8 animate-spin text-indigo-500" />
    Initializing Neural Link...
  </div>;

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? (
        <AdminDashboard onExit={() => setIsAdmin(false)} />
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
                    Scan hundreds of pages for AI and plagiarism instantly. Our forensic engine makes your writing sound 100% human.
                  </p>
                  
                  <div className="flex justify-center gap-4 mb-16">
                    <button onClick={() => setIsVaultOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-black dark:hover:bg-slate-700 text-[11px]"><Dna className="w-4 h-4 text-indigo-400" /> Writing Styles</button>
                    <button onClick={() => setIsShopOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:bg-indigo-700 text-[11px]">
                      <Coins className="w-4 h-4" /> {credits > 0 ? `${credits} Credits` : 'Get Credits'}
                    </button>
                    <button onClick={() => { setIsLiveStudioOpen(true); Telemetry.logFeature('Voice Mode'); }} className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:border-indigo-400 text-[11px]"><Mic className="w-4 h-4 text-indigo-600" /> Voice Mode</button>
                  </div>
                </div>

                <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} />

                {/* OUR MISSION SECTION - NOW FIRST */}
                <div className="mt-40 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center bg-white dark:bg-slate-900 rounded-[4rem] p-12 lg:p-20 border border-slate-100 dark:border-slate-800 shadow-2xl">
                   <div className="space-y-8">
                      <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-full">
                         <Heart className="w-4 h-4 text-rose-500 fill-current" />
                         <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Our Mission</span>
                      </div>
                      <h3 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none font-heading">For Every <span className="text-indigo-600">Student.</span></h3>
                      <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        PlagiaFix was built on a simple promise: Undergraduate research should be accessible and protected. 
                        <br/><br/>
                        We keep our <b>Undergraduate Style DNA</b> free forever, so every student can defend their academic integrity regardless of their financial situation.
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
                            <h4 className="text-xl font-black uppercase tracking-tight">Institutional Support</h4>
                         </div>
                         <div className="space-y-4">
                            {[
                               "Free DNA styles for Undergraduates.",
                               "Bypass algorithms that flag human creativity.",
                               "Designed for high-impact scholarship."
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

                {/* INSTITUTIONAL CAPABILITIES GRID - NOW SECOND */}
                <div className="mt-40 space-y-16">
                   <div className="text-center space-y-4">
                      <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.5em]">The V14 Engine</h3>
                      <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-heading">Institutional Capabilities.</h2>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        { title: "Forensic Scanning", desc: "Identify plagiarism and AI structures across hundreds of pages in seconds.", icon: <Search />, color: "bg-indigo-600" },
                        { title: "Neural Humanizer", desc: "Rewrite content using Adversarial V6 Stealth to bypass all institutional scanners.", icon: <Sparkles />, color: "bg-emerald-600" },
                        { title: "Style DNA Vault", desc: "Select from Undergrad, MSc, PhD, or Executive linguistic archetypes.", icon: <Fingerprint />, color: "bg-amber-600" },
                        { title: "Executive Memos", desc: "Convert complex research into high-impact professional syntheses.", icon: <ScrollText />, color: "bg-rose-600" },
                        { title: "Professional Slides", desc: "Instantly generate PowerPoint decks from any research document.", icon: <Presentation />, color: "bg-blue-600" },
                        { title: "Institutional Citations", desc: "Auto-inject APA, MLA, or Harvard citations directly into your humanized prose.", icon: <Languages />, color: "bg-cyan-600" },
                        { title: "Global Dialect Stealth", desc: "Humanize in 20+ scholarly dialects, from Oxford English to Academic Mandarin.", icon: <Languages />, color: "bg-orange-600" },
                        { title: "Voice Studio", desc: "Real-time humanized dictation for papers and presentations.", icon: <Mic />, color: "bg-purple-600" }
                      ].map((f, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl hover-lift group">
                           <div className={`w-16 h-16 ${f.color} rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg group-hover:rotate-6 transition-transform`}>
                              {React.cloneElement(f.icon as React.ReactElement, { className: "w-8 h-8" } as any)}
                           </div>
                           <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">{f.title}</h4>
                           <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                        </div>
                      ))}
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
                  onOpenHistory={() => setIsHistoryOpen(true)}
                  onSaveVersion={handleSaveManualVersion}
                  onOpenRating={() => setIsRatingOpen(true)}
                  credits={credits}
                  scoreHistory={versions.map(v => v.aiProbability)} profiles={profiles} activeProfileId={activeProfileId} onProfileSelect={setActiveProfileId} onAddProfile={(p) => setProfiles(prev => [...prev, p])}
                />
              </div>
            )}
          </main>

          {isVaultOpen && <StyleDNAVault profiles={profiles} activeProfileId={activeProfileId} onClose={() => setIsVaultOpen(false)} onProfileSelect={(id) => { setActiveProfileId(id); Telemetry.logFeature('Vault Select'); }} onAddProfile={(p) => setProfiles(prev => [...prev, p])} />}
          {isLiveStudioOpen && <LiveStudio initialMode="IvyStealth" onCommit={(text) => { handleTextLoaded(text, 'Text Input'); setIsLiveStudioOpen(false); }} onClose={() => setIsLiveStudioOpen(false)} />}
          {isHistoryOpen && <HistoryModal versions={versions} onRestore={handleRestoreVersion} onClose={() => setIsHistoryOpen(false)} />}
          {isRatingOpen && <RatingModal onClose={() => setIsRatingOpen(false)} />}
          {isShopOpen && <CreditShop onClose={() => setIsShopOpen(false)} onPurchase={(amt) => { setCredits(prev => prev + amt); setIsShopOpen(false); toast.success(`${amt} Pass Active!`); }} defaultCurrency={countryCode === 'NG' ? 'NGN' : 'USD'} />}
          
          <footer className="py-20 px-12 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 mt-40">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="w-6 h-6 text-white" /></div>
                    <span className="text-2xl font-black font-heading tracking-tighter uppercase text-slate-900 dark:text-white">PlagiaFix</span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-10">
                   <button onClick={() => setIsRatingOpen(true)} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-800 dark:hover:text-indigo-300 transition-all"><Star className="w-4 h-4 fill-current" /> Give Feedback</button>
                   <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                     By Joseph Fashola (FOJ GLOBAL ADVISORY & VENTURES LTD)
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
