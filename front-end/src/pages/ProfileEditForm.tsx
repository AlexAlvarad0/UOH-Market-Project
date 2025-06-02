import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, TextField, CircularProgress, Typography, IconButton } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import apiService from '../services/api';

interface ProfileEditFormProps {
  onProfileSaved?: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ onProfileSaved }) => {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const response = await apiService.getUserProfile();
      if (response.success) {
        setUsername(response.data.username);
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');
        setBio(response.data.bio || '');
        setLocation(response.data.location || '');
        setBirthDate(response.data.birth_date || '');
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
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('bio', bio);
    formData.append('location', location);
    formData.append('birth_date', birthDate);
    if (profileImage) {
      formData.append('profile_picture', profileImage);
    }

    const response = await apiService.updateUserProfile(formData);    setSaving(false);
    if (response.success) {
      setSuccessMsg('Perfil actualizado correctamente');
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

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Avatar src={previewUrl} sx={{ width: 80, height: 80 }} />
        <IconButton component="label" sx={{ ml: -4, mt: 4 }}>
          <input hidden accept="image/*" type="file" onChange={handleImageChange} />
          <PhotoCamera />
        </IconButton>
      </Box>
      <TextField label="Nombre de Usuario" value={username} onChange={e => setUsername(e.target.value)} required fullWidth />
      <TextField label="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} fullWidth />
      <TextField label="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
      <TextField label="Bio" value={bio} onChange={e => setBio(e.target.value)} multiline rows={3} fullWidth />
      <TextField label="Ubicación" value={location} onChange={e => setLocation(e.target.value)} fullWidth />
      <TextField type="date" label="Fecha de Nacimiento" value={birthDate} onChange={e => setBirthDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
      {error && <Typography color="error">{error}</Typography>}
      {successMsg && <Typography color="primary">{successMsg}</Typography>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button variant="contained" color="primary" type="submit" disabled={saving}>
          {saving ? <CircularProgress size={24} /> : 'Guardar Cambios'}
        </Button>
        <Button variant="outlined" onClick={() => onProfileSaved ? onProfileSaved() : navigate('/profile')}>Cancelar</Button>
      </Box>
    </Box>
  );
};

export default ProfileEditForm;
