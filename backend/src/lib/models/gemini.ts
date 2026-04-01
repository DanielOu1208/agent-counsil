import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage, ModelAdapter, ModelOptions } from "./providerAdapter.js";

export function createGeminiAdapter(modelName: string): ModelAdapter {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

  return {
    async *generateStream(
      messages: ChatMessage[],
      options?: ModelOptions,
    ): AsyncIterable<string> {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      });

      // Convert ChatMessage[] to Gemini format
      // Gemini uses system instruction separately and a history of user/model turns
      const systemMsg = messages.find((m) => m.role === "system");
      const conversationMsgs = messages.filter((m) => m.role !== "system");

      const chat = model.startChat({
        systemInstruction: systemMsg ? { role: "user", parts: [{ text: systemMsg.content }] } : undefined,
        history: conversationMsgs.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      });

      const lastMsg = conversationMsgs[conversationMsgs.length - 1];
      if (!lastMsg) return;

      const result = await chat.sendMessageStream(lastMsg.content);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    },
  };
}
