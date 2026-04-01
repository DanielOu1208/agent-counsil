'use client';

import { ChevronDown, ChevronUp, Settings2, Sparkles, Shield, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ApiModel,
  ApiPersonality,
  LaneId,
  LaneSettings,
  LANE_CONFIGS,
} from '@/types/ui';

interface SettingsPanelProps {
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
  modelOptions: ApiModel[];
  personalityOptions: ApiPersonality[];
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export default function SettingsPanel({
  laneSettings,
  onLaneSettingsChange,
  modelOptions,
  personalityOptions,
  onDragStart,
  isDragging = false,
  isExpanded,
  onExpandedChange,
}: SettingsPanelProps) {
  const laneIcons: Record<LaneId, React.ReactNode> = {
    orchestrator: <Sparkles className="size-4 text-muted-foreground" />,
    'debater-a': <Shield className="size-4 text-muted-foreground" />,
    'debater-b': <User className="size-4 text-muted-foreground" />,
    'debater-c': <Bot className="size-4 text-muted-foreground" />,
  };

  return (
    <Card className="bg-popover/95 backdrop-blur-sm flex w-60 min-h-0 flex-col border border-border shadow-xl">
      <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
            onPointerDown={onDragStart}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              <CardTitle className="text-sm">Configuration</CardTitle>
            </div>
            <CardAction>
              <Button
                variant="ghost"
                size="icon-xs"
                className={isDragging ? 'pointer-events-none cursor-grabbing' : 'pointer-events-none'}
              >
                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </CardAction>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent className="min-h-0">
          <Separator />
          <CardContent className="flex min-h-0 flex-1 p-2">
            <ScrollArea className="h-full min-h-0 flex-1">
              <div className="flex flex-col gap-2">
                {LANE_CONFIGS.map((lane) => {
                  const settings = laneSettings[lane.id];
                  const modelValue = settings?.modelKey ?? '';
                  const personalityValue = settings?.personalityId ?? '';

                  return (
                    <div
                      key={lane.id}
                      className="p-2 bg-card border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center">
                          {laneIcons[lane.id]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-medium text-foreground truncate">
                            {lane.label}
                          </h3>
                        </div>
                      </div>

                      {/* Model Select */}
                      <div className="mb-1.5">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">
                          Model
                        </label>
                        <Select
                          value={modelValue}
                          onValueChange={(value) =>
                            onLaneSettingsChange(lane.id, {
                              ...settings,
                              modelKey: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-full" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {modelOptions.map((opt) => (
                                <SelectItem key={opt.key} value={opt.key}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Personality Select */}
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-0.5">
                          Personality
                        </label>
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
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
