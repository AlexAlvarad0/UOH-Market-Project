import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContactsIcon from '@mui/icons-material/Contacts';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CakeIcon from '@mui/icons-material/Cake';
import VerifiedIcon from '@mui/icons-material/Verified';
import { API_URL } from '../config';

interface UserProfileData {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  location?: string;
  birth_date?: string;
  profile_picture?: string;
  average_rating?: number;
  total_ratings?: number;
  is_verified_seller?: boolean;
}

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  username?: string;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onClose,
  userId,
  username
}) => {
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');      // Usar la misma estructura que el frontend usa en otros lugares
      const response = await fetch(`${API_URL}/accounts/users/${userId}/profile/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Datos de perfil recibidos:", data);
        setProfileData(data);
      } else {
        console.error('Error en respuesta:', response.status, response.statusText);
        setError('No se pudo cargar el perfil del usuario');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Error de conexión al cargar el perfil');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
    }
  }, [open, userId, fetchUserProfile]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getDisplayName = () => {
    if (!profileData) return username || 'Usuario';
    
    if (profileData.first_name || profileData.last_name) {
      return `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
    }
    
    return profileData.username || username || 'Usuario';
  };

  return (    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
          margin: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div">
          Perfil de Usuario
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : profileData ? (
          <Box>            {/* Header con avatar y nombre */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              mb: 3,
              p: { xs: 1.5, sm: 2 },
              backgroundColor: '#f8f9ff',
              borderRadius: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              textAlign: { xs: 'center', sm: 'left' }
            }}>            <Avatar 
              src={profileData.profile_picture} 
              sx={{ width: { xs: 60, sm: 80 }, height: { xs: 60, sm: 80 } }}
              onError={() => {
                console.log('Error cargando imagen del perfil:', profileData.profile_picture);
              }}
            >
              {(!profileData.profile_picture) && getDisplayName().charAt(0).toUpperCase()}
            </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                  <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, wordBreak: 'break-word' }}>
                    {getDisplayName()}
                  </Typography>
                  {profileData.is_verified_seller && (
                    <VerifiedIcon 
                      sx={{ color: '#1976d2', fontSize: { xs: '1.25rem', sm: '1.5rem' } }} 
                      titleAccess="Vendedor verificado - Email institucional UOH"
                    />
                  )}
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ wordBreak: 'break-all' }}>
                  {profileData.email}
                </Typography>
              </Box>
            </Box>{/* Information Cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Verification Status Card */}
              <Box 
                sx={{ 
                  p: { xs: 1.5, sm: 2 }, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 2, 
                  backgroundColor: profileData.is_verified_seller ? '#e8f5e8' : '#fff3e0',
                  borderLeft: `4px solid ${profileData.is_verified_seller ? '#4caf50' : '#ff9800'}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <VerifiedIcon sx={{ 
                    mr: 1, 
                    fontSize: 18, 
                    color: profileData.is_verified_seller ? '#4caf50' : '#ff9800' 
                  }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    Estado de verificación
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                  {profileData.is_verified_seller 
                    ? 'Vendedor verificado - Email institucional UOH'
                    : 'No verificado - Solo email institucional UOH puede vender'
                  }
                </Typography>
              </Box>
              
              {profileData.bio && (
                <Box 
                  sx={{ 
                    p: { xs: 1.5, sm: 2 }, 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    backgroundColor: '#f9f9f9',
                    borderLeft: '4px solid #1976d2'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ContactsIcon sx={{ mr: 1, fontSize: 18, color: '#1976d2' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      Biografía
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                    {profileData.bio}
                  </Typography>
                </Box>
              )}
                
              {profileData.location && (
                <Box 
                  sx={{ 
                    p: { xs: 1.5, sm: 2 }, 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    backgroundColor: '#f9f9f9',
                    borderLeft: '4px solid #4caf50'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ mr: 1, fontSize: 18, color: '#4caf50' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      Ubicación
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
                    {profileData.location}
                  </Typography>
                </Box>
              )}
                
              {profileData.birth_date && (
                <Box 
                  sx={{ 
                    p: { xs: 1.5, sm: 2 }, 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 2, 
                    backgroundColor: '#f9f9f9',
                    borderLeft: '4px solid #ff9800'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CakeIcon sx={{ mr: 1, fontSize: 18, color: '#ff9800' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      Fecha de Nacimiento
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {formatDate(profileData.birth_date)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Alert severity="info">No se encontró información del usuario</Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
