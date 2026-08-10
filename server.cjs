var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);

// src/mstSolver.ts
var DSU = class {
  constructor(vertexIds) {
    this.parent = {};
    for (const id of vertexIds) {
      this.parent[id] = id;
    }
  }
  find(id) {
    if (!(id in this.parent)) {
      this.parent[id] = id;
    }
    if (this.parent[id] === id) {
      return id;
    }
    this.parent[id] = this.find(this.parent[id]);
    return this.parent[id];
  }
  union(id1, id2) {
    const root1 = this.find(id1);
    const root2 = this.find(id2);
    if (root1 !== root2) {
      this.parent[root1] = root2;
      return true;
    }
    return false;
  }
  getMapping(vertexIds) {
    const mapping = {};
    for (const id of vertexIds) {
      mapping[id] = this.find(id);
    }
    return mapping;
  }
};
function solveKruskal(vertices, edges) {
  const steps = [];
  const vertexIds = vertices.map((v) => v.id);
  const dsu = new DSU(vertexIds);
  const mstEdgeIds = [];
  const mstEdges = [];
  const nodeNameMap = /* @__PURE__ */ new Map();
  vertices.forEach((v) => nodeNameMap.set(v.id, v.name || `\u8282\u70B9_${v.id.substring(0, 4)}`));
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  if (vertices.length === 0) {
    return {
      algorithm: "kruskal",
      totalWeight: 0,
      mstEdges: [],
      steps: [],
      isStepListComplete: true,
      isDisconnected: false
    };
  }
  steps.push({
    stepIndex: 0,
    activeEdgeId: null,
    mstEdgeIds: [],
    explanation: "Kruskal \u7B97\u6CD5\u542F\u52A8\u3002\u6240\u6709\u8FB9\u5DF2\u6309\u7167\u6743\u91CD\u4ECE\u4F4E\u5230\u9AD8\u6392\u5E8F\u3002\u521D\u59CB\u5E76\u67E5\u96C6\u68EE\u6797\u4E2D\u6BCF\u4E2A\u8282\u70B9\u81EA\u6210\u4E00\u4E2A\u8FDE\u901A\u5206\u91CF\uFF08\u907F\u514D\u6210\u73AF\u7684\u524D\u63D0\uFF09\u3002",
    status: "examining",
    subsets: dsu.getMapping(vertexIds)
  });
  let stepIdx = 1;
  for (const edge of sortedEdges) {
    const u = edge.source;
    const v = edge.target;
    const uName = nodeNameMap.get(u) || u;
    const vName = nodeNameMap.get(v) || v;
    const rootU = dsu.find(u);
    const rootV = dsu.find(v);
    if (rootU === rootV) {
      steps.push({
        stepIndex: stepIdx++,
        activeEdgeId: edge.id,
        mstEdgeIds: [...mstEdgeIds],
        explanation: `\u8003\u5BDF\u8FB9 ${uName} - ${vName} (\u6743\u91CD ${edge.weight})\u3002\u8282\u70B9 ${uName} \u4E0E ${vName} \u5DF2\u7ECF\u5C5E\u4E8E\u540C\u4E00\u4E2A\u5206\u91CF (\u4EE3\u8868\u5143: ${nodeNameMap.get(rootU) || rootU})\u3002\u5982\u679C\u52A0\u5165\u8BE5\u8FB9\uFF0C\u5C06\u5F62\u6210\u56DE\u8DEF (\u6210\u73AF)\uFF0C\u56E0\u6B64\u820D\u5F03\u8BE5\u8FB9\uFF01`,
        status: "cycle",
        subsets: dsu.getMapping(vertexIds)
      });
    } else {
      dsu.union(u, v);
      mstEdgeIds.push(edge.id);
      mstEdges.push(edge);
      const newRoot = dsu.find(u);
      steps.push({
        stepIndex: stepIdx++,
        activeEdgeId: edge.id,
        mstEdgeIds: [...mstEdgeIds],
        explanation: `\u8003\u5BDF\u8FB9 ${uName} - ${vName} (\u6743\u91CD ${edge.weight})\u3002\u4E24\u7AEF\u8282\u70B9\u5904\u4E8E\u4E0D\u540C\u5206\u91CF\uFF0C\u52A0\u5165\u8BE5\u8FB9\u5B89\u5168\uFF0C\u5E76\u5F52\u5E76\u5B83\u4EEC\u7684\u5206\u91CF (\u7EDF\u4E00\u4EE3\u8868\u5143: ${nodeNameMap.get(newRoot) || newRoot})\u3002`,
        status: "safe",
        subsets: dsu.getMapping(vertexIds)
      });
    }
  }
  let isDisconnected = false;
  if (vertices.length > 1) {
    const firstRoot = dsu.find(vertexIds[0]);
    for (let i = 1; i < vertexIds.length; i++) {
      if (dsu.find(vertexIds[i]) !== firstRoot) {
        isDisconnected = true;
        break;
      }
    }
  }
  const totalWeight = mstEdges.reduce((acc, e) => acc + e.weight, 0);
  steps.push({
    stepIndex: stepIdx,
    activeEdgeId: null,
    mstEdgeIds: [...mstEdgeIds],
    explanation: isDisconnected ? `Kruskal \u7B97\u6CD5\u6267\u884C\u5B8C\u6BD5\u3002\u7531\u4E8E\u56FE\u672C\u8EAB\u4E0D\u8FDE\u901A\uFF0C\u6211\u4EEC\u5F97\u5230\u4E86\u4E00\u4E2A\u6700\u5C0F\u751F\u6210\u68EE\u6797\u3002\u68EE\u6797\u5171\u5305\u542B ${mstEdges.length} \u6761\u8FB9\uFF0C\u603B\u6743\u91CD\u4E3A ${totalWeight}\u3002` : `Kruskal \u7B97\u6CD5\u6267\u884C\u5B8C\u6BD5\u3002\u6211\u4EEC\u5DF2\u6210\u529F\u5EFA\u7ACB\u5B8C\u6574\u7684\u6700\u5C0F\u751F\u6210\u6811\uFF01\u6811\u5171\u5305\u542B ${mstEdges.length} \u6761\u8FB9\uFF0C\u603B\u6743\u91CD\u4E3A ${totalWeight}\u3002`,
    status: "complete",
    subsets: dsu.getMapping(vertexIds)
  });
  return {
    algorithm: "kruskal",
    totalWeight,
    mstEdges,
    steps,
    isStepListComplete: true,
    isDisconnected
  };
}
function solvePrim(vertices, edges, startVertexId) {
  const steps = [];
  const mstEdgeIds = [];
  const mstEdges = [];
  if (vertices.length === 0) {
    return {
      algorithm: "prim",
      totalWeight: 0,
      mstEdges: [],
      steps: [],
      isStepListComplete: true,
      isDisconnected: false
    };
  }
  const nodeNameMap = /* @__PURE__ */ new Map();
  vertices.forEach((v) => nodeNameMap.set(v.id, v.name || `\u8282\u70B9_${v.id.substring(0, 4)}`));
  const startId = startVertexId && vertices.some((v) => v.id === startVertexId) ? startVertexId : vertices[0].id;
  const startName = nodeNameMap.get(startId) || startId;
  const visited = /* @__PURE__ */ new Set();
  visited.add(startId);
  steps.push({
    stepIndex: 0,
    activeEdgeId: null,
    visitedNodeIds: [startId],
    candidateEdgeIds: [],
    mstEdgeIds: [],
    explanation: `Prim \u7B97\u6CD5\u542F\u52A8\u3002\u9009\u62E9\u8D77\u59CB\u6E90\u8282\u70B9 ${startName}\u3002\u4EE5\u6B64\u8282\u70B9\u4E3A\u57FA\u51C6\u5411\u5916\u8FDB\u884C\u201C\u84DD\u8272\u6D9F\u6F2A\u201D\u72B6\u7684\u5272\u8FB9\u63A2\u6D4B\u4E0E\u6269\u6563\u3002`,
    status: "examining"
  });
  let stepIdx = 1;
  let isDisconnected = false;
  while (visited.size < vertices.length) {
    const candidates = edges.filter((edge) => {
      const sourceVisited = visited.has(edge.source);
      const targetVisited = visited.has(edge.target);
      return sourceVisited && !targetVisited || !sourceVisited && targetVisited;
    });
    if (candidates.length === 0) {
      isDisconnected = true;
      break;
    }
    const candidateIds = candidates.map((c) => c.id);
    candidates.sort((a, b) => a.weight - b.weight);
    const bestEdge = candidates[0];
    const u = bestEdge.source;
    const v = bestEdge.target;
    const nextNodeId = visited.has(u) ? v : u;
    const nextNodeName = nodeNameMap.get(nextNodeId) || nextNodeId;
    const anchorNodeId = visited.has(u) ? u : v;
    const anchorNodeName = nodeNameMap.get(anchorNodeId) || anchorNodeId;
    const cutDescriptionList = candidates.slice(0, 4).map((c) => {
      const sN = nodeNameMap.get(c.source) || c.source;
      const tN = nodeNameMap.get(c.target) || c.target;
      return `${sN}-${tN} (\u6743\u91CD:${c.weight})`;
    }).join(", ");
    const extraCutCount = candidates.length > 4 ? ` \u7B49\u5171 ${candidates.length} \u6761` : "";
    steps.push({
      stepIndex: stepIdx++,
      activeEdgeId: bestEdge.id,
      visitedNodeIds: Array.from(visited),
      candidateEdgeIds: candidateIds,
      mstEdgeIds: [...mstEdgeIds],
      explanation: `\u5F53\u524D\u5DF2\u8BBF\u95EE\u8282\u70B9\u96C6\u4E3A { ${Array.from(visited).map((id) => nodeNameMap.get(id)).join(", ")} }\u3002\u6B64\u65F6\u56FE\u7684\u5272\u96C6\uFF08\u8DE8\u8D8A\u5DF2\u8BBF\u95EE\u4E0E\u672A\u8BBF\u95EE\u7684\u5019\u9009\u8FB9\uFF09\u5305\u542B: [ ${cutDescriptionList}${extraCutCount} ]\u3002\u5728\u6240\u6709\u8DE8\u8D8A\u5272\u7684\u5019\u9009\u8FB9\u4E2D\uFF0C\u8FB9 ${anchorNodeName} - ${nextNodeName} \u7684\u6743\u91CD\u6700\u5C0F (${bestEdge.weight})\u3002`,
      status: "examining"
    });
    visited.add(nextNodeId);
    mstEdgeIds.push(bestEdge.id);
    mstEdges.push(bestEdge);
    steps.push({
      stepIndex: stepIdx++,
      activeEdgeId: bestEdge.id,
      visitedNodeIds: Array.from(visited),
      candidateEdgeIds: candidateIds.filter((id) => id !== bestEdge.id),
      mstEdgeIds: [...mstEdgeIds],
      explanation: `\u6839\u636E\u5272\u8FB9\u5B9A\u7406\uFF0C\u9009\u62E9\u6743\u91CD\u6700\u5C0F\u7684\u8FB9 ${anchorNodeName} - ${nextNodeName} (\u6743\u91CD ${bestEdge.weight})\u3002\u5C06\u8282\u70B9 ${nextNodeName} \u6807\u4E3A\u5DF2\u8BBF\u95EE\uFF0C\u5E76\u5B89\u5168\u9501\u6B7B\u8BE5\u8FB9\u5C06\u5176\u5F52\u5E76\u5165\u6700\u5C0F\u751F\u6210\u6811\u3002`,
      status: "expanding"
    });
  }
  const totalWeight = mstEdges.reduce((acc, e) => acc + e.weight, 0);
  steps.push({
    stepIndex: stepIdx,
    activeEdgeId: null,
    visitedNodeIds: Array.from(visited),
    candidateEdgeIds: [],
    mstEdgeIds: [...mstEdgeIds],
    explanation: isDisconnected ? `Prim \u7B97\u6CD5\u6267\u884C\u7ED3\u675F\u3002\u7531\u4E8E\u56FE\u672C\u8EAB\u4E0D\u8FDE\u901A\uFF0C\u4EC5\u751F\u6210\u4E86\u5F53\u524D\u5206\u91CF\u7684\u6700\u5C0F\u751F\u6210\u6811\u3002\u5171\u8BBF\u95EE\u4E86 ${visited.size}/${vertices.length} \u4E2A\u8282\u70B9\uFF0C\u5305\u542B ${mstEdges.length} \u6761\u8FB9\uFF0C\u603B\u6743\u91CD\u4E3A ${totalWeight}\u3002` : `Prim \u7B97\u6CD5\u6267\u884C\u7ED3\u675F\u3002\u6240\u6709 ${vertices.length} \u4E2A\u8282\u70B9\u5DF2\u88AB\u6210\u529F\u8BBF\u95EE\u8986\u76D6\u3002\u751F\u6210\u4E86\u4E00\u68F5\u5305\u542B ${mstEdges.length} \u6761\u8FB9\u3001\u603B\u6743\u91CD\u4E3A ${totalWeight} \u7684\u6700\u5C0F\u751F\u6210\u6811\u3002`,
    status: "complete"
  });
  return {
    algorithm: "prim",
    totalWeight,
    mstEdges,
    steps,
    isStepListComplete: true,
    isDisconnected
  };
}

