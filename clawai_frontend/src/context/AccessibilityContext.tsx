import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

const speak = (text: string) => {
  if (!window.speechSynthesis) {
    console.warn("Seu navegador não suporta a API de Fala.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
};

interface AccessibilityContextType {
  isEnabled: boolean;
  toggleAccessibility: () => void;
  speakText: (text: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [isEnabled, setIsEnabled] = useState(false);

  const toggleAccessibility = () => {
    setIsEnabled(prev => !prev);
  };

  const speakText = useCallback((text: string) => {
    if (isEnabled) {
      speak(text);
    }
  }, [isEnabled]);

  return (
    <AccessibilityContext.Provider value={{ isEnabled, toggleAccessibility, speakText }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility deve ser usado dentro de um AccessibilityProvider');
  }
  return context;
};