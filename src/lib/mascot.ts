import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function generateMascot() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: 'A professional 3D Pixar-style mascot of a friendly young Indian male student with short black hair, wearing a white shirt and black trousers. He is holding a book in one hand and pointing upwards with the other, with a bright smile. The background MUST be pure black (#000000) to blend with the splash screen. High quality 3D render, vibrant colors.',
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
      },
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
