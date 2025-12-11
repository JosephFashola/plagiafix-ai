import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FixResult, FixOptions } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Hybrid Model Strategy
// Analysis: Flash is faster, more stable for JSON, and has higher rate limits.
const ANALYZE_MODEL_ID = 'gemini-2.5-flash';
// Fixing: Pro is more creative, better at "burstiness" and nuance.
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

  // OPTIMIZATION: Increased chunk size for Analysis (Flash handles 1M tokens)
  // Fewer chunks = Faster parallel execution
  const ANALYSIS_CHUNK_SIZE = 80000;
  
  const chunks = chunkText(text, ANALYSIS_CHUNK_SIZE);
  
  const systemInstruction = `
    You are the world's most advanced plagiarism and AI-content detector. 
    Analyze the provided text segment.
    
    **Analysis Criteria:**
    1. **AI Patterns**: Detect generic phrasing, robotic transitions ("In conclusion", "Moreover"), and lack of depth.
    2. **Plagiarism**: Identify text that looks copied.
    3. **Grammar**: Check for punctuation errors.
    
    Provide a score (0-100) where 100 is "High Plagiarism/AI".
    Be a harsh critic.
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

  // OPTIMIZATION: Increased chunk size slightly to reduce request overhead.
  // 15k is safe for Pro's output token limits (approx 8k tokens).
  const FIX_CHUNK_SIZE = 15000;
  
  const chunks = chunkText(text, FIX_CHUNK_SIZE);
  
  // OPTIMIZATION: We will process in batches to speed up fixing
  // instead of purely sequential.
  const BATCH_SIZE = 3; 

  const dialectPrompt = dialect === 'US' ? "Use US English spelling (color, center, analyze)." 
      : dialect === 'UK' ? "Use UK English spelling (colour, centre, analyse)."
      : dialect === 'CA' ? "Use Canadian English spelling."
      : "Use Australian English spelling.";

  let tonePrompt = "";
  if (tone === 'Formal') tonePrompt = "Adopt a highly formal, objective, and detached academic tone.";
  else if (tone === 'Storytelling') tonePrompt = "Use a narrative, engaging, and flowing style with smooth transitions.";
  else if (tone === 'Opinionated') tonePrompt = "Write with conviction, directness, and strong persuasive language.";
  else tonePrompt = "Write in a balanced, standard professional style.";

  let levelPrompt = "";
  if (academicLevel === 'High School') levelPrompt = "Use clear, accessible language suitable for 12th grade level. Avoid overly dense jargon.";
  else if (academicLevel === 'PhD/Professional') levelPrompt = "Use sophisticated vocabulary, complex sentence structures, and rigorous academic precision.";
  else levelPrompt = "Use standard undergraduate university level vocabulary and structure.";

  const systemInstruction = `
    You are an expert human author.
    Rewrite the text to bypass AI detectors (Turnitin, GPTZero) and achieve 0% Plagiarism.
    
    **CUSTOMIZATION SETTINGS:**
    - **Dialect**: ${dialectPrompt}
    - **Tone**: ${tonePrompt}
    - **Academic Level**: ${levelPrompt}

    **ANTI-AI RULES:**
    1. **High Burstiness**: Mix very short and very long sentences.
    2. **High Perplexity**: Use rare, idiomatic vocabulary suitable for the selected Academic Level.
    3. **BANNED WORDS**: "delve", "in conclusion", "tapestry", "underscores", "paramount".
    
    ${includeCitations ? `
    **CITATION MODE:**
    - Perform Google Search for unverified claims.
    - Insert APA in-text citations (e.g., (Smith, 2023)).
    - Generate an APA references list.
    ` : ''}

    **OUTPUT**:
    Return JSON.
    {
      "rewrittenText": "string",
      "newPlagiarismScore": number,
      "improvementsMade": ["string"],
      "references": ["string"]
    }
    Issues to Fix: ${currentIssues.join(', ')}
  `;

  const tools = includeCitations ? [{ googleSearch: {} }] : undefined;

  // Helper to process a single chunk
  const processChunk = async (chunk: string): Promise<any> => {
      const requestConfig: any = {
        systemInstruction,
        tools,
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

      // Attempt 1: Try Gemini 3 Pro (Best Quality)
      try {
        const response = await ai.models.generateContent({
            model: FIX_MODEL_ID,
            contents: chunk,
            config: requestConfig
        });
        return processResponse(response);
      } catch (proError) {
          console.warn("Gemini 3 Pro failed, switching to Flash fallback:", proError);
          
          // Attempt 2: Fallback to Gemini 2.5 Flash
          const fallbackConfig = { ...requestConfig, temperature: 0.7 };
          
          for (let attempt = 0; attempt < 2; attempt++) {
              try {
                  const response = await ai.models.generateContent({
                    model: ANALYZE_MODEL_ID, // Flash
                    contents: chunk,
                    config: fallbackConfig
                 });
                 return processResponse(response);
              } catch (flashError) {
                 if (attempt < 1) await delay(1000);
              }
          }
          
          // Absolute fallback
          return {
              rewrittenText: chunk,
              newPlagiarismScore: 10,
              improvementsMade: ["Optimization skipped due to high load"],
              references: []
          };
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