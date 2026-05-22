# rag-router 🚀

Un framework RAG (Retrieval-Augmented Generation) agnóstico, modular y ultra-ligero diseñado específicamente para el ecosistema de Node.js y Express. Permite convertir cualquier directorio de documentos en una API RAG completa con búsqueda híbrida, ordenamiento matemático y endpoints customizables en cuestión de minutos.

## ✨ Características
 * 🎯 DX (Developer Experience) Impecable: Declarativo, limpio y completamente integrado como un Middleware/Router de Express.
 * 🔀 Búsqueda Híbrida Avanzada: Combina lo mejor de la búsqueda vectorial y semántica clásica utilizando el algoritmo RRF (Reciprocal Rank Fusion).
 * 🧱 Arquitectura Agnóstica (Basada en Adaptadores): El núcleo de la librería es 100% independiente. Puedes usar cualquier base de datos o modelo de IA implementando una interfaz simple.
 * 📦 Baterías Incluidas: Adaptadores oficiales integrados listos para usar con OpenAI, ChromaDB y TypeSense.
 * 🛠️ Rutas Customizables: Mapea y renombra los endpoints según los estándares de tu API corporativa.
 * 🔌 Sistema Extensible: Diseñado para soportar plugins externos (como dashboards de administración).

## 📦 Instalación
```npm install express rag-router```
## Si usas los adaptadores oficiales, instala sus dependencias correspondientes:
```npm install openai chromadb typesense```

## 🧩 Cómo crear tus conectores
rag-router expone contratos simples para que puedas conectar tu propia base de datos y proveedor de IA.

### Conectores de base de datos
RAG espera dos adaptadores distintos:

- `VectorialDB` para búsquedas por similitud con embeddings.
- `SemanticDB` para búsquedas semánticas de texto.

#### `VectorialDB`
Este adaptador se usa al indexar documentos y al consultar con un vector de embedding.

Debe implementar:

```ts
export interface VectorialDB {
  insert(vectors: number[][], metadatas: any[]): Promise<void>;
  search(vector: number[], limit: number): Promise<any[]>;
}
```

- `insert(vectors, metadatas)`: recibe un array de embeddings y un array paralelo de metadatos/documentos normalizados.
- `search(vector, limit)`: recibe el embedding de la consulta y debe devolver los documentos más similares.

#### `SemanticDB`
Este adaptador se usa para búsquedas de texto directo sobre tu índice.

Debe implementar:

```ts
export interface SemanticDB {
  insert(documents: any[]): Promise<void>;
  search(query: string, limit: number): Promise<any[]>;
}
```

- `insert(documents)`: recibe los documentos normalizados que se van a indexar en la base semántica.
- `search(query, limit)`: recibe la pregunta/palabra clave y devuelve los resultados relevantes.

### Conectores de IA
RAG requiere dos adaptadores para IA:

- `LLMModel` para generar texto.
- `EmbeddingModel` para crear embeddings.

#### `LLMModel`
Debes implementar:

```ts
export interface LLMModel {
  generate(prompt: string): Promise<string>;
}
```

RAG llama a `generate(prompt)` cuando debe completar el prompt construido con el contexto recuperado.

#### `EmbeddingModel`
Debes implementar:

```ts
export interface EmbeddingModel {
  createEmbedding(text: string): Promise<number[]>;
}
```

RAG usa este adaptador para:

- crear embeddings de los documentos durante la ingesta,
- crear embeddings de la pregunta del usuario antes de buscar en la base vectorial.

### Ejemplo mínimo de adaptador
```ts
class MiVectorDB implements VectorialDB {
  async insert(vectors: number[][], metadatas: any[]) {
    // Guardar vectores y metadatos en tu DB vectorial.
  }

  async search(vector: number[], limit: number) {
    // Buscar en tu índice y devolver los mejores documentos.
    return [];
  }
}

class MiSemanticDB implements SemanticDB {
  async insert(documents: any[]) {
    // Indexar documentos en tu motor semántico.
  }

  async search(query: string, limit: number) {
    // Buscar texto y devolver resultados.
    return [];
  }
}

class MiEmbeddingModel implements EmbeddingModel {
  async createEmbedding(text: string) {
    // Crear y devolver un vector de embedding.
    return [];
  }
}

class MiLLM implements LLMModel {
  async generate(prompt: string) {
    // Generar texto con tu LLM.
    return 'respuesta generada';
  }
}
```

