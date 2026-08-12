import React, { useState, useRef } from "react";
import { User, Briefcase, FileUp, Save, LogOut, Camera } from "lucide-react";

export function ProfileScreen({ isExpert, setIsExpert, onLogout, userProfile, onProfileUpdate }: {
  isExpert: boolean;
  setIsExpert: (v: boolean) => void;
  onLogout: () => void;
  userProfile?: Record<string, unknown> | null;
  onProfileUpdate?: ()=>void;
}) {
  const [formData, setFormData] = useState({
    name: (userProfile?.full_name as string) || "",
    email: (userProfile?.email as string) || "",
    phone: (userProfile?.phone_number as string)
  });

  // State to hold the selected file before upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // State to instantly preview the image the user selected
  const [previewUrl, setPreviewUrl] = useState<string | null>((userProfile?.profile_picture as string) || null);

  const [expertData, setExpertData] = useState({
    title: "",
    rate: "",
    bio: "",
  });

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection from the hidden input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create a temporary local URL to show the image instantly before saving
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("You are not logged in or your session expired.");
      setSaving(false);
      return;
    }

    // Must use FormData to send files alongside text
    const uploadData = new FormData();
    uploadData.append("full_name", formData.name);
    uploadData.append("email", formData.email);

    // Append the file if a new one was selected
    if (selectedFile) {
      uploadData.append("profile_picture", selectedFile);
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/profile/update/', {
        method: 'PATCH',
        headers: {
          // DO NOT include Content-Type. The browser sets it automatically for FormData.
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      if (response.ok) {
        alert("Profile saved successfully!");
        if (onProfileUpdate){
          onProfileUpdate();
        }
      } else {
        const errorData = await response.json().catch(() => null);
        if (errorData) {
          let errorMessage = "Validation Errors:\n";
          for (const [field, errors] of Object.entries(errorData)) {
            errorMessage += `- ${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}\n`;
          }
          alert(errorMessage);
        } else {
          alert(`Server Error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("A network error occurred. Is the Django server running?");
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterExpert = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setIsExpert(true);
    }, 1500);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal information and expert status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 text-center">

            {/* Interactive Profile Picture Upload Area */}
            <div
              className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-full h-full rounded-full bg-primary/10 overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors flex items-center justify-center">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-primary/50" />
                )}
              </div>

              {/* Camera Icon Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
            </div>

            <h2 className="font-bold text-foreground">{formData.name || "Set your name"}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isExpert ? "Verified Expert" : "Business Seeker"}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors font-semibold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-lg text-foreground mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    disabled
                    className="w-full px-4 py-2 bg-muted/50 border border-border rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {!isExpert ? (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              {/* Expert Registration UI remains unchanged */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Become an Expert</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4 leading-relaxed">
                    Are you a licensed Ethiopian lawyer, accountant, or regulatory consultant? Register as an expert to provide fractionally billed micro-consulting.
                  </p>

                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Professional Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Corporate Tax Lawyer"
                        value={expertData.title}
                        onChange={(e) => setExpertData({...expertData, title: e.target.value})}
                        className="w-full px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">Rate per Session (ETB)</label>
                        <input
                          type="number"
                          placeholder="e.g. 1500"
                          value={expertData.rate}
                          onChange={(e) => setExpertData({...expertData, rate: e.target.value})}
                          className="w-full px-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">License Document</label>
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border border-dashed rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                          <FileUp className="w-4 h-4" /> Upload PDF
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRegisterExpert}
                    disabled={saving || !expertData.title || !expertData.rate}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? "Submitting Application..." : "Submit Application"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-6">
              <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-400 mb-2">Expert Status Active</h3>
              <p className="text-sm text-emerald-700/80 dark:text-emerald-500/80">
                Your credentials have been verified. You can now receive consultation requests from business seekers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}