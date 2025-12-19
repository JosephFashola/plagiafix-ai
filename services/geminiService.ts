
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FixResult, FixOptions, HumanizeMode, ParagraphAnalysis, CitationStyle, ForensicData, SourceMatch, SlideContent, BenchmarkResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYZE_MODEL_ID = 'gemini-3-pro-preview'; 
const FIX_MODEL_ID = 'gemini-3-pro-preview'; 
const FALLBACK_MODEL_ID = 'gemini-2.5-flash';

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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 100));

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
  try { return JSON.parse(cleanText); } catch (e) { return null; }
};

const chunkText = (text: string, maxChunkSize: number = 15000): string[] => {
  if (!text || text.length === 0) return [];
  if (text.length <= maxChunkSize) return [text];
  const chunks: string[] = [];
  let currentChunk = '';
  let splitters = text.split(/\n\n/);
  if (splitters.length < 3 && text.length > maxChunkSize) {
      splitters = text.split(/(?<=[.!?])\s+/);
  }
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

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try { return await fn(); } catch (error: any) {
            const msg = error.message || '';
            const isRateLimit = msg.includes('429') || msg.includes('quota');
            const isServerBusy = msg.includes('503') || msg.includes('500') || msg.includes('overloaded');
            if (attempt === retries || (!isRateLimit && !isServerBusy)) throw error;
            const waitTime = baseDelay * Math.pow(2, attempt - 1);
            await delay(waitTime);
        }
    }
    throw new Error("Max retries exceeded");
}

export const testGeminiConnection = async (): Promise<{ latency: number, status: 'OK' | 'ERROR', message?: string }> => {
  const start = Date.now();
  try {
     await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'ping' });
     return { latency: Date.now() - start, status: 'OK' };
  } catch (e: any) {
     return { latency: 0, status: 'ERROR', message: e.message };
  }
};

/**
 * PERFORM GLOBAL STEALTH BENCHMARK
 */
export const runStealthBenchmark = async (): Promise<BenchmarkResult> => {
    const start = Date.now();
    try {
        const rawRes = await ai.models.generateContent({
            model: FALLBACK_MODEL_ID,
            contents: "Write a short 200 word essay about the future of artificial intelligence in academia. Use formal tone."
        });
        const rawText = rawRes.text;
        const rawAnalysis = await analyzeDocument(rawText);
        const rawScore = rawAnalysis.plagiarismScore;

        const fixedRes = await fixPlagiarism(rawText, rawAnalysis.detectedIssues, {
            mode: 'Ghost',
            strength: 90,
            dialect: 'US',
            includeCitations: false
        });
        const fixedText = fixedRes.rewrittenText;

        const fixedAnalysis = await analyzeDocument(fixedText);
        const stealthScore = fixedAnalysis.plagiarismScore;

        const bypassEfficiency = ((rawScore - stealthScore) / (rawScore || 1)) * 100;
        const latency = Date.now() - start;

        return {
            timestamp: Date.now(),
            latency,
            rawAiScore: rawScore,
            stealthScore,
            bypassEfficiency: Math.round(bypassEfficiency),
            status: bypassEfficiency > 60 ? 'PASS' : bypassEfficiency > 30 ? 'WARNING' : 'FAIL'
        };
    } catch (e: any) {
        throw new Error(`Benchmark failed: ${e.message}`);
    }
};

const calculateForensics = (text: string): ForensicData => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgSentenceLength, 2), 0) / (sentenceLengths.length || 1);
    const sentenceVariance = Math.sqrt(variance);
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWordRatio = new Set(words).size / (words.length || 1);
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

