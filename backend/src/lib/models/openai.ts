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
        max_tokens: options?.maxTokens ?? 8192,
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of stream) {
        // Check for usage in the final chunk
        if (chunk.usage && options?.onUsage) {
          options.onUsage({
            promptTokens: chunk.usage.prompt_tokens ?? 0,
            completionTokens: chunk.usage.completion_tokens ?? 0,
            totalTokens: chunk.usage.total_tokens ?? 0,
          });
        }
        
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    },
  };
}
