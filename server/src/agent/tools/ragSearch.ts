import { tool } from '@langchain/core/tools';
import { z } from 'zod';
// import { retrieve } from '@lib/vikingRetrieve.js';
import { retrieve } from '@lib/bailian';

export const ragSearchTool = tool(
  async ({ query }) => {
    const results = await retrieve(query, 5);

    if (!results.length) return '未找到相关文档。';
    return results
      .map(
        (r, i) =>
          `[${String(i + 1)}]${r.score != null ? ` (相关性: ${r.score.toFixed(3)})` : ''} ${r.text}`,
      )
      .join('\n\n');
  },
  {
    name: 'rag_search',
    description:
      '搜索内部知识库中的SaaS模块文档。当用户询问系统模块、服务、接口、功能、数据、配置、部署、集成、认证、权限等问题时使用此工具。',
    schema: z.object({
      query: z.string().describe('搜索关键词或问题'),
    }),
  },
);
