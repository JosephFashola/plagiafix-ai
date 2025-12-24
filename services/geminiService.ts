import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FixResult, FixOptions, HumanizeMode, ParagraphAnalysis, CitationStyle, ForensicData, SourceMatch, SlideContent, StudyGuide, SummaryMemo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYZE_MODEL_ID = 'gemini-3-flash-preview'; 
const FIX_MODEL_ID = 'gemini-3-pro-preview'; 
const FALLBACK_MODEL_ID = 'gemini-3-flash-preview';

const BANNED_WORDS = [
    "delve", "tapestry", "underscoring", "landscape of", "nuance", "testament to", "realm of", 
    "unveiling", "intricate", "orchestrate", "multifaceted", "demystify", "navigating the", 
    "intersection of", "rich tapestry", "aforementioned", "game-changer", "paradigm shift",
    "unleash", "unlock", "pivotal", "dynamic", "fostering", "harnessing", "leverage",
    "in summary", "in conclusion", "moreover", "furthermore", "additionally"
];

export const checkApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 200));

const parseJSONSafely = (text: string): any => {
  if (!text) return null;
  let cleanText = text.trim();
  cleanText = cleanText.replace(/```json\s*/g, '').replace(/```/g, '');
  const firstSquare = cleanText.indexOf('[');
  const firstCurly = cleanText.indexOf('{');
  let startIndex = -1;
  let endIndex = -1;
  if (firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
      startIndex = firstSquare;
      endIndex = cleanText.lastIndexOf(']');
  } else if (firstCurly !== -1) {
      startIndex = firstCurly;
      endIndex = cleanText.lastIndexOf('}');
  }
  if (startIndex !== -1 && endIndex !== -1) {
      cleanText = cleanText.substring(startIndex, endIndex + 1);
  }
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    return null;
  }
};

const chunkText = (text: string, maxChunkSize: number = 10000): string[] => {
  if (!text || text.length === 0) return [];
  if (text.length <= maxChunkSize) return [text];
  const chunks: string[] = [];
  let currentChunk = '';
  let splitters = text.split(/\n\n/);
  
  for (const part of splitters) {
    if ((currentChunk.length + part.length) > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + part;
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const msg = error.message?.toLowerCase() || '';
            const isQuotaError = msg.includes('429') || msg.includes('quota') || msg.includes('rate limit');
            
            if (isQuotaError && attempt === retries) {
                throw new Error("System Traffic High: Hundreds of pages take significant resources. Please wait 60 seconds or try a smaller section.");
            }

            if (attempt === retries || !isQuotaError) throw error;
            
            const waitTime = (baseDelay * Math.pow(2, attempt - 1)) + (Math.random() * 1000);
            await delay(waitTime);
        }
    }
    throw new Error("Synthesis connection timed out.");
}

export const testGeminiConnection = async (): Promise<{ latency: number, status: 'OK' | 'ERROR', message?: string }> => {
  const start = Date.now();
  try {
     const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
     await aiInstance.models.generateContent({ model: FALLBACK_MODEL_ID, contents: 'ping' });
     return { latency: Date.now() - start, status: 'OK' };
  } catch (e: any) {
     return { latency: 0, status: 'ERROR', message: e.message };
  }
};

const calculateForensics = (text: string): ForensicData => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / (sentences.length || 1);
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgSentenceLength, 2), 0) / (sentences.length || 1);
    const sentenceVariance = Math.sqrt(variance);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const uniqueWordRatio = uniqueWords.size / (words.length || 1);
    const lowerText = text.toLowerCase();
    const aiTriggerWordsFound = BANNED_WORDS.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(lowerText));
    const characters = text.replace(/\s/g, '').length;
    const readabilityScore = 4.71 * (characters / (words.length || 1)) + 0.5 * (words.length / (sentences.length || 1)) - 21.43;
    return {
        avgSentenceLength: Number(avgSentenceLength.toFixed(1)),
        sentenceVariance: Number(sentenceVariance.toFixed(1)),
        uniqueWordRatio: Number(uniqueWordRatio.toFixed(2)),
        aiTriggerWordsFound,
        readabilityScore: Number(readabilityScore.toFixed(1))
    };
};

