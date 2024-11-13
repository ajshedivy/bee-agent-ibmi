import { ChatLLM, ChatLLMOutput } from "bee-agent-framework/llms/chat";
import { getEnv, parseEnv } from "bee-agent-framework/internals/env";
import { z } from "zod";
import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { Client as BAMSDK } from "@ibm-generative-ai/node-sdk";
import { OpenAIChatLLM } from "bee-agent-framework/adapters/openai/chat";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { GroqChatLLM } from "bee-agent-framework/adapters/groq/chat";
import { Ollama } from "ollama";
import Groq from "groq-sdk";

export const Providers = {
  BAM: "bam",
  WATSONX: "watsonx",
  OLLAMA: "ollama",
  OPENAI: "openai",
  GROQ: "groq",
} as const;
type Provider = (typeof Providers)[keyof typeof Providers];

export const LLMFactories: Record<Provider, () => ChatLLM<ChatLLMOutput>> = {
  [Providers.BAM]: () =>
    BAMChatLLM.fromPreset(getEnv("GENAI_MODEL") || "meta-llama/llama-3-1-70b-instruct", {
      client: new BAMSDK({
        apiKey: getEnv("GENAI_API_KEY"),
      }),
    }),
  [Providers.GROQ]: () =>
    new GroqChatLLM({
      modelId: getEnv("GROQ_MODEL") || "llama-3.1-70b-versatile",
      client: new Groq({
        apiKey: getEnv("GROQ_API_KEY"),
      }),
    }),
  [Providers.OPENAI]: () =>
    new OpenAIChatLLM({
      modelId: getEnv("OPENAI_MODEL") || "gpt-4o",
      parameters: {
        temperature: 0,
        max_tokens: 2048,
      },
    }),
  [Providers.OLLAMA]: () =>
    new OllamaChatLLM({
      modelId: getEnv("OLLAMA_MODEL") || "llama3.1:8b",
      parameters: {
        temperature: 0,
        repeat_penalty: 1,
        num_predict: 2000,
      },
      client: new Ollama({
        host: getEnv("OLLAMA_HOST"),
      }),
    }),
  [Providers.WATSONX]: () =>
    WatsonXChatLLM.fromPreset(getEnv("WATSONX_MODEL") || "meta-llama/llama-3-1-70b-instruct", {
      apiKey: getEnv("WATSONX_API_KEY"),
      projectId: getEnv("WATSONX_PROJECT_ID"),
      region: getEnv("WATSONX_REGION"),
    }),
};

export function getChatLLM(provider?: Provider): ChatLLM<ChatLLMOutput> {
  if (!provider) {
    provider = parseEnv("LLM_BACKEND", z.nativeEnum(Providers), Providers.OLLAMA);
  }

  const factory = LLMFactories[provider];
  if (!factory) {
    throw new Error(`Provider "${provider}" not found.`);
  }
  return factory();
}