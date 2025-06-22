import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Typography, LinearProgress, CircularProgress } from '@mui/material';
import { 
  PlayArrow as PlayIcon, 
  Pause as PauseIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { API_URL } from '../config';

interface AudioMessageProps {
  audioUrl: string;
  duration?: number;
  isOwnMessage?: boolean;
}

const AudioMessage: React.FC<AudioMessageProps> = ({ 
  audioUrl, 
  duration = 0, 
  isOwnMessage = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);  useEffect(() => {
    if (!audioUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const audio = new Audio();
    audioRef.current = audio;    // Construir URL completa si es relativa
    const fullAudioUrl = audioUrl.startsWith('http') 
      ? audioUrl 
      : `${API_URL}${audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl}`;

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      setIsLoading(false);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    const handleError = (e: Event) => {
      console.error('Error loading audio:', e);
      console.error('Failed URL:', fullAudioUrl);
      console.error('Original URL:', audioUrl);
      
      // Intentar diagnosticar el problema
      if (audioUrl.includes('/media/')) {
        console.error('URL seems to be a media file path. Check if MEDIA_URL is configured correctly in backend.');
      }
      
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
    };

    const handleCanPlay = () => {
      if (isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
      setIsLoading(false);
      setHasError(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Cargar el audio después de configurar los listeners
    audio.src = fullAudioUrl;
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const handlePlayPause = () => {
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || audioDuration === 0 || hasError) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioDuration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        padding: 1.5, // Mismo padding que los mensajes de texto
        backgroundColor: isOwnMessage ? 'primary.main' : 'grey.200',
        color: isOwnMessage ? 'white' : 'text.primary',
        borderRadius: 2, // Mismo border radius que los mensajes de texto (cuadrado con esquinas redondeadas)
        minHeight: '48px',
        width: 'auto',
        position: 'relative',
        wordBreak: 'break-word' // Misma propiedad que los mensajes de texto
      }}
    >
        {/* Botón de reproducir/pausar */}
        <IconButton
          onClick={handlePlayPause}
          disabled={isLoading || hasError}
          size="small"
          sx={{
            p: 0.25,
            color: isOwnMessage ? 'white' : 'primary.main',
            bgcolor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'transparent',
            '&:hover': {
              bgcolor: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'primary.light',
              color: isOwnMessage ? 'white' : 'primary.main',
              transform: 'scale(1.1)',
            },
          }}
        >
          {hasError ? (
            <ErrorIcon sx={{ fontSize: 16 }} />
          ) : isLoading ? (
            <CircularProgress 
              size={16} 
              sx={{ 
                color: isOwnMessage ? 'white' : 'primary.main' 
              }} 
            />
          ) : isPlaying ? (
            <PauseIcon sx={{ fontSize: 16 }} />
          ) : (
            <PlayIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>

        {/* Área de progreso y tiempo */}
        <Box sx={{ flex: 1, mx: 1 }}>
          {/* Barra de progreso */}
          <Box
            onClick={handleProgressClick}
            sx={{
              cursor: 'pointer',
              mb: 0.5,
            }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'grey.300',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: isOwnMessage ? 'white' : 'primary.main',
                  borderRadius: 3,
                },
              }}
            />
          </Box>        {/* Tiempo */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: isOwnMessage ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                fontSize: '0.75rem'
              }}
            >
              {hasError ? 'Error al cargar audio' : `${formatTime(currentTime)} / ${formatTime(audioDuration)}`}
            </Typography>          </Box>        </Box>
      </Box>
    );
  };

export default AudioMessage;
