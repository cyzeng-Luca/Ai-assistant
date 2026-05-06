import OpenAI from 'openai';
import { env } from '../config.js';

const client = new OpenAI({
  apiKey: env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

const BATCH_SIZE = 10;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const res = await client.embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: batch,
      dimensions: env.EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    });
    const sorted = res.data.sort((a, b) => a.index - b.index);
    all.push(...sorted.map((d) => d.embedding));
  }

  return all;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embedTexts([query]);
  return vec;
}
