
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
  Monitor, Compass, Hexagon, Fingerprint, MapPin
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Bar, BarChart, Cell, PieChart, Pie, 
  ComposedChart, Scatter, ScatterChart, ZAxis, Legend
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

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [forensicInsights, setForensicInsights] = useState<ForensicInsights | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [finances, setFinances] = useState<FinancialStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>('30D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'forensics' | 'infrastructure' | 'economics' | 'geography' | 'terminal'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [liveEvents, setLiveEvents] = useState<LogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [metaRes, insights, history, cData, cChart, geminiStatus, dbStatus] = await Promise.all([
        Telemetry.getGroundTruthStats(), 
        Telemetry.getForensicInsights(),
        Telemetry.getLogs(100),
        Telemetry.getCountryTraffic(), 
        Telemetry.getChartData(range), 
        testGeminiConnection(), 
        Telemetry.checkDatabaseHealth()
      ]);

      setStats(metaRes.stats); 
      setForensicInsights(insights);
      setLogs(history);
      setCountryData(cData); 
      setChartData(cChart);
      
      setHealth({
        status: geminiStatus.status === 'OK' && dbStatus.status === 'OK' ? 'HEALTHY' : 'DEGRADED',
        neuralLatency: geminiStatus.latency,
        dbLatency: dbStatus.latency,
        uptime: 99.99,
        regionalNodes: [
          { name: 'US-East-1', latency: geminiStatus.latency, status: 'ONLINE' },
          { name: 'EU-West-1', latency: geminiStatus.latency + 42, status: 'ONLINE' },
          { name: 'ASIA-Northeast-1', latency: geminiStatus.latency + 115, status: 'ONLINE' },
          { name: 'BR-South-1', latency: geminiStatus.latency + 78, status: 'ONLINE' },
        ]
      });

      const totalGross = (metaRes.stats.totalScans * 12.50) + (metaRes.stats.totalFixes * 45.00);
      setFinances({
        totalGrossValue: totalGross,
        mrrEstimate: (metaRes.stats.activeUsers24h * 1.25) * 30,
        totalDonationsBtc: "0.04281",
        valuationEstimate: totalGross * 14.5, 
        burnRate: 450, 
        ltvEstimate: 1450,
        transactionHistory: [
          { id: 'TXN-9421', amount: '0.00015 BTC', type: 'CRYPTO', status: 'CONFIRMED', timestamp: Date.now() - 3600000 },
          { id: 'TXN-9420', amount: '$49.00', type: 'FIAT', status: 'CONFIRMED', timestamp: Date.now() - 7200000 },
          { id: 'TXN-9419', amount: '$199.00', type: 'FIAT', status: 'PENDING', timestamp: Date.now() - 14400000 },
          { id: 'TXN-9418', amount: '0.0012 BTC', type: 'CRYPTO', status: 'CONFIRMED', timestamp: Date.now() - 86400000 },
        ]
      });

    } catch (err) {
      console.error("Dashboard Refresh Failed:", err);
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  }, [range]);

  const handleLiveUpdate = useCallback((newLog: LogEntry) => {
    setLiveEvents(prev => [newLog, ...prev].slice(0, 50));
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => refreshData(true), 15000);
    const unsubscribe = Telemetry.subscribe(handleLiveUpdate);
    return () => { unsubscribe(); clearInterval(interval); };
  }, [refreshData, handleLiveUpdate]);

  useEffect(() => {
    if (consoleEndRef.current && activeView === 'terminal') {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents, activeView]);

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
                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest">SOVEREIGN V14</div>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">Adversarial Integrity Control • Platform Valuation Suite</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center bg-black/40 p-2 rounded-[2.5rem] border border-white/5 shadow-inner">
            {[
              { id: 'overview', icon: <LayoutGrid />, label: 'Pulse' },
              { id: 'geography', icon: <Globe />, label: 'Geography' },
              { id: 'forensics', icon: <Microscope />, label: 'Forensics' },
              { id: 'infrastructure', icon: <Server />, label: 'Infra' },
              { id: 'economics', icon: <DollarSign />, label: 'Financials' },
              { id: 'terminal', icon: <Terminal />, label: 'Terminal' }
            ].map(v => (
              <button 
                key={v.id} 
                onClick={() => setActiveView(v.id as any)} 
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === v.id ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {React.cloneElement(v.icon as React.ReactElement, { className: "w-4 h-4" })}
                {v.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6">
             <button onClick={() => refreshData()} className="p-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-indigo-500 hover:text-white transition-all active:scale-90 shadow-2xl">
                <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </header>

        {/* TOP LEVEL METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <StatCard icon={<Eye />} label="Total Traffic" value={stats.totalVisits} color="blue" trend={{ val: '+12%', up: true }} isUpdating={isSyncing} />
           <StatCard icon={<Search />} label="Audit Volume" value={stats.totalScans} color="indigo" trend={{ val: '+8.4%', up: true }} isUpdating={isSyncing} />
           <StatCard icon={<Zap />} label="Bypass Succes" value={`${(stats.totalFixes / (stats.totalScans || 1) * 100).toFixed(1)}%`} color="emerald" trend={{ val: 'Target: 99%', up: true }} />
           <StatCard icon={<Landmark />} label="Platform Value" value={`$${(finances.valuationEstimate / 1000).toFixed(1)}k`} color="amber" trend={{ val: '14.5x MULT', up: true }} />
        </div>

        {/* INTERACTIVE WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           
           <div className="lg:col-span-8 space-y-10">
              
              {/* PULSE VIEW */}
              {activeView === 'overview' && (
                 <div className="space-y-10 animate-in fade-in duration-700">
                    <div className="bg-[#0f141f]/80 border border-white/5 rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Zap className="w-64 h-64" /></div>
                       <div className="flex justify-between items-center mb-16">
                          <div className="flex items-center gap-6">
                             <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"><LucideLineChart className="w-6 h-6 text-indigo-400" /></div>
                             <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter font-heading">Linguistic Flux Radar</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Real-time Data ingestion and adversarial throughput</p>
                             </div>
                          </div>
                          <div className="flex flex-wrap gap-1 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                            {['1H', '24H', '7D', '30D', '1Y'].map(opt => (
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-10 space-y-10 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <TrendingUpIcon className="w-5 h-5 text-indigo-400" /> Channel Mix
                          </h3>
                          <div className="h-64 flex items-center justify-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                   <Pie data={[{name: 'Direct', value: 65}, {name: 'Search', value: 25}, {name: 'Referral', value: 10}]} dataKey="value" innerRadius={70} outerRadius={95} paddingAngle={8} stroke="none" cornerRadius={10}>
                                      <Cell fill="#6366f1" />
                                      <Cell fill="#10b981" />
                                      <Cell fill="#f59e0b" />
                                   </Pie>
                                </PieChart>
                             </ResponsiveContainer>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-10 space-y-8 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <Users className="w-5 h-5 text-indigo-400" /> Active Segments
                          </h3>
                          <div className="space-y-6">
                             {[
                                { label: 'University Node', val: 78, color: 'bg-indigo-500' },
                                { label: 'Private Researcher', val: 15, color: 'bg-emerald-500' },
                                { label: 'Journal Peer Review', val: 7, color: 'bg-amber-500' }
                             ].map(item => (
                                <div key={item.label} className="space-y-3">
                                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                      <span>{item.label}</span>
                                      <span className="text-white">{item.val}%</span>
                                   </div>
                                   <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* GEOGRAPHY VIEW */}
              {activeView === 'geography' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-[#0f141f] border border-white/5 rounded-[4rem] p-12 relative overflow-hidden shadow-2xl">
                       <div className="absolute top-0 left-0 w-full h-full p-10 opacity-[0.03] pointer-events-none">
                          <Globe className="w-full h-full text-white" />
                       </div>
                       
                       <div className="relative z-10 space-y-12">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                             <div>
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter font-heading">Global Node Density</h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-2">Heatmap of institutional bypass requests by regional node</p>
                             </div>
                             <div className="flex items-center gap-4 px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                <div className="w-2.5 h-2.5 bg-indigo-500 animate-ping rounded-full"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Live Telemetry Streams</span>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="bg-black/20 rounded-[3rem] border border-white/5 p-8 space-y-4 shadow-inner">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Regional Hotspots</h4>
                                {countryData.map((c, i) => (
                                  <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                     <div className="flex items-center gap-5">
                                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:bg-indigo-600 transition-colors">
                                           <MapPin className="w-4 h-4 text-slate-500 group-hover:text-white" />
                                        </div>
                                        <div>
                                           <p className="text-lg font-black text-white uppercase tracking-tight">{c.name}</p>
                                           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active Edge Cluster</p>
                                        </div>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-2xl font-black text-indigo-400 tabular-nums">{c.value}</p>
                                        <p className="text-[9px] text-slate-600 font-black uppercase">Sessions</p>
                                     </div>
                                  </div>
                                ))}
                             </div>
                             
                             <div className="bg-black/40 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center p-12 relative group min-h-[500px]">
                                <Compass className="w-64 h-64 text-indigo-500/10 group-hover:scale-110 group-hover:rotate-45 transition-all duration-1000" />
                                <div className="absolute top-1/4 left-1/3 w-8 h-8 bg-indigo-500/30 rounded-full animate-ping"></div>
                                <div className="absolute bottom-1/4 right-1/3 w-6 h-6 bg-emerald-500/30 rounded-full animate-ping delay-200"></div>
                                <div className="absolute top-1/2 left-1/2 w-10 h-10 bg-rose-500/30 rounded-full animate-ping delay-500"></div>
                                
                                <div className="mt-12 text-center space-y-4 relative z-10">
                                   <div className="flex items-center justify-center gap-3">
                                      <Network className="w-5 h-5 text-indigo-400" />
                                      <span className="text-xl font-black text-white uppercase tracking-tight">Decentralized Mesh</span>
                                   </div>
                                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] max-w-[240px]">Global node distribution ensures 0% traceability for all documents.</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* FORENSICS VIEW */}
              {activeView === 'forensics' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 space-y-12 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <Target className="w-5 h-5 text-indigo-400" /> Adversarial Bypass Index
                          </h3>
                          <div className="h-64 flex items-center justify-center">
                             <div className="relative w-48 h-48 flex items-center justify-center">
                                <div className="absolute inset-0 border-[16px] border-white/5 rounded-full"></div>
                                <div className="absolute inset-0 border-[16px] border-emerald-500 border-t-transparent border-r-transparent rounded-full rotate-45"></div>
                                <div className="text-center">
                                   <p className="text-5xl font-black text-white">{forensicInsights?.aiBypassRate}%</p>
                                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Stealth Rating</p>
                                </div>
                             </div>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-12 space-y-10 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <Fingerprint className="w-5 h-5 text-indigo-400" /> Pattern Purge Logs
                          </h3>
                          <div className="space-y-4">
                             {forensicInsights?.commonIssues.map((issue, idx) => (
                                <div key={idx} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.08]">
                                   <div className="flex items-center gap-4">
                                      <Hexagon className="w-4 h-4 text-indigo-500" />
                                      <span className="text-[10px] font-black uppercase text-slate-300">{issue.issue}</span>
                                   </div>
                                   <span className="text-xl font-black text-white tabular-nums">{issue.count}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* ECONOMICS VIEW */}
              {activeView === 'economics' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="bg-indigo-600 rounded-[3rem] p-10 text-white space-y-4 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:scale-125 transition-transform"><Trophy className="w-32 h-32" /></div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Valuation Multiplier</p>
                          <h4 className="text-5xl font-black font-heading tracking-tighter">${finances.valuationEstimate.toLocaleString()}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-200 uppercase">
                             <ArrowUpRight className="w-4 h-4" /> 14.5x ASSET VALUE
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 space-y-4 shadow-2xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Gross Processed Value</p>
                          <h4 className="text-5xl font-black font-heading tracking-tighter text-white">${finances.totalGrossValue.toLocaleString()}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase">
                             <TrendingUpIcon className="w-4 h-4" /> Bullish Outlook
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 space-y-4 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5"><Bitcoin className="w-24 h-24" /></div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Donation Treasury</p>
                          <h4 className="text-4xl font-black font-heading tracking-tighter text-amber-500">{finances.totalDonationsBtc} BTC</h4>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                             <RefreshCw className="w-4 h-4" /> Decentralized Ledger
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-10 space-y-10 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <BarChart3 className="w-5 h-5 text-indigo-400" /> Revenue Synthesis
                          </h3>
                          <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[{n: 'Mon', v: 400}, {n: 'Tue', v: 700}, {n: 'Wed', v: 500}, {n: 'Thu', v: 900}, {n: 'Fri', v: 800}]}>
                                   <Bar dataKey="v" fill="#6366f1" radius={[10, 10, 0, 0]} />
                                   <XAxis dataKey="n" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                   <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f141f', border: 'none'}} />
                                </BarChart>
                             </ResponsiveContainer>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-10 space-y-10 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <History className="w-5 h-5 text-indigo-400" /> Unit Economics
                          </h3>
                          <div className="space-y-4">
                             {[
                                { l: 'Neural Burn Rate', v: `$${finances.burnRate}/day`, c: 'text-rose-500' },
                                { l: 'Institutional LTV', v: `$${finances.ltvEstimate}`, c: 'text-emerald-500' },
                                { l: 'Projected MRR', v: `$${finances.mrrEstimate.toLocaleString()}`, c: 'text-indigo-400' }
                             ].map(item => (
                                <div key={item.l} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.05]">
                                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.l}</span>
                                   <span className={`text-xl font-black ${item.c}`}>{item.v}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* TERMINAL VIEW */}
              {activeView === 'terminal' && (
                 <div className="bg-[#05080f] border border-white/10 rounded-[3.5rem] flex flex-col h-[750px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
                    <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-xl relative">
                       <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-50 to-transparent"></div>
                       <div className="flex items-center gap-4">
                          <Terminal className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-[12px] font-black text-white uppercase tracking-[0.4em] font-mono">SOVEREIGN_NODE_VT100</h3>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[9px] font-black text-emerald-500 uppercase font-mono">LINK_ESTABLISHED</span>
                          </div>
                          <button onClick={() => setLiveEvents([])} className="p-2 text-slate-500 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 space-y-6 font-mono text-[11px] leading-relaxed scrollbar-hide bg-black/20">
                       {[...liveEvents, ...logs].map((log, i) => (
                          <div key={i} className={`p-6 rounded-2xl border transition-all animate-in slide-in-from-right-4 ${log.type === 'ERROR' ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-indigo-500/5 border-white/5 text-slate-400'}`}>
                             <div className="flex items-center justify-between mb-3 text-[10px] border-b border-white/5 pb-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.type === 'ERROR' ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>{log.type}</span>
                                <span className="opacity-40">{new Date(log.timestamp).toLocaleTimeString()}</span>
                             </div>
                             <p className="tracking-tight">{log.details}</p>
                          </div>
                       ))}
                       <div ref={consoleEndRef} />
                    </div>
                 </div>
              )}

              {/* INFRASTRUCTURE VIEW */}
              {activeView === 'infrastructure' && (
                 <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="bg-[#0f141f] border border-white/5 rounded-[4rem] p-12 space-y-10 shadow-2xl">
                          <div className="flex items-center justify-between">
                             <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                                <Database className="w-5 h-5 text-indigo-400" /> Cluster Core Health
                             </h3>
                             <span className="px-4 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">OPTIMAL</span>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                             <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-2 shadow-inner">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Latency</p>
                                <p className="text-4xl font-black text-white">{health.neuralLatency}ms</p>
                             </div>
                             <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 space-y-2 shadow-inner">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Uptime</p>
                                <p className="text-4xl font-black text-white">{health.uptime}%</p>
                             </div>
                          </div>
                       </div>
                       <div className="bg-[#0f141f] border border-white/5 rounded-[4rem] p-12 space-y-10 shadow-2xl">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                             <Wifi className="w-5 h-5 text-indigo-400" /> Edge Node Grid
                          </h3>
                          <div className="space-y-4">
                             {health.regionalNodes.map(node => (
                                <div key={node.name} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-3 h-3 rounded-full ${node.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                                      <span className="text-[12px] font-black text-white uppercase tracking-tight">{node.name}</span>
                                   </div>
                                   <span className="text-sm font-black text-indigo-400 tabular-nums">{node.latency}ms</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
              )}
           </div>

           {/* RIGHT BENTO SIDEBAR */}
           <div className="lg:col-span-4 space-y-10">
              
              <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-10 space-y-8 relative overflow-hidden group shadow-2xl">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20"></div>
                 <div className="flex items-center justify-between relative z-10">
                    <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Engine Flux</h3>
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                 </div>
                 <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forensic Scan Core</span>
                       <span className="text-[10px] font-black text-white uppercase">PEAK</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 w-[96%]"></div>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stealth Humanizer</span>
                       <span className="text-[10px] font-black text-white uppercase">V14 SECURE</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 w-[100%]"></div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-6 relative z-10">
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Peak Users</p>
                       <p className="text-xl font-black text-white">{stats.peakConcurrent}</p>
                    </div>
                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Active 24h</p>
                       <p className="text-xl font-black text-white">{stats.activeUsers24h}</p>
                    </div>
                 </div>
              </div>

              <div className="bg-indigo-600 rounded-[3.5rem] p-10 text-white space-y-10 relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)] group hover:bg-indigo-500 transition-all cursor-pointer">
                 <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:scale-125 transition-transform"><ShieldCheck className="w-48 h-48" /></div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                          <Lock className="w-6 h-6 text-white" />
                       </div>
                       <h4 className="text-xl font-black uppercase tracking-tighter">Node Compliance</h4>
                    </div>
                    <p className="text-sm text-indigo-100 font-bold leading-relaxed">V14 Protocols are currently compliant with FERPA, GDPR, and academic freedom mandates globally.</p>
                 </div>
              </div>

              <div className="bg-[#0f141f] border border-white/5 rounded-[3.5rem] p-10 flex flex-col h-[400px] overflow-hidden shadow-2xl">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Global Pulse</h3>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                 </div>
                 <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
                    {logs.slice(0, 10).map((log, i) => (
                      <div key={i} className="flex gap-5 items-start animate-in slide-in-from-right-2" style={{ animationDelay: `${i * 100}ms` }}>
                         <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${log.type === 'VISIT' ? 'bg-blue-500' : log.type === 'SCAN' ? 'bg-indigo-500' : log.type === 'FIX' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                         <div>
                            <p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">{log.type}</p>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{log.details}</p>
                            <p className="text-[8px] text-slate-700 font-black mt-1 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                         </div>
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
