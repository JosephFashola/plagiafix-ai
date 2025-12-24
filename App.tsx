
import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; 
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry'; 
import { Loader2, AlertCircle, Cpu, ShieldCheck } from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v2';

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin_key') === 'plagiafix_master_2025') {
        setIsAdmin(true);
        setIsRestoring(false);
        return;
    } 

    const restoreSession = () => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (saved) {
                const session = JSON.parse(saved);
                if (session.timestamp && (Date.now() - session.timestamp < 86400000)) {
                    if (session.document) setDocument(session.document);
                    if (session.analysis) setAnalysis(session.analysis);
                    if (session.fixResult) setFixResult(session.fixResult);
                    if (session.scoreHistory) setScoreHistory(session.scoreHistory);
                    setStatus(session.status === AppStatus.ANALYZING || session.status === AppStatus.FIXING ? AppStatus.IDLE : session.status);
                }
            }
        } catch (e) {
            localStorage.removeItem(SESSION_KEY);
        } finally {
            setIsRestoring(false);
        }
    };

    restoreSession();
    if (!isAdmin) Telemetry.logVisit();
  }, [isAdmin]);

  useEffect(() => {
      if (isAdmin) return;
      const sessionData = { timestamp: Date.now(), status, document, analysis, fixResult, scoreHistory };
      if (document || analysis) localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  }, [status, document, analysis, fixResult, scoreHistory, isAdmin]);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) {
      toast.error('Synthesis engine offline.');
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
      Telemetry.logScan(text.length);
    } catch (error: any) {
      toast.error(error.message || 'Analysis failed.');
      setStatus(AppStatus.ERROR);
      Telemetry.logError(`Analysis failed: ${error.message}`);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!document || !analysis) return;
    setStatus(AppStatus.FIXING);
    const loadingToast = toast.loading('Executing Fix...');
    try {
      const result = await fixPlagiarism(document.originalText, analysis.detectedIssues, options, analysis.sourcesFound || [], (p) => setFixProgress(p));
      setFixResult(result);
      setScoreHistory(prev => [...prev, result.newPlagiarismScore]);
      setStatus(AppStatus.COMPLETED);
      toast.dismiss(loadingToast);
      Telemetry.logFix(document.originalText.length);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Fix failed.');
      setStatus(AppStatus.IDLE); 
      Telemetry.logError(`Fix failed: ${error.message}`);
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

  if (isRestoring) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
      );
  }

  return (
    <>
      <Toaster position="top-center" />
      {isAdmin ? <AdminDashboard /> : (
        <div className="min-h-screen bg-slate-50 font-sans">
          <Header />
          <main className="py-12 px-4 sm:px-6 lg:px-8">
            {!document && (
              <div className="text-center mb-16">
                <h2 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight uppercase">
                  MASSIVE AI <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Plagiarism Fixer</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium">
                  Scan 500+ pages. Identify matches. Humanize instantly.
                </p>
              </div>
            )}

            {status === AppStatus.ANALYZING && (
              <div className="flex flex-col items-center justify-center h-[500px] space-y-8 max-w-2xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-indigo-100">
                <Cpu className="h-10 w-10 text-indigo-600 animate-pulse" />
                <div className="text-center w-full px-12">
                  <h3 className="text-2xl font-black text-slate-900 uppercase">{scanProgress.step}</h3>
                  <div className="w-full h-4 bg-slate-100 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${scanProgress.percent}%` }}></div>
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
        </div>
      )}
    </>
  );
};

export default App;
