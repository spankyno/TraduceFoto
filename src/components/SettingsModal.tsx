import React, { useState } from 'react';
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
  Lock,
  Globe,
  Smartphone,
  Cpu,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  provider: string;
  onSaveProvider: (provider: string) => void;
  initialTab?: 'api' | 'credits';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  provider,
  onSaveProvider,
  initialTab = 'api',
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'credits'>(initialTab);
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleClear = () => {
    setInputKey('');
    onSaveApiKey('');
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight">Ajustes y Créditos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
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

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'api' ? (
            /* TAB 1: API KEYS */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
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
                      title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons for saving / clearing */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md shadow-sky-900/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Clave</span>
                </button>
                {inputKey && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-medium border border-slate-700 transition"
                  >
                    Borrar
                  </button>
                )}
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Clave guardada con éxito en el almacenamiento local de este dispositivo.</span>
                </div>
              )}

              {/* How to get a free key */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    ¿No tienes una clave de Gemini?
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 underline underline-offset-2"
                  >
                    <span>Conseguir gratis</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Google ofrece acceso gratuito a la API de Gemini a través de Google AI Studio. Solo necesitas iniciar sesión con tu cuenta de Google y pulsar en «Create API Key».
                </p>
              </div>

              {/* Security & Privacy details */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Privacidad y Seguridad Garantizadas</span>
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>
                    Tu clave se guarda <strong>únicamente en tu propio navegador</strong> (<code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded">localStorage</code>).
                  </li>
                  <li>
                    Al traducir, la clave viaja cifrada por <strong>HTTPS</strong> directamente en la cabecera hacia la función Edge de Cloudflare.
                  </li>
                  <li>
                    Cloudflare la reenvía a Google <strong>en memoria</strong> y <strong>no se almacena</strong> en ningún servidor ni base de datos externa.
                  </li>
                </ul>
              </div>

              {/* Future providers note */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Próximamente:</strong> Soporte para añadir otros proveedores como OpenAI, Anthropic Claude o modelos locales.
                </span>
              </div>
            </div>
          ) : (
            /* TAB 2: CRÉDITOS Y OPERATIVA */
            <div className="space-y-5">
              {/* OG Image banner preview */}
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                <img
                  src="/og-image.png"
                  alt="FotoTraductor OpenGraph Card"
                  className="w-full h-auto object-cover max-h-40"
                />
                <div className="p-2.5 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Tarjeta Open Graph y Twitter: <code className="text-sky-300 font-mono">og-image.png</code></span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">1200x630</span>
                </div>
              </div>

              {/* Author and Copyright */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                    Autor y Derechos
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Aitor Sánchez Gutiérrez
                  </h3>
                  <p className="text-xs text-slate-400">
                    © 2026 Todos los derechos reservados.
                  </p>
                </div>

                {/* Author Links */}
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

              {/* Operativa de la aplicación */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Descripción de la Operativa
                  </h4>
                </div>

                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 text-[11px] font-bold">
                      1
                    </span>
                    <div>
                      <strong className="text-white">Cámara en Vivo Instantánea:</strong> Al abrir la PWA, se activa automáticamente la cámara trasera a pantalla completa, lista para enfocar carteles, menús, rótulos o documentos.
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 text-[11px] font-bold">
                      2
                    </span>
                    <div>
                      <strong className="text-white">Captura y Optimización:</strong> Al pulsar el disparador táctil, se extrae el fotograma en alta definición mediante HTML5 Canvas en memoria del navegador y se codifica a base64.
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 text-[11px] font-bold">
                      3
                    </span>
                    <div>
                      <strong className="text-white">Transmisión Segura al Edge:</strong> La petición viaja con cifrado HTTPS hacia Cloudflare Pages Functions, incluyendo tu clave privada en la cabecera <code className="text-sky-300 font-mono">X-Gemini-Api-Key</code>.
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 text-[11px] font-bold">
                      4
                    </span>
                    <div>
                      <strong className="text-white">IA Multilingüe en Memoria:</strong> El motor Google Gemini analiza la imagen, detecta automáticamente el idioma de origen y devuelve la traducción estructurada en JSON sin almacenar datos.
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 text-[11px] font-bold">
                      5
                    </span>
                    <div>
                      <strong className="text-white">Aceptación y Retorno Inmediato:</strong> La app presenta la traducción con lectura por voz y botón de copia. Al pulsar «Aceptar y hacer otra foto», la interfaz vuelve de inmediato a la cámara en vivo para la siguiente captura.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">FotoTraductor v1.2</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
