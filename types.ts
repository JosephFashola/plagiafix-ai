

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
  reason?: string;
}

export interface AnalysisResult {
  originalScore: number;
  plagiarismScore: number; // 0-100, where 100 is high plagiarism
  critique: string;
  detectedIssues: string[];
  paragraphBreakdown: ParagraphAnalysis[];
}

export type HumanizeMode = 'Standard' | 'Ghost' | 'Academic' | 'Creative';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE';

export interface FixOptions {
  includeCitations: boolean;
  citationStyle?: CitationStyle;
  mode: HumanizeMode;
  strength: number; // 1-100 (Intensity of rewriting)
  dialect: 'US' | 'UK' | 'CA' | 'AU';
  styleSample?: string; // New: User's own writing style
}

export interface FixResult {
  rewrittenText: string;
  newPlagiarismScore: number;
  improvementsMade: string[];
  references?: string[];
}

export interface DocumentState {
  originalText: string;
  fileName?: string;
}

// Telemetry Types
export interface AppStats {
  totalScans: number;
  totalFixes: number;
  totalErrors: number;
  totalVisits: number; // New metric
  tokensUsedEstimate: number;
  lastActive: string;
  firstActive?: string; // Tracks when the database row was created (first deployment)
}

export interface LogEntry {
  timestamp: number;
  type: 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'FEEDBACK';
  details: string;
}