
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
  aiProbability: number;
  bibliography?: SourceMatch[];
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

export type CitationStyle = 
  | 'APA 7th Edition' 
  | 'MLA 9th Edition' 
  | 'Chicago 17th (Author-Date)' 
  | 'Chicago 17th (Notes & Bibliography)'
  | 'Harvard (Standard)' 
  | 'IEEE (Technical/Engineering)' 
  | 'Vancouver (Biomedical)' 
  | 'Nature (Journal Style)' 
  | 'Science (Journal Style)'
  | 'Bluebook (Legal/US)' 
  | 'OSCOLA (Legal/UK)'
  | 'AMA (Medical/11th Ed)'
  | 'ASA (Sociological)'
  | 'AAA (Anthropological)'
  | 'APSA (Political Science)'
  | 'Turabian (9th Ed)'
  | 'MHRA (Humanities)'
  | 'ACS (Chemical Society)'
  | 'AGU (Geophysical Union)';

export type TargetLanguage = 
  | 'English (United States - Academic)' 
  | 'English (United Kingdom - Oxford)' 
  | 'English (Canada - Standard)' 
  | 'English (Australia - Professional)' 
  | 'English (International - Scholarly)'
  | 'Spanish (Spain - Castilian Professional)' 
  | 'Spanish (Latin America - Formal)'
  | 'French (France - Standard Academic)' 
  | 'French (Canada - Québécois Scholarly)' 
  | 'German (Germany - Hochdeutsch Formal)' 
  | 'German (Switzerland - Academic)'
  | 'Italian (Italy - Standard Professional)' 
  | 'Portuguese (Brazil - Formal Academic)' 
  | 'Portuguese (Portugal - Scholarly)'
  | 'Dutch (Netherlands - Academic)' 
  | 'Chinese (Simplified - Academic Mandarin)' 
  | 'Chinese (Traditional - Scholarly Standard)'
  | 'Japanese (Japan - Keigo/Formal)'
  | 'Korean (South Korea - Formal/Academic)'
  | 'Russian (Russia - Academic Standard)'
  | 'Arabic (Modern Standard - Professional)';

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

export type LogType = 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'DONATION' | 'FEEDBACK' | 'TRANSACTION' | 'FEATURE';

export interface LogEntry {
  timestamp: number;
  type: LogType;
  details: string;
}

export interface FeatureUsage {
  name: string;
  value: number;
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
  featureMatrix: Record<string, number>;
}

export interface ForensicInsights {
  totalWords: number;
  avgDocLength: number;
  commonIssues: { issue: string; count: number }[];
  aiBypassRate: number;
  featureUsage: FeatureUsage[];
  modeDistribution: FeatureUsage[];
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
