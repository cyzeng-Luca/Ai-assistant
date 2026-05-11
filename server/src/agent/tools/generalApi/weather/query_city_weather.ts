import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  query_city_weather: {
    tool: tool(
      async ({ city }: { city: string }) => {
        await Promise.resolve();
        // TODO: 替换为真实天气 API
        return `[MOCK] ${city}当前天气：晴，25°C，湿度 60%，风力 3 级`;
      },
      {
        name: 'query_city_weather',
        description: '查询指定城市的实时天气',
        schema: z.object({ city: z.string().describe('城市名称，如"成都"') }),
      },
    ),
  },
} satisfies Record<string, ToolEntry>;
