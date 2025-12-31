
import React from 'react';
import { ExternalLink, Star, ArrowRight, Award, Trophy } from 'lucide-react';

const LaunchBanner: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-[#ff6154] to-[#da552f] text-white py-3 px-6 relative overflow-hidden group cursor-pointer shadow-lg border-b border-white/10">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1.5 rounded-lg shadow-xl flex items-center justify-center min-w-[32px] min-h-[32px]">
             <Trophy className="w-5 h-5 text-[#ff6154]" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest leading-none">
            WE ARE LIVE ON <span className="underline decoration-2 underline-offset-4 font-black">PRODUCT HUNT</span> TODAY! <span className="hidden sm:inline opacity-80">SCAN HUNDREDS OF PAGES FOR FREE.</span>
          </p>
        </div>
        
        <a 
          href="https://www.producthunt.com/posts/plagiafix-ai" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 bg-white text-[#ff6154] px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] hover:scale-105 hover:bg-slate-50 transition-all shadow-2xl active:scale-95"
        >
          View on Product Hunt <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
      
      {/* Decorative pulse */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>
    </div>
  );
};

export default LaunchBanner;
