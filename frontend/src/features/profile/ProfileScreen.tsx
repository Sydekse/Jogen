import React, { useState, useRef, useEffect } from "react";
import { 
  User, Briefcase, FileUp, Save, LogOut, Camera, X, 
  CheckCircle2, Clock, Award
} from "lucide-react";
import { useModal } from "@/src/context/ModalContext";
import { useUser } from "@/src/context/UserContext";
import { API_BASE_URL } from "@/src/config/api";
import { DogEarCorner } from "@/src/components/ui/DogEarCorner";
import { SecurityWatermark } from "@/src/components/ui/SecurityWatermark";

export function ProfileScreen({ isExpert, onLogout, userProfile, onProfileUpdate }: {
  isExpert: boolean;
  setIsExpert: (v: boolean) => void;
  onLogout: () => void;
  userProfile?: Record<string, unknown> | null;
  onProfileUpdate?: () => void;
}) {
  const { lang } = useUser();
  const { showAlert } = useModal();

  // Basic Personal Info state
  const [formData, setFormData] = useState({
    name: (userProfile?.full_name as string) || "",
    email: (userProfile?.email as string) || "",
    phone: (userProfile?.phone_number as string) || "",
    bio: (userProfile?.expert_data as any)?.bio || "",
  });

  // Photo upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>((userProfile?.profile_picture as string) || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when userProfile arrives asynchronously
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        name: (userProfile.full_name as string) || prev.name || "",
        email: (userProfile.email as string) || prev.email || "",
        phone: (userProfile.phone_number as string) || prev.phone || "",
        bio: (userProfile.expert_data as any)?.bio || prev.bio || "",
      }));
      if (userProfile.profile_picture && !selectedFile) {
        setPreviewUrl(userProfile.profile_picture as string);
      }
    }
  }, [userProfile, selectedFile]);

  // Saving states
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingExpert, setSavingExpert] = useState(false);



  // Expert application form state
  const [expertData, setExpertData] = useState({
    title: "",
    rate: "",
    bio: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Status computation - robust detection of expert status
  const expertDataObj = userProfile?.expert_data as any;
  const expertStatus = (expertDataObj?.verification_status as string) || (userProfile?.verification_status as string) || 'unverified';
  
  // A user is a verified expert ONLY if their verification status is 'verified', or verified role
  const isVerifiedExpert = Boolean(
    expertStatus === 'verified' ||
    (isExpert && expertStatus !== 'pending' && expertStatus !== 'rejected' && expertStatus !== 'unverified') ||
    (userProfile?.is_expert && expertStatus !== 'pending' && expertStatus !== 'rejected' && expertStatus !== 'unverified') ||
    (userProfile?.role === 'expert' && expertStatus !== 'pending' && expertStatus !== 'rejected')
  );
  const isPending = !isVerifiedExpert && expertStatus === 'pending';
  const isRejected = !isVerifiedExpert && expertStatus === 'rejected';

  // Banners dismissal
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed_expert_banners');
      if (stored) {
        setDismissedBanners(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const dismissBanner = (status: string) => {
    const newDismissed = { ...dismissedBanners, [status]: true };
    setDismissedBanners(newDismissed);
    localStorage.setItem('dismissed_expert_banners', JSON.stringify(newDismissed));
  };


  // Handle image select
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Save personal info
  const handleSaveInfo = async () => {
    setSavingInfo(true);
    const token = localStorage.getItem("access_token");

    if (!token) {
      await showAlert("You are not logged in or your session expired.");
      setSavingInfo(false);
      return;
    }

    const uploadData = new FormData();
    uploadData.append("full_name", formData.name);
    uploadData.append("email", formData.email);

    if (formData.bio) {
      uploadData.append("bio", formData.bio);
    }

    if (selectedFile) {
      uploadData.append("profile_picture", selectedFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/update/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      if (response.ok) {
        await showAlert("Profile updated successfully!");
        if (onProfileUpdate) onProfileUpdate();
      } else {
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          let errorMessage = "Validation Errors:\n";
          for (const [field, errors] of Object.entries(errorData)) {
            errorMessage += `- ${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}\n`;
          }
          await showAlert(errorMessage);
        } else {
          await showAlert(`Server Error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      await showAlert("A network error occurred. Is the server running?");
    } finally {
      setSavingInfo(false);
    }
  };

  // Submit expert accreditation
  const handleRegisterExpert = async () => {
    setSavingExpert(true);
    const token = localStorage.getItem("access_token");

    if (!token) {
      await showAlert("You are not logged in or your session expired.");
      setSavingExpert(false);
      return;
    }

    const uploadData = new FormData();
    uploadData.append("title", expertData.title);
    uploadData.append("rate_per_session", expertData.rate);
    if (licenseFile) {
      uploadData.append("license_document", licenseFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/experts/profile`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      if (response.ok) {
        await showAlert("Expert application submitted successfully!");
        if (onProfileUpdate) onProfileUpdate();
      } else {
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          let errorMessage = "Validation Errors:\n";
          for (const [field, errors] of Object.entries(errorData)) {
            errorMessage += `- ${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}\n`;
          }
          await showAlert(errorMessage);
        } else {
          await showAlert(`Server Error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      await showAlert("A network error occurred. Is the server running?");
    } finally {
      setSavingExpert(false);
    }
  };

  // Membership date
  const memberDate = userProfile?.date_joined 
    ? new Date(userProfile.date_joined as string).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : "September 2026";

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Your Profile</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your personal information and account settings.
        </p>
      </div>


      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* ── Left Column: Executive Consultation ID Card ── */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 text-center relative overflow-hidden shadow-xs">
            {/* Authentic Brass Paperclip */}
            <div 
              className="absolute -top-3 right-6 w-4 h-10 border-2 border-amber-600/60 dark:border-amber-400/60 rounded-full z-20 pointer-events-none transform rotate-12 bg-transparent shadow-xs" 
              aria-hidden="true" 
            />
            <DogEarCorner size="md" />
            <SecurityWatermark className="w-36 h-36 -right-6 -bottom-6 text-foreground/[0.035] dark:text-foreground/[0.05]" />

            <div className="relative z-10">
              {/* Profile Picture with hover upload overlay */}
              <div
                className="relative w-28 h-28 mx-auto mb-4 group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Click to update photo"
              >
                <div className="w-full h-full rounded-full bg-primary/10 overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors flex items-center justify-center shadow-inner">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-primary/60" />
                  )}
                </div>

                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-7 h-7 text-white" />
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <h2 className="font-bold text-lg text-foreground">{formData.name || "Set your name"}</h2>
              
              {/* Verification Status Badge */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs">
                {isVerifiedExpert ? (
                  <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Verified Expert
                  </span>
                ) : isPending ? (
                  <span className="text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Application Pending
                  </span>
                ) : isRejected ? (
                  <span className="text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20 inline-flex items-center gap-1">
                    <X className="w-3.5 h-3.5 text-rose-500" />
                    Application Rejected
                  </span>
                ) : (
                  <span className="text-muted-foreground bg-muted/60 border-border/80 inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Business Seeker
                  </span>
                )}
              </div>

              {/* Consultation Membership Summary */}
              <div className="mt-6 pt-4 border-t border-border/60 text-left space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Member Since</span>
                  <span className="text-foreground font-medium">{memberDate}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Jurisdiction</span>
                  <span className="text-foreground font-medium">Ethiopia (Federal)</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Advisory Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active & In Good Standing</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors font-semibold text-sm desk-press shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* ── Right Column: Personal Information & Expert Status ── */}
        <div className="md:col-span-2 space-y-6">

          {/* Personal Information Card */}
          <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden shadow-xs">
            <DogEarCorner size="sm" />
            <h3 className="font-bold text-lg text-foreground mb-4">Personal Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-muted/60 border border-border focus:border-primary focus:bg-card rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground transition-colors"
                  placeholder="e.g. Abebe Bekele"
                />
              </div>

              {/* Phone / Email Contact */}
              <div className="space-y-4">
                {formData.phone ? (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      {lang === "am" ? "የተረጋገጠ ስልክ ቁጥር" : "Verified Phone Number"}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={formData.phone}
                        disabled
                        className="w-full px-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl text-sm text-muted-foreground cursor-not-allowed font-medium pr-10"
                      />
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                ) : formData.email ? (
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      {lang === "am" ? "የተረጋገጠ ኢሜይል አድራሻ" : "Verified Email Address"}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl text-sm text-muted-foreground cursor-not-allowed font-medium pr-10"
                      />
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                ) : null}
              </div>

              {isVerifiedExpert && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Professional Bio & Practice Focus
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe your legal qualifications, court admissions, and corporate advisory practice..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-muted/60 border border-border focus:border-primary focus:bg-card rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none transition-colors"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSaveInfo}
                  disabled={savingInfo}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 desk-press shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {savingInfo ? "Saving..." : "Save Personal Information"}
                </button>
              </div>
            </div>
          </div>



          {/* ── Expert Accreditation / Registration Section ── */}

          {/* Case A: Already Verified Expert -> Show Active Accreditation Card, NEVER show "Become an Expert" */}
          {isVerifiedExpert ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-6 relative overflow-hidden shadow-xs">
              <DogEarCorner size="sm" />
              
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold mb-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg">Expert Accreditation Active</h3>
              </div>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-500/80 leading-relaxed mb-4">
                Your credentials and Ethiopian legal license are verified. You are active on the verified directory, accepting fractional advisory bookings and receiving direct escrow payouts.
              </p>

              {/* Expert Practice Details Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/40 text-xs">
                <div className="bg-card/60 dark:bg-card/30 p-2.5 rounded-xl border border-emerald-200/40">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Title</span>
                  <span className="text-foreground font-bold truncate block mt-0.5">
                    {expertDataObj?.title || "Verified Legal Consultant"}
                  </span>
                </div>
                <div className="bg-card/60 dark:bg-card/30 p-2.5 rounded-xl border border-emerald-200/40">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Session Rate</span>
                  <span className="text-foreground font-bold block mt-0.5">
                    {expertDataObj?.rate_per_session ? `${expertDataObj.rate_per_session} ETB / 30m` : "1,500 ETB / 30m"}
                  </span>
                </div>
                <div className="bg-card/60 dark:bg-card/30 p-2.5 rounded-xl border border-emerald-200/40">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Directory Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Live & Booking
                  </span>
                </div>
              </div>
            </div>
          ) : isPending ? (
            /* Case B: Pending Review -> Show Pending Card, NEVER show "Become an Expert" */
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 relative overflow-hidden shadow-xs">
              <DogEarCorner size="sm" />
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold mb-2">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                <h3 className="text-lg">Application Under Review</h3>
              </div>
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80 leading-relaxed mb-4">
                Your expert application has been submitted and is currently being reviewed by our compliance team. You will be notified once verification completes.
              </p>

              {/* Progressive Checklist: Step 3 in progress */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1. Identity ✓</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>2. License ✓</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
                  <span>3. In Review</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                  <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[10px]">4</span>
                  <span>4. Directory</span>
                </div>
              </div>
            </div>
          ) : (
            /* Case C: Business Seeker / Not Yet Expert -> Show "Become an Expert" */
            <>
              {isRejected && !dismissedBanners['rejected'] && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 mb-6 relative overflow-hidden shadow-xs">
                  <DogEarCorner size="sm" />
                  <button 
                    onClick={() => dismissBanner('rejected')} 
                    className="absolute top-4 right-4 text-rose-700/50 hover:text-rose-700 dark:text-rose-500/50 hover:dark:text-rose-500 desk-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-lg text-rose-800 dark:text-rose-400 mb-1">Application Declined</h3>
                  <p className="text-sm text-rose-700/80 dark:text-rose-500/80 leading-relaxed">
                    Unfortunately, your recent application could not be verified with the provided documentation. Please check your credentials and feel free to apply again below.
                  </p>
                </div>
              )}
              
              {/* Become an Expert Application Card */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 relative overflow-hidden shadow-xs">
                <DogEarCorner size="sm" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">Become an Expert</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4 leading-relaxed">
                      Are you a licensed Ethiopian lawyer, chartered accountant, or regulatory consultant? Join the verified network to provide fractionally billed micro-consulting.
                    </p>

                    {/* Stepper overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-3.5 mb-5 bg-card/70 border border-border/80 rounded-xl text-xs">
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>1. Identity</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary font-semibold">
                        <span className="w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center shrink-0">2</span>
                        <span>2. License</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>3. Review</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center text-[10px] shrink-0">4</span>
                        <span>4. Listing</span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-5">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Professional Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Senior Corporate Tax Lawyer"
                          value={expertData.title}
                          onChange={(e) => setExpertData({ ...expertData, title: e.target.value })}
                          className="w-full px-4 py-2 bg-card border border-border focus:border-primary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Rate per Session (ETB)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 1500"
                            value={expertData.rate}
                            onChange={(e) => setExpertData({ ...expertData, rate: e.target.value })}
                            className="w-full px-4 py-2 bg-card border border-border focus:border-primary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            License Document
                          </label>
                          <input
                            type="file"
                            ref={licenseInputRef}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setLicenseFile(file);
                            }}
                            accept=".pdf,image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => licenseInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border border-dashed hover:border-primary/50 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors desk-press"
                          >
                            <FileUp className="w-4 h-4 text-primary" /> 
                            {licenseFile ? licenseFile.name : "Upload PDF or Image"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleRegisterExpert}
                      disabled={savingExpert || !expertData.title || !expertData.rate || !licenseFile}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 desk-press shadow-xs"
                    >
                      {savingExpert ? "Submitting Application..." : "Submit Application"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}