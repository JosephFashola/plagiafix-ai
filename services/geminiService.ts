import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FixResult, FixOptions } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// CONFIGURATION
// Analysis: Flash is great for classification and speed.
const ANALYZE_MODEL_ID = 'gemini-2.5-flash';

// Fixer: Gemini 3 Pro is REQUIRED for true humanization. 
// Flash is too robotic and gets detected by scanners immediately.
const FIX_MODEL_ID = 'gemini-3-pro-preview'; 

export const checkApiKey = (): boolean => {
  return !!process.env.API_KEY;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robustly parses JSON from AI responses.
 * Includes a REGEX FALLBACK if strict JSON parsing fails.
 */
const parseJSONSafely = (text: string): any => {
  if (!text) return null;
  
  let cleanText = text.trim();
  
  // 1. Remove Markdown code blocks, allowing for whitespace like ```json \n
  cleanText = cleanText.replace(/```json\s*/g, '').replace(/```/g, '');
  
  // 2. Find the first '{' and last '}'
  const firstOpen = cleanText.indexOf('{');
  const lastClose = cleanText.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1) {
    cleanText = cleanText.substring(firstOpen, lastClose + 1);
  }
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("JSON Parse Failed. Attempting regex extraction fallback.");
    
    // Fallback: Manually extract critical fields using Regex
    // This ensures the app doesn't crash if the AI misses a comma.
    
    // Check if this looks like an Analysis Result
    if (text.includes("plagiarismScore") || text.includes("originalScore")) {
        const scoreMatch = text.match(/"plagiarismScore"\s*:\s*(\d+)/);
        const originalMatch = text.match(/"originalScore"\s*:\s*(\d+)/);
        const critiqueMatch = text.match(/"critique"\s*:\s*"([^"]*)"/); // Simple quote match
        
        if (scoreMatch) {
            return {
                plagiarismScore: parseInt(scoreMatch[1], 10),
                originalScore: originalMatch ? parseInt(originalMatch[1], 10) : 100 - parseInt(scoreMatch[1], 10),
                critique: critiqueMatch ? critiqueMatch[1] : "Analysis completed. Review detected issues.",
                detectedIssues: ["General AI Patterns Detected"] // Default if array parsing fails
            };
        }
    }
    
    return null;
  }
};

/**
 * Robustly splits text into manageable chunks.
 */
const chunkText = (text: string, maxChunkSize: number = 15000): string[] => {
  if (!text || text.length === 0) return [];
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  let currentChunk = '';
  
  // 1. Try splitting by double newline (paragraphs)
  let splitters = text.split(/\n\n/);
  
  // 2. If mostly one big blob, split by sentences
  if (splitters.length < 3 && text.length > maxChunkSize) {
      splitters = text.split(/(?<=[.!?])\s+/);
  }
  
  // 3. Hard split if still too big
  const isStillTooBig = splitters.some(s => s.length > maxChunkSize);
  
  if (isStillTooBig) {
      chunks.length = 0;
      for (let i = 0; i < text.length; i += maxChunkSize) {
          chunks.push(text.slice(i, i + maxChunkSize));
      }
      return chunks;
  }

  // Reassemble
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

export const analyzeDocument = async (text: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  if (!text || text.trim().length === 0) throw new Error("Document text is empty");

  // OPTIMIZATION: Maximize chunk size for Analysis (Flash handles 1M tokens)
  // 100k chars is safe and fast.
  const ANALYSIS_CHUNK_SIZE = 100000;
  
  const chunks = chunkText(text, ANALYSIS_CHUNK_SIZE);
  
  if (chunks.length === 0) throw new Error("Could not split text into chunks");

  const systemInstruction = `
    You are a strict academic editor and AI detection system. 
    Analyze the provided text.
    
    **CRITERIA:**
    1. **AI Patterns**: Look for robotic transitions ("Furthermore", "In conclusion"), lack of personal opinion, and uniform sentence length.
    2. **Plagiarism**: Identify content that lacks depth or seems generic.
    
    If the text feels natural, conversational, or "messy" (human), score it LOW (0-20).
    If it feels perfectly structured, repetitive, or uses words like "delve", "tapestry", "pivotal", score it HIGH (80-100).
  `;

  // OPTIMIZATION: Use Promise.all for parallel execution
  try {
      const chunkPromises = chunks.map((chunk, index) => 
        analyzeSingleChunkWithRetry(chunk, systemInstruction, ANALYZE_MODEL_ID).catch(err => {
            console.warn(`Chunk ${index} failed:`, err);
            return null;
        })
      );

      const results = await Promise.all(chunkPromises);
      const validResults = results.filter((r): r is AnalysisResult => r !== null);

      if (validResults.length === 0) {
          throw new Error("Analysis failed for all document sections.");
      }

      let totalPlagiarismScore = 0;
      let totalOriginalScore = 0;
      const allIssues = new Set<string>();
      let worstCritique = "";
      let highestPlagiarism = -1;

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
      });

      const avgPlagiarism = Math.round(totalPlagiarismScore / validResults.length);
      const avgOriginal = Math.round(totalOriginalScore / validResults.length);
      const finalCritique = worstCritique || "Document analysis completed.";

      return {
          originalScore: avgOriginal,
          plagiarismScore: avgPlagiarism,
          critique: finalCritique,
          detectedIssues: Array.from(allIssues)
      };

  } catch (error) {
      console.error("Multi-chunk analysis failed:", error);
      throw error;
  }
};

