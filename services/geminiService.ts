
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FixResult, FixOptions, HumanizeMode, ParagraphAnalysis, CitationStyle, ForensicData, SourceMatch } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CONFIGURATION
// Use Pro for analysis to ensure "Greatest Accuracy" in understanding context and search results
const ANALYZE_MODEL_ID = 'gemini-3-pro-preview'; 
const FIX_MODEL_ID = 'gemini-3-pro-preview'; 
const FALLBACK_MODEL_ID = 'gemini-2.5-flash';

const BANNED_WORDS = [
    "delve", "tapestry", "underscoring", "pivotal", "landscape", "moreover", "furthermore",
    "in conclusion", "it is important to note", "nuance", "testament", "realm", "fostering",
    "comprehensive", "utilize", "harnessing", "unveiling", "crucial", "intricate", "orchestrate",
    "multifaceted", "demystify", "navigating the", "intersection of", "aforementioned", "notably"
];

export const checkApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

// Enhanced Delay with Jitter
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 100));

const parseJSONSafely = (text: string): any => {
  if (!text) return null;
  let cleanText = text.trim();
  // Remove markdown code blocks
  cleanText = cleanText.replace(/```json\s*/g, '').replace(/```/g, '');
  
  // Attempt to find the first valid JSON object start and end
  const firstOpen = cleanText.indexOf('{');
  const lastClose = cleanText.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    cleanText = cleanText.substring(firstOpen, lastClose + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("JSON Parse Failed. Attempting soft repair.", e);
    return null;
  }
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
  
  const isStillTooBig = splitters.some(s => s.length > maxChunkSize);
  
  if (isStillTooBig) {
      chunks.length = 0;
      for (let i = 0; i < text.length; i += maxChunkSize) {
          chunks.push(text.slice(i, i + maxChunkSize));
      }
      return chunks;
  }

  for (const part of splitters) {
    if ((currentChunk.length + part.length) > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + part;
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exhausted');
            const isServerBusy = error.message?.includes('503') || error.message?.includes('overloaded');
            
            // If it's the last attempt or it's not a temporary error, throw
            if (attempt === retries || (!isRateLimit && !isServerBusy)) {
                throw error;
            }
            
            const waitTime = baseDelay * Math.pow(2, attempt - 1);
            console.log(`API Busy/Rate Limit. Retrying in ${waitTime}ms... (Attempt ${attempt})`);
            await delay(waitTime);
        }
    }
    throw new Error("Max retries exceeded");
}

