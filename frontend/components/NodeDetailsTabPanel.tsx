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
    <div className="h-full min-h-0 p-4">
      <div className="flex h-full min-h-0 flex-col rounded-none border border-border bg-card">
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold">{details.title}</h3>
          <p className="text-xs text-muted-foreground">{details.lane}</p>
        </div>
        <Separator />
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full px-4 py-3">
            <MarkdownContent>{details.content}</MarkdownContent>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
