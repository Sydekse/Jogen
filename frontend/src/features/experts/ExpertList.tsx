import React, { useCallback, useEffect, useState } from 'react';
import { ExpertCard } from '@/src/features/experts/components/ExpertCard';
import { expertService } from '@/src/services/expertService';
import { ExpertListItem } from '@/src/types/expert';
import { Search } from 'lucide-react';

export function ExpertList({ onViewExpert }: { onViewExpert?: (id: string) => void }) {
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const [maxRate, setMaxRate] = useState<string>('');

  const categoryTags = ['tax', 'startup_law', 'commercial_code', 'fx_law', 'ip_law'];

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await expertService.getExperts({
        search: search || undefined,
        tag: selectedTag || undefined,
        max_rate: maxRate || undefined,
      });
      setExperts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching directory.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedTag, maxRate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExperts();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchExperts]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verified Expert Network</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect with licensed Ethiopian lawyers, accountants, and regulatory consultants.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search experts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>
          <div className="relative w-32 md:w-36">
            <input
              type="number"
              placeholder="Max Rate"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0">
        <button
          onClick={() => setSelectedTag('')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedTag === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-foreground hover:bg-muted'
          }`}
        >
          All Specialties
        </button>
        {categoryTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedTag === tag
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }`}
          >
            #{tag.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-card border border-border rounded-2xl p-5 h-40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
          {error}
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">No experts found matching your criteria.</p>
          <button onClick={() => { setSearch(''); setSelectedTag(''); }} className="mt-4 text-sm font-semibold text-primary">
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {experts.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} onTagClick={(tag) => setSelectedTag(tag)} onView={() => onViewExpert?.(expert.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
