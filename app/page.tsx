'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginForm from '@/components/LoginForm';
import SessionExpiryBanner from '@/components/SessionExpiryBanner';

const RegisterWizard = dynamic(() => import('@/components/RegisterWizard'), { ssr: false });
const BranchSelection = dynamic(() => import('@/components/BranchSelection'), { ssr: false });
const UserPortal = dynamic(() => import('@/components/UserPortal'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#102A43]">
      <div className="w-10 h-10 rounded-full border-4 border-[#102A43]/20 border-t-[#102A43] animate-spin" />
      <p className="text-xs font-black">جارٍ تحميل بوابة المنظومة...</p>
    </div>
  ),
});
import {
  INITIAL_BRANCHES,
  getCurrentSessionUser,
  setCurrentSessionUser,
  getStoredBranches,
  getSelectedBranchSession,
  setSelectedBranchSession,
} from '@/lib/mock-db';
import { Branch, User } from '@/types';
import { useSystemPreferences } from '@/lib/user-preferences-store';
import {
  useSessionExpiryMonitor,
  clearClientSessionExpiryTimestamp,
} from '@/hooks/useSessionExpiryMonitor';

export default function Home() {
  const { setActiveUserId, t } = useSystemPreferences();
  const [hydrated, setHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    const hydrateSession = () => {
      const sessionUser = getCurrentSessionUser();
      setCurrentUser(sessionUser);
      setActiveUserId(sessionUser?.id || 'guest');
      setSelectedBranchId(getSelectedBranchSession());
      setBranches(getStoredBranches());
      setHydrated(true);
    };
    const frameId = requestAnimationFrame(hydrateSession);
    return () => cancelAnimationFrame(frameId);
  }, [setActiveUserId]);

  const handleLogout = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearClientSessionExpiryTimestamp();
    setCurrentSessionUser(null);
    setSelectedBranchSession(null);
    setCurrentUser(null);
    setSelectedBranchId(null);
    setActiveUserId('guest');
  }, [setActiveUserId]);

  const sessionExpiry = useSessionExpiryMonitor({
    enabled: Boolean(currentUser),
    warningThresholdSeconds: 300,
    onExpire: handleLogout,
  });

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
    setBranches(getStoredBranches());
    if (user.branchIds.length === 1 && user.role !== 'super_admin' && user.role !== 'admin') {
      setSelectedBranchId(user.primaryBranchId);
      setSelectedBranchSession(user.primaryBranchId);
    } else {
      setSelectedBranchId(null);
      setSelectedBranchSession(null);
    }
  };

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedBranchSession(branchId);
    if (currentUser) {
      const updated = { ...currentUser, primaryBranchId: branchId };
      setCurrentUser(updated);
      setCurrentSessionUser(updated);
    }
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#253B4F] font-sans text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#94C9CE]/30 border-t-[#94C9CE] animate-spin" />
          <p className="text-sm font-bold text-[#94C9CE]">{t('loadingSystem')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-shell min-h-screen flex flex-col font-sans selection:bg-[#253B4F] selection:text-white transition-colors"
      style={{ backgroundColor: 'var(--app-canvas-bg, #BDC9D4)', color: 'var(--app-text, #1E3346)' }}
    >
      {currentUser ? (
        <>
          <Header
            currentUser={currentUser}
            branches={branches}
            activeBranchId={selectedBranchId || currentUser.primaryBranchId}
            onChangeBranch={() => {
              setSelectedBranchId(null);
              setSelectedBranchSession(null);
            }}
            onLogout={handleLogout}
          />
          <main className="flex-1 max-w-[1480px] w-full mx-auto px-3 sm:px-5 lg:px-7 py-5">
            {!selectedBranchId ? (
              <BranchSelection currentUser={currentUser} onSelectBranch={handleSelectBranch} />
            ) : (
              <UserPortal currentUser={currentUser} activeBranchId={selectedBranchId} />
            )}
          </main>
          <SessionExpiryBanner
            remainingSeconds={sessionExpiry.remainingSeconds}
            isNearExpiration={sessionExpiry.isNearExpiration}
            onDismiss={sessionExpiry.dismissWarning}
            onLogoutNow={handleLogout}
          />
          <Footer />
        </>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#1C2F40] via-[#253B4F] to-[#1D3242]">
          {/* Subtle frosted slate-teal pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#94C9CE_1px,transparent_1px)] [background-size:28px_28px] opacity-12 pointer-events-none"></div>

          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onOpenRegister={() => setIsRegisterOpen(true)}
          />

          {isRegisterOpen && (
            <RegisterWizard
              onClose={() => setIsRegisterOpen(false)}
              onSuccess={(newUser) => {
                setIsRegisterOpen(false);
                setCurrentUser(newUser);
                setActiveUserId(newUser.id);
                setBranches(getStoredBranches());
                setSelectedBranchId(newUser.primaryBranchId);
                setSelectedBranchSession(newUser.primaryBranchId);
              }}
            />
          )}
        </main>
      )}
    </div>
  );
}
