import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, BookOpen, Database, Loader2, FileType } from 'lucide-react';
import { parseFile } from '../services/documentParser';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onTextLoaded: (text: string, fileName: string) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onTextLoaded, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    const loadingToast = toast.loading(`Reading ${file.name}...`);
    
    try {
      const text = await parseFile(file);
      
      if (text.length < 50) {
          toast.error("File content is too short or empty.");
      } else {
          onTextLoaded(text, file.name);
          toast.success("File loaded successfully!");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to read file.");
    } finally {
      setIsProcessing(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onTextLoaded]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleTextSubmit = () => {
    if (inputText.trim().length > 0) {
      onTextLoaded(inputText, 'Pasted Content');
    }
  };

  // Optimize large text handling for the textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (val.length > 50000) {
        setIsLargeFile(true);
    } else {
        setIsLargeFile(false);
    }
  };

  const isDisabled = isLoading || isProcessing;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* File Drop Zone */}
      <div 
        className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-in-out text-center cursor-pointer group
          ${dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'}
          ${isDisabled ? 'opacity-60 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          accept=".txt,.md,.json,.csv,.rtf,.pdf,.docx"
          onChange={handleChange}
          disabled={isDisabled}
        />
        
        <div className="flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="p-5 bg-indigo-50 rounded-full text-indigo-600 group-hover:bg-indigo-100 transition-colors relative">
            {isProcessing ? (
                <Loader2 className="h-10 w-10 animate-spin" />
            ) : (
                <UploadCloud className="h-10 w-10" />
            )}
            {!isProcessing && (
                <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 border border-slate-200">
                    <FileType className="h-4 w-4 text-slate-400" />
                </div>
            )}
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">
              {isProcessing ? 'Processing File...' : 'Upload Document'}
            </p>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
              Drag & drop or click to upload. 
              <span className="block font-semibold text-indigo-600 mt-1">Unlimited size supported. Scan hundreds of pages.</span>
            </p>
            <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-100 inline-block px-2 py-1 rounded">
              PDF, DOCX, TXT, MD, CSV
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px bg-slate-200 flex-1"></div>
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Or Input Text Directly</span>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* Text Area */}
      <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 ring-4 ring-slate-50">
        <div className="bg-white p-6 rounded-xl relative">
          <textarea
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-700 placeholder:text-slate-400 text-sm leading-relaxed"
            placeholder="Paste your essay, article, or entire thesis here... (No length limits)"
            value={inputText}
            onChange={handleTextChange}
            disabled={isDisabled}
          />
          {isLargeFile && (
              <div className="absolute top-8 right-8 bg-amber-50 text-amber-600 text-xs px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Large content detected
              </div>
          )}
          <div className="mt-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <BookOpen className="h-4 w-4" />
              <span>{inputText.length > 0 ? `${inputText.split(/\s+/).length.toLocaleString()} words` : '0 words'}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleTextSubmit}
                disabled={isDisabled || inputText.length < 10}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                Scan & Analyze
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;