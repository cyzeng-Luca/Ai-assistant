# RAG 文档切割 + Embedding + ChromaDB 入库 设计文档

> **状态:** 已审核 | **日期:** 2026-05-06

## 1. 背景与目标

当前 RAG 检索 (`server/src/agent/rag.ts`) 依赖 ChromaDB 内置 embedding，无法控制向量质量，也没有文档入库管道，`server/doc/` 下的知识库文档无法被检索。

**目标：**

- 实现文档切割 → DashScope text-embedding-v4 向量化 → ChromaDB 本地存储的完整管道
- Agent 层改造为 tool-calling 模式，`rag_search` 作为工具，混合搜索（向量 + Fuse.js 模糊 + RRF 重排）

## 2. 总体架构

```
server/doc/                           ← 文档源（.docx / .md / .txt）
     │
     ▼
server/src/rag/ingest.ts              ← CLI 入口：npx tsx src/rag/ingest.ts
     │
     ├─► chunker.ts                   ← 文档解析 + 语义切割
     │     ├─ mammoth                 ← .docx → 纯文本
     │     └─ 递归切割器              ← 标题 → 段落 → 句子 → 字符
     │
     ├─► embedding.ts                 ← DashScope text-embedding-v4 (OpenAI SDK)
     │
     └─► rag.ts                       ← ChromaDB 读写 + 混合搜索 + RRF

server/src/agent/
     ├─ graph.ts                      ← Tool-calling agent 编排
     └─ tools/
          └─ ragSearch.ts             ← rag_search tool（调用 rag/searchHybrid）
```

## 3. 文件清单

| 文件                                  | 操作 | 职责                                       |
| ------------------------------------- | ---- | ------------------------------------------ |
| `server/src/config.ts`                | 修改 | 移除 `DEEPSEEK_EMBEDDING_MODEL`，新增 5 个 |
| `server/src/rag/chunker.ts`           | 新建 | 文档解析（mammoth）+ 递归语义切割          |
| `server/src/rag/embedding.ts`         | 新建 | DashScope Embedding API（OpenAI SDK）      |
| `server/src/rag/rag.ts`               | 新建 | ChromaDB 读写 + 混合搜索 + RRF             |
| `server/src/rag/ingest.ts`            | 新建 | CLI 入库脚本                               |
| `server/src/agent/tools/ragSearch.ts` | 新建 | rag_search tool 定义                       |
| `server/src/agent/graph.ts`           | 修改 | Tool-calling agent 编排                    |
| `server/src/agent/rag.ts`             | 删除 | 被 `rag/rag.ts` 替代                       |
| `server/package.json`                 | 修改 | 新增 `openai`、`fuse.js`                   |

## 4. 最终目录结构

```
server/src/
  rag/                          ← RAG 基础设施
    ├── chunker.ts              # 文档解析 + 切割
    ├── embedding.ts            # 向量化 API
    ├── rag.ts                  # ChromaDB 读写 + 混合搜索 + RRF
    └── ingest.ts               # CLI 入库脚本
  agent/                        ← Agent 编排层
    ├── graph.ts                # Tool-calling agent
    └── tools/                  # 工具定义
        └── ragSearch.ts        # rag_search tool
  services/
    └── llm.ts                  # 通用 LLM 服务
```

## 5. 模块详细设计

### 5.1 config.ts — 环境变量

移除 `DEEPSEEK_EMBEDDING_MODEL`，新增：

```ts
DASHSCOPE_API_KEY: z.string().min(1),
EMBEDDING_MODEL: z.string().default('text-embedding-v4'),
EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
CHUNK_SIZE: z.coerce.number().int().positive().default(500),
CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(50),
```

### 5.2 rag/chunker.ts — 文档解析 + 切割

**数据结构：**

```ts
interface Chunk {
  content: string;
  metadata: {
    source: string; // "server/doc/SaaS系统模块架构说明.docx"
    fileHash: string; // SHA256
    chunkIndex: number;
    totalChunks: number;
  };
}
```

**API：**

| 函数                                        | 说明                                 |
| ------------------------------------------- | ------------------------------------ |
| `parseDocument(filePath): Promise<string>`  | `.docx` → mammoth，`.md`/`.txt` → fs |
| `chunkText(text, size?, overlap?)`          | 递归语义切割，返回 `string[]`        |
| `chunkFile(filePath): Promise<Chunk[]>`     | 解析 + 切割 + metadata               |
| `chunkDirectory(dirPath): Promise<Chunk[]>` | 扫描目录批量处理                     |

**切割优先级：** `##` 标题 → `\n\n` 段落 → `。！？\n` 句子 → `，、；` 子句 → 字符级。各层超限则递归下一层，合并时保证 overlap（默认 50 字符）。

### 5.3 rag/embedding.ts — DashScope (OpenAI SDK)

**API：**

