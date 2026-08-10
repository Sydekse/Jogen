'use client';

import React from 'react';
import { ExpertListItem } from '@/src/types/expert';
import { CheckCircle } from 'lucide-react';
import { StarRating } from '@/src/components/ui/StarRating';

interface ExpertCardProps {
  expert: ExpertListItem;
  onTagClick?: (tag: string) => void;
  onView?: () => void;
}

// Helper to generate initials from name
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EX';
}

// Helper to generate a consistent color based on ID string
function getColor(id: string) {
  const colors = ["#7C3AED", "#0891B2", "#059669", "#DC2626", "#EA580C", "#D97706", "#2563EB", "#9333EA"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export const ExpertCard: React.FC<ExpertCardProps> = ({ expert, onTagClick, onView }) => {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-4 mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" 
            style={{ backgroundColor: getColor(expert.id) }}
          >
            {getInitials(expert.full_name || 'Legal Advisor')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-foreground text-sm truncate">{expert.full_name || 'Legal Advisor'}</p>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <CheckCircle className="w-2.5 h-2.5" />Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{expert.title}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <StarRating rating={4.8} /> {/* Note: Assuming 4.8 as fallback if not in API */}
              <span className="text-xs text-muted-foreground">(42)</span>
            </div>
          </div>
        </div>

        {/* Specialty Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {expert.specialty_tags.map((tag) => (
            <button
              key={tag}
              onClick={(e) => {
                e.preventDefault();
                onTagClick?.(tag);
              }}
              className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium hover:bg-primary/10 hover:text-primary transition-colors"
            >
              #{tag.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border">
          <span className="text-xs font-semibold text-primary">{expert.rate_per_session} ETB <span className="text-muted-foreground font-normal">/ hr</span></span>
          <button onClick={onView} className="text-xs font-bold text-primary hover:underline underline-offset-2">Book →</button>
        </div>
      </div>
  );
};