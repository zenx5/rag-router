import { Client as TypesenseClient } from 'typesense';
import { type SemanticDB } from './index.ts';

export class TypeSenseAdapter implements SemanticDB {
  private client: TypesenseClient;
  private collectionName: string;

  constructor(config: any, collectionName: string = "rag_documents") {
    // config debe incluir { nodes: [...], apiKey: '...' } según la doc de Typesense
    this.client = new TypesenseClient(config);
    this.collectionName = collectionName;
  }

  private async ensureCollectionExists() {
    try {
      await this.client.collections(this.collectionName).retrieve();
    } catch (error) {
      // Si no existe, la creamos. Usamos un schema genérico que acepte cualquier campo extra.
      await this.client.collections().create({
        name: this.collectionName,
        enable_nested_fields: true,
        fields: [
          { name: 'id', type: 'string' },
          { name: '_rawText', type: 'string' } // El texto que extrajimos en el paso de ingesta
        ]
      });
    }
  }

  async insert(docs: any[]): Promise<void> {
    console.log('inserting docs...')
    await this.ensureCollectionExists();
    
    // TypeSense permite inserción en batch (lotes) nativa
    await this.client.collections(this.collectionName).documents().import(docs, { action: 'upsert' });
  }

  async search(query: string, limit: number): Promise<any[]> {
    const searchParameters = {
      q: query,
      query_by: '_rawText', // Buscamos principalmente en el texto que extrajimos
      per_page: limit
    };
    
    const response = await this.client.collections(this.collectionName).documents().search(searchParameters);
    
    // Mapeamos los hits para devolver solo el documento plano
    return response.hits?.map(hit => hit.document) || [];
  }
}