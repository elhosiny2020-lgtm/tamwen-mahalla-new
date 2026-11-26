'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginForm from '@/components/LoginForm';
import RegisterWizard from '@/components/RegisterWizard';
import BranchSelection from '@/components/BranchSelection';
import UserPortal from '@/components/UserPortal';
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

  const handleLogout = () => {
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentSessionUser(null);
    setSelectedBranchSession(null);
    setCurrentUser(null);
    setSelectedBranchId(null);
    setActiveUserId('guest');
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A192F] font-sans text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#C6A15B]/30 border-t-[#C6A15B] animate-spin" />
          <p className="text-sm font-bold text-[#C6A15B]">{t('loadingSystem')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen flex flex-col bg-[#F4F7FB] font-sans text-[#243447] selection:bg-[#102A43] selection:text-white">
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
          <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {!selectedBranchId ? (
              <BranchSelection currentUser={currentUser} onSelectBranch={handleSelectBranch} />
            ) : (
              <UserPortal currentUser={currentUser} activeBranchId={selectedBranchId} />
            )}
          </main>
          <Footer />
        </>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0A192F] via-[#102A43] to-[#0A192F]">
          {/* Subtle sovereign background pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#C6A15B_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none"></div>

          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onOpenRegister={() => setIsRegisterOpen(true)}
          />

          {isRegisterOpen && (
            <RegisterWizard
              onClose={() => setIsRegisterOpen(false)}
              onSuccess={() => setIsRegisterOpen(false)}
            />
          )}
        </main>
      )}
    </div>
  );
}
