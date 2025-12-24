
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AppStats, LogEntry, TimeRange, LogType } from '../types';
import { Telemetry } from '../services/telemetry';
import { testGeminiConnection } from '../services/geminiService';
import { 
  Activity, Users, Database, RefreshCw, 
  Globe2, BarChart4, LayoutGrid, MapPin, 
  ShieldCheck, HeartPulse, Signal, 
  Search, Terminal, Trash2, PlayCircle, Server, 
  WifiOff, Copy, AlertCircle, Zap, History, TrendingUp
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import toast from 'react-hot-toast';

const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
  'DE': 'Germany', 'FR': 'France', 'IN': 'India', 'JP': 'Japan', 'CN': 'China',
  'BR': 'Brazil', 'ZA': 'South Africa', 'NG': 'Nigeria', 'SG': 'Singapore', 'Unknown': 'Unknown Origin'
};

const StatCard: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  value: string | number, 
  color: string 
}> = ({ icon, label, value, color }) => (
  <div className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl relative group overflow-hidden transition-all hover:border-indigo-500/40">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 blur-3xl -mr-8 -mt-8 group-hover:bg-${color}-500/20 transition-all`}></div>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-slate-800/50 text-${color}-400 border border-white/5`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5" })}
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
    <h4 className="text-3xl font-black text-white mt-1 tracking-tighter">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </h4>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [dbInventory, setDbInventory] = useState<{ totalRows: number, typeBreakdown: Record<string, number>, error?: any }>({ totalRows: 0, typeBreakdown: {} });
  const [rawSample, setRawSample] = useState<{ data: any[], error?: any }>({ data: [] });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>('30D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [health, setHealth] = useState<{ gemini: 'OK' | 'ERROR', db: 'OK' | 'ERROR' | 'RLS_RESTRICTED', geminiLatency: number, dbLatency: number, errorMsg?: string, errorObj?: any } | null>(null);
  const [activeViewVal, setActiveView] = useState<'overview' | 'health' | 'geography'>('overview');

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [metaRes, inventoryRes, sampleRes, history, cData, cChart, geminiStatus, dbStatus] = await Promise.all([
        Telemetry.getGroundTruthStats(),
        Telemetry.getDatabaseInventory(),
        Telemetry.getRawSample(),
        Telemetry.getLogs(300),
        Telemetry.getCountryTraffic(),
        Telemetry.getChartData(range),
        testGeminiConnection(),
        Telemetry.checkDatabaseHealth()
      ]);

      setStats(metaRes.stats);
      setDbInventory(inventoryRes);
      setRawSample(sampleRes);
      setLogs(history);
      setCountryData(cData);
      setChartData(cChart);
      setHealth({
        gemini: geminiStatus.status,
        db: dbStatus.status,
        geminiLatency: geminiStatus.latency,
        dbLatency: dbStatus.latency,
        errorMsg: dbStatus.errorObj?.message || metaRes.error?.message,
        errorObj: dbStatus.errorObj || metaRes.error
      });

      if (dbStatus.status === 'ERROR' || inventoryRes.error) {
          toast.error(`Bridge Alert: ${dbStatus.errorObj?.message || 'Sync Failure'}`);
      }
    } catch (e: any) {
      toast.error("Telemetry link sync failed.");
    } finally {
      setIsRefreshing(false);
    }
  }, [range]);

  const handleSeed = async () => {
      await Telemetry.seedDemoData();
      await refreshData();
      toast.success("Historical data seeded.");
  };

  const handleClear = async () => {
      if (!confirm("Wipe all live data?")) return;
      await Telemetry.clearLogs();
      await refreshData();
      toast.success("Database Purged.");
  };

  const copySql = () => {
      const sql = `-- RUN IN SUPABASE SQL EDITOR\nCREATE TABLE IF NOT EXISTS public.plagiafix_logs (id bigint generated always as identity primary key, created_at timestamp with time zone default now(), type text, details text);\nALTER TABLE public.plagiafix_logs ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Enable all" ON public.plagiafix_logs FOR ALL USING (true);`;
      navigator.clipboard.writeText(sql);
      toast.success("SQL Copied!");
  };

  useEffect(() => {
    refreshData();
    const sub = Telemetry.subscribe(() => refreshData());
    return () => sub();
  }, [refreshData]);

  if (!stats) return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1700px] mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-[#111827]/50 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${health?.db === 'OK' ? 'bg-indigo-600' : 'bg-rose-600 animate-pulse'}`}>
              <Server className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter">Command Center</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                State: <span className={dbInventory.totalRows > 0 ? "text-emerald-400" : "text-rose-400"}>
                  {dbInventory.totalRows > 0 ? `${dbInventory.totalRows} Entries` : 'Database Empty / Locked'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
              {[
                { id: 'overview', icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Overview' },
                { id: 'health', icon: <HeartPulse className="w-3.5 h-3.5" />, label: 'Sync Health' },
                { id: 'geography', icon: <Globe2 className="w-3.5 h-3.5" />, label: 'Geography' }
              ].map(v => (
                <button 
                  key={v.id}
                  onClick={() => setActiveView(v.id as any)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeViewVal === v.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
            </div>
            <button onClick={refreshData} className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white hover:bg-white/10 transition-all">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Database />} label="Logs" value={dbInventory.totalRows} color="blue" />
          <StatCard icon={<Activity />} label="Scans" value={stats.totalScans} color="indigo" />
          <StatCard icon={<Zap />} label="Fixes" value={stats.totalFixes} color="purple" />
          <StatCard icon={<Users />} label="Visits" value={stats.totalVisits} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {activeViewVal === 'overview' && (
              <div className="bg-[#111827]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 h-[550px] shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-indigo-400" /> Activity Throughput
                  </h3>
                  <select value={range} onChange={(e) => setRange(e.target.value as any)} className="bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-400 outline-none hover:border-indigo-500 transition-all">
                    <option value="7D">7 Days</option>
                    <option value="30D">30 Days</option>
                  </select>
                </div>
                <div className="h-[400px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="pScans" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #ffffff10', color: '#fff', borderRadius: '12px' }} />
                        <Area type="monotone" dataKey="scans" stroke="#6366f1" fill="url(#pScans)" strokeWidth={4} />
                        <Area type="monotone" dataKey="fixes" stroke="#a855f7" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 uppercase font-black text-xs gap-4">
                      <AlertCircle className="w-10 h-10 opacity-20" />
                      No History Data
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeViewVal === 'health' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-right duration-500">
                <div className="bg-[#111827]/80 border border-white/5 rounded-[2.5rem] p-10 space-y-6 shadow-2xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Signal className="w-5 h-5 text-indigo-400" /> Sync Health
                  </h3>
                  <div className="p-6 bg-slate-900 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase">Bridge Diagnostics</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      If traffic is zero, Row Level Security (RLS) is likely missing a "Public Select" rule.
                    </p>
                    <button onClick={copySql} className="w-full py-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                      Copy SQL Setup Script
                    </button>
                  </div>
                  <div className="p-6 bg-slate-900 rounded-2xl border border-white/5">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">Supabase Response</h4>
                    <div className="text-[10px] font-mono text-rose-400 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 overflow-hidden">
                      {health?.errorObj?.message || 'Physical connection is healthy.'}
                    </div>
                  </div>
                </div>
                <div className="bg-[#111827]/80 border border-white/5 rounded-[2.5rem] p-10 space-y-6 shadow-2xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-emerald-400" /> Raw Packet Log
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-none font-mono">
                    {rawSample.data.map((s, i) => (
                      <div key={i} className="p-4 bg-slate-900 border border-white/5 rounded-xl text-[10px]">
                        <div className="text-indigo-400 font-black mb-1">{s.type} | {new Date(s.created_at).toLocaleTimeString()}</div>
                        <div className="text-slate-500 truncate">{s.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {activeViewVal === 'geography' && (
              <div className="space-y-8 animate-in slide-in-from-left duration-500">
                <div className="bg-[#111827]/80 border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      <Globe2 className="w-6 h-6 text-rose-500" /> Regional Traffic Distribution
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="h-[300px]">
                      {countryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={countryData} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={10} width={100} tickFormatter={(val) => COUNTRY_NAMES[val] || val} />
                            <Tooltip 
                              cursor={{fill: 'transparent'}}
                              contentStyle={{ backgroundColor: '#111827', border: '1px solid #ffffff10', borderRadius: '12px' }}
                              formatter={(value) => [value, 'Sessions']}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {countryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#4f46e580'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-widest italic opacity-30">
                          Awaiting geo-coordinates...
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {countryData.slice(0, 4).map((c, i) => (
                        <div key={i} className="p-6 bg-slate-900 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center transition-all hover:bg-white/5">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{COUNTRY_NAMES[c.name] || c.name}</span>
                           <h4 className="text-3xl font-black text-white">{c.value}</h4>
                           <div className="w-8 h-1 bg-indigo-600 rounded-full mt-2"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#111827]/80 border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                   <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                     <History className="w-4 h-4 text-indigo-400" /> Geo-Forensic History
                   </h3>
                   <div className="space-y-3">
                     {logs.filter(l => l.type === 'VISIT').slice(0, 10).map((log, i) => {
                       const countryMatch = log.details.match(/\[([A-Z]{2})\]/);
                       const code = countryMatch ? countryMatch[1] : '??';
                       return (
                         <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 font-black text-xs">
                                 {code}
                               </div>
                               <div>
                                 <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{COUNTRY_NAMES[code] || 'Unknown Location'}</h4>
                                 <p className="text-[10px] text-slate-500 font-mono">Session Origin • Forensic Verified</p>
                               </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-600 uppercase">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                         </div>
                       );
                     })}
                     {logs.filter(l => l.type === 'VISIT').length === 0 && (
                        <div className="py-20 text-center opacity-20 italic text-sm">No recorded geo-hits in session cache.</div>
                     )}
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-[#111827]/80 border border-white/5 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" /> Forensic Feed
                </h3>
                <div className="flex gap-2">
                  <button onClick={handleSeed} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all" title="Seed History"><PlayCircle className="w-4 h-4"/></button>
                  <button onClick={handleClear} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-all" title="Wipe Data"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[850px] scrollbar-none">
                {logs.map((log, i) => (
                  <div key={i} className="p-5 bg-slate-900/30 border border-white/5 rounded-3xl transition-all hover:bg-white/5 group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${log.type === 'SCAN' ? 'bg-indigo-500/10 text-indigo-400' : log.type === 'FIX' ? 'bg-purple-500/10 text-purple-400' : log.type === 'VISIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {log.type}
                        </span>
                        {log.type === 'VISIT' && log.details.match(/\[([A-Z]{2})\]/) && (
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest border border-white/5 px-2 py-1 rounded">
                            {log.details.match(/\[([A-Z]{2})\]/)?.[1]}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
                        {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
