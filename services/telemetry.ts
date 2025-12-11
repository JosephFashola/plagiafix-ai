
import { AppStats, LogEntry } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ▼▼▼ HARDCODED KEYS FOR GLOBAL TRACKING ▼▼▼
const HARDCODED_SUPABASE_URL = "https://huugzacwzjqweugfryde.supabase.co";
const HARDCODED_SUPABASE_KEY = "sb_publishable_CW6V7snqI_or4_L_v23R3w_y98JVQNk";

const STATS_KEY = 'plagiafix_stats';
const LOGS_KEY = 'plagiafix_logs';
const CUSTOM_CRED_URL_KEY = 'plagiafix_custom_url';
const CUSTOM_CRED_KEY_KEY = 'plagiafix_custom_key';

// Robustly check for keys across all common build tool prefixes
const getEnvVar = (key: string) => {
    // Check standard process.env (Create React App, etc)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env[key]) return process.env[key];
        if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
        if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    }
    // Check import.meta.env (Vite) - requires ts-ignore or casting in some setups
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
            // @ts-ignore
            if (import.meta.env[key]) return import.meta.env[key];
            // @ts-ignore
            if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
        }
    } catch (e) { /* ignore */ }
    
    return '';
};

// Singleton instance
let supabase: SupabaseClient | null = null;
let isSupabaseEnabled = false;

// Initialize function
const initSupabase = () => {
    let url = '';
    let key = '';

    // 1. Try Hardcoded Keys (Highest Priority for Live Site)
    if (HARDCODED_SUPABASE_URL && HARDCODED_SUPABASE_URL.startsWith('http') && HARDCODED_SUPABASE_KEY) {
        url = HARDCODED_SUPABASE_URL;
        key = HARDCODED_SUPABASE_KEY;
        console.log("Using Hardcoded Supabase Credentials");
    }

    // 2. Try Environment Variables
    if (!url || !key) {
        url = getEnvVar('SUPABASE_URL');
        key = getEnvVar('SUPABASE_KEY');
    }

    // 3. If missing, Try Manual Credentials (LocalStorage)
    if (!url || !key) {
        const customUrl = localStorage.getItem(CUSTOM_CRED_URL_KEY);
        const customKey = localStorage.getItem(CUSTOM_CRED_KEY_KEY);
        if (customUrl && customKey) {
            url = customUrl;
            key = customKey;
            console.log("Using manual Supabase credentials from local storage");
        }
    }

    if (url && key) {
        try {
            supabase = createClient(url, key);
            isSupabaseEnabled = true;
            console.log("Supabase initialized successfully");
        } catch (e) {
            console.error("Supabase init failed:", e);
            isSupabaseEnabled = false;
            supabase = null;
        }
    } else {
        isSupabaseEnabled = false;
        supabase = null;
        console.log("Running in LocalStorage mode (No Supabase Keys found)");
    }
};

// Run init immediately
initSupabase();

