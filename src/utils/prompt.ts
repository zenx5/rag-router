export function buildRagPrompt(question: string, contextDocs: any[]): string {
  // Aquí asumo que tus JSONs tienen un campo 'text' o 'content'. 
  // Esto lo puedes hacer configurable en el futuro.
  const contextString = contextDocs
    .map((doc, index) => `[Documento ${index + 1}]:\n${doc.text || JSON.stringify(doc)}`)
    .join('\n\n');

  return `
Eres un asistente experto. Utiliza ÚNICAMENTE el siguiente contexto para responder a la pregunta del usuario. 
Si no sabes la respuesta basándote en el contexto, di "No tengo suficiente información para responder".

CONTEXTO:
${contextString}

PREGUNTA:
${question}

RESPUESTA:
  `.trim();
}

export function buildPromptOfTemplate(prompts: Record<string, string>, templateName: string, question: string, contextDocs: any[]) {
    const template = prompts[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    return template.replaceAll('${question}', question).replaceAll('${contextDocs}', contextDocs.join('\n\n'));
  }