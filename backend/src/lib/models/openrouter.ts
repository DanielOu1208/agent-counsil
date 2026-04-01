import OpenAI from "openai";
import type { ChatMessage, ModelAdapter, ModelOptions } from "./providerAdapter.js";

export function createOpenRouterAdapter(modelName: string): ModelAdapter {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://sillyhacks.app",
      "X-Title": process.env.OPENROUTER_TITLE ?? "SillyHacks Debate",
    },
  });

  return {
    async *generateStream(
      messages: ChatMessage[],
      options?: ModelOptions,
    ): AsyncIterable<string> {
      const stream = await client.chat.completions.create({
        model: modelName,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    },
  };
}
