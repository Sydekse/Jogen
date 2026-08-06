import React from 'react';
import { ArrowLeft, Star, Clock, Shield, BadgeCheck } from 'lucide-react';

export function ExpertProfile({ expertId, onBack }: { expertId: string; onBack: () => void }) {
  // In a real implementation, we would fetch the specific expert by ID
  // For now, we'll mock the data based on the ID for presentation
  const expert = {
    id: expertId,
    name: "Dr. Elias Tadesse",
    title: "Senior Tax & Corporate Lawyer",
    rate: 1500,
    tags: ["tax", "startup_law", "commercial_code"],
    verified: true,
    bio: "Dr. Elias Tadesse has over 15 years of experience advising multinational corporations and local startups on Ethiopian tax laws and corporate structuring. Formerly a senior advisor at the Ministry of Revenues, he provides unparalleled insights into regulatory compliance.",
    rating: 4.9,
    reviews: 42
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </button>

      <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary text-3xl font-bold">
            {expert.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {expert.name}
                  {expert.verified && <BadgeCheck className="w-6 h-6 text-emerald-500" />}
                </h1>
                <p className="text-lg text-muted-foreground mt-1">{expert.title}</p>
              </div>
              <div className="text-left md:text-right">
                <div className="text-2xl font-bold text-primary">{expert.rate} ETB</div>
                <div className="text-sm text-muted-foreground">per session</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {expert.tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-accent text-foreground text-xs font-semibold rounded-full border border-border">
                  #{tag.replace('_', ' ')}
                </span>
              ))}
            </div>

            <p className="text-foreground leading-relaxed mb-8">
              {expert.bio}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm">
                <Clock className="w-5 h-5" />
                Book Consultation
              </button>
              <button className="px-6 py-3 rounded-xl border border-border hover:bg-accent transition-colors font-semibold text-foreground flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                View Credentials
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl p-8">
        <h3 className="font-bold text-xl text-foreground mb-6">Client Reviews</h3>
        <div className="text-center py-12">
           {/* Reviews hidden for now per user request */}
           <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
           <p className="text-muted-foreground font-medium">Reviews will be visible once the expert completes their first session.</p>
        </div>
      </div>
    </div>
  );
}
