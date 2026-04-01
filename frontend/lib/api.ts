import {
  ApiModel,
  ApiPersonality,
  DebateGraphEdge,
  DebateGraphNode,
} from "@/types/ui";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type CreateDebateAgentInput = {
  name: string;
  modelKey: string;
  personalityJson: string;
  avatarConfigJson?: string;
};

type CreateDebateResponse = {
  debateId: string;
  activeBranchId: string;
  runId: string;
  agents: Array<{ id: string; name: string; modelKey: string }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status} ${response.statusText}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function fetchModels(): Promise<ApiModel[]> {
  return request<ApiModel[]>("/api/models");
}

export function fetchPersonalities(): Promise<ApiPersonality[]> {
  return request<ApiPersonality[]>("/api/personalities");
}

export function createDebate(input: {
  title: string;
  goal: string;
  agents: CreateDebateAgentInput[];
}): Promise<CreateDebateResponse> {
  return request<CreateDebateResponse>("/api/debates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function startDebate(debateId: string): Promise<{ runId: string; status: string }> {
  return request<{ runId: string; status: string }>(`/api/debates/${debateId}/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function continueDebate(
  debateId: string,
  prompt: string,
): Promise<{ runId: string; status: string }> {
  return request<{ runId: string; status: string }>(`/api/debates/${debateId}/continue`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function fetchGraph(
  debateId: string,
): Promise<{ nodes: DebateGraphNode[]; edges: DebateGraphEdge[] }> {
  return request<{ nodes: DebateGraphNode[]; edges: DebateGraphEdge[] }>(
    `/api/debates/${debateId}/graph`,
  );
}

export function sendIntervention(debateId: string, instruction: string): Promise<unknown> {
  return request<unknown>(`/api/debates/${debateId}/intervene`, {
    method: "POST",
    body: JSON.stringify({
      interventionType: "redirect_focus",
      instruction,
    }),
  });
}

export function finalizeDebate(debateId: string): Promise<unknown> {
  return request<unknown>(`/api/debates/${debateId}/finalize`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
