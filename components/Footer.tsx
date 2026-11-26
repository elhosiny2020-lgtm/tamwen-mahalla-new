import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0B1F33] text-slate-200 py-5 border-t border-[#164E83]/50 text-[11px] font-bold print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-right">
          <p className="font-black text-white">جمهورية مصر العربية · محافظة الغربية</p>
          <p className="text-xs text-slate-300 font-extrabold mt-0.5">
            مديرية التموين والتجارة الداخلية — منظومة الإدارة والرقابة التموينية الموحدة
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>النظام مؤمن ومشفر بالكامل</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-[#C6A15B] font-black" dir="ltr">
            Designed &amp; Developed by Eng. Ahmed El-Hosseiny — Tel: 01004414038
          </span>
        </div>
      </div>
    </footer>
  );
}
