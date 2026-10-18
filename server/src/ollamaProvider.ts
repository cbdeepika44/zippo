import ollama from 'ollama'

export async function askLocalAI(
  document: string,
  question: string
): Promise<string> {
  const response = await ollama.chat({
    model: 'llama3.2:3b',
    messages: [
      {
        role: 'system',
        content:
          'You are ClearGate AI. Answer helpfully using only the sanitized document provided. Do not ask for or invent sensitive personal information.',
      },
      {
        role: 'user',
        content: `Sanitized document:\n${document}\n\nQuestion:\n${question}`,
      },
    ],
    stream: false,
  })

  return response.message.content
}