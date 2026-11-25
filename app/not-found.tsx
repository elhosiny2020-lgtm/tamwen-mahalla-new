import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#102A43] text-white p-6 text-center font-sans">
      <h1 className="text-4xl font-black mb-4 text-[#C6A15B]">٤٠٤ - الصفحة غير موجودة</h1>
      <p className="text-sm text-slate-300 mb-6">عذراً، الصفحة التي تبحث عنها غير موجودة في منظومة التموين والتجارة الداخلية.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#C6A15B] text-[#102A43] font-black rounded-xl hover:bg-white transition-colors text-xs"
      >
        العودة إلى لوحة التحكم الرئيسية
      </Link>
    </div>
  );
}
