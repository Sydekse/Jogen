// Bypass Next.js rewrites and talk directly to Django on port 8000
const API_BASE_URL = "http://localhost:8000";

export async function sendOtpApi(phoneNumber: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone_number: phoneNumber }),
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      throw new Error(`Server returned a non-JSON response (Status: ${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.detail || "Failed to request verification code.");
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("API Error [requestOtp]:", error);
    return { success: false, message: error.message || "Network error. Please try again." };
  }
}

export async function verifyOtpApi(phoneNumber: string, otpCode: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone_number: phoneNumber, otp_code: otpCode }),
    });

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      throw new Error(`Server returned a non-JSON response (Status: ${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data.error || data.detail || "Invalid verification code.");
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("API Error [verifyOtp]:", error);
    return { success: false, message: error.message || "Network error. Please try again." };
  }
}