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


## 🚀 Inicio Rápido (Uso Real)

Configura tu motor RAG conectándolo a tus instancias locales o en la nube:
```
import express from 'express';
import { RAG } from 'rag-router';
import { ChromaAdapter, TypeSenseAdapter } from 'rag-router/adapters/db';
import { OpenAIAdapter } from 'rag-router/adapters/models';

const app = express();
app.use(express.json()); // Requerido para procesar los cuerpos de las peticiones

// 1. Inicializar Proveedor de IA (Maneja LLM y Embeddings)
const openAIProvider = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  llmModel: 'gpt-3.5-turbo',
  embeddingModel: 'text-embedding-ada-002'
});

// 2. Instanciar el motor RAG con adaptadores reales
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
  coustomRouter: {
    '/reload-docs': '/reload' // Personaliza tus endpoints
  }
});

// 3. Montar el router en tu aplicación Express
app.use('/api/v1/rag', ragEngine.router);

app.listen(3000, () => console.log("🔥 RAG Router activo en el puerto 3000"));
```

## 🛣️ Endpoints Disponibles

Por defecto (o personalizados mediante coustomRouter), ragEngine.router expone las siguientes rutas:

Método

Endpoint por Defecto

Descripción

Body Requerido

POST

/query

Pipeline RAG Completo: Busca contexto híbrido, inyecta en el prompt y genera respuesta con el LLM.

{"question": "string", "promptTemplate"?: "string"}

GET

/reload-docs

Escanea el directorio docDir, extrae textos, genera embeddings en lotes y sincroniza las DBs.

Ninguno

POST

/hybrid-search

Devuelve los mejores N documentos cruzando ambas bases de datos mediante RRF.

{"question": "string", "limit"?: number}

POST

/vectorial-search

Realiza una búsqueda por similitud de cosenos usando embeddings en tu DB vectorial.

{"question": "string", "limit"?: number}

POST

/semantic-search

Realiza una búsqueda léxica/semántica basada en palabras clave de texto crudo.

{"question": "string", "limit"?: number}

GET

/health

Endpoint interno para monitoreo de estado del motor RAG.

Ninguno

## 📐 Estructura del Proyecto
El código fuente está organizado bajo una limpia separación de responsabilidades:
 * `src/core/`: Orquestador principal, manejo de ciclos de solicitud-respuesta HTTP y mapeo dinámico del router.
 * `src/adapters/`: Contratos de interfaces y las implementaciones para bases de datos y modelos de IA.
 * `src/ingestion/`: Motores de lectura, parsing y normalización de documentos JSON.
 * `src/utils/`: Algoritmos puros como el RRF (Reciprocal Rank Fusion) y utilidades de renderizado de prompts.

## 📄 Licencia
MIT