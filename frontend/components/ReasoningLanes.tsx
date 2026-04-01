'use client';

import { Circle, User, Bot, Sparkles, Shield } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ApiModel,
  ApiPersonality,
  LaneId,
  LaneSettings,
  ReasoningMessage,
  LANE_CONFIGS,
} from '@/types/ui';
import { cn } from '@/lib/utils';

const laneIcons: Record<LaneId, React.ReactNode> = {
  orchestrator: <Sparkles className="size-3.5 text-muted-foreground" />,
  'debater-a': <Shield className="size-3.5 text-muted-foreground" />,
  'debater-b': <User className="size-3.5 text-muted-foreground" />,
  'debater-c': <Bot className="size-3.5 text-muted-foreground" />,
};

interface ReasoningLanesProps {
  messages: ReasoningMessage[];
  laneSettings: Record<LaneId, LaneSettings>;
  modelOptions: ApiModel[];
  personalityOptions: ApiPersonality[];
}

export default function ReasoningLanes({
  messages,
  laneSettings,
  modelOptions,
  personalityOptions,
}: ReasoningLanesProps) {
  const modelLabelByKey = useMemo(() => {
    return new Map(modelOptions.map((model) => [model.key, model.label]));
  }, [modelOptions]);

  const personalityLabelById = useMemo(() => {
    return new Map(personalityOptions.map((personality) => [personality.id, personality.name]));
  }, [personalityOptions]);

  return (
    <Card className="bg-popover/95 backdrop-blur-sm shadow-xl border border-border py-0">
      <CardContent className="p-0">
        <div className="flex flex-col">
          {LANE_CONFIGS.map((lane, index) => {
            const settings = laneSettings[lane.id];
            const laneMessages = messages.filter((m) => m.laneId === lane.id);
            const modelLabel = modelLabelByKey.get(settings.modelKey) ?? settings.modelKey;
            const personalityLabel =
              personalityLabelById.get(settings.personalityId) ?? settings.personalityId;

            const isSpeaking = laneMessages.some((message) => message.isStreaming);

            return (
              <div key={lane.id}>
                {index > 0 && <Separator />}
                <div className="flex items-center gap-3 px-3 py-2">
                  {/* Lane Info */}
                  <div className="flex-shrink-0 w-32 flex items-center gap-2">
                    <div className="size-6 flex items-center justify-center bg-muted">
                      {laneIcons[lane.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-foreground truncate">
                          {lane.label}
                        </span>
                        <Circle
                          className={cn(
                            'size-1.5 flex-shrink-0',
                            isSpeaking
                              ? 'text-foreground/60 fill-current animate-pulse'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-muted text-muted-foreground border-0">
                          {modelLabel || 'No model'}
                        </Badge>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-muted text-muted-foreground border-0">
                          {personalityLabel || 'No personality'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal scrolling stream */}
                  <ScrollArea className="flex-1">
                    <div className="flex gap-2 min-w-max">
                      {laneMessages.length > 0 ? (
                        laneMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              'px-3 py-1.5 text-xs whitespace-nowrap flex-shrink-0',
                              msg.isUser
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-foreground'
                            )}
                          >
                            {msg.content}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          Waiting for input...
                        </div>
                      )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
