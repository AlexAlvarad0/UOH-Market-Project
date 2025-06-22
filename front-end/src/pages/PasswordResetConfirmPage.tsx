import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { auth } from '../services/api';
import Toast from '../components/common/Toast';
import PasswordIcon from '@mui/icons-material/Password';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import '../styles/AuthStyles.css';
import { Box, GlobalStyles } from '@mui/material';
import Squares from '../../y/Squares/Squares';

// Utilidad para validar requisitos de contraseña
const passwordRequirements = [
  {
    label: 'Al menos 10 caracteres',
    test: (pw: string) => pw.length >= 10,
  },
  {
    label: 'Al menos 1 mayúscula',
    test: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    label: 'Al menos 1 minúscula',
    test: (pw: string) => /[a-z]/.test(pw),
  },
  {
    label: 'Al menos 1 número',
    test: (pw: string) => /[0-9]/.test(pw),
  },
  {
    label: 'Al menos 1 símbolo',
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
];

const PasswordResetConfirmPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [passwordReqsStatus, setPasswordReqsStatus] = useState<boolean[]>([false, false, false, false, false]);
  
  // Estados para notificaciones toast
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('error');
  const toastDuration = 3000;

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setShowToast(false);
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setShowToast(true), 0);
  };

  useEffect(() => {
    if (!token) {
      triggerToast('Token de reseteo inválido', 'error');
      navigate('/login');
    }
  }, [token, navigate]);

  const formik = useFormik({
    initialValues: {
      newPassword: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      newPassword: Yup.string()
        .min(10, 'La contraseña debe tener al menos 10 caracteres')
        .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .matches(/[a-z]/, 'Debe contener al menos una minúscula')
        .matches(/[0-9]/, 'Debe contener al menos un número')
        .matches(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo')
        .required('Contraseña es requerida'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Las contraseñas deben coincidir')
        .required('Confirmación de contraseña es requerida')
    }),
    onSubmit: async (values, { setSubmitting }) => {
      if (!token) {
        triggerToast('Token de reseteo inválido', 'error');
        return;
      }

      try {
        const response = await auth.confirmPasswordReset(token, values.newPassword, values.confirmPassword);
        if (response.success) {
          triggerToast('¡Contraseña actualizada exitosamente!', 'success');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          triggerToast(response.error?.message || 'Error al actualizar la contraseña', 'error');
        }
      } catch (error: unknown) {
        let errorMsg = 'Error al actualizar la contraseña: ';
        if (error instanceof Error) {
          errorMsg += error.message;
        } else {
          errorMsg += 'Error inesperado';
        }
        triggerToast(errorMsg, 'error');
      } finally {
        setSubmitting(false);
      }
    }
  });

  useEffect(() => {
    if (formik.values.newPassword) {
      setPasswordReqsStatus(passwordRequirements.map(req => req.test(formik.values.newPassword)));
    } else {
      setPasswordReqsStatus([false, false, false, false, false]);
    }
  }, [formik.values.newPassword]);

  const handleCloseToast = () => {
    setShowToast(false);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), toastDuration);
      return () => clearTimeout(timer);
    }
  }, [showToast]);
  return (
    <>      <GlobalStyles
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
          },
          'div.reset-password-container': {
            backgroundColor: 'transparent !important',
            background: 'transparent !important',
            position: 'relative !important',
            zIndex: '10 !important',
          },
          '.reset-password-container': {
            backgroundColor: 'transparent !important',
            background: 'transparent !important',
            position: 'relative !important',
            zIndex: '10 !important',
          },
          '.reset-password-form': {
            backgroundColor: 'rgba(255, 255, 255, 0.95) !important',
            position: 'relative !important',
            zIndex: '11 !important',
          },
          '.MuiBox-root': {
            backgroundColor: 'transparent !important',
          },
          '.toast': {
            position: 'relative !important',
            zIndex: '1001 !important',
          }
        }}
      />      {/* Fondo animado con Squares */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: '#ffffff !important',
          overflow: 'hidden',
        }}
      >
        <Squares
          speed={0.25}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(0, 79, 158, 0.2)"
          hoverFillColor="rgba(0, 79, 158, 0.05)"
        />
      </Box>
      
      <Toast 
        message={toastMessage}
        type={toastType}
        show={showToast}
        onClose={handleCloseToast}
        duration={toastDuration}
      />
      
      <div className="reset-password-container">
        <div className="reset-password-form">
          <h1>Restablecer Contraseña</h1>
          <p>Ingresa tu nueva contraseña</p>
          
          <form onSubmit={formik.handleSubmit}>
            {/* Nueva contraseña */}
            <div className="input-group" style={{ position: 'relative' }}>
              <div className="input-container">
                <PasswordIcon className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nueva contraseña"
                  name="newPassword"
                  value={formik.values.newPassword}
                  onChange={formik.handleChange}
                  onFocus={() => setShowPasswordReqs(true)}
                  onBlur={() => setShowPasswordReqs(false)}
                />
                <div className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </div>
              </div>
              
              {/* Requisitos de contraseña flotantes */}
              {showPasswordReqs && (
                <div className="password-reqs-floating">
                  {passwordRequirements.map((req, idx) => (
                    <div key={req.label} className={passwordReqsStatus[idx] ? 'req-met' : 'req-unmet'} style={{display:'flex',alignItems:'center',gap:6}}>
                      {passwordReqsStatus[idx]
                        ? <CheckIcon style={{color:'#27ae60',fontSize:18}}/>
                        : <CloseIcon style={{color:'#e74c3c',fontSize:18}}/>}
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
              
              {formik.errors.newPassword && formik.touched.newPassword && (
                <div className="error-text">{formik.errors.newPassword}</div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="input-group">
              <div className="input-container">
                <PasswordIcon className="input-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar nueva contraseña"
                  name="confirmPassword"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                />
                <div className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </div>
              </div>
              {formik.errors.confirmPassword && formik.touched.confirmPassword && (
                <div className="error-text">{formik.errors.confirmPassword}</div>
              )}
            </div>
            
            <button 
              type="submit" 
              className="reset-submit-button"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
          
          <div className="back-to-login">
            <a href="#" onClick={(e) => {
              e.preventDefault();
              navigate('/login');
            }}>
              Volver al inicio de sesión
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default PasswordResetConfirmPage;
