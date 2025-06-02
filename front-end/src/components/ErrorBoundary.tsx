import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: _, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Error in component:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          p: 3 
        }}>
          <Paper sx={{ p: 4, maxWidth: 600, textAlign: 'center' }} elevation={5}>
            <Typography variant="h5" color="error" gutterBottom>
              Algo salió mal
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Ha ocurrido un error al cargar esta sección. Por favor, intente de nuevo más tarde.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
