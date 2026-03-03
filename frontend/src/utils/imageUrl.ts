export function getImageUrl(s3Key: string | null | undefined): string {
  if (!s3Key) return '';
  if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) return s3Key;
  return s3Key;
}
