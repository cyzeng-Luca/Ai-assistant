import { tool } from '@langchain/core/tools';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  society: {
    tool: tool(
      async () => {
        await Promise.resolve();
        return '[MOCK] 社会数据接口暂无可用子工具。';
      },
      {
        name: 'society',
        description: '社会数据接口（暂未实现子工具）',
      },
    ),
  },
} satisfies Record<string, ToolEntry>;
