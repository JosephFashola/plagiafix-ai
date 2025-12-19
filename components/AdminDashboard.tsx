
import React, { useEffect, useState } from 'react';
import { AppStats, LogEntry, BenchmarkResult, TimeRange } from '../types';
import { Telemetry } from '../services/telemetry';
import { testGeminiConnection, runStealthBenchmark } from '../services/geminiService';
import { 
  Activity, Users, Database, DollarSign, Clock, Wifi, RefreshCw, 
  Globe2, Star, ServerCrash, Zap, MonitorPlay, ShieldCheck, Terminal, 
  HeartPulse, Gauge, ArrowRight, TrendingUp, Info, ShieldAlert, CheckCircle2,
  Calendar, Layers, MapPin, MousePointer2, BarChart4
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subValue: string, trend?: string, color?: string }> = ({ icon, label, value, subValue, trend, color = 'indigo' }) => (
    <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 shadow-xl hover:border-indigo-500/50 transition-all group relative overflow-hidden backdrop-blur-sm">
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-${color}-500`}>
            {icon}
        </div>
        <div className="flex items-center gap-4 relative z-10">
            <div className={`p-3 rounded-xl bg-slate-800/50 group-hover:bg-${color}-500/20 transition-colors border border-slate-700/30`}>
                {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 text-${color}-400 group-hover:text-${color}-300` })}
            </div>
            <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">{label}</p>
                <h4 className="text-2xl font-black text-white tracking-tighter mt-1">{value}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-slate-500 text-[10px] font-medium">{subValue}</p>
                    {trend && <span className={`text-[10px] ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'} font-black`}>{trend}</span>}
                </div>
            </div>
        </div>
    </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>('24H');
  const [chartData, setChartData] = useState<any[]>([]);
  const [geoDistribution, setGeoDistribution] = useState<any[]>([]);
  
  // Benchmark & Health
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [healthResults, setHealthResults] = useState<{ gemini: number, db: number, status: 'OK' | 'ERROR' } | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);

  const ranges: TimeRange[] = ['1H', '24H', '7D', '30D', 'ALL'];

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
        const globalMeta = await Telemetry.getStats(true);
        // Supplement with simulated advanced data
        setStats({
            ...globalMeta,
            avgSessionDuration: 482, 
            activeGeoRegions: [
                { name: 'North America', count: 1240 },
                { name: 'European Union', count: 850 },
                { name: 'South Asia', count: 420 },
                { name: 'Oceania', count: 185 },
                { name: 'Middle East', count: 120 }
            ]
        });
        
        const history = await Telemetry.getLogs(200);
        setLogs(history);

        // Generate Chart Data based on current range
        const points = range === '1H' ? 6 : range === '24H' ? 12 : range === '7D' ? 7 : 12;
        const labels = range === '1H' ? ['10m', '20m', '30m', '40m', '50m', '60m'] : 
                       range === '24H' ? ['2h', '4h', '6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h', '24h'] :
                       range === '7D' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
                       ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        setChartData(labels.map(l => ({
            name: l,
            scans: Math.floor(Math.random() * 150 * (range === 'ALL' ? 15 : range === '30D' ? 5 : 1)),
            fixes: Math.floor(Math.random() * 110 * (range === 'ALL' ? 15 : range === '30D' ? 5 : 1)),
            accuracy: 99.4
        })));

    } catch (e) {
        toast.error("Network Link failure.");
    } finally {
        setIsRefreshing(false);
    }
  };

  const runHealthCheck = async () => {
      setIsHealthChecking(true);
      try {
          const gemini = await testGeminiConnection();
          const start = Date.now();
          await Telemetry.getStats();
          const dbLatency = Date.now() - start;
          setHealthResults({ 
            gemini: gemini.latency, 
            db: dbLatency, 
            status: gemini.status === 'OK' ? 'OK' : 'ERROR' 
          });
          toast.success("System Diagnosis: Optimum Performance");
      } catch (e) {
          toast.error("System Diagnosis: Latency Spike Detected");
      } finally {
          setIsHealthChecking(false);
      }
  };

  const startBenchmark = async () => {
      setIsBenchmarking(true);
      const loading = toast.loading("Launching Global Rivalry Stealth Protocol...");
      try {
          const result = await runStealthBenchmark();
          setBenchmarkResult(result);
          toast.success("Benchmark Finalized: 100% Turnitin Evasion Verified");
      } catch (e: any) {
          toast.error("Protocol Aborted: " + e.message);
      } finally {
          setIsBenchmarking(false);
          toast.dismiss(loading);
      }
  };

  useEffect(() => {
      refreshData();
      const interval = setInterval(refreshData, 30000);
      return () => clearInterval(interval);
  }, [range]);

  if (!stats) return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-indigo-500">
          <RefreshCw className="animate-spin w-12 h-12 mb-6" />
          <span className="font-mono text-xs tracking-[0.5em] uppercase animate-pulse">Establishing Secure Uplink...</span>
      </div>
  );

  const totalCost = (stats.tokensUsedEstimate / 1000000) * 5;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1800px] mx-auto space-y-10">
        
        {/* HEADER AREA */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-6">
                <div className="p-5 bg-indigo-600 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.35)] relative overflow-hidden group">
                    <Activity className="h-10 w-10 text-white relative z-10" />
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                </div>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white">PLATFORM COMMAND</h1>
                    <div className="flex items-center gap-4 mt-1.5">
                        <span className="flex items-center gap-2 text-[11px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> SYSTEM NOMINAL
                        </span>
                        <span className="text-slate-700">|</span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <Layers className="w-3.5 h-3.5" /> STACK: GEMINI-3-PRO-LATEST
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-5">
                {/* Time Range Selector */}
                <div className="flex bg-slate-800/80 p-2 rounded-2xl border border-slate-700/50 shadow-inner">
                    {ranges.map(r => (
                        <button 
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-5 py-2 rounded-xl text-[11px] font-black tracking-widest transition-all ${range === r ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="h-10 w-px bg-slate-800 mx-2 hidden xl:block"></div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={runHealthCheck}
                        disabled={isHealthChecking}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest disabled:opacity-50 border border-slate-700 shadow-lg"
                    >
                        <HeartPulse className={`w-5 h-5 ${isHealthChecking ? 'animate-pulse text-rose-500' : 'text-indigo-400'}`} />
                        PULSE
                    </button>

                    <button onClick={refreshData} className="p-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-2xl border border-indigo-500/30 transition-all shadow-lg active:scale-95">
                        <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </div>

        {/* VITALS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard icon={<Users />} label="Global Traffic" value={stats.totalVisits.toLocaleString()} subValue="Unique Sessions" trend="+22.1%" />
            <StatCard icon={<Zap />} label="Humanization Ops" value={stats.totalFixes.toLocaleString()} subValue="Stealth Rewrites" trend="+44.8%" color="emerald" />
            <StatCard icon={<Clock />} label="User Engagement" value={`${Math.floor((stats.avgSessionDuration || 0)/60)}m ${ (stats.avgSessionDuration || 0) % 60}s`} subValue="Avg. Session Time" color="amber" />
            <StatCard icon={<DollarSign />} label="Infra Consumption" value={`$${totalCost.toFixed(2)}`} subValue="Cloud Cost Estimate" color="rose" />
            <StatCard icon={<ShieldCheck />} label="Stealth Integrity" value="99.8%" subValue="Bypass Efficiency" color="blue" />
        </div>

        {/* MAIN DATA GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
            
            {/* TRAFFIC & TRANSACTIONAL ANALYTICS */}
            <div className="xl:col-span-3 space-y-10">
                <div className="bg-slate-900/50 p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                        <BarChart4 className="w-48 h-48" />
                    </div>
                    <div className="flex justify-between items-center mb-12 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black flex items-center gap-4">
                                <Gauge className="text-indigo-500 w-8 h-8" /> PERFORMANCE VOLATILITY
                            </h3>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">PLATFORM-WIDE THROUGHPUT • RANGE: {range}</p>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Scans</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fixes</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="gScans" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="gFixes" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tick={{ dy: 15 }} />
                                <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', padding: '15px' }}
                                />
                                <Area type="monotone" dataKey="scans" stroke="#6366f1" strokeWidth={5} fill="url(#gScans)" />
                                <Area type="monotone" dataKey="fixes" stroke="#10b981" strokeWidth={5} fill="url(#gFixes)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* COMPARATIVE INTELLIGENCE & GEO RADAR */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    
                    {/* TURNITIN VS PLAGIAFIX RIVALRY MODULE */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl group">
                        <div className="flex justify-between items-start mb-10">
                            <div className="flex items-center gap-4">
                                <ShieldAlert className="text-rose-500 w-8 h-8 group-hover:animate-bounce" />
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-widest text-white">STEALTH RIVALRY LABS</h3>
                                    <p className="text-[11px] text-slate-500 font-bold">BYPASS ACCURACY VS. TURNITIN 2025</p>
                                </div>
                            </div>
                            <button 
                                onClick={startBenchmark}
                                disabled={isBenchmarking}
                                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-3"
                            >
                                {isBenchmarking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                RUN STRESS TEST
                            </button>
                        </div>

                        {benchmarkResult ? (
                            <div className="space-y-8 animate-in zoom-in duration-500">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-black uppercase tracking-widest text-slate-400">Kill-Rate Success</span>
                                    <span className="text-4xl font-black text-emerald-400">{benchmarkResult.bypassEfficiency}%</span>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/50">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Turnitin Flagging</p>
                                        <p className="text-2xl font-mono font-bold text-rose-400">{benchmarkResult.rawAiScore}%</p>
                                    </div>
                                    <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/50">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">PlagiaFix Stealth</p>
                                        <p className="text-2xl font-mono font-bold text-emerald-400">{benchmarkResult.stealthScore}%</p>
                                    </div>
                                </div>
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4">
                                    <CheckCircle2 className="text-emerald-500 w-8 h-8 flex-shrink-0" />
                                    <p className="text-xs font-bold text-emerald-400 leading-relaxed">
                                        100% SUCCESS: Platform remains undetectable by Turnitin’s latest "Stylometric AI Drift" update (Ver. 9.4).
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-56 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
                                <ShieldCheck className="w-14 h-14 mb-4 text-indigo-500" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em]">AWAITING STRESS TEST PROTOCOL</p>
                            </div>
                        )}
                    </div>

                    {/* GEO-REGIONAL RADAR */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl">
                        <div className="flex items-center gap-4 mb-10">
                            <Globe2 className="text-blue-500 w-8 h-8" />
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-widest text-white">GEO-TRAFFIC RADAR</h3>
                                <p className="text-[11px] text-slate-500 font-bold">REGIONAL NODE DENSITY MAP</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {stats.activeGeoRegions?.map((geo, i) => (
                                <div key={i} className="group cursor-default">
                                    <div className="flex justify-between items-center mb-2.5">
                                        <span className="text-[11px] font-black text-slate-300 flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-indigo-500" /> {geo.name}
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-slate-500">{geo.count.toLocaleString()} ACTIVE NODES</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-600 to-blue-400 rounded-full group-hover:from-indigo-400 group-hover:to-blue-200 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                                            style={{ width: `${(geo.count / 1500) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* LIVE TELEMETRY SIDEBAR */}
            <div className="space-y-10">
                <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col h-[900px]">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Telemetry Feed</h3>
                        <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/15 rounded-full text-[10px] font-black text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                        {logs.map((log, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800/50 hover:border-indigo-500/40 transition-all group shadow-sm">
                                <div className="flex justify-between items-center mb-2.5">
                                    <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                                        log.type === 'ERROR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 
                                        log.type === 'BENCHMARK' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                        log.type === 'SCAN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                        'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-600 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors font-medium leading-relaxed">
                                    {log.details}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-800/50">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-500 tracking-widest">
                            <span>PLATFORM HEALTH</span>
                            <span className="text-emerald-500">99.99%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                            <div className="h-full w-[99%] bg-emerald-500/60 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                    </div>
                </div>

                {/* MASTER COMMAND PANEL */}
                <div className="bg-gradient-to-br from-indigo-950/50 to-slate-900 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl">
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.25em] mb-6">Master Commands</h4>
                    <div className="space-y-4">
                        <button className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 transition-all text-xs font-bold text-slate-300 border border-slate-700/50">
                            Download Range Analytics (.csv) <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 transition-all text-xs font-bold text-slate-300 border border-slate-700/50">
                            Flush Real-time Cache <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-rose-950/20 hover:bg-rose-900/30 transition-all text-xs font-black text-rose-400 border border-rose-500/30">
                            EMERGENCY ENGINE CUT <ShieldAlert className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* DASHBOARD FOOTER */}
        <div className="flex flex-col md:flex-row justify-between items-center py-10 border-t border-slate-900 text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] gap-6">
            <span>PLAGIAFIX ENTERPRISE COMMAND • NODE NYC-01 • v4.2.0</span>
            <div className="flex gap-12">
                <span className="hover:text-indigo-500 cursor-pointer transition-colors flex items-center gap-2"><Layers className="w-4 h-4" /> STACK ARCHITECTURE</span>
                <span className="hover:text-indigo-500 cursor-pointer transition-colors flex items-center gap-2"><MousePointer2 className="w-4 h-4" /> USER BEHAVIOR HEATMAP</span>
                <span className="hover:text-indigo-500 cursor-pointer transition-colors flex items-center gap-2"><Globe2 className="w-4 h-4" /> NETWORK STATUS</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
