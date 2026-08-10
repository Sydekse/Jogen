'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { expertService } from '@/src/services/expertService';

const AVAILABLE_SPECIALTIES = [
  'tax',
  'startup_law',
  'commercial_code',
  'fx_law',
  'ip_law',
  'labor_law',
  'audit',
  'corporate',
];

export default function ExpertOnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ratePerSession, setRatePerSession] = useState<string>('500');
  const [walletProvider, setWalletProvider] = useState<'telebirr' | 'cbe_birr' | 'mpesa'>('telebirr');
  const [walletAccountNumber, setWalletAccountNumber] = useState<string>('');

  // Uploaded Files State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') || '' : '';

      await expertService.updateProfile(
        {
          title,
          bio,
          license_number: licenseNumber,
          specialty_tags: selectedTags,
          rate_per_session: ratePerSession,
          wallet_provider: walletProvider,
          wallet_account_number: walletAccountNumber,
        },
        token
      );

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred submitting profile.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 py-12 px-4 flex justify-center items-center">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Application Submitted!</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Your profile and credentials have been received. Our Compliance Admin team will review your application shortly.
          </p>
          <div className="pt-4 space-y-2">
            <Link
              href="/experts/availability"
              className="block w-full py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Configure Schedule Hours
            </Link>
            <Link
              href="/experts"
              className="block w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition-colors"
            >
              Browse Directory
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Expert Onboarding & Verification
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Submit your professional credentials to offer fractionally billed micro-consulting on Jogen.
          </p>
        </div>

        {/* Multi-step Progress Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          {[
            { num: 1, label: 'Bio & Specialties' },
            { num: 2, label: 'Rates & Wallet' },
            { num: 3, label: 'Credential Upload' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s.num
                    ? 'bg-purple-900 text-white'
                    : step > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  step === s.num ? 'text-purple-900' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        {/* Wizard Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* STEP 1: Bio & Specialties */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">
                Step 1: Professional Bio & Specialty Focus
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Professional Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Tax Consultant & Corporate Attorney"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Professional License Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ETH-LAW-2024-8841"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Biography & Advisory Background
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your legal/tax experience, past cases, and regulatory background..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Select Your Specialty Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SPECIALTIES.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-purple-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        #{tag} {isSelected ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!title || !bio || !licenseNumber || selectedTags.length === 0}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-purple-900 hover:bg-purple-800 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Continue to Rates & Wallet →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Rates & Wallet */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">
                Step 2: Session Rates & Payout Account
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Rate Per 30-Min Session (ETB)
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  value={ratePerSession}
                  onChange={(e) => setRatePerSession(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Payout Wallet Provider
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'telebirr', label: 'Telebirr' },
                    { key: 'cbe_birr', label: 'CBE Birr' },
                    { key: 'mpesa', label: 'M-Pesa' },
                  ].map((w) => (
                    <button
                      type="button"
                      key={w.key}
                      onClick={() => setWalletProvider(w.key as 'telebirr' | 'cbe_birr' | 'mpesa')}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-colors ${
                        walletProvider === w.key
                          ? 'border-purple-900 bg-purple-50 text-purple-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Wallet Phone / Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0911223344"
                  value={walletAccountNumber}
                  onChange={(e) => setWalletAccountNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-900 focus:outline-none text-gray-900"
                />
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={!ratePerSession || !walletAccountNumber}
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-purple-900 hover:bg-purple-800 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  Continue to Credentials →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Credential Upload */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b pb-2">
                Step 3: Upload Professional License & Certifications
              </h2>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Upload PDF or Image Proof (Bar License, Degree, Tax Cert)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition-colors bg-gray-50">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                    <div className="text-3xl text-purple-900 font-bold">📄</div>
                    <p className="text-xs font-bold text-gray-700">
                      Click to upload or drag & drop files
                    </p>
                    <p className="text-xs text-gray-400">PDF, PNG, JPG up to 10MB</p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Selected Documents:
                    </p>
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-purple-50 rounded-lg text-xs border border-purple-100 text-purple-950 font-medium"
                      >
                        <span>{file.name}</span>
                        <span className="text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-purple-900 hover:bg-purple-800 disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Profile for Verification'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}