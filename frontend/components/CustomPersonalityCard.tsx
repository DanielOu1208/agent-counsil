'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { generatePersonality } from '@/lib/api';
import { ApiModel, ApiPersonality, LaneId, LANE_CONFIGS } from '@/types/ui';

interface CustomPersonalityCardProps {
  modelOptions: ApiModel[];
  onPersonalityGenerated: (personality: ApiPersonality, targetLaneId: LaneId) => void;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
}

export default function CustomPersonalityCard({
  modelOptions,
  onPersonalityGenerated,
  onDragStart,
  isDragging = false,
}: CustomPersonalityCardProps) {
  const [generationBrief, setGenerationBrief] = useState('');
  const [generatorModelKey, setGeneratorModelKey] = useState('');
  const [targetLaneId, setTargetLaneId] = useState<LaneId>('debater-a');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState('');

  useEffect(() => {
    if (!generatorModelKey && modelOptions.length > 0) {
      setGeneratorModelKey(modelOptions[0].key);
    }
  }, [generatorModelKey, modelOptions]);

  const handleGenerate = async () => {
    const brief = generationBrief.trim();
    if (!brief || !generatorModelKey) return;

    setIsGenerating(true);
    setGenerationError('');
    setGenerationSuccess('');

    try {
      const personality = await generatePersonality({
        brief,
        modelKey: generatorModelKey,
      });

      onPersonalityGenerated(personality, targetLaneId);
      setGenerationBrief('');
      setGenerationSuccess(
        `Saved "${personality.name}" and assigned it to ${LANE_CONFIGS.find((lane) => lane.id === targetLaneId)?.label ?? 'the selected lane'}.`,
      );
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate personality.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-popover/95 backdrop-blur-sm w-60 border border-border shadow-xl">
      <CardHeader
        className={isDragging ? 'py-3 cursor-grabbing' : 'py-3 cursor-grab'}
        onPointerDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <CardTitle className="text-sm">Generate Personality</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="p-2 bg-card border border-border">
          <p className="mb-2 text-[10px] text-muted-foreground">
            Describe the vibe briefly, pick a model, and save it as a reusable preset.
          </p>

          <div className="mb-1.5">
            <label className="block text-[10px] text-muted-foreground mb-0.5">
              Personality brief
            </label>
            <Textarea
              value={generationBrief}
              onChange={(event) => setGenerationBrief(event.target.value)}
              placeholder="Analytical futurist who argues with calm confidence and focuses on second-order effects."
              className="min-h-[88px] text-[11px]"
              disabled={isGenerating}
            />
          </div>

          <div className="mb-1.5">
            <label className="block text-[10px] text-muted-foreground mb-0.5">
              Generate with
            </label>
            <Select
              value={generatorModelKey}
              onValueChange={setGeneratorModelKey}
              disabled={isGenerating || modelOptions.length === 0}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Choose model" />
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

          <div className="mb-2">
            <label className="block text-[10px] text-muted-foreground mb-0.5">
              Save and assign to
            </label>
            <Select
              value={targetLaneId}
              onValueChange={(value) => setTargetLaneId(value as LaneId)}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {LANE_CONFIGS.map((lane) => (
                    <SelectItem key={lane.id} value={lane.id}>
                      {lane.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !generationBrief.trim() || !generatorModelKey}
          >
            {isGenerating ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              'Create personality'
            )}
          </Button>

          {generationError ? (
            <p className="mt-2 text-[10px] text-destructive">{generationError}</p>
          ) : null}

          {generationSuccess ? (
            <p className="mt-2 text-[10px] text-emerald-400">{generationSuccess}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
