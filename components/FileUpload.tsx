
import React, { useCallback, useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, ShieldCheck, Database, Loader2, Sparkles, 
  BookOpen, Layers, Search, Cpu, BrainCircuit, Globe, CheckCircle, 
  Eye, Zap, Fingerprint, BarChart3
} from 'lucide-react';
import { parseFile } from '../services/documentParser';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onTextLoaded: (text: string, fileName: string) => void;
  isLoading: boolean;
}

const FEATURE_CARDS = [
  {
    icon: <Search className="w-5 h-5" />,
    title: "Deep Scan",
    desc: "Verify plagiarism and AI signatures with exhaustive forensic analysis.",
    color: "indigo"
  },
  {
    icon: <Cpu className="w-5 h-5" />,
    title: "AI Checker",
    desc: "Adversarial detection targeting V6 models of institutional academic checkers.",
    color: "purple"
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Fact Checker",
    desc: "Search-grounded verification of empirical claims and citations.",
    color: "emerald"
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Content DNA",
    desc: "Real-time readability and linguistic friction mapping for pro quality.",
    color: "amber"
  }
];

const FileUpload: React.FC<FileUploadProps> = ({ onTextLoaded, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const words = inputText.trim() ? inputText.trim().split(/\s+/).filter(w => w.length > 0) : [];
    setWordCount(words.length);
  }, [inputText]);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    const loadingToast = toast.loading(`Uploading document...`);
    try {
      const text = await parseFile(file);
      onTextLoaded(text, file.name);
      toast.success("Document analyzed successfully", { icon: '✨' });
    } catch (error: any) {
      toast.error(error.message || "Parse failed.");
    } finally {
      setIsProcessing(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleTextSubmit = () => {
    if (inputText.trim().length > 10) {
      onTextLoaded(inputText, 'Studio Input');
    }
  };

  const isDisabled = isLoading || isProcessing;

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 sm:space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* Primary Input Section: Upload & Textarea */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 px-2">
        <div className="lg:col-span-4 space-y-6">
           <div 
            className={`h-full border-2 border-dashed rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 transition-studio text-center cursor-pointer group flex flex-col items-center justify-center gap-6 sm:gap-8 min-h-[280px]
              ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/20 shadow-xl shadow-indigo-500/5'}
              ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input type="file" id="file-upload" className="hidden" accept=".txt,.md,.pdf,.docx" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} disabled={isDisabled} />
            
            <div className="p-6 sm:p-8 bg-indigo-50 rounded-[2rem] text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-studio shadow-inner relative">
              {isProcessing ? <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin" /> : <UploadCloud className="h-10 w-10 sm:h-12 sm:w-12" />}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase font-heading">Bulk Scan</h3>
              <p className="text-[11px] sm:text-sm text-slate-500 max-w-[250px] mx-auto font-medium">Batch process documents up to 500k words with high precision.</p>
            </div>

            <div className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Privacy Guard
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-[2.5rem] sm:rounded-[3.5rem] p-1.5 sm:p-2 shadow-2xl border border-slate-200">
           <div className="bg-white p-4 sm:p-10 rounded-[2rem] sm:rounded-[3rem] relative">
            <textarea
              className="w-full h-[350px] sm:h-[550px] p-6 sm:p-10 bg-slate-50/40 border border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none resize-none text-slate-800 placeholder:text-slate-400 text-base sm:text-xl leading-relaxed transition-studio scrollbar-thin font-medium"
              placeholder="Paste your content DNA here... Verifying facts, neutralizing signatures, and optimizing readability in one pass."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isDisabled}
            />
            
            <div className="mt-6 sm:mt-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="w-full md:w-auto flex items-center gap-4 px-6 py-3 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                <FileText className="h-5 w-5 text-indigo-500" />
                <div className="flex flex-col">
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Document Density</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 tracking-tighter">
                    {wordCount.toLocaleString()} Words
                  </span>
                </div>
              </div>
              
              <button
                  onClick={handleTextSubmit}
                  disabled={isDisabled || inputText.trim().length < 10}
                  className="w-full md:w-auto px-8 sm:px-14 py-4 sm:py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-studio shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 sm:gap-4 active:scale-95 group text-sm sm:text-base font-heading"
              >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-studio" />}
                  Launch Deep Scan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Card Grid: Capabilities Discovery */}
      <div className="space-y-8 px-2">
        <div className="flex items-center gap-4">
           <div className="h-px flex-1 bg-slate-200"></div>
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-heading">Forensic Suite Capabilities</h4>
           <div className="h-px flex-1 bg-slate-200"></div>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FEATURE_CARDS.map((card, idx) => (
            <div key={idx} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className={`p-3 sm:p-4 bg-${card.color}-50 text-${card.color}-600 rounded-2xl w-fit mb-4 sm:mb-6 group-hover:bg-${card.color}-600 group-hover:text-white transition-colors`}>
                {card.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 sm:mb-3 flex items-center gap-2 font-heading">
                {card.title} <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
              </h3>
              <p className="text-[11px] sm:text-sm text-slate-500 leading-relaxed font-medium">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default FileUpload;
