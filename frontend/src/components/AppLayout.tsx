import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
