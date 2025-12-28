import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { RadarMetric } from '../types';

interface ForensicRadarProps {
  data: RadarMetric[];
}

const ForensicRadar: React.FC<ForensicRadarProps> = ({ data }) => {
  const displayData = data && data.length > 0 ? data : [
    { subject: 'Global Stealth', A: 85, fullMark: 100 },
    { subject: 'Entropy', A: 70, fullMark: 100 },
    { subject: 'Burstiness', A: 90, fullMark: 100 },
    { subject: 'Dialect Sync', A: 80, fullMark: 100 },
    { subject: 'Rhythm', A: 75, fullMark: 100 }
  ];

  return (
    <div className="w-full h-[400px] flex items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={displayData}>
          <PolarGrid stroke="#e2e8f0" strokeWidth={1} />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }} 
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          <Radar
            name="Forensic Level"
            dataKey="A"
            stroke="#4f46e5"
            strokeWidth={3}
            fill="#4f46e5"
            fillOpacity={0.12}
            isAnimationActive={true}
            animationDuration={2000}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForensicRadar;