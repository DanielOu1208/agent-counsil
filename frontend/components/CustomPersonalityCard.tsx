'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, LoaderCircle, Sparkles } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { generatePersonality } from '@/lib/api';
import { ApiModel, ApiPersonality } from '@/types/ui';

interface CustomPersonalityCardProps {
  modelOptions: ApiModel[];
  onPersonalityGenerated: (personality: ApiPersonality) => void;
}

export default function CustomPersonalityCard({
  modelOptions,
  onPersonalityGenerated,
}: CustomPersonalityCardProps) {
  const [generationBrief, setGenerationBrief] = useState('');
  const [generatorModelKey, setGeneratorModelKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

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

      onPersonalityGenerated(personality);
      setGenerationBrief('');
      setGenerationSuccess(
        `Saved "${personality.name}" as a reusable preset for all agents.`,
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
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-sm">Generate Personality</CardTitle>
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
            <div className="p-2 bg-card border border-border">
              <p className="mb-2 text-[10px] text-muted-foreground">
                Describe the vibe briefly, pick a model, and save it as a reusable preset for any
                agent.
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
                  'Create & save personality'
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
