import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraFacingMode = 'environment' | 'user';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stop current active stream
  const stopStream = useCallback(() => {
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

  // Capture current frame from video to base64 JPEG
  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    // Use actual video dimensions
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror image if front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    // Return high quality JPEG
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [facingMode]);

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
    retryCamera: () => startCamera(facingMode),
  };
}
