
import React from 'react';
import { ExternalLink, Star, ArrowRight, Award } from 'lucide-react';

const LaunchBanner: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-[#ff6154] to-[#da552f] text-white py-3 px-6 relative overflow-hidden group cursor-pointer shadow-lg">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1.5 rounded-lg shadow-xl">
             <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=456789&theme=light" alt="Product Hunt Badge" className="h-6" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest leading-none">
            We are live on <span className="underline">Product Hunt</span> today! <span className="hidden sm:inline">Support our mission for academic freedom.</span>
          </p>
        </div>
        
        <a 
          href="https://www.producthunt.com/posts/plagiafix-ai" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-2 bg-white text-[#ff6154] px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
        >
          View on Product Hunt <ArrowRight className="w-3 h-3" />
        </a>
      </div>
      
      {/* Decorative pulse */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
    </div>
  );
};

export default LaunchBanner;
