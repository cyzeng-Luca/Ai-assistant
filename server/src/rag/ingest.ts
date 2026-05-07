/* eslint-disable no-console */
import 'dotenv/config';
import * as path from 'node:path';
import { chunkDirectory } from './chunker.js';
import { ingestChunks } from './rag.js';

async function main() {
  const docsDir = path.resolve(process.argv[2] || 'doc');
  console.log(`Scanning: ${docsDir}`);

  const start = performance.now();
  const chunks = await chunkDirectory(docsDir);
  console.log(`Chunked: ${String(chunks.length)} pieces`);

  const ingested = await ingestChunks(chunks);
  const elapsed = ((performance.now() - start) / 1000).toFixed(1);

  if (ingested > 0) {
    console.log(`Ingested: ${String(ingested)} new/updated chunks → ChromaDB in ${elapsed}s`);
  } else {
    console.log(`No changes detected (${String(chunks.length)} chunks unchanged) in ${elapsed}s`);
  }
}

main().catch((err: unknown) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
