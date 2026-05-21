import OpenAI from 'openai';
import { type LLMModel, type EmbeddingModel } from './index.ts';

interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  llmModel?: string;       // ej. 'gpt-4o' o 'gpt-3.5-turbo'
  embeddingModel?: string; // ej. 'text-embedding-ada-002' o 'text-embedding-3-small'
}

export class OpenAIAdapter implements LLMModel, EmbeddingModel {
  private client: OpenAI;
  private llmModel: string;
  private embeddingModel: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL || 'https://api.openai.com/v1' });
    this.llmModel = config.llmModel || 'gpt-3.5-turbo';
    this.embeddingModel = config.embeddingModel || 'text-embedding-ada-002';
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.llmModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // Temperatura baja para RAG (respuestas más precisas)
    });
    
    return response.choices[0].message.content || "No se generó respuesta.";
  }

  async createEmbedding(text: string): Promise<number[]> {
    try{
      console.log("Abriendo conexión con OpenAI...")
      console.log('TEXT: ', text)
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      console.log("Conexión con OpenAI cerrada.")
      return response.data[0].embedding;
    }
    catch(error){
      console.error('❌ ERROR: Al crear embedding:', error);
      throw error;
    }
  }
}