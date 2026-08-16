import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, DollarSign, Users, ChevronRight, X } from 'lucide-react';
import { WalletLinkingCard } from './WalletLinkingCard';
import { bookingService } from '@/src/services/bookingService';
import { BookingDetail } from '@/src/types/booking';
import { useUser } from '@/src/context/UserContext';
import { useModal } from "@/src/context/ModalContext";
import { fetchWithAuth } from '@/src/lib/apiClient';

export function ExpertDashboard() {
  const { userProfile, refreshProfile } = useUser();
  const { showAlert } = useModal();
  const expertDataObj = userProfile?.expert_data as any || {};
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const [rate, setRate] = useState(expertDataObj.rate_per_session || '');
  const [availability, setAvailability] = useState<Record<string, string[]>>(expertDataObj.availability || {});
  const [specialtyTags, setSpecialtyTags] = useState<string[]>(expertDataObj.specialty_tags || []);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  useEffect(() => {
    if (userProfile?.expert_data) {
      const expert = userProfile.expert_data as any;
      if (expert.rate) setRate(expert.rate);
      if (expert.availability) setAvailability(expert.availability);
      if (expert.specialty_tags) setSpecialtyTags(expert.specialty_tags);
    }
  }, [userProfile]);

  const handleUpdateConfig = async () => {
    setUpdatingConfig(true);
    const token = localStorage.getItem('access_token');
    try {
      const resProfile = await fetchWithAuth('http://localhost:8000/api/v1/experts/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rate_per_session: rate ? parseFloat(rate) : 0,
          specialty_tags: specialtyTags
        })
      });
      
      const resAvailability = await fetchWithAuth('http://localhost:8000/api/v1/experts/availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability })
      });

      if (resProfile.ok && resAvailability.ok) {
        await showAlert('Configuration saved!');
        if (refreshProfile) refreshProfile();
      } else {
        await showAlert('Failed to save config.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingConfig(false);
    }
  };

  // toggleDay is no longer needed since we handle it directly in the UI map

  const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const TIME_SLOTS = ["09:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"];

  const slotToRange = (slot: string) => {
    const map: Record<string, string> = {
      "09:00 AM": "09:00-11:00",
      "11:00 AM": "11:00-13:00",
      "01:00 PM": "13:00-15:00",
      "03:00 PM": "15:00-17:00",
      "05:00 PM": "17:00-19:00",
    };
    return map[slot] || "09:00-11:00";
  };

  const rangeToSlot = (range: string) => {
    const reverseMap: Record<string, string> = {
      "09:00-11:00": "09:00 AM",
      "11:00-13:00": "11:00 AM",
      "13:00-15:00": "01:00 PM",
      "15:00-17:00": "03:00 PM",
      "17:00-19:00": "05:00 PM",
    };
    return reverseMap[range];
  };

  const toggleSlot = (day: string, slot: string) => {
    setAvailability(prev => {
      const next = { ...prev };
      const range = slotToRange(slot);
      if (!next[day]) next[day] = [];
      
      if (next[day].includes(range)) {
        next[day] = next[day].filter(r => r !== range);
      } else {
        next[day] = [...next[day], range];
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await bookingService.getBookings(token);
        // data will include all bookings where user is client or expert.
        // But since this is the expert dashboard, we assume they are the expert here.
        // We'll just process the data as is.
        setBookings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const calculateStats = () => {
    let totalEarnings = 0;
    let activeSessions = 0;
    let pendingRequests = 0;

    bookings.forEach(b => {
      if (b.status === 'completed') {
        totalEarnings += parseFloat(b.rate_snapshot || '0');
      }
      if (b.status === 'escrowed' || b.status === 'pending_payment') {
        activeSessions++;
      }
      if (b.status === 'pending_payment') {
        pendingRequests++;
      }
    });

    return [
      { title: "Total Earnings", value: `${totalEarnings.toLocaleString()} ETB`, icon: DollarSign, trend: "+0%" },
      { title: "Active Sessions", value: activeSessions.toString(), icon: Users, trend: "+0" },
      { title: "Pending Requests", value: pendingRequests.toString(), icon: Clock, trend: "+0" },
      { title: "Profile Views", value: "N/A", icon: BarChart3, trend: "0%" },
    ];
  };

  const stats = calculateStats();
  
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto flex justify-center items-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

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
                stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 
                stat.trend === '0%' || stat.trend === '+0' || stat.trend === '+0%' ? 'bg-muted text-muted-foreground' : 
                'bg-rose-500/10 text-rose-600'
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
            {bookings.length > 0 ? bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-foreground">
                    {booking.client_phone?.substring(0, 2) || "U"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Client {booking.client_phone || 'User'}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{booking.status} • {booking.channel}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            )) : (
              <p className="text-sm text-muted-foreground py-4">No recent requests found.</p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-lg text-foreground mb-6">Expert Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Price per Hour (ETB)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                placeholder="e.g. 1500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Specialties</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {specialtyTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    {tag}
                    <button onClick={() => setSpecialtyTags(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-primary/70"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type and press Enter to add..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !specialtyTags.includes(val)) {
                      setSpecialtyTags(prev => [...prev, val]);
                    }
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
              <div className="flex items-center justify-between mb-5">
                <label className="block text-sm font-semibold text-foreground">Weekly Availability</label>
                <button className="text-xs font-semibold text-primary hover:opacity-70">
                  + Add Exception
                </button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {WEEK_DAYS.map((day) => (
                  <div key={day}>
                    <p className="text-xs font-bold text-center text-muted-foreground mb-2 uppercase tracking-wide">
                      {day}
                    </p>
                    <div className="space-y-1.5">
                      {TIME_SLOTS.map((slot) => {
                        const range = slotToRange(slot);
                        const isActive = availability[day]?.includes(range);
                        return (
                          <div 
                            key={slot} 
                            onClick={() => toggleSlot(day, slot)}
                            className={`py-1.5 px-1 rounded-lg text-center text-xs font-semibold cursor-pointer transition-colors ${
                              isActive 
                                ? "bg-primary text-primary-foreground border-transparent shadow-sm" 
                                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent"
                            }`}
                          >
                            {slot.replace(" AM", "a").replace(" PM", "p")}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            <button 
              onClick={handleUpdateConfig}
              disabled={updatingConfig}
              className="w-full mt-2 text-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {updatingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* New Wallet Linking Card */}
        <WalletLinkingCard />
      </div>
    </div>
  );
}
