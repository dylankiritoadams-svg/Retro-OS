import { GoogleGenAI, GenerateContentResponse, Type, Chat } from "@google/genai";
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
        const apiKey = import.meta.env.VITE_API_KEY;
        if (!apiKey) {
            // This is a common setup issue, so provide a clear error message.
            throw new Error("Gemini API key not found. Please set the VITE_API_KEY environment variable in your Vercel project settings.");
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

// --- Text Adventure App ---
export const startTextAdventureChat = (): Chat => {
    const aiInstance = getAiInstance();
    return aiInstance.chats.create({
        model: 'gemini-2.5-flash',
        config: {
             systemInstruction: "You are the game master for a retro text-based adventure game. The player is in a strange, isolated cabin and has just turned on an old computer. Be descriptive, mysterious, and guide the player through a short, compelling narrative based on their input. Start with the first message describing what appears on the computer screen.",
        },
    });
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
                                    },
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

export const generateMacShopImage = async (prompt: string, width: number, height: number): Promise<string> => {
    try {
        const aiInstance = getAiInstance();
        
        let aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
        const ratio = width / height;
        if (Math.abs(ratio - 3/4) < 0.1) aspectRatio = "3:4";
        else if (Math.abs(ratio - 4/3) < 0.1) aspectRatio = "4:3";
        else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = "9:16";
        else if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = "16:9";

        const response = await aiInstance.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: aspectRatio,
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
            return imageUrl;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (e: any) {
        console.error("Gemini API Error (generateMacShopImage):", e);
        throw new Error(`Failed to generate image from Gemini API: ${e.message}`);
    }
};

export const generateNpc = async (prompt: string): Promise<Partial<CampaignNpc>> => {
    const fullPrompt = `Generate a detailed TTRPG NPC based on the following concept: "${prompt}". Provide a name, a detailed description, and some secrets or motivations.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The NPC's full name." },
                        description: { type: Type.STRING, description: "A detailed physical and personality description for the NPC." },
                        secrets: { type: Type.STRING, description: "Hidden information, motivations, or secrets the NPC holds." },
                    },
                    required: ["name", "description", "secrets"],
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateNpc):", e);
        throw new Error(`Failed to generate NPC: ${e.message}`);
    }
};

export const generateLocation = async (prompt: string): Promise<Partial<CampaignLocation>> => {
    const fullPrompt = `Generate a detailed TTRPG location based on the following concept: "${prompt}". Provide a name and a rich description including sights, sounds, smells, and potential points of interest.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The name of the location." },
                        description: { type: Type.STRING, description: "A detailed description of the location, including sensory details and points of interest." },
                    },
                    required: ["name", "description"],
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateLocation):", e);
        throw new Error(`Failed to generate location: ${e.message}`);
    }
};

export const generateFaction = async (prompt: string): Promise<Partial<CampaignFaction>> => {
    const fullPrompt = `Generate a detailed TTRPG faction based on the following concept: "${prompt}". Provide a name, their primary goals, and the resources they command.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The name of the faction." },
                        goals: { type: Type.STRING, description: "The faction's primary objectives and motivations." },
                        resources: { type: Type.STRING, description: "The assets, personnel, and influence the faction possesses." },
                    },
                    required: ["name", "goals", "resources"],
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateFaction):", e);
        throw new Error(`Failed to generate faction: ${e.message}`);
    }
};

export const generateItem = async (prompt: string): Promise<Partial<CampaignItem>> => {
    const fullPrompt = `Generate a detailed TTRPG item based on the following concept: "${prompt}". Provide a name, a physical description, and its magical or mundane properties.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The name of the item." },
                        description: { type: Type.STRING, description: "A physical description of the item." },
                        properties: { type: Type.STRING, description: "The item's special abilities, magical properties, or functional uses." },
                    },
                    required: ["name", "description", "properties"],
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateItem):", e);
        throw new Error(`Failed to generate item: ${e.message}`);
    }
};

export const generateStoryArc = async (prompt: string): Promise<Partial<CampaignStoryArc>> => {
    const fullPrompt = `Generate a detailed TTRPG story arc based on the following concept: "${prompt}". Provide a name, a summary, a list of key events, linked lore, and a potential resolution.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The title of the story arc." },
                        summary: { type: Type.STRING, description: "A brief overview of the story arc." },
                        keyEvents: { type: Type.STRING, description: "A list of major plot points or events that will happen." },
                        linkedLore: { type: Type.STRING, description: "Connections to the wider world, history, or other entities." },
                        resolution: { type: Type.STRING, description: "Potential ways the story arc could conclude." },
                    },
                    required: ["name", "summary", "keyEvents"],
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateStoryArc):", e);
        throw new Error(`Failed to generate story arc: ${e.message}`);
    }
};

export const generateSessionOutline = async (prompt: string): Promise<Partial<CampaignSession>> => {
    const fullPrompt = `Generate a TTRPG session outline based on the following concept: "${prompt}". Provide a name for the session, a summary, a list of planned events, and some relevant linked lore.`;
    try {
        const aiInstance = getAiInstance();
        const response = await aiInstance.models.generateContent({
            model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "The title of the session." },
                        summary: { type: Type.STRING, description: "A brief overview of the session's goal." },
                        plannedEvents: { type: Type.STRING, description: "A sequence of potential scenes or events for the session." },
                        linkedLore: { type: Type.STRING, description: "Connections to the wider world, history, or other entities relevant to this session." },
                    },
                    required: ["name", "summary", "plannedEvents"],
                },
            },
        });
        return JSON.parse(response.text.trim());
    } catch (e: any) {
        console.error("Gemini API Error (generateSessionOutline):", e);
        throw new Error(`Failed to generate session outline: ${e.message}`);
    }
};