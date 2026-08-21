import React, { useState, useEffect } from 'react';
import { adminService } from '@/src/services/adminService';
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useModal } from "@/src/context/ModalContext";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'experts' | 'disputes'>('experts');
  const [experts, setExperts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useModal();

  const fetchExperts = async () => {
    try {
      const token = localStorage.getItem('access_token') || '';
      // Fetch only pending requests as requested by the user
      const data = await adminService.getExperts(token, 'pending');
      setExperts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDisputes = async () => {
    try {
      const token = localStorage.getItem('access_token') || '';
      const data = await adminService.getDisputes(token);
      setDisputes(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'experts') {
      fetchExperts().finally(() => setLoading(false));
    } else {
      fetchDisputes().finally(() => setLoading(false));
    }
  }, [activeTab]);

  const handleVerifyExpert = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const token = localStorage.getItem('access_token') || '';
      await adminService.verifyExpert(id, status, token);
      await fetchExperts();
    } catch (e) {
      await showAlert("Failed to update expert status");
    }
  };

  const handleResolveDispute = async (id: string, action: string) => {
    try {
      const token = localStorage.getItem('access_token') || '';
      await adminService.resolveDispute(id, 'resolved', action, "Resolved via Admin Console", token);
      await fetchDisputes();
    } catch (e) {
      await showAlert("Failed to resolve dispute");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 h-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Admin Console
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform compliance, expert verification, and dispute resolution.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('experts')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'experts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Expert Verification
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'disputes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Dispute Resolution
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'experts' ? (
        <div className="space-y-4">
          {experts.filter(e => e.verification_status === 'pending').length === 0 && (
            <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground">
              No pending expert applications.
            </div>
          )}
          {experts.map(expert => (
            <div key={expert.id} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">{expert.user?.full_name || 'Unknown User'}</h3>
                <p className="text-sm text-muted-foreground">{expert.title}</p>
                <div className="mt-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    expert.verification_status === 'verified' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    expert.verification_status === 'pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                    'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {expert.verification_status.toUpperCase()}
                  </span>
                </div>
              </div>
              {expert.verification_status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleVerifyExpert(expert.id, 'rejected')} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button onClick={() => handleVerifyExpert(expert.id, 'verified')} className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.filter(d => d.status === 'open').length === 0 && (
            <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground">
              No open disputes.
            </div>
          )}
          {disputes.map(dispute => (
            <div key={dispute.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Dispute on Booking
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Client: {dispute.booking?.client?.full_name}</p>
                  <p className="text-sm text-muted-foreground">Expert: {dispute.booking?.expert?.user?.full_name}</p>
                  <p className="text-sm mt-2 font-medium">Reason: {dispute.reason}</p>
                  {dispute.description && <p className="text-sm text-muted-foreground mt-1 italic">&quot;{dispute.description}&quot;</p>}
                </div>
                <div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    dispute.status === 'open' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {dispute.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {dispute.status === 'open' && (
                <div className="border-t border-border pt-4 flex gap-3">
                  <button onClick={() => handleResolveDispute(dispute.id, 'full_refund')} className="flex-1 py-2 bg-muted hover:bg-accent text-foreground text-sm font-bold rounded-xl transition-colors">
                    Full Refund to Client
                  </button>
                  <button onClick={() => handleResolveDispute(dispute.id, 'split_50_50')} className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl transition-colors">
                    50/50 Split Escrow
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
