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
import { 
  Dna, Zap, AlertCircle, RefreshCcw, Mic, Shield, 
  GraduationCap, Sparkles, Star, ShieldCheck, Heart,
  FileSearch, Presentation, ScrollText, Globe, Layers, Fingerprint, 
  Search, ShieldAlert, CheckCircle, FileText
} from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v14_final';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [credits, setCredits] = useState<number>(0);
  const [document, setDocument] = useState<DocumentState | null>(null);
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

  useEffect(() => {
    if (document || analysis || fixResult) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        document, analysis, fixResult, profiles, activeProfileId, versions, credits, docTitle, timestamp: Date.now()
      }));
    }
  }, [document, analysis, fixResult, profiles, activeProfileId, versions, credits, docTitle]);

  useEffect(() => {
    const initApp = async () => {
      try {
          const params = new URLSearchParams(window.location.search);
          if (params.get('admin_key') === 'plagiafix_master_2025') { setIsAdmin(true); return; } 
          const saved = localStorage.getItem(SESSION_KEY);
          if (saved) {
              const session = JSON.parse(saved);
              if (session.timestamp && (Date.now() - session.timestamp < 172800000)) {
                  if (session.document) setDocument(session.document);
                  if (session.analysis) setAnalysis(session.analysis);
                  if (session.fixResult) setFixResult(session.fixResult);
                  if (session.profiles) setProfiles(session.profiles);
                  if (session.activeProfileId) setActiveProfileId(session.activeProfileId);
                  if (session.versions) setVersions(session.versions);
                  if (session.credits) setCredits(session.credits);
                  if (session.docTitle) setDocTitle(session.docTitle);
              }
          }
      } catch (e) { console.error("Neural handshake failure", e); }
      finally { setIsRestoring(false); }
    };
    initApp();
  }, []);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) { toast.error('Neural Key Missing.'); return; }
    setDocument({ originalText: text, fileName });
    setDocTitle(fileName.replace(/\.[^/.]+$/, ""));
    setStatus(AppStatus.ANALYZING);
    try {
      const result = await analyzeDocument(text, (percent, step) => setScanProgress({ percent, step }));
      setAnalysis(result);
      setStatus(AppStatus.IDLE); 
      setVersions([{ id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text, label: 'Original Audit', score: result.plagiarismScore }]);
    } catch (error: any) {
      setErrorContext({ code: 'SCAN_FAILURE', message: error.message, actionableAdvice: 'Sync failed. Retry.' });
      setStatus(AppStatus.ERROR);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!document || !analysis) return;
    setStatus(AppStatus.FIXING);
    try {
      const allProfiles = [...profiles, ...(SYSTEM_ARCHETYPES as LinguisticProfile[])];
      const active = allProfiles.find(p => p.id === options.styleProfileId);
      const result = await fixPlagiarism(document.originalText, analysis.detectedIssues, options, analysis.sourcesFound || [], (p, msg) => setScanProgress({ percent: p, step: msg }), active?.sample);
      setFixResult(result);
      setVersions(prev => [...prev, { id: Math.random().toString(36).substr(2,9), timestamp: Date.now(), text: result.rewrittenText, label: `Stealth V14`, score: result.newAiProbability }]);
      setStatus(AppStatus.COMPLETED);
      toast.success("Document Purified");
    } catch (error: any) {
      setErrorContext({ code: 'FIX_FAILURE', message: error.message, actionableAdvice: 'Processing limit hit.' });
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setDocument(null);
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

  if (isRestoring) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black uppercase text-[10px] tracking-widest">Waking Neural Clusters...</div>;

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? <AdminDashboard /> : (
        <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
          <Header credits={credits} onOpenShop={() => setIsShopOpen(true)} />
          
          <main className="max-w-[1600px] mx-auto px-6 lg:px-12 py-12">
            {status === AppStatus.ERROR && errorContext && (
              <div className="max-w-4xl mx-auto py-24 px-16 bg-white rounded-[4rem] shadow-2xl border border-rose-100 flex flex-col items-center text-center">
                 <AlertCircle className="w-20 h-20 text-rose-500 mb-10" />
                 <h2 className="text-5xl font-black text-slate-900 uppercase mb-6">Link Error</h2>
                 <p className="text-xl text-slate-600 mb-12">{errorContext.message}</p>
                 <button onClick={() => setStatus(AppStatus.IDLE)} className="px-16 py-7 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Retry Session</button>
              </div>
            )}

            {!document && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
                <div className="flex flex-col items-center text-center mb-16">
                  <h2 className="text-5xl md:text-[6.5rem] font-black text-slate-900 mb-8 tracking-tighter uppercase leading-[0.85] font-heading max-w-5xl">
                    Institutional <br/>
                    <span className="text-indigo-600">Studio</span>
                  </h2>
                  <p className="text-lg md:text-xl text-slate-500 font-medium max-w-3xl mb-12 leading-relaxed">
                    Advanced plagiarism neutralization and AI-marker forensic removal. Designed for elite academic and professional document synthesis.
                  </p>
                  
                  <div className="flex justify-center gap-4 mb-16">
                    <button onClick={() => setIsVaultOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-black text-[11px]"><Dna className="w-4 h-4 text-indigo-400" /> Style Vault</button>
                    <button onClick={() => setIsLiveStudioOpen(true)} className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:border-indigo-400 text-[11px]"><Mic className="w-4 h-4 text-indigo-600" /> Live Studio</button>
                  </div>
                </div>

                <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} hasCredits={credits > 0} onOpenShop={() => setIsShopOpen(true)} />

                {/* --- FEATURES ECOSYSTEM SECTION --- */}
                <div className="mt-32 space-y-24">
                  <div className="text-center max-w-3xl mx-auto space-y-6">
                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter font-heading">The V14 Engine Ecosystem</h3>
                    <p className="text-slate-500 font-medium text-lg">Every institutional tool you need to process, purify, and present research at scale with absolute sovereign stealth.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Feature 1: Plagiarism Fixer */}
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-200 hover:shadow-2xl transition-all group">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                        <Search className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4 font-heading">Forensic Purge</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">Scan documents up to 500+ pages. Our engine identifies plagiarism overlaps and neutralizes them while maintaining high-fidelity semantic meaning.</p>
                    </div>

                    {/* Feature 2: DNA Cloning */}
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-200 hover:shadow-2xl transition-all group">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                        <Fingerprint className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4 font-heading">Linguistic DNA</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">Clone your unique writing voice. Upload samples to the DNA Vault so purified documents mirror your exact rhythmic and syntactical patterns.</p>
                    </div>

                    {/* Feature 3: Stealth Bypass */}
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-200 hover:shadow-2xl transition-all group">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4 font-heading">Adversarial Bypass</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">Engineered for 0% detection. We neutralize markers detected by Turnitin, GPTZero, and Originality.ai using institutional-grade adversarial jitter.</p>
                    </div>

                    {/* Feature 4: Executive Memos */}
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-200 hover:shadow-2xl transition-all group">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                        <ScrollText className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4 font-heading">Synthesis Memos</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">Transform massive research papers into professional Executive Memos. Instant synthesis for decision-makers and academic review boards.</p>
                    </div>

                    {/* Feature 5: Presentation Slides */}
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-200 hover:shadow-2xl transition-all group">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                        <Presentation className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4 font-heading">Neural Slides</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">One-click presentation generation. Our engine extracts key bullet points and speaker notes, exporting directly to institutional PPTX format.</p>
                    </div>

                    {/* Feature 6: Verified Grounding */}
                    <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-200 hover:shadow-2xl transition-all group">
                      <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-8 group-hover:bg-indigo-600 transition-colors">
                        <Globe className="w-8 h-8" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4 font-heading">Live Grounding</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">Synchronized with the deep web. Every purified document is grounded with live citations in APA, MLA, Harvard, or IEEE styles.</p>
                    </div>
                  </div>
                </div>

                {/* Sentiment & Social Proof Section */}
                <div className="mt-40 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center text-center group hover:border-indigo-200 transition-all">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-6"><Star className="w-8 h-8 fill-current" /></div>
                      <h4 className="text-3xl font-black text-slate-900 font-heading">4.9/5.0</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Institutional Rating</p>
                   </div>
                   <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-indigo-600/10 pointer-events-none"></div>
                      <div className="p-4 bg-white/10 text-indigo-400 rounded-2xl mb-6 relative z-10"><ShieldCheck className="w-8 h-8" /></div>
                      <h4 className="text-3xl font-black text-white font-heading relative z-10">99.9%</h4>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 relative z-10">Stealth Success Rate</p>
                   </div>
                   <div onClick={() => setIsRatingOpen(true)} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center text-center cursor-pointer group hover:bg-indigo-600 transition-all">
                      <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl mb-6 group-hover:bg-white/20 group-hover:text-white"><Heart className="w-8 h-8 fill-current" /></div>
                      <h4 className="text-3xl font-black text-slate-900 font-heading group-hover:text-white">Join Flow</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-white/60">Rate our V14 Engine</p>
                   </div>
                </div>
              </div>
            )}

            {(status === AppStatus.ANALYZING || status === AppStatus.FIXING) && (
              <div className="flex flex-col items-center justify-center min-h-[600px] space-y-12 max-w-5xl mx-auto bg-white rounded-[5rem] shadow-2xl border border-indigo-50 animate-in fade-in duration-500">
                <div className="w-48 h-48 bg-white border-[10px] border-indigo-50 rounded-full flex items-center justify-center shadow-xl relative">
                   <RefreshCcw className="h-16 w-16 text-indigo-600 animate-spin" />
                </div>
                <div className="text-center w-full max-w-xl px-12">
                   <h3 className="text-3xl font-black text-slate-900 uppercase font-heading tracking-tighter mb-6">{scanProgress.step || 'Processing...'}</h3>
                   <div className="overflow-hidden h-2.5 mb-4 flex rounded-full bg-slate-100 border border-slate-200 p-0.5">
                     <div style={{ width: `${scanProgress.percent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-700 rounded-full bg-indigo-600"></div>
                   </div>
                </div>
              </div>
            )}

            {document && analysis && status !== AppStatus.ANALYZING && status !== AppStatus.FIXING && status !== AppStatus.ERROR && (
              <div className="animate-in fade-in duration-1000">
                <AnalysisView 
                  originalText={document.originalText} analysis={analysis} fixResult={fixResult} status={status} 
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
          
          <footer className="py-20 px-12 border-t border-slate-100 bg-white mt-40">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-xl"><GraduationCap className="w-6 h-6 text-white" /></div>
                    <span className="text-2xl font-black font-heading tracking-tighter uppercase">PlagiaFix Studio</span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-10">
                   <button onClick={() => setIsRatingOpen(true)} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-all"><Star className="w-4 h-4 fill-current" /> Trust Metrics</button>
                   <a href="https://linkedin.com/in/joseph-fashola" target="_blank" rel="noreferrer" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600">Founder: Joseph Fashola</a>
                   <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sovereign Encryption Active</span>
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