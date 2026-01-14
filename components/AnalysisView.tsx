
import React, { useState, useEffect } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, CitationStyle, TargetLanguage, LinguisticProfile, SourceMatch, SummaryMemo } from '../types';
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
  Copy, Edit3, Check, Save,
  History, Link2, Ghost, Star, Presentation, FileOutput, ChevronRight,
  Monitor, Layers, BarChart, Binary, Lock,
  Heart,
  Trophy,
  PartyPopper,
  ShieldCheck as VerifiedIcon,
  Sliders,
  AlertTriangle,
  Languages
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
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('English (US)');
  const [stealthIntensity, setStealthIntensity] = useState(99);
  const [showDNAVault, setShowDNAVault] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  
  const [localBibliography, setLocalBibliography] = useState<SourceMatch[]>([]);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryMemo | null>(null);
  
  const currentAiRisk = fixResult ? fixResult.newAiProbability : analysis.aiProbability;
  const currentPlagRisk = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;

  useEffect(() => {
    if (fixResult?.bibliography) {
      setLocalBibliography(fixResult.bibliography);
    } else if (analysis.sourcesFound) {
      setLocalBibliography(analysis.sourcesFound);
    }
  }, [fixResult, analysis]);

  const updateLocalSource = (id: string, updates: Partial<SourceMatch>) => {
    setLocalBibliography(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSyncCitations = () => {
    toast.success("Citations Verified");
    setEditingSourceId(null);
  };

  const handleGenerateSlides = async () => {
    const textToProcess = fixResult ? fixResult.rewrittenText : originalText;
    setIsGeneratingSlides(true);
    try {
      const slides = await generateSlides(textToProcess);
      if (slides && slides.length > 0) {
        await generatePptx(slides, 'PlagiaFix_Presentation');
      } else {
        toast.error("Could not generate slides.");
      }
    } catch (e) {
      toast.error("Slide creation failed.");
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  const handleGenerateSummary = async () => {
    const textToProcess = fixResult ? fixResult.rewrittenText : originalText;
    setIsGeneratingSummary(true);
    try {
      const res = await generateSummary(textToProcess);
      setSummary(res);
      toast.success("Summary Generated");
    } catch (e) {
      toast.error("Summary creation failed.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleShare = async (platform: string) => {
    const shareText = `Analyzed with PlagiaFix! ${100 - currentAiRisk}% human score. ✍️ #PlagiaFix #AI`;
    const shareUrl = window.location.origin;

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    } else {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'PlagiaFix Report', text: shareText, url: shareUrl });
        } catch (e) {}
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link Copied");
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

  const LANGUAGES: { name: TargetLanguage, flag: string }[] = [
    { name: 'English (US)', flag: '🇺🇸' },
    { name: 'English (UK)', flag: '🇬🇧' },
    { name: 'English (CA)', flag: '🇨🇦' },
    { name: 'English (AU)', flag: '🇦🇺' },
    { name: 'Spanish (Modern)', flag: '🇪🇸' },
    { name: 'French (Scholarly)', flag: '🇫🇷' },
    { name: 'German (Formal)', flag: '🇩🇪' },
    { name: 'Italian (Standard)', flag: '🇮🇹' },
    { name: 'Portuguese (Brazil)', flag: '🇧🇷' },
    { name: 'Dutch (Academic)', flag: '🇳🇱' },
    { name: 'Chinese (Simplified)', flag: '🇨🇳' },
    { name: 'Japanese (Formal)', flag: '🇯🇵' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20 transition-colors duration-300">
      
      {/* Writing Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <ScoreGauge score={currentAiRisk} label="Forensic AI Risk" history={scoreHistory} />
          {currentAiRisk > 50 && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl animate-pulse">
               <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] font-black uppercase text-rose-500">Structural Anomaly Detected</span>
               </div>
               <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                 The detector is picking up on <b>Structural Uniformity</b>. Increase "Stealth Intensity" to trigger <b>Syntactic Decoupling</b>.
               </p>
            </div>
          )}
          <ScoreGauge score={currentPlagRisk} label="External Matches" />
        </div>
        
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-[3.5rem] p-12 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col group transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] font-heading">Linguistic Jitter Map</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleShare('native')} className="w-11 h-11 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-colors"><Share2 className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="flex-1 min-h-[400px] flex items-center justify-center">
            <ForensicRadar data={fixResult?.fidelityMap || analysis.forensics.radarMetrics || []} />
          </div>

          <div className="grid grid-cols-3 gap-6 mt-8">
            {[
              { l: 'Complexity', v: analysis.forensics.readabilityScore },
              { l: 'Burstiness', v: analysis.forensics.sentenceVariance },
              { l: 'Lexical DNA', v: (analysis.forensics.uniqueWordRatio * 100).toFixed(0) + '%' }
            ].map(stat => (
              <div key={stat.l} className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 text-center border border-slate-100 dark:border-slate-700/50 transition-colors">
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
              <h3 className="text-xs font-black uppercase tracking-widest font-heading">Engine Verdict</h3>
            </div>
            <div className="space-y-6 relative z-10">
              <p className="text-slate-400 text-sm font-medium leading-relaxed italic border-l-2 border-indigo-500 pl-6 py-2">"{analysis.critique}"</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certify Results</h4>
                <div className="w-2 h-2 rounded-full bg-emerald-500 neural-pulse"></div>
             </div>
             <div className="space-y-3">
                <button onClick={() => downloadPdf(fixResult?.rewrittenText || originalText, 100 - currentAiRisk, analysis.originalScore, 'Forensic_Report')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all group shadow-lg">
                   <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Download Stealth Cert</span>
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Editor & Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3 space-y-6 sticky top-24">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Bypass Lab</h3>
                <Database className="w-4 h-4 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="space-y-6">
                 {/* Stealth Intensity */}
                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Intensity</label>
                      </div>
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{stealthIntensity}%</span>
                    </div>
                    <input type="range" min="1" max="99" value={stealthIntensity} onChange={(e) => setStealthIntensity(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                 </div>

                 {/* Target Language Dropdown */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 ml-2">
                     <Languages className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                     <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Output Language</label>
                   </div>
                   <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value as TargetLanguage)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all cursor-pointer dark:text-white">
                     {LANGUAGES.map(lang => (
                       <option key={lang.name} value={lang.name}>{lang.flag} {lang.name}</option>
                     ))}
                   </select>
                 </div>

                 {/* Citation Style */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 ml-2">
                     <Quote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                     <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Citation style</label>
                   </div>
                   <select value={citationStyle} onChange={(e) => setCitationStyle(e.target.value as CitationStyle)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all cursor-pointer dark:text-white">
                     <option value="APA">APA 7th Edition</option>
                     <option value="MLA">MLA 9th Edition</option>
                     <option value="Chicago">Chicago Style</option>
                     <option value="Harvard">Harvard Referencing</option>
                     <option value="IEEE">IEEE Standards</option>
                     <option value="Vancouver">Vancouver</option>
                     <option value="Nature">Nature Journal</option>
                     <option value="Bluebook">Bluebook Legal</option>
                   </select>
                 </div>

                 <button onClick={() => setViewMode(viewMode === 'citations' ? 'editor' : 'citations')} className={`w-full p-6 border rounded-[2.25rem] transition-all flex items-center gap-4 ${viewMode === 'citations' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200'}`}>
                    <div className={`p-3 rounded-xl ${viewMode === 'citations' ? 'bg-white/20' : 'bg-white dark:bg-slate-700 border dark:border-slate-600'}`}><Library className={`w-5 h-5 ${viewMode === 'citations' ? 'text-white' : 'text-slate-900 dark:text-white'}`} /></div>
                    <div className="text-left">
                       <p className={`text-[11px] font-black uppercase ${viewMode === 'citations' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Source Library</p>
                       <p className={`text-[8px] font-bold uppercase mt-1 opacity-60 ${viewMode === 'citations' ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{localBibliography.length} Detections</p>
                    </div>
                 </button>
              </div>
           </div>

           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-2xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Synthesis Lab</h3>
                <Binary className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="space-y-3">
                 <button onClick={handleGenerateSlides} disabled={isGeneratingSlides} className="w-full group p-5 bg-white/5 border border-white/10 hover:border-indigo-500 hover:bg-indigo-500/10 rounded-2xl flex items-center justify-between transition-all disabled:opacity-30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 rounded-xl">
                        {isGeneratingSlides ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">Presentation</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">PowerPoint (PPTX)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                 </button>
                 
                 <button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="w-full group p-5 bg-white/5 border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-2xl flex items-center justify-between transition-all disabled:opacity-30">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-600 rounded-xl">
                        {isGeneratingSummary ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight">Executive Summary</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Professional Memo</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                 </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-9 flex flex-col gap-8">
           <div className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-transparent pointer-events-none"></div>
              <div className="flex items-center gap-6 relative z-10">
                 <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-500/40 relative">
                    <IconRenderer name={currentProfile?.iconName || 'Fingerprint'} className="w-7 h-7" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Mirroring Persona</h4>
                    <p className="text-2xl font-black uppercase tracking-tight font-heading">{currentProfile?.name}</p>
                 </div>
              </div>
              <div className="flex gap-4 relative z-10">
                <button onClick={() => setShowDNAVault(true)} className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-3">
                   <Dna className="w-4 h-4 text-indigo-400" /> Switch DNA
                </button>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col min-h-[800px] overflow-hidden relative">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-5">
                  <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                  <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] font-heading">{viewMode === 'citations' ? 'Plagiarism Map' : 'Humanization Workspace'}</h3>
                </div>
                <div className="flex gap-3">
                  {viewMode === 'citations' && localBibliography.length > 0 && (
                    <button onClick={handleSyncCitations} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-500 transition-all">
                      <RefreshCw className="w-3.5 h-3.5" /> Verify Map
                    </button>
                  )}
                  {fixResult && (
                    <button onClick={() => downloadDocx(fixResult.rewrittenText, 'PlagiaFix_Document', localBibliography)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">
                      <FileText className="w-3.5 h-3.5" /> Export DOCX
                    </button>
                  )}
                  <button onClick={onReset} className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100 dark:border-slate-800"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {viewMode === 'citations' ? (
                  <div className="p-12 space-y-12 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 gap-12">
                      {localBibliography.length === 0 ? (
                        <div className="text-center py-40 opacity-20 flex flex-col items-center">
                          <Search className="w-20 h-20 mb-6" />
                          <p className="text-lg font-black uppercase tracking-[0.2em]">No Detections Found</p>
                        </div>
                      ) : 
                      localBibliography.map((s, i) => (
                        <div key={s.id || i} className="group p-12 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[4rem] hover:bg-white transition-all shadow-sm flex flex-col lg:flex-row gap-12">
                          <div className="flex-1 space-y-8">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-wrap gap-3">
                                 <span className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl">Match #{i+1}</span>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="text-3xl font-black text-slate-900 dark:text-white leading-tight font-heading group-hover:text-indigo-600 transition-colors">{s.title}</h4>
                              <p className="text-xl font-medium text-slate-700 dark:text-slate-200 leading-relaxed font-serif-doc">{s.fullCitation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    {fixResult && (
                      <div className="p-10 border-b border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-950/20 animate-in slide-in-from-top-6 duration-700 relative overflow-hidden">
                        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                           <div className="flex items-center gap-8">
                              <div className="p-6 bg-emerald-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center">
                                 <VerifiedIcon className="w-8 h-8" />
                              </div>
                              <div>
                                 <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Bypass Applied</h4>
                                 <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Adversarial Stealth V8 Engine Engaged</p>
                              </div>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="p-12 font-serif-doc text-xl leading-relaxed text-slate-800 dark:text-slate-200 flex-1">
                      {fixResult ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                          <div contentEditable onBlur={(e) => onUpdateText(e.currentTarget.innerText)} className="outline-none whitespace-pre-wrap p-10 rounded-[3rem] min-h-[600px] transition-all">
                            {fixResult.rewrittenText}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-12 py-20">
                          <div className="relative p-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-[5rem] text-emerald-600 shadow-inner">
                             <Dna className="w-32 h-32 animate-pulse" />
                             <div className="absolute -top-6 -right-6 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-black px-8 py-4 rounded-3xl uppercase tracking-[0.2em] shadow-2xl border border-white/10">STEALTH MODE</div>
                          </div>

                          <div className="w-full max-w-xl bg-slate-50 dark:bg-slate-900 p-12 rounded-[4rem] border border-slate-100 shadow-2xl space-y-10 text-left">
                             <button onClick={() => onFix({ mode: 'IvyStealth', strength: stealthIntensity, includeCitations: true, citationStyle, language: targetLanguage, styleProfileId: activeProfileId || undefined })} disabled={isFixing} className="w-full py-7 bg-slate-900 dark:bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-6 relative group">
                                {isFixing ? <RefreshCw className="animate-spin w-6 h-6 text-indigo-400" /> : <Sparkles className="w-6 h-6 text-indigo-400" />}
                                {isFixing ? 'Sequencing DNA...' : `Humanize with ${stealthIntensity}% Intensity`}
                             </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Summary Modal */}
      {summary && (
        <div className="fixed inset-0 z-[150] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-white/20 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                    <ScrollText className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Document Memo</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executive Synthesis</p>
                 </div>
               </div>
               <button onClick={() => setSummary(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
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
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Executive Summary</h3>
                     <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{summary.executiveSummary}</p>
                  </div>

                  <div className="space-y-6">
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Actionable Insights</h3>
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
                     <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Concluding Directives</h3>
                     <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 italic">"{summary.conclusion}"</p>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-4">
               <button onClick={() => setSummary(null)} className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Dismiss</button>
               <button onClick={() => { downloadPdf(JSON.stringify(summary), 100, 0, 'PlagiaFix_Summary_Report'); setSummary(null); }} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                  <Download className="w-4 h-4" /> Export Summary
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
