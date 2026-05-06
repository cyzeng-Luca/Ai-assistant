import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import mammoth from 'mammoth';
import { env } from '../config.js';

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

// ── Recursive semantic chunking ───────────────────────────

const SEPARATORS: [RegExp, boolean][] = [
  [/^#{1,3}\s/m, true],
  [/\n\n+/, false],
  [/[。！？\n]+/, true],
  [/[，、；,;]+/, true],
  [/\s+/, true],
];

function splitByRegex(text: string, regex: RegExp): string[] {
  return text
    .split(regex)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function chunkText(
  text: string,
  size = env.CHUNK_SIZE,
  overlap = env.CHUNK_OVERLAP,
): string[] {
  if (!text.trim()) return [];
  if (text.length <= size) return [text.trim()];

  for (const [regex] of SEPARATORS) {
    const segments = splitByRegex(text, regex);
    if (segments.length > 1) {
      const subChunks: string[] = [];
      for (const seg of segments) {
        subChunks.push(...chunkText(seg, size, overlap));
      }
      return mergeWithOverlap(subChunks, size, overlap);
    }
  }

  const chars: string[] = [];
  for (const ch of text) chars.push(ch);
  return mergeWithOverlap(chars, size, overlap);
}

function mergeWithOverlap(segments: string[], size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const seg of segments) {
    if (current.length + seg.length > size && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(-Math.min(overlap, current.length)) + seg;
    } else {
      current += seg;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : segments;
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
