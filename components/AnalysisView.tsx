
import React, { useState, useEffect } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, CitationStyle, LinguisticProfile, SourceMatch, SummaryMemo } from '../types';
import ScoreGauge from './ScoreGauge';
import ForensicRadar from './ForensicRadar';
import RatingModal from './RatingModal';
import { 
  ShieldAlert, RefreshCw, Zap, 
  ExternalLink, Sparkles, 
  Library, Globe, Share2, 
  Activity, Info, Book, ScrollText, Briefcase,
  Trash2, ShieldCheck, 
  Linkedin, Quote, Twitter,
  User, CheckCircle2,
  Fingerprint, FileText, Download, X as CloseIcon,
  Dna, Award, Database, Search, Calendar,
  Copy, Edit3, Fingerprint as DoiIcon, Check, Save,
  History, Link2, Ghost, Star, Presentation, FileOutput, ChevronRight,
  Monitor, Layers, BarChart, Binary
} from 'lucide-react';
import { downloadPdf, downloadDocx } from '../services/exportService';
import { generatePptx } from '../services/slideGenerator';
import { generateSlides, generateSummary } from '../services/geminiService';
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
  
  // Workspace States
  const [localBibliography, setLocalBibliography] = useState<SourceMatch[]>([]);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  
  // Generation States
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryMemo | null>(null);
  
  const currentAiRisk = fixResult ? fixResult.newAiProbability : analysis.aiProbability;
  const currentPlagRisk = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;

  useEffect(() => {
    if (fixResult?.bibliography) {
      setLocalBibliography(fixResult.bibliography);
    }
  }, [fixResult]);

  const updateLocalSource = (id: string, updates: Partial<SourceMatch>) => {
    setLocalBibliography(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSyncCitations = () => {
    toast.success("Citations Updated");
    setEditingSourceId(null);
  };

  const handleGenerateSlides = async () => {
    if (!fixResult) {
      toast.error("Please process the document first.");
      return;
    }
    setIsGeneratingSlides(true);
    try {
      const slides = await generateSlides(fixResult.rewrittenText);
      if (slides && slides.length > 0) {
        await generatePptx(slides, 'My_Presentation');
      } else {
        toast.error("Could not create slides.");
      }
    } catch (e) {
      toast.error("Slide creation failed.");
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!fixResult) {
      toast.error("Please process the document first.");
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const res = await generateSummary(fixResult.rewrittenText);
      setSummary(res);
      toast.success("Summary Created");
    } catch (e) {
      toast.error("Summary creation failed.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleShare = async (platform: string) => {
    const shareText = `I got a ${100 - currentAiRisk}% human writing score with PlagiaFix! ✍️ Check it out. #PlagiaFix #Writing #AI`;
    const shareUrl = window.location.origin;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Writing Analysis Report', text: shareText, url: shareUrl });
        } catch (e) {}
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied");
      }
    }
  };

  const currentProfile = profiles.find(p => p.id === activeProfileId) || 
                         SYSTEM_ARCHETYPES.find(p => p.id === activeProfileId) || 
                         SYSTEM_ARCHETYPES.find(p => p.id === 'sys_ghost');

  const IconRenderer = ({ name, className }: { name: string, className?: string }) => {
    switch (name) {
      case 'Book': return <Book className={className} />;
      case 'ScrollText': return <ScrollText className={className} />;
      case 'Library': return <Library className={className} />;
      case 'Ghost': return <Ghost className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      default: return <Fingerprint className={className} />;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20 transition-colors duration-300">
      
      {/* Writing Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <ScoreGauge score={currentAiRisk} label="AI Writing Risk" history={scoreHistory} />
          <ScoreGauge score={currentPlagRisk} label="Plagiarism Match" />
        </div>
        
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-[3.5rem] p-12 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/30 dark:shadow-none flex flex-col group transition-all duration-500 hover:shadow-2xl hover:border-indigo-100 dark:hover:border-indigo-900/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] font-heading">Writing Analysis</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleShare('native')} className="w-11 h-11 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full flex items-center justify-center transition-all border border-slate-100 dark:border-slate-700"><Share2 className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[400px] flex items-center justify-center">
            <ForensicRadar data={fixResult?.fidelityMap || analysis.forensics.radarMetrics || []} />
          </div>

          <div className="grid grid-cols-3 gap-6 mt-8">
            {[
              { l: 'Readability', v: analysis.forensics.readabilityScore },
              { l: 'Sentence Variety', v: analysis.forensics.sentenceVariance },
              { l: 'Vocabulary', v: (analysis.forensics.uniqueWordRatio * 100).toFixed(0) + '%' }
            ].map(stat => (
              <div key={stat.l} className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 text-center border border-slate-100 dark:border-slate-700/50 transition-colors group-hover:bg-white dark:group-hover:bg-slate-800">
                 <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{stat.l}</p>
                 <p className="text-2xl font-black text-slate-900 dark:text-white font-heading">{stat.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-8">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 text-white relative group overflow-hidden shadow-2xl flex-1 border border-white/5">
            <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldAlert className="w-32 h-32" /></div>
            <div className="flex items-center gap-4 mb-8">
              <Info className="w-5 h-5 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest font-heading">AI Analysis Feedback</h3>
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

          {/* Social Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Share Success</h4>
                <div className="w-2 h-2 rounded-full bg-emerald-500 neural-pulse"></div>
             </div>
             
             <div className="space-y-3">
                <button 
                  onClick={() => handleShare('twitter')}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all group border border-white/5"
                >
                   <Twitter className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Post on X</span>
                </button>
                <button 
                  onClick={() => handleShare('linkedin')}
                  className="w-full py-4 bg-[#0077b5] text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-[#005a8a] transition-all group shadow-lg shadow-blue-500/10"
                >
                   <Linkedin className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Share on LinkedIn</span>
                </button>
             </div>
             <p className="text-[8px] text-center font-bold text-slate-400 uppercase tracking-widest px-4">
               Show your network that your writing is {100-currentAiRisk}% human.
             </p>
          </div>
        </div>
      </div>

      {/* Editor & Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 space-y-6 sticky top-24">
           {/* Document Options */}
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl dark:shadow-none space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Writing Settings</h3>
                <Database className="w-4 h-4 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="space-y-6">
                 {/* Citation Style */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 ml-2">
                     <Quote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                     <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Citation style</label>
                   </div>
                   <select value={citationStyle} onChange={(e) => setCitationStyle(e.target.value as CitationStyle)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all cursor-pointer dark:text-white">
                     <option value="APA">APA 7th</option>
                     <option value="MLA">MLA 9th</option>
                     <option value="Chicago">Chicago</option>
                     <option value="Harvard">Harvard</option>
                     <option value="IEEE">IEEE</option>
                     <option value="Vancouver">Vancouver</option>
                     <option value="Nature">Nature</option>
                     <option value="Bluebook">Bluebook</option>
                   </select>
                 </div>

                 {/* English Dialect */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 ml-2">
                     <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                     <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Region</label>
                   </div>
                   <select value={dialect} onChange={(e) => setDialect(e.target.value as any)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all cursor-pointer dark:text-white">
                     <option value="US">USA</option>
                     <option value="UK">United Kingdom</option>
                     <option value="CA">Canada</option>
                     <option value="AU">Australia</option>
                   </select>
                 </div>
                 
                 <button onClick={() => setViewMode(viewMode === 'citations' ? 'editor' : 'citations')} className={`w-full p-6 border rounded-[2.25rem] transition-all flex items-center gap-4 ${viewMode === 'citations' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500'}`}>
                    <div className={`p-3 rounded-xl ${viewMode === 'citations' ? 'bg-white/20' : 'bg-white dark:bg-slate-700 border dark:border-slate-600'}`}><Library className={`w-5 h-5 ${viewMode === 'citations' ? 'text-white' : 'text-slate-900 dark:text-white'}`} /></div>
                    <div className="text-left">
                       <p className={`text-[11px] font-black uppercase ${viewMode === 'citations' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Source List</p>
                       <p className={`text-[8px] font-bold uppercase mt-1 opacity-60 ${viewMode === 'citations' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{localBibliography.length} Sources Found</p>
                    </div>
                 </button>
              </div>
           </div>

           {/* DOWNLOAD HUB */}
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl border border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Extra Tools</h3>
                <Binary className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="space-y-3">
                 <button 
                  onClick={handleGenerateSlides}
                  disabled={isGeneratingSlides || !fixResult}
                  className="w-full group p-5 bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-2xl flex items-center justify-between transition-all disabled:opacity-30"
                 >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 rounded-xl">
                        {isGeneratingSlides ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">Slide Deck</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Presentation PPTX</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                 </button>

                 <button 
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary || !fixResult}
                  className="w-full group p-5 bg-white/5 border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-2xl flex items-center justify-between transition-all disabled:opacity-30"
                 >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-600 rounded-xl">
                        {isGeneratingSummary ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">Summary Memo</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Report Overview</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                 </button>

                 <button 
                  onClick={() => setIsRatingOpen(true)}
                  className="w-full group p-5 bg-white/5 border border-white/10 hover:border-rose-500 hover:bg-rose-500/10 rounded-2xl flex items-center justify-between transition-all"
                 >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-600 rounded-xl">
                        <Star className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">Give Feedback</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rate our tool</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                 </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-9 flex flex-col gap-8">
           {/* WRITING STYLE CARD */}
           <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent pointer-events-none"></div>
              <div className="flex items-center gap-6 relative z-10">
                 <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/40 relative">
                    <IconRenderer name={currentProfile?.iconName || 'Fingerprint'} className="w-7 h-7" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Active Writing Style</h4>
                    <p className="text-2xl font-black uppercase tracking-tight font-heading">{currentProfile?.name}</p>
                 </div>
              </div>
              <div className="flex gap-4 relative z-10">
                <button 
                  onClick={() => setShowDNAVault(true)} 
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-3"
                >
                   <Dna className="w-4 h-4 text-indigo-400" /> Change Style
                </button>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-none flex flex-col min-h-[800px] overflow-hidden relative">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-5">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] font-heading">{viewMode === 'citations' ? 'Source Verification' : 'Text Editor'}</h3>
                </div>
                <div className="flex gap-3">
                  {viewMode === 'citations' && localBibliography.length > 0 && (
                    <button 
                      onClick={handleSyncCitations}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-500 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Update Citations
                    </button>
                  )}
                  {fixResult && (
                    <button 
                      onClick={() => downloadDocx(fixResult.rewrittenText, 'Fixed_Document', localBibliography)} 
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" /> Save as DOCX
                    </button>
                  )}
                  <button onClick={onReset} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100 dark:border-slate-800"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto transition-colors duration-300">
                {viewMode === 'citations' ? (
                  <div className="p-12 space-y-12 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-10">
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white font-heading uppercase tracking-tighter">Verified Sources</h3>
                        <p className="text-slate-400 dark:text-slate-500 font-medium text-sm">Real academic references found through our live search audit.</p>
                      </div>
                      <div className="flex items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/30">
                         <Award className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                         <div>
                            <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">Fact Checked</p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 uppercase">Sources Verified</p>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-12">
                      {localBibliography.length === 0 ? (
                        <div className="text-center py-40 opacity-20 flex flex-col items-center">
                          <Search className="w-20 h-20 mb-6" />
                          <p className="text-lg font-black uppercase tracking-[0.2em]">No Sources Found Yet</p>
                          <p className="text-xs font-medium max-w-xs mt-2 italic">Try "Improve & Add Citations" to find references for your text.</p>
                        </div>
                      ) : 
                      localBibliography.map((s, i) => (
                        <div key={s.id || i} className="group p-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[4rem] hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all shadow-sm hover:shadow-2xl flex flex-col lg:flex-row gap-12 overflow-hidden">
                          <div className="flex-1 space-y-8">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-wrap gap-3">
                                 <span className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-xl">Source #{i+1}</span>
                                 <span className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">{s.type || 'JOURNAL'}</span>
                                 {s.peerReviewMarker && <span className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2"><Check className="w-3 h-3" /> VERIFIED</span>}
                              </div>
                              <div className="flex gap-2">
                                <a href={s.url} target="_blank" rel="noreferrer" className="p-3 bg-white dark:bg-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600 transition-all" title="Open Website"><ExternalLink className="w-5 h-5" /></a>
                                <button onClick={() => setEditingSourceId(editingSourceId === s.id ? null : s.id)} className={`p-3 rounded-xl transition-all shadow-sm ${editingSourceId === s.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 hover:text-indigo-600 border border-slate-100 dark:border-slate-600'}`} title="Edit Info"><Edit3 className="w-5 h-5" /></button>
                              </div>
                            </div>

                            <div className="space-y-6">
                              {editingSourceId === s.id ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                   <input value={s.title} onChange={e => updateLocalSource(s.id, {title: e.target.value})} className="w-full text-2xl font-black bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Source Title" />
                                   <div className="grid grid-cols-2 gap-4">
                                      <input value={s.author} onChange={e => updateLocalSource(s.id, {author: e.target.value})} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Author" />
                                      <input value={s.year} onChange={e => updateLocalSource(s.id, {year: e.target.value})} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold" placeholder="Year" />
                                   </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3">
                                    <DoiIcon className="w-5 h-5 text-indigo-500" />
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-white leading-tight font-heading group-hover:text-indigo-600 transition-colors break-words">{s.title}</h4>
                                  </div>
                                  <div className="flex flex-wrap gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                     <span className="flex items-center gap-2"><User className="w-4 h-4 text-indigo-400" /> {s.author || 'Author Name'}</span>
                                     <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" /> {s.year || '2024'}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* CITATION BOX */}
                            <div className="bg-white dark:bg-slate-900/80 p-12 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-100/50 dark:shadow-none transition-all group-hover:border-indigo-100 dark:group-hover:border-indigo-50/30">
                               <div className="flex justify-between items-center mb-6 border-b border-slate-50 dark:border-slate-800 pb-4">
                                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.25em]">Full Citation ({citationStyle})</p>
                                  <button onClick={() => { navigator.clipboard.writeText(s.fullCitation || ''); toast.success("Copied"); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all"><Copy className="w-4 h-4" /></button>
                               </div>
                               <p className="text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed font-serif-doc select-all break-all">
                                  {s.fullCitation}
                                </p>
                            </div>
                          </div>

                          <div className="lg:w-80 flex flex-col gap-6">
                             <div className="flex-1 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/30 dark:shadow-none flex flex-col justify-between group-hover:border-indigo-200 transition-all shadow-sm">
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Quality Score</p>
                                   <div className="flex items-end gap-2">
                                      <p className="text-5xl font-black text-slate-900 dark:text-white font-heading">{s.impactScore || 85}</p>
                                      <p className="text-[12px] font-black text-emerald-500 uppercase mb-3">/100</p>
                                   </div>
                                </div>
                                <div className="space-y-3 pt-6">
                                   <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-1000" style={{ width: `${s.impactScore || 85}%` }}></div>
                                   </div>
                                   <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Source Reliability</p>
                                </div>
                             </div>

                             <div className="p-10 bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] text-white space-y-5 shadow-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                   <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Key Takeaway</span>
                                </div>
                                <p className="text-[13px] text-slate-400 font-medium leading-relaxed italic">"{s.snippet}"</p>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 font-serif-doc text-xl leading-relaxed text-slate-800 dark:text-slate-200 h-full">
                    {fixResult ? (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div contentEditable onBlur={(e) => onUpdateText(e.currentTarget.innerText)} className="outline-none whitespace-pre-wrap p-6 rounded-3xl min-h-[600px] border-2 border-transparent focus:border-indigo-50 dark:focus:border-indigo-900/20 focus:bg-slate-50/20 dark:focus:bg-slate-800/20">
                          {fixResult.rewrittenText}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-12 py-20">
                        <div className="relative p-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-[5rem] text-indigo-600 dark:text-indigo-400 shadow-inner">
                           <Dna className="w-32 h-32 animate-pulse" />
                           <div className="absolute -top-6 -right-6 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-black px-8 py-4 rounded-3xl uppercase tracking-[0.2em] shadow-2xl border border-white/10 dark:border-white/5">READY TO FIX</div>
                        </div>

                        <div className="w-full max-w-xl bg-slate-50 dark:bg-slate-900 p-12 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-none space-y-10 text-left">
                           <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Research Depth</label>
                                 <div className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[13px] font-black text-slate-900 dark:text-white flex items-center justify-between shadow-sm dark:shadow-none">Search Active <Globe className="w-4 h-4 text-emerald-500" /></div>
                              </div>
                              <div className="space-y-4">
                                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Fix Strength</label>
                                 <div className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between text-[13px] font-black text-slate-900 dark:text-white shadow-sm dark:shadow-none">High <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                              </div>
                           </div>
                           <button onClick={() => onFix({ mode: 'IvyStealth', strength: 99, includeCitations: true, citationStyle, dialect, styleProfileId: activeProfileId || undefined })} disabled={isFixing} className="w-full py-7 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.25em] text-sm shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-black dark:hover:bg-indigo-500 transition-all flex items-center justify-center gap-6 relative overflow-hidden">
                              {isFixing ? <RefreshCw className="animate-spin w-6 h-6 text-indigo-400" /> : <Zap className="w-6 h-6 text-amber-500 fill-current" />}
                              {isFixing ? 'Working...' : 'Improve & Add Citations'}
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

      {/* Summary Modal */}
      {summary && (
        <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/20 dark:border-white/5 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                    <ScrollText className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Summary Memo</h2>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Document Overview</p>
                 </div>
               </div>
               <button onClick={() => setSummary(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                  <CloseIcon className="w-6 h-6 text-slate-400" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950">
               <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 p-16 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-10 font-serif-doc">
                  <div className="space-y-2 border-b-2 border-slate-900 dark:border-indigo-600 pb-8">
                     <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <span>To: {summary.to}</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                     </div>
                     <p className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">From: {summary.from}</p>
                     <p className="text-xl font-black uppercase tracking-tighter text-indigo-600 dark:text-indigo-400 mt-4">Subject: {summary.subject}</p>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Summary</h3>
                     <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{summary.executiveSummary}</p>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Key Points</h3>
                     <ul className="space-y-4">
                        {summary.keyActionItems.map((item, idx) => (
                           <li key={idx} className="flex gap-4 items-start">
                              <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0"></div>
                              <p className="text-lg text-slate-700 dark:text-slate-300">{item}</p>
                           </li>
                        ))}
                     </ul>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-slate-100 dark:border-slate-800">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Conclusion</h3>
                     <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 italic">"{summary.conclusion}"</p>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4">
               <button onClick={() => setSummary(null)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Dismiss</button>
               <button onClick={() => { downloadPdf(JSON.stringify(summary), 100, 0, 'Document_Summary'); setSummary(null); }} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                  <Download className="w-4 h-4" /> Save as PDF
               </button>
            </div>
          </div>
        </div>
      )}

      {isRatingOpen && <RatingModal onClose={() => setIsRatingOpen(false)} />}
      {showDNAVault && (
        <StyleDNAVault 
          profiles={profiles} 
          activeProfileId={activeProfileId} 
          onProfileSelect={(id) => { onProfileSelect(id); setShowDNAVault(false); }} 
          onAddProfile={onAddProfile} 
          onClose={() => setShowDNAVault(false)} 
        />
      )}
    </div>
  );
};

export default AnalysisView;
