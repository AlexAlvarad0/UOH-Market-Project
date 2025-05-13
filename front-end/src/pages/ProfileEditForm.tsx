import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import apiService from '../services/api';

const ProfileEditForm: React.FC = () => {
  // Removed unused profile state
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const response = await apiService.getUserProfile();
      if (response.success) {
        // Removed unused profile state update
        setUsername(response.data.username);
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('username', username);
    if (profileImage) {
      formData.append('profile_picture', profileImage);
    }

    const response = await apiService.updateUserProfile(formData);
    
    setSaving(false);
    if (response.success) {
      setSuccessMsg('Perfil actualizado correctamente');
      // Redirigir después de un breve delay
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } else {
      setError(response.error || 'Error al actualizar el perfil');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8">Cargando perfil...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Editar Perfil</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col items-center mb-6">
            <div 
              className="mb-4 relative cursor-pointer group" 
              onClick={triggerFileInput}
            >
              <UserAvatar
                imageUrl={previewUrl}
                username={username}
                size="large"
                className="transition-opacity group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                <span className="text-white text-sm font-medium">Cambiar foto</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Nombre de Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre de usuario"
              required
            />
          </div>

          <div className="flex items-center justify-between mt-8">
            <button
              type="submit"
              disabled={saving}
              className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition duration-200 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="text-gray-600 hover:text-gray-800 transition duration-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditForm;