| 函数                                               | 说明                       |
| -------------------------------------------------- | -------------------------- |
| `embedTexts(texts: string[]): Promise<number[][]>` | 批量向量化（自动分批 ≤10） |
| `embedQuery(query: string): Promise<number[]>`     | 单条查询向量化             |

**参数：**

| 项目       | 值                                                  |
| ---------- | --------------------------------------------------- |
| SDK        | `openai`                                            |
| baseURL    | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Model      | `text-embedding-v4`                                 |
| Dimensions | 1024                                                |
| Batch Size | 10（SDK 自动分批）                                  |
| 重试/超时  | OpenAI SDK 内置                                     |

### 5.4 rag/rag.ts — ChromaDB + 混合搜索 + RRF

**API：**

| 函数                                                 | 说明                        |
| ---------------------------------------------------- | --------------------------- |
| `ingestChunks(chunks: Chunk[]): Promise<number>`     | 增量入库（SHA256 判断变更） |
| `searchHybrid(query: string, k?): Promise<string[]>` | 混合搜索：向量 + 模糊 → RRF |
| `getStoredHashes(): Promise<Map<string, string>>`    | 已入库文件 hash 映射        |

**混合搜索流程：**

```
query
  ├─► embedQuery(query) → collection.query({ queryEmbeddings })    → vecResults
  └─► Fuse.js.search(query) over 全量 chunk documents             → fuzzyResults
         │
         ▼
    RRF 融合 → 加权重排 → Top K (default k=5)
```

**RRF (Reciprocal Rank Fusion):**

```
score(d) = Σ 1 / (k + rank_in_source)    k = 60（标准常数）
```

两路结果按 RRF score 降序排列，取 Top K。

**增量入库：**

```
collection.get() → 取出已有 metadatas
→ source → fileHash 映射
→ 新 chunks 按 source 分组：
   - hash 相同 → 跳过
   - hash 不同/新文件 → 删旧 chunks → embedTexts → collection.add
→ 返回入库数量
```

### 5.5 agent/tools/ragSearch.ts — Tool 定义

```ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchHybrid } from '../../rag/rag.js';

export const ragSearchTool = tool(
  async ({ query }) => {
    const docs = await searchHybrid(query, 5);
    return docs.join('\n\n');
  },
  {
    name: 'rag_search',
    description:
      '搜索内部知识库中的SaaS模块文档。当用户询问系统模块、服务、接口、功能、数据、配置、部署、集成、认证、权限等问题时使用此工具。',
    schema: z.object({
      query: z.string().describe('搜索关键词或问题'),
    }),
  },
);
```

### 5.6 agent/graph.ts — Tool-calling Agent

**Agent 流程：**

```
用户提问
  │
  ▼
┌──────────┐
│  agent   │  LLM + bindTools([ragSearchTool])
└──┬───────┘
   │ 有 tool_calls？
   ▼
┌──────────┐
│  tools   │  ToolNode → 执行 rag_search → 返回文档内容
└──┬───────┘
   │
   └──► 回到 agent → LLM 继续决策（调工具 or 直接回复）→ END
```

**结构：**

```ts
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ragSearchTool } from './tools/ragSearch.js';

const tools = [ragSearchTool];
const toolNode = new ToolNode(tools);

const workflow = new StateGraph(StateAnnotation)
  .addNode('agent', agentNode)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue) // tool_calls? → tools : → END
  .addEdge('tools', 'agent');
```

**State 简化：** 不再需要 `needRag`、`needMore` 字段，LLM 自行决策。

**SSE 支持：** 保留 `onToken` 回调机制，流式输出 token。

## 6. 依赖变更

| 库                     | 用途                    | 操作              |
| ---------------------- | ----------------------- | ----------------- |
| `openai`               | DashScope Embedding API | `pnpm add`        |
| `fuse.js`              | 模糊搜索                | `pnpm add`        |
| `mammoth`              | .docx → 纯文本          | 已在 package.json |
| `chromadb`             | ChromaDB SDK            | 已在 package.json |
| `uuid`                 | chunk ID 生成           | 已在 package.json |
| `@langchain/core`      | Tool 定义               | 已在 package.json |
| `@langchain/langgraph` | Agent 编排              | 已在 package.json |

## 7. 不在范围

- 不添加 HTTP API 路由
- 不处理 PDF
- 不做 LLM 语义切割
- 不做自动文件监控
- 不做 skill 路由（当前工具 < 5 个）

## 8. 验证方式

1. **Type-check:** `pnpm --filter module-assistant-server exec tsc --noEmit` — 0 错误
2. **入库:** `docker compose up -d chromadb` → `npx tsx src/rag/ingest.ts`
3. **增量:** 再次运行 ingest，确认跳过未变更文件
4. **检索:** 发起对话 → agent 自动调用 `rag_search` → 回复引用文档内容