> Nota: durante la ingesta, rag-router normaliza cada documento y le añade `id` y `_rawText`. Luego llama a `vectorialDB.insert(vectors, metadatas)` y a `semanticDB.insert(documents)`.

## 🚀 Inicio Rápido (Uso Real)

Configura tu motor RAG conectándolo a tus instancias locales o en la nube:
```javascript
import express from 'express';
import { RAG } from 'rag-router';
import { ChromaAdapter } from 'rag-router/adapters/db/chroma';
import { TypeSenseAdapter } from 'rag-router/adapters/db/typesense';
import { OpenAIAdapter } from 'rag-router/adapters/models/openai';

const app = express();
app.use(express.json()); // Requerido para procesar los cuerpos de las peticiones

// 1. Inicializar Proveedor de IA (Maneja LLM y Embeddings)
const openAIProvider = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  llmModel: 'gpt-3.5-turbo',
  embeddingModel: 'text-embedding-ada-002'
});

// 2. Instanciar el motor RAG
const ragEngine = new RAG({
  vectorialDB: new ChromaAdapter("http://localhost:8000", "mi_coleccion_vectores"),
  semanticDB: new TypeSenseAdapter({
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'tu_typesense_master_key'
  }, "mi_coleccion_semantica"),
  model: openAIProvider,
  embeddingModel: openAIProvider,
  docDir: './docs', // Directorio que contiene tus archivos JSON
  router: express.Router,
  customRouter: {
    '/reload-docs': '/reload' // Personaliza tus endpoints
  }
});

// 3. Montar el router en tu aplicación Express
app.use('/api/v1/rag', ragEngine.router);

app.listen(3000, () => console.log("🔥 RAG Router activo en el puerto 3000"));
```

## 🛣️ Endpoints Disponibles

Por defecto (o personalizados mediante customRouter), ragEngine.router expone las siguientes rutas:



| Método | Endpoint por Defecto | Descripción | Body Requerido |
|--------|----------------------|-------------|----------------|
| POST | /query | Pipeline RAG Completo: Busca contexto híbrido, inyecta en el prompt y genera respuesta con el LLM. | {"question": "string", "promptTemplate"?: "string"} |
|GET|/reload-docs|Escanea el directorio docDir, extrae textos, genera embeddings en lotes y sincroniza las DBs.|Ninguno|
|POST|/hybrid-search|Devuelve los mejores N documentos cruzando ambas bases de datos mediante RRF.|{"question": "string", "limit"?: number}|
|POST|/vectorial-search|Realiza una búsqueda por similitud de cosenos usando embeddings en tu DB vectorial.|{"question": "string", "limit"?: number}|
|POST|/semantic-search|Realiza una búsqueda léxica/semántica basada en palabras clave de texto crudo.|{"question": "string", "limit"?: number}|
|GET|/health|Endpoint interno para monitoreo de estado del motor RAG.|Ninguno|

## 📐 Estructura del Proyecto
El código fuente está organizado bajo una limpia separación de responsabilidades:
 * `src/core/`: Orquestador principal, manejo de ciclos de solicitud-respuesta HTTP y mapeo dinámico del router.
 * `src/adapters/`: Contratos de interfaces y las implementaciones para bases de datos y modelos de IA.
 * `src/ingestion/`: Motores de lectura, parsing y normalización de documentos JSON.
 * `src/utils/`: Algoritmos puros como el RRF (Reciprocal Rank Fusion) y utilidades de renderizado de prompts.

## 📄 Licencia
MIT

## Repositorio
[https://github.com/zenx5/rag-router](https://github.com/zenx5/rag-router)