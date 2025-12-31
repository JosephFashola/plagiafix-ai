
import { AppStats, LogEntry, LogType, TimeRange, RewriteFeedback, ForensicInsights } from '../types';
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
    console.error("Supabase Initialization Error:", e instanceof Error ? e.message : JSON.stringify(e));
}

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

  logRewriteFeedback: async (feedback: RewriteFeedback) => {
    if (!supabase) return;
    try {
      const details = JSON.stringify({
        user: feedback.firstName,
        email: feedback.email,
        rating: feedback.rating,
        comment: feedback.comment,
        metrics: {
          orig: feedback.originalScore,
          fixed: feedback.fixedScore
        }
      });
      await Telemetry.addLogLocal('REWRITE_QUALITY', details);
    } catch (e) {
      console.error("Feedback logging failed:", e);
    }
  },

  getFinancialSnapshot: async () => {
    const { stats } = await Telemetry.getGroundTruthStats();
    
    // Financial Constants
    const COST_PER_1M_TOKENS_FLASH = 0.075; // USD (Gemini 3 Flash)
    const COST_PER_1M_TOKENS_PRO = 1.25;    // USD (Gemini 3 Pro)
    
    // Neural usage estimation based on forensic complexity
    const tokenBurnFlash = stats.totalScans * 15000;
    const tokenBurnPro = stats.totalFixes * 25000;
    
    const costFlash = (tokenBurnFlash / 1000000) * COST_PER_1M_TOKENS_FLASH;
    const costPro = (tokenBurnPro / 1000000) * COST_PER_1M_TOKENS_PRO;
    
    const estimatedSponsors = Math.floor(stats.totalVisits * 0.02);
    const estimatedRevenue = estimatedSponsors * 30; 
    const estimatedCosts = costFlash + costPro;

    return {
      revenue: estimatedRevenue,
      costs: estimatedCosts,
      grossMargin: estimatedRevenue - estimatedCosts,
      marginPercent: ((estimatedRevenue - estimatedCosts) / (estimatedRevenue || 1)) * 100,
      burnRatePerScan: (costFlash + costPro) / (stats.totalScans + stats.totalFixes || 1),
      arpu: estimatedRevenue / (stats.totalVisits || 1)
    };
  },

  getGroundTruthStats: async (): Promise<{ stats: AppStats, error?: any }> => {
    if (!supabase) return { stats: { totalScans: 0, totalFixes: 0, totalErrors: 0, totalVisits: 0, tokensUsedEstimate: 0, totalWordsProcessed: 0, lastActive: "" }, error: "Offline" };
    try {
        const getCount = async (type: string) => {
          const { count, error } = await supabase!
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

        const { data: recentLogs } = await supabase
          .from('plagiafix_logs')
          .select('details, type')
          .in('type', ['SCAN', 'FIX'])
          .order('created_at', { ascending: false })
          .limit(2000); 
        
        let sampleWords = 0;
        let sampleCount = 0;
        (recentLogs || []).forEach(row => {
          const wordMatch = row.details.match(/(\d+) words/i);
          if (wordMatch) {
            sampleWords += parseInt(wordMatch[1]);
            sampleCount++;
          }
        });

        const avgWordsPerLog = sampleCount > 0 ? sampleWords / sampleCount : 250;
        const totalEstimatedWords = Math.round(avgWordsPerLog * (scans + fixes));

        return {
            stats: {
                totalScans: scans,
                totalFixes: fixes,
                totalErrors: errors,
                totalVisits: visits,
                totalWordsProcessed: totalEstimatedWords,
                tokensUsedEstimate: (scans * 15000) + (fixes * 25000),
                lastActive: new Date().toISOString()
            }
        };
    } catch (e: any) { 
      return { stats: { totalScans: 0, totalFixes: 0, totalErrors: 0, totalVisits: 0, tokensUsedEstimate: 0, totalWordsProcessed: 0, lastActive: "" }, error: e }; 
    }
  },

  getForensicInsights: async (): Promise<ForensicInsights> => {
    if (!supabase) return { totalWords: 0, avgDocLength: 0, commonIssues: [] };
    try {
      const { data } = await supabase.from('plagiafix_logs').select('details').eq('type', 'SCAN').order('created_at', { ascending: false }).limit(1000);
      if (!data) return { totalWords: 0, avgDocLength: 0, commonIssues: [] };

      const issues: Record<string, number> = {};
      let wordSum = 0;

      data.forEach(log => {
        const d = log.details || "";
        const wordMatch = d.match(/(\d+) words/i);
        if (wordMatch) wordSum += parseInt(wordMatch[1]);

        const issueMatch = d.match(/Issues: \[(.*?)\]/);
        if (issueMatch) {
          const found = issueMatch[1].split(',').map(s => s.trim());
          found.forEach(i => { if(i) issues[i] = (issues[i] || 0) + 1; });
        }
      });

      return {
        totalWords: wordSum,
        avgDocLength: data.length > 0 ? Math.round(wordSum / data.length) : 0,
        commonIssues: Object.entries(issues)
          .map(([issue, count]) => ({ issue, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
    } catch (e) {
      return { totalWords: 0, avgDocLength: 0, commonIssues: [] };
    }
  },

  subscribe: (onLogChange: (log: LogEntry) => void) => {
    if (!supabase) return () => {};
    const channel = supabase.channel('plagiafix_realtime_v14')
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
        const { data } = await supabase.from('plagiafix_logs').select('*').order('created_at', { ascending: false }).limit(limit);
        return (data || []).map(d => ({ timestamp: new Date(d.created_at).getTime(), type: d.type, details: d.details }));
    } catch (e) { return []; }
  },

  getChartData: async (range: TimeRange, customRange?: { start: Date, end: Date }): Promise<any[]> => {
    if (!supabase) return [];
    try {
        // CRITICAL FIX: Explicitly query only SCAN and FIX types for the chart.
        // Otherwise, thousands of VISIT logs will bury the chart data due to the 5000 limit.
        let query = supabase.from('plagiafix_logs')
          .select('created_at, type')
          .in('type', ['SCAN', 'FIX']);

        const now = new Date();
        if (range === '1H') query = query.gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString());
        else if (range === '24H') query = query.gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
        else if (range === '7D') query = query.gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
        else if (range === '30D') query = query.gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
        else if (range === '1Y') query = query.gte('created_at', new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString());
        
        const { data } = await query.order('created_at', { ascending: true }).limit(5000);
        if (!data || data.length === 0) return [];

        const buckets: Record<string, any> = {};
        data.forEach(log => {
            const date = new Date(log.created_at);
            let key = '';
            if (range === '1H') {
              const mins = Math.floor(date.getMinutes() / 5) * 5;
              key = `${date.getHours()}:${mins.toString().padStart(2, '0')}`;
            } else if (range === '24H') {
              key = `${date.getHours()}:00`;
            } else if (range === '1Y') {
              key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            } else {
              key = date.toISOString().split('T')[0];
            }
            if (!buckets[key]) buckets[key] = { name: key, scans: 0, fixes: 0, timestamp: date.getTime() };
            if (log.type === 'SCAN') buckets[key].scans++;
            if (log.type === 'FIX') buckets[key].fixes++;
        });
        return Object.values(buckets).sort((a, b) => a.timestamp - b.timestamp);
    } catch (e) { return []; }
  },

  getCountryTraffic: async (): Promise<any[]> => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from('plagiafix_logs').select('details').eq('type', 'VISIT').order('created_at', { ascending: false }).limit(1000);
        if (error || !data) return [];
        const countries: Record<string, number> = {};
        data.forEach(log => {
            const match = log.details.match(/\[([A-Z]{2})\]/);
            if (match) {
                const code = match[1];
                countries[code] = (countries[code] || 0) + 1;
            }
        });
        return Object.entries(countries)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    } catch (e) { return []; }
  },

  addLogLocal: async (type: string, details: string) => {
    if (supabase) {
      try {
        const { error } = await supabase.from('plagiafix_logs').insert({ type: type.toUpperCase(), details });
        if (error) console.error("Log Insertion Failed:", error);
      } catch (e) {
        console.error("Critical Log Error:", e);
      }
    }
  },

  logVisit: async () => { 
    let countryCode = 'Unknown';
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code) countryCode = data.country_code;
    } catch (e) { console.warn("Geo-Location lookup skipped or blocked."); }
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
  logShare: async (platform: string) => { Telemetry.addLogLocal('SHARE', `Shared results to ${platform}`); },
  logFeedback: async (rating: number, msg: string) => { 
    await Telemetry.addLogLocal('FEEDBACK', `Rating: ${rating}/5 | Msg: ${msg}`); 
  }
};
