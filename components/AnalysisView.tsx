
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, HumanizeMode, CitationStyle, SourceMatch, RadarMetric } from '../types';
import ScoreGauge from './ScoreGauge';
import { 
  Sparkles, RefreshCw, Download, Zap, Globe, Link2, Layers, ShieldCheck, 
  Settings, Ghost, GraduationCap, Palette, Linkedin, 
  X, Search, Eye, Coins, Radar, Target, Activity, ShieldAlert, Cpu,
  CheckCircle2, AlertTriangle, FileCheck, NotebookTabs, MonitorPlay, ChevronDown, Dna, Fingerprint, BadgeCheck,
  Bookmark, ExternalLink, Scale, Bitcoin, Copy, SortAsc, BookCheck
} from 'lucide-react';
import { Radar as ReRadar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { downloadDocx, downloadPdf } from '../services/exportService';
import { generatePresentationContent, generateStudyGuide, generateSummaryMemo } from '../services/geminiService';
import { generatePptx } from '../services/slideGenerator';
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

const COST_PER_FIX = 50;

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
    icon: <Option className="w-4 h-4" />, // Corrected icon reference
    desc: "Stanford-grade academic voice with rhythmic chaos." 
  },
  Creative: { 
    icon: <Palette className="w-4 h-4" />, 
    desc: "Max stylistic variance and identity retention." 
  }
};

// Fixed missing icon in MODE_META
MODE_META.Cerebral.icon = <GraduationCap className="w-4 h-4" />;

