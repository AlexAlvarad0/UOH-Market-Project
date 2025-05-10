import React from 'react';
import * as Avatar from '@radix-ui/react-avatar';

interface UserAvatarProps {
  imageUrl?: string;
  username?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  imageUrl, 
  username, 
  size = 'medium',
  className = '' 
}) => {
  // Mapeo de tamaños
  const sizeMap = {
    small: '32px',
    medium: '48px',
    large: '96px',
  };

  const avatarSize = sizeMap[size];
  const initialsSize = {
    small: '0.9rem',
    medium: '1.2rem',
    large: '2rem',
  };

  // Obtener iniciales del username
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <Avatar.Root 
      className={`inline-flex items-center justify-center overflow-hidden rounded-full ${className}`} 
      style={{ width: avatarSize, height: avatarSize }}
    >
      <Avatar.Image
        className="h-full w-full object-cover"
        src={imageUrl}
        alt={username || 'Avatar'}
      />
      <Avatar.Fallback
        className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-700"
        style={{ fontSize: initialsSize[size] }}
        delayMs={600}
      >
        {getInitials(username)}
      </Avatar.Fallback>
    </Avatar.Root>
  );
};

export default UserAvatar;
