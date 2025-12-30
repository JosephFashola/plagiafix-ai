
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { HelpCircle, X, Info } from 'lucide-react';

interface ScoreGaugeProps {
  score: number; // 0 to 100
  label: string;
  history?: number[];
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, history = [] }) => {
  const [showInfo, setShowInfo] = useState(false);

  const safeScore = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  
  const data = [
    { name: 'Score', value: safeScore },
    { name: 'Remaining', value: 100 - safeScore },
  ];

  let color = '#ef4444'; // High Risk
  if (safeScore < 40) color = '#f59e0b'; // Medium
  if (safeScore < 15) color = '#10b981'; // Low
  if (safeScore < 5) color = '#4f46e5'; // Institutional

  const trendData = history ? history.map((val, idx) => ({ 
    index: idx + 1, 
    value: isNaN(val) ? 0 : val 
  })) : [];

  return (
    <div className="relative group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none flex flex-col items-center justify-between min-h-[320px] hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all duration-300">
      
      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-6 right-6 text-slate-300 dark:text-slate-700 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
      >
        <Info className="w-5 h-5" />
      </button>

      {showInfo && (
        <div className="absolute inset-4 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center animate-in zoom-in duration-200 shadow-2xl">
           <button onClick={() => setShowInfo(false)} className="absolute top-6 right-6 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
           <h4 className="text-lg font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter font-heading">Writing Score</h4>
           <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
             This score shows how much of your writing looks like AI or matches other sources. A lower score means your work is safer and more original.
           </p>
           <div className="mt-6 w-full h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full"></div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center w-full">
        <div className="w-32 h-32 relative">
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
                >
                    <Cell key="score" fill={color} />
                    <Cell key="empty" fill="currentColor" className="text-slate-100 dark:text-slate-800" />
                </Pie>
                </PieChart>
            </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter font-heading">{safeScore}%</span>
          </div>
        </div>
        
        <div className="mt-6 text-center">
            <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${safeScore < 5 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : safeScore < 20 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
              {safeScore < 5 ? 'Perfectly Human' : safeScore < 20 ? 'Safe' : safeScore < 50 ? 'Medium Risk' : 'High Risk'}
            </span>
        </div>
      </div>

      {trendData.length > 1 && (
        <div className="w-full mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
            <div className="w-full h-12">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#scoreColor)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
};

export default ScoreGauge;
