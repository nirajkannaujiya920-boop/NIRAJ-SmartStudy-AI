import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const geminiModel = "gemini-3-flash-preview";

// Helper to handle Gemini errors gracefully with retry logic
async function safeGenerateContent(params: any, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${i + 1}):`, error);
      
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
        (typeof error?.message === 'string' && error.message.includes("RESOURCE_EXHAUSTED"));
      
      if (isQuotaError && i < retries - 1) {
        console.log(`Quota exceeded, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      // Check for quota exceeded (429) on last attempt
      if (isQuotaError) {
        throw new Error("QUOTA_EXCEEDED: AI limit khatam ho gaya hai. Kripya thodi der baad try karein. (AI limit reached. Please try again later.)");
      }
      
      // Check for safety filters
      if (error?.message?.includes("SAFETY") || (error?.error && error.error.message?.includes("SAFETY"))) {
        throw new Error("SAFETY_ERROR: Maaf kijiye, main is sawal ka jawab nahi de sakta kyunki yeh safety guidelines ke khilaaf hai. (Safety filter blocked the response.)");
      }

      throw new Error("AI_ERROR: Kuch galat ho gaya. Kripya internet check karein aur phir se try karein. (Something went wrong with the AI.)");
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
    6. Use simple language and analogies.
    7. End with a short 'Teacher's Tip' in the selected language.`;

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
      ]
    });
    return response.text;
  } else {
    const response = await safeGenerateContent({
      model: geminiModel,
      contents: prompt,
    });
    return response.text;
  }
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