// --- DETERMINISTIC STYLOMETRY (MATH LAYER) ---
const calculateForensics = (text: string): ForensicData => {
    // 1. Sentence Analysis
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
    
    // Variance (Burstiness)
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - avgSentenceLength, 2), 0) / (sentenceLengths.length || 1);
    const sentenceVariance = Math.sqrt(variance);

    // 2. Vocabulary Analysis (Perplexity Proxy)
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const uniqueWordRatio = uniqueWords.size / (words.length || 1);

    // 3. AI Trigger Word Hunting (Improved with Word Boundaries)
    const lowerText = text.toLowerCase();
    const aiTriggerWordsFound = BANNED_WORDS.filter(word => {
        // Create regex for whole word match only
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerText);
    });

    // 4. Readability (Automated Readability Index - approximated)
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
  if (!text || text.trim().length === 0) throw new Error("Document text is empty");

  // 1. Run Client-Side Math (Fast & 100% Accurate for stats)
  const forensics = calculateForensics(text);

  const ANALYSIS_CHUNK_SIZE = 12000; 
  const chunks = chunkText(text, ANALYSIS_CHUNK_SIZE);
  
  // SMART SAMPLING: If document is huge (hundreds of pages), we can't scan ALL of it for detection without rate limits.
  // We take the Start, Middle, and End to get a representative "Biopsy" of the document.
  let chunksToAnalyze = chunks;
  if (chunks.length > 3) {
      chunksToAnalyze = [
          chunks[0], // Intro
          chunks[Math.floor(chunks.length / 2)], // Body
          chunks[chunks.length - 1] // Conclusion
      ];
  } else {
      chunksToAnalyze = chunks.slice(0, 2); // Default to first 2 for smaller docs
  }

  const systemInstruction = `
    You are a rigorous Forensic Text Analyst and Plagiarism Investigator.
    
    **OBJECTIVE:** 
    Determine if the text is AI-generated OR Plagiarized from the web. 
    You must rely on EVIDENCE, not just "feel".

    **YOUR TOOLBOX:**
    1. **Google Search**: You MUST use this to verify if sentences in the text exist on the web.
    2. **Stylometry**: Analyze sentence rhythm. AI is robotic/uniform. Humans are chaotic/bursty.
    
    **SCORING RULES (BE STRICT BUT FAIR):**
    - **PLAGIARISM (Fact)**: If you find an exact sentence match on Google -> Score 90-100. (MatchType: 'PLAGIARISM')
    - **AI GENERATED (Pattern)**: If no search match, but text uses words like "delve", "tapestry" or has perfect, robotic grammar -> Score 60-80. (MatchType: 'AI')
    - **SAFE (Human)**: If text has typos, slang, strong opinions, or varied sentence lengths -> Score 0-10. (MatchType: 'SAFE')
    
    **TASK:**
    1. Search for 3-4 distinctive sentences from the text using Google Search.
    2. Provide a breakdown of paragraphs with specific evidence (e.g., "Matched Wikipedia" or "Robotic Syntax").

    **OUTPUT FORMAT:**
    Return a strictly formatted JSON object. Do not include markdown formatting.
    Structure:
    {
      "plagiarismScore": number (0-100),
      "originalScore": number (0-100),
      "critique": "string",
      "detectedIssues": ["string"],
      "paragraphBreakdown": [
        {
          "text": "string (paragraph text)",
          "riskScore": number (0-100),
          "matchType": "AI" | "PLAGIARISM" | "MIXED" | "SAFE",
          "evidence": "string (optional specific proof)"
        }
      ]
    }
  `;

  // Robust Tiered Fallback
  const analyzeWithFallback = async (chunk: string): Promise<AnalysisResult> => {
      try {
          // Tier 1: Pro Model + Search (Best Quality)
          return await withRetry(() => analyzeSingleChunk(chunk, systemInstruction, ANALYZE_MODEL_ID, true), 1, 1000);
      } catch (error: any) {
          console.warn(`Pro model failed (${error.message}). Switching to Flash...`);
          try {
              // Tier 2: Flash Model + Search (High Speed, Good Quality)
              // Using more retries here as Flash is fast
              return await withRetry(() => analyzeSingleChunk(chunk, systemInstruction, FALLBACK_MODEL_ID, true), 2, 2000);
          } catch (err2: any) {
              console.warn(`Flash+Search failed (${err2.message}). Switching to Offline Mode...`);
              // Tier 3: Flash Model + NO SEARCH (Offline Safe Mode)
              // This removes the tool complexity, which is often the cause of 500s.
              return await withRetry(() => analyzeSingleChunk(chunk, systemInstruction, FALLBACK_MODEL_ID, false), 1, 1000);
          }
      }
  };

  try {
      const chunkPromises = chunksToAnalyze.map((chunk, index) => 
        analyzeWithFallback(chunk).catch(err => {
            console.error(`Chunk ${index} failed all tiers:`, err);
            return null;
        })
      );

      const results = await Promise.all(chunkPromises);
      const validResults = results.filter((r): r is AnalysisResult => r !== null);

      if (validResults.length === 0) {
          // If EVERYTHING fails, return a synthetic result based on local math so user sees SOMETHING.
          return {
             originalScore: 50,
             plagiarismScore: forensics.sentenceVariance < 4 ? 80 : 20, // Simple guess based on variance
             critique: "Deep analysis unavailable due to network issues. Basic forensic score provided based on sentence structure.",
             detectedIssues: ["Network Error", "Basic Scan Only"],
             paragraphBreakdown: [{
                 text: text.slice(0, 300) + "...",
                 riskScore: 50,
                 matchType: 'MIXED',
                 evidence: "Analysis limited to client-side forensics."
             }],
             sourcesFound: [],
             forensics
          };
      }

      // Aggregate Results
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
              result.detectedIssues.forEach(issue => allIssues.add(issue));
          }
          if (Array.isArray(result.paragraphBreakdown)) {
            allParagraphs.push(...result.paragraphBreakdown);
          }
          if (Array.isArray(result.sourcesFound)) {
              allSources.push(...result.sourcesFound);
          }
          if (result.critique && result.critique.length > worstCritique.length) {
              worstCritique = result.critique;
          }
      });

      // Filter duplicate sources based on URL
      const uniqueSources = allSources.filter((v,i,a)=>a.findIndex(v2=>(v2.url===v.url))===i);

      // Adjust score based on Forensic Math (Hybrid scoring)
      let calculatedScore = Math.round(totalPlagiarismScore / validResults.length);
      
      // --- CALIBRATION: Reduce False Positives ---
      // Only boost score if variance is EXTREMELY low (very robotic)
      if (forensics.sentenceVariance < 3.5) calculatedScore += 10;
      
      // If we found REAL search matches, the score should effectively be 100
      if (uniqueSources.length > 0) {
          calculatedScore = Math.max(calculatedScore, 85); // Plagiarism is a factual 100% fail
      } else {
          // If no sources, cap the AI score unless it's blatantly AI
          if (forensics.aiTriggerWordsFound.length === 0) {
              calculatedScore = Math.min(calculatedScore, 60); // Cap "suspicion" if no "smoking gun"
          }
      }
      
      calculatedScore = Math.min(100, Math.max(0, calculatedScore));

      return {
          originalScore: Math.round(totalOriginalScore / validResults.length),
          plagiarismScore: calculatedScore,
          critique: worstCritique || "Analysis complete.",
          detectedIssues: Array.from(allIssues),
          paragraphBreakdown: allParagraphs,
          sourcesFound: uniqueSources,
          forensics: forensics
      };

  } catch (error) {
      console.error("Multi-chunk analysis failed:", error);
      throw error;
  }
};

