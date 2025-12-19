
import { AppStats, LogEntry, LogType } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const HARDCODED_SUPABASE_URL = "https://huugzacwzjqweugfryde.supabase.co";
const HARDCODED_SUPABASE_KEY = "sb_publishable_CW6V7snqI_or4_L_v23R3w_y98JVQNk";

const STATS_KEY = 'plagiafix_stats';
const LOGS_KEY = 'plagiafix_logs';

let supabase: SupabaseClient | null = null;
let isSupabaseEnabled = false;

const initSupabase = () => {
    if (HARDCODED_SUPABASE_URL && HARDCODED_SUPABASE_KEY) {
        try {
            supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);
            isSupabaseEnabled = true;
        } catch (e) {
            isSupabaseEnabled = false;
        }
    }
};

initSupabase();

export const Telemetry = {
  isConnected: () => isSupabaseEnabled && !!supabase,

  subscribe: (onLogChange: (log: LogEntry) => void) => {
    if (!isSupabaseEnabled || !supabase) return () => {};
    const channel = supabase.channel('realtime_admin_v2')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plagiafix_logs' }, (payload) => {
            const d = payload.new;
            onLogChange({ timestamp: new Date(d.created_at).getTime(), type: d.type, details: d.details });
        })
        .subscribe();
    return () => { if (supabase) supabase.removeChannel(channel); };
  },

  getStats: async (strictGlobalMode = false): Promise<AppStats> => {
    if (isSupabaseEnabled && supabase) {
        try {
            const { data, error } = await supabase.from('plagiafix_stats').select('*').eq('id', 1).single();
            if (!error && data) {
                return {
                    totalScans: data.total_scans || 0,
                    totalFixes: data.total_fixes || 0,
                    totalErrors: data.total_errors || 0,
                    totalVisits: data.total_visits || 0, 
                    totalSlides: data.total_slides || 0,
                    tokensUsedEstimate: data.tokens_used || 0,
                    lastActive: data.updated_at,
                    firstActive: data.created_at
                };
            }
        } catch (e) {}
    }
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{"totalScans":0,"totalFixes":0,"totalErrors":0,"totalVisits":0,"totalSlides":0,"tokensUsedEstimate":0,"lastActive":""}');
  },

  getLogs: async (limit = 100): Promise<LogEntry[]> => {
    if (isSupabaseEnabled && supabase) {
        try {
            const { data, error } = await supabase.from('plagiafix_logs').select('*').order('created_at', { ascending: false }).limit(limit);
            if (!error && data) return data.map((d: any) => ({ timestamp: new Date(d.created_at).getTime(), type: d.type as LogType, details: d.details }));
        } catch (e) {}
    }
    return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
  },

  updateSupabaseStats: async (updates: any) => {
      if (!isSupabaseEnabled || !supabase) return;
      try {
        const { data: current } = await supabase.from('plagiafix_stats').select('*').eq('id', 1).single();
        const newStats = {
            total_scans: (current?.total_scans || 0) + (updates.total_scans || 0),
            total_fixes: (current?.total_fixes || 0) + (updates.total_fixes || 0),
            total_errors: (current?.total_errors || 0) + (updates.total_errors || 0),
            total_slides: (current?.total_slides || 0) + (updates.total_slides || 0),
            total_visits: (current?.total_visits || 0) + (updates.total_visits || 0),
            tokens_used: (current?.tokens_used || 0) + (updates.tokens_used || 0),
            updated_at: new Date().toISOString()
        };
        if (current) await supabase.from('plagiafix_stats').update(newStats).eq('id', 1);
        else await supabase.from('plagiafix_stats').insert({ id: 1, ...newStats });
      } catch (e) {}
  },

  addLogLocal: async (type: LogType, details: string) => {
    if (isSupabaseEnabled && supabase) {
        await supabase.from('plagiafix_logs').insert({ type, details });
    }
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    localStorage.setItem(LOGS_KEY, JSON.stringify([{ timestamp: Date.now(), type, details }, ...logs].slice(0, 100)));
  },

  logVisit: async () => { 
      Telemetry.addLogLocal('VISIT', 'New User session');
      Telemetry.updateSupabaseStats({ total_visits: 1 });
  },
  logScan: async (len: number) => { 
      const tokens = Math.ceil(len / 4);
      Telemetry.addLogLocal('SCAN', `Scanned ${len} chars`);
      Telemetry.updateSupabaseStats({ total_scans: 1, tokens_used: tokens });
  },
  logFix: async (len: number) => { 
      const tokens = Math.ceil(len / 3);
      Telemetry.addLogLocal('FIX', `Fixed ${len} chars`);
      Telemetry.updateSupabaseStats({ total_fixes: 1, tokens_used: tokens });
  },
  logSlideGeneration: async (count: number) => { 
      const tokens = count * 1500;
      Telemetry.addLogLocal('SLIDE', `Generated PPTX Deck (${count} slides)`);
      Telemetry.updateSupabaseStats({ total_slides: 1, tokens_used: tokens });
  },
  logError: async (msg: string) => { 
      Telemetry.addLogLocal('ERROR', msg);
      Telemetry.updateSupabaseStats({ total_errors: 1 });
  }
};
