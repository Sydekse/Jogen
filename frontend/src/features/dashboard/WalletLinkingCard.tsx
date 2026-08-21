import React, { useState } from 'react';
import { Wallet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { paymentService } from '@/src/services/paymentService';

export function WalletLinkingCard({ walletProvider, walletAccountNumber }: { walletProvider?: string; walletAccountNumber?: string }) {
  const [provider, setProvider] = useState(walletProvider || 'telebirr');
  const [accountNumber, setAccountNumber] = useState(walletAccountNumber || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (walletProvider) setProvider(walletProvider);
    if (walletAccountNumber !== undefined) setAccountNumber(walletAccountNumber);
  }, [walletProvider, walletAccountNumber]);

  const handleLinkWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    try {
      const token = localStorage.getItem('access_token') || '';
      const data = await paymentService.linkWallet(provider, accountNumber, token);
      setStatus('success');
      setMessage(`Successfully linked ${data.account_name}'s wallet.`);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to link wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">Payout Settings</h3>
          <p className="text-xs text-muted-foreground">Link your wallet to receive earnings</p>
        </div>
      </div>

      <form onSubmit={handleLinkWallet} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="telebirr">Telebirr</option>
            <option value="cbe_birr">CBE Birr</option>
            <option value="mpesa">M-Pesa</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            Account Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="e.g. 0911234567"
            required
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {status === 'success' && (
          <div className="flex items-start gap-2 p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !accountNumber}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-sm font-bold rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link Wallet'}
        </button>
      </form>
    </div>
  );
}
