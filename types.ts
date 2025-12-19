
export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  FIXING = 'FIXING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

// Added DocumentState interface to fix import error in App.tsx
export interface DocumentState {
  originalText: string;
  fileName: string;
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
  sentenceVariance: number;
  uniqueWordRatio: number;
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

export interface BenchmarkResult {
  timestamp: number;
  latency: number;
  rawAiScore: number;
  stealthScore: number;
  bypassEfficiency: number; // Percentage reduction
  status: 'PASS' | 'FAIL' | 'WARNING';
}

export interface AppStats {
  totalScans: number;
  totalFixes: number;
  totalErrors: number;
  totalVisits: number;
  totalSlides: number;
  tokensUsedEstimate: number;
  lastActive: string;
  firstActive?: string; 
}

// Added 'SHARE' to LogType to fix type error in components/AnalysisView.tsx
export type LogType = 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'FEEDBACK' | 'SLIDE' | 'BENCHMARK' | 'SHARE';

export interface LogEntry {
  timestamp: number;
  type: LogType;
  details: string;
}