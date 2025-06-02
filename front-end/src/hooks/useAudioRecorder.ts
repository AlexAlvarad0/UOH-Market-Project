import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'recorded';

interface UseAudioRecorderReturn {
  recordingState: RecordingState;
  recordingTime: number;
  audioBlob: Blob | null;
  isPlaying: boolean;
  hasRecording: boolean;
  canPause: boolean;
  canResume: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  resetRecording: () => void;
  playRecording: () => void;
  stopPlayback: () => void;
  getAudioFile: () => File | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Computed properties
  const hasRecording = audioBlob !== null;
  const canPause = recordingState === 'recording';
  const canResume = recordingState === 'paused';

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Pedir permisos de micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;
      
      // Configurar MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
        setRecordingState('recorded');
        cleanupStream();
      };

      // Iniciar grabación
      mediaRecorder.start(100); // Capturar cada 100ms
      setRecordingState('recording');
      setRecordingTime(0);
      startTimer();

    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      setRecordingState('idle');
      throw new Error('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }, [startTimer, cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      stopTimer();
    }
  }, [recordingState, stopTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      stopTimer();
    }
  }, [recordingState, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      startTimer();
    }
  }, [recordingState, startTimer]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    cleanupStream();
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    audioChunksRef.current = [];
    stopTimer();
  }, [cleanupStream, stopTimer]);

  const resetRecording = useCallback(() => {
    setRecordingState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    audioChunksRef.current = [];
    stopTimer();
  }, [stopTimer]);

  const playRecording = useCallback(() => {
    if (audioBlob && !isPlaying) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
      setIsPlaying(true);
    }
  }, [audioBlob, isPlaying]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const getAudioFile = useCallback((): File | null => {
    if (!audioBlob) return null;
    
    return new File([audioBlob], `audio_${Date.now()}.webm`, {
      type: audioBlob.type
    });
  }, [audioBlob]);

  return {
    recordingState,
    recordingTime,
    audioBlob,
    isPlaying,
    hasRecording,
    canPause,
    canResume,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    resetRecording,
    playRecording,
    stopPlayback,
    getAudioFile,
  };
};
