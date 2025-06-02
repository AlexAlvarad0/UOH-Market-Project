import React, { useState } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Tooltip, 
  Alert
} from '@mui/material';
import { 
  Mic as MicIcon, 
  Stop as StopIcon, 
  Send as SendIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  PauseCircle as PauseRecordIcon,
  FiberManualRecord as RecordIcon
} from '@mui/icons-material';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface AudioRecorderProps {
  onSendAudio: (audioFile: File, duration: number) => Promise<void>;
  disabled?: boolean;
  showInstructions?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ 
  onSendAudio, 
  disabled = false,
  showInstructions = true 
}) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);  const {
    recordingState,
    recordingTime,
    isPlaying,
    hasRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    resetRecording,
    playRecording,
    stopPlayback,
    getAudioFile,
  } = useAudioRecorder();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      await startRecording();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al iniciar grabación');
    }
  };

  const handleSendAudio = async () => {
    const audioFile = getAudioFile();
    if (!audioFile) return;
    
    setIsSending(true);
    try {
      await onSendAudio(audioFile, recordingTime);
      resetRecording();
    } catch (error) {
      setError('Error al enviar audio');
      console.error('Error al enviar audio:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playRecording();
    }
  };

  const handleCancel = () => {
    if (recordingState === 'recording' || recordingState === 'paused') {
      cancelRecording();
    } else {
      resetRecording();
    }
    setError(null);
  };
  // Estado: Grabando o pausado
  if (recordingState === 'recording' || recordingState === 'paused') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '0 12px',
          backgroundColor: recordingState === 'recording' ? 'error.light' : 'warning.light',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: recordingState === 'recording' ? 'error.main' : 'warning.main',
          animation: recordingState === 'recording' ? 'pulse 1.5s infinite' : 'none',
          height: '40px',
          width: '100%',
          margin: '10px 10px 0',
          position: 'relative',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.8 },
          },
        }}
      >        {/* Indicador de grabación */}
        {recordingState === 'recording' ? (
          <RecordIcon sx={{ color: 'error.main', fontSize: 16 }} />
        ) : (
          <PauseRecordIcon sx={{ color: 'warning.main', fontSize: 16 }} />
        )}

        {/* Información de tiempo */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight="bold" color={recordingState === 'recording' ? 'error.main' : 'warning.main'} sx={{ fontSize: '0.875rem' }}>
            {recordingState === 'recording' ? 'Grabando' : 'Pausado'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {formatTime(recordingTime)}
          </Typography>
        </Box>

        {/* Botón pausa/reanudar */}
        <Tooltip title={recordingState === 'recording' ? 'Pausar' : 'Continuar'}>
          <IconButton
            onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            {recordingState === 'recording' ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>

        {/* Botón cancelar */}
        <Tooltip title="Cancelar">
          <IconButton
            onClick={handleCancel}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        {/* Botón parar */}
        <Tooltip title="Finalizar grabación">
          <IconButton
            onClick={stopRecording}
            disabled={isSending}
            size="small"
            sx={{
              p: 0.25,
              color: 'error.main',
              bgcolor: 'error.light',
              '&:hover': { bgcolor: 'error.main', color: 'white' },
            }}
          >
            <StopIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }
  // Estado: Audio grabado (preview)
  if (recordingState === 'recorded' && hasRecording) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '0 12px',
          backgroundColor: 'success.light',
          borderRadius: '20px',
          border: '1px solid',
          borderColor: 'success.main',
          height: '40px',
          width: '100%',
          margin: '10px 10px 0',
          position: 'relative',
        }}
      >        {/* Botón de reproducir/pausar */}
        <Tooltip title={isPlaying ? 'Pausar' : 'Reproducir'}>
          <IconButton
            onClick={handlePlayToggle}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25, color: 'success.main' }}
          >
            {isPlaying ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>

        {/* Información del audio */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ fontSize: '0.875rem' }}>
            Audio listo
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {formatTime(recordingTime)}
          </Typography>
        </Box>

        {/* Botón volver a grabar */}
        <Tooltip title="Grabar de nuevo">
          <IconButton
            onClick={resetRecording}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            <MicIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        {/* Botón cancelar */}
        <Tooltip title="Descartar">
          <IconButton
            onClick={handleCancel}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        {/* Botón enviar */}
        <Tooltip title="Enviar audio">
          <IconButton
            onClick={handleSendAudio}
            disabled={isSending}
            size="small"
            sx={{
              p: 0.25,
              color: 'primary.main',
              bgcolor: 'primary.light',
              '&:hover': { bgcolor: 'primary.main', color: 'white' },
              '&:disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            <SendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // Estado: Inicial (botón de micrófono)
  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 1, fontSize: '0.875rem' }}
        >
          {error}
        </Alert>
      )}
      
      {showInstructions && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Haz click en el micrófono para grabar audio
        </Typography>
      )}
      
      <Tooltip title="Iniciar grabación de audio" arrow>
        <IconButton
          onClick={handleStartRecording}
          disabled={disabled || isSending}
          sx={{
            color: 'primary.main',
            bgcolor: 'transparent',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'primary.dark',
              transform: 'scale(1.1)',
            },
            '&:disabled': {
              color: 'action.disabled',
            },
          }}
        >
          <MicIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default AudioRecorder;
