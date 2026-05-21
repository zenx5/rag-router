import express from 'express';
import { RAG } from '../src/index.ts'; 

const app = express();

// IMPORTANTE: Sin esto, req.body será undefined en tus controladores
app.use(express.json()); 

// --- 1. MOCKS DE LOS ADAPTADORES ---
const mockVectorialDB = {
  insert: async (vectors: number[][], docs: any[]) => console.log(`[Mock VectorialDB] Insertados ${docs.length} vectores.`),
  search: async (vector: number[], limit: number) => [
    { id: "doc_001", text: "El núcleo del Sol alcanza temperaturas de 15 millones de grados Celsius.", source: "vectorial" }
  ]
};

const mockSemanticDB = {
  insert: async (docs: any[]) => console.log(`[Mock SemanticDB] Insertados ${docs.length} documentos.`),
  search: async (query: string, limit: number) => [
    { id: "doc_002", text: "El agua es una sustancia cuya molécula está compuesta por dos átomos de hidrógeno y uno de oxígeno.", source: "semantica" }
  ]
};

const mockEmbeddingModel = {
  createEmbedding: async (text: string) => [0.1, 0.2, 0.3, 0.4] // Devuelve un vector falso
};

const mockLLM = {
  generate: async (prompt: string) => {
    console.log("\n[Mock LLM] Recibí este prompt final:\n", prompt);
    return "Esta es una respuesta generada por el LLM simulado.";
  }
};

// --- 2. INSTANCIAMOS TU LIBRERÍA ---
const ragEngine = new RAG({
  vectorialDB: mockVectorialDB,
  semanticDB: mockSemanticDB,
  model: mockLLM,
  embeddingModel: mockEmbeddingModel,
  docDir: './playground/docs', // Apuntamos a la carpeta de pruebas
  router: express.Router,
  customRouter: {
    '/reload-docs': '/reload' // Mapeamos para probar que funciona tu lógica custom
  }
});

// --- 3. MONTAMOS LAS RUTAS ---
app.get('/', (req, res) => res.send("Hola desde el Playground de RAG Router"));

// Montamos tu router bajo el prefijo /rag/v1
app.use('/rag/v1', ragEngine.router);

// --- 4. INICIAMOS EL SERVIDOR ---
app.listen(3000, () => {
  console.log("🚀 Playground corriendo en http://localhost:3000");
  console.log("\nPrueba estos endpoints:");
  console.log("1. Ingesta: GET  http://localhost:3000/rag/v1/reload");
  console.log("2. Buscar:  POST http://localhost:3000/rag/v1/query");
});