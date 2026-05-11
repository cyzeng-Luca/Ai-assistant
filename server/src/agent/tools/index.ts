import type { StructuredTool } from '@langchain/core/tools';
import knowledge from './knowledge/index.js';
import generalApi from './generalApi/index.js';

// ============================================================
// Interface
// ============================================================

export interface ToolEntry {
  tool: StructuredTool;
  /** 子节点名（toolDefinitions 的 key）。有 children = 分类节点，无 = 叶子工具 */
  children?: string[];
}

// ============================================================
// Tree Assembly
// ============================================================

export const toolDefinitions: Record<string, ToolEntry> = {
  ...knowledge,
  ...generalApi,
};

// ============================================================
// Visibility
// ============================================================

function getRootNames(): string[] {
  const allChildren = new Set(Object.values(toolDefinitions).flatMap((e) => e.children ?? []));
  return Object.keys(toolDefinitions).filter((k) => !allChildren.has(k));
}

/** 根据已激活路径，返回当前可见的工具列表 */
export function getVisibleTools(activatedPaths: string[]): StructuredTool[] {
  const rootNames = getRootNames();
  const visible = new Set(rootNames);

  for (const path of activatedPaths) {
    const children = toolDefinitions[path].children ?? [];
    for (const child of children) {
      visible.add(child);
    }
  }

  return [...visible].map((name) => toolDefinitions[name].tool);
}

/** 是否为分类节点（有子工具） */
export function isCategoryNode(toolName: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return !!toolDefinitions[toolName]?.children?.length;
}
