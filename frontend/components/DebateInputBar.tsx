'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface DebateInputBarProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export default function DebateInputBar({ onSendMessage, disabled = false }: DebateInputBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="bg-popover/95 backdrop-blur-sm shadow-xl border border-border py-3">
      <CardContent className="px-3 py-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? 'Debate completed' : 'Type your message or intervention...'}
              className="min-h-[38px] max-h-[80px] text-sm resize-none pr-10"
              rows={1}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className="absolute right-2 bottom-2"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </CardContent>
    </Card>
  );
}
