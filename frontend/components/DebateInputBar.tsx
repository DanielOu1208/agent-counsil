'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

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
    <div className="p-3 bg-[#0a0a0e] border-t border-[#1e1e24]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? "Debate completed" : "Type your message or intervention..."}
              className="w-full bg-[#111116] border border-[#1e1e24] rounded-lg px-3 py-2.5 pr-10 text-[#d4d4d8] placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-[#2a2a34] focus:ring-1 focus:ring-[#2a2a34] disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '42px', maxHeight: '100px' }}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className="absolute right-2 bottom-2 p-1.5 rounded-md bg-[#2a2a34] hover:bg-[#3a3a44] disabled:bg-[#1e1e24] disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}