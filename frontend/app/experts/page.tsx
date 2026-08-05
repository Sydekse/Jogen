'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/src/components/expert/EmptyState';
import { ExpertCard } from '@/src/components/expert/ExpertCard';
import { expertService } from '@/src/services/expertService';
import { ExpertListItem } from '@/src/types/expert';

export default function ExpertMarketplacePage() {
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

  const handleResetFilters = () => {
    setSearch('');
    setSelectedTag('');
    setMaxRate('');
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Ethiopian Regulatory Expert Directory
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Connect with verified legal, tax, and compliance advisors for fractionally billed micro-consulting.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by advisor name, title, or bio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
            />
          </div>

          {/* Price Range Filter */}
          <div className="w-full md:w-48">
            <input
              type="number"
              placeholder="Max Rate (ETB)"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
            />
          </div>
        </div>

        {/* Specialty Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedTag === ''
                ? 'bg-purple-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Specialties
          </button>
          {categoryTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTag === tag
                  ? 'bg-purple-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Directory Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-xl border border-gray-200 p-6 h-48 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        ) : experts.length === 0 ? (
          <EmptyState
            onResetFilters={handleResetFilters}
            onSelectTag={(tag) => setSelectedTag(tag)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experts.map((expert) => (
              <ExpertCard
                key={expert.id}
                expert={expert}
                onTagClick={(tag) => setSelectedTag(tag)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}