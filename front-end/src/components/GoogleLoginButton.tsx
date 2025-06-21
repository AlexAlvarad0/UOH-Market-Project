import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { auth } from '../services/api';

interface GoogleLoginData {
  token?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  requires_verification?: boolean;
  email?: string;
  message?: string;
  verification_code?: string;
}

interface GoogleLoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  data?: GoogleLoginData; // Para casos que requieren verificación
  message?: string;
  error?: string | { error: string } | { [key: string]: string[] };
}

interface GoogleLoginButtonProps {
  onSuccess: (response: GoogleLoginResponse) => void;
  onError: (error: { error: string }) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        const response = await auth.googleLogin(credentialResponse.credential);
        onSuccess(response);
      } else {
        onError({ error: 'No se recibió credencial de Google' });
      }
    } catch (error) {
      console.error('Error en Google login:', error);
      onError({ error: 'Error interno al procesar login de Google' });
    }
  };
  
  const handleGoogleError = () => {
    onError({ 
      error: 'Error al inicializar Google OAuth. Verifica la configuración del cliente.' 
    });
  };

  return (
    <GoogleOAuthProvider 
      clientId="806140741515-b6u96b645s99tpv7ua14q2gpq16cdmb6.apps.googleusercontent.com"
      onScriptLoadError={() => {
        console.error('Error al cargar el script de Google OAuth');
        onError({ error: 'Error al cargar Google OAuth' });
      }}
    >
      <div className="google-login-container">
        {/* Separador */}
        <div className="google-login-separator">
          <hr className="separator-line" />
          <span className="separator-text">o</span>
          <hr className="separator-line" />
        </div>

        {/* Botón de Google */}
        <div className="google-login-button-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text="signin_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width="280"
            locale="es"
            useOneTap={false}
            auto_select={false}
            cancel_on_tap_outside={true}
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleLoginButton;
