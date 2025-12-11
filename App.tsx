
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; 
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry'; 
import { Loader2 } from 'lucide-react';

const SESSION_KEY = 'plagiafix_active_session_v1';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Check for Admin Key & Restore Session on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Admin Check
    if (params.get('admin_key') === 'plagiafix_master_2025') {
        setIsAdmin(true);
        toast.success("Welcome back, Admin.", { icon: '🔐' });
        setIsRestoring(false);
        return;
    } 

    // 2. Session Restore Logic (Perfect User Experience)
    const restoreSession = () => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (saved) {
                const session = JSON.parse(saved);
                // Only restore if valid data exists and timestamp is recent (< 24 hours)
                if (session.timestamp && (Date.now() - session.timestamp < 86400000)) {
                    if (session.document) setDocument(session.document);
                    if (session.analysis) setAnalysis(session.analysis);
                    if (session.fixResult) setFixResult(session.fixResult);
                    if (session.scoreHistory) setScoreHistory(session.scoreHistory);
                    
                    // Don't restore "ANALYZING" or "FIXING" states directly to avoid stuck loaders
                    // If it was processing, revert to IDLE or COMPLETED depending on data presence
                    if (session.status === AppStatus.ANALYZING || session.status === AppStatus.FIXING) {
                        setStatus(session.analysis ? AppStatus.IDLE : AppStatus.IDLE);
                    } else {
                        setStatus(session.status);
                    }
                    
                    if (session.document) {
                         toast.success("Session Restored", { position: 'bottom-right', duration: 2000, icon: '🔄' });
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to restore session", e);
            localStorage.removeItem(SESSION_KEY);
        } finally {
            setIsRestoring(false);
        }
    };

    restoreSession();
    
    // Log visit if regular user
    if (!isAdmin) {
        Telemetry.logVisit();
    }
  }, []);

  // Save Session on Change
  useEffect(() => {
      if (isAdmin) return;
      
      const sessionData = {
          timestamp: Date.now(),
          status,
          document,
          analysis,
          fixResult,
          scoreHistory
      };
      
      // Debounce saving slightly or just save (localStorage is sync and fast for this size)
      if (document || analysis) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      } else {
          localStorage.removeItem(SESSION_KEY);
      }
  }, [status, document, analysis, fixResult, scoreHistory, isAdmin]);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) {
      toast.error('API Key missing. Please check your environment configuration.');
      return;
    }

    const newDoc = { originalText: text, fileName };
    setDocument(newDoc);
    setStatus(AppStatus.ANALYZING);
    setScoreHistory([]); 
    
    try {
      const result = await analyzeDocument(text);
      setAnalysis(result);
      setScoreHistory([result.plagiarismScore]);
      setStatus(AppStatus.IDLE); 
      toast.success('Analysis complete!', { duration: 3000 });
      Telemetry.logScan(text.length);

    } catch (error: any) {
      console.error(error);
      let msg = 'Analysis failed. Please try again.';
      if (error.message?.includes('quota') || error.message?.includes('429')) {
          msg = 'High server traffic. Please wait a moment and try again.';
      }
      toast.error(msg);
      setStatus(AppStatus.ERROR);
      setDocument(null);
      Telemetry.logError(`Analysis failed: ${error.message}`);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!document || !analysis) return;

    setStatus(AppStatus.FIXING);
    const loadingToast = toast.loading(
        options.includeCitations 
        ? 'Rapidly Researching & Rewriting...' 
        : 'Rewriting in Turbo Mode...'
    );
    
    try {
      const result = await fixPlagiarism(document.originalText, analysis.detectedIssues, options);
      setFixResult(result);
      setScoreHistory(prev => [...prev, result.newPlagiarismScore]);
      setStatus(AppStatus.COMPLETED);
      toast.dismiss(loadingToast);
      toast.success('Plagiarism fixed! Document is now unique.', { duration: 5000 });
      Telemetry.logFix(document.originalText.length);

    } catch (error: any) {
      console.error(error);
      toast.dismiss(loadingToast);
      
      let msg = 'Failed to rewrite document. Please try again.';
      if (error.message?.includes('quota') || error.message?.includes('429')) {
          msg = 'Server is busy (Rate Limit). Please wait 30 seconds.';
      }

      toast.error(msg);
      setStatus(AppStatus.IDLE); 
      Telemetry.logError(`Fix failed: ${error.message}`);
    }
  };

  const handleReset = () => {
    if (window.confirm("Start a new scan? This will clear current results.")) {
        setDocument(null);
        setAnalysis(null);
        setFixResult(null);
        setScoreHistory([]);
        setStatus(AppStatus.IDLE);
        localStorage.removeItem(SESSION_KEY);
    }
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
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#334155',
          color: '#fff',
        },
      }}/>
      
      {isAdmin ? (
        <AdminDashboard />
      ) : (
        <div className="min-h-screen bg-slate-50 font-sans">
          <Header />

          <main className="py-12 px-4 sm:px-6 lg:px-8">
            
            {/* Intro Section - Only show when no document is loaded */}
            {!document && (
              <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h2 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
                  The World's Best Free <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Plagiarism Fixer</span>
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                  I built this tool while burning the midnight oil helping my babe with a massive research paper. We needed a way to fix plagiarism and bypass AI detection across hundreds of pages without paying a fortune. It worked so well for us that I made it free for everyone.
                </p>
              </div>
            )}

            {/* Loading State for Analysis */}
            {status === AppStatus.ANALYZING && (
              <div className="flex flex-col items-center justify-center h-96 space-y-6">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
                  <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-20 animate-pulse"></div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-800 mb-2">Analyzing Document Structure</p>
                  <p className="text-slate-500">Detecting plagiarism, tone, and AI patterns across all pages...</p>
                </div>
              </div>
            )}

            {/* File Upload View */}
            {!document && status !== AppStatus.ANALYZING && (
              <FileUpload onTextLoaded={handleTextLoaded} isLoading={false} />
            )}

            {/* Analysis & Fix View */}
            {document && analysis && status !== AppStatus.ANALYZING && status !== AppStatus.ERROR && (
              <AnalysisView 
                originalText={document.originalText}
                analysis={analysis}
                fixResult={fixResult}
                status={status}
                onFix={handleFixPlagiarism}
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
