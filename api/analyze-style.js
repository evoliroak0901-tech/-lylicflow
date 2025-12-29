import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { lyrics, prompt } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API_KEY is not configured on the server.' });
    }

    try {
        const genAI = new GoogleGenAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
        });

        const generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    styles: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                animation: { type: Type.STRING },
                                font: { type: Type.STRING },
                                color: { type: Type.STRING },
                            },
                            required: ["id", "animation", "font", "color"]
                        }
                    }
                }
            }
        };

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const result = await model.generateContent({
            contents: [
                { text: JSON.stringify(lyrics) },
                { text: prompt }
            ],
            generationConfig,
            safetySettings,
        });

        const response = await result.response;
        res.status(200).json(JSON.parse(response.text()));
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message });
    }
}
