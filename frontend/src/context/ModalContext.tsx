"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

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
          <div className="w-full max-w-sm bg-card border border-border shadow-lg rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full shrink-0 ${modal.type === 'alert' ? 'bg-primary/10 text-primary' : modal.type === 'confirm' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                {modal.type === 'alert' && <AlertCircle className="w-6 h-6" />}
                {modal.type === 'confirm' && <HelpCircle className="w-6 h-6" />}
                {modal.type === 'prompt' && <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div className="flex-1 mt-1">
                <h3 className="font-bold text-lg text-foreground mb-2">
                  {modal.type === 'alert' ? 'Notice' : modal.type === 'confirm' ? 'Confirm Action' : 'Input Required'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{modal.message}</p>
                
                {modal.type === 'prompt' && (
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    className="w-full px-4 py-2 mb-4 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    autoFocus
                  />
                )}

                <div className="flex justify-end gap-2">
                  {modal.type !== 'alert' && (
                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors">
                      Cancel
                    </button>
                  )}
                  <button onClick={handleConfirm} className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                    {modal.type === 'alert' ? 'Okay' : modal.type === 'confirm' ? 'Confirm' : 'Submit'}
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
