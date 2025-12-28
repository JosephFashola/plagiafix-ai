
import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, AlertCircle, RefreshCw, Zap, 
  Terminal, ShieldCheck, Cpu, Database, Mic, 
  MessageSquare, Send, Heart, Star, Activity, Loader2
} from 'lucide-react';
import { testGeminiConnection } from '../services/geminiService';
import { Telemetry } from '../services/telemetry';
import toast from 'react-hot-toast';

interface HealthCheckModalProps {
  onClose: () => void;
}

type HealthStatus = 'checking' | 'healthy' | 'degraded' | 'critical';

const HealthCheckModal: React.FC<HealthCheckModalProps> = ({ onClose }) => {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState({
    neural: { status: 'pending', latency: 0 },
    telemetry: { status: 'pending', latency: 0 },
    storage: { status: 'pending' },
    acoustic: { status: 'pending' }
  });

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-5), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runDiagnostics = async () => {
    setStatus('checking');
    addLog("Initiating Forensic Diagnostic Protocol...");
    
    // 1. Neural Check
    addLog("Pinging Neural Pulse (Gemini)...");
    const geminiRes = await testGeminiConnection();
    const neuralStatus = geminiRes.status === 'OK' ? 'healthy' : 'critical';
    setResults(prev => ({ ...prev, neural: { status: neuralStatus, latency: geminiRes.latency } }));
    addLog(`Neural Link: ${neuralStatus.toUpperCase()} (${geminiRes.latency}ms)`);

    // 2. Telemetry Check
    addLog("Checking Telemetry Bridge (Supabase)...");
    const dbStatus = await Telemetry.checkDatabaseHealth();
    const teleStatus = dbStatus.status === 'OK' ? 'healthy' : 'degraded';
    setResults(prev => ({ ...prev, telemetry: { status: teleStatus, latency: dbStatus.latency } }));
    addLog(`Telemetry Bridge: ${teleStatus.toUpperCase()}`);

    // 3. Storage Check
    addLog("Auditing Forensic Storage...");
    const storageStatus = typeof localStorage !== 'undefined' ? 'healthy' : 'critical';
    setResults(prev => ({ ...prev, storage: { status: storageStatus } }));
    addLog(`Storage Audit: ${storageStatus.toUpperCase()}`);

    // 4. Acoustic Check
    addLog("Verifying Acoustic Buffer (Microphone)...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setResults(prev => ({ ...prev, acoustic: { status: 'healthy' } }));
      addLog("Acoustic Buffer: ONLINE");
    } catch (e) {
      setResults(prev => ({ ...prev, acoustic: { status: 'degraded' } }));
      addLog("Acoustic Buffer: OFFLINE (Check Permissions)");
    }

    const overall = neuralStatus === 'critical' ? 'critical' : (teleStatus === 'degraded' || results.acoustic.status === 'degraded') ? 'degraded' : 'healthy';
    setStatus(overall);
    addLog(`Audit Complete. Overall Status: ${overall.toUpperCase()}`);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      await Telemetry.logFeedback(rating, feedback);
      toast.success("Feedback Securely Transmitted");
      setFeedback('');
      setTimeout(onClose, 1000);
    } catch (e) {
      toast.error("Transmission Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in duration-300">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${status === 'healthy' ? 'bg-emerald-100 text-emerald-600' : status === 'degraded' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter font-heading">System Health</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Forensic Integrity Audit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Diagnostic Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'neural', label: 'Neural Pulse', icon: <Cpu />, info: `${results.neural.latency}ms` },
              { id: 'telemetry', label: 'Telemetry', icon: <Database />, info: results.telemetry.status === 'healthy' ? 'Linked' : 'Offline' },
              { id: 'storage', label: 'Storage', icon: <RefreshCw />, info: 'Persistent' },
              { id: 'acoustic', label: 'Acoustic', icon: <Mic />, info: results.acoustic.status === 'healthy' ? 'Active' : 'Blocked' }
            ].map(item => (
              <div key={item.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-slate-400 ${(results as any)[item.id].status === 'healthy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {React.cloneElement(item.icon as React.ReactElement, { className: "w-4 h-4" })}
                  </div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.label}</span>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase">{item.info}</span>
              </div>
            ))}
          </div>

          {/* Forensic Logs */}
          <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] space-y-1.5 text-indigo-300 h-32 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <Terminal className="w-4 h-4" />
            </div>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
            {status === 'checking' && <div className="animate-pulse">_</div>}
          </div>

          {/* Feedback Matrix */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2 font-heading">
              <MessageSquare className="w-4 h-4 text-indigo-600" /> Feedback Matrix
            </h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine Experience</p>
                 <div className="flex gap-1">
                   {[1, 2, 3, 4, 5].map(star => (
                     <button key={star} onClick={() => setRating(star)} className={`p-1 transition-all ${rating >= star ? 'text-amber-400' : 'text-slate-200'}`}>
                        <Star className={`w-5 h-5 ${rating >= star ? 'fill-current' : ''}`} />
                     </button>
                   ))}
                 </div>
              </div>
              <textarea 
                className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 resize-none font-medium text-sm text-slate-800 placeholder:text-slate-400"
                placeholder="How can we improve the forensic bypass engine? report anomalies or request features..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button 
                onClick={handleFeedbackSubmit}
                disabled={isSubmitting || !feedback.trim()}
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 font-heading"
              >
                {/* Loader2 added to imports to resolve undefined component error */}
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Submit Feedback
              </button>
            </div>
          </div>

        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-3">
          <Heart className="w-3 h-3 text-rose-500 fill-current" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Designed for Modern Academia</span>
        </div>
      </div>
    </div>
  );
};

export default HealthCheckModal;
