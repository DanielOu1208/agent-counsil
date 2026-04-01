import OpenAI from "openai";
import type { ChatMessage, ModelAdapter, ModelOptions } from "./providerAdapter.js";

export function createOpenAIAdapter(modelName: string): ModelAdapter {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
