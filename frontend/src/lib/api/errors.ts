import type { ApiError } from '../../types/api';

export function parseApiError(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'message' in error) return { status: 0, code: 'ERROR', message: String((error as Error).message) };
  return { status: 0, code: 'UNKNOWN_ERROR', message: 'An error occurred' };
}
export function isNetworkError(_e: ApiError): boolean { return false; }
export function isAuthenticationError(e: ApiError): boolean { return e.status === 401; }
export function getErrorSummary(_e: ApiError): string { return 'Error'; }
