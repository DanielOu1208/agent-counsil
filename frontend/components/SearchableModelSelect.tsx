'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiModel } from '@/types/ui';

interface SearchableModelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  modelOptions: ApiModel[];
  disabled?: boolean;
  placeholder?: string;
}

const DEBOUNCE_MS = 300;
const MAX_RESULTS = 50;

export default function SearchableModelSelect({
  value,
  onValueChange,
  modelOptions,
  disabled = false,
  placeholder = 'Select model',
}: SearchableModelSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Find the selected model for display
  const selectedModel = modelOptions.find((m) => m.key === value);

  // Computed debouncing state
  const isDebouncing = searchQuery !== '' && searchQuery !== debouncedQuery;

  // Debounce search query using ref for timer
  const handleSearchChange = useCallback((newQuery: string) => {
    setSearchQuery(newQuery);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (newQuery === '') {
      setDebouncedQuery('');
      return;
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(newQuery);
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setDebouncedQuery('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the panel is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter models based on debounced query
  const filteredModels = modelOptions.filter((model) => {
    if (!debouncedQuery) return false; // Don't show results until user types
    const query = debouncedQuery.toLowerCase();
    return (
      model.label.toLowerCase().includes(query) ||
      model.key.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query)
    );
  });

  // Cap results
  const displayModels = filteredModels.slice(0, MAX_RESULTS);

  const handleTriggerClick = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
    }
  }, [disabled, isOpen]);

  const handleModelSelect = useCallback(
    (modelKey: string) => {
      onValueChange(modelKey);
      handleClose();
      triggerRef.current?.focus();
    },
    [onValueChange, handleClose]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearchChange(e.target.value);
    },
    [handleSearchChange]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        triggerRef.current?.focus();
      }
    },
    [handleClose]
  );

  // Determine what to show in the list area
  const renderListContent = () => {
    if (searchQuery === '') {
      return (
        <div className="px-2 py-6 text-center text-xs text-muted-foreground">
          Type to search models
        </div>
      );
    }

    if (isDebouncing) {
      return (
        <div className="px-2 py-6 text-center text-xs text-muted-foreground">Searching...</div>
      );
    }

    if (displayModels.length === 0) {
      return (
        <div className="px-2 py-6 text-center text-xs text-muted-foreground">
          No models found
        </div>
      );
    }

    return displayModels.map((model) => (
      <button
        key={model.key}
        type="button"
        className={cn(
          'relative flex w-full cursor-default items-center gap-2 rounded-none py-2 pr-8 pl-2 text-xs outline-none select-none',
          'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
          model.key === value && 'bg-accent/50'
        )}
        onClick={() => handleModelSelect(model.key)}
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          {model.key === value && <Check className="size-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate">{model.label}</div>
          <div className="truncate text-[10px] text-muted-foreground">{model.provider}</div>
        </div>
      </button>
    ));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleTriggerClick}
        className={cn(
          'flex w-full items-center justify-between gap-1.5 rounded-none border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs',
          'whitespace-nowrap transition-colors outline-none select-none',
          'focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-input/30 dark:hover:bg-input/50',
          isOpen && 'ring-1 ring-ring/50',
          !selectedModel && 'text-muted-foreground'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedModel?.label ?? placeholder}</span>
        <ChevronDown
          className={cn('pointer-events-none size-4 text-muted-foreground', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-none border border-border bg-popover shadow-md"
          role="listbox"
        >
          <div className="border-b border-border p-1.5">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              className="w-full rounded-none border border-input bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">{renderListContent()}</div>
        </div>
      )}
    </div>
  );
}