import React, { useState } from 'react';
import { ChevronDown, Languages, Check } from 'lucide-react';

export const POPULAR_TARGET_LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ca', name: 'Català', flag: '🏴' },
  { code: 'gl', name: 'Galego', flag: '🏴' },
  { code: 'eu', name: 'Euskara', flag: '🏴' },
];

interface LanguageSelectorProps {
  currentLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeLang =
    POPULAR_TARGET_LANGUAGES.find((l) => l.name.toLowerCase() === currentLanguage.toLowerCase()) ||
    POPULAR_TARGET_LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700/80 backdrop-blur-md transition shadow-md"
        title="Idioma de traducción"
      >
        <span className="text-sm">{activeLang.flag}</span>
        <span className="font-semibold text-white">{activeLang.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-2xl space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Traducir a:
            </div>
            {POPULAR_TARGET_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onSelectLanguage(lang.name);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                  lang.name === currentLanguage
                    ? 'bg-sky-500/20 text-sky-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
                {lang.name === currentLanguage && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
