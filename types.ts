
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

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  lastActive: number;
  isAiAgent?: boolean;
}

export interface ErrorContext {
  code: string;
  message: string;
  actionableAdvice: string;
  technicalDetails?: string;
}

export interface ParagraphAnalysis {
  text: string;
  riskScore: number; 
  matchType?: 'AI' | 'PLAGIARISM' | 'MIXED' | 'SAFE';
  evidence?: string;
  aiMarkers?: string[];
  suggestedSourceId?: string;
  groundingStrength?: number; // 0-100 verification confidence
}

export interface FactCheckResult {
  claim: string;
  status: 'VERIFIED' | 'DISPUTED' | 'UNCERTAIN' | 'CITATION_NEEDED';
  suggestedSource?: string;
  sourceUrl?: string;
}

export interface SourceMatch {
  id: string;
  url: string;
  title: string;
  snippet: string;
  similarity: number;
  isVerified?: boolean;
  doi?: string;
  author?: string;
  year?: string;
  fullCitation?: string;
  impactScore?: number; // 0-100 based on journal/source quality
  publisher?: string;
  type?: 'JOURNAL' | 'BOOK' | 'WEB' | 'INSTITUTIONAL';
  peerReviewMarker?: boolean;
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
  aiProbability: number; // 0 to 100
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
  factCheckResults?: FactCheckResult[];
}

export type HumanizeMode = 'IvyStealth' | 'Cerebral' | 'Ghost' | 'Creative';

export type CitationStyle = 'APA' | 'MLA' | 'Chicago' | 'Harvard' | 'IEEE' | 'Vancouver' | 'Nature' | 'Bluebook';

export type ProfileCategory = 'SYSTEM' | 'CUSTOM';
export type IdentityLevel = 'UNDERGRADUATE' | 'MSC' | 'POSTGRADUATE' | 'GHOST' | 'EXECUTIVE';

export interface LinguisticProfile {
  id: string;
  name: string;
  sample: string;
  complexity: number;
  burstiness: number;
  category: ProfileCategory;
  level: IdentityLevel;
  iconName?: string;
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
  newAiProbability: number;
  improvementsMade: string[];
  references?: string[];
  bibliography?: SourceMatch[];
  identityMatchScore?: number;
  fidelityMap?: RadarMetric[];
  paragraphMappings?: { paragraphIndex: number, sourceId: string, groundingStrength: number }[];
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

export type LogType = 'SCAN' | 'FIX' | 'ERROR' | 'VISIT' | 'STYLE_SYNC' | 'CREDIT_TOPUP' | 'FEEDBACK' | 'SHARE' | 'REWRITE_QUALITY';

export interface RewriteFeedback {
  firstName: string;
  email: string;
  rating: number;
  comment: string;
  originalScore?: number;
  fixedScore?: number;
}

export interface ForensicInsights {
  totalWords: number;
  avgDocLength: number;
  commonIssues: { issue: string; count: number }[];
}

export interface AppStats {
  totalScans: number;
  totalFixes: number;
  totalErrors: number;
  totalVisits: number;
  tokensUsedEstimate: number;
  totalWordsProcessed: number;
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

export type TimeRange = '1H' | '24H' | '7D' | '30D' | '1Y' | 'ALL' | 'CUSTOM';
