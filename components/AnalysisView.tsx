import React, { useState, useEffect } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, CitationStyle, TargetLanguage, LinguisticProfile, SourceMatch, SummaryMemo } from '../types';
import ScoreGauge from './ScoreGauge';
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
  Languages,
  ScanSearch,
  BookMarked,
  Tags,
  Bookmark,
  ClipboardCheck,
  Layout,
  Table as TableIcon,
  MapPin,
  MessageSquare,
  Lock as LockIcon,
  Crown
} from 'lucide-react';
import { downloadPdf, downloadDocx } from '../services/exportService';
import { generatePptx } from '../services/slideGenerator';
import { generateSlides, generateSummary } from '../services/geminiService';
import StyleDNAVault, { SYSTEM_ARCHETYPES } from './StyleDNAVault';
import { Telemetry } from '../services/telemetry';
import toast from 'react-hot-toast';

interface AnalysisViewProps {
  originalText: string;
  analysis: AnalysisResult;
  fixResult: FixResult | null;
  status: AppStatus;
  onFix: (options: FixOptions) => void;
  onUpdateText: (newText: string) => void;
  onReset: () => void;
  onOpenHistory: () => void;
  onSaveVersion: (label: string) => void;
  onOpenRating: () => void;
  credits: number;
  scoreHistory?: number[];
  profiles: LinguisticProfile[];
  activeProfileId: string | null;
  onProfileSelect: (id: string | null) => void;
  onAddProfile: (profile: LinguisticProfile) => void;
}

const CITATION_STYLES: CitationStyle[] = [
  'APA 7th Edition', 'MLA 9th Edition', 'Chicago 17th (Author-Date)', 'Chicago 17th (Notes & Bibliography)',
  'Harvard (Standard)', 'IEEE (Technical/Engineering)', 'Vancouver (Biomedical)', 'Nature (Journal Style)',
  'Science (Journal Style)', 'Bluebook (Legal/US)', 'OSCOLA (Legal/UK)', 'AMA (Medical/11th Ed)',
  'ASA (Sociological)', 'AAA (Anthropological)', 'APSA (Political Science)', 'Turabian (9th Ed)',
  'MHRA (Humanities)', 'ACS (Chemical Society)', 'AGU (Geophysical Union)'
];

const LANGUAGES: TargetLanguage[] = [
  'English (United States - Academic)', 'English (United Kingdom - Oxford)', 'English (Canada - Standard)',
  'English (Australia - Professional)', 'English (International - Scholarly)', 'Spanish (Spain - Castilian Professional)',
  'Spanish (Latin America - Formal)', 'French (France - Standard Academic)', 'French (Canada - Québécois Scholarly)',
  'German (Germany - Hochdeutsch Formal)', 'German (Switzerland - Academic)', 'Italian (Italy - Standard Professional)',
  'Portuguese (Brazil - Formal Academic)', 'Portuguese (Portugal - Scholarly)', 'Dutch (Netherlands - Academic)',
  'Chinese (Simplified - Academic Mandarin)', 'Chinese (Traditional - Scholarly Standard)', 'Japanese (Japan - Keigo/Formal)',
  'Korean (South Korea - Formal/Academic)', 'Russian (Russia - Academic Standard)', 'Arabic (Modern Standard - Professional)'
];

