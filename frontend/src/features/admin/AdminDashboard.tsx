import React, { useState, useEffect } from 'react';
import { adminService } from '@/src/services/adminService';
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2, Phone, Mail, Award, DollarSign, CreditCard, FileText, ExternalLink } from 'lucide-react';
import { useModal } from "@/src/context/ModalContext";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'experts' | 'disputes'>('experts');
  const [experts, setExperts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useModal();

  const fetchExperts = async () => {
    try {
      const data = await adminService.getExperts('pending');
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
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchExperts(), fetchDisputes()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleVerifyExpert = async (id: string, verification_status: 'verified' | 'rejected') => {
    try {
      await adminService.verifyExpert(id, verification_status);
      showAlert(`Expert status updated to ${verification_status}`);
      fetchExperts();
    } catch {
      showAlert("Failed to update expert status.");
    }
  };

  const handleResolveDispute = async (id: string, action: 'full_refund' | 'split_50_50') => {
    try {
      await adminService.resolveDispute(id, 'resolved', action, 'Resolved via Admin Console');
      showAlert("Dispute resolved successfully.");
      fetchDisputes();
    } catch {
      showAlert("Failed to resolve dispute.");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Admin Compliance Console
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Review expert credentials and manage dispute resolutions.</p>
        </div>
      </div>

      <div className="flex gap-1 sm:gap-2 border-b border-border overflow-x-auto">
        <button
          onClick={() => setActiveTab('experts')}
          className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'experts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Expert Applications ({experts.filter(e => e.verification_status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 px-3 sm:px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'disputes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          Dispute Queue ({disputes.filter(d => d.status === 'open').length})
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'experts' ? (
        <div className="space-y-4">
          {experts.filter(e => e.verification_status === 'pending').length === 0 && (
            <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground">
              No pending expert applications.
            </div>
          )}
          {experts.map(expert => {
            const displayName = expert.user_full_name || expert.user?.full_name || 'Applicant';
            const phone = expert.user_phone || expert.user?.phone_number;
            const email = expert.user_email || expert.user?.email;

            return (
              <div key={expert.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-foreground text-xl">{displayName}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${expert.verification_status === 'verified' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                        expert.verification_status === 'pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                          'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}>
                      {expert.verification_status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-primary">{expert.title || 'Legal Advisory Expert'}</p>

                  {expert.bio && (
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                      {expert.bio}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                    {email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium text-foreground">{email}</span>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium text-foreground">{phone}</span>
                      </div>
                    )}
                    {expert.license_number && (
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        <span>License #: <strong className="text-foreground">{expert.license_number}</strong></span>
                      </div>
                    )}
                    {expert.rate_per_session && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                        <span>Rate: <strong className="text-foreground">{expert.rate_per_session} ETB / session</strong></span>
                      </div>
                    )}
                    {expert.wallet_provider && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        <span>Payout Wallet: <strong className="text-foreground">{expert.wallet_provider.toUpperCase()} ({expert.wallet_account_number})</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Document Attachment Link */}
                  {expert.license_document && (
                    <div className="pt-1">
                      <a
                        href={expert.license_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        <FileText className="w-4 h-4" /> View License Document <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Specialty Tags */}
                  {Array.isArray(expert.specialty_tags) && expert.specialty_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {expert.specialty_tags.map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-muted text-xs text-foreground font-medium border border-border">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {expert.verification_status === 'pending' && (
                  <div className="flex sm:flex-col gap-2 shrink-0 self-end md:self-start">
                    <button onClick={() => handleVerifyExpert(expert.id, 'verified')} className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-sm">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => handleVerifyExpert(expert.id, 'rejected')} className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dispute.status === 'open' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
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
