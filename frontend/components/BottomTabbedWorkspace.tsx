'use client';

import { KeyboardEvent as ReactKeyboardEvent, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  WorkspaceFixedTab,
  WorkspaceFixedTabId,
  WorkspaceNodeDetails,
  WorkspaceNodeDetailsLayoutV2,
  WorkspaceNodeTab,
} from '@/types/ui';
import {
  ApiModel,
  ApiPersonality,
  LaneConfig,
  LaneId,
  LaneSettings,
  ReasoningMessage,
  WorkspaceSplitEdge,
} from '@/types/ui';
import ConfigurationTabPanel from './ConfigurationTabPanel';
import PersonalityTabPanel from './PersonalityTabPanel';
import ReasoningLanes from './ReasoningLanes';
import NodeDetailsPaneGroup from './NodeDetailsPaneGroup';

interface BottomTabbedWorkspaceProps {
  leftTabs: WorkspaceFixedTab[];
  leftActiveTabId: WorkspaceFixedTabId;
  onLeftTabChange: (tabId: WorkspaceFixedTabId) => void;
  rightLayout: WorkspaceNodeDetailsLayoutV2;
  rightTabsById: Record<string, WorkspaceNodeTab>;
  onActivateRightPane: (paneId: string) => void;
  onActivateRightTab: (paneId: string, tabId: string) => void;
  onCloseRightTab: (paneId: string, tabId: string) => void;
  onCloseRightPane: (paneId: string) => void;
  onSplitRightTab: (targetPaneId: string, edge: WorkspaceSplitEdge, tabId: string) => void;
  onSplitActivePaneRight: () => void;
  onFocusRightPaneByIndex: (index: number) => void;
  rightPaneNotice?: string | null;
  laneConfigs: LaneConfig[];
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
  onPersonalityGenerated: (personality: ApiPersonality) => void;
  modelOptions: ApiModel[];
  personalityOptions: ApiPersonality[];
  messages: ReasoningMessage[];
  onAddAgent: () => void;
  onRemoveAgent: (laneId: LaneId) => void;
  canAddAgent: boolean;
  canRemoveAgent: boolean;
  nodeDetailsById: Record<string, WorkspaceNodeDetails>;
}

export default function BottomTabbedWorkspace({
  leftTabs,
  leftActiveTabId,
  onLeftTabChange,
  rightLayout,
  rightTabsById,
  onActivateRightPane,
  onActivateRightTab,
  onCloseRightTab,
  onCloseRightPane,
  onSplitRightTab,
  onSplitActivePaneRight,
  onFocusRightPaneByIndex,
  rightPaneNotice,
  laneConfigs,
  laneSettings,
  onLaneSettingsChange,
  onPersonalityGenerated,
  modelOptions,
  personalityOptions,
  messages,
  onAddAgent,
  onRemoveAgent,
  canAddAgent,
  canRemoveAgent,
  nodeDetailsById,
}: BottomTabbedWorkspaceProps) {
  const handleLeftKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, tabId: WorkspaceFixedTabId) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const currentIndex = leftTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex === -1) return;

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + leftTabs.length) % leftTabs.length;
    const nextTab = leftTabs[nextIndex];
    if (!nextTab) return;

    onLeftTabChange(nextTab.id);
    const trigger = document.getElementById(`workspace-left-tab-${nextTab.id}`);
    trigger?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        const isTypingTarget =
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          target.isContentEditable ||
          Boolean(target.closest('[contenteditable="true"], [role="textbox"]'));
        if (isTypingTarget) return;
      }

      const hasPrimaryModifier = event.metaKey || event.ctrlKey;
      if (!hasPrimaryModifier) return;
      if (event.altKey) return;

      if (event.key === '\\') {
        event.preventDefault();
        onSplitActivePaneRight();
        return;
      }

      if (event.key >= '1' && event.key <= '4') {
        const index = Number.parseInt(event.key, 10) - 1;
        if (Number.isNaN(index)) return;
        event.preventDefault();
        onFocusRightPaneByIndex(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFocusRightPaneByIndex, onSplitActivePaneRight]);

  return (
    <section className="grid h-full min-h-0 grid-cols-10 border-t border-border bg-popover/95 backdrop-blur-sm">
      <div className="col-span-3 flex min-h-0 flex-col border-r border-border">
        <div className="overflow-x-auto border-b border-border bg-muted/40" role="tablist" aria-label="Left workspace tabs">
          <div className="flex min-w-max items-end gap-px px-2 pt-1">
            {leftTabs.map((tab) => {
              const isActive = tab.id === leftActiveTabId;
              const panelId = `workspace-left-panel-${tab.id}`;

              return (
                <div
                  key={tab.id}
                  className={cn(
                    'group relative flex min-h-8 items-stretch rounded-none border border-b-0',
                    isActive
                      ? 'z-10 -mb-px border-border bg-background text-foreground shadow-sm'
                      : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <button
                    id={`workspace-left-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={isActive ? 0 : -1}
                    className="max-w-[240px] truncate px-2.5 py-1.5 text-left text-xs font-medium"
                    onClick={() => onLeftTabChange(tab.id)}
                    onKeyDown={(event) => handleLeftKeyDown(event, tab.id)}
                  >
                    {tab.title}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div
          id={`workspace-left-panel-${leftActiveTabId}`}
          role="tabpanel"
          aria-labelledby={`workspace-left-tab-${leftActiveTabId}`}
          className="min-h-0 flex-1"
        >
          {leftActiveTabId === 'configuration' ? (
            <ConfigurationTabPanel
              laneConfigs={laneConfigs}
              laneSettings={laneSettings}
              onLaneSettingsChange={onLaneSettingsChange}
              modelOptions={modelOptions}
              personalityOptions={personalityOptions}
              onAddAgent={onAddAgent}
              onRemoveAgent={onRemoveAgent}
              canAddAgent={canAddAgent}
              canRemoveAgent={canRemoveAgent}
            />
          ) : null}

          {leftActiveTabId === 'personality' ? (
            <PersonalityTabPanel
              modelOptions={modelOptions}
              onPersonalityGenerated={onPersonalityGenerated}
            />
          ) : null}

          {leftActiveTabId === 'lanes' ? (
            <div className="h-full overflow-auto p-4">
              <ReasoningLanes
                laneConfigs={laneConfigs}
                messages={messages}
                laneSettings={laneSettings}
                modelOptions={modelOptions}
                personalityOptions={personalityOptions}
              />
            </div>
          ) : null}
        </div>
        </div>

      <div className="col-span-7 flex min-h-0 flex-col">
        <NodeDetailsPaneGroup
          layout={rightLayout}
          tabsById={rightTabsById}
          detailsByTabId={nodeDetailsById}
          externalNotice={rightPaneNotice}
          onActivatePane={onActivateRightPane}
          onActivateTab={onActivateRightTab}
          onCloseTab={onCloseRightTab}
          onClosePane={onCloseRightPane}
          onSplitTab={onSplitRightTab}
        />
      </div>
    </section>
  );
}
