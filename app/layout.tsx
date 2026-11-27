import type { Metadata } from 'next';
import { SystemPreferencesProvider } from '@/lib/user-preferences-store';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'منظومة الإدارة والرقابة التموينية الموحدة - محافظة الغربية',
  description: 'البوابة الحكومية الرقمية الموحدة لمديرية التموين والتجارة الداخلية بالغربية',
  openGraph: {
    title: 'منظومة الإدارة والرقابة التموينية الموحدة - محافظة الغربية',
    description: 'البوابة الحكومية الرقمية الموحدة لمديرية التموين والتجارة الداخلية بالغربية',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'منظومة الإدارة والرقابة التموينية الموحدة - محافظة الغربية',
    description: 'البوابة الحكومية الرقمية الموحدة لمديرية التموين والتجارة الداخلية بالغربية',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FAFBFD] text-[#102A43] font-sans text-[13px] font-bold antialiased min-h-screen selection:bg-[#102A43] selection:text-white">
        <SystemPreferencesProvider>{children}</SystemPreferencesProvider>
      </body>
    </html>
  );
}
