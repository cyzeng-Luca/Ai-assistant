import { tool } from '@langchain/core/tools';
import geocode from './geocode.js';
import reverse_geocode from './reverse_geocode.js';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  location: {
    tool: tool(
      async () => {
        await Promise.resolve();
        return '[MOCK] 已激活地理工具：geocode、reverse_geocode。请直接调用查询位置。';
      },
      { name: 'location', description: '地理类接口：地理编码、逆地理编码' },
    ),
    children: ['geocode', 'reverse_geocode'],
  },
  ...geocode,
  ...reverse_geocode,
} satisfies Record<string, ToolEntry>;
