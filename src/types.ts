/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vertex {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  source: string; // vertex ID
  target: string; // vertex ID
  weight: number;
}

export interface GraphData {
  vertices: Vertex[];
  edges: Edge[];
}

export interface KruskalStep {
  stepIndex: number;
  activeEdgeId: string | null;
  mstEdgeIds: string[];
  explanation: string;
  status: 'examining' | 'cycle' | 'safe' | 'complete';
  subsets: { [nodeId: string]: string }; // node ID -> parent representative ID
}

export interface PrimStep {
  stepIndex: number;
  activeEdgeId: string | null;
  visitedNodeIds: string[];
  candidateEdgeIds: string[];
  mstEdgeIds: string[];
  explanation: string;
  status: 'examining' | 'expanding' | 'complete';
}

export interface MSTSolveResult {
  algorithm: 'kruskal' | 'prim';
  totalWeight: number;
  mstEdges: Edge[];
  steps: (KruskalStep | PrimStep)[];
  isStepListComplete: boolean;
  isDisconnected: boolean;
}

export interface SensitivityAnalysisEdge {
  source: string;
  target: string;
  currentWeight: number;
  criticalIncreaseThreshold: string; // weight increment that alters MST
  criticalDecreaseThreshold: string; // weight decrement that alters MST
  impactDescription: string;         // what happens if it changes
}

export interface Engineering造价Estimate {
  projectType: 'fiber' | 'grid' | 'road';
  unitCost: number;                  // cost per weight unit (e.g., $10k)
  totalCost: number;                 // total MST cost
  costBreakdown: {
    item: string;
    cost: number;
    description: string;
  }[];
}

export interface AIInsightsResult {
  summary: string;
  sensitivityAnalysis: SensitivityAnalysisEdge[];
  engineering造价: Engineering造价Estimate;
  optimizationAdvice: string[];
}