export const analyzeDocument = async (text: string, onProgress?: (percent: number, stepName: string) => void): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  const forensics = calculateForensics(text);
  
  const chunks = chunkText(text, 10000);
  const totalChunks = chunks.length;

  const systemInstruction = `Forensic Academic Investigator: You are scanning large document segments for plagiarism and AI patterns.
  1. Actively use googleSearch to cross-reference text segments against known digital sources.
  2. Evaluate text for robotic patterns, low burstiness, and repetitive structures indicative of AI generation.
  3. Return ONLY valid JSON:
  {
    "plagiarismScore": number,
    "originalScore": number,
    "critique": "Professional assessment",
    "detectedIssues": ["issue1", "issue2"],
    "paragraphBreakdown": [{"text": "...", "riskScore": number, "matchType": "AI"|"PLAGIARISM"|"SAFE"}],
    "sourcesFound": [{"url": "...", "title": "...", "similarity": number}]
  }`;

  const allResults: AnalysisResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(Math.round((i / totalChunks) * 100), `Auditing Segment ${i + 1}/${totalChunks}`);
    
    const chunkResult = await withRetry(async () => {
      const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await aiInstance.models.generateContent({ 
        model: ANALYZE_MODEL_ID, 
        contents: chunks[i], 
        config: { 
          systemInstruction,
          tools: [{ googleSearch: {} }]
        } 
      });

      const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const webSources: SourceMatch[] = [];
      grounding?.forEach((c: any) => {
        if (c.web?.uri) {
          webSources.push({
            url: c.web.uri,
            title: c.web.title || "Web Source",
            snippet: "Direct match identified via search grounding.",
            similarity: 100
          });
        }
      });

      const parsed = parseJSONSafely(response.text || '{}');
      if (parsed) {
        parsed.sourcesFound = [...(parsed.sourcesFound || []), ...webSources];
      }
      return parsed as AnalysisResult;
    });

    if (chunkResult) allResults.push(chunkResult);
    if (totalChunks > 1) await delay(400);
  }

  const summary = allResults.reduce((acc, curr) => {
    acc.plagiarismScore += curr.plagiarismScore;
    acc.originalScore += curr.originalScore;
    acc.detectedIssues.push(...(curr.detectedIssues || []));
    acc.paragraphBreakdown.push(...(curr.paragraphBreakdown || []));
    acc.sourcesFound.push(...(curr.sourcesFound || []));
    return acc;
  }, { 
    plagiarismScore: 0, 
    originalScore: 0, 
    critique: "", 
    detectedIssues: [] as string[], 
    paragraphBreakdown: [] as ParagraphAnalysis[], 
    sourcesFound: [] as SourceMatch[],
    forensics
  });

  const avgPlag = Math.round(summary.plagiarismScore / allResults.length);
  const avgOrig = Math.round(summary.originalScore / allResults.length);
  
  summary.sourcesFound = Array.from(new Map(summary.sourcesFound.map(s => [s.url, s])).values());
  summary.detectedIssues = Array.from(new Set(summary.detectedIssues));
  summary.plagiarismScore = avgPlag;
  summary.originalScore = avgOrig;
  summary.critique = allResults[0]?.critique || "Multi-page scan complete.";

  if (onProgress) onProgress(100, "Compiling Forensic Data");
  return summary;
};