// server.ts
var import_child_process = require("child_process");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var genAI = null;
function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      genAI = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return genAI;
}
app.post("/api/solve-mst", (req, res) => {
  try {
    const { vertices, edges, algorithm, startVertexId } = req.body;
    if (!vertices || !edges) {
      return res.status(400).json({ error: "\u7F3A\u5C11 vertices \u6216 edges \u6570\u636E" });
    }
    if (algorithm === "prim") {
      const result = solvePrim(vertices, edges, startVertexId);
      return res.json(result);
    } else {
      const result = solveKruskal(vertices, edges);
      return res.json(result);
    }
  } catch (error) {
    console.error("Solve MST Error:", error);
    return res.status(500).json({ error: error.message || "\u6C42\u89E3 MST \u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF" });
  }
});
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { vertices, edges, mstEdges, totalWeight, algorithm } = req.body;
    if (!vertices || !edges || !mstEdges) {
      return res.status(400).json({ error: "\u7F3A\u5C11\u56FE\u6216\u6700\u5C0F\u751F\u6210\u6811\u7684\u6570\u636E" });
    }
    const aiClient = getGenAI();
    if (!aiClient) {
      return res.json({
        isApiKeyMissing: true,
        summary: "\u672A\u68C0\u6D4B\u5230\u6709\u6548\u7684 GEMINI_API_KEY \u5BC6\u94A5\uFF0CAI \u6D1E\u5BDF\u5206\u6790\u6A21\u5757\u8FDB\u5165\u6F14\u793A\u6A21\u5F0F\u3002",
        sensitivityAnalysis: [
          {
            source: "\u8FB9\u96C6\u793A\u4F8B1",
            target: "\u6F14\u793A",
            currentWeight: 5,
            criticalIncreaseThreshold: "> 7",
            criticalDecreaseThreshold: "< 3",
            impactDescription: "\u3010\u6F14\u793A\u6A21\u5F0F\u3011\u5F53\u524D\u672A\u914D\u7F6E AI \u5BC6\u94A5\u3002\u82E5\u914D\u7F6E\uFF0CAI \u5C06\u6DF1\u5EA6\u6316\u6398\u5F53\u6B64\u8FB9\u6743\u91CD\u6CE2\u52A8\u65F6\u662F\u5426\u88AB\u5176\u4ED6\u5907\u7528\u8FB9\u66FF\u4EE3\uFF0C\u4EE5\u53CA\u5BF9\u7CFB\u7EDF\u5168\u5C40\u5197\u4F59\u6027\u7684\u5F71\u54CD\u3002"
          }
        ],
        engineering\u9020\u4EF7: {
          projectType: "fiber",
          unitCost: 1.2,
          totalCost: totalWeight * 1.2 + 25,
          costBreakdown: [
            {
              item: "\u6838\u5FC3\u7EBF\u7F06\u94FA\u8BBE (\u6F14\u793A)",
              cost: totalWeight * 1.2,
              description: "\u6839\u636E\u62D3\u6251\u8DDD\u79BB\u4F30\u7B97\u7684\u57FA\u7840\u5149\u7EA4\u7269\u6599\u8D39\u7528\uFF081.2\u4E07\u5143/\u6743\u503C\uFF09"
            },
            {
              item: "\u8282\u70B9\u7194\u63A5\u53CA\u8F85\u52A9\u5DE5\u7A0B (\u6F14\u793A)",
              cost: 25,
              description: "\u7F51\u7EDC\u4EA4\u6362\u8282\u70B9\u57FA\u7840\u8BBE\u5907\u914D\u7F6E\u4E0E\u8C03\u8BD5\u56FA\u5B9A\u9020\u4EF7\u4F30\u503C"
            }
          ]
        },
        optimizationAdvice: [
          "\u8BF7\u5728\u53F3\u4FA7 Settings > Secrets \u4E2D\u914D\u7F6E GEMINI_API_KEY \u5BC6\u94A5\uFF0C\u4EE5\u89E3\u9501\u57FA\u4E8E\u771F\u5B9E\u7F51\u7EDC\u62D3\u6251\u7684\u4E13\u5BB6\u7EA7 AI \u7075\u654F\u5EA6\u4E0E\u9020\u4EF7\u5206\u6790\u62A5\u544A\u3002",
          "\u3010\u62D3\u6251\u5EFA\u8BAE\u3011\u5F53\u524D MST \u62D3\u6251\u65E0\u81EA\u73AF\uFF0C\u5728\u901A\u4FE1\u7F51\u4E2D\u5C5E\u4E8E\u96F6\u5197\u4F59\u7ED3\u6784\uFF0C\u5EFA\u8BAE\u5728\u5173\u952E\u8282\u70B9 A \u548C B \u95F4\u589E\u8BBE\u4E00\u6761\u5907\u4EFD\u94FE\u8DEF\u4EE5\u9632\u6B62\u5355\u70B9\u6545\u969C\u3002",
          "\u3010\u74F6\u9888\u63D0\u793A\u3011\u5F53\u524D\u6811\u4E2D\u5355\u6761\u6743\u91CD\u6700\u5927\u7684\u8FB9\u662F\u5168\u5C40\u8106\u5F31\u70B9\uFF0C\u65BD\u5DE5\u65F6\u53EF\u8003\u8651\u4F18\u5148\u5BF9\u8BE5\u8DEF\u6BB5\u8FDB\u884C\u5730\u7406\u52D8\u6D4B\u548C\u6297\u707E\u9632\u62A4\u3002"
        ]
      });
    }
    const nodesStr = vertices.map((v) => `${v.name || v.id} (\u5750\u6807:[${Math.round(v.x)}, ${Math.round(v.y)}])`).join(", ");
    const allEdgesStr = edges.map((e) => `${e.sourceName || e.source} - ${e.targetName || e.target} (\u6743\u91CD: ${e.weight})`).join(", ");
    const mstEdgesStr = mstEdges.map((e) => `${e.sourceName || e.source} - ${e.targetName || e.target} (\u6743\u91CD: ${e.weight})`).join(", ");
    const prompt = `
    \u4F60\u662F\u4E00\u4E2A\u56FE\u8BBA\u548C\u7F51\u7EDC\u89C4\u5212\u9886\u57DF\u7684\u8D44\u6DF1\u9AD8\u7EA7\u5DE5\u7A0B\u4E13\u5BB6\u3002
    \u8BF7\u9488\u5BF9\u4EE5\u4E0B\u8F93\u5165\u7684\u56FE\u62D3\u6251\u7ED3\u6784\u4EE5\u53CA\u6C42\u89E3\u51FA\u6765\u7684\u6700\u5C0F\u751F\u6210\u6811\uFF08MST\uFF09\u8FDB\u884C\u6DF1\u5EA6\u5206\u6790\u3002

    \u3010\u8F93\u5165\u56FE\u7684\u9876\u70B9\u96C6\u5408\u3011\uFF1A
    ${nodesStr}

    \u3010\u8F93\u5165\u56FE\u7684\u6240\u6709\u5907\u9009\u8FB9\u96C6\u5408\uFF08\u8FB9\u96C6\u5217\u8868\uFF09\u3011\uFF1A
    ${allEdgesStr}

    \u3010\u5F53\u524D\u6C42\u89E3\u51FA\u6765\u7684\u6700\u5C0F\u751F\u6210\u6811\uFF08MST\uFF09\u5305\u542B\u7684\u8FB9\u96C6\u3011\uFF1A
    ${mstEdgesStr}

    \u3010MST \u603B\u6743\u91CD\u3011\uFF1A${totalWeight}
    \u3010\u6C42\u89E3\u6240\u7528\u7B97\u6CD5\u3011\uFF1A${algorithm}

    \u8BF7\u7ED9\u51FA\u4E13\u4E1A\u7684\uFF1A
    1. \u3010\u4E00\u53E5\u8BDD\u603B\u7ED3\u3011\uFF1A\u8BE5\u62D3\u6251\u5728\u73B0\u5B9E\u5DE5\u7A0B\u5E94\u7528\uFF08\u5982\u5149\u7EA4\u3001\u7535\u7F51\u3001\u7BA1\u9053\u94FA\u8BBE\uFF09\u4E2D\u7684\u9AD8\u5C42\u4EF7\u503C\u3002
    2. \u3010\u7075\u654F\u5EA6\u5206\u6790\u3011\uFF1A\u6307\u51FA\u5176\u4E2D 2~3 \u6761\u5173\u952E\u8FB9\uFF08\u54EA\u6015\u5FAE\u5C0F\u53D8\u52A8\u5C31\u4F1A\u8BA9MST\u62D3\u6251\u6539\u53D8\u3001\u6216\u5177\u6709\u91CD\u8981\u5197\u4F59\u66FF\u4EE3\u4F5C\u7528\u7684\u8FB9\uFF09\uFF0C\u5206\u6790\u5F53\u8FD9\u4E9B\u8FB9\u7684\u6743\u91CD\u53D8\u9AD8\u3001\u53D8\u4F4E\u65F6\u7684\u62D3\u6251\u4E34\u754C\u9608\u503C\u548C\u5F71\u54CD\u3002
    3. \u3010\u5DE5\u7A0B\u9020\u4EF7\u6D4B\u7B97\u3011\uFF1A\u8BC4\u4F30\u7F51\u7EDC\u5EFA\u8BBE\u7684\u603B\u9884\u7B97\u3002\u8BF7\u4ECE "fiber" (\u5149\u7EA4\u94FA\u8BBE), "grid" (\u7535\u7F51\u89C4\u5212), "road" (\u667A\u6167\u4EA4\u901A) \u4E2D\uFF0C\u9009\u62E9\u4E00\u4E2A\u6700\u9002\u5408\u5F53\u524D\u56FE\u62D3\u6251\u89C4\u6A21\u4E0E\u7279\u6027\u7684\u573A\u666F\uFF08\u5982\u8282\u70B9\u591A\u4E14\u5BC6\u96C6\u9002\u5408\u5149\u7EA4\u3001\u957F\u8DDD\u79BB\u5E26\u72B6\u5206\u5E03\u9002\u5408\u7535\u7F51\u7B49\uFF09\uFF0C\u5E76\u5236\u5B9A\u8BE6\u7EC6\u7684\u4EBA\u6C11\u5E01\u9020\u4EF7\u79D1\u76EE\u660E\u7EC6\u3002
    4. \u3010\u4E13\u5BB6\u7EA7\u4F18\u5316\u5EFA\u8BAE\u3011\uFF1A\u7ED9\u51FA\u81F3\u5C11 3 \u6761\u6DF1\u5165\u3001\u843D\u5730\u3001\u65E0\u9700\u6280\u672F\u5806\u780C\u7684\u5EFA\u8BBE\u4E0E\u4F18\u5316\u5EFA\u8BAE\u3002

    \u8981\u6C42\u5FC5\u987B\u5B8C\u5168\u9075\u5FAA\u6307\u5B9A\u7684 JSON \u683C\u5F0F\u3002
    `;
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u7F51\u7EDC\u62D3\u6251\u4E0E\u5DE5\u7A0B\u9020\u4EF7\u5206\u6790\u52A9\u624B\u3002\u4F60\u5FC5\u987B\u4E25\u683C\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u8F93\u51FA\uFF0C\u5E76\u5B8C\u5168\u9075\u5FAA\u63D0\u4F9B\u7684 JSON \u683C\u5F0F\u89C4\u8303\uFF0C\u4E0D\u6DFB\u52A0\u4EFB\u4F55 markdown \u6807\u8BB0\u3002",
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            summary: {
              type: import_genai.Type.STRING,
              description: "\u4E00\u53E5\u8BDD\u603B\u7ED3\u8BE5\u6700\u5C0F\u751F\u6210\u6811\u62D3\u6251\u8BBE\u8BA1\u7684\u5DE5\u7A0B\u5B66\u4EF7\u503C\u3002"
            },
            sensitivityAnalysis: {
              type: import_genai.Type.ARRAY,
              description: "\u9488\u5BF9\u56FE\u4E2D\u91CD\u8981\u8FB9\u7684\u7075\u654F\u5EA6\u5206\u6790\u5217\u8868\uFF08\u9009\u53D62-3\u6761\u5173\u952E\u8FB9\u8FDB\u884C\u5206\u6790\uFF09\u3002",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  source: { type: import_genai.Type.STRING, description: "\u6E90\u8282\u70B9\u540D\u79F0" },
                  target: { type: import_genai.Type.STRING, description: "\u76EE\u6807\u8282\u70B9\u540D\u79F0" },
                  currentWeight: { type: import_genai.Type.NUMBER, description: "\u5F53\u524D\u8FB9\u6743\u91CD" },
                  criticalIncreaseThreshold: { type: import_genai.Type.STRING, description: "\u5F15\u8D77MST\u62D3\u6251\u53D8\u5316\u7684\u6743\u91CD\u4E0A\u8C03\u4E34\u754C\u503C\u63CF\u8FF0\uFF08\u4F8B\u5982: '> 8' \u6216 '\u65E0\u53D8\u5316'\uFF09" },
                  criticalDecreaseThreshold: { type: import_genai.Type.STRING, description: "\u5F15\u8D77MST\u62D3\u6251\u53D8\u5316\u7684\u6743\u91CD\u4E0B\u8C03\u4E34\u754C\u503C\u63CF\u8FF0\uFF08\u4F8B\u5982: '< 4' \u6216 '\u65E0'\uFF09" },
                  impactDescription: { type: import_genai.Type.STRING, description: "\u5F53\u8BE5\u6743\u91CD\u7A81\u7834\u4E34\u754C\u70B9\u65F6\uFF0C\u5BF9\u6574\u4E2A\u6700\u5C0F\u751F\u6210\u6811\u62D3\u6251\u53CA\u6210\u672C\u9020\u6210\u7684\u5177\u4F53\u7269\u7406\u5F71\u54CD\u89E3\u91CA\u3002" }
                },
                required: ["source", "target", "currentWeight", "criticalIncreaseThreshold", "criticalDecreaseThreshold", "impactDescription"]
              }
            },
            engineering\u9020\u4EF7: {
              type: import_genai.Type.OBJECT,
              description: "\u5DE5\u7A0B\u9020\u4EF7\u6D4B\u7B97\u5206\u6790\u3002",
              properties: {
                projectType: { type: import_genai.Type.STRING, description: "\u5DE5\u7A0B\u7C7B\u578B\uFF08\u53EA\u80FD\u662F 'fiber' (\u5149\u7EA4\u901A\u4FE1)\u3001'grid' (\u667A\u80FD\u7535\u7F51) \u6216 'road' (\u667A\u6167\u4EA4\u901A) \u4E4B\u4E00\uFF09" },
                unitCost: { type: import_genai.Type.NUMBER, description: "\u6BCF\u5355\u4F4D\u6743\u91CD\u7684\u57FA\u7840\u9020\u4EF7\u6210\u672C\uFF08\u4EBA\u6C11\u5E01\uFF0C\u5355\u4F4D\u4E3A\u4E07\u5143\uFF0C\u4F8B\u5982\uFF1A1.5 \u8868\u793A1.5\u4E07\u5143/\u5355\u4F4D\uFF09" },
                totalCost: { type: import_genai.Type.NUMBER, description: "\u603B\u9884\u7B97\u6D4B\u7B97\u7ED3\u679C\uFF08\u4EBA\u6C11\u5E01\uFF0C\u5355\u4F4D\u4E3A\u4E07\u5143\u3002\u603B\u6743\u91CD * \u57FA\u7840\u9020\u4EF7 + \u989D\u5916\u5F00\u9500\uFF09" },
                costBreakdown: {
                  type: import_genai.Type.ARRAY,
                  description: "\u8D39\u7528\u660E\u7EC6\u5206\u89E3\u8868",
                  items: {
                    type: import_genai.Type.OBJECT,
                    properties: {
                      item: { type: import_genai.Type.STRING, description: "\u9020\u4EF7\u79D1\u76EE\u7C7B\u522B\u540D\u79F0\uFF08\u4F8B\u5982\uFF1A\u6838\u5FC3\u4F20\u8F93\u7EBF\u7F06\u3001\u8282\u70B9\u7194\u63A5\u3001\u4E2D\u7EE7\u5668\u3001\u5197\u4F59\u5907\u7528\u901A\u9053\u7B49\uFF09" },
                      cost: { type: import_genai.Type.NUMBER, description: "\u5BF9\u5E94\u8D39\u7528\u989D\u5EA6\uFF08\u4E07\u5143\uFF09" },
                      description: { type: import_genai.Type.STRING, description: "\u79D1\u76EE\u5177\u4F53\u6D4B\u7B97\u4F9D\u636E\u4E0E\u5DE5\u7A0B\u89E3\u91CA" }
                    },
                    required: ["item", "cost", "description"]
                  }
                }
              },
              required: ["projectType", "unitCost", "totalCost", "costBreakdown"]
            },
            optimizationAdvice: {
              type: import_genai.Type.ARRAY,
              description: "\u9488\u5BF9\u8BE5\u7F51\u7EDC\u62D3\u6251\u5DE5\u7A0B\u63D0\u51FA\u7684\u5177\u4F53\u3001\u5BCC\u6709\u6D1E\u5BDF\u529B\u7684\u4E13\u5BB6\u7EA7\u4F18\u5316\u4E0E\u6539\u8FDB\u5EFA\u8BAE\u5217\u8868\uFF083\u6761\u4EE5\u4E0A\uFF09\u3002",
              items: { type: import_genai.Type.STRING }
            }
          },
          required: ["summary", "sensitivityAnalysis", "engineering\u9020\u4EF7", "optimizationAdvice"]
        }
      }
    });
    const text = response.text;
    if (!text) {
      throw new Error("\u672A\u63A5\u6536\u5230 AI \u54CD\u5E94\u5185\u5BB9");
    }
    const result = JSON.parse(text.trim());
    return res.json(result);
  } catch (error) {
    console.error("AI Insights Error:", error);
    return res.status(500).json({ error: error.message || "\u83B7\u53D6 AI \u6D1E\u5BDF\u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF" });
  }
});
app.post("/api/run-python", (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "\u7F3A\u5C11\u5F85\u8FD0\u884C\u7684 Python \u4EE3\u7801" });
    }
    const pyProcess = (0, import_child_process.exec)("python3", (error, stdout, stderr) => {
      res.json({
        stdout: stdout || "",
        stderr: stderr || "",
        error: error ? error.message : null
      });
    });
    if (pyProcess.stdin) {
      pyProcess.stdin.write(code);
      pyProcess.stdin.end();
    }
  } catch (error) {
    console.error("Run Python Error:", error);
    return res.status(500).json({ error: error.message || "\u8FD0\u884C Python \u65F6\u53D1\u751F\u672A\u77E5\u9519\u8BEF" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
