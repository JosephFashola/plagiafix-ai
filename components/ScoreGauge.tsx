import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface ScoreGaugeProps {
  score: number; // 0 to 100 (plagiarism score)
  label: string;
  history?: number[];
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, history = [] }) => {
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
    <div className="flex flex-col items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-200 h-full min-w-[200px]">
      <div className="flex flex-col items-center justify-center flex-grow w-full">
        {/* Strictly fixed dimensions for the Gauge to prevent 0-width errors */}
        <div style={{ width: 128, height: 128, position: 'relative' }}>
            <PieChart width={128} height={128}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell key="score" fill={color} />
                <Cell key="empty" fill={emptyColor} />
              </Pie>
            </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-800">{score}%</span>
          </div>
        </div>
        <span className="mt-2 text-sm font-medium text-slate-500">{label}</span>
        <div className="mt-1 text-xs text-slate-400">
          {score < 5 ? 'Excellent' : score < 20 ? 'Good' : score < 50 ? 'Moderate' : 'High Risk'}
        </div>
      </div>

      {showTrend && (
        <div className="w-full mt-4 border-t border-slate-100 pt-2 flex flex-col">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 text-center">Score Improvement</p>
            {/* Explicit height definition for the chart container */}
            <div style={{ width: '100%', height: 60 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ fontSize: '12px', padding: '4px', borderRadius: '4px' }}
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