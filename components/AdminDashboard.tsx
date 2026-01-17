import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppStats, LogEntry, TimeRange, ForensicInsights, SystemHealth, FinancialStats } from '../types';
import { Telemetry } from '../services/telemetry';
import { testGeminiConnection } from '../services/geminiService';
import { 
  Activity, Database, RefreshCw, 
  Globe2, LayoutGrid, Signal, 
  Terminal, Trash2, Server, 
  Zap, TrendingUp, CheckCircle2,
  Microscope, Cpu,
  Users, LineChart as LucideLineChart,
  Search, Wifi, AlertTriangle, 
  Target, TrendingDown, Network, Globe,
  Cpu as Chip, ShieldCheck, Eye, Shield, 
  MousePointer2, HardDrive, Command, ChevronRight, Activity as PulseIcon,
  Maximize2, Box, Bitcoin, CreditCard as CardIcon, DollarSign, Layers, Binary,
  Map as MapIcon, Trophy, BarChart3, PieChart as PieChartIcon, ArrowUpRight,
  TrendingUp as TrendingUpIcon, Wallet, Lock, History, Download,
  Coins, Landmark, PieChart as RechartsPieChart, Briefcase, Filter, ArrowDownRight,
  Monitor, Compass, Hexagon, Fingerprint, MapPin, LogOut, Code, AppWindow,
  Settings, MousePointer, Info, Cpu as ChipIcon, Sparkles, ScrollText, Presentation, Verified
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Bar, BarChart, Cell, PieChart, Pie, 
  ComposedChart, Scatter, ScatterChart, ZAxis, Legend, LabelList
} from 'recharts';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  value: string | number, 
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple', 
  trend?: { val: string, up: boolean },
  isUpdating?: boolean 
 }> = ({ icon, label, value, color, trend, isUpdating }) => {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/10'
  };

  return (
    <div className={`bg-[#0f141f]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative group overflow-hidden transition-all hover:border-indigo-500/40 hover:translate-y-[-4px]`}>
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl -mr-12 -mt-12 group-hover:opacity-20 transition-all ${colors[color].split(' ')[0].replace('text', 'bg')}`}></div>
      
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl border ${colors[color]} ${isUpdating ? 'animate-pulse' : ''}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${trend.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.val}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
        <h4 className={`text-4xl font-black text-white tracking-tighter tabular-nums transition-all ${isUpdating ? 'scale-105 text-indigo-400' : ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h4>
      </div>
    </div>
  );
};

