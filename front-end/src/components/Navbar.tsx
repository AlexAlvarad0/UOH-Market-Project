import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import UserAvatar from './UserAvatar';

const Navbar = () => {
  const { user: userData } = useAuth();

  return (
    <nav>
      {/* Other navigation items */}
      <Link to="/profile" className="flex items-center gap-2 hover:text-blue-500">
        <UserAvatar 
          imageUrl={userData?.profile_picture} 
          username={userData?.username} 
          size="small" 
        />
        <span>Mi Perfil</span>
      </Link>
    </nav>
  );
};

export default Navbar;
