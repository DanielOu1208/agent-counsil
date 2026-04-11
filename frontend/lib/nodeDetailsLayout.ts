import {
  PersistedWorkspaceNodeDetailsLayoutV2,
  WorkspaceNodeDetailsLayoutV2,
  WorkspaceSplitEdge,
} from '@/types/ui';

export const NODE_DETAILS_LAYOUT_VERSION = 2 as const;
export const MAX_RIGHT_PANES = 4;
export const MAX_TABS_PER_PANE = 25;
export const MAX_TOTAL_TABS = 100;
export const MAX_TAB_ID_LENGTH = 128;
export const MAX_PERSISTED_LAYOUT_BYTES = 64 * 1024;
export const LAYOUT_STORAGE_WRITE_DEBOUNCE_MS = 300;

const TAB_ID_PREFIX = 'node:';
const DEFAULT_PANE_ID = 'pane:primary';

interface SanitizeOptions {
  validNodeIds?: Set<string>;
  pruneMissingNodeTabs?: boolean;
}

interface ClosePaneCheckResult {
  ok: boolean;
  reason?: string;
}

interface LegacyPersistedLayoutV1 {
  version?: 1;
  rightTabs?: Array<{ id?: unknown; kind?: unknown; nodeId?: unknown }>;
  rightActiveTabId?: unknown;
  tabs?: unknown;
  activeTabId?: unknown;
}

function randomPaneId(): string {
  return `pane:${Math.random().toString(36).slice(2, 10)}`;
}

function getByteSize(raw: string): number {
  return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(raw).length : raw.length;
}

export function createDefaultNodeDetailsLayout(): WorkspaceNodeDetailsLayoutV2 {
  return {
    version: NODE_DETAILS_LAYOUT_VERSION,
    panes: [{ id: DEFAULT_PANE_ID, tabIds: [], activeTabId: null }],
    activePaneId: DEFAULT_PANE_ID,
  };
}

export function buildNodeTabId(nodeId: string): string {
  return `${TAB_ID_PREFIX}${nodeId}`;
}

export function parseNodeIdFromTabId(tabId: string): string | null {
  if (!tabId.startsWith(TAB_ID_PREFIX) || tabId.length <= TAB_ID_PREFIX.length) return null;
  return tabId.slice(TAB_ID_PREFIX.length);
}

function sanitizeTabIds(tabIds: unknown): string[] {
  if (!Array.isArray(tabIds)) return [];
  return tabIds.filter((tabId): tabId is string => {
    return (
      typeof tabId === 'string' &&
      tabId.length > TAB_ID_PREFIX.length &&
      tabId.length <= MAX_TAB_ID_LENGTH &&
      tabId.startsWith(TAB_ID_PREFIX)
    );
  });
}

function enforceCaps(tabIds: string[], globalSeen: Set<string>): string[] {
  const next: string[] = [];

  for (const tabId of tabIds) {
    if (globalSeen.size >= MAX_TOTAL_TABS) break;
    if (next.length >= MAX_TABS_PER_PANE) break;
    if (globalSeen.has(tabId)) continue;

    next.push(tabId);
    globalSeen.add(tabId);
  }

  return next;
}

export function sanitizeNodeDetailsLayout(
  candidate: WorkspaceNodeDetailsLayoutV2 | PersistedWorkspaceNodeDetailsLayoutV2 | null | undefined,
  options: SanitizeOptions = {},
): WorkspaceNodeDetailsLayoutV2 {
  if (!candidate || candidate.version !== NODE_DETAILS_LAYOUT_VERSION || !Array.isArray(candidate.panes)) {
    return createDefaultNodeDetailsLayout();
  }

  const globalSeen = new Set<string>();
  const paneIdSeen = new Set<string>();
  const pruneMissing = Boolean(options.pruneMissingNodeTabs && options.validNodeIds);
  const panes = candidate.panes
    .slice(0, MAX_RIGHT_PANES)
    .map((pane, index) => {
      const paneId =
        typeof pane?.id === 'string' && pane.id.length > 0 && pane.id.length <= 128 && !paneIdSeen.has(pane.id)
          ? pane.id
          : `pane:recovered:${index}:${randomPaneId()}`;
      paneIdSeen.add(paneId);

      let tabIds = enforceCaps(sanitizeTabIds(pane?.tabIds), globalSeen);
      if (pruneMissing && options.validNodeIds) {
        tabIds = tabIds.filter((tabId) => {
          const nodeId = parseNodeIdFromTabId(tabId);
          return Boolean(nodeId && options.validNodeIds?.has(nodeId));
        });
      }

      const activeTabId =
        typeof pane?.activeTabId === 'string' && tabIds.includes(pane.activeTabId)
          ? pane.activeTabId
          : (tabIds[0] ?? null);

      return {
        id: paneId,
        tabIds,
        activeTabId,
      };
    })
    .filter((pane) => pane.tabIds.length > 0);

  const normalizedPanes = panes.length > 0 ? panes : [createDefaultNodeDetailsLayout().panes[0]];
  const activePaneId = normalizedPanes.some((pane) => pane.id === candidate.activePaneId)
    ? candidate.activePaneId
    : normalizedPanes[0].id;

  return {
    version: NODE_DETAILS_LAYOUT_VERSION,
    panes: normalizedPanes,
    activePaneId,
  };
}

