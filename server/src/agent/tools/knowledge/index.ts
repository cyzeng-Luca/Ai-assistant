import { ragSearchTool } from '../ragSearch.js';
import type { ToolEntry } from '@agent/tools/index.js';

export default {
  knowledge: {
    tool: ragSearchTool,
  },
} satisfies Record<string, ToolEntry>;
