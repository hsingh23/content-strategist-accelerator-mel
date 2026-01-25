import { GoogleGenAI, Modality } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing in process.env");
  return new GoogleGenAI({ apiKey });
};

export const generateText = async (
  modelName: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> => {
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    
    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating content. Please check your API key and try again.";
  }
};

export const streamText = async (
  modelName: string,
  prompt: string,
  systemInstruction: string | undefined,
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const client = getClient();
    const response = await client.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    let fullText = '';
    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini Stream Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};