export function findPaneIndexById(layout: WorkspaceNodeDetailsLayoutV2, paneId: string): number {
  return layout.panes.findIndex((pane) => pane.id === paneId);
}

export function findPaneIndexByTabId(layout: WorkspaceNodeDetailsLayoutV2, tabId: string): number {
  return layout.panes.findIndex((pane) => pane.tabIds.includes(tabId));
}

export function activatePane(
  layout: WorkspaceNodeDetailsLayoutV2,
  paneId: string,
): WorkspaceNodeDetailsLayoutV2 {
  if (!layout.panes.some((pane) => pane.id === paneId)) return layout;
  if (layout.activePaneId === paneId) return layout;

  return {
    ...layout,
    activePaneId: paneId,
  };
}

export function activateTab(
  layout: WorkspaceNodeDetailsLayoutV2,
  paneId: string,
  tabId: string,
): WorkspaceNodeDetailsLayoutV2 {
  const pane = layout.panes.find((candidatePane) => candidatePane.id === paneId);
  if (!pane) return layout;
  if (!pane.tabIds.includes(tabId)) return layout;

  return {
    ...layout,
    activePaneId: paneId,
    panes: layout.panes.map((pane) => {
      if (pane.id !== paneId) return pane;
      if (!pane.tabIds.includes(tabId)) return pane;
      if (pane.activeTabId === tabId) return pane;

      return {
        ...pane,
        activeTabId: tabId,
      };
    }),
  };
}

export function openNodeTabInActivePane(
  layout: WorkspaceNodeDetailsLayoutV2,
  tabId: string,
): WorkspaceNodeDetailsLayoutV2 {
  const existingPaneIndex = findPaneIndexByTabId(layout, tabId);
  if (existingPaneIndex >= 0) {
    const existingPaneId = layout.panes[existingPaneIndex]?.id;
    if (!existingPaneId) return layout;

    return activateTab(activatePane(layout, existingPaneId), existingPaneId, tabId);
  }

  return {
    ...layout,
    panes: layout.panes.map((pane) => {
      if (pane.id !== layout.activePaneId) return pane;
      if (pane.tabIds.length >= MAX_TABS_PER_PANE) return pane;

      return {
        ...pane,
        tabIds: [...pane.tabIds, tabId],
        activeTabId: tabId,
      };
    }),
  };
}

export function closeTabInPane(
  layout: WorkspaceNodeDetailsLayoutV2,
  paneId: string,
  tabId: string,
): WorkspaceNodeDetailsLayoutV2 {
  const paneIndex = findPaneIndexById(layout, paneId);
  if (paneIndex < 0) return layout;

  const pane = layout.panes[paneIndex];
  const closeIndex = pane.tabIds.findIndex((id) => id === tabId);
  if (closeIndex < 0) return layout;

  const nextTabIds = pane.tabIds.filter((id) => id !== tabId);
  const nextActiveTabId =
    pane.activeTabId !== tabId
      ? pane.activeTabId
      : (nextTabIds[closeIndex - 1] ?? nextTabIds[closeIndex] ?? null);

  const nextPanes = layout.panes.map((candidatePane) => {
    if (candidatePane.id !== paneId) return candidatePane;
    return {
      ...candidatePane,
      tabIds: nextTabIds,
      activeTabId: nextActiveTabId,
    };
  });

  const next = {
    ...layout,
    panes: nextPanes,
  };

  return sanitizeNodeDetailsLayout(next);
}

