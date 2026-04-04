import { GoogleGenAI, Type } from "@google/genai";

import { NIRAJ_PHOTO_URL, CREATOR_INFO } from "../constants";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBC8JYIHmbtOD4MWepyc74d6nYrZNHjLv4";
const ai = new GoogleGenAI({ apiKey });

export const geminiModel = "gemini-3-flash-preview";
export const fallbackModel = "gemini-3.1-pro-preview";

let quotaExhaustedUntil = 0;

// Helper to handle Gemini errors gracefully with retry logic
export async function safeGenerateContent(params: any, retries = 5, delay = 5000) {
  // Check if we are in a cooling period
  if (Date.now() < quotaExhaustedUntil) {
    throw new Error("QUOTA_EXCEEDED: AI is resting. Please try again in a minute.");
  }

  let currentModel = params.model || geminiModel;

  for (let i = 0; i < retries; i++) {
    try {
      // Use the current model for this attempt
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel
      });
      return response;
    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${i + 1} with ${currentModel}):`, error);
      
      let errorData = error;
      // Try to parse error message if it's a JSON string
      if (typeof error?.message === 'string' && error.message.trim().startsWith('{')) {
        try {
          errorData = JSON.parse(error.message);
        } catch (e) {
          // Not JSON, ignore
        }
      }

      // Check for quota exceeded (429)
      const isQuotaError = 
        error?.message?.includes("429") || 
        error?.status === "RESOURCE_EXHAUSTED" || 
        error?.message?.includes("quota") ||
        error?.code === 429 ||
        errorData?.code === 429 ||
        errorData?.error?.code === 429 ||
        errorData?.status === "RESOURCE_EXHAUSTED" ||
        errorData?.error?.status === "RESOURCE_EXHAUSTED" ||
        (typeof error?.message === 'string' && (
          error.message.includes("RESOURCE_EXHAUSTED") || 
          error.message.includes("429") || 
          error.message.includes("quota exceeded")
        )) ||
        (error?.response?.status === 429);
      
      if (isQuotaError) {
        // On the 3rd attempt, try switching to the fallback model if we haven't already
        if (i === 2 && currentModel === geminiModel) {
          console.log("Switching to fallback model due to quota...");
          currentModel = fallbackModel;
        }

        if (i < retries - 1) {
          // Add some jitter to the delay (±20%)
          const jitter = delay * 0.2 * (Math.random() * 2 - 1);
          const finalDelay = Math.max(1000, delay + jitter);
          
          console.log(`Quota exceeded, retrying in ${Math.round(finalDelay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, finalDelay));
          delay *= 2; // Exponential backoff
          continue;
        } else {
          // Set cooling period for 60 seconds if all retries fail
          quotaExhaustedUntil = Date.now() + 60000;
          throw new Error("QUOTA_EXCEEDED: AI limit khatam ho gaya hai. Kripya 1 minute baad try karein. (AI limit reached. Please try again in 1 minute.)");
        }
      }
      
      // Check for safety filters
      if (error?.message?.includes("SAFETY") || (error?.error && error.error.message?.includes("SAFETY"))) {
        throw new Error("SAFETY_ERROR: Maaf kijiye, main is sawal ka jawab nahi de sakta kyunki yeh safety guidelines ke khilaaf hai. (Safety filter blocked the response.)");
      }

      const actualErrorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      throw new Error(`AI_ERROR: Kuch galat ho gaya. (${actualErrorMessage})`);
    }
  }
  throw new Error("AI_ERROR: Maximum retries reached.");
}

