
import React, { useState, useEffect } from 'react';
import { ShieldCheck, BrainCircuit, Lock, Activity, Coins, Fingerprint, Linkedin, ExternalLink, Plus, GraduationCap, Heart } from 'lucide-react';
import { checkApiKey } from '../services/geminiService';

interface HeaderProps {
  credits: number;
  onOpenShop: () => void;
}

const Header: React.FC<HeaderProps> = ({ credits, onOpenShop }) => {
  const [pulse, setPulse] = useState(true);
  const [isApiKeyValid, setIsApiKeyValid] = useState(true);

  useEffect(() => {
    setIsApiKeyValid(checkApiKey());
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-white/5 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg sm:p-2.5 sm:rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)] shrink-0">
                <GraduationCap className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black text-white tracking-tighter uppercase leading-none">PlagiaFix AI</h1>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[7px] font-black uppercase tracking-widest border border-indigo-500/30 rounded">V6</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                   <div className={`w-1 h-1 rounded-full ${isApiKeyValid ? (pulse ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-emerald-400') : 'bg-rose-500'}`}></div>
                   <p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.1em]">Neural Core Active</p>
                </div>
              </div>
            </div>

            <div className="hidden md:block w-px h-10 bg-white/10 mx-2"></div>

            <a 
              href="https://linkedin.com/in/joseph-fashola" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden xs:flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group hover:border-indigo-500/30"
              title="Founder: Joseph Fashola"
            >
              <div className="p-1 bg-indigo-500/20 rounded-md group-hover:bg-indigo-500 transition-colors">
                <Linkedin className="w-3 h-3 text-indigo-400 group-hover:text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Founder</span>
                <span className="text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                  Joseph Fashola
                  <ExternalLink className="w-2 h-2 opacity-30 group-hover:opacity-100" />
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <button 
              onClick={onOpenShop}
              className="flex items-center gap-3 px-3 sm:px-5 py-2.5 bg-rose-500/5 hover:bg-rose-500/10 rounded-2xl border border-rose-500/10 group transition-all"
            >
               <div className="text-rose-500 group-hover:scale-125 transition-transform">
                 <Heart className="w-4 h-4 fill-current" />
               </div>
               <div className="flex flex-col text-left">
                  <span className="text-[8px] font-black text-rose-500/60 uppercase tracking-widest">Impact</span>
                  <span className="text-sm font-black text-white tracking-tighter leading-none">{credits.toLocaleString()}</span>
               </div>
            </button>

            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
                <Lock className="h-3 w-3" />
                <span>Forensic Guard</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
