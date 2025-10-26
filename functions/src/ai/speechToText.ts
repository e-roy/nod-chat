import { onCall } from "firebase-functions/v2/https";

/**
 * Transcribe audio to text using Gemini AI
 */
export const transcribeAudio = onCall(async (request) => {
  const { audioData } = request.data;

  if (!audioData) {
    throw new Error("Audio data is required");
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not set");
    }

    // Call Gemini API directly using REST
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "audio/m4a", // M4A files
                    data: audioData,
                  },
                },
                {
                  text: "Transcribe this audio to text. Only return the transcribed text, nothing else. Do not add any commentary, timestamps, or formatting. Just the plain spoken words.",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error("Failed to transcribe audio");
    }

    const result = await response.json();
    const transcribedText =
      result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return { text: transcribedText };
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio. Please try again.");
  }
});
