
import React, { useState, useEffect } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, HumanizeMode, ParagraphAnalysis, CitationStyle } from '../types';
import ScoreGauge from './ScoreGauge';
import { Wand2, AlertTriangle, CheckCircle2, ArrowRight, Copy, Check, ChevronDown, ChevronUp, BookOpen, FileText, Star, MessageSquare, Send, ThumbsUp, Settings2, Download, Split, Eye, Ghost, GraduationCap, PenTool, Sparkles, Flame, Zap, Fingerprint, User, Quote, Share2, Twitter, Linkedin, Facebook } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadDocx, downloadPdf } from '../services/exportService';
import { Telemetry } from '../services/telemetry';
// @ts-ignore
import * as Diff from 'diff';

interface AnalysisViewProps {
  originalText: string;
  analysis: AnalysisResult;
  fixResult: FixResult | null;
  status: AppStatus;
  onFix: (options: FixOptions) => void;
  onReset: () => void;
  scoreHistory: number[];
}

// --- SOCIAL SHARE COMPONENT ---
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

// --- HEATMAP DISPLAY COMPONENT ---
const HeatmapDisplay: React.FC<{ 
    text: string, 
    paragraphs: ParagraphAnalysis[],
    className?: string 
}> = ({ text, paragraphs, className }) => {
    // We split original text by paragraphs to attempt to match risk scores
    const splitOriginal = text.split(/\n\n/);
    
    return (
        <div className={`space-y-4 font-serif text-slate-700 leading-relaxed ${className}`}>
            {splitOriginal.map((para, idx) => {
                if (!para.trim()) return null;
                
                // Find matching risk score (fuzzy match or index match)
                const riskData = paragraphs && paragraphs[idx] ? paragraphs[idx] : null;
                const score = riskData ? riskData.riskScore : 0;
                
                // Determine Heatmap Color
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

                return (
                    <div key={idx} className={`p-2 rounded-lg border transition-colors ${bgClass} ${borderClass} group relative`}>
                        <p>{para}</p>
                        {score > 50 && (
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                AI Risk: {score}%
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const TextDisplay: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    return (
        <div className={`relative ${className}`}>
            <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-serif">
                {text}
            </p>
        </div>
    );
};

const DiffDisplay: React.FC<{ oldText: string, newText: string }> = ({ oldText, newText }) => {
    const diff = Diff.diffWords(oldText, newText);
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
        ${selected ? 'border-indigo-600 bg-indigo-50/50 shadow-indigo-100 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'}
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
  onFix,
  onReset,
  scoreHistory
}) => {
  const isFixing = status === AppStatus.FIXING;
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'clean' | 'diff'>('clean');
  
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

  const submitFeedback = () => {
      if (rating === 0) {
          toast.error("Please select a star rating");
          return;
      }
      Telemetry.logFeedback(rating, feedbackText);
      setIsFeedbackSubmitted(true);
      toast.success("Thanks! Your feedback improves our AI.");
  };

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success("Citation copied");
  };

  const currentScore = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;
  const scoreLabel = fixResult ? "Current Risk" : "Detected Risk";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
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
        
        {/* Left: Original with Heatmap */}
        <div className="flex flex-col h-full min-h-[500px] lg:min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                Original Text
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">Risk Heatmap</span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 relative">
             <div className="absolute top-0 right-4 z-10">
                 <div className="bg-white/80 backdrop-blur p-2 rounded-b-lg shadow-sm text-[10px] text-slate-500 border border-t-0 border-slate-200 flex gap-2">
                     <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-200 border border-red-300"></span> High Risk</span>
                     <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-200 border border-green-300"></span> Safe</span>
                 </div>
             </div>
             {analysis.paragraphBreakdown ? (
                 <HeatmapDisplay text={originalText} paragraphs={analysis.paragraphBreakdown} />
             ) : (
                 <TextDisplay text={originalText} className="text-slate-600" />
             )}
          </div>
        </div>

        {/* Right: Fixed / Action */}
        <div className={`flex flex-col h-full min-h-[500px] lg:min-h-0 bg-white rounded-xl shadow-sm border overflow-hidden relative transition-all duration-500 ${fixResult ? 'border-indigo-200 shadow-indigo-100' : 'border-slate-200'}`}>
          <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center z-10 flex-shrink-0">
            <h3 className="font-bold text-indigo-700 flex items-center gap-2">
                Humanized Version
                {fixResult && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </h3>
            {fixResult && (
               <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-0.5 mr-2">
                        <button 
                            onClick={() => setViewMode('clean')}
                            className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === 'clean' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Clean View"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                            onClick={() => setViewMode('diff')}
                            className={`p-1.5 rounded-md transition-all flex items-center gap-1 ${viewMode === 'diff' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Show Changes (Diff)"
                        >
                            <Split className="w-3.5 h-3.5" />
                        </button>
                    </div>

                   <button 
                    onClick={() => downloadDocx(fixResult.rewrittenText, "PlagiaFix_Rewritten", fixResult.references)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Export as DOCX"
                   >
                       <FileText className="h-4 w-4" />
                   </button>
                   <button 
                    onClick={handleCopy}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Copy text"
                   >
                       {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                   </button>
               </div>
            )}
          </div>

          <div className="flex-1 p-0 overflow-y-auto relative bg-slate-50/30">
            {!fixResult ? (
              <div className="absolute inset-0 flex flex-col items-center justify-start py-8 px-6 text-center overflow-y-auto scrollbar-thin">
                <div className="w-full max-w-md mx-auto space-y-6 pb-8">
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
                        <Wand2 className="w-5 h-5 text-indigo-600" />
                        PlagiaFix Ultimate Engine
                    </h4>
                    <p className="text-slate-500 text-sm mt-1">Configure your humanization settings.</p>
                  </div>
                  
                  {/* MODE SELECTION */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-3 text-left">Rewrite Strategy</label>
                      <div className="grid grid-cols-2 gap-3">
                          <ModeCard 
                             mode="Standard" 
                             label="Standard" 
                             desc="Balanced"
                             icon={<Zap className="w-5 h-5" />} 
                             selected={mode === 'Standard'}
                             onClick={() => setMode('Standard')}
                          />
                          <ModeCard 
                             mode="Ghost" 
                             label="Ghost Mode" 
                             desc="Deep Stealth"
                             icon={<Ghost className="w-5 h-5" />} 
                             selected={mode === 'Ghost'}
                             onClick={() => setMode('Ghost')}
                          />
                          <ModeCard 
                             mode="Academic" 
                             label="Scholar" 
                             desc="Formal / PhD"
                             icon={<GraduationCap className="w-5 h-5" />} 
                             selected={mode === 'Academic'}
                             onClick={() => setMode('Academic')}
                          />
                          <ModeCard 
                             mode="Creative" 
                             label="Storyteller" 
                             desc="Narrative"
                             icon={<PenTool className="w-5 h-5" />} 
                             selected={mode === 'Creative'}
                             onClick={() => setMode('Creative')}
                          />
                      </div>
                  </div>

                  {/* STYLE CLONING */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                     <div className="flex justify-between items-center mb-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                            <Fingerprint className="w-4 h-4 text-purple-500" />
                            Persona Cloning
                        </label>
                        <button 
                            onClick={() => setShowStyleInput(!showStyleInput)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${showStyleInput ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                        >
                            {showStyleInput ? 'ENABLED' : 'DISABLED'}
                        </button>
                     </div>
                     
                     {showStyleInput && (
                         <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                             <p className="text-xs text-slate-500 mb-2">Paste a sample of your own writing (200+ words). We will analyze and mimic your exact tone.</p>
                             <textarea 
                                className="w-full h-24 p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Paste your previous essay or writing sample here..."
                                value={styleSample}
                                onChange={(e) => setStyleSample(e.target.value)}
                             />
                         </div>
                     )}
                  </div>

                  {/* CITATION MANAGER */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                     <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase mb-3">
                        <Quote className="w-4 h-4 text-indigo-500" />
                        Citation Manager
                     </label>
                     <div className="flex gap-3">
                         <button 
                            onClick={() => setIncludeCitations(!includeCitations)}
                            className={`flex-1 text-xs p-2.5 border rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors ${includeCitations ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                         >
                            {includeCitations ? <Check className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                            {includeCitations ? 'Auto-Cite ON' : 'Auto-Cite OFF'}
                         </button>
                         
                         {includeCitations && (
                             <select 
                                value={citationStyle}
                                onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                                className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none shadow-sm font-medium animate-in fade-in slide-in-from-left-2"
                            >
                                <option value="APA">APA 7</option>
                                <option value="MLA">MLA 9</option>
                                <option value="Chicago">Chicago</option>
                                <option value="Harvard">Harvard</option>
                                <option value="IEEE">IEEE</option>
                            </select>
                         )}
                     </div>
                  </div>

                  {/* STRENGTH SLIDER */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                       <div className="flex justify-between items-center mb-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                                <Flame className={`w-4 h-4 ${strength > 75 ? 'text-red-500' : strength > 40 ? 'text-orange-500' : 'text-blue-500'}`} />
                                Intensity
                            </label>
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{strength}%</span>
                       </div>
                       <input 
                          type="range" 
                          min="1" 
                          max="100" 
                          value={strength}
                          onChange={(e) => setStrength(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                       />
                  </div>
                  
                  {/* DIALECT */}
                  <div className="flex gap-3">
                     <div className="flex-1">
                        <select 
                            value={dialect}
                            onChange={(e) => setDialect(e.target.value as any)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 outline-none shadow-sm font-medium"
                        >
                            <option value="US">🇺🇸 US English</option>
                            <option value="UK">🇬🇧 UK English</option>
                            <option value="CA">🇨u00a0 Canadian</option>
                            <option value="AU">🇦🇺 Australian</option>
                        </select>
                     </div>
                  </div>

                  <button 
                    onClick={handleFixClick}
                    disabled={isFixing}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
                    style={{ transitionDuration: '0.5s' }}
                  >
                    {isFixing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {includeCitations ? 'Researching & Rewriting...' : 'Magic in progress...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Humanize Text
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {viewMode === 'clean' ? (
                     <TextDisplay text={fixResult.rewrittenText} className="text-slate-800 font-medium" />
                ) : (
                     <DiffDisplay oldText={originalText} newText={fixResult.rewrittenText} />
                )}
                
                {fixResult.references && fixResult.references.length > 0 && (
                     <div className="mt-8 mb-6 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-600" />
                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                                    References 
                                    {citationStyle && <span className="ml-2 bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded text-[10px]">{citationStyle}</span>}
                                </h4>
                             </div>
                             <button onClick={() => {
                                 navigator.clipboard.writeText(fixResult.references!.join('\n\n'));
                                 toast.success("All references copied");
                             }} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                 Copy All
                             </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {fixResult.references.map((ref, i) => (
                                <div key={i} className="group relative pl-4 border-l-2 border-slate-300 hover:border-indigo-500 transition-colors">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm text-slate-700 leading-relaxed font-serif">
                                            {/* Render italics/formatting crudely if present, or just text */}
                                            <span dangerouslySetInnerHTML={{ __html: ref.replace(/\*(.*?)\*/g, '<i>$1</i>') }}></span>
                                        </p>
                                        <button 
                                            onClick={() => copyRef(ref)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 bg-indigo-50/50 -mx-6 p-6">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3">Transformation Report</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fixResult.improvementsMade && fixResult.improvementsMade.length > 0 ? (
                            fixResult.improvementsMade.map((imp, i) => (
                                <li key={i} className="flex items-start text-xs text-indigo-800 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-indigo-500 mt-0.5 flex-shrink-0" />
                                    {imp}
                                </li>
                            ))
                        ) : (
                            <li className="flex items-start text-xs text-indigo-800 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-indigo-500 mt-0.5 flex-shrink-0" />
                                Optimized for readability and uniqueness
                            </li>
                        )}
                    </ul>
                </div>

                <div className="mt-0 border-t border-indigo-100 bg-white -mx-6 -mb-6 p-6">
                    {!isFeedbackSubmitted ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-slate-800">Rate this rewrite</h4>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            onClick={() => setRating(star)}
                                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                        >
                                            <Star 
                                                className={`w-5 h-5 ${star <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 fill-slate-100'}`} 
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <textarea 
                                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                                    rows={2}
                                    placeholder="Help us improve. What did you like or dislike? (Optional)"
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                />
                                <button 
                                    onClick={submitFeedback}
                                    className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                    disabled={rating === 0}
                                    title="Submit Feedback"
                                >
                                    <Send className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-2 text-center animate-in fade-in zoom-in duration-300">
                             <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                <ThumbsUp className="w-4 h-4" />
                             </div>
                             <p className="text-sm font-bold text-slate-800">Thank you!</p>
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-8 pb-12">
        <button 
            onClick={onReset}
            disabled={isFixing}
            className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Start New Scan 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default AnalysisView;
