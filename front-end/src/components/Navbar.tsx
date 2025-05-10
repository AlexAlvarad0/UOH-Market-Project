// Ubicar donde se muestra la navegación para usuarios autenticados y añadir:

import UserAvatar from './UserAvatar';

// Dentro del componente, donde muestras opciones para usuarios autenticados
<Link to="/profile" className="flex items-center gap-2 hover:text-blue-500">
  <UserAvatar 
    imageUrl={userData?.profile_picture} 
    username={userData?.username} 
    size="small" 
  />
  <span>Mi Perfil</span>
</Link>
