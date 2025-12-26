
export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  FIXING = 'FIXING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ParagraphAnalysis {
  text: string;
  riskScore: number; 
  matchType?: 'AI' | 'PLAGIARISM' | 'MIXED' | 'SAFE';
  evidence?: string;
}

export interface FactCheckResult {
  claim: string;
  status: 'VERIFIED' | 'DISPUTED' | 'UNCERTAIN' | 'CITATION_NEEDED';
  suggestedSource?: string;
  sourceUrl?: string;
}

export interface SourceMatch {
  url: string;
  title: string;
  snippet: string;
  similarity: number;
  isVerified?: boolean;
  doi?: string;
}

export interface RadarMetric {
  subject: string;
  A: number;
  fullMark: number;
}

export interface ForensicData {
  avgSentenceLength: number;
  sentenceVariance: number; 
  uniqueWordRatio: number; 
  aiTriggerWordsFound: string[];
  readabilityScore: number;
  radarMetrics?: RadarMetric[];
}

export interface AnalysisResult {
  originalScore: number;
  plagiarismScore: number; 
  critique: string;
  detectedIssues: string[];
  paragraphBreakdown: ParagraphAnalysis[];
  sourcesFound: SourceMatch[]; 
  forensics: ForensicData;
  factCheckResults?: FactCheckResult[];
}

export type HumanizeMode = 'IvyStealth' | 'Cerebral' | 'Ghost' | 'Creative';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver' | 'Nature' | 'Bluebook';

export interface LinguisticProfile {
  id: string;
  name: string;
  sample: string;
  complexity: number;
  burstiness: number;
}

export interface FixOptions {
  includeCitations: boolean;
  citationStyle: CitationStyle;
  mode: HumanizeMode;
  strength: number; 
  dialect: 'US' | 'UK' | 'CA' | 'AU';
  styleProfileId?: string;
}

export interface FixResult {
  rewrittenText: string;
  newPlagiarismScore: number;
  improvementsMade: string[];
  references?: string[];
  bibliography?: SourceMatch[];
  identityMatchScore?: number;
  fidelityMap?: RadarMetric[];
}

export interface SlideContent {
  title: string;
  bullets: string[];
  speakerNotes: string;
}

export interface DocumentState {
  originalText: string;
  fileName?: string;
}

export type LogType = 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'FEEDBACK' | 'STYLE_SYNC' | 'CREDIT_TOPUP';

export interface AppStats {
  totalScans: number;
  totalFixes: number;
  totalErrors: number;
  totalVisits: number;
  tokensUsedEstimate: number;
  lastActive: string;
}

export interface LogEntry {
  timestamp: number;
  type: LogType;
  details: string;
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

export type TimeRange = '7D' | '30D' | '90D' | 'ALL';
