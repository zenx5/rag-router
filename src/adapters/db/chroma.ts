import { ChromaClient, type Collection } from 'chromadb';
import { type VectorialDB } from './index.ts';

export class ChromaAdapter implements VectorialDB {
  private client: ChromaClient;
  private collectionName: string;
  private collectionInstance: Collection | null = null;

  constructor(host: string = "http://localhost:8000", collectionName: string = "rag_collection") {
    this.client = new ChromaClient({ path: host });
    this.collectionName = collectionName;
  }

  // Método auxiliar para asegurar que la colección existe antes de operar
  private async getCollection(): Promise<Collection> {
    if (!this.collectionInstance) {
      this.collectionInstance = await this.client.getOrCreateCollection({
        name: this.collectionName,
      });
    }
    return this.collectionInstance;
  }

  async insert(vectors: number[][], docs: any[]): Promise<void> {
    console.log('inserting vectors...')
    const collection = await this.getCollection();
    
    // ChromaDB requiere IDs únicos para cada vector
    const ids = docs.map(doc => doc.id.toString());
    
    // Convertimos los documentos completos a strings para guardarlos en la metadata
    const metadatas = docs.map(doc => ({ source: 'rag-router', ...doc }));

    await collection.upsert({
      ids: ids,
      embeddings: vectors,
      metadatas: metadatas,
    });
  }

  async search(vector: number[], limit: number): Promise<any[]> {
    const collection = await this.getCollection();
    
    const results = await collection.query({
      queryEmbeddings: [vector],
      nResults: limit,
    });

    // Chroma devuelve arrays anidados, extraemos la metadata que es donde guardamos el documento
    return results.metadatas[0] || [];
  }
}