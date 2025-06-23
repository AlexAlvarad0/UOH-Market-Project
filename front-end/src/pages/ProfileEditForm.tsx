import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, TextField, CircularProgress, Typography, IconButton, Tabs, Tab, InputAdornment } from '@mui/material';
import { PhotoCamera, Visibility, VisibilityOff } from '@mui/icons-material';
import apiService from '../services/api';
import LocationSelector from '../components/LocationSelector';
import { passwordRequirements } from '../utils/passwordRequirements';
import { useAuth } from '../hooks/useAuth.hooks';

interface ProfileEditFormProps {
  onProfileSaved?: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ onProfileSaved }) => {
  const { updateUser } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReqsStatus, setPasswordReqsStatus] = useState<boolean[]>(passwordRequirements.map(() => false));

  const navigate = useNavigate();
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const response = await apiService.getUserProfile();      if (response.success) {
        setUsername(response.data.username);
        setEmail(response.data.email || '');
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');setBio(response.data.bio || '');
        setLocation(response.data.location || '');        // Formatear la fecha correctamente - extraer solo YYYY-MM-DD
        const birthDateValue = response.data.birth_date;
        if (birthDateValue) {
          // Si tiene formato ISO (con T), extraer solo la fecha
          const dateOnly = birthDateValue.includes('T') ? birthDateValue.split('T')[0] : birthDateValue;
          setBirthDate(dateOnly);
        } else {
          setBirthDate('');
        }
        setPreviewUrl(response.data.profile_picture);
      } else {
        setError(response.error || 'Error al cargar el perfil');
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      // Crear una URL temporal para previsualizar la imagen
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('bio', bio);
    formData.append('location', location);// Enviar la fecha exactamente como está (formato YYYY-MM-DD)
    if (birthDate) {
      formData.append('birth_date', birthDate);
    }    if (profileImage) {
      formData.append('profile_picture_upload', profileImage);
    }const response = await apiService.updateUserProfile(formData);
    setSaving(false);
    if (response.success) {
      setSuccessMsg('Perfil actualizado correctamente');
        // Actualizar el usuario en el contexto de autenticación
      updateUser({
        username,
        email: email || response.data.email,
        profile: {
          first_name: firstName,
          last_name: lastName,
          bio,
          location,
        },
        profile_picture: response.data.profile_picture || undefined,
      });
      
      // Llamar al callback si está disponible, sino navegar
      if (onProfileSaved) {
        setTimeout(() => {
          onProfileSaved();
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      }
    } else {
      setError(response.error || 'Error al actualizar el perfil');
    }
  };

  // Handler para cambiar pestaña
  const handleTabChange = (_: React.SyntheticEvent, newValue: 'profile' | 'password') => {
    setActiveTab(newValue);
    setError(null);
    setSuccessMsg(null);
  };

  // Submit cambio de contraseña
  const handleChangePassword = async () => {
    // Validar igual con actual
    if (oldPassword === newPassword) {
      setError('La nueva contraseña no puede ser igual a la actual');
      return;
    }
    // Validar nueva contraseña
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    for (const { label, test } of passwordRequirements) {
      if (!test(newPassword)) {
        setError(`La contraseña debe cumplir: ${label}`);
        return;
      }
    }
    setSaving(true);
    const response = await apiService.changePassword(oldPassword, newPassword, confirmPassword);
    setSaving(false);
    if (response.success) {
      setSuccessMsg('Contraseña cambiada exitosamente');
      // Limpiar campos
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(response.error || 'Error al cambiar contraseña');
    }
  };

  // Actualizar estado de requisitos cuando cambie newPassword
  useEffect(() => {
    setPasswordReqsStatus(passwordRequirements.map(req => req.test(newPassword)));
  }, [newPassword]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center',
        px: '10px'  // margen de 10px a ambos lados
      }}
    >
      <Tabs value={activeTab} onChange={handleTabChange} centered>
        <Tab label="Perfil" value="profile" />
        <Tab label="Contraseña" value="password" />
      </Tabs>

      {activeTab === 'profile' ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Avatar src={previewUrl} sx={{ width: 80, height: 80 }} />
            <IconButton component="label" sx={{ ml: -4, mt: 4 }}>
              <input hidden accept="image/*" type="file" onChange={handleImageChange} />
              <PhotoCamera />
            </IconButton>
          </Box>          <TextField
            label="Nombre de Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            sx={{ width: '100%', maxWidth: '600px' }}
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            sx={{ width: '100%', maxWidth: '600px' }}
            helperText="Use su email institucional @uoh.cl o @pregrado.uoh.cl para obtener verificación de vendedor"
          />
          <TextField
            label="Nombre"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            sx={{ width: '100%', maxWidth: '600px' }}
          />
          <TextField
            label="Apellido"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            sx={{ width: '100%', maxWidth: '600px' }}
          />
          <TextField
            label="Bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            multiline
            rows={3}
            sx={{ width: '100%', maxWidth: '600px' }}
          />
          <Box sx={{ width: '100%', maxWidth: '600px' }}>
            <LocationSelector value={location} onChange={setLocation} />
          </Box>          <TextField
            type="date"
            label="Fecha de Nacimiento"
            value={birthDate}            onChange={e => {
              const selectedDate = e.target.value;
              // Mantener la fecha exactamente como viene del input
              setBirthDate(selectedDate);
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: '100%', maxWidth: '600px' }}
          />
          {error && <Typography color="error">{error}</Typography>}
          {successMsg && <Typography color="primary">{successMsg}</Typography>}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button variant="contained" color="primary" type="submit" disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Guardar Cambios'}
            </Button>
            <Button variant="outlined" onClick={() => onProfileSaved ? onProfileSaved() : navigate('/profile')}>Cancelar</Button>
          </Box>
        </>
      ) : (
        // Pestaña de cambiar contraseña
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, width: '100%' }}>
          <TextField
            label="Contraseña Actual"
            type={showOldPassword ? 'text' : 'password'}
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowOldPassword(prev => !prev)} edge="end">
                    {showOldPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            fullWidth
          />
          <TextField
            label="Nueva Contraseña"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowNewPassword(prev => !prev)} edge="end">
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            fullWidth
          />
          {/* Checklist de requisitos */}
          <Box sx={{ pl: 1 }}>
            {passwordRequirements.map((req, idx) => (
              <Typography
                key={req.label}
                variant="caption"
                color={passwordReqsStatus[idx] ? 'success.main' : 'error'}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}
              >
                {passwordReqsStatus[idx] ? '✔' : '•'} {req.label}
              </Typography>
            ))}
          </Box>
          <TextField
            label="Confirmar Contraseña"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowConfirmPassword(prev => !prev)} edge="end">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            fullWidth
          />
          {error && <Typography color="error">{error}</Typography>}
          {successMsg && <Typography color="primary">{successMsg}</Typography>}
          <Button variant="contained" onClick={handleChangePassword} disabled={saving}>
            Cambiar Contraseña
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ProfileEditForm;
