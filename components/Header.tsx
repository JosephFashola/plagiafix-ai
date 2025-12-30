
import React, { useEffect, useState } from 'react';
import { 
  GraduationCap, Heart, Linkedin, Coins, User, ShieldCheck, Sun, Moon, Activity, Zap
} from 'lucide-react';
import { Telemetry } from '../services/telemetry';

interface HeaderProps {
  credits: number;
  onOpenShop: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ credits, onOpenShop, darkMode, onToggleDarkMode }) => {
  const [globalWords, setGlobalWords] = useState<number>(842000); // Base traction

  useEffect(() => {
    const fetchTraction = async () => {
      const { stats } = await Telemetry.getGroundTruthStats();
      if (stats.totalWordsProcessed > 0) {
        setGlobalWords(stats.totalWordsProcessed);
      }
    };
    fetchTraction();
    const interval = setInterval(fetchTraction, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-12">
        <div className="flex justify-between items-center h-20 lg:h-24">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 lg:gap-8">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
              <div className="bg-slate-900 dark:bg-slate-800 p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none transition-all group-hover:bg-indigo-600 group-hover:shadow-indigo-200 dark:group-hover:bg-indigo-600 dark:group-hover:shadow-none group-hover:-rotate-3">
                <GraduationCap className="h-5 w-5 lg:h-7 lg:w-7 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <h1 className="text-lg lg:text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none font-heading">PlagiaFix</h1>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] lg:text-[9px] font-black uppercase tracking-[0.2em] rounded shadow-sm">
                    PRO
                  </div>
                </div>
              </div>
            </div>

            {/* Live Traction Ticker (Product Hunt Feature) */}
            <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-full animate-in fade-in duration-1000">
               <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
               <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <span className="text-indigo-600 dark:text-indigo-400">{globalWords.toLocaleString()}</span> Words Purified
                  </span>
               </div>
            </div>
          </div>

          {/* Center: Founder Spotlight */}
          <div className="flex items-center">
            <a 
              href="https://linkedin.com/in/joseph-fashola" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-1.5 lg:py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-lg group"
            >
              <div className="relative shrink-0">
                <div className="w-7 h-7 lg:w-10 lg:h-10 rounded-full bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white overflow-hidden border-2 border-white dark:border-slate-800 shadow-md transition-transform group-hover:scale-110">
                  <User className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-indigo-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 lg:w-5 lg:h-5 bg-indigo-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-sm">
                  <Linkedin className="w-1.5 h-1.5 lg:w-2.5 lg:h-2.5 text-white" />
                </div>
              </div>
              <div className="flex flex-col pr-1 lg:pr-2">
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-[7px] lg:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Founder</span>
                </div>
                <span className="text-[10px] lg:text-[13px] font-black text-slate-800 dark:text-slate-200 tracking-tight leading-none mt-0.5 lg:mt-1 group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap">Joseph Fashola</span>
              </div>
            </a>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 lg:gap-6">
            <button 
              onClick={onToggleDarkMode} 
              className="p-2 lg:p-3.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl lg:rounded-2xl hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 transition-all shadow-sm active:scale-90"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 lg:w-5 lg:h-5" /> : <Moon className="w-4 h-4 lg:w-5 lg:h-5" />}
            </button>
            <button 
              onClick={onOpenShop} 
              className="flex items-center gap-2 lg:gap-3 px-3 lg:px-6 py-2 lg:py-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl lg:rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none hover:bg-indigo-600 dark:hover:bg-indigo-700 transition-all active:scale-95 group border border-white/10"
            >
              <Heart className={`w-3 h-3 lg:w-4 lg:h-4 transition-transform group-hover:scale-125 ${credits > 0 ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
              <span className="text-[8px] lg:text-[11px] font-black uppercase tracking-widest whitespace-nowrap">Support</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