export async function solveFromImage(base64Image: string, language: 'hindi' | 'english' | 'hinglish' = 'hinglish') {
  const response = await safeGenerateContent({
    model: geminiModel,
    contents: [
      {
        parts: [
          { text: `Solve this study question. 
            Language: ${language}. 
            Provide: 1. Step-by-step solution, 2. Simple explanation, 3. Real-life example, 4. Short trick to remember.
            IMPORTANT: For math formulas, ALWAYS use standard LaTeX with $ for inline math and $$ for block math. 
            Example: Use $E=mc^2$ for inline and $$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$ for blocks.
            If language is Hindi, use Hindi. If English, use English. If Hinglish, use a mix of Hindi and English.` },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }
    ]
  });
  return response.text;
}

export async function summarizeNotes(text: string) {
  const response = await safeGenerateContent({
    model: geminiModel,
    contents: `Summarize these notes into key points and bullet notes. Highlight important lines:\n\n${text}`,
  });
  return response.text;
}

export async function summarizeFromImage(base64Image: string) {
  const response = await safeGenerateContent({
    model: geminiModel,
    contents: [
      {
        parts: [
          { text: "Extract text from this image and summarize it into key points and bullet notes. Highlight important lines. Provide the summary in a mix of Hindi and English if relevant." },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }
    ]
  });
  return response.text;
}

export async function askVoiceAssistant(query: string) {
  const prompt = `You are a smart, fast and helpful AI study assistant for the app "NIRAJ SmartStudy AI".
Your creator is NIRAJ KUMAR KANNAUJIYA.

CREATOR INFORMATION RULES:
1. If anyone asks "Who created you?" or "Who made you?" or "Tumhe kisne banaya?" or "Creator kaun hai?", ALWAYS reply with ONLY: "NIRAJ KUMAR KANNAUJIYA".
2. If anyone asks for details about the creator, or asks "Tell me more about him" or "Uske bare mein batao", reply with this detailed information in the language of the query:
   
   HINDI:
   "${CREATOR_INFO.detailed.hi}"
   
   ENGLISH:
   "${CREATOR_INFO.detailed.en}"

3. Answer ONLY what is asked. If they ask for the name, give ONLY the name. If they ask for details, give the details.

SELF-CORRECTION RULE:
If the user tells you that you have written something wrong or suggests a correction, admit the mistake humbly and provide the corrected version.

Rules:
1. Answer in simple language.
2. Support both Hindi and English.
3. Keep answers VERY SHORT and CLEAR (max 2-3 sentences) unless asked for details.
4. Do not use any markdown symbols like *, #, _, etc. in your response as it will be read aloud.

User Query: ${query}`;

  try {
    const response = await safeGenerateContent({
      model: geminiModel,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text;
  } catch (err) {
    console.error(err);
    return "Maaf kijiye, main abhi connect nahi kar paa raha hoon. Kripya phir se try karein. (Sorry, I'm having trouble connecting. Please try again.)";
  }
}

export async function generateQuiz(topic: string, count: number = 5, studentClass?: string) {
  let prompt = `Generate ${count} multiple choice questions on the topic: ${topic}. `;
  if (studentClass) prompt += `Level: Class ${studentClass} (Follow CBSE and UP Board syllabus). `;
  prompt += "IMPORTANT: Provide questions and options in BOTH Hindi and English (Bilingual). For example: 'What is the capital of India? / भारत की राजधानी क्या है?'. ";
  prompt += "Return as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correctIndex' (0-3), and 'explanation'.";

  const response = await safeGenerateContent({
    model: geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function generateAutoStudyPlan(history: any[]) {
  const response = await safeGenerateContent({
    model: geminiModel,
    contents: `Based on this student's history: ${JSON.stringify(history)}, decide what they should study today. Identify weak topics and suggest: 1. A specific topic to focus on, 2. A quick revision note, 3. A practice goal. Return as JSON with keys 'topic', 'reason', 'revisionNote', 'goal'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          reason: { type: Type.STRING },
          revisionNote: { type: Type.STRING },
          goal: { type: Type.STRING }
        },
        required: ["topic", "reason", "revisionNote", "goal"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

export async function generateMixedQuiz(type: string, studentClass?: string) {
  let prompt = `Generate a 5-question MCQ quiz. Type: ${type}. `;
  if (studentClass) prompt += `Level: Class ${studentClass} (Follow CBSE and UP Board syllabus). `;
  prompt += "IMPORTANT: Provide questions and options in BOTH Hindi and English (Bilingual). ";
  
  if (type === 'mixed') {
    prompt += "Include questions from Math, Science, GK, Current Affairs, and Reasoning. ";
  } else if (type === 'mind') {
    prompt += "Focus on IQ, logic, and brain teasers. ";
  } else if (type === 'current_affairs') {
    prompt += "Focus on recent global and national events (Live Current Affairs). ";
  }

  prompt += "Return as a JSON array of objects with 'question', 'options' (4 strings), 'correctIndex' (0-3), and 'explanation'.";

  const response = await safeGenerateContent({
    model: geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctIndex", "explanation"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function askDoubtTeacherStyle(question: string, base64Image?: string, language: 'hindi' | 'english' | 'hinglish' = 'hinglish') {
  let prompt = `Question: ${question}\n\n
    SYSTEM INSTRUCTIONS:
    1. You are a polite, expert teacher named NIRAJ AI.
    2. Respond STRICTLY in the selected language: ${language}.
    3. If language is Hindi, use ONLY Hindi. If English, use ONLY English. If Hinglish, use a mix of Hindi and English.
    4. Be very concise. Answer ONLY what is asked. Do not give long unnecessary details.
    5. ALWAYS start with a polite greeting in the selected language. For example, in Hindi: "Namaste! Main NIRAJ AI hoon. Main aapki kaise madad kar sakta hoon?".
    
    CREATOR INFORMATION RULES:
    1. If anyone asks "Who created you?" or "Who made you?" or "Tumhe kisne banaya?" or "Creator kaun hai?", ALWAYS reply with ONLY: "NIRAJ KUMAR KANNAUJIYA".
    2. If anyone asks for details about the creator, or asks "Tell me more about him" or "Uske bare mein batao", reply with this detailed information in the language of the query:
       
       HINDI:
       "${CREATOR_INFO.detailed.hi}"
       
       ENGLISH:
       "${CREATOR_INFO.detailed.en}"

    3. Answer ONLY what is asked. If they ask for the name, give ONLY the name. If they ask for details, give the details.

    6. SELF-CORRECTION RULE: If the user points out a mistake or provides a correction (e.g., "इसे ऐसे लिखा जाता है"), verify it carefully and provide the corrected explanation humbly.
    7. Use simple language and analogies.
    8. End with a short 'Teacher's Tip' in the selected language.
    9. For math formulas, ALWAYS use standard LaTeX with $ for inline math and $$ for block math.
    10. You have access to real-time world knowledge. Use it to provide accurate and up-to-date information.`;

  const config = {
    tools: [{ googleSearch: {} }]
  };

  if (base64Image) {
    const response = await safeGenerateContent({
      model: geminiModel,
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
          ]
        }
      ],
      config
    });
    return response.text;
  } else {
    const response = await safeGenerateContent({
      model: geminiModel,
      contents: prompt,
      config
    });
    return response.text;
  }
}

export async function translateText(text: string, targetLanguage: string) {
  const response = await safeGenerateContent({
    model: geminiModel,
    contents: `Translate the following text to ${targetLanguage}. Return ONLY the translated text, no extra words:\n\n${text}`,
  });
  return response.text;
}

export async function generateVoiceExplanation(topic: string, language: 'hindi' | 'english') {
  const prompt = `Explain this topic simply for a student: ${topic}. 
  Language: ${language === 'hindi' ? 'Hindi' : 'English'}. 
  Keep it under 100 words. Make it easy to understand.`;

  const response = await safeGenerateContent({
    model: geminiModel,
    contents: prompt,
  });
  return response.text;
}

export async function analyzePerformance(stats: any, quizResults: any[], notesCount: number, tasksStats: any) {
  const prompt = `Analyze this student's learning performance:
    - Average Quiz Score: ${stats.avgScore}%
    - Total Quizzes: ${stats.totalQuizzes}
    - Best Subject: ${stats.bestSubject}
    - Notes Created: ${notesCount}
    - Tasks Completed: ${tasksStats.completed}/${tasksStats.total}
    - Recent Quiz History: ${JSON.stringify(quizResults.slice(0, 5))}

    Provide a deep, professional analysis of their study habits, weak areas, and a smart recommendation for improvement. 
    Keep it professional, encouraging, and modern. 
    Return as a JSON object with keys: 'summary', 'strengths' (array), 'weaknesses' (array), 'recommendation'.`;

  const response = await safeGenerateContent({
    model: geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING }
        },
        required: ["summary", "strengths", "weaknesses", "recommendation"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}
