
import { 
  UploadCloud, Search, 
  Presentation, FileSearch, Mic,
  Shuffle, Zap, ArrowRight,
  Activity, GraduationCap, ShieldCheck, Loader2, Sparkles, FileText,
  RefreshCcw
} from 'lucide-react';
import { parseFile } from '../services/documentParser';
import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';

interface FileUploadProps {
  onTextLoaded: (text: string, fileName: string) => void;
  isLoading: boolean;
}

const FREE_LIMIT_LABEL = 100000;

const FileUpload: React.FC<FileUploadProps> = ({ onTextLoaded, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingMsg, setParsingMsg] = useState('');

  useEffect(() => {
    const words = inputText.trim() ? inputText.trim().split(/\s+/).filter(w => w.length > 0) : [];
    setWordCount(words.length);
  }, [inputText]);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setParsingMsg('Initiating Bulk Document Audit...');
    try {
      const text = await parseFile(file, (msg) => setParsingMsg(msg));
      onTextLoaded(text, file.name);
      toast.success("Document Ingested Successfully");
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setIsProcessing(false); 
      setParsingMsg('');
    }
  };

  const progressPercent = Math.min(100, (wordCount / FREE_LIMIT_LABEL) * 100);

  return (
    <div className="space-y-12 transition-colors duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Drop Zone */}
        <div className="lg:col-span-4">
           <div 
             onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
             onDragLeave={() => setIsDragging(false)}
             onDrop={(e) => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files?.[0] && processFile(e.dataTransfer.files[0]); }}
             onClick={() => !isProcessing && document.getElementById('file-upload')?.click()} 
             className={`h-full min-h-[480px] rounded-[3rem] p-12 text-center cursor-pointer group flex flex-col items-center justify-center gap-8 transition-all duration-500 border-2 ${isDragging ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-200' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 shadow-xl shadow-slate-100/50 dark:shadow-none'}`}
           >
             <input type="file" id="file-upload" className="hidden" accept=".txt,.md,.pdf,.docx" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} disabled={isLoading || isProcessing} />
             
             <div className={`p-8 rounded-3xl transition-all duration-500 ${isDragging ? 'bg-white text-indigo-600' : isProcessing ? 'bg-indigo-600 text-white shadow-xl animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:-translate-y-2'}`}>
               {isProcessing ? <RefreshCcw className="h-12 w-12 animate-spin" /> : <UploadCloud className="h-12 w-12" />}
             </div>
             
             <div className="space-y-4">
                <h3 className={`text-2xl font-black uppercase tracking-tight transition-colors font-heading ${isDragging ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {isProcessing ? 'Processing...' : 'Upload 100+ Pages'}
                </h3>
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] max-w-[240px] mx-auto leading-relaxed transition-colors ${isDragging ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {parsingMsg || 'PDF, DOCX, or Text. Our engine handles hundreds of pages simultaneously for free. Forensic analysis at scale.'}
                </p>
             </div>
             
             <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl">
               <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
               <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Sovereign Free Audit</span>
             </div>
           </div>
        </div>

        {/* Text Area */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-1 shadow-2xl relative overflow-hidden h-full border border-white/5 dark:border-indigo-500/10 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none"></div>
            
            <div className="p-10 flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 neural-pulse"></div>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em]">Institutional Editor</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Free Mode Active</span>
                  </div>
              </div>

              <textarea 
                  className="w-full flex-1 min-h-[380px] p-8 bg-transparent outline-none resize-none text-slate-100 text-xl leading-relaxed transition-all placeholder:text-slate-700 font-serif-doc" 
                  placeholder="Paste your dissertation, essay, or research paper here..." 
                  value={inputText} 
                  onChange={(e) => setInputText(e.target.value)} 
                  disabled={isLoading || isProcessing} 
              />
              
              <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex flex-col gap-3 w-full md:w-80">
                  <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">
                          <Activity className="h-3.5 w-3.5 text-indigo-500" />
                          Ingestion Capacity
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-500">{wordCount.toLocaleString()} / 100k</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 dark:bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-1000 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <button 
                  onClick={() => inputText.trim().length > 10 && onTextLoaded(inputText, 'Editor Input')} 
                  disabled={isLoading || isProcessing || inputText.trim().length < 10} 
                  className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-500 disabled:opacity-30 transition-all shadow-2xl flex items-center justify-center gap-4 group text-xs active:scale-95"
                >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />} 
                    Humanize Everything
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
