import { tool } from '@langchain/core/tools';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  history: {
    tool: tool(
      async () => {
        await Promise.resolve();
        return '[MOCK] 历史数据接口暂无可用子工具。';
      },
      {
        name: 'history',
        description: '历史数据接口（暂未实现子工具）',
      },
    ),
  },
} satisfies Record<string, ToolEntry>;
