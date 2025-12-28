import React, { useState } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, CitationStyle, LinguisticProfile, RewriteFeedback, SlideContent, SummaryMemo } from '../types';
import ScoreGauge from './ScoreGauge';
import ForensicRadar from './ForensicRadar';
import RatingModal from './RatingModal';
import { 
  ShieldAlert, RefreshCw, Zap, CheckCircle, 
  ExternalLink, Sparkles, 
  Library, Globe, Share2, 
  Activity, Info, Book, ScrollText, Briefcase,
  FileOutput, Trash2, ShieldCheck, Settings2,
  Linkedin, Quote, Twitter,
  Star, Send, User, Mail, CheckCircle2,
  Fingerprint, FileText, Download, Presentation, FileSearch, ClipboardList, X, ArrowRight, Heart
} from 'lucide-react';
import { downloadPdf, downloadDocx } from '../services/exportService';
import { generatePptx } from '../services/slideGenerator';
import { generateSlides, generateSummary } from '../services/geminiService';
import { Telemetry } from '../services/telemetry';
import StyleDNAVault, { SYSTEM_ARCHETYPES } from './StyleDNAVault';
import toast from 'react-hot-toast';

interface AnalysisViewProps {
  originalText: string;
  analysis: AnalysisResult;
  fixResult: FixResult | null;
  status: AppStatus;
  onFix: (options: FixOptions) => void;
  onUpdateText: (newText: string) => void;
  onReset: () => void;
  scoreHistory?: number[];
  profiles: LinguisticProfile[];
  activeProfileId: string | null;
  onProfileSelect: (id: string | null) => void;
  onAddProfile: (profile: LinguisticProfile) => void;
}

