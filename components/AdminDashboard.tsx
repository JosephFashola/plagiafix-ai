
import React, { useEffect, useState } from 'react';
import { AppStats, LogEntry, BenchmarkResult } from '../types';
import { Telemetry } from '../services/telemetry';
import { testGeminiConnection, runStealthBenchmark } from '../services/geminiService';
import { Activity, Users, Database, DollarSign, Clock, Wifi, WifiOff, Eye, Plug, X, RefreshCw, Globe2, Star, MessageSquare, Calendar, Filter, ServerCrash, CheckCircle2, Zap, MonitorPlay, ShieldCheck, Terminal, HeartPulse, Gauge, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subValue: string }> = ({ icon, label, value, subValue }) => (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-indigo-500/50 transition-colors">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-700 rounded-lg shadow-inner">{icon}</div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
                <p className="text-slate-500 text-xs mt-1">{subValue}</p>
            </div>
        </div>
    </div>
);

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Benchmark States
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [healthResults, setHealthResults] = useState<{ gemini: number, db: number, status: 'OK' | 'ERROR' } | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
        const globalMeta = await Telemetry.getStats(true);
        setStats(globalMeta);
        const history = await Telemetry.getLogs(50);
        setLogs(history);
        setIsCloudConnected(Telemetry.isConnected());
        
        // Mock chart data for visualization
        setChartData([
            { name: 'Mon', scans: 45, fixes: 32 },
            { name: 'Tue', scans: 52, fixes: 41 },
            { name: 'Wed', scans: 38, fixes: 30 },
            { name: 'Thu', scans: 65, fixes: 55 },
            { name: 'Fri', scans: 48, fixes: 40 },
            { name: 'Sat', scans: 25, fixes: 18 },
            { name: 'Sun', scans: 30, fixes: 22 },
        ]);
    } catch (e) {}
    setIsRefreshing(false);
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
          toast.success("Health Check Passed");
      } catch (e) {
          toast.error("Health Check Failed");
      } finally {
          setIsHealthChecking(false);
      }
  };

  const startBenchmark = async () => {
      setIsBenchmarking(true);
      const loading = toast.loading("Executing Global Stealth Benchmark...");
      try {
          const result = await runStealthBenchmark();
          setBenchmarkResult(result);
          await Telemetry.addLogLocal('BENCHMARK', `Stealth Efficiency: ${result.bypassEfficiency}%`);
          toast.success("Benchmark Completed Successfully");
      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsBenchmarking(false);
          toast.dismiss(loading);
      }
  };

  useEffect(() => { refreshData(); }, []);

  if (!stats) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-indigo-400"><RefreshCw className="animate-spin mr-2" /> Initializing Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Activity className="text-indigo-500" /> Admin Command Center
                </h1>
                <p className="text-slate-400 mt-2">Global PlagiaFix Infrastructure Monitoring</p>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={runHealthCheck}
                    disabled={isHealthChecking}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm font-bold disabled:opacity-50"
                >
                    <HeartPulse className={`w-4 h-4 ${isHealthChecking ? 'animate-pulse text-red-500' : 'text-emerald-400'}`} />
                    Run Health Check
                </button>
                <button onClick={refreshData} className="p-2 bg-slate-800 rounded-lg border border-slate-700"><RefreshCw className={isRefreshing ? 'animate-spin' : ''} /></button>
            </div>
        </div>

        {/* Diagnostic Results Bar */}
        {healthResults && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top duration-500">
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-indigo-400">Gemini Latency</span>
                    <span className="font-mono text-indigo-200">{healthResults.gemini}ms</span>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-emerald-400">Supabase DB</span>
                    <span className="font-mono text-emerald-200">{healthResults.db}ms</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-slate-400">System Status</span>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${healthResults.status === 'OK' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`}></div>
                        <span className="font-bold text-xs">{healthResults.status}</span>
                    </div>
                </div>
            </div>
        )}

        {/* Global Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={<Users className="text-blue-400" />} label="Global Scans" value={stats.totalScans.toLocaleString()} subValue="Institutional Checks" />
            <StatCard icon={<Zap className="text-amber-400" />} label="Humanizations" value={stats.totalFixes.toLocaleString()} subValue="Stealth Bypasses" />
            <StatCard icon={<MonitorPlay className="text-pink-400" />} label="PPTX Decks" value={stats.totalSlides.toLocaleString()} subValue="Academic Content" />
            <StatCard icon={<DollarSign className="text-emerald-400" />} label="Infrastructure Cost" value={`$${((stats.tokensUsedEstimate / 1000000) * 5).toFixed(2)}`} subValue="Cloud Resource Usage" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Charts */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-[400px]">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Gauge className="text-indigo-400 w-5 h-5" />Traffic Volatility</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="name" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="scans" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                            <Area type="monotone" dataKey="fixes" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Benchmark Lab */}
                <div className="bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl">
                    <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="text-red-500 w-4 h-4" />Stealth Performance Labs</h3>
                        <button 
                            onClick={startBenchmark}
                            disabled={isBenchmarking}
                            className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isBenchmarking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Terminal className="w-3 h-3" />}
                            Run Red Team Benchmark
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs text-slate-400 leading-relaxed mb-4 italic">
                                This benchmark runs a real-world test against our AI detection algorithms. It generates pure AI text, processes it via "Ghost Mode", and verifies the reduction in AI signature percentage.
                            </p>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs text-slate-300"><ArrowRight className="w-3 h-3 text-indigo-500" /> Target: Turnitin Global Standards</li>
                                <li className="flex items-center gap-2 text-xs text-slate-300"><ArrowRight className="w-3 h-3 text-indigo-500" /> Method: Syntactic Irregularity + Jitter</li>
                                <li className="flex items-center gap-2 text-xs text-slate-300"><ArrowRight className="w-3 h-3 text-indigo-500" /> Goal: {'>'}95% Bypass Confidence</li>
                            </ul>
                        </div>
                        {benchmarkResult ? (
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 animate-in zoom-in duration-300">
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Stealth Efficiency</span>
                                    <span className={`text-2xl font-black ${benchmarkResult.status === 'PASS' ? 'text-emerald-400' : 'text-amber-400'}`}>{benchmarkResult.bypassEfficiency}%</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Raw AI Score</span>
                                        <span className="text-red-400 font-bold">{benchmarkResult.rawAiScore}%</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Stealth Score</span>
                                        <span className="text-emerald-400 font-bold">{benchmarkResult.stealthScore}%</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Latency</span>
                                        <span className="text-indigo-400">{benchmarkResult.latency}ms</span>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                            benchmarkResult.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            Global Compliance: {benchmarkResult.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-4 h-full opacity-40">
                                <Terminal className="w-8 h-8 mb-2" />
                                <span className="text-[10px] font-bold uppercase">Awaiting Protocol</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Logs Sidebar */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col h-[880px]">
                <div className="p-4 border-b border-slate-700">
                    <h3 className="text-sm font-bold uppercase text-slate-400">Activity Telemetry</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600">
                    {logs.map((log, i) => (
                        <div key={i} className="text-[10px] p-2 rounded bg-slate-900/50 border border-slate-700 font-mono">
                            <div className="flex justify-between items-center mb-1 text-slate-500">
                                <span className={log.type === 'ERROR' ? 'text-red-500' : log.type === 'BENCHMARK' ? 'text-purple-400' : 'text-indigo-400'}>{log.type}</span>
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-300 leading-tight">{log.details}</p>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-slate-600 text-xs italic text-center mt-10">No telemetry data available.</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
