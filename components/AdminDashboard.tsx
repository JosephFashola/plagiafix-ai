
import React, { useEffect, useState } from 'react';
import { AppStats, LogEntry } from '../types';
import { Telemetry } from '../services/telemetry';
import { testGeminiConnection } from '../services/geminiService';
import { Activity, Users, Database, DollarSign, Clock, Wifi, WifiOff, Eye, Plug, X, RefreshCw, Globe2, Star, MessageSquare, Calendar, Filter, ServerCrash, CheckCircle2, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subValue: string }> = ({ icon, label, value, subValue }) => (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-indigo-500/50 transition-colors">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-700 rounded-lg shadow-inner">
                {icon}
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
                <p className="text-slate-500 text-xs mt-1">{subValue}</p>
            </div>
        </div>
    </div>
);

type TimeRange = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countryData, setCountryData] = useState<{name: string, value: number}[]>([]);
  const [chartData, setChartData] = useState<{name: string, scans: number, fixes: number}[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  
  // Date Filtering State
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Manual Connect State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualKey, setManualKey] = useState('');

  // Diagnostics State
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
      gemini: { status: 'PENDING' | 'OK' | 'ERROR', latency: number, msg?: string },
      database: { status: 'PENDING' | 'OK' | 'ERROR', latency: number, type: 'CLOUD' | 'LOCAL' }
  } | null>(null);

  // Process Logs to extract Metrics & Chart Data
  const processLogs = (currentLogs: LogEntry[], range: TimeRange) => {
      const countries: Record<string, number> = {};
      let totalRating = 0;
      let ratingCount = 0;
      
      // Chart Aggregation buckets
      const chartBuckets: Record<string, {scans: number, fixes: number}> = {};

      currentLogs.forEach(log => {
          // 1. Process Metadata
          if (log.type === 'VISIT' && log.details.includes('[')) {
              const match = log.details.match(/\[([A-Z]{2})\]/);
              if (match) {
                  const code = match[1];
                  countries[code] = (countries[code] || 0) + 1;
              }
          }
          if (log.type === 'FEEDBACK') {
              try {
                  const f = JSON.parse(log.details);
                  if (f.rating) {
                      totalRating += f.rating;
                      ratingCount++;
                  }
              } catch (e) { /* ignore */ }
          }

          // 2. Process Chart Data
          const date = new Date(log.timestamp);
          let key = '';
          
          if (range === 'TODAY') {
              // Group by Hour for Today
              key = date.toLocaleTimeString([], { hour: '2-digit', hour12: true }); 
          } else if (range === 'MONTH' || range === 'YEAR' || range === 'ALL') {
              // Group by Date (MM/DD)
              key = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          } else {
              // Week: Day Name
              key = date.toLocaleDateString([], { weekday: 'short' });
          }

          if (!chartBuckets[key]) chartBuckets[key] = { scans: 0, fixes: 0 };
          
          if (log.type === 'SCAN') chartBuckets[key].scans++;
          if (log.type === 'FIX') chartBuckets[key].fixes++;
      });
      
      // Transform Maps to Arrays
      const cData = Object.entries(countries)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5
      
      const processedChartData = Object.entries(chartBuckets)
          .map(([name, data]) => ({ name, ...data }))
          .reverse(); 

      setCountryData(cData);
      setChartData(processedChartData.length > 0 ? processedChartData : [{ name: 'No Activity', scans: 0, fixes: 0 }]);
      setAvgRating(ratingCount > 0 ? (totalRating / ratingCount) : 0);
  };

  const getRangeDates = () => {
      const now = new Date();
      let start = new Date();
      
      switch (timeRange) {
          case 'ALL':
              return { start: new Date(0), end: now }; // Epoch (1970) to Now
          case 'TODAY':
              start.setHours(0, 0, 0, 0);
              break;
          case 'WEEK':
              start.setDate(now.getDate() - 7);
              break;
          case 'MONTH':
              start.setMonth(now.getMonth() - 1);
              break;
          case 'YEAR':
              start.setFullYear(now.getFullYear() - 1);
              break;
          case 'CUSTOM':
              if (customStart) start = new Date(customStart);
              if (customEnd) now.setTime(new Date(customEnd).getTime() + 86399900); // End of day
              break;
          default:
              return null;
      }
      return { start, end: now };
  };

  const refreshData = async () => {
      setIsRefreshing(true);
      try {
          const globalMeta = await Telemetry.getStats(true).catch(() => null);
          const dates = getRangeDates();
          if (dates) {
              const rangeStats = await Telemetry.getRangeStats(dates.start, dates.end);
              
              // @ts-ignore
              setStats({
                  totalScans: rangeStats.totalScans || 0,
                  totalFixes: rangeStats.totalFixes || 0,
                  totalErrors: rangeStats.totalErrors || 0,
                  totalVisits: rangeStats.totalVisits || 0,
                  tokensUsedEstimate: rangeStats.tokensUsedEstimate || 0,
                  lastActive: rangeStats.lastActive || new Date().toISOString(),
                  firstActive: globalMeta?.firstActive // Use real deployment date
              });

              // Fetch MORE logs (500) to populate the chart better
              const rangeLogs = await Telemetry.getLogs(500, dates.start, dates.end);
              setLogs(rangeLogs);
              processLogs(rangeLogs, timeRange);
          }
      } catch (error) {
          console.warn("Failed to refresh admin data:", error);
          if (!stats) {
              toast.error("Could not fetch data. Check connection.");
          }
      }
      
      setIsCloudConnected(Telemetry.isConnected());
      setIsRefreshing(false);
  };

  const runDiagnostics = async () => {
      setIsTesting(true);
      setTestResults({
          gemini: { status: 'PENDING', latency: 0 },
          database: { status: 'PENDING', latency: 0, type: Telemetry.isConnected() ? 'CLOUD' : 'LOCAL' }
      });

      // 1. Gemini Test
      const geminiRes = await testGeminiConnection();
      
      // 2. DB Test
      const startDb = Date.now();
      await Telemetry.getStats(false); // Quick fetch
      const dbLatency = Date.now() - startDb;

      setTestResults({
          gemini: { status: geminiRes.status, latency: geminiRes.latency, msg: geminiRes.message },
          database: { status: 'OK', latency: dbLatency, type: Telemetry.isConnected() ? 'CLOUD' : 'LOCAL' }
      });
      setIsTesting(false);
      
      if (geminiRes.status === 'OK') {
          toast.success("All systems operational");
      } else {
          toast.error("System health degraded");
      }
  };

  useEffect(() => {
      refreshData();
  }, [timeRange, customStart, customEnd]);

  useEffect(() => {
    if (timeRange !== 'ALL' && timeRange !== 'TODAY') return;

    const unsubscribe = Telemetry.subscribe(
        (newStats) => {},
        (newLog) => {
            setLogs(prev => {
                const updated = [newLog, ...prev].slice(0, 500); // Keep buffer larger
                processLogs(updated, timeRange);
                return updated;
            });

            setStats(prev => {
                if (!prev) return prev;
                const next = { ...prev };
                if (newLog.type === 'SCAN') {
                    next.totalScans++;
                    next.tokensUsedEstimate += 2500; 
                }
                if (newLog.type === 'FIX') {
                    next.totalFixes++;
                    next.tokensUsedEstimate += 2000;
                }
                if (newLog.type === 'ERROR') next.totalErrors++;
                if (newLog.type === 'VISIT') next.totalVisits++;
                return next;
            });
        }
    );

    return () => {
        unsubscribe();
    };
  }, [timeRange]);

  const handleConnect = () => {
      if (!manualUrl || !manualKey) {
          toast.error("Please enter both URL and Key");
          return;
      }
      Telemetry.saveCredentials(manualUrl, manualKey);
      setShowConnectModal(false);
      toast.success("Credentials saved. Reloading...");
  };

  if (!stats) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="animate-spin h-5 w-5" /> Connecting to Global Telemetry...
      </div>
  );

  const estimatedCost = (stats.tokensUsedEstimate / 1000000) * 5;

  const dateLabel = timeRange === 'ALL' 
    ? (stats.firstActive ? new Date(stats.firstActive).toLocaleDateString() : 'Unknown')
    : getRangeDates()?.start.toLocaleDateString() + ' - ' + getRangeDates()?.end.toLocaleDateString();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-8 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-700 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
              Global Lifecycle Metrics
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {timeRange === 'ALL' ? 'Tracking since deployment: ' : 'Period: '} 
                <span className="text-indigo-400 font-semibold">{dateLabel}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
                {(['ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            timeRange === r 
                            ? 'bg-indigo-600 text-white shadow-lg' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        {r === 'ALL' ? 'All Time' : r === 'TODAY' ? '24H' : r === 'WEEK' ? '7D' : r === 'MONTH' ? '30D' : 'Custom'}
                    </button>
                ))}
             </div>
             
             {/* Custom Date Inputs */}
             {timeRange === 'CUSTOM' && (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                     <input 
                        type="date" 
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                     />
                     <span className="text-slate-500">-</span>
                     <input 
                        type="date" 
                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none focus:border-indigo-500"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                     />
                 </div>
             )}

             <div className="text-right">
                {isCloudConnected ? (
                    <div className="flex items-center gap-3 justify-end">
                        <div className={`flex items-center gap-2 text-sm font-semibold ${timeRange === 'ALL' ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {timeRange === 'ALL' ? (
                                <>
                                    <Wifi className="w-4 h-4" />
                                    <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    Live Stream
                                </>
                            ) : (
                                <><Filter className="w-3 h-3" /> Historical View</>
                            )}
                        </div>
                        <button 
                            onClick={() => refreshData()}
                            className={`p-1 hover:bg-slate-800 rounded transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Force Refresh"
                        >
                            <RefreshCw className="w-4 h-4 text-slate-400 hover:text-white" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                            <WifiOff className="w-4 h-4" />
                            <span>Local Storage (Offline)</span>
                        </div>
                        <button 
                            onClick={() => setShowConnectModal(true)}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded transition-colors"
                        >
                            <Plug className="w-3 h-3" />
                            Connect
                        </button>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard 
            icon={<Users className="text-blue-400" />}
            label={timeRange === 'ALL' ? "Lifetime Scans" : "Scans in Period"}
            value={stats.totalScans.toLocaleString()}
            subValue="Documents processed"
          />
           <StatCard 
            icon={<Eye className="text-orange-400" />}
            label="Total Visits"
            value={stats.totalVisits ? stats.totalVisits.toLocaleString() : (logs.filter(l => l.type === 'VISIT').length + '+')}
            subValue={timeRange === 'ALL' ? "All-time traffic" : "Traffic in period"}
          />
          <StatCard 
            icon={<Database className="text-purple-400" />}
            label="Total Fixes"
            value={stats.totalFixes.toLocaleString()}
            subValue="Rewrite operations"
          />
          <StatCard 
            icon={<Star className="text-yellow-400 fill-yellow-400" />}
            label="Satisfaction"
            value={avgRating > 0 ? avgRating.toFixed(1) : '-'}
            subValue={avgRating > 0 ? 'Avg. Rating' : 'No ratings yet'}
          />
          <StatCard 
            icon={<DollarSign className="text-emerald-400" />}
            label="Est. Cost"
            value={`$${estimatedCost.toFixed(4)}`}
            subValue={`${(stats.tokensUsedEstimate / 1000).toFixed(1)}k tokens`}
          />
        </div>

        {/* Main Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart & Diagnostics */}
          <div className="lg:col-span-2 space-y-8">
             {/* Diagnostics Panel (Daily Test) */}
             <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-400" />
                        System Diagnostics
                    </h3>
                    <button 
                        onClick={runDiagnostics}
                        disabled={isTesting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Run Daily Health Check
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                     {/* API Health */}
                     <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-slate-400 text-xs font-bold uppercase">Gemini Engine</span>
                             {testResults?.gemini.status === 'OK' && <span className="text-emerald-400 text-xs font-bold">OPERATIONAL</span>}
                             {testResults?.gemini.status === 'ERROR' && <span className="text-red-400 text-xs font-bold">ERROR</span>}
                         </div>
                         <div className="flex items-baseline gap-2">
                             <span className="text-2xl font-bold text-white">{testResults ? testResults.gemini.latency : '-'}</span>
                             <span className="text-xs text-slate-500">ms latency</span>
                         </div>
                         {testResults?.gemini.msg && <p className="text-xs text-red-400 mt-2">{testResults.gemini.msg}</p>}
                     </div>

                     {/* DB Health */}
                     <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-slate-400 text-xs font-bold uppercase">Telemetry DB</span>
                             {testResults?.database.status === 'OK' && <span className="text-emerald-400 text-xs font-bold">CONNECTED ({testResults.database.type})</span>}
                         </div>
                         <div className="flex items-baseline gap-2">
                             <span className="text-2xl font-bold text-white">{testResults ? testResults.database.latency : '-'}</span>
                             <span className="text-xs text-slate-500">ms latency</span>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Usage Trend */}
             <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    Usage Snapshot
                    <span className="text-xs font-normal text-slate-400 bg-slate-700 px-2 py-1 rounded">Activity</span>
                </h3>
                {/* Explicit container with min-width and min-height to fix Recharts error */}
                <div style={{ height: '250px', width: '100%', minWidth: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorFixes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="scans" stroke="#6366f1" fillOpacity={1} fill="url(#colorScans)" />
                        <Area type="monotone" dataKey="fixes" stroke="#a855f7" fillOpacity={1} fill="url(#colorFixes)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Geo Location */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Globe2 className="w-5 h-5 text-indigo-400" />
                    Traffic by Country (Top 5)
                </h3>
                {/* Explicit container with min-width and min-height to fix Recharts error */}
                <div style={{ height: '200px', width: '100%', minWidth: '300px' }}>
                 {countryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countryData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                            <XAxis type="number" stroke="#94a3b8" hide />
                            <YAxis dataKey="name" type="category" stroke="#fff" width={40} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                                cursor={{fill: '#334155'}}
                            />
                            <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]}>
                                {countryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][index % 5]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 ) : (
                     <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                         No location data collected yet.
                     </div>
                 )}
                </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg flex flex-col h-[600px]">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    {timeRange === 'ALL' ? 'Live Activity Log' : 'Historical Logs'}
                 </h3>
                 {timeRange === 'ALL' && (
                    <span className="inline-flex relative h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                 )}
             </div>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                {logs.length === 0 && (
                    <div className="text-slate-500 text-center py-10">No logs found for this period.</div>
                )}
                {logs.map((log, i) => {
                    let feedbackContent = null;
                    if (log.type === 'FEEDBACK') {
                        try {
                            const f = JSON.parse(log.details);
                            feedbackContent = (
                                <div className="mt-1 bg-slate-800 p-2 rounded border border-slate-600">
                                    <div className="flex gap-1 mb-1">
                                        {[...Array(5)].map((_, idx) => (
                                            <Star key={idx} className={`w-3 h-3 ${idx < f.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                                        ))}
                                    </div>
                                    <p className="text-slate-300 italic">"{f.comment}"</p>
                                </div>
                            );
                        } catch(e) {}
                    }

                    return (
                        <div key={i} className="text-sm p-3 rounded bg-slate-700/50 border border-slate-700 flex flex-col gap-1 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex justify-between items-center">
                                <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                                    log.type === 'ERROR' ? 'bg-red-500/20 text-red-300' : 
                                    log.type === 'FIX' ? 'bg-purple-500/20 text-purple-300' : 
                                    log.type === 'VISIT' ? 'bg-orange-500/20 text-orange-300' :
                                    log.type === 'FEEDBACK' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-blue-500/20 text-blue-300'
                                }`}>
                                    {log.type}
                                </span>
                                <span className="text-slate-500 text-xs">
                                    {new Date(log.timestamp).toLocaleTimeString()} {timeRange !== 'TODAY' && timeRange !== 'ALL' && <span className="text-slate-600 ml-1">({new Date(log.timestamp).toLocaleDateString()})</span>}
                                </span>
                            </div>
                            {log.type === 'FEEDBACK' ? feedbackContent : (
                                <p className="text-slate-300 truncate">{log.details}</p>
                            )}
                        </div>
                    );
                })}
             </div>
          </div>
        </div>

        {/* Manual Connect Modal */}
        {showConnectModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl relative">
                  <button 
                    onClick={() => setShowConnectModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                  >
                      <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Database className="text-indigo-500" />
                      Connect to Supabase
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                      Since environment variables can be tricky, you can paste your credentials here directly. They will be saved securely in your browser's local storage.
                  </p>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-sm focus:border-indigo-500 outline-none"
                            placeholder="https://xyz.supabase.co"
                            value={manualUrl}
                            onChange={e => setManualUrl(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key (Anon Public)</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-sm focus:border-indigo-500 outline-none"
                            placeholder="eyJh..."
                            value={manualKey}
                            onChange={e => setManualKey(e.target.value)}
                          />
                      </div>
                      <button 
                        onClick={handleConnect}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg mt-2 transition-colors"
                      >
                          Save & Connect
                      </button>
                  </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
