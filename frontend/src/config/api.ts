/**
 * Centralized API and Server Base URLs for Jogen Frontend.
 * Externalized via Next.js environment variables for Production deployment.
 */
export const SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8000';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || `${SERVER_BASE_URL}/api/v1`;
