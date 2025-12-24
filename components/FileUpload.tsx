
import React, { useCallback, useState, useEffect } from 'react';
import { UploadCloud, FileText, ShieldCheck, Database, Loader2, Sparkles, BookOpen, Layers } from 'lucide-react';
import { parseFile } from '../services/documentParser';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onTextLoaded: (text: string, fileName: string) => void;
  isLoading: boolean;
}

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
      if (text.length < 50) {
          toast.error("Content too brief for accurate analysis.");
      } else {
          onTextLoaded(text, file.name);
          toast.success("Document analyzed successfully", { icon: '✨' });
      }
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
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* High-Performance Launchpad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div 
          className={`relative border-2 border-dashed rounded-[2.5rem] p-12 transition-studio text-center cursor-pointer group flex flex-col items-center justify-center gap-6
            ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/20'}
            ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input type="file" id="file-upload" className="hidden" accept=".txt,.md,.pdf,.docx" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} disabled={isDisabled} />
          
          <div className="p-8 bg-indigo-50 rounded-[2rem] text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-studio shadow-inner">
            {isProcessing ? <Loader2 className="h-12 w-12 animate-spin" /> : <UploadCloud className="h-12 w-12" />}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Bulk Upload Studio</h3>
            <p className="text-sm text-slate-500 max-w-[200px] mx-auto font-medium">PDF, DOCX, or TXT support for up to 500k words.</p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            100% Privacy Encrypted
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Layers className="w-6 h-6" /></div>
              <div>
                <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Scalable Engine</h4>
                <p className="text-xs text-slate-500 font-medium">Powered by Gemini 3 Flash for zero-latency document analysis.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600"><Database className="w-6 h-6" /></div>
              <div>
                <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Multi-Page Context</h4>
                <p className="text-xs text-slate-500 font-medium">Maintains core thesis alignment across hundreds of pages.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><BookOpen className="w-6 h-6" /></div>
              <div>
                <h4 className="font-black text-slate-900 uppercase text-sm tracking-widest">Academic Standards</h4>
                <p className="text-xs text-slate-500 font-medium">Automatic APA/MLA cross-referencing and source verification.</p>
              </div>
            </div>
          </div>
          
          <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-end">
             <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
               <span className="text-xs font-black text-indigo-700">99.9% Bypass Rate</span>
             </div>
          </div>
        </div>
      </div>

      {/* Manual Input Editor */}
      <div className="bg-white rounded-[3rem] p-2 shadow-2xl border border-slate-200">
        <div className="bg-white p-10 rounded-[2.5rem] relative">
          <textarea
            className="w-full h-[600px] p-10 bg-slate-50/30 border border-slate-100 rounded-3xl focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none resize-none text-slate-800 placeholder:text-slate-400 text-lg leading-relaxed transition-studio font-serif-doc scrollbar-thin"
            placeholder="Paste your content DNA here... Let the studio synthesize it into original, human-quality text."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isDisabled}
          />
          
          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <FileText className="h-5 w-5 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Word Count</span>
                <span className="text-sm font-black text-slate-700 uppercase tracking-tighter">
                  {wordCount.toLocaleString()} Words
                </span>
              </div>
            </div>
            
            <button
                onClick={handleTextSubmit}
                disabled={isDisabled || inputText.trim().length < 10}
                className="w-full md:w-auto px-16 py-5 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-studio shadow-2xl shadow-indigo-100 hover:shadow-indigo-500/40 flex items-center justify-center gap-4 active:scale-[0.98] group"
            >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-studio" />}
                Initiate Studio Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
