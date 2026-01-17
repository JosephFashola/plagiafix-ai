
import React from 'react';
// Added ShieldCheck to the imports from lucide-react
import { X, Clock, RotateCcw, FileText, ChevronRight, Zap, Library, ShieldCheck } from 'lucide-react';
import { DocumentVersion } from '../types';

interface HistoryModalProps {
  versions: DocumentVersion[];
  onRestore: (version: DocumentVersion) => void;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ versions, onRestore, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[70vh] border border-white/20 animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Archive Vault</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forensic session storage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
          {versions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <Clock className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">No segments archived.</p>
            </div>
          ) : (
            [...versions].reverse().map((v) => (
              <div 
                key={v.id}
                className="group p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white group-hover:bg-indigo-600 transition-colors shadow-lg">
                    <FileText className="w-6 h-6 mb-1" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{v.aiProbability}%</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{v.label}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                       <p className="text-[10px] text-slate-400 font-medium">
                         {new Date(v.timestamp).toLocaleString()}
                       </p>
                       <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                       <div className="flex items-center gap-1 text-indigo-500 font-black text-[9px] uppercase tracking-widest">
                          <Library className="w-3 h-3" /> {v.bibliography?.length || 0} Sources
                       </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => onRestore(v)}
                  className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" /> Refer Back
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-8 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/10">
           <div className="flex items-center gap-4">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Locally Encrypted Ledger Active</span>
           </div>
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Institutional Grade Persistence</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
