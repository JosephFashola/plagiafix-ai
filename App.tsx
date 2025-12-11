
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisView from './components/AnalysisView';
import AdminDashboard from './components/AdminDashboard'; // Import Admin
import { AppStatus, DocumentState, AnalysisResult, FixResult, FixOptions } from './types';
import { analyzeDocument, fixPlagiarism, checkApiKey } from './services/geminiService';
import { Telemetry } from './services/telemetry'; // Import Telemetry
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check for Admin Key on Mount & Log Visit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // SECRET KEY: ?admin_key=plagiafix_master_2025
    if (params.get('admin_key') === 'plagiafix_master_2025') {
        setIsAdmin(true);
        toast.success("Welcome back, Admin.", { icon: '🔐' });
    } else {
        // Log a visit if it's a regular user
        Telemetry.logVisit();
    }
  }, []);

  const handleTextLoaded = async (text: string, fileName: string) => {
    if (!checkApiKey()) {
      toast.error('API Key missing. Please check your environment configuration.');
      return;
    }

    setDocument({ originalText: text, fileName });
    setStatus(AppStatus.ANALYZING);
    setScoreHistory([]); // Reset history for new document
    
    try {
      const result = await analyzeDocument(text);
      setAnalysis(result);
      setScoreHistory([result.plagiarismScore]);
      setStatus(AppStatus.IDLE); // Ready for next step
      toast.success('Analysis complete!', { duration: 3000 });
      
      // LOG TELEMETRY
      Telemetry.logScan(text.length);

    } catch (error: any) {
      console.error(error);
      
      let msg = 'Analysis failed. Please try again.';
      if (error.message?.includes('token count')) {
          msg = 'Document is too massive even for chunks. Please split it manually.';
      } else if (error.message?.includes('quota')) {
          msg = 'API Quota exceeded. Please wait a moment.';
      }

      toast.error(msg);
      setStatus(AppStatus.ERROR);
      setDocument(null);
      
      // LOG ERROR
      Telemetry.logError(`Analysis failed: ${error.message}`);
    }
  };

  const handleFixPlagiarism = async (options: FixOptions) => {
    if (!document || !analysis) return;

    setStatus(AppStatus.FIXING);
    // Suggesting to the user that this might take a moment due to high quality model
    const loadingToast = toast.loading(
        options.includeCitations 
        ? 'Researching citations & Rewriting... (This will take longer)' 
        : 'Rewriting with Gemini 3 Pro...'
    );
    
    try {
      const result = await fixPlagiarism(document.originalText, analysis.detectedIssues, options);
      setFixResult(result);
      setScoreHistory(prev => [...prev, result.newPlagiarismScore]);
      setStatus(AppStatus.COMPLETED);
      toast.dismiss(loadingToast);
      toast.success('Plagiarism fixed! Document is now unique.', { duration: 5000 });
      
      // LOG TELEMETRY
      Telemetry.logFix(document.originalText.length);

    } catch (error: any) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error('Failed to rewrite document. Please try again.');
      setStatus(AppStatus.IDLE); // Go back to analysis view state
      
      // LOG ERROR
      Telemetry.logError(`Fix failed: ${error.message}`);
    }
  };

  const handleReset = () => {
    setDocument(null);
    setAnalysis(null);
    setFixResult(null);
    setScoreHistory([]);
    setStatus(AppStatus.IDLE);
  };

  // RENDER ADMIN DASHBOARD IF KEY IS PRESENT
  if (isAdmin) {
      return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#334155',
          color: '#fff',
        },
      }}/>
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
          <FileUpload onTextLoaded={handleTextLoaded} isLoading={status === AppStatus.ANALYZING} />
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
  );
};

export default App;
