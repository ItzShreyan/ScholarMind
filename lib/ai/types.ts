import { AIRequest } from "@/types";

export type AIProviderName =
  | "gemini"
  | "groq"
  | "groq_v2"
  | "huggingface"
  | "openrouter"
  | "openrouter_v2"
  | "together"
  | "local";

export type AIResult = {
  provider: AIProviderName;
  text: string;
};

export interface AIProvider {
  name: AIProviderName;
  generate(input: AIRequest): Promise<AIResult>;
}
