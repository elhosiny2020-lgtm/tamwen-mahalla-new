import type { Metadata } from 'next';
import { Cairo, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css'; // Global styles

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-arabic',
  display: 'swap',
});

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
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${ibmPlexArabic.variable}`}>
      <body className="bg-[#FAFBFD] text-[#102A43] font-sans text-[13px] font-bold antialiased min-h-screen selection:bg-[#102A43] selection:text-white">
        {children}
      </body>
    </html>
  );
}
