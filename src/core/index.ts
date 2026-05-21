import { Router } from 'express';
import type { VectorialDB, SemanticDB } from '../adapters/db/index.ts';
import type { LLMModel, EmbeddingModel } from '../adapters/models/index.ts';
import { buildRagPrompt, buildPromptOfTemplate } from '../utils/prompt.ts';
import { computeRRF } from '../utils/rrf.ts';
import { processJsonDirectory } from '../ingestion/indes.ts';

interface RAGConfig {
  vectorialDB: VectorialDB;
  semanticDB: SemanticDB;
  model: LLMModel;
  embeddingModel: EmbeddingModel;
  docDir: string;
  router: typeof Router;
  customRouter?: Record<string, string>;
  plugins?: any[];
}

export class RAG {
  public router: Router;
  private config: RAGConfig;
  private customRouter: Record<string, string>;
  private routes = {
    query: { path: '/query', method: 'POST', isCustomizable: true, currentPath: '/query', getPath: () => this.routes.query.currentPath },
    health: { path: '/health', method: 'GET', isCustomizable: false, currentPath: '/health', getPath: () => this.routes.health.currentPath },
    semanticSearch: { path: '/semantic-search', method: 'POST', isCustomizable: true, currentPath: '/semantic-search', getPath: () => this.routes.semanticSearch.currentPath },
    vectorialSearch: { path: '/vectorial-search', method: 'POST', isCustomizable: true, currentPath: '/vectorial-search', getPath: () => this.routes.vectorialSearch.currentPath },
    hybridSearch: { path: '/hybrid-search', method: 'POST', isCustomizable: true, currentPath: '/hybrid-search', getPath: () => this.routes.hybridSearch.currentPath }
  }
  public prompts = {} as Record<string, string>;

  constructor(config: RAGConfig) {
    this.config = config;
    this.router = config.router(); // Instanciamos el router de Express
    this.customRouter = Object.assign({
      '/reload-docs': '/reload-docs',
      '/query': '/query',
      '/health': '/health',
      '/semantic-search': '/semantic-search',
      '/vectorial-search': '/vectorial-search',
      '/hybrid-search': '/hybrid-search'
    }, config.customRouter || {});

    this.setupRoutes();
  }

  private setupRoutes() {
    const endpoints = [
        { path: this.customRouter['/query'], method: 'POST', isCustomizable: true, handle:this.handleQuery },
        { path: this.customRouter['/reload-docs'], method: 'GET', isCustomizable: true, handle:this.handleReloadDocs },
        { path: '/health', method: 'GET', isCustomizable: false, handle:this.handleHealth },
        { path: this.customRouter['/semantic-search'], method: 'POST', isCustomizable: true, handle:this.handleSemanticSearch },
        { path: this.customRouter['/vectorial-search'], method: 'POST', isCustomizable: true, handle:this.handleVectorialSearch },
        { path: this.customRouter['/hybrid-search'], method: 'POST', isCustomizable: true, handle:this.handleHybridSearch },
    ]
    for(const endpoint of endpoints) {
      this.callHttp(endpoint.method)(endpoint.path, endpoint.handle.bind(this) || (() => {}));
    }
  }

  private callHttp(method:string) {
    const httpMethod = method.toLowerCase();
    const router = this.router as any;
    // Vinculamos la función al router para no perder el contexto 'this'
    return (router[httpMethod] || router.get).bind(this.router);
  }

