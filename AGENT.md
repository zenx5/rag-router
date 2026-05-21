# 🤖 Agent Context: rag-router Development Base
Este documento sirve como el mapa de contexto y memoria técnica para cualquier IA o Agente Autónomo que continúe con el desarrollo, refactorización o expansión de la librería rag-router.

##📌 Estado Actual del Proyecto
El motor principal ya se encuentra desarrollado, testeado en un entorno real con contenedores de infraestructura local, y es completamente funcional para la vía de extremo a extremo: Ingesta (JSON -> Embeddings -> DBs) y Consumo (Query -> Híbrido RRF -> LLM).

## Componentes Listos e Implementados:
 * `src/core/index.ts`: Inicialización de la clase RAG, vinculación correcta del scope de Express para rutas dinámicas (callHttp), inyección de dependencias y handlers HTTP.
 * Abstracción de Interfaces (`src/adapters/`): Contratos estrictos definidos en TypeScript para VectorialDB, SemanticDB, LLMModel, y EmbeddingModel.
 * Algoritmo RRF (`src/utils/rrf.ts`): Fusión matemática agnóstica basada en posiciones de rankings relativos: 1 / (k + rank). Evita la colisión o necesidad de normalizar scores de procedencias distintas.
 * Módulo de Ingesta (`src/ingestion/index.ts`): Lector de carpetas de JSONs que unifica arrays y objetos únicos, inyecta UUIDs automáticos si no existen, genera fallbacks de campos de texto raw, crea embeddings e impacta ambas bases de datos en paralelo.
 * Adaptadores Oficiales (`src/adapters/`): Implementaciones reales para el ecosistema estándar: OpenAIAdapter, ChromaAdapter, y TypeSenseAdapter.
 * Entornos de Prueba (`playground/`): server.ts corriendo de forma aislada con Mocks lógicos, y server2.ts validado con conexiones TCP reales.

## 🛠️ Especificaciones Técnicas Básicas
 * **Lenguaje**: TypeScript (Tipado estricto para contratos de interfaces).
 * **Entorno de Módulos**: ES Modules ("type": "module" en package.json). Todas las importaciones internas locales DEBEN llevar la extensión explícita .js o .ts (dependiendo de la configuración del bundler/runtime, actualmente apuntando a .ts/.js relativo).
 * **Mapeo del Scope**: En Express, al extraer métodos dinámicos como this.router.post, el contexto this interno del framework se rompe. Se mitiga mediante .bind(this.router) en la utilidad callHttp.

## 🚀 Próximos Pasos & Roadmap Pendiente (Tareas para el Agente)
Cualquier IA que tome el control del repositorio debe priorizar las siguientes tareas en orden de importancia:

1. Implementación del Sistema de Plugins (Dashboard Integration)
En el diseño inicial de la DX, el desarrollador pasa un arreglo de plugins: plugins: [ dashboard ].
Objetivo: En el constructor de src/core/index.ts, iterar sobre this.config.plugins si existen.
Mecánica: Cada plugin debe ser una función o un objeto con un método init(ragInstance: RAG) al cual se le inyecta la instancia actual de la clase (this). Esto permitirá que el plugin lea las rutas registradas, interactúe con las bases de datos o inyecte nuevos endpoints customizados al router de Express (por ejemplo, montar la interfaz del dashboard administrativo en /rag/v1/dashboard).

2. Robustez, Validaciones Tempranas y Manejo de Errores
Objetivo: Prevenir fallos en tiempo de ejecución causados por malas configuraciones del usuario final.
Mecánica: Agregar validaciones en el constructor de RAG. Comprobar que docDir exista en el disco duro usando fs. Verificar que los objetos pasados como adaptadores contengan las funciones requeridas (insert, search, generate, etc.) y lanzar excepciones limpias y descriptivas ("RAGValidationError: El adaptador vectorial proveído no cuenta con el método 'search'.") en lugar de dejar que rompa silenciosamente.

3. Optimización de Ingesta (Batching & Chunking)
Objetivo: Evitar que el endpoint /reload-docs explote por límites de tamaño de payload o timeouts de red al procesar archivos masivos.
Mecánica: Modificar processJsonDirectory para agrupar las peticiones de embeddings a OpenAI en lotes distribuidos (ej. sub-lotes de 20 en 20 documentos usando Promise.all controlados o bucles segmentados) en lugar de lanzar una petición secuencial por cada registro singular.

4. Configuración del Proceso de Build (Empaquetado NPM)
Objetivo: Compilar el código TypeScript a JavaScript puro compatible con CommonJS y ES Modules para su publicación en NPM.
Mecánica: Configurar tsup o Vite (Library Mode). Asegurar que se generen los mapas de declaraciones de tipos (.d.ts) y estructurar el package.json con los campos exports, main, y types correspondientes.

## 📜 Directrices de Diseño y Código para la IA
 * **Mantener el Core Puro**: Bajo ninguna circunstancia importes librerías externas pesadas (como openai, chromadb, o typesense) dentro de los archivos de src/core/ o src/ingestion/. Toda interacción con infraestructura externa se debe canalizar estrictamente mediante las interfaces del módulo adapters.
 * **PresPreservar la DX**: Cualquier cambio funcional interno debe respetar el patrón declarativo e intuitivo que el desarrollador diseñó para la inicialización del ragEngine.
 * **Modularidad**: El código de algoritmos debe ser puro y testeable de forma aislada, tal como se implementó con computeRRF.
