import { AIRequest } from "@/types";

export type AIProviderName =
  | "gemini"
  | "groq"
  | "huggingface"
  | "openrouter"
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
