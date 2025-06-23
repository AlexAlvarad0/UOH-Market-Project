import React, { useState, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
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
  FiberManualRecord as RecordIcon,
  Close as CloseIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface MessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendAudio: (audioFile: File, duration: number) => Promise<void>;
  onTyping?: () => void;
  editingMessageId: number | null;
  onEditCancel: () => void;
  disabled?: boolean;
  replyingToMessage?: {
    id: number;
    sender_username: string;
    content: string;
    message_type?: 'text' | 'audio';
    audio_duration?: number;
    is_deleted?: boolean;
  } | null;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  setMessage,
  onSendMessage,
  onSendAudio,
  onTyping,
  editingMessageId,
  onEditCancel,
  disabled = false,
  replyingToMessage,
  onCancelReply
}) => {  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioMode, setAudioMode] = useState(false);
  
  // Refs para throttle de typing
  const lastTypingRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
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
    getAudioFile,  } = useAudioRecorder();
  // Manejador optimizado para el cambio de texto con throttle de typing
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Throttle para eventos de typing - solo enviar cada 1.5 segundos máximo
    if (onTyping) {
      const now = Date.now();
      const timeSinceLastTyping = now - lastTypingRef.current;
      
      if (timeSinceLastTyping >= 1500) {
        lastTypingRef.current = now;
        
        // Limpiar timeout anterior
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        onTyping();
        
        // Configurar timeout para evitar múltiples llamadas
        typingTimeoutRef.current = setTimeout(() => {
          lastTypingRef.current = 0; // Reset para permitir el siguiente evento
        }, 3000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      setAudioMode(true);
      await startRecording();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al iniciar grabación');
      setAudioMode(false);
    }
  };

  const handleSendAudio = async () => {
    const audioFile = getAudioFile();
    if (!audioFile) return;
    
    setIsSending(true);
    try {
      await onSendAudio(audioFile, recordingTime);
      resetRecording();
      setAudioMode(false);    } catch {
      setError('Error al enviar audio');
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
    setAudioMode(false);
    setError(null);
  };

  const handleSendMessageWrapper = (e: React.FormEvent) => {
    e.preventDefault();
    if (audioMode && hasRecording) {
      handleSendAudio();
    } else if (!audioMode && message.trim()) {
      onSendMessage(e);
    }
  };

  // Renderizado del error si existe
  const renderError = () => {
    if (!error) return null;
    return (
      <Alert 
        severity="error" 
        onClose={() => setError(null)}
        sx={{ 
          position: 'absolute',
          top: '-60px',
          left: 0,
          right: 0,
          fontSize: '0.875rem',
          zIndex: 10
        }}
      >
        {error}
      </Alert>
    );
  };
  // Modo audio: grabando o pausado
  if (audioMode && (recordingState === 'recording' || recordingState === 'paused')) {
    return (
      <Box sx={{ position: 'relative' }}>
        {renderError()}
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
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.8 },
            },
          }}
        >          {/* Indicador de grabación */}
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
          <IconButton
            onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            {recordingState === 'recording' ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayIcon sx={{ fontSize: 16 }} />}
          </IconButton>

          {/* Botón cancelar */}
          <IconButton
            onClick={handleCancel}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {/* Botón parar */}
          <IconButton
            onClick={stopRecording}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25, color: 'error.main' }}
          >
            <StopIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
    );
  }
  // Modo audio: preview del audio grabado
  if (audioMode && recordingState === 'recorded' && hasRecording) {
    return (
      <Box sx={{ position: 'relative' }}>
        {renderError()}
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
          }}
        >          {/* Botón de reproducir/pausar */}
          <IconButton
            onClick={handlePlayToggle}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25, color: 'success.main' }}
          >
            {isPlaying ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayIcon sx={{ fontSize: 16 }} />}
          </IconButton>

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
          <IconButton
            onClick={resetRecording}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            <MicIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {/* Botón cancelar */}
          <IconButton
            onClick={handleCancel}
            disabled={isSending}
            size="small"
            sx={{ p: 0.25 }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {/* Botón enviar */}
          <IconButton
            onClick={handleSendAudio}
            disabled={isSending}
            size="small"
            sx={{
              p: 0.25,
              color: 'primary.main',
              bgcolor: 'primary.light',
              '&:hover': { bgcolor: 'primary.main', color: 'white' },
            }}
          >
            <SendIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
    );
  }

  // Modo normal: input de texto
  return (
    <Box sx={{ position: 'relative' }}>
      {renderError()}      {/* Indicador de respuesta */}
      {replyingToMessage && (
        <Box 
          sx={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '8px',
            p: 1,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            // Alinear al margen derecho con 10px de separación
            mr: '10px',
            ml: 'auto', // Esto empuja el elemento hacia la derecha
            // Limitar el ancho máximo para evitar expansión excesiva
            maxWidth: 'calc(100% - 10px)', // Ancho máximo menos el margen derecho
            minWidth: 0, // Permitir que se contraiga
            width: 'fit-content'
          }}
        >
          <Box sx={{ 
            flex: 1,
            minWidth: 0, // Permitir que se contraiga
            maxWidth: { xs: 'calc(100vw - 120px)', md: '400px' }, // Limitar ancho en móvil y desktop
            overflow: 'hidden'
          }}>
            <Typography variant="caption" color="primary" sx={{ 
              fontWeight: 'bold', 
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Respondiendo a {replyingToMessage.sender_username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              wordBreak: 'break-word',
              // Limitar la longitud del texto mostrado
              maxWidth: '100%'
            }}>
              {replyingToMessage.is_deleted 
                ? '🗑️ Mensaje eliminado'
                : replyingToMessage.message_type === 'audio' 
                  ? `🎵 Audio (${replyingToMessage.audio_duration}s)`
                  : replyingToMessage.content.length > 50 
                    ? `${replyingToMessage.content.substring(0, 50)}...`
                    : replyingToMessage.content
              }
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelReply} sx={{ flexShrink: 0, ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <form onSubmit={handleSendMessageWrapper} style={{ width: '100%' }}>
        <Box 
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '0',
            border: '1px solid #d0d0d0',
            height: '40px',
            width: '100%',
            borderRadius: '20px',
            margin: '10px 10px 0',
            '&:focus-within': {
              border: '1px solid #9e9e9e',
            },
            position: 'relative'
          }}
        >
          {/* Botón de micrófono */}
          <IconButton
            onClick={handleStartRecording}
            disabled={disabled || isSending || !!editingMessageId}
            size="small"
            sx={{
              position: 'absolute',
              left: '8px',
              zIndex: 1,
              p: 0.5,
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.light',
                transform: 'scale(1.1)',
              },
            }}
          >
            <MicIcon fontSize="small" />
          </IconButton>

          {/* Input de texto */}
          <input
            required={!audioMode}
            placeholder="Mensaje..."
            type="text"
            value={message}
            onChange={handleMessageChange}
            disabled={audioMode}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
              outline: 'none',
              border: 'none',
              paddingLeft: '44px',
              paddingRight: editingMessageId ? '80px' : '40px',
              color: '#000',
              borderRadius: '20px',
            }}
          />
          
          {/* Botones de edición */}
          {editingMessageId && (
            <Box sx={{ 
              position: 'absolute',
              right: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              <IconButton
                size="small"
                onClick={onEditCancel}
                sx={{ p: 0.5 }}
              >
                <CloseIcon fontSize="small" sx={{ fontSize: '16px' }} />
              </IconButton>
              <IconButton
                size="small"
                type="submit"
                disabled={!message.trim()}
                sx={{ p: 0.5 }}
              >
                <EditIcon 
                  fontSize="small" 
                  sx={{ fontSize: '16px' }}
                  color={message.trim() ? "primary" : "disabled"} 
                />
              </IconButton>
            </Box>
          )}
          
          {/* Botón de enviar */}
          {!editingMessageId && (
            <IconButton
              type="submit"
              disabled={!message.trim() && !hasRecording}
              size="small"
              sx={{
                position: 'absolute',
                right: '5px',
                p: 0.5
              }}
            >
              <SendIcon 
                fontSize="small" 
                color={(message.trim() || hasRecording) ? "primary" : "disabled"}
                sx={{ fontSize: '18px' }}
              />
            </IconButton>
          )}
        </Box>
      </form>
    </Box>
  );
};

export default MessageInput;
