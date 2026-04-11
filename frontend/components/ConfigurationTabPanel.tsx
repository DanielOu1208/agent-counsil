'use client';

import { Sparkles, Shield, User, Bot, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import SearchableModelSelect from '@/components/SearchableModelSelect';
import {
  ApiModel,
  ApiPersonality,
  LaneConfig,
  LaneId,
  LaneSettings,
} from '@/types/ui';

const LANE_ICONS = [Shield, User, Bot, Sparkles, Shield, User, Bot, Sparkles];

function getLaneIcon(lane: LaneConfig, index: number) {
  if (lane.id === 'orchestrator') return <Sparkles className="size-4 text-muted-foreground" />;
  const Icon = LANE_ICONS[index % LANE_ICONS.length];
  return <Icon className="size-4 text-muted-foreground" />;
}

interface ConfigurationTabPanelProps {
  laneConfigs: LaneConfig[];
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
  modelOptions: ApiModel[];
  personalityOptions: ApiPersonality[];
  onAddAgent: () => void;
  onRemoveAgent: (laneId: LaneId) => void;
  canAddAgent: boolean;
  canRemoveAgent: boolean;
}

export default function ConfigurationTabPanel({
  laneConfigs,
  laneSettings,
  onLaneSettingsChange,
  modelOptions,
  personalityOptions,
  onAddAgent,
  onRemoveAgent,
  canAddAgent,
  canRemoveAgent,
}: ConfigurationTabPanelProps) {
  return (
    <div className="h-full min-h-0 p-2">
      <ScrollArea className="h-full rounded-none border border-border bg-card px-3 py-2">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          {laneConfigs.map((lane, index) => {
            const settings = laneSettings[lane.id];
            const modelValue = settings?.modelKey ?? '';
            const personalityValue = settings?.personalityId ?? '';
            const isDebater = lane.id !== 'orchestrator';

            return (
              <div key={lane.id} className="rounded-none border border-border bg-background p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex items-center justify-center">{getLaneIcon(lane, index)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium text-foreground">{lane.label}</h3>
                  </div>
                  {isDebater && canRemoveAgent && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveAgent(lane.id)}
                      title="Remove agent"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="mb-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Model</label>
                  <SearchableModelSelect
                    value={modelValue}
                    onValueChange={(value) =>
                      onLaneSettingsChange(lane.id, {
                        ...settings,
                        modelKey: value,
                      })
                    }
                    modelOptions={modelOptions}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Personality</label>
                  <Select
                    value={personalityValue}
                    onValueChange={(value) =>
                      onLaneSettingsChange(lane.id, {
                        ...settings,
                        personalityId: value,
                      })
                    }
                  >
                    <SelectTrigger className="w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {personalityOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}

          {canAddAgent && (
            <Button variant="outline" size="sm" className="mt-1 w-full text-xs gap-1" onClick={onAddAgent}>
              <Plus className="size-3" />
              Add Agent
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
