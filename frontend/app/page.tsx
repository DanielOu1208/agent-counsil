'use client';

import { useState, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import { LaneId, LaneSettings, ReasoningMessage, DebateStatus } from '@/types/ui';

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [status, setStatus] = useState<DebateStatus>('idle');
  const [messages, setMessages] = useState<ReasoningMessage[]>([]);
  const [laneSettings, setLaneSettings] = useState<Record<LaneId, LaneSettings>>({
    orchestrator: { model: 'gpt-4', personality: 'neutral' },
    'debater-a': { model: 'claude-3', personality: 'analytical' },
    'debater-b': { model: 'gemini-pro', personality: 'skeptical' },
    'debater-c': { model: 'llama-3', personality: 'creative' },
  });

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
  }, []);

  const handleLaneSettingsChange = useCallback((laneId: LaneId, settings: LaneSettings) => {
    setLaneSettings((prev) => ({
      ...prev,
      [laneId]: settings,
    }));
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    // Add user message to all lanes
    const userMessage: ReasoningMessage = {
      id: `user-${Date.now()}`,
      laneId: 'orchestrator',
      content,
      timestamp: new Date(),
      isUser: true,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Simulate responses from each lane (mock behavior)
    setTimeout(() => {
      const responses: ReasoningMessage[] = [
        {
          id: `resp-orch-${Date.now()}`,
          laneId: 'orchestrator',
          content: `Acknowledged: "${content.substring(0, 30)}..." - Routing to appropriate debaters.`,
          timestamp: new Date(),
        },
        {
          id: `resp-a-${Date.now()}`,
          laneId: 'debater-a',
          content: `Analyzing "${content.substring(0, 20)}..." from a logical perspective. The premise appears sound but requires further examination.`,
          timestamp: new Date(),
        },
        {
          id: `resp-b-${Date.now()}`,
          laneId: 'debater-b',
          content: `Challenging the core assumption. Alternative viewpoints suggest different conclusions.`,
          timestamp: new Date(),
        },
        {
          id: `resp-c-${Date.now()}`,
          laneId: 'debater-c',
          content: `Finding common ground between perspectives. A synthesis may emerge from the tension.`,
          timestamp: new Date(),
        },
      ];
      
      setMessages((prev) => [...prev, ...responses]);
    }, 1000);
  }, []);

  const handleStatusChange = useCallback((newStatus: DebateStatus) => {
    setStatus(newStatus);
  }, []);

  return (
    <AppShell
      selectedNode={selectedNode}
      onNodeSelect={handleNodeSelect}
      laneSettings={laneSettings}
      onLaneSettingsChange={handleLaneSettingsChange}
      messages={messages}
      onSendMessage={handleSendMessage}
      status={status}
      onStatusChange={handleStatusChange}
    />
  );
}