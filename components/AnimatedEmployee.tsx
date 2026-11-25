import React from 'react';

interface AnimatedEmployeeProps {
  status?: 'idle' | 'typing_user' | 'typing_password' | 'show_password' | 'success' | 'error';
}

export default function AnimatedEmployee({ status = 'idle' }: AnimatedEmployeeProps) {
  return (
    <div className="relative w-48 h-36 mx-auto mb-4 flex items-center justify-center select-none pointer-events-none">
      {/* Background glow & desk */}
      <div className="absolute bottom-0 w-44 h-16 bg-slate-200/80 backdrop-blur-sm rounded-t-xl border-t border-slate-300 shadow-inner flex items-center justify-center">
        {/* Laptop Base */}
        <div className="relative w-24 h-10 bg-slate-800 rounded-md shadow-md flex items-center justify-center border border-slate-700">
          {/* Laptop Screen */}
          <div className="absolute -top-10 w-20 h-12 bg-slate-900 rounded-t-lg border-2 border-slate-700 flex flex-col items-center justify-center p-1 overflow-hidden shadow-sm">
            <div className="w-full h-full bg-blue-950/80 rounded flex flex-col items-center justify-center relative">
              {status === 'success' ? (
                <div className="text-[10px] text-emerald-400 font-bold animate-pulse">تم الدخول بنجاح ✓</div>
              ) : status === 'error' ? (
                <div className="text-[10px] text-red-400 font-bold animate-bounce">خطأ في البيانات ✕</div>
              ) : (
                <div className="w-full space-y-1 p-1">
                  <div className="w-12 h-1 bg-blue-400/60 rounded animate-pulse"></div>
                  <div className="w-8 h-1 bg-amber-400/60 rounded"></div>
                  {status === 'typing_password' && (
                    <div className="text-[8px] text-amber-300 font-mono tracking-tighter">••••••••</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Character */}
      <div className={`relative w-28 h-28 flex flex-col items-center z-10 transition-transform duration-300 ${
        status === 'error' ? 'animate-wiggle' : ''
      }`}>
        {/* Head */}
        <div className={`relative w-14 h-14 bg-amber-100 rounded-full border-2 border-amber-300 shadow-md flex flex-col items-center justify-center transition-all duration-300 ${
          status === 'typing_user' ? '-translate-x-1' : status === 'typing_password' ? 'translate-x-1' : ''
        }`}>
          {/* Hair */}
          <div className="absolute -top-1 w-14 h-5 bg-slate-800 rounded-t-full"></div>
          
          {/* Glasses */}
          <div className="flex space-x-1.5 items-center mt-1 z-10">
            <div className="w-3.5 h-3.5 border-2 border-slate-800 rounded-sm bg-blue-100/30"></div>
            <div className="w-1 h-0.5 bg-slate-800"></div>
            <div className="w-3.5 h-3.5 border-2 border-slate-800 rounded-sm bg-blue-100/30"></div>
          </div>

          {/* Eyes */}
          {status === 'show_password' ? (
            // Covering eyes / looking away
            <div className="flex space-x-2 text-[10px] text-slate-700 font-bold mt-1">
              <span>🙈</span>
            </div>
          ) : (
            <div className="flex space-x-3 mt-1">
              <div className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-blink"></div>
              <div className="w-1.5 h-1.5 bg-slate-800 rounded-full animate-blink"></div>
            </div>
          )}

          {/* Smile / Mouth */}
          <div className={`mt-1 w-3 h-1.5 rounded-b-full bg-red-400 transition-all ${
            status === 'success' ? 'w-4 h-2 rounded-full bg-emerald-600' : ''
          }`}></div>
        </div>

        {/* Neck & Suit / Official uniform */}
        <div className="w-6 h-3 bg-amber-100 border-x border-amber-300"></div>
        <div className="relative w-20 h-12 bg-blue-900 rounded-t-xl border-t-2 border-gold flex flex-col items-center">
          {/* White shirt collar & tie */}
          <div className="w-4 h-4 bg-white clip-triangle mt-0.5 flex justify-center">
            <div className="w-1 h-4 bg-red-700 mt-1"></div>
          </div>
          
          {/* Hands typing on keyboard */}
          <div className="absolute -bottom-2 flex justify-between w-24 px-1">
            <div className={`w-4 h-4 bg-amber-100 rounded-full border border-amber-300 ${
              status === 'typing_user' || status === 'typing_password' ? 'animate-bounce' : ''
            }`}></div>
            <div className={`w-4 h-4 bg-amber-100 rounded-full border border-amber-300 ${
              status === 'typing_user' || status === 'typing_password' ? 'animate-bounce' : ''
            }`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
