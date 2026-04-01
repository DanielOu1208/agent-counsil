'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
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
import { LaneId, LaneSettings, LANE_CONFIGS, MODEL_OPTIONS, PERSONALITY_OPTIONS } from '@/types/ui';

interface SettingsPanelProps {
  laneSettings: Record<LaneId, LaneSettings>;
  onLaneSettingsChange: (laneId: LaneId, settings: LaneSettings) => void;
}

export default function SettingsPanel({
  laneSettings,
  onLaneSettingsChange,
}: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="bg-popover/95 backdrop-blur-sm w-60 max-h-[calc(100vh-120px)] border border-border shadow-xl">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              <CardTitle className="text-sm">Configuration</CardTitle>
            </div>
            <CardAction>
              <Button variant="ghost" size="icon-xs" className="pointer-events-none">
                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </CardAction>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <CardContent className="p-2">
            <ScrollArea className="max-h-[calc(100vh-200px)]">
              <div className="flex flex-col gap-2">
                {LANE_CONFIGS.map((lane) => {
                  const settings = laneSettings[lane.id];

                  return (
                    <div
                      key={lane.id}
                      className="p-2 bg-card border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">{lane.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-medium text-foreground truncate">
                            {lane.label}
                          </h3>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {lane.role}
                          </p>
                        </div>
                      </div>

                      {/* Model Select */}
                      <div className="mb-1.5">
                        <label className="block text-[10px] text-muted-foreground mb-0.5">
                          Model
                        </label>
                        <Select
                          value={settings.model}
                          onValueChange={(value) =>
                            onLaneSettingsChange(lane.id, {
                              ...settings,
                              model: value as LaneSettings['model'],
                            })
                          }
                        >
                          <SelectTrigger className="w-full" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {MODEL_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
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
                          value={settings.personality}
                          onValueChange={(value) =>
                            onLaneSettingsChange(lane.id, {
                              ...settings,
                              personality: value as LaneSettings['personality'],
                            })
                          }
                        >
                          <SelectTrigger className="w-full" size="sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {PERSONALITY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
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