const FidelityMap: React.FC<{ data: RadarMetric[] }> = ({ data }) => (
  <div className="bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group h-full">
    <div className="absolute top-0 right-0 p-4 opacity-10">
      <Target className="w-16 h-16 text-indigo-400" />
    </div>
    <div className="flex items-center justify-between mb-6">
      <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] flex items-center gap-2">
        <Radar className="w-4 h-4" /> Neural Fidelity Map
      </h4>
      <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase tracking-widest">Protocol V6</span>
    </div>
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#ffffff10" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
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
  const [viewMode, setViewMode] = useState<'clean' | 'diff' | 'sources' | 'citations'>('clean');
  const [mode, setMode] = useState<HumanizeMode>('IvyStealth');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [strength, setStrength] = useState(98);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [styleSample, setStyleSample] = useState<string>('');
  const [isStyleCloningOpen, setIsStyleCloningOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const currentScore = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;

  const handleFixInitiation = () => {
    onFix({ mode, strength, includeCitations, citationStyle, dialect: 'US', styleProfileId: undefined });
  };

  // Added handleExportPdf to resolve the missing reference error
  const handleExportPdf = () => {
    if (fixResult) {
      downloadPdf(fixResult.rewrittenText, fixResult.newPlagiarismScore, analysis.plagiarismScore);
    } else {
      downloadPdf(originalText, analysis.plagiarismScore, analysis.plagiarismScore);
    }
  };

  const copyCitation = (source: SourceMatch) => {
    const citation = `${source.title}. (${new Date().getFullYear()}). Retrieved from ${source.url}`;
    navigator.clipboard.writeText(citation);
    toast.success(`${citationStyle} Citation Copied`);
  };

  const activeBibliography = [...(fixResult?.bibliography || analysis.sourcesFound || [])]
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-10 sm:pb-20 font-sans">
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="flex-[2] bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
          <div className="shrink-0 scale-110">
            <ScoreGauge score={currentScore} label={fixResult ? "Neural Stealth" : "Forensic Risk"} history={scoreHistory} />
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Grounding</p>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span className="text-lg font-black text-slate-900">Verified</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Adversarial</p>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span className="text-lg font-black text-slate-900">V6 Active</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confidence</p>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="text-lg font-black text-slate-900">{fixResult ? '99.9%' : 'Auditing'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sources</p>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-500" />
                <span className="text-lg font-black text-slate-900">{activeBibliography.length}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1">
           <FidelityMap data={fixResult?.fidelityMap || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2 tracking-widest">
                <Settings className="w-4 h-4 text-indigo-500" /> Bypass Engine
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[8px] font-black uppercase">
                <Sparkles className="w-2.5 h-2.5" /> High Precision
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Institutional Mode</p>
              <div className="grid grid-cols-1 gap-3">
                {(Object.keys(MODE_META) as HumanizeMode[]).map((m) => {
                  const meta = MODE_META[m];
                  const isActive = mode === m;
                  return (
                    <button 
                      key={m} 
                      onClick={() => setMode(m)}
                      className={`group p-4 rounded-2xl border text-left transition-all flex items-start gap-4 ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                    >
                      <div className={`mt-0.5 p-2 rounded-xl border shrink-0 ${isActive ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-slate-100 text-indigo-500 shadow-sm'}`}>
                        {meta.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider mb-0.5">{m}</span>
                        <span className="text-[10px] font-medium leading-tight opacity-70">{meta.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Citation Forensic Config</p>
               <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <select 
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500"
                    >
                      {CITATION_STYLES.map(s => <option key={s} value={s}>{s} Style (Stanford v6)</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => setIncludeCitations(!includeCitations)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all col-span-2 ${includeCitations ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                  >
                    <span>Auto-Reference Prose</span>
                    {includeCitations ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
                  </button>
               </div>
            </div>

            <button 
              onClick={handleFixInitiation}
              disabled={isFixing}
              className="w-full py-5 bg-indigo-600 text-white font-black uppercase rounded-[1.5rem] shadow-xl hover:bg-indigo-700 disabled:opacity-50 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                {isFixing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {isFixing ? `Reconciling Sources...` : 'Execute V6 Bypass'}
              </div>
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
             <div className="flex gap-4 overflow-x-auto scrollbar-none">
                {[
                  { id: 'clean', label: 'Camouflaged Output', icon: <Sparkles className="w-3 h-3" /> },
                  { id: 'diff', label: 'Forensic Audit', icon: <Eye className="w-3 h-3" /> },
                  { id: 'citations', label: 'Citation Studio', icon: <Bookmark className="w-3 h-3" /> }
                ].map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => setViewMode(v.id as any)} 
                    disabled={!fixResult && (v.id === 'diff' || v.id === 'citations')} 
                    className={`text-[10px] font-black uppercase tracking-widest py-2 border-b-2 transition-all flex items-center gap-2 shrink-0 ${viewMode === v.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    {v.icon}
                    {v.label}
                  </button>
                ))}
             </div>
             <div className="flex gap-2 shrink-0">
                <button onClick={onReset} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-rose-500 shadow-sm hover:bg-rose-50 transition-all flex items-center gap-2"><RefreshCw className="w-3 h-3" /> Reset</button>
                {fixResult && (
                  <>
                    <button onClick={handleExportPdf} className="px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500" /> Certificate</button>
                    <button onClick={() => downloadDocx(fixResult.rewrittenText, 'Camouflaged_Output', activeBibliography)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Export</button>
                  </>
                )}
             </div>
          </div>

          <div ref={containerRef} className="flex-1 overflow-y-auto p-8 sm:p-12 font-serif-doc text-xl leading-relaxed text-slate-800 min-h-[600px] selection:bg-indigo-100/50">
            {viewMode === 'citations' ? (
              <div className="animate-in fade-in duration-500 space-y-6">
                 <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex items-center justify-between">
                    <div>
                       <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">Citation Integrity Studio</h4>
                       <p className="text-xs text-slate-500 font-sans">Synthesizing internal references in <strong>{citationStyle}</strong> format. Sources sorted alphabetically.</p>
                    </div>
                    <div className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-lg font-black tracking-tight flex items-center gap-2">
                       <Scale className="w-5 h-5" /> Verified
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                    {activeBibliography.map((source, idx) => (
                      <div key={idx} className="p-6 bg-white border border-slate-200 rounded-[2rem] flex flex-col md:flex-row gap-6 relative group hover:border-indigo-400 transition-all">
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{source.title}</h4>
                              {source.isVerified && <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded flex items-center gap-1"><BookCheck className="w-2.5 h-2.5" /> Academic Match</div>}
                           </div>
                           <p className="text-xs font-sans text-slate-500 italic mb-4">"{source.snippet}"</p>
                           <div className="flex items-center gap-4">
                              <a href={source.url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 hover:underline"><ExternalLink className="w-3 h-3" /> View Portal</a>
                              <button onClick={() => copyCitation(source)} className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors"><Copy className="w-3 h-3" /> Copy {citationStyle} Reference</button>
                           </div>
                        </div>
                        <div className="md:w-32 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Relevance</span>
                            <span className="text-xl font-black text-slate-900">{source.similarity || 100}%</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            ) : !fixResult ? (
              <div className="whitespace-pre-wrap">
                {analysis.paragraphBreakdown.map((p, i) => (
                  <div key={i} className={`mb-6 p-6 rounded-[2rem] transition-all group relative border ${p.riskScore > 50 ? 'bg-rose-50 border-rose-100 shadow-sm' : 'border-transparent'}`}>
                    {p.riskScore > 50 && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-rose-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                        <AlertTriangle className="w-3 h-3" /> {p.matchType || 'RISK'}
                      </div>
                    )}
                    {p.text}
                  </div>
                ))}
              </div>
            ) : viewMode === 'clean' ? (
              <div className="whitespace-pre-wrap animate-in fade-in duration-700">
                {fixResult.rewrittenText}
                {activeBibliography.length > 0 && (
                  <div className="mt-20 pt-10 border-t-2 border-slate-100">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-10 flex items-center gap-4">
                      <SortAsc className="w-8 h-8 text-indigo-500" /> References
                    </h3>
                    <div className="space-y-6">
                      {activeBibliography.map((b, i) => (
                        <div key={i} className="text-base font-serif-doc text-slate-700 leading-relaxed pl-8 -indent-8 group relative hover:bg-slate-50 p-2 rounded-lg transition-colors">
                           <span className="font-bold">{b.title}</span>. (Verified via Forensic Scan). Academic Source available at: <span className="text-indigo-600 italic break-all underline underline-offset-4 decoration-indigo-200">{b.url}</span>
                           <button onClick={() => copyCitation(b)} className="absolute -left-10 top-3 p-1 bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-3 h-3 text-slate-400" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {(Diff as any).diffWords(originalText, fixResult.rewrittenText).map((part: any, i: number) => (
                  <span key={i} className={`${part.added ? 'bg-emerald-50 text-emerald-700' : part.removed ? 'bg-rose-50 text-rose-700 line-through opacity-40' : ''}`}>
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
