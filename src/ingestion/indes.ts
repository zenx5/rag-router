import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { VectorialDB, SemanticDB } from '../adapters/db/index.ts';
import type { EmbeddingModel } from '../adapters/models/index.ts';

export async function processJsonDirectory(
  docDir: string,
  vectorialDB: VectorialDB,
  semanticDB: SemanticDB,
  embeddingModel: EmbeddingModel
) {
  try {
    const files = await fs.readdir(docDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    let allDocuments: any[] = [];

    // 1. Leer y unificar todos los JSONs
    for (const file of jsonFiles) {
      const filePath = path.join(docDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(fileContent);

      // Si el JSON es un array de objetos, los agregamos. Si es un solo objeto, lo metemos en un array.
      const docsArray = Array.isArray(parsedData) ? parsedData : [parsedData];

      // 2. Normalizar: Asegurar que cada doc tenga un ID y un texto extraíble
      const normalizedDocs = docsArray.map(doc => ({
        ...doc,
        id: doc.id || crypto.randomUUID(), // Generamos ID si no trae
        _rawText: doc.text || doc.content || JSON.stringify(doc) // Fallback para vectorizar
      }));

      allDocuments = allDocuments.concat(normalizedDocs);
    }

    if (allDocuments.length === 0) return 0;

    // 3. Procesar embeddings (Podríamos hacer batching aquí en el futuro)
    const vectors: number[][] = [];
    console.log(allDocuments)
    for (const doc of allDocuments) {
      const vector = await embeddingModel.createEmbedding(doc._rawText);
      vectors.push(vector);
    }

    // 4. Guardar en las bases de datos
    // Insertamos en TypeSense (Semantic)
    await semanticDB.insert(allDocuments);
    
    // Insertamos en ChromaDB (Vectorial)
    await vectorialDB.insert(vectors, allDocuments);

    return allDocuments.length;

  } catch (error) {
    console.error("Error durante la ingesta de documentos:", error);
    throw error;
  }
}