export function closePane(
  layout: WorkspaceNodeDetailsLayoutV2,
  paneId: string,
): WorkspaceNodeDetailsLayoutV2 {
  const closeCheck = canClosePane(layout, paneId);
  if (!closeCheck.ok) return layout;

  const paneIndex = findPaneIndexById(layout, paneId);
  if (paneIndex < 0) return layout;

  const sourcePane = layout.panes[paneIndex];
  const destinationIndex = paneIndex > 0 ? paneIndex - 1 : 1;
  const destinationPane = layout.panes[destinationIndex];
  if (!destinationPane) return layout;

  const mergedTabIds = [...destinationPane.tabIds];
  for (const tabId of sourcePane.tabIds) {
    if (mergedTabIds.includes(tabId)) continue;
    mergedTabIds.push(tabId);
  }

  const nextPanes = layout.panes
    .map((pane) => {
      if (pane.id === destinationPane.id) {
        return {
          ...pane,
          tabIds: mergedTabIds,
          activeTabId: pane.activeTabId ?? mergedTabIds[0] ?? null,
        };
      }
      return pane;
    })
    .filter((pane) => pane.id !== paneId);

  return sanitizeNodeDetailsLayout({
    ...layout,
    panes: nextPanes,
    activePaneId: destinationPane.id,
  });
}

export function canClosePane(layout: WorkspaceNodeDetailsLayoutV2, paneId: string): ClosePaneCheckResult {
  const paneIndex = findPaneIndexById(layout, paneId);
  if (paneIndex < 0) {
    return { ok: false, reason: 'Pane not found.' };
  }

  if (layout.panes.length <= 1) {
    return { ok: false, reason: 'At least one pane must remain open.' };
  }

  const sourcePane = layout.panes[paneIndex];
  const destinationIndex = paneIndex > 0 ? paneIndex - 1 : 1;
  const destinationPane = layout.panes[destinationIndex];
  if (!destinationPane) {
    return { ok: false, reason: 'No adjacent pane available for merge.' };
  }

  const incomingUniqueTabCount = sourcePane.tabIds.filter((tabId) => !destinationPane.tabIds.includes(tabId)).length;
  const availableCapacity = MAX_TABS_PER_PANE - destinationPane.tabIds.length;

  if (incomingUniqueTabCount > availableCapacity) {
    return {
      ok: false,
      reason: 'Cannot close pane: adjacent pane is full. Move or close some tabs first.',
    };
  }

  return { ok: true };
}

export function getSplitPaneBlockReason(
  layout: WorkspaceNodeDetailsLayoutV2,
  params: { targetPaneId: string; draggedTabId: string },
): string | null {
  if (layout.panes.length >= MAX_RIGHT_PANES) {
    return 'Maximum 4 panes reached. Close a pane to split again.';
  }

  const targetIndex = findPaneIndexById(layout, params.targetPaneId);
  if (targetIndex < 0) {
    return 'Split target pane no longer exists.';
  }

  const sourceIndex = findPaneIndexByTabId(layout, params.draggedTabId);
  if (sourceIndex < 0) {
    return 'Dragged tab is no longer available.';
  }

  const sourcePane = layout.panes[sourceIndex];
  if (!sourcePane) {
    return 'Source pane is no longer available.';
  }

  if (sourcePane.id === params.targetPaneId && sourcePane.tabIds.length <= 1) {
    return 'Cannot split a pane with only one tab. Open another node tab first.';
  }

  return null;
}

