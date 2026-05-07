import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { env } from '../config.js';

let checkpointerPromise: Promise<PostgresSaver> | null = null;

export async function getCheckpointer(): Promise<PostgresSaver> {
  if (!checkpointerPromise) {
    checkpointerPromise = (async () => {
      const cp = PostgresSaver.fromConnString(env.DATABASE_URL);
      await cp.setup();
      return cp;
    })();
  }
  return checkpointerPromise;
}
