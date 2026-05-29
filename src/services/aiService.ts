import { GoogleGenAI, Type } from '@google/genai';

// Initialize the client using your environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Enforce a strict JSON contract for the multi-skill categorization
const classificationSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ["sales", "support", "urgent", "spam", "other"],
      description: "Classifies the request into sales, support, urgent, spam, or other exactly based on user intent.",
    },
    priority: {
      type: Type.STRING,
      enum: ["low", "medium", "high"],
      description: "Assigns priority based on urgency, intent, language, and business impact.",
    },
    summary: {
      type: Type.STRING,
      description: "Generates a short internal summary that helps an admin understand the request quickly.",
    },
    reason: {
      type: Type.STRING,
      description: "Briefly states the logical reasoning behind the selected classification queue.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence coefficient rating from 0.0 to 1.0.",
    }
  },
  required: ["category", "priority", "summary", "reason", "confidence"],
};

export const analyzeMessage = async (message: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following customer inbound communication and break down the operational metadata according to the required schema rule constraints.\n\nMessage: "${message}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: classificationSchema,
        systemInstruction: "You are an advanced operations engine routing system. Analyze intent with deep semantic precision. Do not wrap code in markdown. Return raw JSON parsing data.",
      },
    });

    if (!response.text) {
      throw new Error("Empty text block string returned from inference engine.");
    }

    // Parse the strict structural output array directly
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Analysis Pipeline failure:", error);
    throw error;
  }
};