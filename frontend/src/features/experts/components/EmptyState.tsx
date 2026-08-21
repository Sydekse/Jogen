'use client';

import React from 'react';

interface EmptyStateProps {
  onResetFilters: () => void;
  onSelectTag: (tag: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onResetFilters, onSelectTag }) => {
  const suggestedTags = ['tax', 'startup_law', 'commercial_code', 'fx_law'];

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-border shadow-sm my-6">
      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-700 text-2xl mb-4 font-bold">
        ?
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No verified experts found</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        We couldn&apos;t find any verified advisors matching your search criteria or price filter.
      </p>

      <div className="mb-6">
          <span className="text-xs font-medium text-muted-foreground block mb-2 uppercase tracking-wider">
          Suggested Specialties
        </span>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestedTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              className="px-3 py-1 bg-muted hover:bg-primary/10 text-foreground hover:text-primary text-xs font-medium rounded-full transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onResetFilters}
        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors shadow-sm"
      >
        Clear All Filters
      </button>
    </div>
  );
};