
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppStats, LogEntry, TimeRange, ForensicInsights } from '../types';
import { Telemetry } from '../services/telemetry';
import { testGeminiConnection } from '../services/geminiService';
import { 
  Activity, Database, RefreshCw, 
  Globe2, LayoutGrid, HeartPulse, Signal, 
  Terminal, Trash2, PlayCircle, Server, 
  Zap, TrendingUp, CheckCircle2, XCircle,
  FlaskConical, Gauge, Bug, Microscope, Wind, Cpu,
  Navigation, Users, MessageSquare, BarChart4,
  Calendar, Clock, Filter, LineChart as LucideLineChart,
  ArrowRight, FileText, ShieldAlert, BarChart3, PieChart as LucidePieChart,
  DollarSign, Download, Table as TableIcon, Layers, Binary, Bitcoin,
  Map, History, Search, Wifi, AlertTriangle, GraduationCap
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number, color: string, subValue?: string, isUpdating?: boolean }> = ({ icon, label, value, color, subValue, isUpdating }) => (
  <div className={`bg-[#0f141f]/80 backdrop-blur-xl border ${isUpdating ? 'border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)]' : 'border-white/5'} rounded-3xl p-6 shadow-2xl relative group overflow-hidden transition-all hover:border-indigo-500/40 hover:translate-y-[-2px]`}>
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 blur-3xl -mr-12 -mt-12 group-hover:bg-${color}-500/20 transition-all`}></div>
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl bg-slate-800/50 text-${color}-400 border border-white/5 shadow-inner ${isUpdating ? 'animate-pulse' : ''}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
      </div>
      {subValue && (
        <span className="text-[10px] font-black text-slate-500 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 uppercase tracking-widest">
          {subValue}
        </span>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
    <h4 className={`text-3xl font-black text-white tracking-tighter tabular-nums transition-all ${isUpdating ? 'scale-110 text-indigo-400' : ''}`}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </h4>
  </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [financials, setFinancials] = useState<any>(null);
  const [forensicInsights, setForensicInsights] = useState<ForensicInsights | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>('30D');
  const [chartData, setChartData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [activeViewVal, setActiveView] = useState<'overview' | 'intelligence' | 'financials' | 'health' | 'geography'>('overview');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [liveEvents, setLiveEvents] = useState<LogEntry[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const refreshData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [metaRes, finRes, insights, history, cData, cChart, geminiStatus, dbStatus] = await Promise.all([
        Telemetry.getGroundTruthStats(), 
        Telemetry.getFinancialSnapshot(),
        Telemetry.getForensicInsights(),
        Telemetry.getLogs(100),
        Telemetry.getCountryTraffic(), 
        Telemetry.getChartData(range), 
        testGeminiConnection(), 
        Telemetry.checkDatabaseHealth()
      ]);
      setStats(metaRes.stats); 
      setFinancials(finRes);
      setForensicInsights(insights);
      setLogs(history);
      setCountryData(cData); 
      setChartData(cChart);
      setHealth({ 
        gemini: geminiStatus.status, 
        db: dbStatus.status, 
        geminiLatency: geminiStatus.latency, 
        dbLatency: dbStatus.latency,
        status: geminiStatus.status === 'OK' && dbStatus.status === 'OK' ? 'HEALTHY' : 'DEGRADED'
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
    
    setStats(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      if (newLog.type === 'VISIT') next.totalVisits++;
      if (newLog.type === 'SCAN') next.totalScans++;
      if (newLog.type === 'FIX') next.totalFixes++;
      if (newLog.type === 'ERROR') next.totalErrors++;
      return next;
    });

    if (['SCAN', 'FIX', 'VISIT'].includes(newLog.type)) {
      refreshData(true);
    }
  }, [refreshData]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => refreshData(true), 30000);
    const unsubscribe = Telemetry.subscribe(handleLiveUpdate);
    return () => { unsubscribe(); clearInterval(interval); };
  }, [refreshData, handleLiveUpdate]);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveEvents]);

  const exportToExcel = () => {
    if (!stats || !financials) return;
    const rows = [
      ["Metric", "Value", "Unit"],
      ["Total Visits", stats.totalVisits, "Sessions"],
      ["Total Scans", stats.totalScans, "Events"],
      ["Total Fixes", stats.totalFixes, "Events"],
      ["Words Processed", stats.totalWordsProcessed, "Words"],
      ["Estimated Revenue", financials.revenue.toFixed(2), "USD"],
      ["Estimated Token Burn", financials.costs.toFixed(4), "USD"],
      ["Gross Margin", financials.revenue - financials.costs, "USD"],
      ["Margin Percentage", financials.marginPercent.toFixed(1), "%"],
      ["Report Date", new Date().toLocaleString(), "UTC"]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `PlagiaFix_Financial_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Financial Ledger Exported");
  };

  if (!stats) return (
    <div className="min-h-screen bg-[#070a0f] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Server className="w-8 h-8 text-indigo-500" />
        </div>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Initializing Control Room</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1700px] mx-auto space-y-10">
        
        {/* Real-time Ticker Header */}
        <div className={`bg-[#0f141f]/50 border ${isSyncing ? 'border-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' : 'border-white/5'} rounded-3xl p-4 flex items-center justify-between px-8 backdrop-blur-3xl transition-all duration-500`}>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">System Online</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10"></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 Last Sync: <span className="text-slate-300">{new Date().toLocaleTimeString()}</span>
              </p>
              {isSyncing && (
                <div className="flex items-center gap-2 animate-in slide-in-from-left-4">
                  <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Event Synced</span>
                </div>
              )}
           </div>
           <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                 <Signal className="w-4 h-4 text-indigo-500" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sovereign Node v1.4</span>
              </div>
              <button onClick={() => refreshData()} className={`p-2 hover:bg-white/5 rounded-xl transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                 <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
           </div>
        </div>

        <header className="flex flex-col xl:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8">
            <div className="p-5 rounded-[2rem] bg-indigo-600 shadow-[0_0_50px_rgba(79,70,229,0.3)] border border-white/20">
               <Cpu className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-heading leading-none">Command Center</h1>
              <div className="flex items-center gap-3 mt-3">
                 <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest">Admin Authorization Verified</span>
                 <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center bg-[#0f141f] p-2 rounded-[2rem] border border-white/5 shadow-2xl">
            {[
              { id: 'overview', icon: <LayoutGrid />, label: 'Overview' },
              { id: 'intelligence', icon: <Binary />, label: 'Intelligence' },
              { id: 'financials', icon: <DollarSign />, label: 'Financials' },
              { id: 'health', icon: <HeartPulse />, label: 'Health' },
              { id: 'geography', icon: <Globe2 />, label: 'Geography' }
            ].map(v => (
              <button 
                key={v.id} 
                onClick={() => setActiveView(v.id as any)} 
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeViewVal === v.id ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {React.cloneElement(v.icon as React.ReactElement, { className: "w-4 h-4" })}
                {v.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Global Key Metrics (Always Visible) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Users />} label="Total Sessions" value={stats.totalVisits} color="indigo" subValue="Realtime" isUpdating={isSyncing} />
          <StatCard icon={<Microscope />} label="Forensic Scans" value={stats.totalScans} color="amber" subValue="Total" isUpdating={isSyncing} />
          <StatCard icon={<Zap />} label="Neural Fixes" value={stats.totalFixes} color="emerald" subValue="V6 Active" isUpdating={isSyncing} />
          <StatCard icon={<Layers />} label="Words Purified" value={stats.totalWordsProcessed} color="rose" subValue="Estimated" isUpdating={isSyncing} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            {activeViewVal === 'overview' && (
              <div className="bg-[#0f141f]/80 border border-white/5 rounded-[3rem] p-10 flex flex-col h-full shadow-2xl">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-500/10 rounded-xl"><LucideLineChart className="w-5 h-5 text-indigo-400" /></div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter font-heading">Neural Load Monitoring</h3>
                          {isSyncing && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>}
                        </div>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Global Scan vs. Fix Volume</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 p-1 bg-[#1a202c] rounded-2xl border border-white/5">
                      {['1H', '24H', '7D', '30D', '1Y', 'ALL'].map(opt => (
                        <button key={opt} onClick={() => setRange(opt as TimeRange)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${range === opt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="flex-1 min-h-[450px] relative">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorScan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorFix" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a202c" />
                            <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} dy={15} />
                            <YAxis stroke="#475569" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} dx={-15} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '15px' }}
                              itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            />
                            <Area type="monotone" dataKey="scans" stroke="#6366f1" fillOpacity={1} fill="url(#colorScan)" strokeWidth={4} />
                            <Area type="monotone" dataKey="fixes" stroke="#10b981" fillOpacity={1} fill="url(#colorFix)" strokeWidth={4} />
                          </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 gap-6">
                        <Activity className="w-16 h-16 text-indigo-500 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">No neural traffic detected in this range.</p>
                      </div>
                    )}
                 </div>
              </div>
            )}

            {activeViewVal === 'financials' && financials && (
              <div className="space-y-10 animate-in zoom-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700"><Bitcoin className="w-48 h-48" /></div>
                    <div className="relative z-10 space-y-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Estimated Revenue</p>
                        <h3 className="text-6xl font-black tracking-tighter">${financials.revenue.toLocaleString()}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                           <span className="text-[10px] font-black opacity-60 uppercase">Average Donation</span>
                           <span className="text-xl font-black">~$30.00</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black opacity-60 uppercase">Sponsor Conversion</span>
                           <span className="text-xl font-black">2.0%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Neural Burn Unit Efficiency</p>
                      <div className="flex items-center gap-10">
                         <div className="relative">
                            <LucidePieChart className="w-32 h-32 text-indigo-500/20" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <p className="text-3xl font-black text-white">{financials.marginPercent.toFixed(0)}%</p>
                               <p className="text-[8px] font-black text-emerald-400 uppercase">Margin</p>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div>
                               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Burn (COGS)</p>
                               <p className="text-2xl font-black text-rose-400">${financials.costs.toFixed(4)}</p>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Net Margin</p>
                               <p className="text-2xl font-black text-emerald-400">${financials.grossMargin.toFixed(2)}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                    <button onClick={exportToExcel} className="w-full mt-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-4 group">
                       <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" /> Download Ledger .CSV
                    </button>
                  </div>
                </div>

                <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10">
                   <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-10 font-heading">Neural Unit Ledger</h3>
                   <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                           <tr className="border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <th className="pb-6 text-left">Neural Operation</th>
                              <th className="pb-6 text-left">Unit Cost</th>
                              <th className="pb-6 text-left">Efficiency</th>
                              <th className="pb-6 text-right">Status</th>
                           </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: 'Document Analysis (Flash)', cost: '$0.00075', eff: '98%', status: 'OPTIMIZED', color: 'text-emerald-400' },
                            { name: 'Stealth Humanizer (Pro)', cost: '$0.0125', eff: '92%', status: 'HIGH LOAD', color: 'text-amber-400' },
                            { name: 'Blockchain Verification', cost: '$0.0000', eff: '100%', status: 'SCALABLE', color: 'text-indigo-400' },
                            { name: 'Real-time Voice Sync', cost: '$0.0045', eff: '89%', status: 'STABLE', color: 'text-emerald-400' }
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-all group">
                               <td className="py-6 font-black uppercase text-[11px] text-white">{row.name}</td>
                               <td className="py-6 font-mono text-[11px] text-slate-400">{row.cost}</td>
                               <td className="py-6 font-black text-[11px] text-slate-300">{row.eff}</td>
                               <td className="py-6 text-right">
                                  <span className={`text-[9px] font-black uppercase px-3 py-1 bg-white/5 rounded-lg border border-white/5 ${row.color}`}>{row.status}</span>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            )}

            {activeViewVal === 'intelligence' && forensicInsights && (
              <div className="space-y-10 animate-in zoom-in duration-500">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10">
                       <div className="flex items-center justify-between mb-10">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Plagiarism Distribution</h4>
                          <Microscope className="w-5 h-5 text-indigo-500" />
                       </div>
                       <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={forensicInsights.commonIssues}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a202c" />
                                <XAxis dataKey="issue" hide />
                                <Tooltip contentStyle={{ backgroundColor: '#0f141f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '15px', fontSize: '10px' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                    <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 space-y-8">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Statistics</h4>
                       <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                             <span className="text-[11px] font-black uppercase text-slate-400">Avg Doc Length</span>
                             <span className="text-2xl font-black text-white">{forensicInsights.avgDocLength} Words</span>
                          </div>
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                             <span className="text-[11px] font-black uppercase text-slate-400">Total Analyzed</span>
                             <span className="text-2xl font-black text-white">{forensicInsights.totalWords.toLocaleString()} Words</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[11px] font-black uppercase text-slate-400">Stealth Success</span>
                             <span className="text-2xl font-black text-emerald-400">99.8%</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Common Forensic Triggers</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       {forensicInsights.commonIssues.map((item, i) => (
                          <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-2xl group hover:border-indigo-500/30 transition-all">
                             <p className="text-[11px] font-black text-white uppercase tracking-tight mb-2 truncate">{item.issue}</p>
                             <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-indigo-400">{item.count} Detected</span>
                                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (item.count / 50) * 100)}%` }}></div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {activeViewVal === 'health' && health && (
              <div className="space-y-10 animate-in zoom-in duration-500">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${health.gemini === 'OK' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border border-white/5 shadow-inner`}>
                             <Zap className="w-8 h-8" />
                          </div>
                          <div>
                             <h4 className="text-xl font-black text-white uppercase tracking-tighter">Gemini API Pulse</h4>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Layer Connectivity</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-3xl font-black text-white tabular-nums">{health.geminiLatency}ms</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${health.gemini === 'OK' ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {health.gemini === 'OK' ? 'Functional' : 'Disconnected'}
                          </p>
                       </div>
                    </div>

                    <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${health.db === 'OK' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'} border border-white/5 shadow-inner`}>
                             <Database className="w-8 h-8" />
                          </div>
                          <div>
                             <h4 className="text-xl font-black text-white uppercase tracking-tighter">Sovereign DB</h4>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Telemetry Storage Health</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-3xl font-black text-white tabular-nums">{health.dbLatency}ms</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${health.db === 'OK' ? 'text-indigo-400' : 'text-rose-500'}`}>
                             {health.db === 'OK' ? 'Healthy' : 'Latency Alert'}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10">
                    <div className="flex items-center gap-4 mb-10">
                       <HeartPulse className="w-6 h-6 text-rose-500" />
                       <h3 className="text-xl font-black text-white uppercase tracking-tighter font-heading">Self-Correction Protocol</h3>
                    </div>
                    <div className="space-y-6">
                       {[
                         { label: 'Automatic Retry Engine', status: 'Active', color: 'text-emerald-400' },
                         { label: 'Blockchain Settlement Sync', status: 'Standby', color: 'text-indigo-400' },
                         { label: 'Neural Token Smoothing', status: 'Optimized', color: 'text-emerald-400' },
                         { label: 'Failover Geo-Replication', status: 'Active', color: 'text-emerald-400' }
                       ].map((sys, i) => (
                          <div key={i} className="flex justify-between items-center p-6 bg-white/5 rounded-2xl border border-white/5">
                             <span className="text-[11px] font-black uppercase text-slate-300">{sys.label}</span>
                             <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${sys.color}`}>{sys.status}</span>
                                <CheckCircle2 className={`w-4 h-4 ${sys.color}`} />
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
            )}

            {activeViewVal === 'geography' && (
              <div className="bg-[#0f141f]/80 border border-white/5 rounded-[3rem] p-10 space-y-10 animate-in zoom-in duration-500">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <Map className="w-6 h-6 text-indigo-400" />
                       <h3 className="text-xl font-black text-white uppercase tracking-tighter font-heading">Global Usage Distribution</h3>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Traffic Nodes</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {countryData.length === 0 ? (
                      <div className="col-span-full py-20 text-center opacity-30 italic uppercase text-[10px] tracking-widest">No geographic signatures detected.</div>
                    ) : countryData.map((c, i) => (
                      <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col justify-between group hover:border-indigo-500/40 transition-all">
                         <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-600/20">{c.name}</div>
                            <span className="text-3xl font-black text-white tabular-nums">{c.value}</span>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Regional Traffic</p>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500" style={{ width: `${(c.value / (stats.totalVisits || 1)) * 100}%` }}></div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-10">
            {/* Real-time Event Console */}
            <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] flex flex-col h-[750px] overflow-hidden shadow-2xl">
               <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-4">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Neural Stream</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-indigo-500/50"></div>
                  </div>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono scrollbar-hide bg-black/10">
                  {[...liveEvents, ...logs].map((log, i) => (
                    <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl animate-in slide-in-from-right-4 duration-300 hover:bg-white/[0.05] transition-all group">
                       <div className="flex justify-between items-start mb-3">
                          <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                            log.type === 'SCAN' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 
                            log.type === 'FIX' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                            log.type === 'ERROR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' :
                            'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold group-hover:text-slate-400 transition-colors">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                       </div>
                       <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                          {log.details.length > 80 ? log.details.substring(0, 80) + '...' : log.details}
                       </p>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
               </div>

               <div className="px-8 py-6 bg-black/30 border-t border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Threads</span>
                     <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">34 Active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(24)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 h-3 rounded-sm ${Math.random() > 0.7 ? 'bg-indigo-600 animate-pulse' : 'bg-white/5'}`}
                      ></div>
                    ))}
                  </div>
               </div>
            </div>

            {/* Quick Action Hub */}
            <div className="bg-[#0f141f] border border-white/5 rounded-[3rem] p-10 space-y-8">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Controls</h4>
               <div className="space-y-4">
                  <button className="w-full p-6 bg-rose-600/10 border border-rose-600/20 hover:bg-rose-600/20 rounded-2xl transition-all flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <Trash2 className="w-5 h-5 text-rose-500" />
                        <span className="text-[11px] font-black text-rose-500 uppercase">Clear Audit Logs</span>
                     </div>
                     <ArrowRight className="w-4 h-4 text-rose-500/40 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full p-6 bg-white/5 border border-white/5 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <ShieldAlert className="w-5 h-5 text-amber-500" />
                        <span className="text-[11px] font-black text-slate-300 uppercase">Manual Block IP</span>
                     </div>
                     <ArrowRight className="w-4 h-4 text-slate-300/40 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
            </div>
          </div>
        </div>

        <footer className="py-12 flex flex-col md:flex-row items-center justify-between gap-10 opacity-40 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-6">
              <div className="bg-indigo-600 p-2.5 rounded-xl"><GraduationCap className="w-6 h-6 text-white" /></div>
              <span className="text-xl font-black uppercase tracking-tighter text-white">PlagiaFix Sovereign Admin</span>
           </div>
           <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Proprietary Behavioral Intelligence Engine • 2025</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;
