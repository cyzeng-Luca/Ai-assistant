import { ChromaClient } from 'chromadb';
import { v4 as uuid } from 'uuid';
import Fuse from 'fuse.js';
import { env } from '../config.js';
import { embedTexts, embedQuery } from './embedding.js';
import type { Chunk } from './chunker.js';

const chroma = new ChromaClient({ path: env.CHROMA_URL });
const COLLECTION_NAME = 'saas_modules';

// ── Ingest ────────────────────────────────────────────────

export async function getStoredHashes(): Promise<Map<string, string>> {
  const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });
  const existing = await collection.get();
  const map = new Map<string, string>();

  for (const meta of existing.metadatas) {
    const src = meta?.source as string | undefined;
    const hash = meta?.fileHash as string | undefined;
    if (src && hash) map.set(src, hash);
  }

  return map;
}

export async function ingestChunks(chunks: Chunk[]): Promise<number> {
  if (!chunks.length) return 0;

  const storedHashes = await getStoredHashes();
  const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });

  const bySource = new Map<string, Chunk[]>();
  for (const c of chunks) {
    const list = bySource.get(c.metadata.source) || [];
    list.push(c);
    bySource.set(c.metadata.source, list);
  }

  let ingested = 0;
  for (const [source, fileChunks] of bySource) {
    const hash = fileChunks[0].metadata.fileHash;
    if (storedHashes.get(source) === hash) continue;

    // delete old chunks for this source
    const existing = await collection.get();
    if (existing.ids.length) {
      const toDelete: string[] = [];
      for (let i = 0; i < existing.ids.length; i++) {
        if ((existing.metadatas[i]?.source as string) === source) {
          toDelete.push(existing.ids[i]);
        }
      }
      if (toDelete.length) await collection.delete({ ids: toDelete });
    }

    // embed and add
    const texts = fileChunks.map((c) => c.content);
    const embeddings = await embedTexts(texts);

    await collection.add({
      ids: fileChunks.map(() => uuid()),
      embeddings,
      documents: texts,
      metadatas: fileChunks.map((c) => c.metadata),
    });

    ingested += fileChunks.length;
  }

  return ingested;
}

// ── Hybrid Search ─────────────────────────────────────────

const RRF_K = 60;

function reciprocalRankFusion(
  vecResults: string[][],
  fuzzyResults: string[][],
  topK: number,
): string[] {
  const scores = new Map<string, number>();

  for (const resultSet of [vecResults, fuzzyResults]) {
    for (let rank = 0; rank < resultSet.length; rank++) {
      for (const doc of resultSet[rank]) {
        scores.set(doc, (scores.get(doc) || 0) + 1 / (RRF_K + rank + 1));
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([doc]) => doc);
}

export async function searchHybrid(query: string, k = 5): Promise<string[]> {
  const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });

  // vector search
  const queryEmbedding = await embedQuery(query);
  const vecResults = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: k,
  });
  const vecDocs: string[] = vecResults.documents[0]?.filter((d): d is string => d !== null) ?? [];

  // fuzzy search
  const allDocs = await collection.get();
  const documents: string[] = allDocs.documents.filter((d): d is string => d !== null);

  const fuse = new Fuse(documents, {
    includeScore: true,
    threshold: 0.6,
    minMatchCharLength: 2,
  });
  const fuzzyDocs = fuse
    .search(query)
    .slice(0, k)
    .map((r) => r.item);

  // RRF merge
  return reciprocalRankFusion([vecDocs], [fuzzyDocs], k);
}

// ── Simple vector retrieval (backward compat) ─────────────

export async function retrieveContext(query: string, k = 3): Promise<string[]> {
  try {
    const queryEmbedding = await embedQuery(query);
    const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
    });
    return results.documents[0]?.filter((d): d is string => d !== null) ?? [];
  } catch {
    return [];
  }
}
