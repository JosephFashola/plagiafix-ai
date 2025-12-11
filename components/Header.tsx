import React from 'react';
import { ShieldCheck, Sparkles, BrainCircuit, Lock } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">PlagiaFix AI</h1>
              <p className="text-xs text-slate-500 font-medium">Global Plagiarism Fixer</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100" title="Your data is not stored for training">
              <Lock className="h-3 w-3 text-slate-500" />
              <span>Incognito Mode</span>
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
              <span>Gemini 3 Pro Engine</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <Sparkles className="h-3.5 w-3.5 fill-emerald-300" />
              <span>Humanizer v2</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;