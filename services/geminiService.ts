import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FixResult, FixOptions, HumanizeMode, ParagraphAnalysis, CitationStyle } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CONFIGURATION
const ANALYZE_MODEL_ID = 'gemini-2.5-flash';
const FIX_MODEL_ID = 'gemini-3-pro-preview'; 

const BANNED_WORDS = [
    "delve", "tapestry", "underscoring", "pivotal", "landscape", "moreover", "furthermore",
    "in conclusion", "it is important to note", "nuance", "testament", "realm", "fostering",
    "comprehensive", "utilize", "harnessing", "unveiling", "crucial", "intricate", "orchestrate",
    "multifaceted", "demystify", "navigating the", "intersection of"
];

export const checkApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

// Enhanced Delay with Jitter to prevent Thundering Herd on retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 100));

const parseJSONSafely = (text: string): any => {
  if (!text) return null;
  let cleanText = text.trim();
  cleanText = cleanText.replace(/```json\s*/g, '').replace(/```/g, '');
  const firstOpen = cleanText.indexOf('{');
  const lastClose = cleanText.lastIndexOf('}');
  if (firstOpen !== -1 && lastClose !== -1) {
    cleanText = cleanText.substring(firstOpen, lastClose + 1);
  }
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("JSON Parse Failed. Attempting fallback.", e);
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

// --- GENERIC RETRY WRAPPER ---
// Handles 429 and 503 errors typical in high-load 1000 DAU scenarios
async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 1000): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Resource has been exhausted');
            const isServerBusy = error.message?.includes('503') || error.message?.includes('overloaded');
            
            if (attempt === retries || (!isRateLimit && !isServerBusy)) {
                throw error;
            }
            
            // Exponential backoff: 1s, 2s, 4s...
            const waitTime = baseDelay * Math.pow(2, attempt - 1);
            console.log(`API Busy/Rate Limit. Retrying in ${waitTime}ms... (Attempt ${attempt})`);
            await delay(waitTime);
        }
    }
    throw new Error("Max retries exceeded");
}

export const analyzeDocument = async (text: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  if (!text || text.trim().length === 0) throw new Error("Document text is empty");

  const ANALYSIS_CHUNK_SIZE = 12000; 
  const chunks = chunkText(text, ANALYSIS_CHUNK_SIZE);
  const chunksToAnalyze = chunks.slice(0, 4);

  const systemInstruction = `
    You are an advanced AI Detection System (similar to GPTZero/Turnitin).
    Analyze the provided text.
    
    **TASK:**
    1. Break the text into logical paragraphs.
    2. Score EACH paragraph (0-100) on how "AI-Generated" it sounds.
       - High Score (80-100) = Robotic, perfect grammar, "delve/tapestry", uniform sentence length.
       - Low Score (0-20) = Human, messy, conversational, variable length, strong opinion.
    3. Provide an overall critique.
  `;

  try {
      const chunkPromises = chunksToAnalyze.map((chunk, index) => 
        withRetry(() => analyzeSingleChunk(chunk, systemInstruction, ANALYZE_MODEL_ID)).catch(err => {
            console.warn(`Chunk ${index} failed analysis:`, err);
            return null;
        })
      );

      const results = await Promise.all(chunkPromises);
      const validResults = results.filter((r): r is AnalysisResult => r !== null);

      if (validResults.length === 0) {
          throw new Error("Analysis failed. Please try again.");
      }

      let totalPlagiarismScore = 0;
      let totalOriginalScore = 0;
      const allIssues = new Set<string>();
      let worstCritique = "";
      let highestPlagiarism = -1;
      const allParagraphs: ParagraphAnalysis[] = [];

      validResults.forEach(result => {
          totalPlagiarismScore += result.plagiarismScore;
          totalOriginalScore += result.originalScore;
          
          if (Array.isArray(result.detectedIssues)) {
              result.detectedIssues.forEach(issue => allIssues.add(issue));
          }

          if (result.plagiarismScore > highestPlagiarism) {
              highestPlagiarism = result.plagiarismScore;
              worstCritique = result.critique;
          }

          if (result.paragraphBreakdown) {
            allParagraphs.push(...result.paragraphBreakdown);
          }
      });

      const avgPlagiarism = Math.round(totalPlagiarismScore / validResults.length);
      const avgOriginal = Math.round(totalOriginalScore / validResults.length);
      const finalCritique = worstCritique || "Document analysis completed.";

      return {
          originalScore: avgOriginal,
          plagiarismScore: avgPlagiarism,
          critique: finalCritique,
          detectedIssues: Array.from(allIssues),
          paragraphBreakdown: allParagraphs
      };

  } catch (error) {
      console.error("Multi-chunk analysis failed:", error);
      throw error;
  }
};

const analyzeSingleChunk = async (text: string, systemInstruction: string, modelId: string): Promise<AnalysisResult> => {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: text,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    originalScore: { type: Type.NUMBER },
                    plagiarismScore: { type: Type.NUMBER },
                    critique: { type: Type.STRING },
                    detectedIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
                    paragraphBreakdown: { 
                        type: Type.ARRAY, 
                        items: { 
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING }, // First 50 chars of paragraph to identify it
                                riskScore: { type: Type.NUMBER },
                                reason: { type: Type.STRING }
                            }
                        } 
                    }
                },
                required: ["originalScore", "plagiarismScore", "critique", "paragraphBreakdown"]
            }
        }
    });

    const result = parseJSONSafely(response.text || '{}');
    if (!result) throw new Error("Invalid JSON");
    return result as AnalysisResult;
}

export const fixPlagiarism = async (text: string, currentIssues: string[], options: FixOptions): Promise<FixResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const { includeCitations, citationStyle, mode, strength, dialect, styleSample } = options;

  const FIX_CHUNK_SIZE = 20000;
  const chunks = chunkText(text, FIX_CHUNK_SIZE);
  const BATCH_SIZE = 2; // Reduced batch size for stability during high concurrency

  // --- STYLE CLONING LOGIC ---
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
      } else {
         requestConfig.responseMimeType = "application/json"; 
      }

      return withRetry(async () => {
        try {
            const response = await ai.models.generateContent({
                model: FIX_MODEL_ID,
                contents: chunk,
                config: requestConfig
            });
            return processResponse(response);
        } catch (error) {
            // Only retry if it's a real error, not a fallback scenario logic issue
            // But we can fallback to Flash inside here
            console.warn("Primary model failed, attempting Flash fallback...");
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: chunk,
                    config: { ...requestConfig, temperature: 0.9 }
                });
                return processResponse(response);
            } catch (e) {
                // If Flash fails, throw so withRetry can handle it or finally fail
                throw e; 
            }
        }
      });
  };

  const chunkResults: any[] = [];
  
  // Use sequential processing for parts of the batch if needed, but BATCH_SIZE=2 is safe
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(processChunk).map(p => p.catch(e => {
          console.error("Chunk failed after retries:", e);
          return { rewrittenText: "[Error: Could not rewrite this section due to high server load]", newPlagiarismScore: 50 };
      })));
      chunkResults.push(...results);
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
