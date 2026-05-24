# rag-router 🚀

A platform-agnostic, modular, and ultra-lightweight RAG (Retrieval-Augmented Generation) framework designed specifically for the Node.js and Express ecosystem. It allows you to transform any document directory into a complete RAG API with hybrid search, mathematical sorting, and customizable endpoints in minutes..

## ✨ Features
 * 🎯 DX (Developer Experience) Flawless: Declarative, clean, and fully integrated as an Express Middleware/Router.
 * 🔀 Advanced Hybrid Search: Combines the best of vector and classic semantic search using the RRF (Reciprocal Rank Fusion) algorithm.
 * 🧱 Agnostic Architecture (Adapter-Based): The core of the library is 100% independent. You can use any database or AI model by implementing a simple interface.
 * 📦 Batteries Included: Integrated official adapters ready to use with OpenAI, ChromaDB and TypeSense.
 * 🛠️ Customizable Routes: Map and rename endpoints according to your corporate API standards.
 * 🔌 Extensible System: Designed to support external plugins (such as administration dashboards).

## 📦 Install
```npm install express rag-router```<br/>
**If you are using the official adapters, install their corresponding dependencies:** <br/>
```npm install openai chromadb typesense```

## 🧩 How to create your connectors
rag-router exposes simple contracts so you can connect your own database and AI provider.

### Database connectors
RAG expects two different adapters:

- `VectorialDB` for searches based on similarity with embeddings.
- `SemanticDB` for semantic text searches.

#### `VectorialDB`
This adapter is used when indexing documents and querying with an embedding vector.

You must implement:

```ts
export interface VectorialDB {
  insert(vectors: number[][], metadatas: any[]): Promise<void>;
  search(vector: number[], limit: number): Promise<any[]>;
}
```

- `insert(vectors, metadatas)`: It receives an array of embeddings and a parallel array of normalized metadata/documents.
- `search(vector, limit)`: It receives the query embed and must return the most similar documents.

#### `SemanticDB`
This adapter is used for direct text searches on your index..

You must implement:

```ts
export interface SemanticDB {
  insert(documents: any[]): Promise<void>;
  search(query: string, limit: number): Promise<any[]>;
}
```

- `insert(documents)`: receives the standardized documents that will be indexed in the semantic database.
- `search(query, limit)`: It receives the question/keyword and returns the relevant results..

### AI Connectors
RAG requires two adapters for AI:

- `LLMModel` to generate text.
- `EmbeddingModel` to create embeddings.

#### `LLMModel`
You must implement:

```ts
export interface LLMModel {
  generate(prompt: string): Promise<string>;
}
```

RAG calls `generate(prompt)` when it needs to complete the prompt constructed with the retrieved context.

#### `EmbeddingModel`
You must implement:

```ts
export interface EmbeddingModel {
  createEmbedding(text: string): Promise<number[]>;
}
```

RAG uses this adapter to:

- create document embeddings during ingestion,
- create user query embeddings before searching the vector database.

### Minimal example of an adapter
```ts
class MiVectorDB implements VectorialDB {
  async insert(vectors: number[][], metadatas: any[]) {
    // Save vectors and metadata in your vector database.
  }

  async search(vector: number[], limit: number) {
    // Search your index and return the best documents.
    return [];
  }
}

class MiSemanticDB implements SemanticDB {
  async insert(documents: any[]) {
    // Indexing documents in your semantic engine.
  }

  async search(query: string, limit: number) {
    // Search for text and return results.
    return [];
  }
}

class MiEmbeddingModel implements EmbeddingModel {
  async createEmbedding(text: string) {
    // Create and return an embedding vector.
    return [];
  }
}

class MiLLM implements LLMModel {
  async generate(prompt: string) {
    // Generate text with your LLM.
    return 'respuesta generada';
  }
}
```

> Note: During ingestion, rag-router normalizes each document and appends `id` and `_rawText`. It then calls `vectorialDB.insert(vectors, metadata)` and `semanticDB.insert(documents)`.

## 🚀 Quick Start (Real-World Use)

Set up your RAG engine by connecting it to your local or cloud instances:
```javascript
import express from 'express';
import { RAG } from 'rag-router';
import { ChromaAdapter } from 'rag-router/adapters/db/chroma';
import { TypeSenseAdapter } from 'rag-router/adapters/db/typesense';
import { OpenAIAdapter } from 'rag-router/adapters/models/openai';

const app = express();
app.use(express.json()); // Required to process the bodies of the requests

// 1. Initialize AI Provider (Handles LLM and Embeddings)
const openAIProvider = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  llmModel: 'gpt-3.5-turbo',
  embeddingModel: 'text-embedding-ada-002'
});

// 2. Instantiate the RAG engine
const ragEngine = new RAG({
  vectorialDB: new ChromaAdapter("http://localhost:8000", "mi_coleccion_vectores"),
  semanticDB: new TypeSenseAdapter({
    nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
    apiKey: 'tu_typesense_master_key'
  }, "mi_coleccion_semantica"),
  model: openAIProvider,
  embeddingModel: openAIProvider,
  docDir: './docs', // Directory that contains your JSON files
  router: express.Router,
  customRouter: {
    '/reload-docs': '/reload' // Customize your endpoints
  }
});

// 3. Set up the router in your Express app
app.use('/api/v1/rag', ragEngine.router);

app.listen(3000, () => console.log("🔥 RAG Router active on port 3000"));
```

## 🛣️ Available Endpoints

By default (or customized using customRouter), ragEngine.router exposes the following routes:



| Method | Default Endpoint | Description | Body required |
|--------|----------------------|-------------|----------------|
| POST | /query | Complete RAG Pipeline: Searches for hybrid context, injects into the prompt, and generates a response with the LLM. | {"question": "string", "promptTemplate"?: "string"} |
|GET|/reload-docs|Scan the docDir directory, extract text, generate batch embeddings, and synchronize databases.|None|
|POST|/hybrid-search|Returns the best N documents by cross-referencing both databases using RRF.|{"question": "string", "limit"?: number}|
|POST|/vectorial-search|Perform a cosine similarity search using embeddings in your vector database.|{"question": "string", "limit"?: number}|
|POST|/semantic-search|Perform a lexical/semantic search based on raw text keywords.|{"question": "string", "limit"?: number}|
|GET|/health|Internal endpoint for monitoring the RAG engine status.|None|

## 📐 Project Structure
The source code is organized under a clear separation of responsibilities:
* `src/core/`: Main orchestrator, handling HTTP request-response cycles and dynamic router mapping.
* `src/adapters/`: Interface contracts and implementations for databases and AI models.
* `src/ingestion/`: Engines for reading, parsing, and normalizing JSON documents.
* `src/utils/`: Pure algorithms such as RRF (Reciprocal Rank Fusion) and prompt rendering utilities.

## 📄 License
MIT

## Repository
[https://github.com/zenx5/rag-router](https://github.com/zenx5/rag-router)
