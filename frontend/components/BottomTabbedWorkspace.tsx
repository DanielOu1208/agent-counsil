'use client';

import { KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  WorkspaceFixedTab,
  WorkspaceFixedTabId,
  WorkspaceNodeDetails,
  WorkspaceNodeTab,
} from '@/types/ui';
import { LaneConfig, LaneId, LaneSettings, ApiModel, ApiPersonality, ReasoningMessage } from '@/types/ui';
import ConfigurationTabPanel from './ConfigurationTabPanel';
import PersonalityTabPanel from './PersonalityTabPanel';
import ReasoningLanes from './ReasoningLanes';
import NodeDetailsTabPanel from './NodeDetailsTabPanel';

interface BottomTabbedWorkspaceProps {
  leftTabs: WorkspaceFixedTab[];
  leftActiveTabId: WorkspaceFixedTabId;
  onLeftTabChange: (tabId: WorkspaceFixedTabId) => void;
  rightTabs: WorkspaceNodeTab[];
  rightActiveTabId: string | null;
  onRightTabChange: (tabId: string | null) => void;
  onCloseNodeTab: (tabId: string) => void;
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
  rightTabs,
  rightActiveTabId,
  onRightTabChange,
  onCloseNodeTab,
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
  const handleLeftKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: WorkspaceFixedTabId) => {
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

  const handleRightKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (rightTabs.length === 0) return;

    const currentIndex = rightTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex === -1) return;

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + rightTabs.length) % rightTabs.length;
    const nextTab = rightTabs[nextIndex];
    if (!nextTab) return;

    onRightTabChange(nextTab.id);
    const trigger = document.getElementById(`workspace-right-tab-${nextTab.id}`);
    trigger?.focus();
  };

  const activeNodeDetails = rightActiveTabId ? nodeDetailsById[rightActiveTabId] : undefined;

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
        <div className="overflow-x-auto border-b border-border bg-muted/40" role="tablist" aria-label="Node detail tabs">
          <div className="flex min-w-max items-end gap-px px-2 pt-1">
            {rightTabs.map((tab) => {
              const isActive = tab.id === rightActiveTabId;
              const panelId = `workspace-right-panel-${tab.id}`;

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
                    id={`workspace-right-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={panelId}
                    tabIndex={isActive ? 0 : -1}
                    className="max-w-[240px] truncate px-2.5 py-1.5 text-left text-xs font-medium"
                    onClick={() => onRightTabChange(tab.id)}
                    onKeyDown={(event) => handleRightKeyDown(event, tab.id)}
                  >
                    {tab.title}
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      'size-6 rounded-none text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      !isActive && 'opacity-70 group-hover:opacity-100',
                    )}
                    onClick={() => onCloseNodeTab(tab.id)}
                    aria-label={`Close ${tab.title} tab`}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div
          id={rightActiveTabId ? `workspace-right-panel-${rightActiveTabId}` : 'workspace-right-panel-empty'}
          role="tabpanel"
          aria-labelledby={rightActiveTabId ? `workspace-right-tab-${rightActiveTabId}` : undefined}
          aria-label={rightActiveTabId ? undefined : 'Node details'}
          className="min-h-0 flex-1"
        >
          <NodeDetailsTabPanel details={activeNodeDetails} />
        </div>
      </div>
    </section>
  );
}
