import React from 'react';
import { BarChart3, Clock, DollarSign, Users, ChevronRight } from 'lucide-react';

export function ExpertDashboard() {
  const stats = [
    { title: "Total Earnings", value: "24,500 ETB", icon: DollarSign, trend: "+12%" },
    { title: "Active Sessions", value: "8", icon: Users, trend: "+2" },
    { title: "Pending Requests", value: "3", icon: Clock, trend: "-1" },
    { title: "Profile Views", value: "142", icon: BarChart3, trend: "+24%" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Expert Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your consulting practice on Jogen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-foreground">Recent Requests</h3>
            <button className="text-sm font-semibold text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-foreground">
                    BS
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Business Seeker {i}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Corporate Tax Structuring</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-lg text-foreground mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-accent transition-colors text-sm font-semibold text-foreground border border-transparent hover:border-border">
              Manage Availability
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-accent transition-colors text-sm font-semibold text-foreground border border-transparent hover:border-border">
              Update Profile
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-accent transition-colors text-sm font-semibold text-foreground border border-transparent hover:border-border">
              Withdraw Earnings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