  private async handleQuery(req: any, res: any) {
    try {
      const { question, promptTemplate } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Falta el campo 'question' en el body" });
      }
      // 1. Retrieval: Buscar en las bases de datos (Vectorial + Semántica)
      const contextDocs = await this._executeHybridSearch(question);
      // 2. Augmentation: Construir el prompt con el contexto
      const prompt = promptTemplate ? buildPromptOfTemplate(this.prompts, promptTemplate, question, contextDocs) : buildRagPrompt(question, contextDocs);
      // 3. Generation: Pasar el prompt al LLM
      const answer = await this.config.model.generate(prompt);
      // 4. Retornar la respuesta (y opcionalmente los documentos usados como fuentes)
      return res.json({
        answer,
        sources: contextDocs
      });
    } catch (error) {
      console.error("Error en /query:", error);
      return res.status(500).json({ error: "Error interno procesando la consulta RAG" });
    }
  }

  private async handleReloadDocs(req: any, res: any) {
    try {
      // Usamos el directorio configurado por el usuario
      const docDir = this.config.docDir;

      const processedCount = await processJsonDirectory(
        docDir,
        this.config.vectorialDB,
        this.config.semanticDB,
        this.config.embeddingModel
      );

      return res.json({
        message: "Base de conocimientos recargada con éxito",
        documentsProcessed: processedCount
      });

    } catch (error) {
      return res.status(500).json({ error: "Error recargando los documentos" });
    }
  }

  private async handleSemanticSearch(req: any, res: any) {
    try {
      const { question, limit = 5 } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Falta el campo 'question' en el body" });
      }

      const results = await this._executeSemanticSearch(question, limit);
      return res.json({ results });
    } catch (error) {
      console.error("Error en /semantic-search:", error);
      return res.status(500).json({ error: "Error procesando la búsqueda semántica" });
    }
  }

  private async handleVectorialSearch(req: any, res: any) {
    try {
      const { question, limit = 5 } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Falta el campo 'question' en el body" });
      }

      const results = await this._executeVectorialSearch(question, limit);
      return res.json({ results });
    } catch (error) {
      console.error("Error en /vectorial-search:", error);
      return res.status(500).json({ error: "Error procesando la búsqueda vectorial" });
    }
  }

  private async handleHybridSearch(req: any, res: any) {
    try {
      const { question, limit = 5 } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Falta el campo 'question' en el body" });
      }

      const results = await this._executeHybridSearch(question, limit);
      return res.json({ results });
    } catch (error) {
      console.error("Error en /hybrid-search:", error);
      return res.status(500).json({ error: "Error procesando la búsqueda híbrida" });
    }
  }

  private async handleHealth(req: any, res: any) {
    // Lógica de health check de RAG
    res.json({ message: "RAG Engine ready" });
  }

  private async _executeHybridSearch(question: string, limit: number = 5): Promise<any[]> {
    // 1. Ejecutamos ambas búsquedas en paralelo usando Promise.all para ahorrar tiempo.
    // Si ambas tardan 200ms, el total será 200ms en lugar de 400ms.
    const [vectorResults, semanticResults] = await Promise.all([
      this._executeVectorialSearch(question, limit),
      this._executeSemanticSearch(question, limit)
    ]);

    // 2. Fusionamos y reordenamos los resultados usando nuestra función RRF
    // Asumimos que los JSONs de tus usuarios tienen un campo "id" para identificar duplicados.
    const fusedDocs = computeRRF([vectorResults, semanticResults], 'id', limit);

    return fusedDocs;
  }

  private async _executeVectorialSearch(question: string, limit: number = 5): Promise<any[]> {
    // 1. Vectorizamos la pregunta (Embedding)
    // El adapter del embeddingModel se encarga de llamar a OpenAI, HuggingFace, etc.
    const queryVector = await this.config.embeddingModel.createEmbedding(question);

    // 2. Buscamos en la base de datos vectorial usando ese vector
    // El adapter de ChromaDB recibe el vector y devuelve los N documentos más similares
    const vectorResults = await this.config.vectorialDB.search(queryVector, limit);

    return vectorResults;
  }

  private async _executeSemanticSearch(question: string, limit: number = 5): Promise<any[]> {
    // A diferencia de la vectorial, aquí pasamos el string directo.
    // El adapter de TypeSense se encarga de buscar coincidencias de texto.
    const semanticResults = await this.config.semanticDB.search(question, limit);

    return semanticResults;
  }
}