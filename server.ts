/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { solveKruskal, solvePrim } from './src/mstSolver.ts';
import { exec } from 'child_process';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazily
let genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      genAI = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return genAI;
}

// 1. Solving MST Endpoint
app.post('/api/solve-mst', (req, res) => {
  try {
    const { vertices, edges, algorithm, startVertexId } = req.body;
    
    if (!vertices || !edges) {
      return res.status(400).json({ error: '缺少 vertices 或 edges 数据' });
    }

    if (algorithm === 'prim') {
      const result = solvePrim(vertices, edges, startVertexId);
      return res.json(result);
    } else {
      const result = solveKruskal(vertices, edges);
      return res.json(result);
    }
  } catch (error: any) {
    console.error('Solve MST Error:', error);
    return res.status(500).json({ error: error.message || '求解 MST 时发生未知错误' });
  }
});

// 2. AI Insights Endpoint (Leveraging Gemini API with structured JSON output)
app.post('/api/ai-insights', async (req, res) => {
  try {
    const { vertices, edges, mstEdges, totalWeight, algorithm } = req.body;

    if (!vertices || !edges || !mstEdges) {
      return res.status(400).json({ error: '缺少图或最小生成树的数据' });
    }

    const aiClient = getGenAI();
    if (!aiClient) {
      return res.json({
        isApiKeyMissing: true,
        summary: '未检测到有效的 GEMINI_API_KEY 密钥，AI 洞察分析模块进入演示模式。',
        sensitivityAnalysis: [
          {
            source: '边集示例1',
            target: '演示',
            currentWeight: 5,
            criticalIncreaseThreshold: '> 7',
            criticalDecreaseThreshold: '< 3',
            impactDescription: '【演示模式】当前未配置 AI 密钥。若配置，AI 将深度挖掘当此边权重波动时是否被其他备用边替代，以及对系统全局冗余性的影响。',
          }
        ],
        engineering造价: {
          projectType: 'fiber',
          unitCost: 1.2,
          totalCost: totalWeight * 1.2 + 25,
          costBreakdown: [
            {
              item: '核心线缆铺设 (演示)',
              cost: totalWeight * 1.2,
              description: '根据拓扑距离估算的基础光纤物料费用（1.2万元/权值）',
            },
            {
              item: '节点熔接及辅助工程 (演示)',
              cost: 25,
              description: '网络交换节点基础设备配置与调试固定造价估值',
            }
          ]
        },
        optimizationAdvice: [
          '请在右侧 Settings > Secrets 中配置 GEMINI_API_KEY 密钥，以解锁基于真实网络拓扑的专家级 AI 灵敏度与造价分析报告。',
          '【拓扑建议】当前 MST 拓扑无自环，在通信网中属于零冗余结构，建议在关键节点 A 和 B 间增设一条备份链路以防止单点故障。',
          '【瓶颈提示】当前树中单条权重最大的边是全局脆弱点，施工时可考虑优先对该路段进行地理勘测和抗灾防护。'
        ]
      });
    }

    // Prepare a descriptive text representation of the graph
    const nodesStr = vertices.map((v: any) => `${v.name || v.id} (坐标:[${Math.round(v.x)}, ${Math.round(v.y)}])`).join(', ');
    const allEdgesStr = edges.map((e: any) => `${e.sourceName || e.source} - ${e.targetName || e.target} (权重: ${e.weight})`).join(', ');
    const mstEdgesStr = mstEdges.map((e: any) => `${e.sourceName || e.source} - ${e.targetName || e.target} (权重: ${e.weight})`).join(', ');

    const prompt = `
    你是一个图论和网络规划领域的资深高级工程专家。
    请针对以下输入的图拓扑结构以及求解出来的最小生成树（MST）进行深度分析。

    【输入图的顶点集合】：
    ${nodesStr}

    【输入图的所有备选边集合（边集列表）】：
    ${allEdgesStr}

    【当前求解出来的最小生成树（MST）包含的边集】：
    ${mstEdgesStr}

    【MST 总权重】：${totalWeight}
    【求解所用算法】：${algorithm}

    请给出专业的：
    1. 【一句话总结】：该拓扑在现实工程应用（如光纤、电网、管道铺设）中的高层价值。
    2. 【灵敏度分析】：指出其中 2~3 条关键边（哪怕微小变动就会让MST拓扑改变、或具有重要冗余替代作用的边），分析当这些边的权重变高、变低时的拓扑临界阈值和影响。
    3. 【工程造价测算】：评估网络建设的总预算。请从 "fiber" (光纤铺设), "grid" (电网规划), "road" (智慧交通) 中，选择一个最适合当前图拓扑规模与特性的场景（如节点多且密集适合光纤、长距离带状分布适合电网等），并制定详细的人民币造价科目明细。
    4. 【专家级优化建议】：给出至少 3 条深入、落地、无需技术堆砌的建设与优化建议。

    要求必须完全遵循指定的 JSON 格式。
    `;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: '你是一个专业的网络拓扑与工程造价分析助手。你必须严格使用简体中文输出，并完全遵循提供的 JSON 格式规范，不添加任何 markdown 标记。',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "一句话总结该最小生成树拓扑设计的工程学价值。"
            },
            sensitivityAnalysis: {
              type: Type.ARRAY,
              description: "针对图中重要边的灵敏度分析列表（选取2-3条关键边进行分析）。",
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING, description: "源节点名称" },
                  target: { type: Type.STRING, description: "目标节点名称" },
                  currentWeight: { type: Type.NUMBER, description: "当前边权重" },
                  criticalIncreaseThreshold: { type: Type.STRING, description: "引起MST拓扑变化的权重上调临界值描述（例如: '> 8' 或 '无变化'）" },
                  criticalDecreaseThreshold: { type: Type.STRING, description: "引起MST拓扑变化的权重下调临界值描述（例如: '< 4' 或 '无'）" },
                  impactDescription: { type: Type.STRING, description: "当该权重突破临界点时，对整个最小生成树拓扑及成本造成的具体物理影响解释。" }
                },
                required: ["source", "target", "currentWeight", "criticalIncreaseThreshold", "criticalDecreaseThreshold", "impactDescription"]
              }
            },
            engineering造价: {
              type: Type.OBJECT,
              description: "工程造价测算分析。",
              properties: {
                projectType: { type: Type.STRING, description: "工程类型（只能是 'fiber' (光纤通信)、'grid' (智能电网) 或 'road' (智慧交通) 之一）" },
                unitCost: { type: Type.NUMBER, description: "每单位权重的基础造价成本（人民币，单位为万元，例如：1.5 表示1.5万元/单位）" },
                totalCost: { type: Type.NUMBER, description: "总预算测算结果（人民币，单位为万元。总权重 * 基础造价 + 额外开销）" },
                costBreakdown: {
                  type: Type.ARRAY,
                  description: "费用明细分解表",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING, description: "造价科目类别名称（例如：核心传输线缆、节点熔接、中继器、冗余备用通道等）" },
                      cost: { type: Type.NUMBER, description: "对应费用额度（万元）" },
                      description: { type: Type.STRING, description: "科目具体测算依据与工程解释" }
                    },
                    required: ["item", "cost", "description"]
                  }
                }
              },
              required: ["projectType", "unitCost", "totalCost", "costBreakdown"]
            },
            optimizationAdvice: {
              type: Type.ARRAY,
              description: "针对该网络拓扑工程提出的具体、富有洞察力的专家级优化与改进建议列表（3条以上）。",
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "sensitivityAnalysis", "engineering造价", "optimizationAdvice"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('未接收到 AI 响应内容');
    }

    const result = JSON.parse(text.trim());
    return res.json(result);

  } catch (error: any) {
    console.error('AI Insights Error:', error);
    return res.status(500).json({ error: error.message || '获取 AI 洞察时发生未知错误' });
  }
});

// 2.5 Python Sandbox Verification Endpoint
app.post('/api/run-python', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: '缺少待运行的 Python 代码' });
    }

    // Pass the python code directly to Python 3 stdin
    const pyProcess = exec('python3', (error, stdout, stderr) => {
      res.json({
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : null
      });
    });

    if (pyProcess.stdin) {
      pyProcess.stdin.write(code);
      pyProcess.stdin.end();
    }
  } catch (error: any) {
    console.error('Run Python Error:', error);
    return res.status(500).json({ error: error.message || '运行 Python 时发生未知错误' });
  }
});

// 3. Vite Server / Static Assets Routing
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
