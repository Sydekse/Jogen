import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, DollarSign, Users, ChevronRight, X } from 'lucide-react';
import { WalletLinkingCard } from './WalletLinkingCard';
import { bookingService } from '@/src/services/bookingService';
import { BookingDetail } from '@/src/types/booking';
import { useUser } from '@/src/context/UserContext';
import { useModal } from "@/src/context/ModalContext";
import { fetchWithAuth } from '@/src/lib/apiClient';
import { API_BASE_URL } from '@/src/config/api';

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

  const normalizeAvailability = (value: Record<string, string[]>): Record<string, string[]> => {
    const normalized: Record<string, string[]> = {};
    Object.entries(value || {}).forEach(([day, ranges]) => {
      const slots = new Set<string>();
      (ranges || []).forEach((range) => {
        const [start, end] = range.split('-');
        if (!start || !end) return;
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);
        let cursor = startHour * 60 + startMinute;
        const finish = endHour * 60 + endMinute;
        while (cursor < finish) {
          const next = Math.min(cursor + 30, finish);
          const hour = Math.floor(cursor / 60);
          const minute = cursor % 60;
          const nextHour = Math.floor(next / 60);
          const nextMinute = next % 60;
          slots.add(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}-${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`);
          cursor = next;
        }
      });
      normalized[day] = [...slots].sort();
    });
    return normalized;
  };

  useEffect(() => {
    if (userProfile?.expert_data) {
      const expert = userProfile.expert_data as any;
      if (expert.rate) setRate(expert.rate);
      if (expert.availability) setAvailability(normalizeAvailability(expert.availability));
      if (expert.specialty_tags) setSpecialtyTags(expert.specialty_tags);
    }
  }, [userProfile]);

  const handleUpdateConfig = async () => {
    setUpdatingConfig(true);
    const token = localStorage.getItem('access_token');
    try {
      const resProfile = await fetchWithAuth(`${API_BASE_URL}/experts/profile`, {
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
      
      const resAvailability = await fetchWithAuth(`${API_BASE_URL}/experts/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability: normalizeAvailability(availability) })
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

  const WEEK_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const TIME_SLOTS = Array.from({ length: 25 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const displayHour = hours % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  });

  const slotToRange = (slot: string) => {
    const [time, meridiem] = slot.split(' ');
    const [hourText, minuteText] = time.split(':');
    let hours = Number(hourText);
    const minutes = Number(minuteText);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const endMinutes = hours * 60 + minutes + 30;
    const endHours = Math.floor(endMinutes / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}-${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
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
    let totalEarnings = expertDataObj.wallet_balance ? parseFloat(expertDataObj.wallet_balance) : 0;
    let activeSessions = 0;
    let pendingRequests = 0;

    bookings.forEach(b => {
      const isUserExpert = userProfile?.phone_number && b.client_phone !== userProfile.phone_number;
      if (isUserExpert) {
        if (!expertDataObj.wallet_balance && b.status === 'completed') {
          const earned = b.settlement?.expert_payout 
            ? parseFloat(b.settlement.expert_payout) 
            : parseFloat(b.rate_snapshot || '0') * 0.9875;
          totalEarnings += earned;
        }
        if (b.status === 'escrowed' || b.status === 'pending_payment') {
          activeSessions++;
        }
        if (b.status === 'pending_payment') {
          pendingRequests++;
        }
      }
    });

    const formattedEarnings = Number(totalEarnings).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return [
      { title: "Total Earnings", value: `${formattedEarnings} ETB`, icon: DollarSign, trend: "+0%" },
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
                stat.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                stat.trend === '0%' || stat.trend === '+0' || stat.trend === '+0%' ? 'bg-muted text-muted-foreground' : 
                'bg-rose-500/10 text-rose-600 dark:text-rose-400'
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
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
        <WalletLinkingCard
          walletProvider={expertDataObj.wallet_provider}
          walletAccountNumber={expertDataObj.wallet_account_number}
        />
      </div>
    </div>
  );
}
