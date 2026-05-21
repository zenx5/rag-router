import express from 'express';
import { RAG } from '../src/index.ts';

// Importamos tus nuevos adaptadores oficiales directamente de sus archivos
import { ChromaAdapter } from '../src/adapters/db/chroma.ts';
import { TypeSenseAdapter } from '../src/adapters/db/typesense.ts';
import { OpenAIAdapter } from '../src/adapters/models/openai.ts';

const app = express();
app.use(express.json()); // Vital para procesar los cuerpos JSON en las peticiones POST

// 1. CONFIGURACIÓN DE LAS LLAVES Y ENTORNOS
// Asegúrate de tener la variable de entorno OPENAI_API_KEY configurada en tu terminal
const OPENAI_API_KEY = 'mi-key-publica'//process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ ERROR: Falta la variable de entorno OPENAI_API_KEY.");
  console.error("Por favor ejecute: export OPENAI_API_KEY='tu_api_key' antes de lanzar el servidor.");
  process.exit(1);
}

// 2. INSTANCIAMOS LOS ADAPTADORES REALES
console.log("🔌 Conectando adaptadores con las instancias reales...");

const realVectorialDB = new ChromaAdapter(
  "http://localhost:8000", // URL por defecto de tu ChromaDB
  "rag_router_vectorial"   // Nombre de la colección en Chroma
);

const realSemanticDB = new TypeSenseAdapter(
  {
    nodes: [
      {
        host: 'localhost',
        port: 8108,
        protocol: 'http',
      },
    ],
    apiKey: 'tu_clave_secreta_aqui', // Reemplaza con tu Master API Key de tu TypeSense local
    connectionTimeoutSeconds: 2,
  },
  "rag_router_semantic" // Nombre de la colección en TypeSense
);

// Como la misma clase OpenAIAdapter implementa ambos contratos (LLMModel y EmbeddingModel),
// podemos usar la misma instancia para ambos propósitos en la configuración.
const openAIProvider = new OpenAIAdapter({
  apiKey: OPENAI_API_KEY,
  baseURL: 'http://localhost:1234/v1',
  llmModel: 'google/gemma-3-1b',          // Puedes cambiarlo a 'gpt-4o' si prefieres
  embeddingModel: 'text-embedding-qwen3-embedding-0.6b'
});

// 3. INICIALIZAMOS RAG ENGINE CON FUENTES REALES
const ragEngine = new RAG({
  vectorialDB: realVectorialDB,
  semanticDB: realSemanticDB,
  model: openAIProvider,
  embeddingModel: openAIProvider,
  docDir: './playground/docs', // Lee los mismos JSONs de prueba que creamos antes
  router: express.Router,
  customRouter: {
    '/reload-docs': '/reload'
  }
});

// 4. MONTAMOS LAS RUTAS Y LEVANTAMOS EL SERVIDOR
app.get('/', (req, res) => res.send("Hola desde el Server 2 (Producción Local) de RAG Router"));

app.use('/rag/v1', ragEngine.router);

app.listen(3001, () => {
  console.log("🚀 Server 2 REAL corriendo en http://localhost:3001");
  console.log("\n🔥 Pasos para probar el flujo de extremo a extremo:");
  console.log("1. Cargar datos en tus DBs: GET  http://localhost:3001/rag/v1/reload");
  console.log("2. Hacer consulta real RAG: POST http://localhost:3001/rag/v1/query");
});