import React, { useState } from 'react';
import { useZot } from '../../context/ZotContext';
import { Logo } from '../common/Logo';
import { ShieldCheck, Mail, Lock, User, ArrowRight, X, CheckCircle2, Key, Github } from 'lucide-react';

export const ClerkAuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalMode, 
    setAuthModalMode,
    loginWithEmail,
    loginWithOAuth
  } = useZot();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setTimeout(() => {
      loginWithEmail(email, fullName || 'Developer');
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#18150f] border border-[#2E2910] rounded-2xl p-7 shadow-2xl glow-orange text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-[#2E2910]/40 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size={44} className="mb-3" />
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {authModalMode === 'signIn' ? 'Sign in to ZOT Gateway' : 'Create your ZOT Account'}
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Zero-Shot Prompt Router & Token Compression System
          </p>
        </div>

        {/* Mode Switcher Pills */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#12110c] border border-[#2E2910]/80 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAuthModalMode('signIn')}
            className={`py-2 rounded-lg transition-all ${
              authModalMode === 'signIn'
                ? 'bg-[#FF9100] text-black shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthModalMode('signUp')}
            className={`py-2 rounded-lg transition-all ${
              authModalMode === 'signUp'
                ? 'bg-[#FF9100] text-black shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={() => loginWithOAuth('google')}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#1f1b13] hover:bg-[#2a2418] border border-[#2E2910] rounded-xl text-xs font-medium text-stone-200 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.8 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.7c-.2-.7-.4-1.6-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.3-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => loginWithOAuth('github')}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#1f1b13] hover:bg-[#2a2418] border border-[#2E2910] rounded-xl text-xs font-medium text-stone-200 transition-all"
          >
            <Github className="w-4 h-4 text-stone-300" />
            Continue with GitHub
          </button>
        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#2E2910] w-full"></div>
          <span className="bg-[#18150f] px-3 text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
            or continue with email
          </span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === 'signUp' && (
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  required
                  placeholder="Karthi Viki"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-stone-100 placeholder-stone-600 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="email"
                required
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-stone-100 placeholder-stone-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-stone-100 placeholder-stone-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FF9100] hover:bg-[#e08000] text-black font-semibold rounded-xl text-xs transition-all shadow-md mt-4 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{authModalMode === 'signIn' ? 'Sign In to Gateway' : 'Create Developer Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Badge footer */}
        <div className="mt-5 pt-4 border-t border-[#2E2910]/60 flex items-center justify-between text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5 text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF9100]" />
            <span>Clerk Security Protocol</span>
          </div>
          <span className="text-stone-500">256-bit Encrypted</span>
        </div>
      </div>
    </div>
  );
};
