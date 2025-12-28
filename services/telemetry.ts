import { AppStats, LogEntry, LogType, TimeRange, RewriteFeedback } from '../types';
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

export const Telemetry = {
  isConnected: () => isSupabaseEnabled && !!supabase,

  logRewriteFeedback: async (feedback: RewriteFeedback) => {
    if (!supabase) return;
    try {
      // Log to general logs for audit
      await Telemetry.addLogLocal('REWRITE_QUALITY', `Rating: ${feedback.rating}/5 from ${feedback.firstName} (${feedback.email})`);
      
      // Log to dedicated feedback table
      const { error } = await supabase.from('plagiafix_feedback').insert({
        first_name: feedback.firstName,
        email: feedback.email,
        rating: feedback.rating,
        comment: feedback.comment,
        original_score: feedback.originalScore,
        fixed_score: feedback.fixedScore
      });
      
      if (error) throw error;
    } catch (e) {
      console.error("Feedback logging failed:", e);
      throw e;
    }
  },

  getGroundTruthStats: async (): Promise<{ stats: AppStats, error?: any }> => {
    if (!supabase) return { stats: { totalScans: 0, totalFixes: 0, totalErrors: 0, totalVisits: 0, tokensUsedEstimate: 0, lastActive: "" }, error: "Offline" };
    try {
        const { data, error } = await supabase.from('plagiafix_logs').select('type');
        if (error) return { stats: { totalScans: 0, totalFixes: 0, totalErrors: 0, totalVisits: 0, tokensUsedEstimate: 0, lastActive: "" }, error };
        
        const counts: Record<string, number> = {};
        (data || []).forEach(row => {
            const t = (row.type || 'UNKNOWN').toUpperCase();
            counts[t] = (counts[t] || 0) + 1;
        });

        return {
            stats: {
                totalScans: counts['SCAN'] || 0,
                totalFixes: counts['FIX'] || 0,
                totalErrors: counts['ERROR'] || 0,
                totalVisits: counts['VISIT'] || 0,
                tokensUsedEstimate: ((counts['SCAN'] || 0) * 15000) + ((counts['FIX'] || 0) * 25000),
                lastActive: new Date().toISOString()
            }
        };
    } catch (e: any) { return { stats: { totalScans: 0, totalFixes: 0, totalErrors: 0, totalVisits: 0, tokensUsedEstimate: 0, lastActive: "" }, error: e }; }
  },

  getDatabaseInventory: async (): Promise<{ totalRows: number, typeBreakdown: Record<string, number>, error?: any }> => {
      if (!supabase) return { totalRows: 0, typeBreakdown: {}, error: "Offline" };
      try {
          const { data, error } = await supabase.from('plagiafix_logs').select('type');
          if (error) return { totalRows: 0, typeBreakdown: {}, error };
          const breakdown: Record<string, number> = {};
          (data || []).forEach(row => {
              const t = row.type || 'UNDEFINED';
              breakdown[t] = (breakdown[t] || 0) + 1;
          });
          return { totalRows: data?.length || 0, typeBreakdown: breakdown };
      } catch (e: any) { return { totalRows: 0, typeBreakdown: {}, error: e }; }
  },

  getRawSample: async (): Promise<{ data: any[], error?: any }> => {
      if (!supabase) return { data: [], error: "Offline" };
      try {
          const { data, error } = await supabase.from('plagiafix_logs').select('*').order('created_at', { ascending: false }).limit(10);
          return { data: data || [], error };
      } catch (e: any) { return { data: [], error: e }; }
  },

  checkDatabaseHealth: async (): Promise<{ status: 'OK' | 'ERROR' | 'RLS_RESTRICTED', latency: number, errorObj?: any }> => {
    if (!supabase) return { status: 'ERROR', latency: 0 };
    const start = Date.now();
    try {
        const { error } = await supabase.from('plagiafix_logs').select('id').limit(1);
        if (error) {
             if (error.code === '42501') return { status: 'RLS_RESTRICTED', latency: Date.now() - start, errorObj: error };
             return { status: 'ERROR', latency: 0, errorObj: error };
        }
        return { status: 'OK', latency: Date.now() - start };
    } catch (e: any) { return { status: 'ERROR', latency: 0, errorObj: e }; }
  },

  subscribe: (onLogChange: (log: LogEntry) => void) => {
    if (!supabase) return () => {};
    const channel = supabase.channel('realtime_v6')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plagiafix_logs' }, (p) => {
            onLogChange({ timestamp: Date.now(), type: p.new.type, details: p.new.details });
        })
        .subscribe();
    return () => { supabase?.removeChannel(channel); };
  },

  getStats: async (): Promise<AppStats> => (await Telemetry.getGroundTruthStats()).stats,

  getLogs: async (limit: number = 100): Promise<LogEntry[]> => {
    if (!supabase) return [];
    try {
        const { data } = await supabase.from('plagiafix_logs').select('*').order('created_at', { ascending: false }).limit(limit);
        return (data || []).map(d => ({ timestamp: new Date(d.created_at).getTime(), type: d.type, details: d.details }));
    } catch (e) { return []; }
  },

  getChartData: async (range: TimeRange): Promise<any[]> => {
    if (!supabase) return [];
    try {
        const { data } = await supabase.from('plagiafix_logs').select('created_at, type');
        if (!data) return [];
        const buckets: Record<string, any> = {};
        data.forEach(log => {
            const key = log.created_at.split('T')[0];
            if (!buckets[key]) buckets[key] = { name: key, scans: 0, fixes: 0 };
            if (log.type === 'SCAN') buckets[key].scans++;
            if (log.type === 'FIX') buckets[key].fixes++;
        });
        return Object.values(buckets).sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) { return []; }
  },

  getCountryTraffic: async (): Promise<any[]> => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('plagiafix_logs').select('details').eq('type', 'VISIT');
        if (error || !data) return [];
        const countries: Record<string, number> = {};
        data.forEach(log => {
            const match = log.details.match(/\[([A-Z]{2})\]/);
            if (match) {
                const code = match[1];
                // Fix: 'counts' was not defined in this scope, changed to 'countries'
                countries[code] = (countries[code] || 0) + 1;
            }
        });
        return Object.entries(countries)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    } catch (e) { return []; }
  },

  addLogLocal: async (type: string, details: string) => {
    if (supabase) await supabase.from('plagiafix_logs').insert({ type: type.toUpperCase(), details });
  },

  seedDemoData: async () => {
    if (supabase) {
        const mockCountries = ['US', 'US', 'US', 'GB', 'GB', 'CA', 'AU', 'DE', 'FR', 'IN', 'JP', 'BR', 'ZA', 'SG'];
        for(let i=0; i<30; i++) {
            const randomCountry = mockCountries[Math.floor(Math.random() * mockCountries.length)];
            await Telemetry.addLogLocal('VISIT', `Simulation Session [${randomCountry}]`);
        }
        for(let i=0; i<8; i++) await Telemetry.addLogLocal('SCAN', 'Historical Scan Simulation');
        for(let i=0; i<5; i++) await Telemetry.addLogLocal('FIX', 'Historical Fix Simulation');
    }
  },

  clearLogs: async () => { if (supabase) await supabase.from('plagiafix_logs').delete().neq('id', 0); },
  
  logVisit: async () => { 
    let countryCode = 'Unknown';
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code) countryCode = data.country_code;
    } catch (e) {
        console.warn("Geo-Location lookup skipped or blocked.");
    }
    await Telemetry.addLogLocal('VISIT', `New Session [${countryCode}]`); 
  },
  
  logScan: async (len: number) => { Telemetry.addLogLocal('SCAN', `Scan: ${len} chars`); },
  logFix: async (len: number) => { Telemetry.addLogLocal('FIX', `Fix: ${len} chars`); },
  logError: async (msg: string) => { Telemetry.addLogLocal('ERROR', msg); },
  logShare: async (platform: string) => { Telemetry.addLogLocal('SHARE', `Shared results to ${platform}`); },
  
  logFeedback: async (rating: number, msg: string) => { 
    await Telemetry.addLogLocal('FEEDBACK', `Rating: ${rating}/5 | Msg: ${msg}`); 
  }
};