'use client';

import { Circle, User, Bot, Sparkles, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LaneId,
  LaneSettings,
  ReasoningMessage,
  LANE_CONFIGS,
  MODEL_OPTIONS,
  PERSONALITY_OPTIONS,
} from '@/types/ui';
import { mockReasoningTexts } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const laneIcons: Record<LaneId, React.ReactNode> = {
  orchestrator: <Sparkles className="size-3.5 text-primary" />,
  'debater-a': <Shield className="size-3.5 text-blue-400" />,
  'debater-b': <User className="size-3.5 text-green-400" />,
  'debater-c': <Bot className="size-3.5 text-yellow-400" />,
};

interface ReasoningLanesProps {
  messages: ReasoningMessage[];
  laneSettings: Record<LaneId, LaneSettings>;
}

export default function ReasoningLanes({ messages, laneSettings }: ReasoningLanesProps) {
  return (
    <Card className="bg-popover/95 backdrop-blur-sm shadow-xl border border-border py-0">
      <CardContent className="p-0">
        <div className="flex flex-col">
          {LANE_CONFIGS.map((lane, index) => {
            const settings = laneSettings[lane.id];
            const laneMessages = messages.filter((m) => m.laneId === lane.id);
            const modelLabel =
              MODEL_OPTIONS.find((m) => m.value === settings.model)?.label || settings.model;
            const personalityLabel =
              PERSONALITY_OPTIONS.find((p) => p.value === settings.personality)?.label ||
              settings.personality;

            const isSpeaking =
              laneMessages.length > 0 &&
              laneMessages[laneMessages.length - 1]?.isUser !== true;

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
                              ? 'text-green-400 fill-current animate-pulse'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-500/20 text-purple-400 border-0">
                          {modelLabel}
                        </Badge>
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-blue-500/20 text-blue-400 border-0">
                          {personalityLabel}
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
                          {mockReasoningTexts[lane.id] || 'Waiting for input...'}
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
