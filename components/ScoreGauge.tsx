
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { HelpCircle, X } from 'lucide-react';

interface ScoreGaugeProps {
  score: number; // 0 to 100 (plagiarism score)
  label: string;
  history?: number[];
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, history = [] }) => {
  const [showInfo, setShowInfo] = useState(false);

  // Score is plagiarism. 
  // High Plagiarism = Bad (Red). Low Plagiarism = Good (Green).
  
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  let color = '#ef4444'; // Red
  if (score < 50) color = '#f59e0b'; // Orange
  if (score < 20) color = '#10b981'; // Green
  if (score < 5) color = '#3b82f6'; // Blue (Excellent)

  const emptyColor = '#e2e8f0';

  const showTrend = history && history.length > 1;
  const trendData = history ? history.map((val, idx) => ({ index: idx + 1, value: val })) : [];

  return (
    <div className="relative flex flex-col items-center justify-between p-3 sm:p-4 bg-white rounded-2xl sm:rounded-xl shadow-sm border border-slate-200 h-full min-w-[140px] sm:min-w-[200px]">
      
      {/* Info Icon */}
      <button 
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 text-slate-300 hover:text-indigo-500 transition-colors z-20"
      >
        <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {/* Info Popover */}
      {showInfo && (
        <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm p-4 rounded-xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-200">
           <button 
             onClick={() => setShowInfo(false)}
             className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
           >
             <X className="w-4 h-4" />
           </button>
           <h4 className="text-[11px] sm:text-sm font-bold text-slate-800 mb-1 sm:mb-2">Composite Risk</h4>
           <p className="text-[9px] sm:text-xs text-slate-600 leading-relaxed">
             Likelihood of text being flagged as <strong>AI</strong> or <strong>Plagiarized</strong>.
           </p>
           <div className="mt-2 sm:mt-3 w-full h-1 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full"></div>
           <div className="flex justify-between w-full text-[8px] sm:text-[10px] text-slate-400 mt-1 font-bold uppercase">
             <span>Safe</span>
             <span>Risky</span>
           </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center flex-grow w-full min-w-0">
        <div className="w-24 h-24 sm:w-32 sm:h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="90%"
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                >
                    <Cell key="score" fill={color} />
                    <Cell key="empty" fill={emptyColor} />
                </Pie>
                </PieChart>
            </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tighter">{score}%</span>
          </div>
        </div>
        <span className="mt-1 sm:mt-2 text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <div className="text-[8px] sm:text-xs text-slate-400 font-bold uppercase">
          {score < 5 ? 'Excellent' : score < 20 ? 'Good' : score < 50 ? 'Moderate' : 'High Risk'}
        </div>
      </div>

      {showTrend && (
        <div className="w-full mt-3 sm:mt-4 border-t border-slate-100 pt-2 flex flex-col min-w-0">
            <p className="text-[7px] sm:text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 text-center">Score Delta</p>
            <div className="w-full h-10 sm:h-12 min-w-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ fontSize: '9px', padding: '4px', borderRadius: '4px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }}
                            itemStyle={{ padding: 0 }}
                            formatter={(value: number) => [`${value}%`, 'Score']}
                        />
                        <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      )}
    </div>
  );
};

export default ScoreGauge;
