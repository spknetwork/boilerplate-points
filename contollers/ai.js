const axios = require('axios');

/**
 * Ask Gemini API for a smart response
 * Uses Hive-specific context
 */
const askAI = async (req, res) => {
    try {
        const { question, contextData, context = 'hive_blockchain_guide' } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.warn("⚠️ GEMINI_API_KEY is missing. Falling back to rule-based response.");

            // If we have contextData from frontend, we can still use it for a decent response
            if (contextData && contextData.data) {
                return res.json({
                    message: contextData.data,
                    suggestions: ["Tell me more", "Who is @blocktrades?"]
                });
            }

            return res.json({
                message: "I'm currently in 'offline mode' because my AI brain (API Key) isn't configured in the backend. I can still help with Hive accounts, news, and code snippets though!",
                suggestions: ["What's trending?", "Who is @blocktrades?", "dhive setup"]
            });
        }

        if (!question) {
            return res.status(400).json({ success: false, error: "Question is required" });
        }

        // System Prompt for Hive Specialization
        let systemPrompt = `You are the "Hive Guide", a helpful, elite AI assistant for the Hive blockchain. 
        Your goal is to help users understand Hive, HBD, Resource Credits, and development on Hive.
        Be conversational, smart, and accurate. Avoid "bot-like" repetitive phrases.
        If the user says things like "thank you", respond naturally like a human assistant.
        Keep responses concise but high-quality.`;

        if (contextData && contextData.data) {
            systemPrompt += `\n\n**IMPORTANT CONTEXT (Ground Truth):**\n${contextData.data}\nUse this data to answer the question accurately.`;
        }

        const { audioData } = req.body; // Base64 audio data if present

        const parts = [{ text: `${systemPrompt}\n\nUser Question: ${question || "Please listen to this audio and respond."}` }];

        if (audioData) {
            parts.push({
                inline_data: {
                    mime_type: "audio/webm",
                    data: audioData
                }
            });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                contents: [{ parts }]
            }
        );

        const aiMessage = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I heard you, but I couldn't generate a response.";

        return res.json({
            message: aiMessage,
            suggestions: ["Tell me more", "What else can you do?"]
        });

    } catch (error) {
        const errorDetail = error.response?.data?.error?.message || error.message;
        console.error("AI Controller Error:", errorDetail);

        // Specific handling for Quota/Limit errors
        if (errorDetail.includes("quota") || errorDetail.includes("limit")) {
            return res.json({
                message: "I'm almost online! Your API key is connected, but Google is reporting a **'Quota Limit of 0'**. This usually happens with new keys while they are activating. \n\n**Try this:**\n1. Wait 5-10 minutes for your key to fully activate.\n2. Ensure you selected 'Default Gemini Project' in AI Studio.\n3. Make sure you are using 'gemini-1.5-flash' or 'gemini-2.0-flash' which are free tier compatible.",
                suggestions: ["Try again later", "Check AI Studio Settings"]
            });
        }

        return res.status(500).json({
            success: false,
            error: "Failed to reach AI brain",
            details: errorDetail
        });
    }
};

module.exports = { askAI };
