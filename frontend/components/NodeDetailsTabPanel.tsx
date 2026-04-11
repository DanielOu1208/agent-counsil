'use client';

import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MarkdownContent } from '@/components/MarkdownContent';
import { WorkspaceNodeDetails } from '@/types/ui';

interface NodeDetailsTabPanelProps {
  details?: WorkspaceNodeDetails;
}

export default function NodeDetailsTabPanel({ details }: NodeDetailsTabPanelProps) {
  if (!details) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-center">
          <MessageSquare className="size-6" />
          <p className="text-sm">Select a node on the graph to view details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col rounded-none border border-border bg-card">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <h3 className="truncate text-xs font-semibold">{details.title}</h3>
          <p className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{details.lane}</p>
        </div>
        <Separator />
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full px-3 py-2">
            <MarkdownContent>{details.content}</MarkdownContent>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
