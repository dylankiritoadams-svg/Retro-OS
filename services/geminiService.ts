import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
const modelName = 'gemini-2.5-flash';

const getAiInstance = (): GoogleGenAI => {
    if (!aiInstance) {
        if (typeof process === 'undefined' || !process.env || !process.env.API_KEY) {
            throw new Error("API Key is not configured. Please set API_KEY in your environment variables.");
        }
        aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiInstance;
};

export const getWriterSuggestion = async (prompt: string): Promise<string> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                temperature: 0.7,
                topP: 1,
                topK: 1,
                maxOutputTokens: 2048,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for writer suggestion:", error);
        throw error;
    }
};

export const getGroundedResponse = async (query: string): Promise<GenerateContentResponse> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateContent({
            model: modelName,
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return response;
    } catch (error) {
        console.error("Error calling Gemini API for grounded response:", error);
        throw error;
    }
};

export const generateMacShopImage = async (prompt: string, width: number, height: number): Promise<string> => {
    try {
        const ai = getAiInstance();
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
            }
        });
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error calling Gemini API for image generation:", error);
        throw error;
    }
};

export const createChirperPersona = async (bio: string): Promise<{ name: string, handle: string }> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `Based on the following user biography, create a plausible and creative name and a Twitter-style handle (starting with @).
        
        Biography: "${bio}"
        
        Return ONLY the JSON object.`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        handle: { type: Type.STRING },
                    },
                    required: ["name", "handle"]
                },
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for Chirper persona creation:", error);
        throw error;
    }
};

export const generateChirperFeed = async (users: { id: string, bio: string }[]): Promise<{ chirps: { userId: string, content: string }[] }> => {
    try {
        const ai = getAiInstance();
        const personas = users.map(u => `- User ID ${u.id}: ${u.bio}`).join('\n');
        const fullPrompt = `You are a social media simulator. Given a list of AI personas, generate a feed of 5 "chirps" (like tweets). Each chirp should be from one of the users and reflect their personality.
        
        Personas:
        ${personas}
        
        Generate a JSON array of 5 chirp objects. Each object must have a "userId" and a "content" field. The content should be under 280 characters.`;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        chirps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    userId: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                },
                                required: ["userId", "content"]
                            }
                        }
                    },
                    required: ["chirps"]
                },
                temperature: 0.9,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error calling Gemini API for Chirper feed generation:", error);
        throw error;
    }
};

export const generateNpc = async (prompt: string): Promise<any> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `You are a creative assistant for a tabletop role-playing game master. Based on the following concept, generate an NPC.
Concept: "${prompt}"
Generate a name, a short description, and a secret.`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        secrets: { type: Type.STRING },
                    },
                    required: ["name", "description", "secrets"]
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for NPC generation:", error);
        throw error;
    }
};

export const generateLocation = async (prompt: string): Promise<any> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `You are a creative assistant for a tabletop role-playing game master. Based on the following concept, generate a location.
Concept: "${prompt}"
Generate a name and a description.`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                    },
                    required: ["name", "description"]
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for Location generation:", error);
        throw error;
    }
};

export const generateFaction = async (prompt: string): Promise<any> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `You are a creative assistant for a tabletop role-playing game master. Based on the following concept, generate a faction.
Concept: "${prompt}"
Generate a name, its goals, and its available resources.`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        goals: { type: Type.STRING },
                        resources: { type: Type.STRING },
                    },
                    required: ["name", "goals", "resources"]
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for Faction generation:", error);
        throw error;
    }
};

export const generateItem = async (prompt: string): Promise<any> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `You are a creative assistant for a tabletop role-playing game master. Based on the following concept, generate a magic item.
Concept: "${prompt}"
Generate a name, a description, and its magical properties.`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        properties: { type: Type.STRING },
                    },
                    required: ["name", "description", "properties"]
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for Item generation:", error);
        throw error;
    }
};

export const generateStoryArc = async (prompt: string): Promise<any> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `You are a creative assistant for a tabletop role-playing game master. Based on the following concept, generate a story arc outline.

Concept: "${prompt}"

Generate a name, a summary, a list of key events, ideas for linked lore (NPCs, locations), and a potential resolution.`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A compelling name for the story arc." },
                        summary: { type: Type.STRING, description: "A short summary of the story arc for the game master." },
                        keyEvents: { type: Type.STRING, description: "A list of key scenes or events that happen in this arc." },
                        linkedLore: { type: Type.STRING, description: "Suggestions for NPCs, locations, or items to link to this arc." },
                        resolution: { type: Type.STRING, description: "How this story arc might conclude or transition to the next one." },
                    },
                    required: ["name", "summary", "keyEvents", "linkedLore", "resolution"]
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for Story Arc generation:", error);
        throw error;
    }
};

export const generateSessionOutline = async (prompt: string): Promise<any> => {
    try {
        const ai = getAiInstance();
        const fullPrompt = `You are a creative assistant for a tabletop role-playing game master. Based on the following concept, generate a session outline.

Concept: "${prompt}"

Generate a creative name for the session, a summary/hook for the players, a list of planned events, and suggestions for linked lore (NPCs, locations, items).`;
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "A creative name for the session." },
                        summary: { type: Type.STRING, description: "A short summary of the session, which can be used as a hook for players." },
                        plannedEvents: { type: Type.STRING, description: "A list of potential scenes or events for the session." },
                        linkedLore: { type: Type.STRING, description: "Suggestions for NPCs, locations, or items relevant to this session." },
                    },
                    required: ["name", "summary", "plannedEvents", "linkedLore"]
                },
                temperature: 0.8,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
        
    } catch (error) {
        console.error("Error calling Gemini API for Session Outline generation:", error);
        throw error;
    }
};