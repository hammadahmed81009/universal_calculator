import type { ReactNode } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e9ecef' }}>
        <strong>Universal Calculator</strong>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
