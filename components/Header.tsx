import React from 'react';
import { 
  GraduationCap, Heart, Linkedin, Coins, User, ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  credits: number;
  onOpenShop: () => void;
}

const Header: React.FC<HeaderProps> = ({ credits, onOpenShop }) => {
  return (
    <header className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-12">
        <div className="flex justify-between items-center h-20 lg:h-24">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 lg:gap-8">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
              <div className="bg-slate-900 p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-xl shadow-slate-200 transition-all group-hover:bg-indigo-600 group-hover:shadow-indigo-200 group-hover:-rotate-3">
                <GraduationCap className="h-5 w-5 lg:h-7 lg:w-7 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <h1 className="text-lg lg:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none font-heading">PlagiaFix</h1>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] lg:text-[9px] font-black uppercase tracking-[0.2em] rounded shadow-sm">
                    PRO
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Founder Spotlight (Now visible on mobile with compact version) */}
          <div className="flex items-center">
            <a 
              href="https://linkedin.com/in/joseph-fashola" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-1.5 lg:py-2.5 bg-slate-50 border border-slate-200 rounded-full hover:bg-white hover:border-indigo-400 transition-all shadow-sm hover:shadow-lg group"
            >
              <div className="relative shrink-0">
                <div className="w-7 h-7 lg:w-10 lg:h-10 rounded-full bg-slate-900 flex items-center justify-center text-white overflow-hidden border-2 border-white shadow-md transition-transform group-hover:scale-110">
                  <User className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-indigo-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 lg:w-5 lg:h-5 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                  <Linkedin className="w-1.5 h-1.5 lg:w-2.5 lg:h-2.5 text-white" />
                </div>
              </div>
              <div className="flex flex-col pr-1 lg:pr-2">
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-[7px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Founder</span>
                </div>
                <span className="text-[10px] lg:text-[13px] font-black text-slate-800 tracking-tight leading-none mt-0.5 lg:mt-1 group-hover:text-indigo-600 transition-colors whitespace-nowrap">Joseph Fashola</span>
              </div>
            </a>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 lg:gap-6">
            <button 
              onClick={onOpenShop} 
              className="flex items-center gap-2 lg:gap-3 px-3 lg:px-6 py-2 lg:py-3.5 bg-slate-900 text-white rounded-xl lg:rounded-2xl shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 group border border-white/10"
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