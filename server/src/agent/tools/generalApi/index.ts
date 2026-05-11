import { tool } from '@langchain/core/tools';
import weather from './weather/index.js';
import location from './location/index.js';
import history from './history/index.js';
import society from './society/index.js';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  general_api: {
    tool: tool(
      async () => {
        await Promise.resolve();
        return (
          '[MOCK] 已进入通用接口层。可选子类：\n' +
          '- **weather** — 天气、气象数据\n' +
          '- **location** — 地理位置、地图服务\n' +
          '- **history** — 历史数据\n' +
          '- **society** — 社会数据\n' +
          '请根据用户问题选择合适的子类。'
        );
      },
      {
        name: 'general_api',
        description:
          '通用数据接口入口。进入后可按子类（weather/location/history/society）进一步选择工具',
      },
    ),
    children: ['weather', 'location', 'history', 'society'],
  },

  ...weather,
  ...location,
  ...history,
  ...society,
} satisfies Record<string, ToolEntry>;
