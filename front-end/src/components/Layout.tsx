import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Header from './Header';

const Layout = () => {
  return (
    <Box >
      <Header />     
      <Box>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
