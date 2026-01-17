
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { X, Info, HelpCircle } from 'lucide-react';

interface ScoreGaugeProps {
  score: number; // 0 to 100
  label: string;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label }) => {
  const [showInfo, setShowInfo] = useState(false);

  const safeScore = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  
  const data = [
    { name: 'Score', value: safeScore },
    { name: 'Remaining', value: 100 - safeScore },
  ];

  // Color mapping based on risk level
  let color = '#ef4444'; // High Risk (Red)
  if (safeScore < 40) color = '#f59e0b'; // Medium (Amber)
  if (safeScore < 15) color = '#10b981'; // Low (Green)
  if (safeScore < 5) color = '#4f46e5'; // Institutional (Indigo)

  const getDescription = () => {
    if (label.includes("AI")) {
      return "Calculates structural predictability. AI risk can be high even if content is original if writing patterns are robotic.";
    }
    return "Calculates direct alignment with global document libraries and web archives.";
  };

  return (
    <div className="relative group bg-slate-50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 flex flex-col items-center justify-between transition-all duration-300 hover:shadow-lg">
      
      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-4 right-4 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors z-20"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {showInfo && (
        <div className="absolute inset-2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center animate-in zoom-in duration-200 shadow-2xl">
           <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
           <h4 className="text-xs font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter font-heading">{label} Logic</h4>
           <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
             {getDescription()}
           </p>
        </div>
      )}

      <div className="w-28 h-28 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart>
              <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="75%"
                  outerRadius="95%"
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={true}
                  animationDuration={1500}
              >
                  <Cell key="score" fill={color} />
                  <Cell key="empty" fill="currentColor" className="text-slate-200 dark:text-slate-800" />
              </Pie>
              </PieChart>
          </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter font-heading">{safeScore}%</span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
          <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</span>
          <div className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${safeScore < 15 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100' : safeScore < 50 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border-rose-100'}`}>
            {safeScore < 15 ? 'Sovereign' : safeScore < 50 ? 'Moderate' : 'Critical'}
          </div>
      </div>
    </div>
  );
};

export default ScoreGauge;
