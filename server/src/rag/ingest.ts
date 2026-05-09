import 'dotenv/config';
import * as path from 'node:path';
import { chunkDirectory } from './chunker.js';
import { ingestChunks } from './rag.js';
import { logger } from '@lib/logger.js';

async function main() {
  const docsDir = path.resolve(process.argv[2] || 'doc');
  logger.info({ docsDir }, 'Scanning documents');

  const start = performance.now();
  const chunks = await chunkDirectory(docsDir);
  logger.info({ count: chunks.length }, 'Chunking complete');

  const ingested = await ingestChunks(chunks);
  const elapsed = ((performance.now() - start) / 1000).toFixed(1);

  if (ingested > 0) {
    logger.info({ ingested, total: chunks.length, elapsed: `${elapsed}s` }, 'Ingestion complete');
  } else {
    logger.info({ total: chunks.length, elapsed: `${elapsed}s` }, 'No changes detected');
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Ingest failed');
  process.exit(1);
});
