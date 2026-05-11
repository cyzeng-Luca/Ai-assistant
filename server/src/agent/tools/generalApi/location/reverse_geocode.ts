import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  reverse_geocode: {
    tool: tool(
      async ({ lat, lon }: { lat: number; lon: number }) => {
        await Promise.resolve();
        return `[MOCK] 坐标 (${String(lat)}, ${String(lon)}) 对应：成都市锦江区`;
      },
      {
        name: 'reverse_geocode',
        description: '将经纬度坐标反向解析为地址',
        schema: z.object({
          lat: z.number().describe('纬度'),
          lon: z.number().describe('经度'),
        }),
      },
    ),
  },
} satisfies Record<string, ToolEntry>;
