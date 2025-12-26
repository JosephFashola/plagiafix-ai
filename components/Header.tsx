
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, BrainCircuit, Lock, Activity, Fingerprint, Linkedin, 
  ExternalLink, GraduationCap, Heart, Zap, User, Users
} from 'lucide-react';
import { checkApiKey } from '../services/geminiService';

interface HeaderProps {
  credits: number;
  onOpenShop: () => void;
}

const Header: React.FC<HeaderProps> = ({ credits, onOpenShop }) => {
  const [isApiKeyValid, setIsApiKeyValid] = useState(true);

  useEffect(() => {
    setIsApiKeyValid(checkApiKey());
  }, []);

  return (
    <header className="bg-slate-900 border-b border-white/10 sticky top-0 z-50 shadow-2xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="bg-indigo-600 p-1.5 rounded-lg sm:p-2 sm:rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-transform hover:rotate-12 cursor-pointer">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-xl font-black text-white tracking-tighter uppercase leading-none font-heading">PlagiaFix AI</h1>
                <span className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/30 rounded">
                  <Zap className="w-2 h-2" /> V6.2
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                 <div className={`w-1 h-1 rounded-full ${isApiKeyValid ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                 <p className="text-[7px] sm:text-[8px] text-slate-400 font-black uppercase tracking-[0.15em]">
                   Engine Ready
                 </p>
              </div>
            </div>
          </div>

          {/* Founder Branding - Joseph Fashola */}
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl transition-all group hover:bg-white/10">
            <a 
              href="https://linkedin.com/in/joseph-fashola" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <div className="p-1.5 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-600 transition-all duration-300">
                <Linkedin className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Founder</span>
                <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  Joseph Fashola
                  <ExternalLink className="w-2.5 h-2.5 opacity-30 group-hover:opacity-100" />
                </span>
              </div>
            </a>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            
            {/* Global Impact / Support Button */}
            <button 
              onClick={onOpenShop}
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 bg-rose-500 text-white rounded-xl sm:rounded-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-600 group transition-all active:scale-95"
            >
               <div className="group-hover:scale-125 transition-transform duration-300">
                 <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
               </div>
               <div className="flex flex-col text-left items-start">
                  <span className="text-[7px] sm:text-[8px] font-black text-white/80 uppercase tracking-widest leading-none">Global Impact</span>
                  <span className="text-[10px] sm:text-xs font-black text-white tracking-tight leading-none">Support Us</span>
               </div>
            </button>

            {/* LinkedIn for Mobile */}
            <a 
              href="https://linkedin.com/in/joseph-fashola" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex md:hidden p-2.5 bg-white/5 border border-white/10 rounded-xl text-indigo-400"
              title="Founder Joseph Fashola"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
