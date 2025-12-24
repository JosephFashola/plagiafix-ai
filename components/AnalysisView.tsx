
import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, AppStatus, FixResult, FixOptions, HumanizeMode, CitationStyle, SourceMatch, ParagraphAnalysis } from '../types';
import ScoreGauge from './ScoreGauge';
import { 
  Copy, Sparkles, RefreshCw, Download, 
  Zap, ExternalLink, Link2, BookOpen, 
  PlusCircle, AlertTriangle, Settings, Layout, Map, FileCheck2, FileText, NotebookTabs, MonitorPlay,
  Globe, Quote, Sliders, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadDocx, downloadPdf } from '../services/exportService';
import { generatePresentationContent, refineTextSegment, generateStudyGuide, generateSummaryMemo } from '../services/geminiService';
import { generatePptx } from '../services/slideGenerator';
import { Telemetry } from '../services/telemetry';
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

const Heatmap: React.FC<{ paragraphs: ParagraphAnalysis[], onScrollTo: (index: number) => void }> = ({ paragraphs, onScrollTo }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
      <Map className="w-3 h-3" /> Risk Heatmap
    </h4>
    <div className="flex flex-wrap gap-1">
      {paragraphs.map((p, i) => {
        const score = p.riskScore || 0;
        const color = score > 60 ? 'bg-rose-500' : score > 30 ? 'bg-amber-400' : 'bg-emerald-400';
        return (
          <button
            key={i}
            onClick={() => onScrollTo(i)}
            className={`w-3 h-3 rounded-sm ${color} hover:scale-125 transition-all opacity-80`}
            title={`Para ${i+1}: ${score}% Risk`}
          />
        );
      })}
    </div>
  </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ 
  originalText, analysis, fixResult, status, onFix, onUpdateText, onReset, scoreHistory
}) => {
  const isFixing = status === AppStatus.FIXING;
  const [viewMode, setViewMode] = useState<'clean' | 'diff'>('clean');
  const [mode, setMode] = useState<HumanizeMode>('Standard');
  const [includeCitations, setIncludeCitations] = useState(false);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [dialect, setDialect] = useState<'US' | 'UK' | 'CA' | 'AU'>('US');
  const [strength, setStrength] = useState(85);
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect | null }>({ text: '', rect: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const paraRefs = useRef<(HTMLDivElement | null)[]>([]);

  const currentScore = fixResult ? fixResult.newPlagiarismScore : analysis.plagiarismScore;

  const scrollToPara = (index: number) => {
    setViewMode('clean');
    setTimeout(() => {
        paraRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleRefine = async (selectedText: string) => {
    const loading = toast.loading("Refining neural segment...");
    setSelection({ text: '', rect: null });
    try {
      const currentText = fixResult ? fixResult.rewrittenText : originalText;
      const refined = await refineTextSegment(currentText, selectedText, mode);
      if (fixResult) {
        const updatedText = fixResult.rewrittenText.replace(selectedText, refined);
        onUpdateText(updatedText);
        toast.success("Humanized!");
        Telemetry.addLogLocal('REFINE', `Segment refined`);
      }
    } catch (e) {
      toast.error("Refinement failed.");
    } finally {
      toast.dismiss(loading);
    }
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 15 && containerRef.current) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setSelection({ text: sel.toString(), rect });
    } else {
      setSelection({ text: '', rect: null });
    }
  };

  const handleMemoGenerate = async () => {
    const loading = toast.loading("Generating Memo...");
    try {
        const memo = await generateSummaryMemo(fixResult?.rewrittenText || originalText);
        const content = `SUBJECT: ${memo.subject}\nTO: ${memo.to}\nFROM: ${memo.from}\n\nEXECUTIVE SUMMARY:\n${memo.executiveSummary}`;
        await downloadDocx(content, 'Executive_Memo');
    } catch (e) {
        toast.error("Memo failed.");
    } finally {
        toast.dismiss(loading);
    }
  };

  const handleStudyGuideGenerate = async () => {
    const loading = toast.loading("Building Study Guide...");
    try {
        const guide = await generateStudyGuide(fixResult?.rewrittenText || originalText);
        let content = `# ${guide.title}\n\n## Summary\n${guide.summary}\n\n## Key Concepts\n`;
        guide.keyConcepts.forEach(c => content += `**${c.term}**: ${c.definition}\n\n`);
        await downloadDocx(content, 'Study_Guide');
    } catch (e) {
        toast.error("Guide failed.");
    } finally {
        toast.dismiss(loading);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-20 font-sans">
      {selection.rect && viewMode === 'clean' && fixResult && (
        <div 
          className="fixed z-[100] animate-in fade-in zoom-in"
          style={{ top: selection.rect.top - 54, left: selection.rect.left + (selection.rect.width / 2) - 75 }}
        >
          <button onClick={() => handleRefine(selection.text)} className="px-4 py-2 bg-slate-900 text-white rounded-full shadow-2xl border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600">
            Neural Refine
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <div className="flex-1 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 flex items-center gap-8">
          <ScoreGauge score={currentScore} label={fixResult ? "Stealth Score" : "Forensic Risk"} history={scoreHistory} />
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 border-l border-slate-100 pl-8">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Matches</p>
              <span className="text-lg font-black text-slate-900">{analysis.sourcesFound.length} Sources</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">AI Check</p>
              <span className="text-lg font-black text-slate-900">{analysis.forensics.uniqueWordRatio < 0.45 ? 'High' : 'Low'}</span>
            </div>
            <div className="hidden md:block">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Readability</p>
              <span className="text-lg font-black text-slate-900">Grade {Math.round(analysis.forensics.readabilityScore)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => downloadPdf(fixResult?.rewrittenText || originalText, 100 - currentScore, analysis.plagiarismScore)} className="px-8 py-5 bg-slate-900 text-white rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
            Export Report
          </button>
          <button onClick={onReset} className="px-8 py-5 bg-white border border-slate-200 text-slate-600 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
            New Analysis
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" /> Humanizer Engine
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase">
                <Sparkles className="w-2.5 h-2.5" /> v2.4 Native
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Synthesis Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {(['Standard', 'Ghost', 'Academic', 'Creative'] as HumanizeMode[]).map((m) => (
                  <button 
                    key={m} onClick={() => setMode(m)}
                    className={`p-4 rounded-2xl border text-left transition-all ${mode === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                  >
                    <span className="text-[10px] font-black uppercase block">{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Neural Parameters */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex justify-between items-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Intensity</p>
                 <span className="text-[10px] font-black text-indigo-600">{strength}%</span>
               </div>
               <input 
                 type="range" min="0" max="100" value={strength} 
                 onChange={(e) => setStrength(parseInt(e.target.value))}
                 className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
               />
               
               <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" /> Dialect
                    </p>
                    <select 
                      value={dialect} onChange={(e) => setDialect(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="US">American</option>
                      <option value="UK">British</option>
                      <option value="CA">Canadian</option>
                      <option value="AU">Australian</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Quote className="w-2.5 h-2.5" /> Citations
                    </p>
                    <div className="flex items-center h-9">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={includeCitations} onChange={() => setIncludeCitations(!includeCitations)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-2 text-[9px] font-black text-slate-500 uppercase">{includeCitations ? 'ON' : 'OFF'}</span>
                      </label>
                    </div>
                  </div>
               </div>

               {includeCitations && (
                 <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Citation Style</p>
                    <div className="flex flex-wrap gap-2">
                      {(['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE'] as CitationStyle[]).map(s => (
                        <button 
                          key={s} onClick={() => setCitationStyle(s)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black border transition-all ${citationStyle === s ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                 </div>
               )}
            </div>

            <button 
              onClick={() => onFix({ mode, strength, includeCitations, dialect, citationStyle })}
              disabled={isFixing}
              className="w-full py-5 bg-indigo-600 text-white font-black uppercase rounded-[1.5rem] shadow-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isFixing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {isFixing ? `Synthesizing...` : 'Deep Humanize'}
            </button>
          </div>

          <Heatmap paragraphs={analysis.paragraphBreakdown} onScrollTo={scrollToPara} />

          {/* Bibliography Display */}
          {fixResult && fixResult.references && fixResult.references.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm animate-in slide-in-from-bottom-4">
              <h3 className="text-xs font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Bibliography
              </h3>
              <div className="space-y-3">
                {fixResult.references.map((ref, i) => (
                  <div key={i} className="group relative p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                    <button 
                      onClick={() => { navigator.clipboard.writeText(ref); toast.success("Citation Copied!"); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 transition-all"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                    </button>
                    <p className="text-[11px] leading-relaxed text-slate-600 font-serif-doc pr-6">{ref}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-rose-500" /> Web Sources Found
            </h3>
            <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-none">
              {analysis.sourcesFound.map((source, i) => (
                <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="block p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-rose-300 transition-all group">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[10px] font-black text-rose-600">{source.similarity}% Match</div>
                    <Link2 className="w-3 h-3 text-slate-300 group-hover:text-rose-400 transition-all" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{source.title}</h4>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex gap-6">
                {['clean', 'diff'].map(v => (
                  <button key={v} onClick={() => setViewMode(v as any)} disabled={!fixResult && v === 'diff'} className={`text-[10px] font-black uppercase tracking-widest py-2 border-b-2 transition-all ${viewMode === v ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                    {v === 'clean' ? 'Synthesized' : 'Audit Log'}
                  </button>
                ))}
             </div>
             {fixResult && (
               <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(fixResult.rewrittenText); toast.success("Copied!"); }} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 shadow-sm transition-all hover:bg-slate-50" title="Copy Text"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => downloadDocx(fixResult.rewrittenText, 'Fixed_Document', fixResult.references)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Download</button>
               </div>
             )}
          </div>

          <div ref={containerRef} onMouseUp={handleMouseUp} className="flex-1 overflow-y-auto p-12 font-serif-doc text-xl leading-relaxed text-slate-800 min-h-[600px]">
            {!fixResult ? (
              <div className="whitespace-pre-wrap">
                {analysis.paragraphBreakdown.map((p, i) => (
                  <div key={i} ref={el => { paraRefs.current[i] = el; }} className={`mb-6 p-4 rounded-2xl transition-all ${p.riskScore > 50 ? 'bg-rose-50 border border-rose-100' : ''}`}>
                    {p.text}
                  </div>
                ))}
              </div>
            ) : viewMode === 'clean' ? (
              <div className="whitespace-pre-wrap animate-in fade-in duration-700">
                {fixResult.rewrittenText}
                {fixResult.references && fixResult.references.length > 0 && (
                   <div className="mt-20 pt-10 border-t border-slate-100">
                      <h3 className="text-xl font-bold mb-6 font-sans">References</h3>
                      <div className="space-y-4">
                        {fixResult.references.map((r, i) => (
                          <p key={i} className="text-sm text-slate-600 leading-relaxed pl-10 -indent-10">{r}</p>
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

          <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-4">
              <button onClick={handleStudyGuideGenerate} className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase hover:text-indigo-600 transition-all shadow-sm">
                <NotebookTabs className="w-4 h-4" /> Study Guide
              </button>
              <button onClick={handleMemoGenerate} className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase hover:text-indigo-600 transition-all shadow-sm">
                <FileCheck2 className="w-4 h-4" /> Memo
              </button>
              <button onClick={() => generatePresentationContent(fixResult?.rewrittenText || originalText).then(s => generatePptx(s, 'Lecture_Slides'))} className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase hover:text-indigo-600 transition-all shadow-sm">
                <MonitorPlay className="w-4 h-4" /> Slides
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
