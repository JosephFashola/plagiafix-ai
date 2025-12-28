
import React from 'react';
import { X, Clock, RotateCcw, FileText, ChevronRight, Zap } from 'lucide-react';
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
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Revision History</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forensic version control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {versions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
              <Clock className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">No history segments recorded.</p>
            </div>
          ) : (
            versions.map((v) => (
              <div 
                key={v.id}
                className="group p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{v.label}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(v.timestamp).toLocaleString()} • {Math.round(v.score)}% Risk
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onRestore(v)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">All revision cycles are locally encrypted & sovereign.</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
