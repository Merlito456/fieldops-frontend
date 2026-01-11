import { GoogleGenAI, Type } from "@google/genai";

export interface SafetyInsight {
  risks: string[];
  recommendedGear: string[];
  emergencyProtocol: string;
  summary: string;
}

export interface SiteBriefing {
  rfRisks: string[];
  equipmentGuidance: string;
  maintenancePriority: string;
}

/**
 * ADVANCED SYNTHESIS (Cloud Mode)
 * Uses Gemini 3 Flash for intelligent task analysis.
 */
export const getSafetyInsights = async (taskDescription: string): Promise<SafetyInsight | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this field work task and provide safety insights in JSON format: "${taskDescription}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedGear: { type: Type.ARRAY, items: { type: Type.STRING } },
            emergencyProtocol: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["risks", "recommendedGear", "emergencyProtocol", "summary"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const getSiteBriefing = async (siteName: string, type: string, brand: string): Promise<SiteBriefing | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Technical briefing for ECE engineer: Site ${siteName}, Type ${type}, Vendor ${brand}. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rfRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
            equipmentGuidance: { type: Type.STRING },
            maintenancePriority: { type: Type.STRING }
          },
          required: ["rfRisks", "equipmentGuidance", "maintenancePriority"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Briefing Error:", error);
    return null;
  }
};

/**
 * LOGISTICS OPTIMIZATION
 * Uses Gemini 3 Pro for complex reasoning over field tasks.
 */
export const generateTaskOptimizations = async (tasks: any[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Act as a senior logistics officer. Review these field tasks and provide 3 bullet points on optimizing these specific assignments for an ECE engineer: ${JSON.stringify(tasks)}`,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    return "Failed to load AI optimizations.";
  }
};