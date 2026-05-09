import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import mammoth from 'mammoth';
import { env } from '@lib/config.js';

export interface Chunk {
  content: string;
  metadata: {
    source: string;
    fileHash: string;
    chunkIndex: number;
    totalChunks: number;
  };
}

// ── Document parsing ──────────────────────────────────────

export async function parseDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// ── Sentence-aware chunking with overlap ──────────────────

/**
 * Split text into sentences, preserving delimiters at the end of each sentence.
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  // Match sentence-ending punctuation followed by whitespace or end of string.
  // Uses capturing group to keep the delimiter attached.
  const re = /[^。！？\n]+[。！？\n]+/g;
  let match: RegExpExecArray | null;
  let lastEnd = 0;

  while ((match = re.exec(text)) !== null) {
    // Capture any content between the last match and this one (orphan prefix)
    const gap = text.slice(lastEnd, match.index).trim();
    if (gap) sentences.push(gap);
    sentences.push(match[0]);
    lastEnd = match.index + match[0].length;
  }

  // Remaining text after the last sentence-ending punctuation
  const tail = text.slice(lastEnd).trim();
  if (tail) sentences.push(tail);

  return sentences;
}

/**
 * Split a single sentence into clauses (，；,;), preserving delimiters.
 */
function splitClauses(text: string): string[] {
  const re = /[^，；,;\n]+[，；,;\n]*/g;
  const parts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    parts.push(match[0]);
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Build chunks from pieces by greedily filling to `size`, with `overlap`
 * characters carried over from the end of the previous chunk.
 *
 * When a single piece exceeds `size`, it is split at clause boundaries;
 * if still too large, character-level split with overlap is used.
 */
function buildChunks(pieces: string[], size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const piece of pieces) {
    if (current.length === 0) {
      // First piece or fresh start
      if (piece.length <= size) {
        current = piece;
      } else {
        // Single piece too large — split further
        const subPieces = splitClauses(piece);
        if (subPieces.length > 1) {
          chunks.push(...buildChunks(subPieces, size, overlap));
        } else {
          // Fallback: character-level split with overlap
          for (let i = 0; i < piece.length; i += size - overlap) {
            const end = Math.min(i + size, piece.length);
            chunks.push(piece.slice(i, end));
            if (end === piece.length) break;
          }
        }
      }
    } else if (current.length + piece.length <= size) {
      current += piece;
    } else {
      // Current chunk is full — push it
      chunks.push(current);

      // Start next chunk with overlap from the end of current
      const carryLen = Math.min(overlap, current.length);
      const carry = current.slice(-carryLen);
      current = carry + piece;

      // If even after adding overlap + first piece we exceed size,
      // we may need to split this piece
      if (current.length > size) {
        const subPieces = splitClauses(piece);
        if (subPieces.length > 1) {
          chunks.push(...buildChunks([carry, ...subPieces], size, overlap));
          current = '';
        }
        // Otherwise just let it be oversized for one round
      }
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function chunkText(
  text: string,
  size = env.CHUNK_SIZE,
  overlap = env.CHUNK_OVERLAP,
): string[] {
  if (!text.trim()) return [];
  if (text.length <= size) return [text.trim()];

  const sentences = splitSentences(text);
  return buildChunks(sentences, size, overlap);
}

// ── File / Directory ──────────────────────────────────────

function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export async function chunkFile(filePath: string): Promise<Chunk[]> {
  const content = await parseDocument(filePath);
  const fileHash = computeHash(content);
  const parts = chunkText(content);
  const relPath = path.relative(process.cwd(), filePath);

  return parts.map((text, i) => ({
    content: text,
    metadata: { source: relPath, fileHash, chunkIndex: i, totalChunks: parts.length },
  }));
}

export async function chunkDirectory(dirPath: string): Promise<Chunk[]> {
  const result: Chunk[] = [];
  const entries = fs.readdirSync(dirPath, { recursive: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.toString());
    if (fs.statSync(fullPath).isDirectory()) continue;

    const ext = path.extname(entry.toString()).toLowerCase();
    if (!['.md', '.txt', '.docx'].includes(ext)) continue;

    result.push(...(await chunkFile(fullPath)));
  }

  return result;
}