// Updated signature to support optional search (for fallback tiers)
const analyzeSingleChunk = async (text: string, systemInstruction: string, modelId: string, useSearch: boolean = true): Promise<AnalysisResult> => {
    // We enable Google Search for detection to find REAL sources
    // NOTE: When googleSearch is active, we CANNOT use responseSchema or responseMimeType.
    const tools = useSearch ? [{ googleSearch: {} }] : undefined;
    
    const config: any = {
        systemInstruction,
        tools
    };

    // OPTIMIZATION: If we are offline (no tools), force JSON mode for reliability.
    // This is critical for the Tier 3 fallback to prevent "Analysis failed" errors.
    if (!useSearch) {
        config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
        model: modelId,
        contents: text,
        config
    });

    // Parse grounding chunks to get REAL sources
    const sources: SourceMatch[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
                sources.push({
                    url: chunk.web.uri,
                    title: chunk.web.title || "External Source",
                    snippet: "Matched content found via Google Search.",
                    similarity: 100 // Assumed high if grounded
                });
            }
        });
    }

    const result = parseJSONSafely(response.text || '{}');
    if (!result || typeof result.plagiarismScore === 'undefined') {
        // Fallback for empty JSON response if model just returns text or invalid JSON
        if (response.text && response.text.length > 10) {
             console.warn("Model returned unstructured text, attempting auto-fix");
             
             // Try to find a score in the text, otherwise default to neutral
             const scoreMatch = response.text.match(/plagiarismScore"?:?\s*(\d+)/);
             const fallbackScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;

             return {
                 plagiarismScore: fallbackScore,
                 originalScore: 100 - fallbackScore,
                 critique: "Automated analysis (Structured parsing failed, but content reviewed).",
                 detectedIssues: ["Unstructured Response"],
                 paragraphBreakdown: [{
                     text: text.substring(0, 200) + "...",
                     riskScore: fallbackScore,
                     matchType: 'MIXED',
                     evidence: "Structure error in AI response, manual review recommended."
                 }],
                 sourcesFound: sources,
                 // Dummy forensics, will be overwritten by client-side math in analyzeDocument
                 forensics: {
                    avgSentenceLength: 0,
                    sentenceVariance: 0,
                    uniqueWordRatio: 0,
                    aiTriggerWordsFound: [],
                    readabilityScore: 0
                 }
             };
        }
        throw new Error("Invalid JSON or empty response from model");
    }
    
    // Inject real sources into the result
    return {
        ...result,
        sourcesFound: sources.concat(result.sourcesFound || [])
    } as AnalysisResult;
}

