
import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; 
import StyleDNAVault from './components/StyleDNAVault';
import CreditShop from './components/CreditShop';
import LiveStudio from './components/LiveStudio';
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions, LinguisticProfile } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry'; 
import { Loader2, Cpu, Dna, Briefcase, Zap, AlertCircle, RefreshCcw, Coins, Mic, Heart } from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v4';

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
  
  const [profiles, setProfiles] = useState<LinguisticProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [credits, setCredits] = useState(0);

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
                  if (session.document) setDocument(session.document);
                  if (session.analysis) setAnalysis(session.analysis);
                  if (session.fixResult) setFixResult(session.fixResult);
                  if (session.scoreHistory) setScoreHistory(session.scoreHistory);
                  if (session.profiles) setProfiles(session.profiles);
                  if (session.activeProfileId) setActiveProfileId(session.activeProfileId);
                  if (session.credits !== undefined) setCredits(session.credits);
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

  useEffect(() => {
      if (isAdmin || isRestoring) return;
      const sessionData = { 
        timestamp: Date.now(), 
        status, document, analysis, fixResult, scoreHistory, 
        profiles, activeProfileId, credits 
      };
      if (document || analysis || profiles.length > 0) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }
  }, [status, document, analysis, fixResult, scoreHistory, isAdmin, profiles, activeProfileId, isRestoring, credits]);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) {
      toast.error('Synthesis engine offline. Check API connectivity.');
      return;
    }
    setDocument({ originalText: text, fileName });
    setStatus(AppStatus.ANALYZING);
    setScanProgress({ percent: 0, step: 'Initializing Neural Scan' });
    try {
      const result = await analyzeDocument(text, (percent, step) => setScanProgress({ percent, step }));
      setAnalysis(result);
      setScoreHistory([result.plagiarismScore]);
      setStatus(AppStatus.IDLE); 
      Telemetry.logScan(text.length).catch(() => null);
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed.');
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
      setScoreHistory(prev => [...prev, result.newPlagiarismScore]);
      setStatus(AppStatus.COMPLETED);
      toast.dismiss(loadingToast);
      toast.success(`Analysis Complete: High-stealth output ready.`, { icon: '✨' });
      Telemetry.logFix(document.originalText.length).catch(() => null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Fix failed.');
      setStatus(AppStatus.IDLE); 
      Telemetry.logError(`Fix failed: ${error.message}`).catch(() => null);
    }
  };

  const handleUpdateRewrittenText = useCallback((newText: string) => {
      if (fixResult) setFixResult(prev => prev ? { ...prev, rewrittenText: newText } : null);
  }, [fixResult]);

  const handleReset = () => {
    localStorage.removeItem(SESSION_KEY);
    setDocument(null);
    setAnalysis(null);
    setFixResult(null);
    setScoreHistory([]);
    setStatus(AppStatus.IDLE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addProfile = (p: LinguisticProfile) => {
    setProfiles(prev => [...prev, p]);
    setActiveProfileId(p.id);
  };

  const purchaseCredits = (amount: number) => {
    setCredits(prev => prev + amount);
    Telemetry.addLogLocal('CREDIT_TOPUP', `Donation: Added ${amount} Impact points.`).catch(() => null);
  };

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Waking Studio Engine...</span>
              </div>
          </div>
      );
  }

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? <AdminDashboard /> : (
        <div className="min-h-screen bg-[#fafafa] font-sans">
          <Header credits={credits} onOpenShop={() => setIsShopOpen(true)} />
          <main className="py-12 px-4 sm:px-6 lg:px-8">
            
            {status === AppStatus.ERROR && (
              <div className="max-w-2xl mx-auto py-20 px-10 bg-white rounded-[3rem] shadow-2xl border border-rose-100 flex flex-col items-center text-center animate-in zoom-in duration-300">
                 <div className="p-6 bg-rose-50 rounded-full mb-8">
                   <AlertCircle className="w-12 h-12 text-rose-500" />
                 </div>
                 <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Neural Scan Interrupted</h2>
                 <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                   The synthesis engine encountered an unexpected roadblock.
                 </p>
                 <button 
                   onClick={handleReset}
                   className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3"
                 >
                   <RefreshCcw className="w-5 h-5" /> Return to Dashboard
                 </button>
              </div>
            )}

            {!document && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-8">
                   <Zap className="w-3.5 h-3.5" /> Free & Open Research Platform
                </div>
                <h2 className="text-6xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-[0.9]">
                  Capture Your <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Linguistic DNA</span>
                </h2>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                  Navigate institutional scrutiny with the world's most advanced identity-retained humanizer. No subscription required.
                </p>

                <div className="mt-12 flex flex-wrap justify-center gap-6">
                   <button 
                     onClick={() => setIsVaultOpen(true)}
                     className="group relative flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all"
                   >
                     <Dna className="w-5 h-5 text-indigo-400 group-hover:rotate-45 transition-all duration-700" />
                     {activeProfileId ? 'Update DNA Vault' : 'Inject Style DNA'}
                   </button>
                   
                   <button 
                     onClick={() => setIsLiveStudioOpen(true)}
                     className="flex items-center gap-3 px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                   >
                      <Mic className="w-5 h-5" />
                      Live Studio Sync
                   </button>

                   <button 
                     onClick={() => setIsShopOpen(true)}
                     className="flex items-center gap-3 px-8 py-5 bg-white border border-slate-200 text-slate-900 rounded-3xl font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all group"
                   >
                      <Heart className="w-5 h-5 text-rose-500 group-hover:scale-125 transition-transform" />
                      Support Us
                   </button>
                </div>
              </div>
            )}

            {status === AppStatus.ANALYZING && (
              <div className="flex flex-col items-center justify-center h-[500px] space-y-8 max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-indigo-100 animate-in zoom-in duration-300">
                <div className="relative">
                   <Cpu className="h-12 w-12 text-indigo-600 animate-pulse" />
                   <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-ping"></div>
                </div>
                <div className="text-center w-full px-12">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{scanProgress.step}</h3>
                  <div className="w-full h-4 bg-slate-100 rounded-full mt-6 overflow-hidden border border-slate-50">
                    <div className="h-full bg-indigo-600 transition-all duration-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${scanProgress.percent}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {!document && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} />
            )}

            {document && analysis && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
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
            )}
          </main>

          {isVaultOpen && (
            <StyleDNAVault 
              profiles={profiles}
              activeProfileId={activeProfileId}
              onClose={() => setIsVaultOpen(false)}
              onProfileSelect={setActiveProfileId}
              onAddProfile={addProfile}
            />
          )}

          {isShopOpen && (
            <CreditShop 
              onClose={() => setIsShopOpen(false)}
              onPurchase={purchaseCredits}
            />
          )}

          {isLiveStudioOpen && (
            <LiveStudio 
              initialMode="IvyStealth"
              onCommit={(text) => {
                handleTextLoaded(text, 'Live Studio Session');
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
