'use client';

import React from 'react';
import Link from 'next/link';
import { ExpertListItem } from '@/src/types/expert';

interface ExpertCardProps {
  expert: ExpertListItem;
  onTagClick: (tag: string) => void;
}

export const ExpertCard: React.FC<ExpertCardProps> = ({ expert, onTagClick }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{expert.full_name || 'Legal Advisor'}</h3>
            <p className="text-sm font-medium text-purple-900">{expert.title}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Verified
          </span>
        </div>

        {/* Specialty Tags */}
        <div className="flex flex-wrap gap-1.5 my-4">
          {expert.specialty_tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="px-2.5 py-0.5 bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-800 text-xs font-medium rounded-md transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Pricing & CTA */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-2">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wider font-medium block">
            Rate / Session
          </span>
          <span className="text-base font-bold text-gray-900">
            {parseFloat(expert.rate_per_session).toLocaleString()} ETB
          </span>
        </div>

        <Link
          href={`/experts/${expert.id}`}
          className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Book Advisory
        </Link>
      </div>
    </div>
  );
};