const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  originalText, analysis, fixResult, status, onFix, onUpdateText, onReset, 
  onOpenHistory, onSaveVersion, onOpenRating, credits,
  scoreHistory = [], profiles, activeProfileId, onProfileSelect, onAddProfile
}) => {
  const isFixing = status === AppStatus.FIXING;
  const [viewMode, setViewMode] = useState<'editor' | 'citations'>('editor');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA 7th Edition');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('English (United States - Academic)');
  const [stealthIntensity, setStealthIntensity] = useState(99);
  const [showDNAVault, setShowDNAVault] = useState(false);
  
  const [localBibliography, setLocalBibliography] = useState<SourceMatch[]>([]);
  const [summary, setSummary] = useState<SummaryMemo | null>(null);

  useEffect(() => {
    if (fixResult?.bibliography && fixResult.bibliography.length > 0) {
      setLocalBibliography(fixResult.bibliography);
    } else if (analysis.sourcesFound) {
      setLocalBibliography(analysis.sourcesFound);
    }
  }, [fixResult, analysis]);

  const currentProfile = profiles.find(p => p.id === activeProfileId) || 
                         SYSTEM_ARCHETYPES.find(p => p.id === activeProfileId) || 
                         SYSTEM_ARCHETYPES.find(p => p.id === 'sys_ug');

  const isPremiumActive = activeProfileId !== 'sys_ug';
  const needsCredits = isPremiumActive && credits <= 0;

  const handleRunFix = () => {
    if (fixResult) {
      Telemetry.logRefine();
    }
    onFix({ 
      mode: 'IvyStealth', 
      strength: stealthIntensity, 
      includeCitations: true, 
      citationStyle, 
      language: targetLanguage, 
      styleProfileId: activeProfileId || undefined 
    });
  };

  const handleExportDocx = () => {
    Telemetry.logFeature('Export DOCX');
    downloadDocx(fixResult?.rewrittenText || originalText, 'PlagiaFix_V14_Output', localBibliography);
  };

  const handleGenerateSummary = async () => {
    Telemetry.logFeature('Executive Summary');
    const memo = await generateSummary(fixResult?.rewrittenText || originalText);
    setSummary(memo);
    toast.success("Executive Memo Prepared");
  };

  const handleGenerateSlides = async () => {
    Telemetry.logFeature('Presentation');
    const slides = await generateSlides(fixResult?.rewrittenText || originalText);
    generatePptx(slides, 'Research_Synthesis');
  };

  const handleShare = async () => {
    Telemetry.logFeature('Content Share');
    const text = fixResult?.rewrittenText || originalText;
    await navigator.clipboard.writeText(text);
    toast.success("Content copied to clipboard.");
  };

  const currentAiRisk = fixResult ? fixResult.newAiProbability : analysis.aiProbability;
  const currentPlagRisk = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;

  return (
    <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-700 pb-20">
      
      {/* LEFT SIDEBAR: ANALYTICS & CONTROLS */}
      <div className="lg:col-span-3 space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-10">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Forensic Lab</h3>
            <Database className="w-4 h-4 text-slate-200" />
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Bypass Intensity</label>
                </div>
                <span className="text-[10px] font-black text-indigo-600">{stealthIntensity}%</span>
              </div>
              <input 
                type="range" min="1" max="99" value={stealthIntensity} 
                onChange={(e) => setStealthIntensity(parseInt(e.target.value))} 
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Global Dialect Stealth</label>
              </div>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value as TargetLanguage)} 
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none dark:text-white"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Quote className="w-3.5 h-3.5 text-indigo-500" />
                <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Institutional Citation Mode</label>
              </div>
              <select 
                value={citationStyle} 
                onChange={(e) => setCitationStyle(e.target.value as CitationStyle)} 
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none dark:text-white"
              >
                {CITATION_STYLES.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => setViewMode(viewMode === 'citations' ? 'editor' : 'citations')} 
              className={`w-full p-8 rounded-[2.25rem] transition-all flex items-center gap-5 group relative overflow-hidden ${viewMode === 'citations' ? 'bg-indigo-700 text-white shadow-2xl' : 'bg-indigo-600 text-white hover:scale-[1.02] shadow-xl'}`}
            >
              <Library className="w-6 h-6 text-white" />
              <div className="text-left relative z-10">
                 <p className="text-[11px] font-black uppercase tracking-widest leading-none">Source Mapping</p>
                 <p className="text-[9px] font-bold uppercase opacity-60 mt-1">{localBibliography.length} Citations Detected</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Dna className="w-16 h-16" /></div>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Neural Risks</h3>
              <Activity className="w-4 h-4 text-indigo-500" />
           </div>
           <div className="grid grid-cols-1 gap-6">
              <ScoreGauge score={currentAiRisk} label="AI Detection Risk" />
              <ScoreGauge score={currentPlagRisk} label="Plagiarism Match" />
           </div>
        </div>
      </div>

      {/* RIGHT: MAIN WORKSPACE */}
      <div className="lg:col-span-9 space-y-10">
        
        {/* STATUS BAR */}
        <div className="bg-[#0f172a] rounded-[2.5rem] p-10 text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30"></div>
           <div className="flex items-center gap-8 relative z-10">
              <div className="p-5 bg-indigo-600 rounded-2xl shadow-2xl">
                 <IconRenderer name={currentProfile?.iconName || 'Fingerprint'} className="w-8 h-8" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">Institutional DNA</p>
                 <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-black uppercase tracking-tight leading-none font-heading">
                      {currentProfile?.name || 'UNDERGRADUATE'}
                    </h2>
                    {isPremiumActive ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-500 text-[10px] font-black rounded-full">
                        <Crown className="w-3 h-3 text-white" /> PREMIUM
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-emerald-500 text-[10px] font-black rounded-full">FREE</div>
                    )}
                 </div>
              </div>
           </div>
           <button onClick={() => setShowDNAVault(true)} className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
              <Dna className="w-4 h-4 text-indigo-400" /> Switch Profile
           </button>
        </div>

        {/* WORKSPACE CANVAS */}
        <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col min-h-[900px] overflow-hidden">
           <div className="px-12 py-10 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-6">
                 <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                 <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] font-heading">{viewMode === 'citations' ? 'Source Audit Map' : 'Neural Editor'}</h3>
              </div>
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => { onSaveVersion('Snapshot: ' + new Date().toLocaleTimeString()); toast.success("Saved to Vault"); Telemetry.logFeature('Vault Save'); }} 
                   className="px-8 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-3"
                 >
                   <Save className="w-3.5 h-3.5" /> Save to Vault
                 </button>
                 <button onClick={handleExportDocx} className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-3">
                   <Download className="w-3.5 h-3.5" /> Export DOCX
                 </button>
                 <button onClick={onReset} className="p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto">
             {viewMode === 'citations' ? (
                <div className="p-16 space-y-12 bg-[#070a0f] min-h-full">
                   {localBibliography.length === 0 ? (
                      <div className="py-40 text-center opacity-20 flex flex-col items-center gap-8">
                         <Search className="w-24 h-24 text-white" />
                         <p className="text-xl font-black uppercase tracking-widest text-white">No Forensic Matches</p>
                      </div>
                   ) : (
                      localBibliography.map((s, i) => (
                        <div key={s.id || i} className="bg-[#1e293b] p-10 rounded-[2.5rem] space-y-8 border border-white/5 shadow-2xl">
                           <div className="flex justify-between items-start">
                              <div className="px-5 py-1.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">Source ID: #{i+1}</div>
                              <div className="flex gap-2">
                                <button onClick={() => { navigator.clipboard.writeText(s.fullCitation || ''); toast.success("Citation Copied"); }} className="p-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm"><Copy className="w-4 h-4" /></button>
                                <a href={s.url} target="_blank" rel="noreferrer" className="p-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm"><ExternalLink className="w-4 h-4" /></a>
                              </div>
                           </div>
                           <div className="space-y-6">
                              <h4 className="text-3xl font-black text-white font-heading tracking-tight leading-tight">{s.title}</h4>
                              <div className="p-8 bg-[#0f172a] rounded-[2rem] border border-white/5 shadow-inner">
                                <p className="text-sm font-serif-doc text-slate-400 leading-relaxed italic break-all">{s.fullCitation}</p>
                              </div>
                           </div>
                        </div>
                      ))
                   )}
                </div>
             ) : (
                <div className="flex flex-col h-full">
                   {fixResult && (
                      <div className="p-16 border-b border-emerald-50 dark:border-emerald-900/20 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col gap-10">
                         <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-10">
                               <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl">
                                  <VerifiedIcon className="w-10 h-10" />
                               </div>
                               <div>
                                  <h4 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter font-heading leading-tight">Forensic Fix Applied</h4>
                                  <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] mt-1">Stealth Jitter active @ {stealthIntensity}%</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <button 
                                 onClick={handleRunFix} 
                                 disabled={isFixing}
                                 className="px-10 py-5 bg-indigo-600 text-white text-[12px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.05] transition-all flex items-center gap-4 shadow-xl shadow-indigo-500/30 group active:scale-95 disabled:opacity-50"
                               >
                                  {isFixing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 animate-pulse" />}
                                  Refine Synthesis
                               </button>
                               <button onClick={handleShare} className="px-8 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-3"><Share2 className="w-4 h-4 text-indigo-500" /> Share</button>
                            </div>
                         </div>
                         
                         <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200/10">
                            <button onClick={handleGenerateSummary} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                               <ScrollText className="w-4 h-4 text-amber-400" /> Executive Memo
                            </button>
                            <button onClick={handleGenerateSlides} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                               <Presentation className="w-4 h-4 text-indigo-400" /> Professional Slides
                            </button>
                            <button onClick={() => { Telemetry.logFeature('Export PDF'); downloadPdf(fixResult.rewrittenText, 100, analysis.aiProbability); }} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                               <VerifiedIcon className="w-4 h-4 text-emerald-400" /> Forensic Report
                            </button>
                            <button onClick={onOpenRating} className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-700 shadow-sm">
                               <Star className="w-4 h-4 text-amber-500 fill-current" /> Rate this Fix
                            </button>
                         </div>

                         {summary && (
                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 shadow-2xl space-y-8 animate-in zoom-in duration-500">
                               <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                     <h5 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{summary.subject}</h5>
                                     <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">To: {summary.to} | From: {summary.from}</p>
                                  </div>
                                  <button onClick={() => setSummary(null)} className="p-2 text-slate-400 hover:text-slate-900"><CloseIcon className="w-5 h-5" /></button>
                               </div>
                               <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif-doc">{summary.executiveSummary}</p>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Deliverables</p>
                                     <ul className="space-y-3">
                                        {summary.keyActionItems.map((item, i) => (
                                          <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                             <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {item}
                                          </li>
                                        ))}
                                     </ul>
                                  </div>
                                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conclusion</p>
                                     <p className="text-xs font-medium italic text-slate-500">{summary.conclusion}</p>
                                  </div>
                               </div>
                            </div>
                         )}
                      </div>
                   )}

                   <div className="p-16 font-serif-doc text-2xl leading-relaxed text-slate-800 dark:text-slate-200 flex-1">
                      {fixResult ? (
                        <div className="max-w-5xl mx-auto py-10 animate-in slide-in-from-bottom-8 duration-1000">
                           <div contentEditable onBlur={(e) => onUpdateText(e.currentTarget.innerText)} className="outline-none whitespace-pre-wrap p-8 rounded-[2rem] focus:bg-slate-50/50 transition-colors">
                              {fixResult.rewrittenText}
                           </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center py-40">
                           <div className="p-20 bg-slate-50 dark:bg-slate-800 rounded-[5rem] flex flex-col items-center gap-12 border border-slate-100 dark:border-slate-700 shadow-inner max-w-2xl w-full">
                              {needsCredits ? <Crown className="w-24 h-24 text-amber-500 animate-bounce" /> : <Sparkles className="w-24 h-24 text-indigo-600 animate-pulse" />}
                              <div className="text-center space-y-4">
                                 <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                   {needsCredits ? 'Premium Access Locked' : 'Engine Calibration Ready'}
                                 </h4>
                                 <p className="text-sm text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                   {needsCredits 
                                     ? `Neural sequencing requires a Premium Pass (₦2,500).` 
                                     : `Mirroring ${currentProfile?.name} DNA with ${stealthIntensity}% rhythmic jitter.`}
                                 </p>
                              </div>
                              <button 
                                onClick={handleRunFix} 
                                disabled={isFixing} 
                                className={`w-full py-8 rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6 group ${needsCredits ? 'bg-amber-600 text-white shadow-amber-500/20' : 'bg-slate-900 dark:bg-indigo-600 text-white shadow-indigo-500/20'}`}
                              >
                                 {isFixing ? <RefreshCw className="animate-spin w-6 h-6" /> : needsCredits ? <LockIcon className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                 {isFixing ? 'Sequencing DNA...' : needsCredits ? 'Unlock Premium — ₦2,500' : 'Humanize Everything'}
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

      {showDNAVault && <StyleDNAVault profiles={profiles} activeProfileId={activeProfileId} onProfileSelect={(id) => { onProfileSelect(id); setShowDNAVault(false); }} onAddProfile={onAddProfile} onClose={() => setShowDNAVault(false)} />}
    </div>
  );
};

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

export default AnalysisView;