export const fixPlagiarism = async (text: string, currentIssues: string[], options: FixOptions, detectedSources: SourceMatch[] = [], onProgress?: (percent: number) => void): Promise<FixResult> => {
  const { includeCitations, citationStyle, mode, strength, dialect } = options;
  const chunks = chunkText(text, 12000); 
  const totalChunks = chunks.length;

  const citationRequirement = includeCitations 
    ? `MANDATORY: Use ${citationStyle} style. Cross-reference claims with matches from: ${detectedSources.map(s => s.url).join(', ')}.`
    : "Rewrite without citations.";

  const systemInstruction = `Expert Humanizer: Rewrite the input to be indistinguishable from high-quality professional human writing.
  MODE: ${mode}
  DIALECT: ${dialect}
  INTENSITY: ${strength}%
  ${citationRequirement}
  AVOID AI MARKERS: ${BANNED_WORDS.join(', ')}.
  Return JSON:
  {
    "rewrittenText": "...",
    "newPlagiarismScore": number,
    "improvementsMade": ["..."],
    "references": ["..."]
  }`;
  
  const allResults: FixResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
    
    const chunkResult = await withRetry(async () => {
      const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = { 
        systemInstruction,
        temperature: mode === 'Ghost' ? 1.5 : 0.9,
        tools: includeCitations ? [{ googleSearch: {} }] : undefined
      };
      if (!includeCitations) config.responseMimeType = "application/json";

      const response = await aiInstance.models.generateContent({ 
        model: FIX_MODEL_ID, 
        contents: chunks[i], 
        config 
      });
      return parseJSONSafely(response.text || '{}') as FixResult;
    });

    if (chunkResult) allResults.push(chunkResult);
    if (totalChunks > 1) await delay(600);
  }

  return {
    rewrittenText: allResults.map(r => r.rewrittenText).join('\n\n'),
    newPlagiarismScore: Math.round(allResults.reduce((a, b) => a + (b.newPlagiarismScore || 0), 0) / allResults.length),
    improvementsMade: Array.from(new Set(allResults.flatMap(r => r.improvementsMade || []))),
    references: Array.from(new Set(allResults.flatMap(r => r.references || [])))
  };
};

export const refineTextSegment = async (original: string, selection: string, mode: HumanizeMode): Promise<string> => {
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Refine the selected segment to sound more organic and human (${mode} mode). Maintain meaning but change syntax. Return ONLY the refined text.`;
    const response = await aiInstance.models.generateContent({ 
        model: FALLBACK_MODEL_ID, 
        contents: `Context: ${original}\nTarget Selection: ${selection}`, 
        config: { systemInstruction } 
    });
    return response.text?.trim() || selection;
};

export const generateStudyGuide = async (text: string): Promise<StudyGuide> => {
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Educational Synthesizer: Create a Study Guide. Return JSON: {title, summary, keyConcepts:[{term, definition}], practiceQuestions:[string]}`;
    const response = await aiInstance.models.generateContent({ 
        model: FALLBACK_MODEL_ID, 
        contents: text.slice(0, 30000), 
        config: { systemInstruction, responseMimeType: "application/json" } 
    });
    return parseJSONSafely(response.text || '{}');
};

export const generateSummaryMemo = async (text: string): Promise<SummaryMemo> => {
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Executive Synthesizer: Create a professional memo. Return JSON: {to, from, subject, executiveSummary, keyActionItems:[string], conclusion}`;
    const response = await aiInstance.models.generateContent({ 
        model: FALLBACK_MODEL_ID, 
        contents: text.slice(0, 30000), 
        config: { systemInstruction, responseMimeType: "application/json" } 
    });
    return parseJSONSafely(response.text || '{}');
};

export const generatePresentationContent = async (text: string): Promise<SlideContent[]> => {
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const systemInstruction = `Slide Architect: Create detailed presentation content. Return JSON array of {title, bullets, speakerNotes}.`;
    const response = await aiInstance.models.generateContent({ 
        model: FALLBACK_MODEL_ID, 
        contents: text.slice(0, 30000), 
        config: { systemInstruction, responseMimeType: "application/json" } 
    });
    return parseJSONSafely(response.text || '[]');
};