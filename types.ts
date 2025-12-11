
export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  FIXING = 'FIXING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AnalysisResult {
  originalScore: number;
  plagiarismScore: number; // 0-100, where 100 is high plagiarism
  critique: string;
  detectedIssues: string[];
}

export interface FixOptions {
  includeCitations: boolean;
  academicLevel: 'High School' | 'Undergraduate' | 'PhD/Professional';
  tone: 'Standard' | 'Formal' | 'Storytelling' | 'Opinionated';
  dialect: 'US' | 'UK' | 'CA' | 'AU';
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