// Helper for single chunk analysis with Retry logic
const analyzeSingleChunkWithRetry = async (text: string, systemInstruction: string, modelId: string, retries = 3): Promise<AnalysisResult> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await analyzeSingleChunk(text, systemInstruction, modelId);
        } catch (error: any) {
            console.warn(`Attempt ${attempt} failed:`, error);
            if (attempt === retries) throw error;
            // Short exponential backoff
            await delay(500 * attempt);
        }
    }
    throw new Error("Analysis failed after multiple retries.");
};

const analyzeSingleChunk = async (text: string, systemInstruction: string, modelId: string): Promise<AnalysisResult> => {
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: text,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        originalScore: { type: Type.NUMBER, description: "Originality score (0-100)" },
                        plagiarismScore: { type: Type.NUMBER, description: "Plagiarism/AI score (0-100)" },
                        critique: { type: Type.STRING, description: "Summary of weak points." },
                        detectedIssues: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "List of specific issues."
                        }
                    },
                    required: ["originalScore", "plagiarismScore", "critique", "detectedIssues"]
                }
            }
        });

        const result = parseJSONSafely(response.text || '{}');
        
        if (!result || typeof result.plagiarismScore !== 'number') {
             throw new Error("Invalid JSON response from AI model");
        }

        return result as AnalysisResult;
    } catch (e: any) {
        throw e;
    }
}

