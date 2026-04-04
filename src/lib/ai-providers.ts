import { GoogleGenAI } from "@google/genai";

// API Keys from environment only
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const SAMBANOVA_KEY = process.env.SAMBANOVA_API_KEY || "";
const STUDYAI_KEY = process.env.STUDYAI_API_KEY || "";
const EXTRA_KEY = process.env.EXTRA_API_KEY || "";
const LONG_TOKEN = process.env.LONG_TOKEN_100 || "";

// Initialize Gemini
export const genAI = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

// Provider Types
export type AIProvider = 'gemini' | 'openai' | 'sambanova' | 'studyai';

// Configuration for other providers
export const AI_CONFIG = {
  gemini: {
    apiKey: GEMINI_KEY,
    model: "gemini-3-flash-preview",
  },
  openai: {
    apiKey: OPENAI_KEY,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  sambanova: {
    apiKey: SAMBANOVA_KEY,
    baseUrl: "https://api.sambanova.ai/v1",
    model: "llama3-70b",
  },
  studyai: {
    apiKey: STUDYAI_KEY,
    model: "study-ai-v1",
  },
  extra: {
    apiKey: EXTRA_KEY,
  },
  longToken: {
    token: LONG_TOKEN,
  }
};

/**
 * Generic function to call different AI providers
 * This is a placeholder for future multi-provider support
 */
export async function callAI(provider: AIProvider, prompt: string) {
  switch (provider) {
    case 'gemini':
      if (!genAI) throw new Error("Gemini API key is missing.");
      const model = genAI.models.generateContent({
        model: AI_CONFIG.gemini.model,
        contents: prompt,
      });
      return (await model).text;
    
    case 'openai':
      // Placeholder for OpenAI fetch call
      console.log("Calling OpenAI with key:", AI_CONFIG.openai.apiKey.substring(0, 8) + "...");
      return "OpenAI response placeholder";

    case 'sambanova':
      // Placeholder for SambaNova fetch call
      console.log("Calling SambaNova with key:", AI_CONFIG.sambanova.apiKey.substring(0, 8) + "...");
      return "SambaNova response placeholder";

    default:
      throw new Error(`Provider ${provider} not supported yet.`);
  }
}
