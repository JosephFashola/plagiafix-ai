
export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  FIXING = 'FIXING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ParagraphAnalysis {
  text: string;
  riskScore: number; // 0-100
  matchType?: 'AI' | 'PLAGIARISM' | 'MIXED' | 'SAFE';
  evidence?: string;
}

export interface SourceMatch {
  url: string;
  title: string;
  snippet: string;
  similarity: number;
}

export interface ForensicData {
  avgSentenceLength: number;
  sentenceVariance: number; // Burstiness
  uniqueWordRatio: number; // Perplexity proxy
  aiTriggerWordsFound: string[];
  readabilityScore: number;
}

export interface AnalysisResult {
  originalScore: number;
  plagiarismScore: number; 
  critique: string;
  detectedIssues: string[];
  paragraphBreakdown: ParagraphAnalysis[];
  sourcesFound: SourceMatch[]; 
  forensics: ForensicData;
}

export type HumanizeMode = 'Standard' | 'Ghost' | 'Academic' | 'Creative';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

export interface FixOptions {
  includeCitations: boolean;
  citationStyle?: CitationStyle;
  mode: HumanizeMode;
  strength: number; 
  dialect: 'US' | 'UK' | 'CA' | 'AU';
  styleSample?: string;
}

export interface FixResult {
  rewrittenText: string;
  newPlagiarismScore: number;
  improvementsMade: string[];
  references?: string[];
}

export interface SlideContent {
  title: string;
  bullets: string[];
  speakerNotes: string;
}

export interface StudyGuide {
  title: string;
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  practiceQuestions: string[];
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

export type LogType = 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'FEEDBACK' | 'SLIDE' | 'SHARE' | 'MEMO' | 'GUIDE' | 'REFINE';

export type TimeRange = 'All Time' | '24H' | '7D' | '30D' | 'Custom' | 'ALL';

export interface AppStats {
  totalScans: number;
  totalFixes: number;
  totalErrors: number;
  totalVisits: number;
  totalSlides?: number;
  tokensUsedEstimate: number;
  lastActive: string;
  firstActive?: string;
  avgSessionDuration?: number;
  activeGeoRegions?: any[];
}

export interface LogEntry {
  timestamp: number;
  type: LogType;
  details: string;
}