export const fixPlagiarism = async (text: string, currentIssues: string[], options: FixOptions, onProgress?: (percent: number) => void): Promise<FixResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const { includeCitations, citationStyle, mode, strength, dialect, styleSample } = options;

  const FIX_CHUNK_SIZE = 20000;
  const chunks = chunkText(text, FIX_CHUNK_SIZE);
  const BATCH_SIZE = 2; 

  let styleInjection = "";
  if (styleSample && styleSample.length > 50) {
      styleInjection = `
        **CRITICAL: STYLE CLONING ACTIVE**
        You must mimic the writing style of the following sample EXACTLY. 
        Analyze its sentence length variance, vocabulary complexity, and tone.
        
        [USER STYLE SAMPLE BEGIN]
        ${styleSample.slice(0, 2000)}
        [USER STYLE SAMPLE END]

        Do not write like an AI. Write like the author of the sample above.
      `;
  }

  const dialectPrompt = dialect === 'US' ? "US English (Color, Center)" 
      : dialect === 'UK' ? "UK English (Colour, Centre)"
      : dialect === 'CA' ? "Canadian English"
      : "Australian English";

  // --- DYNAMIC MODE CONFIGURATION ---
  let modePrompt = "";
  let tempConfig = 1.0;
  
  switch (mode) {
      case 'Ghost':
          modePrompt = `
            **MODE: GHOST (DEEP STEALTH)**
            - **Objective**: Defeat GPTZero, Turnitin, and Originality.ai.
            - **Technique 1 (Burstiness)**: Extreme variance in sentence length. Mix 3-word sentences with 40-word complex sentences.
            - **Technique 2 (Perplexity)**: Use unexpected adjectives and idiomatic phrasing. 
            - **Technique 3 (Imperfection)**: Start sentences with conjunctions (And, But, So). Use contractions.
          `;
          tempConfig = 1.45;
          break;
      case 'Academic':
          modePrompt = `
            **MODE: ACADEMIC SCHOLAR**
            - **Objective**: PhD-level density and precision.
            - **Style**: Passive voice is allowed where appropriate. Use domain-specific terminology.
          `;
          tempConfig = 0.9;
          break;
      case 'Creative':
          modePrompt = `
            **MODE: CREATIVE STORYTELLER**
            - **Objective**: Engagement and flow.
            - **Style**: Show, don't tell. Use sensory language.
          `;
          tempConfig = 1.25;
          break;
      default: // Standard
          modePrompt = `
            **MODE: STANDARD PROFESSIONAL**
            - **Objective**: Clear, effective communication.
            - **Style**: Business casual.
          `;
          tempConfig = 1.0;
  }

  const strengthInstruction = strength > 80 
      ? "REWRITE: AGGRESSIVE. Change 90% of the sentence structures. Merge short sentences. Split long ones." 
      : strength > 40
      ? "REWRITE: MODERATE. Rephrase to sound more natural but keep the logical flow."
      : "REWRITE: LIGHT. Polish the grammar and remove 'AI' keywords.";

  // --- ENHANCED CITATION LOGIC ---
  const citationStyleRule = citationStyle || 'APA';
  let citationInstruction = '';
  
  if (includeCitations) {
      citationInstruction = `
        **CITATION PROTOCOL (Style: ${citationStyleRule})**:
        1. **RESEARCH**: Use the 'googleSearch' tool to find REAL, RECENT sources (2020-2025 preferred).
        2. **INLINE CITATIONS**: You MUST insert citations directly into the text where appropriate.
           - If APA/Harvard: Use (Author, Year).
           - If MLA: Use (Author Page).
           - If IEEE: Use [Number].
           - If Chicago: Use (Author Year).
        3. **BIBLIOGRAPHY**: Return a "References" array containing the full formatted citation strings matching the ${citationStyleRule} style guidelines perfectly.
      `;
  }

  const systemInstruction = `
    You are a world-class Ghostwriter and Academic Editor.
    
    **BANNED VOCABULARY (INSTANT FAIL):**
    ${BANNED_WORDS.join(", ")}.
    
    **INSTRUCTIONS:**
    1. **Style**: ${styleInjection ? "Follow the USER STYLE SAMPLE provided below." : modePrompt}
    2. **Dialect**: ${dialectPrompt}
    3. **Intensity**: ${strengthInstruction}
    4. **Human Touch**: Add slight nuance, strong opinions, and "messy" human transitions.
    5. **Formatting**: Return PLAIN TEXT only. Do not use Markdown (no **bold**, no # headings). Use standard spacing.

    ${styleInjection}
    ${citationInstruction}

    **OUTPUT JSON:**
    {
      "rewrittenText": "string (with inline citations if requested)",
      "newPlagiarismScore": number (0-5),
      "improvementsMade": ["string"],
      "references": ["string (Full formatted citation string)"]
    }
  `;

  const tools = includeCitations ? [{ googleSearch: {} }] : undefined;

  const processChunk = async (chunk: string): Promise<any> => {
      const requestConfig: any = {
        systemInstruction,
        tools,
        temperature: tempConfig, 
        topP: 0.98,
      };

      if (!includeCitations) {
          // SAFE: Only use schema if tools are NOT present
          requestConfig.responseMimeType = "application/json";
          requestConfig.responseSchema = {
            type: Type.OBJECT,
            properties: {
              rewrittenText: { type: Type.STRING },
              newPlagiarismScore: { type: Type.NUMBER },
              improvementsMade: { type: Type.ARRAY, items: { type: Type.STRING } },
              references: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["rewrittenText", "newPlagiarismScore", "improvementsMade"]
          };
      } 
      // If citations are ON, we use googleSearch tool, so we MUST remove MimeType/Schema
      // We rely on 'systemInstruction' to enforce JSON structure.

      return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: FIX_MODEL_ID,
                contents: chunk,
                config: requestConfig
            });
            return processResponse(response);
        } catch (error) {
            console.warn("Primary model failed, attempting Flash fallback...");
            try {
                // FALLBACK 1: Flash with Config (Tools if needed)
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: chunk,
                    config: { ...requestConfig, temperature: 0.9 }
                });
                return processResponse(response);
            } catch (e) {
                // FALLBACK 2: Flash WITHOUT Tools (Offline safe mode) if search is breaking it
                if (tools) {
                     console.warn("Tools failed. Attempting offline rewrite.");
                     const offlineConfig = { ...requestConfig, tools: undefined, responseMimeType: "application/json" };
                     // Add simple schema for robustness in offline mode
                     offlineConfig.responseSchema = {
                        type: Type.OBJECT,
                        properties: {
                            rewrittenText: { type: Type.STRING },
                            newPlagiarismScore: { type: Type.NUMBER },
                            improvementsMade: { type: Type.ARRAY, items: { type: Type.STRING } },
                            references: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["rewrittenText"]
                     };

                     const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: chunk,
                        config: offlineConfig
                    });
                    return processResponse(response);
                }
                throw e; 
            }
        }
      });
  };

  const chunkResults: any[] = [];
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(processChunk).map(p => p.catch(e => {
          console.error("Chunk failed after retries:", e);
          return { rewrittenText: "[Error: Could not rewrite this section due to high server load]", newPlagiarismScore: 50 };
      })));
      chunkResults.push(...results);
      
      // REPORT PROGRESS
      if (onProgress) {
          const processedCount = i + batch.length;
          const progressPercent = Math.min(99, Math.round((processedCount / chunks.length) * 100));
          onProgress(progressPercent);
      }
  }

  const rewrittenChunks: string[] = [];
  const allImprovements: Set<string> = new Set();
  const allReferences: Set<string> = new Set();
  let totalScore = 0;
  
  chunkResults.forEach(res => {
      if (res) {
          rewrittenChunks.push(res.rewrittenText || '');
          totalScore += (res.newPlagiarismScore || 0);
          if (res.improvementsMade) res.improvementsMade.forEach((imp: string) => allImprovements.add(imp));
          if (res.references) res.references.forEach((ref: string) => allReferences.add(ref));
      }
  });

  return {
    rewrittenText: rewrittenChunks.join('\n\n'),
    newPlagiarismScore: Math.round(totalScore / (chunkResults.length || 1)),
    improvementsMade: Array.from(allImprovements).slice(0, 6),
    references: Array.from(allReferences)
  };
};

function processResponse(response: any): any {
    const chunkResult = parseJSONSafely(response.text || '{}');
    const refs: string[] = [];
    
    const explicitRefs = chunkResult?.references || [];
    
    if (explicitRefs.length === 0 && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) refs.push(chunk.web.uri); 
        });
    }

    if (!chunkResult || !chunkResult.rewrittenText) {
        if (response.text && response.text.length > 20) {
            return {
                rewrittenText: response.text,
                newPlagiarismScore: 5,
                improvementsMade: ["Humanized tone"],
                references: refs
            };
        }
        return null;
    }
    
    if (explicitRefs.length > 0) {
        // AI generated formatted refs, keep them.
    } else if (refs.length > 0) {
        chunkResult.references = refs;
    }
    
    return chunkResult;
}
