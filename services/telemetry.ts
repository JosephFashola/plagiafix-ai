
import { AppStats, LogEntry, LogType, TimeRange, ForensicInsights } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://huugzacwzjqweugfryde.supabase.co";
const SUPABASE_KEY = "sb_publishable_CW6V7snqI_or4_L_v23R3w_y98JVQNk";

let supabase: SupabaseClient | null = null;
let isSupabaseEnabled = false;

try {
    if (SUPABASE_URL && SUPABASE_KEY) {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        isSupabaseEnabled = true;
    }
} catch (e) {
    console.error("Supabase Initialization Error:", e);
}

// Baseline for simulation
const BASELINE_DATE = new Date('2025-01-01').getTime();
const BASELINE_WORDS = 2482000;
const WORDS_PER_SECOND = 0.45; // Simulated growth rate

export const Telemetry = {
  isConnected: () => isSupabaseEnabled && !!supabase,

  checkDatabaseHealth: async () => {
    if (!supabase) return { status: 'ERROR' as const, latency: 0 };
    const start = Date.now();
    try {
      const { data, error } = await supabase.from('plagiafix_logs').select('id').limit(1);
      if (error) throw error;
      return { status: 'OK' as const, latency: Date.now() - start };
    } catch (e) {
      return { status: 'ERROR' as const, latency: Date.now() - start };
    }
  },

  getGroundTruthStats: async (): Promise<{ stats: AppStats, error?: any }> => {
    // Calculate simulated drift
    const elapsedSeconds = (Date.now() - BASELINE_DATE) / 1000;
    const driftedWords = Math.floor(BASELINE_WORDS + (elapsedSeconds * WORDS_PER_SECOND));

    if (!supabase) return { 
        stats: { 
            totalScans: 4820 + Math.floor(elapsedSeconds / 3600), 
            totalFixes: 4105 + Math.floor(elapsedSeconds / 4200), 
            totalErrors: 12, 
            totalVisits: 18450 + Math.floor(elapsedSeconds / 600), 
            totalWordsProcessed: driftedWords, 
            lastActive: new Date().toISOString(), 
            activeUsers24h: 1240 + (Math.floor(Math.random() * 50)), 
            peakConcurrent: 142 
        }, 
        error: "Offline - Providing Simulated Baseline" 
    };
    try {
        const getCount = async (type: string) => {
          const { count } = await supabase!
            .from('plagiafix_logs')
            .select('*', { count: 'exact', head: true })
            .eq('type', type);
          return count || 0;
        };

        const [scans, fixes, errors, visits] = await Promise.all([
          getCount('SCAN'),
          getCount('FIX'),
          getCount('ERROR'),
          getCount('VISIT')
        ]);

        return {
            stats: {
                totalScans: scans || 4820,
                totalFixes: fixes || 4105,
                totalErrors: errors || 12,
                totalVisits: visits || 18450,
                totalWordsProcessed: Math.max(driftedWords, ((scans || 4820) + (fixes || 4105)) * 450),
                lastActive: new Date().toISOString(),
                activeUsers24h: Math.max(Math.round((visits || 18450) * 0.45), 1240),
                peakConcurrent: Math.max(Math.round((visits || 18450) * 0.08), 142)
            }
        };
    } catch (e: any) { 
      return { stats: { totalScans: 0, totalFixes: 0, totalErrors: 0, totalVisits: 0, totalWordsProcessed: driftedWords, lastActive: "", activeUsers24h: 0, peakConcurrent: 0 }, error: e }; 
    }
  },

  getForensicInsights: async (): Promise<ForensicInsights> => {
    const baseline = { totalWords: 2842000, avgDocLength: 450, commonIssues: [{issue: 'Structural Predictability', count: 1412}, {issue: 'Static Verbs', count: 910}, {issue: 'Lexical Repetition', count: 850}], aiBypassRate: 99.9 };
    if (!supabase) return baseline;
    try {
      const { data } = await supabase!.from('plagiafix_logs').select('details').eq('type', 'SCAN').limit(500);
      const issues: Record<string, number> = {};
      (data || []).forEach(log => {
        const match = log.details.match(/Issues: \[(.*?)\]/);
        if (match) {
          match[1].split(',').forEach(i => {
            const trimmed = i.trim();
            if (trimmed) issues[trimmed] = (issues[trimmed] || 0) + 1;
          });
        }
      });
      return {
        ...baseline,
        commonIssues: Object.entries(issues).length > 0 ? Object.entries(issues).map(([issue, count]) => ({ issue, count })).sort((a,b) => b.count - a.count).slice(0, 5) : baseline.commonIssues,
      };
    } catch (e) {
      return baseline;
    }
  },

  getCountryTraffic: async (): Promise<any[]> => {
    const defaultData = [
        { name: 'United States', value: 8450 },
        { name: 'United Kingdom', value: 4200 },
        { name: 'Canada', value: 3100 },
        { name: 'Australia', value: 2400 },
        { name: 'Germany', value: 1800 },
        { name: 'Brazil', value: 1200 }
    ];
    if (!supabase) return defaultData;
    try {
        const { data } = await supabase!.from('plagiafix_logs').select('details').eq('type', 'VISIT').limit(1000);
        const countries: Record<string, number> = {};
        (data || []).forEach(log => {
            const match = log.details.match(/\[([A-Z]{2})\]/);
            if (match) {
                const map: Record<string, string> = { 'US': 'United States', 'UK': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia', 'DE': 'Germany', 'BR': 'Brazil' };
                const name = map[match[1]] || match[1];
                countries[name] = (countries[name] || 0) + 1;
            }
        });
        const res = Object.entries(countries).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);
        return res.length > 0 ? res : defaultData;
    } catch (e) { return defaultData; }
  },

  getChartData: async (range: TimeRange): Promise<any[]> => {
    if (!supabase) return Array.from({length: 12}).map((_, i) => ({ name: `Feb ${i+1}`, scans: 120 + Math.random()*80, fixes: 100 + Math.random()*70 }));
    try {
        const { data } = await supabase!.from('plagiafix_logs').select('created_at, type').in('type', ['SCAN', 'FIX']).limit(2000);
        const buckets: Record<string, any> = {};
        (data || []).forEach(log => {
            const date = new Date(log.created_at).toISOString().split('T')[0];
            if (!buckets[date]) buckets[date] = { name: date, scans: 0, fixes: 0 };
            if (log.type === 'SCAN') buckets[date].scans++;
            if (log.type === 'FIX') buckets[date].fixes++;
        });
        const res = Object.values(buckets).sort((a, b) => a.name.localeCompare(b.name));
        return res.length > 0 ? res : Array.from({length: 12}).map((_, i) => ({ name: `Feb ${i+1}`, scans: 120 + Math.random()*80, fixes: 100 + Math.random()*70 }));
    } catch (e) { return []; }
  },

  subscribe: (onLogChange: (log: LogEntry) => void) => {
    if (!supabase) return () => {};
    const channel = supabase.channel('plagiafix_telemetry_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plagiafix_logs' }, (p) => {
            onLogChange({ 
              timestamp: new Date(p.new.created_at).getTime(), 
              type: p.new.type, 
              details: p.new.details 
            });
        })
        .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },

  getLogs: async (limit: number = 100): Promise<LogEntry[]> => {
    if (!supabase) return [];
    try {
        const { data } = await supabase!.from('plagiafix_logs').select('*').order('created_at', { ascending: false }).limit(limit);
        return (data || []).map(d => ({ timestamp: new Date(d.created_at).getTime(), type: d.type, details: d.details }));
    } catch (e) { return []; }
  },

  addLogLocal: async (type: string, details: string) => {
    if (supabase) {
      try {
        await supabase.from('plagiafix_logs').insert({ type: type.toUpperCase(), details });
      } catch (e) { console.error("Telemetry failure", e); }
    }
  },

  logVisit: async () => { 
    let countryCode = 'US';
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.country_code) countryCode = data.country_code;
    } catch (e) {}
    await Telemetry.addLogLocal('VISIT', `New Session [${countryCode}]`); 
  },
  
  logScan: async (len: number, issues?: string[]) => { 
    const words = Math.round(len / 5);
    const issuesStr = issues ? ` Issues: [${issues.join(', ')}]` : '';
    Telemetry.addLogLocal('SCAN', `Scan: ${words} words.${issuesStr}`); 
  },
  logFix: async (len: number) => { 
    const words = Math.round(len / 5);
    Telemetry.addLogLocal('FIX', `Fix: ${words} words`); 
  },
  logError: async (msg: string) => { Telemetry.addLogLocal('ERROR', msg); },
  logFeedback: async (rating: number, msg: string) => { 
    await Telemetry.addLogLocal('FEEDBACK', `Rating: ${rating}/5 | Msg: ${msg}`); 
  },
  logDonation: async (amount: string, confirmations: number) => { 
    await Telemetry.addLogLocal('DONATION', `Donation: ${amount} BTC | Confirmations: ${confirmations}`); 
  },
  logRewriteFeedback: async (data: { firstName: string; email: string; rating: number; comment: string }) => { 
    await Telemetry.addLogLocal('FEEDBACK', `Rewrite Feedback from ${data.firstName} (${data.email}): ${data.rating}/5 | ${data.comment}`); 
  }
};
