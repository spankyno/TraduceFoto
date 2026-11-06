import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareImageFromVideo, type PreparedImage } from '../utils/imageProcessing';

export type CameraFacingMode = 'environment' | 'user';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Identifica el último arranque pedido: si se pide parar/arrancar mientras
  // getUserMedia sigue pendiente, el resultado "viejo" se descarta y se libera.
  const startIdRef = useRef(0);

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stop current active stream
  const stopStream = useCallback(() => {
    startIdRef.current += 1; // invalida cualquier getUserMedia pendiente
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (mode: CameraFacingMode = facingMode) => {
      setIsLoading(true);
      setError(null);
      stopStream();
      const myStartId = startIdRef.current; // stopStream ya lo incrementó

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Tu navegador o dispositivo no soporta acceso a la cámara.');
        setIsLoading(false);
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Si mientras tanto se pidió parar o reiniciar la cámara, este stream sobra:
        // se apaga para no dejar la cámara (y su luz) encendida sin que nadie la use.
        if (myStartId !== startIdRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((playErr) => {
            console.warn('Video play error:', playErr);
          });
        }

        // Check torch capability (mainly on Android rear cameras)
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = (track.getCapabilities?.() as any) || {};
          if (capabilities.torch) {
            setHasTorch(true);
          }
        }

        setIsStreaming(true);
        setIsLoading(false);
      } catch (err: any) {
        if (myStartId !== startIdRef.current) return; // petición obsoleta
        console.error('Camera access error:', err);
        setIsLoading(false);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            'Se necesita permiso para acceder a la cámara. Por favor, pulsa en permitir en tu navegador o selecciona una imagen desde la galería.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setError(`No se pudo iniciar la cámara: ${err.message || 'Error desconocido'}`);
        }
      }
    },
    [facingMode, stopStream]
  );

  // Toggle Torch / Flashlight
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track.applyConstraints as any)({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  }, [torchOn]);

  // Flip between back and front camera
  const flipCamera = useCallback(() => {
    const nextMode: CameraFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  // Captura el fotograma actual ya reducido (máx. 1280 px) y comprimido (WebP/JPEG).
  // Se dibuja directamente a tamaño final: no se crea un canvas 4K intermedio.
  const capturePhoto = useCallback(async (): Promise<PreparedImage | null> => {
    const video = videoRef.current;
    if (!video) return null;
    return prepareImageFromVideo(video, facingMode === 'user');
  }, [facingMode]);

  // Apaga la cámara (luz de actividad, batería) sin perder el estado de la UI.
  const pauseCamera = useCallback(() => {
    stopStream();
    setIsLoading(false);
  }, [stopStream]);

  // Reanuda la cámara solo si está parada.
  const resumeCamera = useCallback(() => {
    if (streamRef.current) return;
    startCamera(facingMode);
  }, [facingMode, startCamera]);

  // Mount effect to start camera right away
  useEffect(() => {
    startCamera(facingMode);

    return () => {
      stopStream();
    };
  }, []);

  return {
    videoRef,
    isStreaming,
    isLoading,
    error,
    facingMode,
    hasTorch,
    torchOn,
    toggleTorch,
    flipCamera,
    capturePhoto,
    pauseCamera,
    resumeCamera,
    retryCamera: () => startCamera(facingMode),
  };
}
