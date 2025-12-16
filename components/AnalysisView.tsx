
import React, { useState, useEffect } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, HumanizeMode, ParagraphAnalysis, CitationStyle, ForensicData } from '../types';
import ScoreGauge from './ScoreGauge';
import { Wand2, AlertTriangle, CheckCircle2, ArrowRight, Copy, Check, Eye, BookOpen, FileText, Star, Sparkles, Flame, Zap, Fingerprint, User, Quote, Share2, Twitter, Linkedin, Facebook, Microscope, Search, BarChart3, ExternalLink, Download, Split, Ghost, GraduationCap, PenTool, RefreshCw, X, ChevronDown, ChevronUp, MonitorPlay } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadDocx, downloadPdf } from '../services/exportService';
import { generatePresentationContent } from '../services/geminiService';
import { generatePptx } from '../services/slideGenerator';
import { Telemetry } from '../services/telemetry';
// @ts-ignore
import * as Diff from 'diff';

interface AnalysisViewProps {
  originalText: string;
  analysis: AnalysisResult;
  fixResult: FixResult | null;
  status: AppStatus;
  fixProgress?: number; // New Prop for Progress Bar
  onFix: (options: FixOptions) => void;
  onReset: () => void;
  scoreHistory: number[];
}

const SocialShare: React.FC = () => {
    const shareUrl = window.location.href;
    const shareText = "I just humanized my document and bypassed AI detection using PlagiaFix! 🚀 It's free and insanely powerful.";
    
    const handleShare = (platform: 'twitter' | 'linkedin' | 'facebook' | 'whatsapp') => {
        let url = '';
        switch(platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
                break;
        }
        window.open(url, '_blank', 'width=600,height=400');
        toast.success("Thanks for sharing!", { icon: '💖' });
        Telemetry.addLogLocal('SHARE', platform);
    };

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-24 h-24 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h4 className="font-bold text-lg flex items-center justify-center md:justify-start gap-2">
                        <Share2 className="w-5 h-5" />
                        Help us keep PlagiaFix Free!
                    </h4>
                    <p className="text-indigo-100 text-sm mt-1">Found this tool useful? A quick share helps us stay alive.</p>
                </div>
                
                <div className="flex gap-3">
                    <button onClick={() => handleShare('twitter')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm" title="Share on X / Twitter">
                        <Twitter className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => handleShare('linkedin')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm" title="Share on LinkedIn">
                        <Linkedin className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => handleShare('facebook')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm" title="Share on Facebook">
                        <Facebook className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const HeatmapDisplay: React.FC<{ 
    text: string, 
    paragraphs: ParagraphAnalysis[],
    className?: string 
}> = ({ text, paragraphs, className }) => {
    const splitOriginal = text.split(/\n\n/);
    
    return (
        <div className={`space-y-4 font-serif text-slate-700 leading-relaxed ${className}`}>
            {splitOriginal.map((para, idx) => {
                if (!para.trim()) return null;
                const riskData = paragraphs && paragraphs[idx] ? paragraphs[idx] : null;
                const score = riskData ? riskData.riskScore : 0;
                
                let bgClass = "bg-transparent";
                let borderClass = "border-transparent";
                
                if (score > 80) {
                    bgClass = "bg-red-100/50 hover:bg-red-100";
                    borderClass = "border-red-200";
                } else if (score > 50) {
                    bgClass = "bg-amber-50 hover:bg-amber-100";
                    borderClass = "border-amber-200";
                } else if (score < 20) {
                    bgClass = "bg-green-50/30";
                    borderClass = "border-green-100";
                }

                // Determine Match Type Label
                let riskLabel = "Safe";
                let matchTypeColor = "text-green-500";
                
                if (riskData?.matchType === 'PLAGIARISM') {
                    riskLabel = "PLAGIARISM MATCH";
                    matchTypeColor = "text-red-600";
                } else if (riskData?.matchType === 'AI') {
                    riskLabel = "AI PATTERN DETECTED";
                    matchTypeColor = "text-amber-600";
                } else if (score > 50) {
                    riskLabel = "SUSPICIOUS";
                    matchTypeColor = "text-amber-600";
                }

                return (
                    <div key={idx} className={`p-2 rounded-lg border transition-colors ${bgClass} ${borderClass} group relative`}>
                        <p>{para}</p>
                        {score > 40 && (
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-20 w-64 pointer-events-none md:pointer-events-auto">
                                <div className="flex items-center justify-between mb-1">
                                     <span className={`text-[10px] font-extrabold uppercase ${matchTypeColor}`}>{riskLabel}</span>
                                     <span className="text-xs font-bold text-slate-700">{score}% Risk</span>
                                </div>
                                {riskData?.evidence && (
                                    <p className="text-xs text-slate-500 italic mb-1">
                                        "{riskData.evidence}"
                                    </p>
                                )}
                                {riskData?.matchType === 'PLAGIARISM' && (
                                    <div className="flex items-center gap-1 text-[10px] text-blue-500 mt-1">
                                        <ExternalLink className="w-3 h-3" />
                                        Found on Google Search
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Helper to strip Markdown (Robust)
const cleanMarkdown = (text: string) => {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/__(.*?)__/g, '$1')     // Bold
        .replace(/\*(?![*\s])(.*?)\*/g, '$1') // Italic
        .replace(/_([^_]+)_/g, '$1')     // Italic
        .replace(/^#+\s/gm, '')          // Headings
        .replace(/`/g, '');              // Code ticks
};

const TextDisplay: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const cleaned = cleanMarkdown(text);
    return (
        <div className={`whitespace-pre-wrap leading-relaxed text-sm md:text-base font-serif text-slate-700 ${className}`}>
            {cleaned}
        </div>
    );
};

const DiffDisplay: React.FC<{ oldText: string, newText: string }> = ({ oldText, newText }) => {
    // Robust access to diffWords
    const diffFn = Diff.diffWords || (Diff as any).default?.diffWords || (window as any).Diff?.diffWords;
    
    if (!diffFn) {
        return <div className="text-red-500">Diff library error. Please refresh.</div>;
    }

    const diff = diffFn(oldText, newText);
    return (
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-serif text-slate-700">
            {diff.map((part: any, index: number) => {
                const color = part.added ? 'bg-green-100 text-green-800 border-b-2 border-green-300' :
                              part.removed ? 'bg-red-100 text-red-800 line-through decoration-red-500 opacity-60' : 
                              'text-slate-600';
                return (
                    <span key={index} className={`${color} px-0.5 rounded-sm transition-colors`}>
                        {part.value}
                    </span>
                );
            })}
        </div>
    );
};

const ForensicsPanel: React.FC<{ data: ForensicData, sources: any[] }> = ({ data, sources }) => {
    if (!data) return null;

    const stats = [
        { label: "Sentence Variance", value: data.sentenceVariance, ideal: "> 8.0", status: data.sentenceVariance > 8 ? "Human" : "Robotic" },
        { label: "Complexity Ratio", value: data.uniqueWordRatio, ideal: "> 0.4", status: data.uniqueWordRatio > 0.4 ? "Rich" : "Repetitive" },
        { label: "Readability", value: data.readabilityScore, ideal: "varies", status: "Index" },
    ];

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            <div>
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    Stylometric DNA
                </h4>
                <div className="grid grid-cols-3 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{stat.label}</p>
                            <p className="text-xl font-bold text-slate-800 mt-1">{stat.value}</p>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-400">Goal: {stat.ideal}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    stat.status === 'Human' || stat.status === 'Rich' ? 'bg-green-100 text-green-700' : 
                                    stat.status === 'Robotic' || stat.status === 'Repetitive' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>{stat.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                    * Authenticity metrics calculated via Client-Side Forensic Algorithms.
                </p>
            </div>

            {data.aiTriggerWordsFound && data.aiTriggerWordsFound.length > 0 && (
                <div>
                     <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        AI Fingerprints Detected
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {data.aiTriggerWordsFound.map((word, i) => (
                            <span key={i} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded border border-amber-100 line-through decoration-amber-500/50">
                                {word}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div>
                 <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-600" />
                    Detected Sources
                </h4>
                {sources && sources.length > 0 ? (
                    <div className="space-y-3">
                        {sources.map((source, i) => (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" key={i} className="block p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all group">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-sm font-bold text-indigo-700 truncate">{source.title}</h5>
                                        <p className="text-xs text-slate-500 mt-1 truncate">{source.url}</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 ml-2" />
                                </div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <div>
                            <p className="text-sm font-bold text-green-800">No Plagiarism Found</p>
                            <p className="text-xs text-green-600">Google Search found no exact matches.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ModeCard: React.FC<{ 
    mode: HumanizeMode, 
    selected: boolean, 
    onClick: () => void, 
    icon: React.ReactNode, 
    label: string, 
    desc: string 
}> = ({ mode, selected, onClick, icon, label, desc }) => (
    <button
        onClick={onClick}
        className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-300 w-full hover:shadow-md h-full
        ${selected ? 'border-indigo-600 bg-indigo-50/50 shadow-indigo-100 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}
        `}
    >
        <div className={`p-2 rounded-lg mb-2 ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {icon}
        </div>
        <h4 className={`font-bold text-sm ${selected ? 'text-indigo-900' : 'text-slate-800'}`}>{label}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-snug">{desc}</p>
        {selected && (
            <div className="absolute top-3 right-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
        )}
    </button>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  originalText, 
  analysis, 
  fixResult, 
  status, 
  fixProgress = 0,
  onFix,
  onReset,
  scoreHistory
}) => {
  const isFixing = status === AppStatus.FIXING;
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'clean' | 'diff' | 'forensics'>('clean');
  
  // Customization Options
  const [mode, setMode] = useState<HumanizeMode>('Standard');
  const [strength, setStrength] = useState<number>(75);
  const [includeCitations, setIncludeCitations] = useState(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [dialect, setDialect] = useState<FixOptions['dialect']>('US');
  const [styleSample, setStyleSample] = useState('');
  const [showStyleInput, setShowStyleInput] = useState(false);

  // Feedback State
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);

  // New: PPTX Generation State
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);

  useEffect(() => {
    setRating(0);
    setHoverRating(0);
    setFeedbackText('');
    setIsFeedbackSubmitted(false);
    setViewMode('clean');
  }, [fixResult]);

  const handleCopy = () => {
    if (fixResult?.rewrittenText) {
      navigator.clipboard.writeText(fixResult.rewrittenText);
      setCopied(true);
      toast.success('Humanized text copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFixClick = () => {
      onFix({ 
          includeCitations,
          citationStyle: includeCitations ? citationStyle : undefined,
          mode,
          strength,
          dialect,
          styleSample: showStyleInput ? styleSample : undefined
      });
  };

  const handleGenerateSlides = async () => {
      if (!fixResult && !originalText) return;
      setIsGeneratingSlides(true);
      const textToUse = fixResult ? fixResult.rewrittenText : originalText;
      
      try {
          // 1. Get structured JSON from Gemini
          const slides = await generatePresentationContent(textToUse);
          // 2. Build PPTX
          await generatePptx(slides, 'PlagiaFix_Presentation');
      } catch (e: any) {
          console.error(e);
          toast.error("Could not generate slides. " + e.message);
      } finally {
          setIsGeneratingSlides(false);
      }
  };

  const submitFeedback = () => {
      if (rating === 0) {
          toast.error("Please select a star rating");
          return;
      }
      Telemetry.logFeedback(rating, feedbackText);
      setIsFeedbackSubmitted(true);
      toast.success("Thanks! Your feedback improves our AI.");
  };

  const currentScore = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;
  const scoreLabel = fixResult ? "Current Risk" : "Detected Risk";
  
  // Clean text for PDF export (remove simple markdown)
  const cleanTextForPdf = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/##\s+/g, '') // Remove H2
        .replace(/#\s+/g, ''); // Remove H1
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ScoreGauge 
          score={currentScore} 
          label={scoreLabel} 
          history={scoreHistory}
        />
        
        <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
                 <AlertTriangle className={`h-5 w-5 ${analysis.plagiarismScore > 50 ? 'text-red-500' : 'text-amber-500'}`} />
                 <h3 className="text-lg font-bold text-slate-800">AI Detection & Critique</h3>
             </div>
             {fixResult && (
                 <div className="flex items-center gap-2">
                     <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                         <CheckCircle2 className="w-3 h-3" />
                         Fixed
                     </span>
                 </div>
             )}
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed text-sm md:text-base">{analysis.critique}</p>
          
          <div className="flex flex-wrap gap-2">
            {analysis.detectedIssues.map((issue, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                {issue}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Social Share Call-to-Action */}
      <SocialShare />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[800px] h-auto">
        
        {/* Left: Original with Heatmap & Forensics */}
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
             <div className="flex gap-2">
                 <button 
                    onClick={() => setViewMode('clean')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${viewMode !== 'forensics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     Plagiarism Heatmap
                 </button>
                 <button 
                    onClick={() => setViewMode('forensics')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${viewMode === 'forensics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     <Microscope className="w-3 h-3" />
                     Forensic DNA
                 </button>
             </div>
             <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Original Source</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
             {viewMode === 'forensics' ? (
                 <ForensicsPanel data={analysis.forensics} sources={analysis.sourcesFound} />
             ) : (
                 <HeatmapDisplay 
                    text={originalText} 
                    paragraphs={analysis.paragraphBreakdown} 
                 />
             )}
          </div>
        </div>

        {/* Right: Actions OR Result */}
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
           
           {!fixResult ? (
             /* --- CONFIGURATION MODE --- */
             <div className="flex flex-col h-full">
                <div className="bg-slate-50 border-b border-slate-200 p-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-indigo-500" />
                        Configure Humanizer Engine
                    </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Mode Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <ModeCard 
                            mode="Standard" 
                            selected={mode === 'Standard'} 
                            onClick={() => setMode('Standard')}
                            icon={<Zap className="w-5 h-5" />}
                            label="Standard"
                            desc="Balanced rewrite. Safe for general use."
                        />
                        <ModeCard 
                            mode="Ghost" 
                            selected={mode === 'Ghost'} 
                            onClick={() => setMode('Ghost')}
                            icon={<Ghost className="w-5 h-5" />}
                            label="Ghost Mode"
                            desc="Anti-AI. Bypasses Turnitin & GPTZero."
                        />
                        <ModeCard 
                            mode="Academic" 
                            selected={mode === 'Academic'} 
                            onClick={() => setMode('Academic')}
                            icon={<GraduationCap className="w-5 h-5" />}
                            label="Scholar"
                            desc="PhD-level vocabulary. Formal tone."
                        />
                        <ModeCard 
                            mode="Creative" 
                            selected={mode === 'Creative'} 
                            onClick={() => setMode('Creative')}
                            icon={<PenTool className="w-5 h-5" />}
                            label="Creative"
                            desc="Engaging, story-like flow."
                        />
                    </div>

                    {/* Style Cloning */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowStyleInput(!showStyleInput)}>
                            <div className="flex items-center gap-2">
                                <Fingerprint className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">Style Cloning (Beta)</h4>
                                    <p className="text-xs text-slate-500">Mimic your own writing style</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full p-1 transition-colors ${showStyleInput ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${showStyleInput ? 'translate-x-5' : ''}`}></div>
                            </div>
                        </div>
                        {showStyleInput && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs text-slate-500 mb-2">Paste a sample of your previous writing (200+ words). The AI will analyze your sentence structure.</p>
                                <textarea 
                                    className="w-full h-32 p-3 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    placeholder="Paste your sample text here..."
                                    value={styleSample}
                                    onChange={(e) => setStyleSample(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <label className="text-sm font-semibold text-slate-700">English Dialect</label>
                             <div className="flex bg-slate-100 p-1 rounded-lg">
                                 {(['US', 'UK', 'CA', 'AU'] as const).map((d) => (
                                     <button
                                        key={d}
                                        onClick={() => setDialect(d)}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${dialect === d ? 'bg-white shadow text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                                     >
                                         {d}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Quote className="w-4 h-4 text-slate-400" />
                                Auto-Citations
                            </label>
                             <div className="flex items-center gap-2">
                                {includeCitations && (
                                    <select 
                                        className="text-xs bg-white border border-slate-200 rounded py-1 px-2 outline-none focus:border-indigo-500"
                                        value={citationStyle}
                                        onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                                    >
                                        <option value="APA">APA 7</option>
                                        <option value="MLA">MLA 9</option>
                                        <option value="Harvard">Harvard</option>
                                        <option value="Chicago">Chicago</option>
                                        <option value="IEEE">IEEE</option>
                                    </select>
                                )}
                                <div 
                                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${includeCitations ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    onClick={() => setIncludeCitations(!includeCitations)}
                                >
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${includeCitations ? 'translate-x-5' : ''}`}></div>
                                </div>
                             </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                <span>Humanization Strength</span>
                                <span>{strength}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="100" 
                                value={strength} 
                                onChange={(e) => setStrength(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    {/* Progress Bar Display if Fixing */}
                    {isFixing && (
                        <div className="mb-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                <span>Processing Document...</span>
                                <span>{fixProgress}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                                    style={{ width: `${Math.max(5, fixProgress)}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={handleFixClick}
                        disabled={isFixing}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isFixing ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                {fixProgress < 99 ? 'Rewriting Chunks...' : 'Finalizing...'}
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Humanize Text (Fix Plagiarism)
                            </>
                        )}
                    </button>
                </div>
             </div>
           ) : (
             /* --- RESULT MODE --- */
             <div className="flex flex-col h-full">
                 <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setViewMode('clean')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${viewMode === 'clean' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Final Result
                        </button>
                        <button 
                            onClick={() => setViewMode('diff')}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${viewMode === 'diff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Split className="w-3 h-3" />
                            Track Changes
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={handleCopy} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-indigo-600" title="Copy Text">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={onReset} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-red-500" title="Reset">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                     {viewMode === 'diff' ? (
                         <DiffDisplay oldText={originalText} newText={cleanMarkdown(fixResult.rewrittenText)} />
                     ) : (
                         <TextDisplay text={fixResult.rewrittenText} />
                     )}
                     
                     {/* Citation Footer */}
                     {fixResult.references && fixResult.references.length > 0 && (
                         <div className="mt-8 pt-8 border-t border-slate-200">
                             <h4 className="font-bold text-slate-800 mb-4">References</h4>
                             <ul className="space-y-2 text-sm text-slate-600 pl-4 list-decimal">
                                 {fixResult.references.map((ref, i) => (
                                     <li key={i}>{ref}</li>
                                 ))}
                             </ul>
                         </div>
                     )}
                 </div>

                 {/* Feedback & Actions */}
                 <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => downloadDocx(fixResult.rewrittenText, 'PlagiaFix_Rewritten', fixResult.references)}
                            className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 font-bold rounded-lg transition-colors shadow-sm text-sm"
                        >
                            <FileText className="w-4 h-4" />
                            DOCX
                        </button>
                        <button 
                            onClick={() => downloadPdf(cleanTextForPdf(fixResult.rewrittenText), 100 - fixResult.newPlagiarismScore, analysis.plagiarismScore)}
                            className="flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md text-sm"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Verify PDF
                        </button>
                    </div>

                    {/* NEW GENERATE PRESENTATION BUTTON */}
                    <button
                        onClick={handleGenerateSlides}
                        disabled={isGeneratingSlides}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isGeneratingSlides ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Designing Slides...
                            </>
                        ) : (
                            <>
                                <MonitorPlay className="w-4 h-4" />
                                Generate PowerPoint Slides
                            </>
                        )}
                    </button>

                    {/* Start New Scan Button */}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            onReset();
                        }}
                        className="w-full py-3 bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm group"
                    >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        Start New Scan
                    </button>
                 </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
