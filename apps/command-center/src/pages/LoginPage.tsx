import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Terminal, Lock, Unlock, ArrowRight, KeyRound, AlertCircle, Sparkles } from 'lucide-react';
import { useSuperAdminAuth } from '../context/AuthContext';

export function LoginPage() {
  const { verifyPasscode } = useSuperAdminAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focus first digit on load
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  async function submitCode(codeToSubmit: string) {
    if (codeToSubmit.length < 4 || loading) return;
    setError(null);
    setLoading(true);

    try {
      const result = await verifyPasscode(codeToSubmit);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Access denied: Invalid master code.');
        setDigits(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch {
      setError('Connection failure. Check network.');
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of 4+ characters
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      if (cleaned.length > 0) {
        const newDigits = ['', '', '', ''];
        for (let i = 0; i < cleaned.length; i++) {
          newDigits[i] = cleaned[i];
        }
        setDigits(newDigits);
        if (cleaned.length === 4) {
          submitCode(cleaned);
        } else {
          inputRefs[Math.min(cleaned.length, 3)].current?.focus();
        }
        return;
      }
    }

    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto submit when 4th digit entered
    const fullCode = newDigits.join('');
    if (fullCode.length === 4 && !newDigits.includes('')) {
      submitCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'Enter') {
      const fullCode = digits.join('');
      if (fullCode.length === 4) {
        submitCode(fullCode);
      }
    }
  };

  const handleNumpadClick = (num: string) => {
    const firstEmptyIndex = digits.findIndex((d) => d === '');
    if (firstEmptyIndex !== -1) {
      handleDigitChange(firstEmptyIndex, num);
    }
  };

  const handleClear = () => {
    setDigits(['', '', '', '']);
    setError(null);
    inputRefs[0].current?.focus();
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4 bg-dot-grid relative overflow-hidden select-none">
      {/* Stealth ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-20"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 30%, oklch(0.55 0.2 260 / 25%) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm space-y-6">
        {/* Terminal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-1 transition-all">
            {success ? (
              <Unlock className="w-6 h-6 text-success animate-bounce" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center justify-center gap-2">
            <span>Command Center</span>
          </h1>
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
            MASTER TERMINAL · ROOT AUTH
          </p>
        </div>

        {/* Passcode Card */}
        <div className="bg-surface/85 dark:bg-surface/60 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium text-foreground">
              Enter Master Authorization Code
            </p>
            <p className="text-[11px] text-muted-foreground">
              Private platform telemetry & subscription control
            </p>
          </div>

          {/* 4-Digit PIN Boxes */}
          <div className="flex justify-center items-center gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={digit}
                disabled={loading || success}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-xl font-mono font-bold rounded-xl border transition-all duration-150 outline-none ${
                  error
                    ? 'border-destructive bg-destructive/10 text-destructive animate-shake'
                    : digit
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30 shadow-inner'
                    : 'border-border bg-secondary/50 text-foreground focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20'
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success / Loading indicator */}
          {loading && (
            <div className="text-center font-mono text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>VERIFYING ROOT CODE...</span>
            </div>
          )}

          {/* Keypad for Quick Click Entry */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumpadClick(num)}
                disabled={loading || success}
                className="h-11 rounded-xl bg-secondary/60 hover:bg-secondary active:scale-95 text-sm font-mono font-bold text-foreground transition-all cursor-pointer border border-border/40 hover:border-border"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={loading || success}
              className="h-11 rounded-xl bg-secondary/30 hover:bg-secondary/60 active:scale-95 text-xs font-mono font-medium text-muted-foreground transition-all cursor-pointer border border-border/30 hover:text-foreground"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleNumpadClick('0')}
              disabled={loading || success}
              className="h-11 rounded-xl bg-secondary/60 hover:bg-secondary active:scale-95 text-sm font-mono font-bold text-foreground transition-all cursor-pointer border border-border/40 hover:border-border"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => submitCode(digits.join(''))}
              disabled={loading || success || digits.join('').length < 4}
              className="h-11 rounded-xl bg-primary hover:opacity-90 active:scale-95 text-xs font-mono font-bold text-primary-foreground transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stealth Security Badge */}
        <div className="text-center flex items-center justify-center gap-1.5 text-[10px] font-mono text-muted-foreground/80">
          <Terminal className="w-3 h-3 text-success" />
          <span>AIR-GAPPED · ZERO WEB INDEXING · NOINDEX</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
