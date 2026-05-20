export interface VectorialDB {
  insert(vectors: number[][], metadatas: any[]): Promise<void>;
  search(vector: number[], limit: number): Promise<any[]>;
}