const IconRenderer = ({ name, className }: { name: string, className?: string }) => {
  switch (name) {
    case 'Book': return <Book className={className} />;
    case 'ScrollText': return <ScrollText className={className} />;
    case 'Library': return <Library className={className} />;
    case 'Ghost': return <Sparkles className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    default: return <Fingerprint className={className} />;
  }
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  originalText, analysis, fixResult, status, onFix, onUpdateText, onReset,
  scoreHistory = [], profiles, activeProfileId, onProfileSelect, onAddProfile
}) => {
  const isFixing = status === AppStatus.FIXING;
  const [viewMode, setViewMode] = useState<'editor' | 'citations'>('editor');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [dialect, setDialect] = useState<'US' | 'UK' | 'CA' | 'AU'>('US');
  const [showDNAVault, setShowDNAVault] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  
  // Generation States
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryMemo | null>(null);
  
  // Feedback States
  const [fbRating, setFbRating] = useState(0);
  const [fbName, setFbName] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbComment, setFbComment] = useState('');
  const [fbSubmitted, setFbSubmitted] = useState(false);

  const currentAiRisk = fixResult ? fixResult.newAiProbability : analysis.aiProbability;
  const currentPlagRisk = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;
  const bibliography = fixResult?.bibliography || [];

  const handleGenerateSlides = async () => {
    if (!fixResult) return;
    setIsGeneratingSlides(true);
    try {
      const slides = await generateSlides(fixResult.rewrittenText);
      if (slides && slides.length > 0) {
        await generatePptx(slides, 'Institutional_Presentation');
      } else {
        toast.error("Could not sequence slide data.");
      }
    } catch (e) {
      toast.error("Slide synthesis failed.");
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!fixResult) return;
    setIsGeneratingSummary(true);
    try {
      const res = await generateSummary(fixResult.rewrittenText);
      setSummary(res);
      toast.success("Memo Synthesized");
    } catch (e) {
      toast.error("Summary synthesis failed.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleShare = async (platform: string) => {
    const shareText = `I achieved ${100 - currentAiRisk}% human stealth on my work with PlagiaFix AI! 🧬 Zero-trace institutional humanization is here. #PlagiaFix #AI #AcademicFreedom`;
    const shareUrl = window.location.origin;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Forensic Linguistic Report', text: shareText, url: shareUrl });
        } catch (e) {}
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (fbRating === 0) {
      toast.error("Please select a rating to calibrate.");
      return;
    }
    if (!fbName.trim() || !fbEmail.trim()) {
      toast.error("Name and Email required for verification.");
      return;
    }

    try {
      const fb: RewriteFeedback = {
        firstName: fbName,
        email: fbEmail,
        rating: fbRating,
        comment: fbComment,
        originalScore: analysis.aiProbability,
        fixedScore: fixResult?.newAiProbability
      };
      await Telemetry.logRewriteFeedback(fb);
      setFbSubmitted(true);
      toast.success("Stealth calibration saved", { icon: '🧬' });
    } catch (e) {
      toast.error("Transmission failed.");
    }
  };

  const currentProfile = profiles.find(p => p.id === activeProfileId) || 
                         SYSTEM_ARCHETYPES.find(p => p.id === activeProfileId) || 
                         SYSTEM_ARCHETYPES.find(p => p.id === 'sys_ghost');

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* Forensic Intelligence Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <ScoreGauge score={currentAiRisk} label="Neural Pattern Risk" history={scoreHistory} />
          <ScoreGauge score={currentPlagRisk} label="Source Overlap" />
        </div>
        
        <div className="lg:col-span-6 bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-xl shadow-slate-100/30 flex flex-col group transition-all duration-500 hover:shadow-2xl hover:border-indigo-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Activity className="w-6 h-6 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] font-heading">Linguistic Forensics</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleShare('native')} className="w-11 h-11 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-full flex items-center justify-center transition-all border border-slate-100"><Share2 className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[400px] flex items-center justify-center">
            <ForensicRadar data={fixResult?.fidelityMap || analysis.forensics.radarMetrics || []} />
          </div>

          <div className="grid grid-cols-3 gap-6 mt-8">
            {[
              { l: 'Readability', v: analysis.forensics.readabilityScore },
              { l: 'Variance', v: analysis.forensics.sentenceVariance },
              { l: 'Lexical', v: (analysis.forensics.uniqueWordRatio * 100).toFixed(0) + '%' }
            ].map(stat => (
              <div key={stat.l} className="bg-slate-50/50 rounded-3xl p-6 text-center border border-slate-100 transition-colors group-hover:bg-white">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.l}</p>
                 <p className="text-2xl font-black text-slate-900 font-heading">{stat.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-8">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative group overflow-hidden shadow-2xl flex-1">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldAlert className="w-32 h-32" /></div>
            <div className="flex items-center gap-4 mb-8">
              <Info className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest font-heading">Institutional critique</h3>
            </div>
            <div className="space-y-6 relative z-10">
              <p className="text-slate-400 text-sm font-medium leading-relaxed italic border-l-2 border-indigo-500 pl-6 py-2">"{analysis.critique}"</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {analysis.detectedIssues.slice(0, 4).map((issue, i) => (
                  <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-wider rounded-xl">{issue}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -bottom-6 -right-6 opacity-10 group-hover:scale-110 transition-transform">
               <Share2 className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Social Sync</h4>
              <p className="text-2xl font-black uppercase tracking-tight font-heading mb-6">Verify Results</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => handleShare('twitter')} className="py-3.5 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-[9px] tracking-widest"><Twitter className="w-3.5 h-3.5" /> X</button>
                 <button onClick={() => handleShare('linkedin')} className="py-3.5 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/20 transition-all font-black uppercase text-[9px] tracking-widest"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor & Content Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 space-y-6 sticky top-24">
           
           {fixResult && (
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-left duration-700">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Post-Analysis Tools</h3>
                   <Fingerprint className="w-4 h-4 text-indigo-400" />
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleGenerateSlides}
                    disabled={isGeneratingSlides}
                    className="w-full p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-4 hover:bg-black transition-all disabled:opacity-50"
                  >
                    <div className="p-2 bg-indigo-600 rounded-lg">
                      {isGeneratingSlides ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase tracking-widest">Slide Deck</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Institutional PPTX</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-indigo-600 transition-all disabled:opacity-50"
                  >
                    <div className="p-2 bg-slate-100 text-slate-900 rounded-lg">
                      {isGeneratingSummary ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Executive Memo</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase">Synthesis Report</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setIsRatingOpen(true)}
                    className="w-full p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 hover:bg-indigo-100 transition-all text-indigo-600"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                       <Heart className="w-4 h-4 fill-current" />
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase tracking-widest">Rate Studio</p>
                       <p className="text-[8px] font-bold opacity-60 uppercase">Share Stealth Success</p>
                    </div>
                  </button>
                </div>
             </div>
           )}

           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settings</h3>
                <Settings2 className="w-4 h-4 text-slate-300" />
              </div>
              <div className="space-y-6">
                 {/* Citation Style */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 ml-2">
                     <Quote className="w-3.5 h-3.5 text-indigo-600" />
                     <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Citations</label>
                   </div>
                   <select value={citationStyle} onChange={(e) => setCitationStyle(e.target.value as CitationStyle)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all cursor-pointer">
                     <option value="APA">APA 7th Edition</option>
                     <option value="MLA">MLA 9th Edition</option>
                     <option value="Chicago">Chicago Manual</option>
                     <option value="Harvard">Harvard Style</option>
                     <option value="IEEE">IEEE Style</option>
                     <option value="Vancouver">Vancouver</option>
                     <option value="Nature">Nature Journal</option>
                     <option value="Bluebook">Bluebook</option>
                   </select>
                 </div>

                 {/* English Dialect */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 ml-2">
                     <Globe className="w-3.5 h-3.5 text-indigo-600" />
                     <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">English Dialect</label>
                   </div>
                   <select value={dialect} onChange={(e) => setDialect(e.target.value as any)} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all cursor-pointer">
                     <option value="US">American (US)</option>
                     <option value="UK">British (UK)</option>
                     <option value="CA">Canadian (CA)</option>
                     <option value="AU">Australian (AU)</option>
                   </select>
                 </div>
                 
                 <button onClick={() => setViewMode(viewMode === 'citations' ? 'editor' : 'citations')} className={`w-full p-6 border rounded-[2.25rem] transition-all flex items-center gap-4 ${viewMode === 'citations' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 hover:border-indigo-200'}`}>
                    <div className={`p-3 rounded-xl ${viewMode === 'citations' ? 'bg-white/20' : 'bg-white border'}`}><Library className="w-5 h-5" /></div>
                    <div className="text-left">
                       <p className="text-[11px] font-black uppercase">Verified Library</p>
                       <p className="text-[8px] font-bold uppercase mt-1 opacity-60">{bibliography.length} Grounded References</p>
                    </div>
                 </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-9 flex flex-col gap-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent pointer-events-none"></div>
              <div className="flex items-center gap-6 relative z-10">
                 <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/40 relative">
                    <IconRenderer name={currentProfile?.iconName || 'Fingerprint'} className="w-7 h-7" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Writing Signature</h4>
                    <p className="text-2xl font-black uppercase tracking-tight font-heading">{currentProfile?.name}</p>
                 </div>
              </div>
              <div className="flex gap-4 relative z-10">
                <button onClick={() => setShowDNAVault(true)} className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all">Change DNA</button>
              </div>
           </div>

           <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col min-h-[800px] overflow-hidden relative">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-heading">Neural Buffer Output</h3>
                </div>
                <div className="flex gap-3">
                  {fixResult && (
                    <>
                      <button 
                        onClick={() => downloadDocx(fixResult.rewrittenText, 'PlagiaFix_Institutional_Doc', bibliography)} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" /> DOCX
                      </button>
                      <button 
                        onClick={() => downloadPdf(fixResult.rewrittenText, 100, 0, 'PlagiaFix_Verification_Certificate')} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF Certificate
                      </button>
                    </>
                  )}
                  <button onClick={onReset} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-white border border-slate-100 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {viewMode === 'citations' ? (
                  <div className="p-16 space-y-12 animate-in fade-in duration-500">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-10">
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black text-slate-900 font-heading uppercase tracking-tighter">Verified Library</h3>
                        <p className="text-slate-400 font-medium text-sm">Grounded research synced via Deep Web audit (Style: {citationStyle}).</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {bibliography.length === 0 ? <p className="col-span-2 text-center opacity-30 italic py-20">No references grounded yet. Run 'Ground & Purify' to audit the web.</p> : 
                      bibliography.map((s, i) => (
                        <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-indigo-200 transition-all">
                          <div className="flex justify-between items-start mb-6">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Entry #{i+1}</span>
                            <a href={s.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"><ExternalLink className="w-4 h-4" /></a>
                          </div>
                          {s.fullCitation ? (
                            <p className="text-sm font-medium text-slate-900 leading-relaxed mb-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-serif-doc">
                               {s.fullCitation}
                            </p>
                          ) : (
                            <h4 className="text-lg font-black text-slate-900 leading-tight mb-4">{s.title}</h4>
                          )}
                          <p className="text-[11px] text-slate-500 mb-6 leading-relaxed italic border-l-2 border-slate-200 pl-4">"{s.snippet}"</p>
                          <div className="flex items-center gap-2 text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1.5 rounded-full w-fit"><CheckCircle className="w-3 h-3" /> Grounded</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 font-serif-doc text-xl leading-relaxed text-slate-800 h-full">
                    {fixResult ? (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div contentEditable onBlur={(e) => onUpdateText(e.currentTarget.innerText)} className="outline-none whitespace-pre-wrap p-6 rounded-3xl min-h-[600px] border-2 border-transparent focus:border-indigo-50 focus:bg-slate-50/20">
                          {fixResult.rewrittenText}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-12 py-20">
                        <div className="relative p-16 bg-indigo-50 rounded-[5rem] text-indigo-600 shadow-inner">
                           <Sparkles className="w-32 h-32 animate-pulse" />
                           <div className="absolute -top-6 -right-6 bg-slate-900 text-white text-[11px] font-black px-8 py-4 rounded-3xl uppercase tracking-[0.2em] shadow-2xl border border-white/10">V14 ULTRA STEALTH</div>
                        </div>

                        <div className="w-full max-w-xl bg-slate-50 p-12 rounded-[4rem] border border-slate-100 shadow-2xl space-y-10 text-left">
                           <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deep Research</label>
                                 <div className="w-full p-5 bg-white border border-slate-100 rounded-2xl text-[13px] font-black text-slate-900 flex items-center justify-between shadow-sm">Live Grounding <Globe className="w-4 h-4 text-emerald-500" /></div>
                              </div>
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bypass Logic</label>
                                 <div className="w-full p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between text-[13px] font-black text-slate-900 shadow-sm">Institutional <ShieldCheck className="w-4 h-4 text-indigo-600" /></div>
                              </div>
                           </div>
                           <button onClick={() => onFix({ mode: 'IvyStealth', strength: 99, includeCitations: true, citationStyle, dialect, styleProfileId: activeProfileId || undefined })} disabled={isFixing} className="w-full py-7 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.25em] text-sm shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-black transition-all flex items-center justify-center gap-6 relative overflow-hidden">
                              {isFixing ? <RefreshCw className="animate-spin w-6 h-6 text-indigo-400" /> : <Zap className="w-6 h-6 text-amber-500 fill-current" />}
                              {isFixing ? 'Auditing Timechain...' : 'Ground & Purify'}
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Summary/Memo Preview Modal */}
      {summary && (
        <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/20 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                    <ClipboardList className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Executive Synthesis Memo</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Review Series</p>
                 </div>
               </div>
               <button onClick={() => setSummary(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <X className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 bg-slate-50">
               <div className="max-w-2xl mx-auto bg-white p-16 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-10 font-serif-doc">
                  <div className="space-y-2 border-b-2 border-slate-900 pb-8">
                     <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                        <span>Memo To: {summary.to}</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                     </div>
                     <p className="text-sm font-black uppercase tracking-widest text-slate-900">From: {summary.from}</p>
                     <p className="text-xl font-black uppercase tracking-tighter text-indigo-600 mt-4">Subject: {summary.subject}</p>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Executive Summary</h3>
                     <p className="text-lg leading-relaxed text-slate-700">{summary.executiveSummary}</p>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Key Action Items</h3>
                     <ul className="space-y-4">
                        {summary.keyActionItems.map((item, idx) => (
                           <li key={idx} className="flex gap-4 items-start">
                              <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-600 shrink-0"></div>
                              <p className="text-lg text-slate-700">{item}</p>
                           </li>
                        ))}
                     </ul>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-slate-100">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Conclusion</h3>
                     <p className="text-lg leading-relaxed text-slate-700 italic">"{summary.conclusion}"</p>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4">
               <button onClick={() => setSummary(null)} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Dismiss</button>
               <button onClick={() => { downloadPdf(JSON.stringify(summary), 100, 0, 'Executive_Memo'); setSummary(null); }} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                  <Download className="w-4 h-4" /> Download PDF
               </button>
            </div>
          </div>
        </div>
      )}

      {isRatingOpen && <RatingModal onClose={() => setIsRatingOpen(false)} />}
      {showDNAVault && <StyleDNAVault profiles={profiles} activeProfileId={activeProfileId} onProfileSelect={onProfileSelect} onAddProfile={onAddProfile} onClose={() => setShowDNAVault(false)} />}
    </div>
  );
};

export default AnalysisView;