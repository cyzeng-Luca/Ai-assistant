import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  geocode: {
    tool: tool(
      async ({ address }: { address: string }) => {
        await Promise.resolve();
        return `[MOCK] ${address} 坐标：经度 104.07，纬度 30.67`;
      },
      {
        name: 'geocode',
        description: '将地名/地址转换为经纬度坐标',
        schema: z.object({ address: z.string().describe('地名或地址，如"成都"') }),
      },
    ),
  },
} satisfies Record<string, ToolEntry>;
