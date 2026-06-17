import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: "Stellicast – Be the Star of Your Own Show",
  description: "A work-in-progress, open-source, privacy‑first video platform that doesn't sell user data, doesn't bombard you with ads, listens to user feedback, and promotes non-corporate, human-made content.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