export function splitPaneWithTab(
  layout: WorkspaceNodeDetailsLayoutV2,
  params: { targetPaneId: string; edge: WorkspaceSplitEdge; draggedTabId: string },
): WorkspaceNodeDetailsLayoutV2 | null {
  const splitBlockReason = getSplitPaneBlockReason(layout, {
    targetPaneId: params.targetPaneId,
    draggedTabId: params.draggedTabId,
  });
  if (splitBlockReason) return null;

  const sourceIndex = findPaneIndexByTabId(layout, params.draggedTabId);
  if (sourceIndex < 0) return null;

  const strippedPanes = layout.panes.map((pane) => {
    if (pane.id !== layout.panes[sourceIndex]?.id) return pane;
    const tabIds = pane.tabIds.filter((tabId) => tabId !== params.draggedTabId);
    const activeTabId = tabIds.includes(pane.activeTabId ?? '') ? pane.activeTabId : (tabIds[0] ?? null);
    return { ...pane, tabIds, activeTabId };
  });

  const withoutEmptyPanes = strippedPanes.filter((pane) => pane.tabIds.length > 0);
  const targetIndexAfterStrip = withoutEmptyPanes.findIndex((pane) => pane.id === params.targetPaneId);
  if (targetIndexAfterStrip < 0) return null;

  const newPane = {
    id: randomPaneId(),
    tabIds: [params.draggedTabId],
    activeTabId: params.draggedTabId,
  };

  const insertionIndex = params.edge === 'left' ? targetIndexAfterStrip : targetIndexAfterStrip + 1;
  const nextPanes = [...withoutEmptyPanes];
  nextPanes.splice(insertionIndex, 0, newPane);

  return sanitizeNodeDetailsLayout({
    version: NODE_DETAILS_LAYOUT_VERSION,
    panes: nextPanes,
    activePaneId: newPane.id,
  });
}

export function serializeLayoutForStorage(layout: WorkspaceNodeDetailsLayoutV2): string | null {
  const payload: PersistedWorkspaceNodeDetailsLayoutV2 = {
    version: NODE_DETAILS_LAYOUT_VERSION,
    panes: layout.panes.map((pane) => ({
      id: pane.id,
      tabIds: pane.tabIds,
      activeTabId: pane.activeTabId,
    })),
    activePaneId: layout.activePaneId,
  };

  try {
    const raw = JSON.stringify(payload);
    const byteSize = getByteSize(raw);
    return byteSize <= MAX_PERSISTED_LAYOUT_BYTES ? raw : null;
  } catch {
    return null;
  }
}

function normalizeLegacyTabId(candidate: unknown): string | null {
  if (typeof candidate !== 'string') return null;
  if (candidate.length <= TAB_ID_PREFIX.length) return null;
  if (candidate.length > MAX_TAB_ID_LENGTH) return null;
  if (!candidate.startsWith(TAB_ID_PREFIX)) return null;
  return candidate;
}

function migrateLegacyLayoutToV2(parsed: LegacyPersistedLayoutV1): PersistedWorkspaceNodeDetailsLayoutV2 | null {
  const paneId = DEFAULT_PANE_ID;

  const fromRightTabs = Array.isArray(parsed.rightTabs)
    ? parsed.rightTabs
        .map((tab) => {
          if (typeof tab?.id === 'string') return normalizeLegacyTabId(tab.id);
          if (typeof tab?.nodeId === 'string') return normalizeLegacyTabId(buildNodeTabId(tab.nodeId));
          return null;
        })
        .filter((tabId): tabId is string => Boolean(tabId))
    : [];

  const fromTabs = Array.isArray(parsed.tabs)
    ? parsed.tabs
        .map((tabId) => normalizeLegacyTabId(tabId))
        .filter((tabId): tabId is string => Boolean(tabId))
    : [];

  const dedupedTabIds = enforceCaps([...fromRightTabs, ...fromTabs], new Set<string>());
  const preferredActive =
    normalizeLegacyTabId(parsed.rightActiveTabId) ?? normalizeLegacyTabId(parsed.activeTabId);
  const activeTabId = preferredActive && dedupedTabIds.includes(preferredActive)
    ? preferredActive
    : (dedupedTabIds[0] ?? null);

  return {
    version: NODE_DETAILS_LAYOUT_VERSION,
    panes: [{ id: paneId, tabIds: dedupedTabIds, activeTabId }],
    activePaneId: paneId,
  };
}

export function parseLayoutFromStorage(raw: string): PersistedWorkspaceNodeDetailsLayoutV2 | null {
  if (getByteSize(raw) > MAX_PERSISTED_LAYOUT_BYTES) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedWorkspaceNodeDetailsLayoutV2 | LegacyPersistedLayoutV1;
    if (parsed?.version === NODE_DETAILS_LAYOUT_VERSION) {
      if (!Array.isArray(parsed?.panes)) return null;
      if (typeof parsed?.activePaneId !== 'string') return null;
      return parsed;
    }

    return migrateLegacyLayoutToV2(parsed);
  } catch {
    return null;
  }
}
