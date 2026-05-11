import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  forecast: {
    tool: tool(
      async ({ city, days }: { city: string; days?: number }) => {
        await Promise.resolve();
        return `[MOCK] ${city}未来${String(days ?? 3)}天：晴转多云，22-28°C`;
      },
      {
        name: 'forecast',
        description: '查询指定城市未来天气预报',
        schema: z.object({
          city: z.string().describe('城市名称'),
          days: z.number().optional().describe('预报天数，默认 3 天'),
        }),
      },
    ),
  },
} satisfies Record<string, ToolEntry>;
