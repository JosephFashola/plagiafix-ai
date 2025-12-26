
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, HumanizeMode, CitationStyle, SourceMatch, RadarMetric } from '../types';
import ScoreGauge from './ScoreGauge';
import { 
  Sparkles, RefreshCw, Download, Zap, Globe, Link2, Layers, ShieldCheck, 
  Settings, Ghost, GraduationCap, Palette, Linkedin, 
  X, Search, Eye, Coins, Radar, Target, Activity, ShieldAlert, Cpu,
  CheckCircle2, AlertTriangle, FileCheck, NotebookTabs, MonitorPlay, ChevronDown, Dna, Fingerprint, BadgeCheck,
  Bookmark, ExternalLink, Scale, Bitcoin, Copy, SortAsc, BookCheck, FileSignature, Command, ChevronRight
} from 'lucide-react';
import { Radar as ReRadar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { downloadDocx, downloadPdf } from '../services/exportService';
// @ts-ignore
import * as Diff from 'diff';

interface AnalysisViewProps {
  originalText: string;
  analysis: AnalysisResult;
  fixResult: FixResult | null;
  status: AppStatus;
  fixProgress?: number;
  onFix: (options: FixOptions) => void;
  onUpdateText: (newText: string) => void;
  onReset: () => void;
  scoreHistory: number[];
}

const CITATION_STYLES: CitationStyle[] = ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE', 'Vancouver', 'Nature', 'Bluebook'];

const MODE_META: Record<HumanizeMode, { icon: React.ReactNode, desc: string }> = {
  IvyStealth: { 
    icon: <ShieldCheck className="w-4 h-4" />, 
    desc: "Targeted bypass of institutional pattern recognition." 
  },
  Ghost: { 
    icon: <Ghost className="w-4 h-4" />, 
    desc: "Extreme adversarial noise for absolute stealth." 
  },
  Cerebral: { 
    icon: <GraduationCap className="w-4 h-4" />, 
    desc: "Stanford-grade academic voice with rhythmic chaos." 
  },
  Creative: { 
    icon: <Palette className="w-4 h-4" />, 
    desc: "Max stylistic variance and identity retention." 
  }
};

const FidelityMap: React.FC<{ data: RadarMetric[] }> = ({ data }) => (
  <div className="bg-slate-900 border border-white/5 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group h-full">
    <div className="absolute top-0 right-0 p-4 opacity-10">
      <Target className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-400" />
    </div>
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-2">
        <Radar className="w-4 h-4" /> Synthesis Fidelity
      </h4>
      <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase tracking-widest">STABLE-V6</span>
    </div>
    <div className="h-[200px] sm:h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#ffffff10" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 800 }} />
          <ReRadar name="Fidelity" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  originalText, analysis, fixResult, status, onFix, onUpdateText, onReset, scoreHistory
}) => {
  const isFixing = status === AppStatus.FIXING;
  const [viewMode, setViewMode] = useState<'clean' | 'diff' | 'citations'>('clean');
  const [mode, setMode] = useState<HumanizeMode>('IvyStealth');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [strength, setStrength] = useState(98);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPlagiarism = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;
  const currentAiProb = fixResult ? fixResult.newAiProbability : analysis.aiProbability;

  const handleFixInitiation = () => {
    onFix({ mode, strength, includeCitations, citationStyle, dialect: 'US', styleProfileId: undefined });
    if (window.innerWidth < 1024) setIsSettingsOpen(false);
  };

  const activeBibliography = [...(fixResult?.bibliography || analysis.sourcesFound || [])]
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 pb-10 sm:pb-20 font-sans">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
        
        {/* Dual Gauge Panel */}
        <div className="flex-[2] bg-white rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden">
          <div className="flex gap-4 sm:gap-8 shrink-0">
            <ScoreGauge score={currentPlagiarism} label="Plagiarism" />
            <ScoreGauge score={currentAiProb} label="AI Signature" />
          </div>
          <div className="h-px md:h-20 w-full md:w-px bg-slate-100 hidden md:block"></div>
          <div className="flex-1 grid grid-cols-2 gap-4 sm:gap-6 w-full">
            <div className="space-y-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest">Burstiness</p>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-500" />
                <span className="text-sm sm:text-lg font-black text-slate-900">{fixResult ? 'High' : 'Low'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest">Adversarial</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 h-4 text-indigo-500" />
                <span className="text-sm sm:text-lg font-black text-slate-900">V6.2 Pro</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest">Grounding</p>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 sm:w-4 h-4 text-blue-500" />
                <span className="text-sm sm:text-lg font-black text-slate-900">Live Web</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest">Entropy</p>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 sm:w-4 h-4 text-purple-500" />
                <span className="text-sm sm:text-lg font-black text-slate-900">{fixResult ? 'Extreme' : 'Locked'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
           <FidelityMap data={fixResult?.fidelityMap || [
             { subject: 'Stealth', A: 50, fullMark: 100 },
             { subject: 'Entropy', A: 40, fullMark: 100 },
             { subject: 'Burstiness', A: 30, fullMark: 100 },
             { subject: 'Fact Fidelity', A: 90, fullMark: 100 },
             { subject: 'Linguistic Jitter', A: 20, fullMark: 100 }
           ]} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] sm:text-xs font-black text-slate-900 uppercase flex items-center gap-2 tracking-widest font-heading">
                <Settings className="w-4 h-4 text-indigo-500" /> Bypass Engine
              </h3>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-heading">Forensic Mode</p>
              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(MODE_META) as HumanizeMode[]).map((m) => {
                  const meta = MODE_META[m];
                  const isActive = mode === m;
                  return (
                    <button 
                      key={m} 
                      onClick={() => setMode(m)}
                      className={`group p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all flex items-start gap-4 ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                    >
                      <div className={`mt-0.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border shrink-0 ${isActive ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-100 text-indigo-500 shadow-sm'}`}>
                        {meta.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-0.5 font-heading">{m}</span>
                        <span className="text-[9px] sm:text-[10px] font-medium leading-tight opacity-70">{meta.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              data-action="main-fix"
              onClick={handleFixInitiation}
              disabled={isFixing}
              className="w-full py-4 sm:py-5 bg-indigo-600 text-white font-black uppercase rounded-2xl sm:rounded-[1.5rem] shadow-xl hover:bg-indigo-700 disabled:opacity-50 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98] font-heading"
            >
              <div className="flex items-center gap-3 text-xs sm:text-base">
                {isFixing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-yellow-400" />}
                {isFixing ? `Neutralizing Patterns...` : 'Neutralize Signatures'}
              </div>
            </button>
          </div>

          {/* Forensic Marker List */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-6">
             <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-heading">
                <Cpu className="w-4 h-4" /> Detected Markers
             </h4>
             <div className="space-y-3">
                {analysis.detectedIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                     <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                     <p className="text-[11px] font-medium text-slate-300 leading-tight">{issue}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl sm:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
             <div className="flex gap-4 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: 'clean', label: 'Fixed View', icon: <Sparkles className="w-3 h-3 text-indigo-500" />, key: '1' },
                  { id: 'diff', label: 'Forensic Diff', icon: <Eye className="w-3 h-3 text-emerald-500" />, key: '2' },
                  { id: 'citations', label: 'Reference Studio', icon: <Bookmark className="w-3 h-3 text-amber-500" />, key: '3' }
                ].map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => setViewMode(v.id as any)} 
                    disabled={!fixResult && (v.id === 'diff' || v.id === 'citations')} 
                    className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-2 border-b-2 transition-all flex items-center gap-2 shrink-0 font-heading ${viewMode === v.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    {v.icon}
                    {v.label}
                  </button>
                ))}
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                {fixResult && (
                  <button onClick={() => downloadDocx(fixResult.rewrittenText, 'Camouflaged_Submission', activeBibliography)} className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group font-heading">
                    <Download className="w-4 h-4 group-hover:translate-y-1 transition-transform" /> 
                    Export Forensic Report
                  </button>
                )}
             </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto p-6 sm:p-12 font-serif-doc text-lg sm:text-xl leading-relaxed text-slate-800 min-h-[400px] sm:min-h-[600px] selection:bg-indigo-100/50">
            {viewMode === 'citations' ? (
              <div className="animate-in fade-in duration-500 space-y-4 sm:space-y-6 font-sans">
                 <div className="bg-indigo-50 border border-indigo-100 p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] flex items-center justify-between">
                    <div>
                       <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight mb-1 font-heading">Citation Forensic Studio</h4>
                       <p className="text-[10px] sm:text-xs text-slate-500">Synthesizing and aligning references in <strong>{citationStyle}</strong>.</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {activeBibliography.map((source, idx) => (
                      <div key={idx} className="p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] flex flex-col gap-4 relative group hover:border-indigo-400 transition-all">
                        <div className="flex-1">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1 font-heading">{source.title}</h4>
                              {source.isVerified && <div className="w-fit px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded flex items-center gap-1 font-heading"><BookCheck className="w-2.5 h-2.5" /> Verified</div>}
                           </div>
                           <p className="text-[10px] sm:text-xs font-sans text-slate-500 italic mb-3 sm:mb-4">"{source.snippet || 'Referenced match found.'}"</p>
                           <a href={source.url} target="_blank" rel="noreferrer" className="text-[8px] sm:text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 hover:underline font-heading"><ExternalLink className="w-3 h-3" /> Source Portal</a>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            ) : !fixResult ? (
              <div className="whitespace-pre-wrap">
                {analysis.paragraphBreakdown.map((p, i) => (
                  <div key={i} className={`mb-4 sm:mb-6 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] transition-all group relative border ${p.riskScore > 40 ? 'bg-rose-50 border-rose-100 shadow-sm' : 'border-transparent'}`}>
                    {p.riskScore > 40 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-rose-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg font-heading">
                        <AlertTriangle className="w-3 h-3" /> {p.matchType || 'ALERT'}
                      </div>
                    )}
                    {p.text}
                    {p.aiMarkers && p.aiMarkers.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {p.aiMarkers.map((m, j) => (
                          <span key={j} className="text-[8px] font-black uppercase text-rose-400 border border-rose-100 px-2 py-0.5 rounded bg-white font-heading">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : viewMode === 'clean' ? (
              <div 
                contentEditable
                onBlur={(e) => onUpdateText(e.currentTarget.innerText)}
                suppressContentEditableWarning
                className="whitespace-pre-wrap animate-in fade-in duration-700 outline-none focus:ring-4 focus:ring-indigo-500/5 p-2 sm:p-4 rounded-xl border border-transparent focus:border-indigo-100"
              >
                {fixResult.rewrittenText}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {(Diff as any).diffWords(originalText, fixResult.rewrittenText).map((part: any, i: number) => (
                  <span key={i} className={`${part.added ? 'bg-emerald-50 text-emerald-700 font-medium' : part.removed ? 'bg-rose-50 text-rose-700 line-through opacity-40' : ''}`}>
                    {part.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
