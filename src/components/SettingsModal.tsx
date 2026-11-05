import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Info,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Layers,
  Cloud,
} from 'lucide-react';
import type { AiProvider } from '../hooks/useAppSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  cfAccountId: string;
  onSaveCfAccountId: (id: string) => void;
  cfApiToken: string;
  onSaveCfApiToken: (token: string) => void;
  provider: AiProvider;
  onSaveProvider: (provider: AiProvider) => void;
  initialTab?: 'api' | 'credits';
}

const PROVIDER_OPTIONS: { value: AiProvider; label: string; desc: string }[] = [
  {
    value: 'auto',
    label: 'Automático (Gemini → Cloudflare)',
    desc: 'Intenta Gemini primero; si falla, usa Workers AI',
  },
  {
    value: 'gemini',
    label: 'Solo Gemini',
    desc: 'Usa únicamente Google Gemini',
  },
  {
    value: 'cloudflare',
    label: 'Solo Cloudflare Workers AI',
    desc: 'Usa únicamente el modelo de visión de Cloudflare',
  },
  {
    value: 'cloudflare_first',
    label: 'Cloudflare → Gemini',
    desc: 'Intenta Workers AI primero; si falla, Gemini',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  cfAccountId,
  onSaveCfAccountId,
  cfApiToken,
  onSaveCfApiToken,
  provider,
  onSaveProvider,
  initialTab = 'api',
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'credits'>(initialTab);
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputCfAccount, setInputCfAccount] = useState(cfAccountId);
  const [inputCfToken, setInputCfToken] = useState(cfApiToken);
  const [inputProvider, setInputProvider] = useState<AiProvider>(provider);
  const [showKey, setShowKey] = useState(false);
  const [showCfToken, setShowCfToken] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync when modal opens / props change
  useEffect(() => {
    if (isOpen) {
      setInputKey(apiKey);
      setInputCfAccount(cfAccountId);
      setInputCfToken(cfApiToken);
      setInputProvider(provider);
      setActiveTab(initialTab);
      setSavedSuccess(false);
    }
  }, [isOpen, apiKey, cfAccountId, cfApiToken, provider, initialTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey);
    onSaveCfAccountId(inputCfAccount);
    onSaveCfApiToken(inputCfToken);
    onSaveProvider(inputProvider);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClearGemini = () => {
    setInputKey('');
    onSaveApiKey('');
  };

  const handleClearCf = () => {
    setInputCfAccount('');
    setInputCfToken('');
    onSaveCfAccountId('');
    onSaveCfApiToken('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white tracking-tight">Ajustes y Créditos</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'api'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Claves de API</span>
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
              activeTab === 'credits'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Créditos y Operativa</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'api' ? (
            <div className="space-y-5">
              {/* Provider preference */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Proveedor / Estrategia de fallback
                </label>
                <div className="space-y-1.5">
                  {PROVIDER_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        inputProvider === opt.value
                          ? 'bg-sky-500/10 border-sky-500/40'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={opt.value}
                        checked={inputProvider === opt.value}
                        onChange={() => setInputProvider(opt.value)}
                        className="mt-0.5 accent-sky-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-100">{opt.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Gemini */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-200">
                  GEMINI API KEY (Google AI Studio)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 transition"
                      title={showKey ? 'Ocultar' : 'Mostrar'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    Obtener clave gratis <ExternalLink className="w-3 h-3" />
                  </a>
                  {inputKey && (
                    <button
                      type="button"
                      onClick={handleClearGemini}
                      className="text-[11px] text-slate-500 hover:text-rose-400"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>

              {/* Cloudflare Workers AI */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-300">
                  <Cloud className="w-4 h-4" />
                  Cloudflare Workers AI (fallback / alternativo)
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Account ID
                  </label>
                  <input
                    type="text"
                    value={inputCfAccount}
                    onChange={(e) => setInputCfAccount(e.target.value)}
                    placeholder="32 caracteres hex…"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    API Token (Workers AI Read)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showCfToken ? 'text' : 'password'}
                      value={inputCfToken}
                      onChange={(e) => setInputCfToken(e.target.value)}
                      placeholder="Bearer token…"
                      className="w-full px-3 py-2 pr-12 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCfToken(!showCfToken)}
                      className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-200"
                    >
                      {showCfToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href="https://developers.cloudflare.com/workers-ai/get-started/rest-api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
                  >
                    Cómo obtener Account ID + Token <ExternalLink className="w-3 h-3" />
                  </a>
                  {(inputCfAccount || inputCfToken) && (
                    <button
                      type="button"
                      onClick={handleClearCf}
                      className="text-[11px] text-slate-500 hover:text-rose-400"
                    >
                      Borrar CF
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Dashboard → AI → Workers AI → «Use REST API» → Create Workers AI API Token.
                  Necesitas permiso <strong>Workers AI → Read</strong>.
                </p>
              </div>

              {/* Save */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-900/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar configuración</span>
                </button>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Configuración guardada en este dispositivo.</span>
                </div>
              )}

              {/* Privacy */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Privacidad</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>
                    Las claves se guardan <strong>solo en tu navegador</strong> (localStorage).
                  </li>
                  <li>
                    Se envían cifradas por HTTPS al edge de Cloudflare y no se almacenan en servidor.
                  </li>
                  <li>
                    Puedes usar solo Gemini, solo Cloudflare, o ambos con fallback automático.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Credits tab – keep existing content style */
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl p-2 space-y-2">
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Tarjeta oficial (Open Graph)
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-800/80 bg-black/80 flex items-center justify-center">
                  <img
                    src="/og-image.png"
                    alt="FotoTraductor"
                    className="w-full h-auto max-h-64 object-contain rounded-lg"
                    loading="eager"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    Autor y Derechos
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Aitor Sánchez Gutiérrez
                  </h3>
                  <p className="text-xs text-slate-400">© 2026 Todos los derechos reservados.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                  <a
                    href="https://aitorsanchez.pages.dev/contacto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 hover:text-sky-300 transition flex items-center justify-between group"
                  >
                    <span>Contacto</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300" />
                  </a>
                  <a
                    href="https://aitorsanchez.pages.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 hover:text-sky-300 transition flex items-center justify-between group"
                  >
                    <span>Blog oficial</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300" />
                  </a>
                  <a
                    href="https://aitorhub.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 hover:text-sky-300 transition flex items-center justify-between group"
                  >
                    <span>Más apps</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-300" />
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Proveedores de IA</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  FotoTraductor usa <strong>Google Gemini</strong> como motor principal de OCR +
                  traducción y <strong>Cloudflare Workers AI</strong> (Llava / Llama Vision) como
                  respaldo. Tú aportas tus propias claves; la app no consume cuota del servidor.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  La app es gratuita. Solo se usa la cuota de las APIs que tú configures.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
