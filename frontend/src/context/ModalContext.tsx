"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { DogEarCorner } from '@/src/components/ui/DogEarCorner';
import { SecurityWatermark } from '@/src/components/ui/SecurityWatermark';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalOptions {
  message: string;
  type: ModalType;
  defaultValue?: string;
  resolve: (value: any) => void;
}

interface ModalContextType {
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [inputValue, setInputValue] = useState('');

  const showAlert = (message: string) => {
    return new Promise<void>((resolve) => {
      setModal({ message, type: 'alert', resolve });
    });
  };

  const showConfirm = (message: string) => {
    return new Promise<boolean>((resolve) => {
      setModal({ message, type: 'confirm', resolve });
    });
  };

  const showPrompt = (message: string, defaultValue?: string) => {
    return new Promise<string | null>((resolve) => {
      setInputValue(defaultValue || '');
      setModal({ message, type: 'prompt', defaultValue, resolve });
    });
  };

  const handleConfirm = () => {
    if (!modal) return;
    if (modal.type === 'alert') modal.resolve(undefined);
    if (modal.type === 'confirm') modal.resolve(true);
    if (modal.type === 'prompt') modal.resolve(inputValue);
    setModal(null);
  };

  const handleCancel = () => {
    if (!modal) return;
    if (modal.type === 'confirm') modal.resolve(false);
    if (modal.type === 'prompt') modal.resolve(null);
    setModal(null);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border border-border shadow-xl rounded-2xl p-6 modal-docket-unfold relative overflow-hidden">
            <DogEarCorner size="sm" />
            <SecurityWatermark className="w-32 h-32 right-1 bottom-1 text-foreground/[0.04] dark:text-foreground/[0.06]" />

            <div className="flex items-start gap-3.5 relative z-10">
              <div className={`p-2 rounded-xl shrink-0 ${modal.type === 'alert' ? 'bg-primary/10 text-primary' : modal.type === 'confirm' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                {modal.type === 'alert' && <AlertCircle className="w-5 h-5" />}
                {modal.type === 'confirm' && <HelpCircle className="w-5 h-5" />}
                {modal.type === 'prompt' && <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-foreground mb-1.5">
                  {modal.type === 'alert' ? 'Notice' : modal.type === 'confirm' ? 'Confirm Action' : 'Input Required'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 leading-relaxed">{modal.message}</p>
                
                {modal.type === 'prompt' && (
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    className="w-full px-3.5 py-2 mb-4 bg-muted border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground shadow-2xs"
                    autoFocus
                  />
                )}

                <div className="flex justify-end gap-2 pt-1 border-t border-border/60">
                  {modal.type !== 'alert' && (
                    <button onClick={handleCancel} className="desk-press px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleConfirm} className="desk-press px-4 py-1.5 text-xs font-semibold text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-opacity shadow-xs">
                    {modal.type === 'alert' ? 'OK' : modal.type === 'confirm' ? 'Confirm' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
};
