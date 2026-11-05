import React, { useRef, useState } from 'react';
import {
  Camera,
  FlipHorizontal,
  Image as ImageIcon,
  Sparkles,
  Zap,
  ZapOff,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useCamera } from './hooks/useCamera';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LanguageSelector } from './components/LanguageSelector';
import {
  TranslationResult,
  TranslationData,
} from './components/TranslationResult';
import { SamplePhotosPicker } from './components/SamplePhotosPicker';

export default function App() {
  const {
    videoRef,
    isStreaming,
    isLoading: isCameraLoading,
    error: cameraError,
    hasTorch,
    torchOn,
    toggleTorch,
    flipCamera,
    capturePhoto,
    retryCamera,
  } = useCamera();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Application states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationData, setTranslationData] = useState<TranslationData | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Español');
  const [isSamplePickerOpen, setIsSamplePickerOpen] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Send image to translation endpoint
  const processImageForTranslation = async (base64Img: string, targetLang: string) => {
    setCapturedImage(base64Img);
    setIsTranslating(true);
    setTranslationError(null);
    setTranslationData(null);

    try {
      const response = await fetch('/api/translate-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Img,
          targetLanguage: targetLang,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al procesar la traducción de la imagen.');
      }

      setTranslationData(result.data);
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslationError(
        err.message || 'Ocurrió un error al contactar el servicio de traducción.'
      );
    } finally {
      setIsTranslating(false);
    }
  };

  // Capture button clicked
  const handleCapture = () => {
    // Haptic feedback if supported on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60);
      } catch (e) {
        // ignore
      }
    }

    // Trigger visual flash
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const photo = capturePhoto();
    if (photo) {
      processImageForTranslation(photo, targetLanguage);
    } else {
      setTranslationError('No se pudo capturar la imagen de la cámara.');
    }
  };

  // Upload photo from device gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        processImageForTranslation(base64, targetLanguage);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Reset to initial camera state (User accepted the translation)
  const handleResetToCamera = () => {
    setCapturedImage(null);
    setTranslationData(null);
    setTranslationError(null);
    setIsTranslating(false);
  };

  return (
    <div className="relative w-full h-[100dvh] bg-black text-white overflow-hidden flex flex-col select-none">
      <OfflineIndicator />

      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Navigation Bar (Floating over camera) */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-3 pb-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-lg backdrop-blur-md">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
              FotoTraductor
            </h1>
            <p className="text-[10px] text-slate-300 font-medium">Detección automática</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target language selector */}
          <LanguageSelector
            currentLanguage={targetLanguage}
            onSelectLanguage={(lang) => {
              setTargetLanguage(lang);
              if (capturedImage && !isTranslating) {
                // If an image is currently shown, retranslate to new language
                processImageForTranslation(capturedImage, lang);
              }
            }}
          />

          {/* Android PWA Install button */}
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Camera Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
        {/* Live video feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Shutter White Flash effect */}
        {shutterFlash && (
          <div className="absolute inset-0 z-30 bg-white opacity-80 pointer-events-none transition-opacity duration-150" />
        )}

        {/* Camera Permission or Hardware Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 backdrop-blur-md">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Acceso a la cámara</h3>
            <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed">
              {cameraError}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                onClick={retryCamera}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Permitir / Reintentar
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <ImageIcon className="w-4 h-4" />
                Subir foto desde archivo
              </button>
            </div>
          </div>
        )}

        {/* Camera Loading Spinner */}
        {isCameraLoading && !cameraError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950">
            <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 mt-3 font-medium">Iniciando cámara...</p>
          </div>
        )}

        {/* Viewfinder Target Reticle / Scanner Brackets */}
        {isStreaming && !cameraError && (
          <div className="absolute inset-x-8 inset-y-24 pointer-events-none flex flex-col items-center justify-between">
            {/* Top guide banner */}
            <div className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-[11px] font-medium text-slate-200 border border-white/10 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Apunta al texto a traducir</span>
            </div>

            {/* Target Reticle Frame */}
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-3xl border border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-2xl" />

              {/* Center subtle crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-6 h-0.5 bg-white" />
                <div className="h-6 w-0.5 bg-white absolute" />
              </div>
            </div>

            {/* Bottom guide text */}
            <div className="text-[11px] text-slate-300 font-medium text-center bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
              Detecta automáticamente cualquier idioma
            </div>
          </div>
        )}
      </div>

      {/* Bottom Camera Controls Bar */}
      <footer className="absolute bottom-0 inset-x-0 z-20 px-6 pt-6 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Gallery / File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md flex items-center justify-center active:scale-95 transition shadow-lg"
            title="Seleccionar foto de la galería"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Big Tactile Shutter Button */}
          <button
            onClick={handleCapture}
            disabled={!isStreaming || isTranslating}
            className="group relative w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            title="Hacer foto y traducir"
          >
            {/* Outer white ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white group-hover:border-sky-400 transition-colors shadow-2xl" />
            {/* Inner solid button */}
            <div className="w-16 h-16 rounded-full bg-white group-hover:bg-sky-400 transition-all shadow-inner group-active:scale-90 flex items-center justify-center">
              <Camera className="w-6 h-6 text-slate-950 group-hover:text-white transition-colors" />
            </div>
          </button>

          {/* Right Tools (Flip camera or Flash toggle) */}
          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`w-12 h-12 rounded-full border backdrop-blur-md flex items-center justify-center active:scale-95 transition shadow-lg ${
                  torchOn
                    ? 'bg-amber-500 text-white border-amber-400'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                }`}
                title={torchOn ? 'Apagar flash' : 'Encender flash'}
              >
                {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 backdrop-blur-md flex items-center justify-center active:scale-95 transition shadow-lg"
              title="Cambiar de cámara (delantera/trasera)"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Small test sample button at the very bottom */}
        <div className="mt-3 flex items-center justify-center">
          <button
            onClick={() => setIsSamplePickerOpen(true)}
            className="text-[11px] text-slate-400 hover:text-sky-300 transition underline underline-offset-2 flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            ¿Sin cartel a mano? Probar con ejemplos (Japonés, Alemán, etc.)
          </button>
        </div>
      </footer>

      {/* Translation Result Modal/Screen */}
      {capturedImage && (
        <TranslationResult
          photoUrl={capturedImage}
          data={translationData}
          isLoading={isTranslating}
          error={translationError}
          onAccept={handleResetToCamera}
          onRetry={handleResetToCamera}
        />
      )}

      {/* Sample Photos Drawer */}
      <SamplePhotosPicker
        isOpen={isSamplePickerOpen}
        onClose={() => setIsSamplePickerOpen(false)}
        onSelectSample={(sampleBase64) => {
          processImageForTranslation(sampleBase64, targetLanguage);
        }}
      />
    </div>
  );
}