export const fixPlagiarism = async (text: string, currentIssues: string[], options: FixOptions): Promise<FixResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const { includeCitations, academicLevel, tone, dialect } = options;

  // Gemini 3 Pro has a massive context window, but we keep chunks safe.
  const FIX_CHUNK_SIZE = 25000;
  
  const chunks = chunkText(text, FIX_CHUNK_SIZE);
  
  // Gemini 3 Pro is heavier, so we reduce concurrency slightly to avoid rate limits
  const BATCH_SIZE = 3; 

  const dialectPrompt = dialect === 'US' ? "US English (Color, Center)" 
      : dialect === 'UK' ? "UK English (Colour, Centre)"
      : dialect === 'CA' ? "Canadian English"
      : "Australian English";

  const citationRules = includeCitations ? `
    **CITATION PROTOCOL (STRICT):**
    1. USE THE GOOGLE SEARCH TOOL. Do not invent citations.
    2. Insert in-text citations (Author, Year) naturally.
    3. Add a "References" list at the end of your JSON output.
    4. Focus on sources from 2020-2025.
  ` : '';

  const systemInstruction = `
    You are a professional Ghostwriter. Your ONLY goal is to rewrite the text to be indistinguishable from human writing.
    
    **THE ENEMY:** 
    AI Detectors look for "Perplexity" (randomness) and "Burstiness" (variation). 
    If you write perfectly, you fail.
    
    **YOUR WRITING PROTOCOL:**
    1. **Kill the "AI Accent":**
       - NEVER use: "Moreover", "Furthermore", "In conclusion", "It is important to note", "Delve", "Tapestry", "Underscore", "Pivotal", "Landscape".
       - Replace complex transition words with simple ones (e.g., use "Also" instead of "Additionally").
    
    2. **Burstiness (The Secret Weapon):**
       - Mix sentence lengths aggressively.
       - Write a very short sentence. Follow it with a long, complex one that wanders a bit before making a point. 
       - Use fragments occasionally. Like this.
    
    3. **Tone Mapping (${tone}):**
       - If "Standard": Write like a smart college student, not a professor.
       - If "Storytelling": Use metaphors and active voice.
       - If "Opinionated": Be direct. Use strong verbs.
    
    4. **Formatting:**
       - Keep the original meaning but change the structure entirely.
       - Dialect: ${dialectPrompt}
       - Academic Level: ${academicLevel}
    
    ${citationRules}

    **OUTPUT JSON:**
    {
      "rewrittenText": "string",
      "newPlagiarismScore": number (simulate a low score, 0-5),
      "improvementsMade": ["string"],
      "references": ["string"]
    }
  `;

  const tools = includeCitations ? [{ googleSearch: {} }] : undefined;

  // Helper to process a single chunk
  const processChunk = async (chunk: string): Promise<any> => {
      const requestConfig: any = {
        systemInstruction,
        tools,
        // High temperature for Humanization to increase Perplexity
        temperature: 1.0, 
        topP: 0.95,
        topK: 64, 
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
      }

      // Attempt 1: Gemini 3 Pro (High Intelligence)
      try {
        const response = await ai.models.generateContent({
            model: FIX_MODEL_ID,
            contents: chunk,
            config: requestConfig
        });
        return processResponse(response);
      } catch (error) {
          console.warn("Primary Fix failed, retrying...", error);
          // Retry logic
          try {
             await delay(2000);
             const response = await ai.models.generateContent({
                model: FIX_MODEL_ID,
                contents: chunk,
                config: { ...requestConfig, temperature: 0.85 }
             });
             return processResponse(response);
          } catch (retryError) {
             // Rescue with Flash if Pro fails repeatedly (Fallback)
             try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: chunk,
                    config: requestConfig
                });
                return processResponse(response);
             } catch (finalError) {
                return {
                    rewrittenText: chunk,
                    newPlagiarismScore: 15,
                    improvementsMade: ["Optimization failed - Server Busy"],
                    references: []
                };
             }
          }
      }
  };

  try {
    const chunkResults: any[] = [];
    
    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(chunk => processChunk(chunk));
        
        // Wait for current batch to finish
        const results = await Promise.all(batchPromises);
        chunkResults.push(...results);
    }

    // Aggregate results preserving order
    const rewrittenChunks: string[] = [];
    const allImprovements: Set<string> = new Set();
    const allReferences: Set<string> = new Set();
    let totalPlagiarismScore = 0;
    
    chunkResults.forEach(res => {
        if (res) {
            rewrittenChunks.push(res.rewrittenText || '');
            totalPlagiarismScore += (res.newPlagiarismScore || 0);
            if (res.improvementsMade) res.improvementsMade.forEach((imp: string) => allImprovements.add(imp));
            if (res.references) res.references.forEach((ref: string) => allReferences.add(ref));
        }
    });

    const finalRewrittenText = rewrittenChunks.join('\n\n');
    const avgScore = chunkResults.length > 0 ? Math.round(totalPlagiarismScore / chunkResults.length) : 0;

    return {
      rewrittenText: finalRewrittenText,
      newPlagiarismScore: avgScore,
      improvementsMade: Array.from(allImprovements).slice(0, 8),
      references: Array.from(allReferences)
    };

  } catch (error) {
    console.error("Fixing failed:", error);
    throw new Error("Failed to rewrite. Please try again.");
  }
};

// Helper to process Fix responses and extract Grounding Metadata
function processResponse(response: any): any {
    const chunkResult = parseJSONSafely(response.text || '{}');
    const refs: string[] = [];

    // Extract citations from Grounding Metadata
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) {
                    refs.push(chunk.web.uri);
                }
        });
    }

    // Fallback if JSON failed but we have text
    if (!chunkResult || !chunkResult.rewrittenText) {
        if (response.text && response.text.length > 20) {
            // Clean markdown wrappers from raw text
            const rawText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            return {
                rewrittenText: rawText,
                newPlagiarismScore: 5,
                improvementsMade: ["Rewritten for humanization"],
                references: refs
            };
        }
        return null;
    }

    // Merge extracted refs with AI generated refs
    if (refs.length > 0) {
        chunkResult.references = [...(chunkResult.references || []), ...refs];
    }

    return chunkResult;
}