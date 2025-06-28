import { Box, Typography, Button, GlobalStyles } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Squares from '../../y/Squares/Squares';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <>
      <GlobalStyles
        styles={{
          'body': {
            backgroundColor: '#ffffff !important',
            margin: 0,
            padding: 0,
          },
          'html': {
            backgroundColor: '#ffffff !important',
          },
          '#root': {
            backgroundColor: 'transparent !important',
          }
        }}
      />
      {/* Fondo animado con Squares */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          backgroundColor: '#ffffff !important',
        }}
      >
        <Squares
          speed={0.1}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(0, 79, 158, 0.2)"
          hoverFillColor="rgba(0, 79, 158, 0.05)"
        />
      </Box>
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 64px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
      <Typography variant="h1" color="primary" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Página no encontrada
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ mt: 2 }}
      >
        Volver al inicio      </Button>
    </Box>
    </>
  );
};

export default NotFoundPage;
