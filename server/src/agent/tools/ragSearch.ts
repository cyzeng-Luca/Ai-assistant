import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchHybrid } from '../../rag/rag.js';

export const ragSearchTool = tool(
  async ({ query }) => {
    const docs = await searchHybrid(query, 5);
    return docs.join('\n\n');
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
export const weatherSearchTool = tool(
  ({ city }: { city: string }) => {
    return `${city}天气：晴天，25°C，微风。`;
  },
  {
    name: 'weather_search',
    description: '搜索指定城市的天气信息。当用户询问当前天气、预报等天气相关问题时使用此工具。',
    schema: z.object({
      city: z.string().describe('城市名称，例如北京、上海、深圳'),
    }),
  },
);

export const positionSearchTool = tool(
  ({ ip }: { ip: string }) => {
    return `IP ${ip} 位置：成都，中国。`;
  },
  {
    name: 'position_search',
    description: '搜索IP地址的地理位置信息。当用户询问当前位置、地址等位置相关问题时使用此工具。',
    schema: z.object({
      ip: z.string().describe('要查询的IP地址'),
    }),
  },
);
