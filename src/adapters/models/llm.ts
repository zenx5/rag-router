export interface LLMModel {
  generate(prompt: string): Promise<string>;
}