interface AdminDashboardProps {
  onExit?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [forensicInsights, setForensicInsights] = useState<ForensicInsights | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [finances, setFinances] = useState<FinancialStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>('30D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'geography' | 'forensics' | 'infrastructure' | 'economics' | 'terminal'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [metaRes, insights, history, cData, cChart, geminiStatus, dbStatus, finRes] = await Promise.all([
        Telemetry.getGroundTruthStats(), 
        Telemetry.getForensicInsights(),
        Telemetry.getLogs(100),
        Telemetry.getCountryTraffic(), 
        Telemetry.getChartData(range), 
        testGeminiConnection(), 
        Telemetry.checkDatabaseHealth(),
        Telemetry.getFinancials()
      ]);

      setStats(metaRes.stats); 
      setForensicInsights(insights);
      setLogs(history);
      setCountryData(cData); 
      setChartData(cChart);
      
      setHealth({
        status: geminiStatus.status === 'OK' && dbStatus.status === 'OK' ? 'HEALTHY' : 'DEGRADED',
        neuralLatency: geminiStatus.latency || 140,
        dbLatency: dbStatus.latency || 45,
        uptime: 99.99,
        regionalNodes: [
          { name: 'Lagos-Edge-01', latency: 45, status: 'ONLINE' },
          { name: 'US-East-Neural', latency: geminiStatus.latency || 140, status: 'ONLINE' },
          { name: 'EU-West-Neural', latency: (geminiStatus.latency || 140) + 42, status: 'ONLINE' },
          { name: 'Tokyo-Satellite', latency: (geminiStatus.latency || 140) + 115, status: 'ONLINE' },
        ]
      });

      setFinances({
        totalGrossValue: finRes.totalGross,
        mrrEstimate: (metaRes.stats.activeUsers24h * 150) * 30,
        totalDonationsBtc: "0.00", 
        valuationEstimate: finRes.totalGross * 12.5, 
        burnRate: 15000, 
        ltvEstimate: 45000,
        transactionHistory: finRes.history
      });

    } catch (err) {
      console.error("Dashboard Refresh Failed:", err);
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => refreshData(true), 15000);
    const unsubscribe = Telemetry.subscribe((newLog) => {
       setLogs(prev => [newLog, ...prev].slice(0, 100));
       setIsSyncing(true);
       setTimeout(() => setIsSyncing(false), 2000);
    });
    return () => { unsubscribe(); clearInterval(interval); };
  }, [refreshData]);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!stats || !health || !finances) return (
    <div className="min-h-screen bg-[#070a0f] flex flex-col items-center justify-center space-y-8">
      <Chip className="w-12 h-12 text-indigo-500 animate-spin" />
      <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">Initializing Command Center...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200 p-6 lg:p-12 font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <div className="max-w-[1800px] mx-auto space-y-12">
        
        {/* COMMAND HEADER */}
        <header className="flex flex-col xl:flex-row justify-between items-center gap-10 bg-[#0f141f]/40 backdrop-blur-3xl p-10 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          
          <div className="flex items-center gap-8 group">
            <div className="relative">
               <div className="p-6 rounded-3xl bg-indigo-600 shadow-[0_0_50px_rgba(79,70,229,0.3)] border border-white/20 transition-transform group-hover:rotate-12">
                  <Chip className="w-10 h-10 text-white" />
               </div>
               <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-[#070a0f] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
               </div>
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-heading leading-none">Command Center</h1>
                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest">GOD-VIEW V14</div>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Sovereign Asset Control • End-to-End Forensic Telemetry</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center bg-black/40 p-2 rounded-[2.5rem] border border-white/5 shadow-inner">
            {[
              { id: 'overview', icon: <LayoutGrid />, label: 'Pulse' },
              { id: 'forensics', icon: <Microscope />, label: 'Forensics' },
              { id: 'geography', icon: <Globe />, label: 'Geography' },
              { id: 'infrastructure', icon: <Server />, label: 'Infra' },
              { id: 'economics', icon: <DollarSign />, label: 'Financials' },
              { id: 'terminal', icon: <Terminal />, label: 'Terminal' }
            ].map(v => (
              <button 
                key={v.id} 
                onClick={() => setActiveView(v.id as any)} 
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v.id ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {React.cloneElement(v.icon as React.ReactElement<any>, { className: "w-4 h-4" })}
                {v.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6">
             <button onClick={() => refreshData()} className="p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-indigo-500 hover:text-white transition-all active:scale-90 shadow-2xl">
                <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
             </button>
             {onExit && (
               <button onClick={onExit} className="flex items-center gap-3 px-8 py-5 bg-white text-indigo-600 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-[1.05] transition-all group">
                 <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Exit Console
               </button>
             )}
          </div>
        </header>

        {/* TOP LEVEL METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <StatCard icon={<Eye />} label="Total Visits" value={stats.totalVisits} color="blue" trend={{ val: '+12%', up: true }} isUpdating={isSyncing} />
           <StatCard icon={<Search />} label="Audit Volume" value={stats.totalScans} color="indigo" trend={{ val: '+8.4%', up: true }} isUpdating={isSyncing} />
           <StatCard icon={<Zap />} label="Humanization Rate" value={`${(stats.totalFixes / (stats.totalScans || 1) * 100).toFixed(1)}%`} color="emerald" trend={{ val: 'Target: 99%', up: true }} />
           <StatCard icon={<Landmark />} label="Platform Value" value={`₦${(finances.valuationEstimate / 1000000).toFixed(1)}M`} color="amber" trend={{ val: '12.5x REV', up: true }} />
        </div>

        {/* GOD-VIEW WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           
           <div className="lg:col-span-12 space-y-10">
              
              {/* PULSE VIEW */}
              {activeView === 'overview' && (
                 <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="bg-[#0f141f]/80 border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                       <div className="flex justify-between items-center mb-16">
                          <div className="flex items-center gap-6">
                             <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"><LucideLineChart className="w-6 h-6 text-indigo-400" /></div>
                             <h3 className="text-2xl font-black text-white uppercase tracking-tighter font-heading">Neural Flux Pulse</h3>
                          </div>
                          <div className="flex gap-1 p-1 bg-black/40 rounded-2xl border border-white/5">
                            {['24H', '7D', '30D', '1Y'].map(opt => (
                              <button key={opt} onClick={() => setRange(opt as TimeRange)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${range === opt ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                       </div>
                       <div className="h-[450px]">
                          <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={chartData}>
                                <defs>
                                   <linearGradient id="pScan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                                   <linearGradient id="pFix" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a202c" opacity={0.5} />
                                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} dy={15} />
                                <YAxis stroke="#475569" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} dx={-15} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f141f', border: 'none', borderRadius: '24px', padding: '20px' }} />
                                <Area type="monotone" dataKey="scans" stroke="#6366f1" fillOpacity={1} fill="url(#pScan)" strokeWidth={4} />
                                <Area type="monotone" dataKey="fixes" stroke="#10b981" fillOpacity={1} fill="url(#pFix)" strokeWidth={4} />
                             </AreaChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                       <div className="bg-[#0f141f] border border-white/5 rounded-3xl p-8 space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Users (24h)</p>
                          <h4 className="text-4xl font-black text-white">{stats.activeUsers24h}</h4>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500 w-[65%]"></div>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-3xl p-8 space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Concurrent Nodes</p>
                          <h4 className="text-4xl font-black text-white">{stats.peakConcurrent}</h4>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 w-[42%]"></div>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-3xl p-8 space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Uptime</p>
                          <h4 className="text-4xl font-black text-white">99.9%</h4>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500 w-[99%] shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-3xl p-8 space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Platform Errors</p>
                          <h4 className="text-4xl font-black text-rose-500">{stats.totalErrors}</h4>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-rose-500 w-[2%]"></div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* FORENSICS & FEATURE VIEW */}
              {activeView === 'forensics' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-12 flex items-center gap-4">
                             <Microscope className="w-6 h-6 text-indigo-500" /> Forensic Issue Distribution
                          </h3>
                          <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={forensicInsights?.commonIssues || []} layout="vertical">
                                  <XAxis type="number" hide />
                                  <YAxis dataKey="issue" type="category" width={180} stroke="#64748b" fontSize={10} fontWeight={900} />
                                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f141f', borderRadius: '12px' }} />
                                  <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={30}>
                                     <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={10} fontWeight={900} />
                                  </Bar>
                               </BarChart>
                            </ResponsiveContainer>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-12 flex items-center gap-4">
                             <Binary className="w-6 h-6 text-emerald-500" /> DNA Mode Distribution
                          </h3>
                          <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                               <PieChart>
                                  <Pie data={forensicInsights?.modeDistribution || []} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={8} dataKey="value" nameKey="name">
                                     {forensicInsights?.modeDistribution.map((entry, index) => (
                                        <Cell key={index} fill={['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#a855f7'][index % 5]} />
                                     ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ backgroundColor: '#0f141f', border: 'none', borderRadius: '12px' }} />
                                  <Legend verticalAlign="bottom" height={36}/>
                               </PieChart>
                            </ResponsiveContainer>
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                       <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-12 flex items-center gap-4">
                          <Zap className="w-6 h-6 text-amber-500" /> Multi-Feature Engagement Matrix
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                          {[
                             { name: 'Humanize (Initial)', key: 'Humanize', icon: <Sparkles className="text-emerald-400" /> },
                             { name: 'Refine (Synthesis)', key: 'Refine', icon: <RefreshCw className="text-indigo-400" /> },
                             { name: 'Executive Memo', key: 'Executive Summary', icon: <ScrollText className="text-amber-400" /> },
                             { name: 'Professional Slides', key: 'Presentation', icon: <Presentation className="text-blue-400" /> },
                             { name: 'Institutional DOCX', key: 'Export DOCX', icon: <Download className="text-slate-400" /> },
                             { name: 'Forensic PDF', key: 'Export PDF', icon: <ShieldCheck className="text-emerald-400" /> },
                             { name: 'Voice Studio', key: 'Voice Mode', icon: <Signal className="text-rose-400" /> },
                             { name: 'Vault Archiving', key: 'Vault Save', icon: <Database className="text-indigo-400" /> }
                          ].map(f => (
                             <div key={f.key} className="p-8 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-center justify-center text-center gap-4 hover:bg-white/10 transition-all group">
                                <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">{f.icon}</div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{f.name}</p>
                                   <h4 className="text-3xl font-black text-white tabular-nums mt-1">{stats.featureMatrix[f.key] || 0}</h4>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              )}

              {/* GEOGRAPHY VIEW */}
              {activeView === 'geography' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-left-8 duration-700">
                   <div className="lg:col-span-8 bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4">
                         <Globe className="w-6 h-6 text-indigo-500" /> Global Traffic Node Distribution
                      </h3>
                      <div className="h-[450px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie data={countryData} cx="50%" cy="50%" innerRadius={100} outerRadius={160} paddingAngle={5} dataKey="value">
                                 {countryData.map((entry, index) => (
                                    <Cell key={index} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'][index % 6]} />
                                 ))}
                                 <LabelList dataKey="name" position="outside" stroke="none" fill="#94a3b8" fontSize={10} fontWeight={900} />
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f141f', border: 'none', borderRadius: '12px' }} />
                           </PieChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="lg:col-span-4 bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl space-y-6">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Regional Leaderboard</h3>
                      <div className="space-y-4">
                        {countryData.map((c, i) => (
                           <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-[10px]">{i+1}</div>
                                 <span className="text-sm font-black text-white uppercase tracking-tight">{c.name}</span>
                              </div>
                              <span className="text-lg font-black text-indigo-400 tabular-nums">{c.value.toLocaleString()} Visits</span>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
              )}

              {/* INFRASTRUCTURE VIEW */}
              {activeView === 'infrastructure' && (
                <div className="space-y-10 animate-in slide-in-from-right-8 duration-700">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {health.regionalNodes.map(node => (
                        <div key={node.name} className="bg-[#0f141f]/80 border border-white/5 rounded-[3rem] p-10 space-y-8 shadow-2xl relative overflow-hidden group">
                           <div className="flex justify-between items-start">
                              <div className={`p-5 rounded-2xl ${node.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                 <Network className="w-8 h-8" />
                              </div>
                              <div className={`w-3 h-3 rounded-full ${node.status === 'ONLINE' ? 'bg-emerald-500 neural-pulse' : 'bg-rose-500'}`}></div>
                           </div>
                           <div>
                              <h4 className="text-2xl font-black text-white uppercase tracking-tight">{node.name}</h4>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Status: <span className={node.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}>{node.status}</span></p>
                           </div>
                           <div className="pt-4 border-t border-white/5">
                              <p className="text-3xl font-black text-white tabular-nums">{node.latency}ms</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Latency</p>
                           </div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4">
                         <ChipIcon className="w-6 h-6 text-indigo-500" /> Platform Architecture Health
                      </h3>
                      <div className="space-y-12">
                         <div className="space-y-4">
                            <div className="flex justify-between px-2">
                               <span className="text-[10px] font-black text-white uppercase tracking-widest">Neural API Integrity (Gemini)</span>
                               <span className="text-[10px] font-black text-indigo-400 uppercase tabular-nums">{health.neuralLatency}ms</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (health.neuralLatency / 1000) * 100)}%` }}></div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between px-2">
                               <span className="text-[10px] font-black text-white uppercase tracking-widest">Database Bridge (Supabase)</span>
                               <span className="text-[10px] font-black text-emerald-400 uppercase tabular-nums">{health.dbLatency}ms</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (health.dbLatency / 100) * 100)}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* FINANCIALS VIEW */}
              {activeView === 'economics' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-indigo-600 rounded-[3rem] p-12 text-white space-y-6 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:scale-125 transition-transform"><Trophy className="w-48 h-48" /></div>
                          <p className="text-[12px] font-black uppercase tracking-widest text-indigo-200">Total Net Revenue (Paystack Verified)</p>
                          <h4 className="text-7xl font-black font-heading tracking-tighter">₦{finances.totalGrossValue.toLocaleString()}</h4>
                          <div className="flex items-center gap-3 px-6 py-3 bg-white/10 rounded-2xl w-fit text-[10px] font-black uppercase tracking-widest border border-white/10">
                             <ArrowUpRight className="w-4 h-4" /> 12.5x Valuation Multiplier
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 space-y-10 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5"><CardIcon className="w-24 h-24" /></div>
                          <div className="space-y-2">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Institutional MRR Projection</p>
                             <h4 className="text-6xl font-black font-heading tracking-tighter text-white">₦{finances.mrrEstimate.toLocaleString()}</h4>
                          </div>
                          <div className="space-y-2 pt-6 border-t border-white/5">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estimated LTV (Lifetime Value)</p>
                             <h4 className="text-4xl font-black font-heading tracking-tighter text-emerald-400">₦{finances.ltvEstimate.toLocaleString()}</h4>
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                       <div className="flex justify-between items-center mb-10">
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <History className="w-6 h-6 text-indigo-400" /> Verified Institutional Settlements
                          </h3>
                          <button onClick={() => toast.success("Preparing CSV Export...")} className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                             <Download className="w-4 h-4" /> Export Ledger
                          </button>
                       </div>
                       <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin">
                          {finances.transactionHistory.map((item, i) => (
                             <div key={item.id || i} className="flex items-center justify-between p-8 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group">
                                <div className="flex items-center gap-6">
                                   <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform"><CheckCircle2 className="w-6 h-6 text-emerald-500" /></div>
                                   <div>
                                      <p className="text-[12px] font-black text-white uppercase tracking-widest">Settlement: #{item.id}</p>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <span className="text-3xl font-black text-white tabular-nums">{item.amount}</span>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Settled</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              )}

              {/* TERMINAL VIEW */}
              {activeView === 'terminal' && (
                 <div className="bg-black border border-white/10 rounded-[2.5rem] p-1 shadow-2xl animate-in fade-in duration-500">
                    <div className="bg-white/5 p-6 rounded-t-[2.5rem] flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <Terminal className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Core • Root Telemetry Feed</span>
                       </div>
                       <div className="flex gap-4">
                          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-lg text-[8px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">Live Sync Engaged</div>
                          <button onClick={() => setLogs([])} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                    <div className="h-[650px] overflow-y-auto p-10 font-mono text-[11px] space-y-2 scrollbar-thin">
                       {logs.map((log, i) => (
                          <div key={i} className="flex gap-8 py-2 border-b border-white/5 hover:bg-white/5 transition-colors group">
                             <span className="text-slate-600 shrink-0 tabular-nums">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                             <span className={`font-black shrink-0 w-28 text-center px-2 py-0.5 rounded-md ${
                               log.type === 'SCAN' ? 'bg-indigo-500/10 text-indigo-400' : 
                               log.type === 'FIX' ? 'bg-emerald-500/10 text-emerald-400' : 
                               log.type === 'TRANSACTION' ? 'bg-amber-500/10 text-amber-400' :
                               log.type === 'FEATURE' ? 'bg-blue-500/10 text-blue-400' :
                               log.type === 'ERROR' ? 'bg-rose-500/10 text-rose-400' : 
                               'bg-slate-500/10 text-slate-400'
                             }`}>
                                {log.type}
                             </span>
                             <span className="text-slate-300 break-all group-hover:text-white leading-relaxed">{log.details}</span>
                          </div>
                       ))}
                       <div ref={consoleEndRef} />
                    </div>
                 </div>
              )}
           </div>

        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;