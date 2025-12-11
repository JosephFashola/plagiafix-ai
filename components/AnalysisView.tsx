import React, { useState, useEffect } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions } from '../types';
import ScoreGauge from './ScoreGauge';
import { Wand2, AlertTriangle, CheckCircle2, ArrowRight, Copy, Check, ChevronDown, ChevronUp, BookOpen, FileText, Star, MessageSquare, Send, ThumbsUp, Settings2, Download, Split, Eye } from 'lucide-react';
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

// Sub-component to handle massive text rendering safely
const TextDisplay: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    const PREVIEW_LENGTH = 5000;
    const [showFull, setShowFull] = useState(false);
    const isLong = text.length > PREVIEW_LENGTH;
    
    const displayText = showFull || !isLong ? text : text.slice(0, PREVIEW_LENGTH) + "...";

    return (
        <div className={`relative ${className}`}>
            <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-serif">
                {displayText}
            </p>
            {isLong && !showFull && (
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-4">
                     <button 
                        onClick={() => setShowFull(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-full text-sm transition-colors border border-indigo-200 shadow-sm"
                     >
                        <ChevronDown className="w-4 h-4" />
                        Show Full Document ({text.length.toLocaleString()} chars)
                     </button>
                </div>
            )}
            {isLong && showFull && (
                 <div className="mt-8 flex justify-center pb-4">
                    <button 
                    onClick={() => setShowFull(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-full text-sm transition-colors border border-slate-200"
                    >
                    <ChevronUp className="w-4 h-4" />
                    Collapse
                    </button>
                </div>
            )}
        </div>
    );
};

// Component to render color-coded Diff
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
  const [includeCitations, setIncludeCitations] = useState(false);
  const [academicLevel, setAcademicLevel] = useState<FixOptions['academicLevel']>('Undergraduate');
  const [tone, setTone] = useState<FixOptions['tone']>('Standard');
  const [dialect, setDialect] = useState<FixOptions['dialect']>('US');

  // Feedback State
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);

  // Reset feedback when a new result is generated
  useEffect(() => {
    setRating(0);
    setHoverRating(0);
    setFeedbackText('');
    setIsFeedbackSubmitted(false);
    setViewMode('clean'); // Reset to clean view on new fix
  }, [fixResult]);

  const handleCopy = () => {
    if (fixResult?.rewrittenText) {
      navigator.clipboard.writeText(fixResult.rewrittenText);
      setCopied(true);
      toast.success('Humanized text copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyRef = (ref: string) => {
      navigator.clipboard.writeText(ref);
      toast.success('Citation copied');
  }

  const handleFixClick = () => {
      onFix({ 
          includeCitations,
          academicLevel,
          tone,
          dialect
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
        
        <div className="md:col-span-3 bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
             <AlertTriangle className="h-5 w-5 text-amber-500" />
             <h3 className="text-lg font-bold text-slate-800">AI Detection & Critique</h3>
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed">{analysis.critique}</p>
          
          <div className="flex flex-wrap gap-2">
            {analysis.detectedIssues.map((issue, idx) => (
              <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                {issue}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:h-[700px] h-auto">
        
        {/* Left: Original */}
        <div className="flex flex-col h-full min-h-[500px] lg:min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                Original Text
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">Read Only</span>
          </div>
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
             <TextDisplay text={originalText} className="text-slate-600" />
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
                    {/* View Mode Toggle */}
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

                   <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-800 mr-2">
                     Score: {100 - fixResult.newPlagiarismScore}/100
                   </span>
                   
                   {/* Export Actions */}
                   <button 
                    onClick={() => downloadDocx(fixResult.rewrittenText)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Export as DOCX"
                   >
                       <FileText className="h-4 w-4" />
                   </button>
                   <button 
                    onClick={() => downloadPdf(fixResult.rewrittenText, 100 - fixResult.newPlagiarismScore, analysis.originalScore)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Export Verification Certificate (PDF)"
                   >
                       <Download className="h-4 w-4" />
                   </button>
                   
                   <div className="h-4 w-px bg-slate-200 mx-1"></div>

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

          <div className="flex-1 p-6 overflow-y-auto relative">
            {!fixResult ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 p-8 text-center backdrop-blur-sm overflow-y-auto">
                <div className="w-full max-w-sm mx-auto my-auto">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Eliminate Plagiarism</h4>
                  <p className="text-slate-600 mb-6 text-sm">
                    Customize how our Gemini 3 Pro model rewrites your content.
                  </p>
                  
                  {/* Customization Panel */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 text-left space-y-4">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                             <Settings2 className="w-4 h-4 text-slate-400" />
                             <span className="text-xs font-bold text-slate-500 uppercase">Configuration</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Academic Level</label>
                                <select 
                                    value={academicLevel}
                                    onChange={(e) => setAcademicLevel(e.target.value as any)}
                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:border-indigo-500 outline-none"
                                >
                                    <option value="High School">High School</option>
                                    <option value="Undergraduate">Undergraduate</option>
                                    <option value="PhD/Professional">PhD / Professional</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">English Dialect</label>
                                <select 
                                    value={dialect}
                                    onChange={(e) => setDialect(e.target.value as any)}
                                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:border-indigo-500 outline-none"
                                >
                                    <option value="US">US English</option>
                                    <option value="UK">UK English</option>
                                    <option value="CA">Canadian</option>
                                    <option value="AU">Australian</option>
                                </select>
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Tone & Style</label>
                            <select 
                                value={tone}
                                onChange={(e) => setTone(e.target.value as any)}
                                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:border-indigo-500 outline-none"
                            >
                                <option value="Standard">Standard Professional</option>
                                <option value="Formal">Highly Formal & Objective</option>
                                <option value="Storytelling">Narrative & Flowing</option>
                                <option value="Opinionated">Opinionated & Direct</option>
                            </select>
                        </div>
                  </div>
                  
                  {/* Citations Option */}
                  <div className="mb-6 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-left hover:border-indigo-300 transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer group select-none">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${includeCitations ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                             {includeCitations && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={includeCitations} 
                            onChange={(e) => setIncludeCitations(e.target.checked)} 
                          />
                          <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 flex items-center gap-2">
                                  Auto-Cite Sources (APA)
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 uppercase">Beta</span>
                              </span>
                          </div>
                      </label>
                  </div>

                  <button 
                    onClick={handleFixClick}
                    disabled={isFixing}
                    className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
                  >
                    {isFixing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {includeCitations ? 'Researching & Rewriting...' : 'Humanizing...'}
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        Make It Unique
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Dynamic View Mode: Diff vs Clean */}
                {viewMode === 'clean' ? (
                     <TextDisplay text={fixResult.rewrittenText} className="text-slate-800 font-medium" />
                ) : (
                     <DiffDisplay oldText={originalText} newText={fixResult.rewrittenText} />
                )}
                
                {/* References Section */}
                {fixResult.references && fixResult.references.length > 0 && (
                     <div className="mt-8 mb-6 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-100 flex items-center gap-2">
                             <BookOpen className="w-4 h-4 text-indigo-600" />
                             <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">References (APA Style)</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {fixResult.references.map((ref, i) => (
                                <div key={i} className="group relative pl-4 border-l-2 border-indigo-300 hover:border-indigo-500 transition-colors">
                                    {ref.startsWith('http') ? (
                                        <a href={ref} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-700 hover:underline leading-relaxed block pr-8 truncate">
                                            {ref}
                                        </a>
                                    ) : (
                                        <p className="text-sm text-slate-700 leading-relaxed italic pr-8">
                                            {ref}
                                        </p>
                                    )}
                                    <button 
                                        onClick={() => handleCopyRef(ref)}
                                        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                                        title="Copy Citation"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {/* Transformation Report */}
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

                {/* Feedback Section */}
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
                             <p className="text-xs text-slate-500">Your feedback helps train our model.</p>
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action */}
      {fixResult && (
         <div className="flex justify-center pt-8 pb-12">
            <button 
                onClick={onReset}
                className="group flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-600 font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md"
            >
                Start New Scan 
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
         </div>
      )}
    </div>
  );
};

export default AnalysisView;