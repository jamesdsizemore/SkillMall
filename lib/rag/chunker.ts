const MIN_CHUNK_CHARS = 20

/**
 * Split text into chunks of approximately `targetTokens` tokens each.
 * Pure JavaScript — no native dependencies.
 */
export function chunkText(text: string, targetTokens = 512): string[] {
  const wordsPerChunk = Math.floor(targetTokens / 1.35)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    if (chunk.length >= MIN_CHUNK_CHARS) {
      chunks.push(chunk)
    }
  }

  return chunks
}

/**
 * Extract readable text from raw file content.
 * Strips markdown syntax, code fences, and HTML tags.
 */
export function extractText(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '') // remove code fences
    .replace(/`[^`]*`/g, '')        // remove inline code
    .replace(/<[^>]+>/g, '')        // remove HTML tags
    .replace(/^\s*#+\s*/gm, '')     // remove markdown headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // unwrap links
    .replace(/\s+/g, ' ')
    .trim()
}
