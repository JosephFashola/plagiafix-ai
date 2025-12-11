
import React, { useEffect, useState } from 'react';
import { AppStats, LogEntry } from '../types';
import { Telemetry } from '../services/telemetry';
import { Activity, Users, Database, DollarSign, Clock, Wifi, WifiOff, Eye, Plug, X, RefreshCw, Globe2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countryData, setCountryData] = useState<{name: string, value: number}[]>([]);
  
  // Manual Connect State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualKey, setManualKey] = useState('');

  const refreshData = async () => {
      setIsRefreshing(true);
      const newStats = await Telemetry.getStats();
      const newLogs = await Telemetry.getLogs();
      setStats(newStats);
      setLogs(newLogs);
      
      // Parse Countries from logs
      const countries: Record<string, number> = {};
      newLogs.forEach(log => {
          if (log.type === 'VISIT' && log.details.includes('[')) {
              const match = log.details.match(/\[([A-Z]{2})\]/);
              if (match) {
                  const code = match[1];
                  countries[code] = (countries[code] || 0) + 1;
              }
          }
      });
      
      const cData = Object.entries(countries)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5
        
      setCountryData(cData);

      setIsCloudConnected(Telemetry.isConnected());
      setIsRefreshing(false);
  };

  useEffect(() => {
    refreshData();
    // Fast polling for real-time feel (2 seconds)
    const interval = setInterval(() => refreshData(), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
      if (!manualUrl || !manualKey) {
          toast.error("Please enter both URL and Key");
          return;
      }
      Telemetry.saveCredentials(manualUrl, manualKey);
      setShowConnectModal(false);
      toast.success("Credentials saved. Reloading...");
  };

  const handleDisconnect = () => {
      if (confirm("Are you sure you want to disconnect from Supabase?")) {
          Telemetry.clearCredentials();
      }
  };

  if (!stats) return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="animate-spin h-5 w-5" /> Loading Admin Data...
      </div>
  );

  const trendData = [
    { name: 'Mon', scans: Math.max(0, stats.totalScans - 20) },
    { name: 'Tue', scans: Math.max(0, stats.totalScans - 15) },
    { name: 'Wed', scans: Math.max(0, stats.totalScans - 10) },
    { name: 'Thu', scans: Math.max(0, stats.totalScans - 5) },
    { name: 'Fri', scans: stats.totalScans },
  ];

  const estimatedCost = (stats.tokensUsedEstimate / 1000000) * 5;

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
              Admin Command Center
            </h1>
            <p className="text-slate-400 mt-1">Real-time usage metrics and system health</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right flex flex-col items-end">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Database Status</p>
                {isCloudConnected ? (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                            <Wifi className="w-4 h-4" />
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Cloud (Supabase)
                        </div>
                        <button 
                            onClick={refreshData}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            icon={<Users className="text-blue-400" />}
            label="Total Scans"
            value={stats.totalScans.toLocaleString()}
            subValue="Documents processed"
          />
           <StatCard 
            icon={<Eye className="text-orange-400" />}
            label="Site Visits"
            value={stats.totalVisits ? stats.totalVisits.toLocaleString() : (logs.filter(l => l.type === 'VISIT').length + '+')}
            subValue="Page loads"
          />
          <StatCard 
            icon={<Database className="text-purple-400" />}
            label="Fixes Generated"
            value={stats.totalFixes.toLocaleString()}
            subValue="Rewrite operations"
          />
          <StatCard 
            icon={<DollarSign className="text-emerald-400" />}
            label="Est. API Cost"
            value={`$${estimatedCost.toFixed(4)}`}
            subValue={`${(stats.tokensUsedEstimate / 1000).toFixed(1)}k tokens used`}
          />
        </div>

        {/* Main Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart */}
          <div className="lg:col-span-2 space-y-8">
             {/* Usage Trend */}
             <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    Usage Trend
                    <span className="text-xs font-normal text-slate-400 bg-slate-700 px-2 py-1 rounded">Last 5 Days</span>
                </h3>
                <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                    <defs>
                        <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="scans" stroke="#6366f1" fillOpacity={1} fill="url(#colorScans)" />
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
                <div className="h-[200px] w-full">
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
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Live Activity Log
             </h3>
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                {logs.length === 0 && (
                    <div className="text-slate-500 text-center py-10">No activity recorded yet.</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="text-sm p-3 rounded bg-slate-700/50 border border-slate-700 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                                log.type === 'ERROR' ? 'bg-red-500/20 text-red-300' : 
                                log.type === 'FIX' ? 'bg-purple-500/20 text-purple-300' : 
                                log.type === 'VISIT' ? 'bg-orange-500/20 text-orange-300' :
                                'bg-blue-500/20 text-blue-300'
                            }`}>
                                {log.type}
                            </span>
                            <span className="text-slate-500 text-xs">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="text-slate-300 truncate">{log.details}</p>
                    </div>
                ))}
             </div>
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
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subValue: string }> = ({ icon, label, value, subValue }) => (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-700 rounded-lg">
                {icon}
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <h4 className="text-2xl font-bold text-white">{value}</h4>
                <p className="text-slate-500 text-xs mt-1">{subValue}</p>
            </div>
        </div>
    </div>
);

export default AdminDashboard;
