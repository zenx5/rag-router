/**
 * Fusiona múltiples arrays de resultados utilizando Reciprocal Rank Fusion (RRF).
 * @param resultSets Array de arrays con los resultados de las búsquedas (ej. [vectorResults, semanticResults])
 * @param idKey Propiedad del objeto que sirve como identificador único (ej. 'id').
 * @param limit Cantidad máxima de documentos a devolver.
 * @param k Constante de estabilización para RRF (por defecto 60).
 */
export function computeRRF(resultSets: any[][], idKey: string = 'id', limit: number = 5, k: number = 60): any[] {
  const rrfScores: Record<string, number> = {};
  const docMap: Record<string, any> = {};

  resultSets.forEach((resultSet) => {
    resultSet.forEach((doc, index) => {
      // Como tu base de conocimiento son JSONs variados, intentamos buscar un 'id'.
      // Si no existe, utilizamos un fallback al 'text' o al objeto completo para identificarlo unívocamente.
      const docId = doc[idKey] || doc.text || JSON.stringify(doc);
      const rank = index + 1; // El ranking empieza en 1, no en 0

      if (!rrfScores[docId]) {
        rrfScores[docId] = 0;
        docMap[docId] = doc; // Guardamos la referencia al documento completo
      }

      // Sumamos el score usando la fórmula de RRF
      rrfScores[docId] += 1 / (k + rank);
    });
  });

  // Ordenamos los documentos por su score acumulado (de mayor a menor)
  const sortedDocs = Object.keys(rrfScores)
    .sort((a, b) => rrfScores[b] - rrfScores[a])
    .map(docId => docMap[docId]);

  // Retornamos solo la cantidad solicitada
  return sortedDocs.slice(0, limit);
}