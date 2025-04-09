// This is a simplified client for the ChatGPT API

// Use import.meta.env for Vite environment variables
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
const API_URL = "https://api.openai.com/v1/chat/completions";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function getChatCompletion(messages: Message[]): Promise<string> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error:", errorData);
      return "I'm having trouble connecting to my brain right now. Please try again later.";
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling ChatGPT API:", error);
    return "I'm having trouble connecting to my brain right now. Please try again later.";
  }
}
