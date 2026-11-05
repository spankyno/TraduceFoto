import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  AlertCircle,
  Settings,
} from 'lucide-react';

export interface TranslationData {
  hasText: boolean;
  detectedLanguage: string;
  detectedLanguageCode?: string;
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  confidence?: string;
  summary?: string;
}

interface TranslationResultProps {
  photoUrl: string;
  data: TranslationData | null;
  isLoading: boolean;
  error: string | null;
  onAccept: () => void;
  onRetry: () => void;
  onOpenSettings?: () => void;
}

export const TranslationResult: React.FC<TranslationResultProps> = ({
  photoUrl,
  data,
  isLoading,
  error,
  onAccept,
  onRetry,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!data?.translatedText) return;
    try {
      await navigator.clipboard.writeText(data.translatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  // Text to speech
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window) || !data?.translatedText) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(data.translatedText);
    utterance.lang = data.targetLanguage.toLowerCase().includes('ing') ? 'en-US' : 'es-ES';
    utterance.rate = 0.95;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Background Captured Image (blurred slightly for contrast) */}
      <div className="relative w-full h-44 sm:h-52 shrink-0 bg-black overflow-hidden">
        <img
          src={photoUrl}
          alt="Foto capturada"
          className="w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-slate-950" />

        {/* Laser scanner animation while loading */}
        {isLoading && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-laser" />
        )}

        {/* Top badge over photo */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-slate-200 border border-white/10 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {isLoading ? 'Analizando texto...' : 'Foto procesada'}
          </span>

          <button
            onClick={onRetry}
            className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-slate-300 hover:text-white border border-white/10 transition"
            title="Descartar y volver"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Card (Scrollable if text is long) */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto px-5 py-4 space-y-4">
        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
              <Globe className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Detectando y traduciendo...
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Identificando idioma de origen y extrayendo el contenido con precisión
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                error.toLowerCase().includes('503') || error.toLowerCase().includes('demanda')
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {error.toLowerCase().includes('503') || error.toLowerCase().includes('demanda')
                  ? 'Servidores con alta demanda'
                  : 'Error en la traducción'}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 max-w-xs leading-relaxed">
                {error.toLowerCase().includes('503') || error.toLowerCase().includes('demanda')
                  ? 'Google AI está procesando un volumen alto de solicitudes. Pulsa en reintentar para procesar la imagen de nuevo.'
                  : error}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-900/30 transition flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configurar clave en Ajustes</span>
                </button>
              )}
              <button
                onClick={onRetry}
                className="w-full py-2.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-900/30 transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reintentar traducción</span>
              </button>
              <button
                onClick={onAccept}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              >
                Volver a la cámara
              </button>
            </div>
          </div>
        )}

        {/* Success state */}
        {!isLoading && !error && data && (
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Language detection banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Idioma detectado
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span className="text-sky-300">{data.detectedLanguage || 'Desconocido'}</span>
                      <span className="text-slate-500">➔</span>
                      <span className="text-emerald-300">{data.targetLanguage}</span>
                    </div>
                  </div>
                </div>

                {data.confidence && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Precisión {data.confidence}
                  </span>
                )}
              </div>

              {/* Main translation box */}
              {data.hasText ? (
                <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Traducción al {data.targetLanguage}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Audio listen button */}
                      {'speechSynthesis' in window && (
                        <button
                          onClick={handleToggleSpeech}
                          className={`p-2 rounded-lg transition ${
                            isPlayingAudio
                              ? 'bg-sky-500 text-white shadow-md'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                          title={isPlayingAudio ? 'Detener lectura' : 'Escuchar pronunciación'}
                        >
                          {isPlayingAudio ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Copy button */}
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
                        title="Copiar texto"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copied && <span className="text-emerald-400 font-medium">¡Copiado!</span>}
                      </button>
                    </div>
                  </div>

                  {/* Translated text */}
                  <div className="text-lg font-medium text-white leading-relaxed select-text bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {data.translatedText}
                  </div>

                  {/* Optional summary if text is extensive */}
                  {data.summary && data.summary !== data.translatedText && (
                    <p className="text-xs text-slate-400 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                      💡 <strong>Resumen:</strong> {data.summary}
                    </p>
                  )}

                  {/* Collapsible original text view */}
                  {data.originalText && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition py-1"
                      >
                        <span>Texto original detectado</span>
                        {showOriginal ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {showOriginal && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-950 text-xs text-slate-300 font-mono leading-relaxed max-h-36 overflow-y-auto select-text border border-slate-800">
                          {data.originalText}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* No text found state */
                <div className="mt-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-semibold text-white">No se detectó texto</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {data.translatedText ||
                      'No encontramos palabras legibles en esta foto. Intenta acercarte más al texto, enfocar o encender el flash.'}
                  </p>
                </div>
              )}
            </div>

            {/* Crucial Action: Aceptar y volver a la cámara */}
            <div className="pt-2 pb-4">
              <button
                onClick={onAccept}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Aceptar y hacer otra foto</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
