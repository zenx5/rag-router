export interface EmbeddingModel {
  createEmbedding(text: string): Promise<number[]>;
}