export const analyzeDocument = async (text: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  const forensics = calculateForensics(text);
  const chunks = chunkText(text, 12000);
  let chunksToAnalyze = chunks.length > 3 ? [chunks[0], chunks[Math.floor(chunks.length / 2)], chunks[chunks.length - 1]] : chunks.slice(0, 2);

  const systemInstruction = `
    You are a Forensic Text Analyst. Analyze for AI and Plagiarism. 
    You MUST return valid JSON with these fields: { "plagiarismScore": number, "originalScore": number, "critique": string, "detectedIssues": string[], "paragraphBreakdown": [ { "text": string, "riskScore": number, "matchType": string, "evidence": string } ] }.
  `;

  try {
      const results = await Promise.all(chunksToAnalyze.map(chunk => withRetry(() => analyzeSingleChunk(chunk, systemInstruction, ANALYZE_MODEL_ID, true))));
      const validResults = results.filter(r => r !== null);
      
      let totalPlagiarismScore = 0;
      let totalOriginalScore = 0;
      const allIssues = new Set<string>();
      const allParagraphs: ParagraphAnalysis[] = [];
      const allSources: SourceMatch[] = [];
      let worstCritique = "";

      validResults.forEach(result => {
          totalPlagiarismScore += result.plagiarismScore;
          totalOriginalScore += result.originalScore;
          if (Array.isArray(result.detectedIssues)) {
              result.detectedIssues.forEach(i => allIssues.add(i));
          }
          if (Array.isArray(result.paragraphBreakdown)) {
              allParagraphs.push(...result.paragraphBreakdown);
          }
          if (Array.isArray(result.sourcesFound)) {
              allSources.push(...result.sourcesFound);
          }
          if (result.critique && result.critique.length > worstCritique.length) worstCritique = result.critique;
      });

      const uniqueSources = allSources.filter((v,i,a)=>a.findIndex(v2=>(v2.url===v.url))===i);
      let calculatedScore = Math.round(totalPlagiarismScore / (validResults.length || 1));
      if (uniqueSources.length > 0) calculatedScore = Math.max(calculatedScore, 85);
      else if (forensics.sentenceVariance < 4 && forensics.aiTriggerWordsFound.length > 0) calculatedScore = Math.max(calculatedScore, 75);
      else if (forensics.sentenceVariance > 10) calculatedScore = Math.min(calculatedScore, 20);

      return {
          originalScore: Math.round(totalOriginalScore / (validResults.length || 1)),
          plagiarismScore: calculatedScore,
          critique: worstCritique || "Analysis complete.",
          detectedIssues: Array.from(allIssues),
          paragraphBreakdown: allParagraphs,
          sourcesFound: uniqueSources,
          forensics
      };
  } catch (error) { throw error; }
};

const analyzeSingleChunk = async (text: string, systemInstruction: string, modelId: string, useSearch: boolean = true): Promise<AnalysisResult> => {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: text,
        config: { systemInstruction, tools: useSearch ? [{ googleSearch: {} }] : undefined }
    });
    const sources: SourceMatch[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) sources.push({ url: chunk.web.uri, title: chunk.web.title || "External Source", snippet: "Matched via Search", similarity: 100 });
        });
    }
    const result = parseJSONSafely(response.text || '{}');
    return { ...result, sourcesFound: sources.concat(result.sourcesFound || []), forensics: calculateForensics(text) } as AnalysisResult;
}

export const fixPlagiarism = async (text: string, currentIssues: string[], options: FixOptions, onProgress?: (percent: number) => void): Promise<FixResult> => {
  const { includeCitations, citationStyle, mode, strength, dialect } = options;
  const chunks = chunkText(text, 20000);
  const systemInstruction = `You are a Ghostwriter. 
  Banned words to NEVER use: ${BANNED_WORDS.join(", ")}. 
  Mode: ${mode}. 
  Dialect: ${dialect}. 
  You MUST return a JSON object with strictly these fields: 
  { 
    "rewrittenText": "the new text", 
    "newPlagiarismScore": number (0-5), 
    "improvementsMade": string[] (MUST be an array of strings), 
    "references": string[] (MUST be an array of strings) 
  }`;
  
  const processChunk = async (chunk: string): Promise<any> => {
      const response = await ai.models.generateContent({
          model: FIX_MODEL_ID,
          contents: chunk,
          config: { 
            systemInstruction, 
            temperature: mode === 'Ghost' ? 1.5 : 0.9, 
            tools: includeCitations ? [{ googleSearch: {} }] : undefined
          }
      });
      return parseJSONSafely(response.text || '{}');
  };

  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
      const res = await processChunk(chunks[i]);
      chunkResults.push(res);
      if (onProgress) onProgress(Math.round(((i + 1) / chunks.length) * 100));
  }

  const rewrittenChunks: string[] = [];
  const allImprovements = new Set<string>();
  const allReferences = new Set<string>();
  let totalScore = 0;
  
  chunkResults.forEach(res => {
      if (res) {
          rewrittenChunks.push(res.rewrittenText || '');
          totalScore += (res.newPlagiarismScore || 0);
          // Defensive check to prevent "forEach is not a function" error
          if (Array.isArray(res.improvementsMade)) {
              res.improvementsMade.forEach((imp: any) => {
                if (typeof imp === 'string') allImprovements.add(imp);
              });
          }
          if (Array.isArray(res.references)) {
              res.references.forEach((ref: any) => {
                if (typeof ref === 'string') allReferences.add(ref);
              });
          }
      }
  });

  return {
    rewrittenText: rewrittenChunks.join('\n\n'),
    newPlagiarismScore: Math.round(totalScore / (chunkResults.length || 1)),
    improvementsMade: Array.from(allImprovements).slice(0, 6),
    references: Array.from(allReferences)
  };
};

export const generatePresentationContent = async (text: string): Promise<SlideContent[]> => {
    const response = await ai.models.generateContent({
        model: FALLBACK_MODEL_ID,
        contents: text.slice(0, 30000),
        config: { 
          systemInstruction: "Convert text to 8-12 presentation slides. Return JSON array: [{title, bullets, speakerNotes}]", 
          responseMimeType: "application/json" 
        }
    });
    const parsed = parseJSONSafely(response.text || '[]');
    return Array.isArray(parsed) ? parsed : [];
};
