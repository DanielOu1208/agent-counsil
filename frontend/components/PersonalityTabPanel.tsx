'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SearchableModelSelect from '@/components/SearchableModelSelect';
import { generatePersonality } from '@/lib/api';
import { ApiModel, ApiPersonality } from '@/types/ui';

interface PersonalityTabPanelProps {
  modelOptions: ApiModel[];
  onPersonalityGenerated: (personality: ApiPersonality) => void;
}

export default function PersonalityTabPanel({
  modelOptions,
  onPersonalityGenerated,
}: PersonalityTabPanelProps) {
  const [generationBrief, setGenerationBrief] = useState('');
  const [generatorModelKey, setGeneratorModelKey] = useState('');
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

      onPersonalityGenerated(personality);
      setGenerationBrief('');
      setGenerationSuccess(`Saved "${personality.name}" as a reusable preset for all agents.`);
    } catch (error) {
      setGenerationError(
        error instanceof Error ? error.message : 'Failed to generate personality.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto w-full max-w-3xl rounded-none border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Generate Personality</h3>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          Describe the vibe briefly, pick a model, and save it as a reusable preset for any agent.
        </p>

        <div className="mb-2">
          <label className="mb-1 block text-xs text-muted-foreground">Personality brief</label>
          <Textarea
            value={generationBrief}
            onChange={(event) => setGenerationBrief(event.target.value)}
            placeholder="Analytical futurist who argues with calm confidence and focuses on second-order effects."
            className="min-h-[128px] text-sm"
            disabled={isGenerating}
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-muted-foreground">Generate with</label>
          <SearchableModelSelect
            value={generatorModelKey}
            onValueChange={setGeneratorModelKey}
            modelOptions={modelOptions}
            disabled={isGenerating || modelOptions.length === 0}
            placeholder="Choose model"
          />
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

        {generationError ? <p className="mt-2 text-xs text-destructive">{generationError}</p> : null}
        {generationSuccess ? (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{generationSuccess}</p>
        ) : null}
      </div>
    </div>
  );
}