export const Telemetry = {
  isConnected: () => isSupabaseEnabled && !!supabase,

  saveCredentials: (url: string, key: string) => {
      localStorage.setItem(CUSTOM_CRED_URL_KEY, url.trim());
      localStorage.setItem(CUSTOM_CRED_KEY_KEY, key.trim());
      initSupabase();
      window.location.reload();
  },

  clearCredentials: () => {
      localStorage.removeItem(CUSTOM_CRED_URL_KEY);
      localStorage.removeItem(CUSTOM_CRED_KEY_KEY);
      initSupabase();
      window.location.reload();
  },

  getStats: async (): Promise<AppStats> => {
    if (isSupabaseEnabled && supabase) {
        try {
            const { data, error } = await supabase
                .from('plagiafix_stats')
                .select('*')
                .eq('id', 1)
                .single();
            
            if (!error && data) {
                return {
                    totalScans: data.total_scans || 0,
                    totalFixes: data.total_fixes || 0,
                    totalErrors: data.total_errors || 0,
                    totalVisits: data.total_visits || 0, 
                    tokensUsedEstimate: data.tokens_used || 0,
                    lastActive: data.updated_at
                };
            } else if (error && error.code === 'PGRST116') {
                // Table exists but row is missing, try to create it
                await Telemetry.updateSupabaseStats({ total_scans: 0 });
                return {
                    totalScans: 0,
                    totalFixes: 0,
                    totalErrors: 0,
                    totalVisits: 0,
                    tokensUsedEstimate: 0,
                    lastActive: new Date().toISOString()
                };
            }
        } catch (e) {
            console.error("Supabase fetch failed", e);
        }
    }

    // Fallback to LocalStorage
    const stored = localStorage.getItem(STATS_KEY);
    return stored ? JSON.parse(stored) : {
      totalScans: 0,
      totalFixes: 0,
      totalErrors: 0,
      totalVisits: 0,
      tokensUsedEstimate: 0,
      lastActive: new Date().toISOString()
    };
  },

  getLogs: async (): Promise<LogEntry[]> => {
    if (isSupabaseEnabled && supabase) {
        try {
            const { data, error } = await supabase
                .from('plagiafix_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (!error && data) {
                return data.map((d: any) => ({
                    timestamp: new Date(d.created_at).getTime(),
                    type: d.type,
                    details: d.details
                }));
            }
        } catch (e) {
            console.error("Supabase log fetch failed", e);
        }
    }

    const stored = localStorage.getItem(LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  updateSupabaseStats: async (updates: any) => {
      if (!isSupabaseEnabled || !supabase) return;

      const { data: current } = await supabase.from('plagiafix_stats').select('*').eq('id', 1).single();
      
      const newStats = {
          total_scans: (current?.total_scans || 0) + (updates.total_scans || 0),
          total_fixes: (current?.total_fixes || 0) + (updates.total_fixes || 0),
          total_errors: (current?.total_errors || 0) + (updates.total_errors || 0),
          tokens_used: (current?.tokens_used || 0) + (updates.tokens_used || 0),
          updated_at: new Date().toISOString()
      };
      
      if (updates.total_visits) {
         // @ts-ignore
         newStats.total_visits = (current?.total_visits || 0) + updates.total_visits;
      }

      try {
        if (current) {
            await supabase.from('plagiafix_stats').update(newStats).eq('id', 1);
        } else {
            // Initial creation
            await supabase.from('plagiafix_stats').insert({ id: 1, ...newStats });
        }
      } catch (e) {
          console.warn("Stats update failed, retrying safe update");
          delete newStats.updated_at; 
          // @ts-ignore
          delete newStats.total_visits;
          await supabase.from('plagiafix_stats').update(newStats).eq('id', 1).catch(() => {});
      }
  },

  logVisit: async () => {
      let locationDetails = '';
      try {
          // Attempt to get user country for Analytics
          // Use a public IP API. Note: This might block on some networks, so we wrap in try/catch.
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
              const data = await res.json();
              if (data.country_code) {
                  locationDetails = ` [${data.country_code}]`;
              }
          }
      } catch (e) {
          // Ignore location fetch errors silently
      }

      const logMsg = `New user session started${locationDetails}`;

      if (isSupabaseEnabled && supabase) {
          supabase.from('plagiafix_logs').insert({ type: 'VISIT', details: logMsg }).then();
          Telemetry.updateSupabaseStats({ total_visits: 1 }).then();
      }

      const stats = await Telemetry.getStatsLocal();
      stats.totalVisits = (stats.totalVisits || 0) + 1;
      stats.lastActive = new Date().toISOString();
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
      if (!isSupabaseEnabled) Telemetry.addLogLocal('VISIT', logMsg);
  },

  logScan: async (charCount: number) => {
    const tokens = Math.ceil(charCount / 4);
    
    if (isSupabaseEnabled && supabase) {
        supabase.from('plagiafix_logs').insert({ type: 'SCAN', details: `Scanned document: ${charCount} chars` }).then();
        Telemetry.updateSupabaseStats({ total_scans: 1, tokens_used: tokens }).then();
    } 
    
    const stats = await Telemetry.getStatsLocal();
    stats.totalScans += 1;
    stats.tokensUsedEstimate += tokens;
    stats.lastActive = new Date().toISOString();
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    if (!isSupabaseEnabled) Telemetry.addLogLocal('SCAN', `Scanned document: ${charCount} chars`);
  },

  logFix: async (charCount: number) => {
    const tokens = Math.ceil(charCount / 3);

    if (isSupabaseEnabled && supabase) {
        supabase.from('plagiafix_logs').insert({ type: 'FIX', details: `Fixed document: ${charCount} chars` }).then();
        Telemetry.updateSupabaseStats({ total_fixes: 1, tokens_used: tokens }).then();
    } 

    const stats = await Telemetry.getStatsLocal();
    stats.totalFixes += 1;
    stats.tokensUsedEstimate += tokens;
    stats.lastActive = new Date().toISOString();
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    if (!isSupabaseEnabled) Telemetry.addLogLocal('FIX', `Fixed document: ${charCount} chars`);
  },

  logError: async (message: string) => {
    if (isSupabaseEnabled && supabase) {
        supabase.from('plagiafix_logs').insert({ type: 'ERROR', details: message }).then();
        Telemetry.updateSupabaseStats({ total_errors: 1 }).then();
    } 

    const stats = await Telemetry.getStatsLocal();
    stats.totalErrors += 1;
    stats.lastActive = new Date().toISOString();
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    if (!isSupabaseEnabled) Telemetry.addLogLocal('ERROR', message);
  },

  getStatsLocal: async (): Promise<AppStats> => {
      const stored = localStorage.getItem(STATS_KEY);
      return stored ? JSON.parse(stored) : {
        totalScans: 0,
        totalFixes: 0,
        totalErrors: 0,
        totalVisits: 0,
        tokensUsedEstimate: 0,
        lastActive: new Date().toISOString()
      };
  },

  addLogLocal: (type: 'SCAN' | 'FIX' | 'ERROR' | 'VISIT', details: string) => {
    const stored = localStorage.getItem(LOGS_KEY);
    const logs = stored ? JSON.parse(stored) : [];
    const newLogs = [{ timestamp: Date.now(), type, details }, ...logs].slice(0, 50);
    localStorage.setItem(LOGS_KEY, JSON.stringify(newLogs));
  }
};
