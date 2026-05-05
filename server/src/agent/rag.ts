import { ChromaClient } from 'chromadb';
import { env } from '../config.js';

const chroma = new ChromaClient({ path: env.CHROMA_URL });

const COLLECTION_NAME = 'saas_modules';

export async function retrieveContext(query: string, k = 3): Promise<string[]> {
  try {
    const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });
    const results = await collection.query({ queryTexts: [query], nResults: k });
    return results.documents[0]?.filter(Boolean) ?? [];
  } catch {
    return [];
  }
}
