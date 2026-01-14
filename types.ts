
export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  FIXING = 'FIXING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface DocumentVersion {
  id: string;
  timestamp: number;
  text: string;
  label: string;
  score: number;
}

export interface ErrorContext {
  code: string;
  message: string;
  actionableAdvice: string;
  technicalDetails?: string;
}

export interface SourceMatch {
  id: string;
  url: string;
  title: string;
  snippet: string;
  similarity: number;
  impactScore: number;
  type: 'JOURNAL' | 'BOOK' | 'WEB' | 'INSTITUTIONAL';
  author?: string;
  year?: string;
  fullCitation?: string;
}

export interface RadarMetric {
  subject: string;
  A: number;
  fullMark: number;
}

export interface ParagraphAnalysis {
  text: string;
  riskScore: number;
  matchType: "AI" | "PLAGIARISM" | "SAFE";
  evidence: string;
}

export interface ForensicData {
  avgSentenceLength: number;
  sentenceVariance: number; 
  uniqueWordRatio: number; 
  readabilityScore: number;
  aiProbability: number;
  aiTriggerWordsFound: string[];
  radarMetrics?: RadarMetric[];
}

export interface AnalysisResult {
  originalScore: number;
  plagiarismScore: number; 
  aiProbability: number; 
  critique: string;
  detectedIssues: string[];
  paragraphBreakdown: ParagraphAnalysis[];
  sourcesFound: SourceMatch[]; 
  forensics: ForensicData;
}

export type HumanizeMode = 'Standard' | 'Ghost' | 'Academic' | 'Creative' | 'IvyStealth';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver' | 'Nature' | 'Bluebook';

export type TargetLanguage = 
  | 'English (US)' 
  | 'English (UK)' 
  | 'English (CA)' 
  | 'English (AU)' 
  | 'Spanish (Modern)' 
  | 'French (Scholarly)' 
  | 'German (Formal)' 
  | 'Italian (Standard)' 
  | 'Portuguese (Brazil)' 
  | 'Dutch (Academic)' 
  | 'Chinese (Simplified)' 
  | 'Japanese (Formal)';

export type IdentityLevel = 'UNDERGRADUATE' | 'MSC' | 'POSTGRADUATE' | 'GHOST' | 'EXECUTIVE';

export interface LinguisticProfile {
  id: string;
  name: string;
  sample: string;
  complexity: number;
  burstiness: number;
  category: 'SYSTEM' | 'CUSTOM';
  level: string;
  iconName?: string;
}

export interface FixOptions {
  includeCitations: boolean;
  citationStyle: CitationStyle;
  mode: HumanizeMode;
  strength: number; 
  language: TargetLanguage;
  styleProfileId?: string;
}

export interface FixResult {
  rewrittenText: string;
  newPlagiarismScore: number;
  newAiProbability: number;
  improvementsMade: string[];
  bibliography?: SourceMatch[];
  fidelityMap?: RadarMetric[];
}

export interface SlideContent {
  title: string;
  bullets: string[];
  speakerNotes: string;
}

export interface SummaryMemo {
  to: string;
  from: string;
  subject: string;
  executiveSummary: string;
  keyActionItems: string[];
  conclusion: string;
}

export interface DocumentState {
  originalText: string;
  fileName?: string;
}

export type LogType = 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'DONATION' | 'FEEDBACK';

export interface LogEntry {
  timestamp: number;
  type: LogType;
  details: string;
}

export interface AppStats {
  totalScans: number;
  totalFixes: number;
  totalErrors: number;
  totalVisits: number;
  totalWordsProcessed: number;
  activeUsers24h: number;
  peakConcurrent: number;
  lastActive: string;
}

export interface ForensicInsights {
  totalWords: number;
  avgDocLength: number;
  commonIssues: { issue: string; count: number }[];
  aiBypassRate: number;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  neuralLatency: number;
  dbLatency: number;
  uptime: number;
  regionalNodes: { name: string; latency: number; status: 'ONLINE' | 'OFFLINE' }[];
}

export interface FinancialStats {
  totalGrossValue: number;
  mrrEstimate: number;
  totalDonationsBtc: string;
  valuationEstimate: number;
  burnRate: number;
  ltvEstimate: number;
  transactionHistory: { id: string; amount: string; type: 'CRYPTO' | 'FIAT'; status: 'CONFIRMED' | 'PENDING'; timestamp: number }[];
}

export type TimeRange = '1H' | '24H' | '7D' | '30D' | '1Y';
