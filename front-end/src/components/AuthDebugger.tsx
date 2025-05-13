import { useAuth } from '../hooks/useAuth.hooks';
import { Button, Typography, Box, Paper } from '@mui/material';

const AuthDebugger = () => {
  const { user, logout } = useAuth();
  const token = localStorage.getItem('authToken');
  
  const clearAllStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('All storage cleared');
    window.location.reload();
  };
  
  return (
    <Paper sx={{ p: 2, mt: 2, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h6">Auth Debug Info</Typography>
      
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2">
          <strong>Current User:</strong> {user ? JSON.stringify(user) : 'No user'}
        </Typography>
      </Box>
      
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2">
          <strong>Token:</strong> {token ? `${token.substring(0, 10)}...` : 'No token'}
        </Typography>
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button 
          variant="outlined" 
          color="secondary" 
          size="small" 
          onClick={logout}
        >
          Logout
        </Button>
        <Button 
          variant="outlined" 
          color="error" 
          size="small"
          onClick={clearAllStorage}
        >
          Clear All Storage
        </Button>
      </Box>
      
      <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
        This component is for debugging only and should be removed in production.
      </Typography>
    </Paper>
  );
};

export default AuthDebugger;
