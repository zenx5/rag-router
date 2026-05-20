import express from 'express'
import RAG from 'rag-router'
import dashboard from './rag-plugin-dashboard'
import { model, embeddingModel } from './models'
import { instanceChromaDB, instanceTypeSense } from './db'

const app = express()

const ragEngine = new RAG({
  vectorialDB: instanceChromaDB,
  semanticDB: instanceTypeSense,
  model: model,
  embeddingModel: embeddingModel,
  docDir: './docs',
  router: express.Router,
  coustomRouter: {
    '/reload-docs': '/reload'
  },
  plugins: [
    dashboard
  ]
})

app.get('/', (req, res) => res.send("Hello RAG") )
app.use('/rag/v1', ragEngine.router)

app.listen(3000)