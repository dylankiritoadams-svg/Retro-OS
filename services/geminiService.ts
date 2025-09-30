import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { ChirperUser, SelectionRect, CampaignNpc, CampaignLocation, CampaignFaction, CampaignItem, CampaignStoryArc, CampaignSession, Task, SubTask } from '../types';

let ai: GoogleGenAI | null = null;
let initError: string | null = null;

// This function lazily initializes the AI instance and handles errors gracefully.
const getAiInstance = (): GoogleGenAI => {
    if (initError) {
        throw new Error(initError);
    }
    if (ai) {
        return ai;
    }

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            // This is a common deployment issue, so provide a clear error message.
            throw new Error("API_KEY environment variable not set. Please configure it in your deployment settings.");
        }
        ai = new GoogleGenAI({ apiKey });
        return ai;
    } catch (e: any) {
        console.error("Failed to initialize GoogleGenAI:", e);
        initError = e.message || "An unknown error occurred during AI service initialization.";
        throw new Error(initError);
    }
};


const model = 'gemini-2.5-flash';

// Simple text generation
const generateText = async (prompt: string): Promise<string> => {
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text;
    } catch (e: any) {
        console.error("Gemini API Error (generateText):", e);
        throw new Error(`Failed to generate text from Gemini API: ${e.message}`);
    }
};

// --- Writer App ---
export const getWriterSuggestion = (prompt: string): Promise<string> => {
    return generateText(prompt);
};

// --- Chirper App ---
export const generateChirperFeed = async (users: ChirperUser[]): Promise<{ chirps: { userId: string, content: string }[] }> => {
    const personaDescriptions = users.map(u => `- ${u.name} (${u.handle}): ${u.bio}`).join('\n');
    const prompt = `You are a social media feed generator. Given the following personas, create a short feed of 5-7 "chirps" from them. Make the chirps feel authentic to their described personalities. Do not include hashtags unless it fits the persona.

Personas:
${personaDescriptions}

Generate a feed. Only a few of the users should post.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: prompt,
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
                                    userId: {
                                        type: Type.STRING,
                                        description: `The handle of the user who is chirping (e.g., "${users.map(u => u.handle).join('", "')}")`,
                                    },
                                    content: {
                                        type: Type.STRING,
                                        description: "The content of the chirp, under 280 characters.",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        const handleToIdMap = new Map(users.map(u => [u.handle, u.id]));
        parsed.chirps.forEach((chirp: any) => {
            chirp.userId = handleToIdMap.get(chirp.userId) || users[0]?.id;
        });

        return parsed;
    } catch (e: any) {
        console.error("Gemini API Error (generateChirperFeed):", e);
        throw new Error(`Failed to generate Chirper feed: ${e.message}`);
    }
};

export const createChirperPersona = async (bio: string): Promise<{ name: string, handle: string }> => {
    const prompt = `Based on the following user biography, generate a creative name and a short, catchy handle (starting with @).

Bio: "${bio}"`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        handle: { type: Type.STRING },
                    },
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (createChirperPersona):", e);
        throw new Error(`Failed to create Chirper persona: ${e.message}`);
    }
};

// --- Tasks App ---
export const generateTasksFromText = async (text: string, currentDate: string): Promise<{ tasks: { title: string, subTasks: string[], startTime?: string, duration?: number }[] }> => {
    const prompt = `Parse the following unstructured text into a list of tasks and sub-tasks. Today's date is ${currentDate}.
- If a specific date or time is mentioned (e.g., "Monday at 2pm", "tomorrow at 10am", "next week"), calculate the full ISO 8601 timestamp for the startTime.
- If a duration is mentioned (e.g., "for 1 hour", "30 minutes"), provide the duration in minutes.
- If no specific time is mentioned, you can omit the startTime and duration properties.

Text: "${text}"`;

    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tasks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    subTasks: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                    },
                                    startTime: { 
                                        type: Type.STRING,
                                        description: "The start time as a full ISO 8601 string (e.g., '2024-08-05T14:00:00.000Z'). Omit if not specified.",
                                    },
                                    duration: {
                                        type: Type.INTEGER,
                                        description: "The duration of the task in minutes. Omit if not specified.",
                                    }
                                },
                            },
                        },
                    },
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateTasksFromText):", e);
        throw new Error(`Failed to generate tasks from text: ${e.message}`);
    }
};


// --- MacShop App ---
const getAspectRatio = (width: number, height: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" => {
    const ratio = width / height;
    const supportedRatios = { "1:1": 1, "3:4": 0.75, "4:3": 1.33, "9:16": 0.56, "16:9": 1.77 };
    const closest = Object.entries(supportedRatios).reduce((prev, curr) => {
        return (Math.abs(curr[1] - ratio) < Math.abs(prev[1] - ratio) ? curr : prev);
    });
    return closest[0] as "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
}

export const generateMacShopImage = async (prompt: string, width: number, height: number): Promise<string> => {
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: getAspectRatio(width, height),
            },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (e: any) {
        console.error("Gemini API Error (generateMacShopImage):", e);
        throw new Error(`Failed to generate image: ${e.message}`);
    }
};

// --- Campaign Weaver ---
const generateJsonForEntityType = async <T,>(prompt: string, schema: any): Promise<T> => {
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateJsonForEntityType):", e);
        throw new Error(`Failed to generate entity: ${e.message}`);
    }
};

export const generateNpc = (prompt: string): Promise<Partial<CampaignNpc>> => generateJsonForEntityType(
    `Generate a non-player character for a fantasy RPG based on this prompt: "${prompt}". Fill out the description and secrets.`,
    { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, secrets: { type: Type.STRING } } }
);

export const generateLocation = (prompt: string): Promise<Partial<CampaignLocation>> => generateJsonForEntityType(
    `Generate a location for a fantasy RPG based on this prompt: "${prompt}". Fill out the description.`,
    { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } }
);

export const generateFaction = (prompt: string): Promise<Partial<CampaignFaction>> => generateJsonForEntityType(
    `Generate a faction for a fantasy RPG based on this prompt: "${prompt}". Describe their goals and resources.`,
    { type: Type.OBJECT, properties: { name: { type: Type.STRING }, goals: { type: Type.STRING }, resources: { type: Type.STRING } } }
);

export const generateItem = (prompt: string): Promise<Partial<CampaignItem>> => generateJsonForEntityType(
    `Generate a magic item for a fantasy RPG based on this prompt: "${prompt}". Fill out its description and properties.`,
    { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, properties: { type: Type.STRING } } }
);

export const generateStoryArc = (prompt: string): Promise<Partial<CampaignStoryArc>> => generateJsonForEntityType(
    `Generate a story arc for a fantasy RPG based on this prompt: "${prompt}". Provide a summary, key events, linked lore, and a possible resolution.`,
    { type: Type.OBJECT, properties: { name: { type: Type.STRING }, summary: { type: Type.STRING }, keyEvents: { type: Type.STRING }, linkedLore: { type: Type.STRING }, resolution: { type: Type.STRING } } }
);

export const generateSessionOutline = (prompt: string): Promise<Partial<CampaignSession>> => generateJsonForEntityType(
    `Generate a session outline for a fantasy RPG based on this prompt: "${prompt}". Provide a summary, planned events, and linked lore. Leave post-session notes empty.`,
    { type: Type.OBJECT, properties: { name: { type: Type.STRING }, summary: { type: Type.STRING }, plannedEvents: { type: Type.STRING }, linkedLore: { type: Type.STRING }, postSessionNotes: { type: Type.STRING, default: "" } } }
);