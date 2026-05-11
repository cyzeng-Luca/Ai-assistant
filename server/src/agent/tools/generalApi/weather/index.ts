import { tool } from '@langchain/core/tools';
import query_city_weather from './query_city_weather.js';
import forecast from './forecast.js';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  weather: {
    tool: tool(
      async () => {
        await Promise.resolve();
        return '[MOCK] 已激活天气工具：query_city_weather、forecast。请直接调用查询天气。';
      },
      { name: 'weather', description: '天气类接口：查询城市天气、天气预报' },
    ),
    children: ['query_city_weather', 'forecast'],
  },
  ...query_city_weather,
  ...forecast,
} satisfies Record<string, ToolEntry>;
