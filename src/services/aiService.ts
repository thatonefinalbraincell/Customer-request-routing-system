import { GoogleGenAI, Type } from '@google/genai';

// Instantiates the live AI client engine using your secure environment key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIStructuredOutput {
  category: 'sales' | 'support' | 'urgent' | 'spam' | 'other';
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; // Upper case to perfectly match your Prisma/Supabase types
  summary: string;
  confidence: number;
  reason: string;
}

export const analyzeMessage = async (message: string): Promise<AIStructuredOutput> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this customer support request ticket: "${message}"`,
      config: {
        systemInstruction: `
          You are an advanced automated support ticket classification system. 
          Analyze the input text and respond with structured properties.
          
          Priority rules:
          - 'HIGH': Set if the user mentions an application crash, an error message, payment/checkout blocks, severe bugs, or frozen states.
          - 'MEDIUM': Set if a non-breaking feature is buggy, slow, or acting up, but the app is still semi-functional.
          - 'LOW': Set for general inquiries, account assistance, UI feedback, or feature requests.
        `,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ['sales', 'support', 'urgent', 'spam', 'other'] },
            priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] }, // Match database Enums
            summary: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            reason: { type: Type.STRING },
          },
          required: ['category', 'priority', 'summary', 'confidence', 'reason'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Empty text payload returned from AI engine');
    }

    return JSON.parse(response.text) as AIStructuredOutput;
  } catch (error: any) {
    console.error('⚠️ Live AI Analysis failed. Falling back to default baseline rules:', error.message);
    
    // Fallback safe mechanism ensures your server never crashes if the internet or API keys drop out
    return {
      category: 'other',
      priority: 'LOW',
      summary: message.substring(0, 50) + '...',
      confidence: 0.50,
      reason: 'Automated fallback due to upstream inference timeout or network error.',
    };
  }
};