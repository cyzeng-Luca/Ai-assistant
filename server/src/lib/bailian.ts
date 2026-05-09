import { createRequire } from 'module';
import { env } from './config.js';

const require = createRequire(import.meta.url);
const $bailian: any = require('@alicloud/bailian20231229');
const $OpenApi: any = require('@alicloud/openapi-core');
const $Util: any = require('@alicloud/tea-util');

const BailianClient = $bailian.default;

let _client: any = null;

function getClient(): any {
  if (!_client) {
    const config = new $OpenApi.$OpenApiUtil.Config({
      type: 'access_key',
      accessKeyId: env.ALIBABA_CLOUD_ACCESS_KEY_ID,
      accessKeySecret: env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
      endpoint: 'bailian.cn-beijing.aliyuncs.com',
    });
    _client = new BailianClient(config);
  }
  return _client;
}

export interface RetrieveResult {
  text: string;
  score?: number;
}

export async function retrieve(query: string, topK = 5): Promise<RetrieveResult[]> {
  const client = getClient();

  const workspaceId = env.BAILIAN_WORKSPACE_ID;
  const indexId = env.BAILIAN_INDEX_ID;
  if (!workspaceId || !indexId) {
    throw new Error('BAILIAN_WORKSPACE_ID and BAILIAN_INDEX_ID are required');
  }

  const request = new $bailian.RetrieveRequest({
    query,
    denseSimilarityTopK: topK,
    enableReranking: true,
    enableRewrite: false,
    rerankMinScore: 0.01,
    rerankTopN: topK,
    indexId,
  });

  const runtime = new $Util.RuntimeOptions({});
  const headers: Record<string, string> = {};

  const res = await client.retrieveWithOptions(workspaceId, request, headers, runtime);

  const nodes = res.body?.data?.nodes ?? [];
  return nodes.map((n: { text?: string; score?: number }) => ({
    text: n.text ?? '',
    score: n.score,
  }));
}
