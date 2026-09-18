"use client";

import React, { useEffect, useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Lock,
  XCircle,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Info,
} from "lucide-react";
import { paymentService, UserWalletData, WalletTransactionItem } from "@/src/services/paymentService";
import { useModal } from "@/src/context/ModalContext";

export function WalletView() {
  const { showAlert } = useModal();
  const [wallet, setWallet] = useState<UserWalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"all" | "client" | "expert">("all");

  // Top-Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("500");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawProvider, setWithdrawProvider] = useState("telebirr");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchWalletData = async () => {
    try {
      setRefreshing(true);
      window.dispatchEvent(new Event("walletUpdated"));
      const [data] = await Promise.all([
        paymentService.getWallet(),
        new Promise(resolve => setTimeout(resolve, 600)),
      ]);
      setWallet(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
    if (typeof window !== "undefined" && window.location.search.includes("topup=success")) {
      window.history.replaceState({}, "", window.location.pathname);
      window.dispatchEvent(new Event("walletUpdated"));
    }
  }, []);

  const handleTopUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(topUpAmount);
    if (isNaN(numAmount) || numAmount < 10) {
      await showAlert("Minimum top-up amount is 10 ETB.");
      return;
    }
    setTopUpLoading(true);
    try {
      const returnUrl = typeof window !== "undefined" ? `${window.location.origin}/wallet?topup=success` : undefined;
      const res = await paymentService.initializeTopUp(numAmount, returnUrl);

      if (res.checkout_url && !res.mocked && !res.checkout_url.includes("test-payment")) {
        window.location.href = res.checkout_url;
      } else if (res.mocked || (res.checkout_url && res.checkout_url.includes("test-payment"))) {
        await showAlert(`Top-up of ${numAmount} ETB credited to your wallet balance!`);
        setShowTopUpModal(false);
        window.dispatchEvent(new Event("walletUpdated"));
        await fetchWalletData();
      } else if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        await showAlert("Top-up initiated successfully!");
        setShowTopUpModal(false);
        window.dispatchEvent(new Event("walletUpdated"));
        await fetchWalletData();
      }
    } catch (err: any) {
      await showAlert(err.message || "Failed to initialize top-up.");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(withdrawAmount);
    if (isNaN(numAmount) || numAmount < 10) {
      await showAlert("Minimum withdrawal amount is 10 ETB.");
      return;
    }

    if (wallet && parseFloat(wallet.available_balance) < numAmount) {
      await showAlert("Insufficient available balance for withdrawal.");
      return;
    }

    setWithdrawLoading(true);
    try {
      await paymentService.requestWithdrawal(numAmount, withdrawProvider, withdrawAccount);
      await showAlert(`Withdrawal of ${numAmount} ETB requested successfully!`);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      window.dispatchEvent(new Event("walletUpdated"));
      fetchWalletData();
    } catch (err: any) {
      await showAlert(err.message || "Failed to process withdrawal.");
    } finally {
      setWithdrawLoading(false);
    }
  };


  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "topup":
        return { label: "Top Up", icon: ArrowDownLeft, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
      case "expert_payout":
        return { label: "Earnings", icon: ArrowDownLeft, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
      case "booking_hold":
        return { label: "Hold", icon: Lock, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      case "booking_charge":
        return { label: "Payment", icon: ArrowUpRight, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
      case "booking_refund_release":
        return { label: "Refund", icon: CheckCircle2, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      case "withdrawal":
        return { label: "Withdrawal", icon: ArrowUpRight, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      default:
        return { label: type, icon: Clock, color: "bg-muted text-muted-foreground border-border" };
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <p className="text-sm font-semibold">Loading wallet statement...</p>
        </div>
      </div>
    );
  }

  const balance = parseFloat(wallet?.balance || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reserved = parseFloat(wallet?.reserved_balance || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const available = parseFloat(wallet?.available_balance || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-primary" />
            Wallet & Payments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your prepaid balance, top-up via mobile money, and track earnings & spending.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWalletData}
            disabled={refreshing}
            className="desk-press flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shadow-xs disabled:opacity-60"
            title="Refresh Wallet Statement & Balances"
          >
            <RefreshCw className={`w-4 h-4 text-primary transition-transform duration-300 ${refreshing ? "animate-spin" : ""}`} />
            <span className="text-xs font-semibold hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="desk-press flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted transition-all shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4 text-purple-500" />
            Cash Out / Withdraw
          </button>
          <button
            onClick={() => setShowTopUpModal(true)}
            className="desk-press flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Top Up Balance
          </button>
        </div>
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Available Balance */}
        <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Available for Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">{available} <span className="text-sm font-bold text-muted-foreground">ETB</span></h2>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" />
            Ready to spend for instant consultation reservations.
          </p>
        </div>

        {/* Card 2: Reserved Balance */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Reserved</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">{reserved} <span className="text-sm font-bold text-muted-foreground">ETB</span></h2>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Held for upcoming or active session windows.
          </p>
        </div>

        {/* Card 3: Total Balance */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Balance</span>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">{balance} <span className="text-sm font-bold text-muted-foreground">ETB</span></h2>
          <p className="text-xs text-muted-foreground mt-2">
            Includes available funds and active held reservations.
          </p>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Transaction History</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Complete record of your top-ups, earnings, holds, payments, and withdrawals.</p>
        </div>

        {/* Scrollable Ledger Table */}
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto border border-border/60 rounded-xl">
          <table className="w-full text-left text-sm relative">
            <thead className="sticky top-0 bg-card z-10 border-b border-border">
              <tr className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                <th className="py-3 px-4">Transaction Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {wallet?.transactions && wallet.transactions.length > 0 ? (
                wallet.transactions.map((tx: WalletTransactionItem) => {
                  const badge = getTransactionBadge(tx.transaction_type);
                  const Icon = badge.icon;
                  const isCredit = ["topup", "expert_payout", "booking_refund_release"].includes(tx.transaction_type);
                  const isDebit = ["booking_charge", "withdrawal"].includes(tx.transaction_type);

                  return (
                    <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {badge.label}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-bold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : isDebit ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                        {isCredit ? "+" : isDebit ? "-" : ""}{parseFloat(tx.amount).toFixed(2)} ETB
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {parseFloat(tx.running_balance).toFixed(2)} ETB
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-foreground">
                        {tx.reference}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                    No transaction activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOP-UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl relative space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Top Up Wallet Balance
              </h3>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">
                  Select Amount (ETB)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["200", "500", "1000", "2000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopUpAmount(preset)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${topUpAmount === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-foreground border-border hover:border-primary/40"
                        }`}
                    >
                      {preset} ETB
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Custom Amount (ETB)
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter amount in ETB"
                  required
                />
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                <span>Supports Telebirr, CBE Birr, M-Pesa & Ethiopian Bank Cards via Chapa gateway.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-95 disabled:opacity-50"
                >
                  {topUpLoading ? "Processing..." : "Proceed to Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl relative space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-purple-500" />
                Cash Out Balance
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Payout Method
                </label>
                <select
                  value={withdrawProvider}
                  onChange={(e) => setWithdrawProvider(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Account / Phone Number
                </label>
                <input
                  type="text"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. +251911..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">
                  Withdrawal Amount (ETB)
                </label>
                <input
                  type="number"
                  min="10"
                  max={wallet?.available_balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={`Max available: ${available} ETB`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {withdrawLoading ? "Processing Payout..." : "Request Cash Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
