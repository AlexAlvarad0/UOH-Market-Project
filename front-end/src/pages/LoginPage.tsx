import { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../hooks/useAuth.hooks';
import { useNavigate } from 'react-router-dom';
import '../styles/AuthStyles.css';
import { auth } from '../services/api';
import PersonIcon from '@mui/icons-material/Person';
import PasswordIcon from '@mui/icons-material/Password';
import EmailIcon from '@mui/icons-material/Email';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Toast from '../components/common/Toast';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { Box, GlobalStyles } from '@mui/material';
import Squares from '../../y/Squares/Squares';
import OTPVerificationModal from '../components/OTPVerificationModal';
import GoogleLoginButton from '../components/GoogleLoginButton';

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

const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Estados para controlar la visibilidad de las contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para notificaciones toast
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('error');
  const toastDuration = 3000; // 3 segundos

  // Estado para mostrar requisitos de contraseña
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [passwordReqsStatus, setPasswordReqsStatus] = useState<boolean[]>([false, false, false, false, false]);
  // Estados para reseteo de contraseña
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // Estados para verificación OTP
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpResendInfo, setOtpResendInfo] = useState<{
    resendCount: number;
    maxResends: number;
    nextResendWait?: number;
    canResend: boolean;
    remainingTime?: number;
  }>({
    resendCount: 0,
    maxResends: 3,
    canResend: true
  });

  // Timer para countdown del reenvío
  const [resendTimer, setResendTimer] = useState<number | null>(null);

  // Formik para reseteo de contraseña
  const forgotPasswordFormik = useFormik({
    initialValues: {
      email: ''
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Correo inválido').required('Correo es requerido')
    }),    onSubmit: async (values, { setSubmitting }) => {
      try {
        console.log('Enviando solicitud de reseteo para:', values.email);
        const response = await auth.requestPasswordReset(values.email);
        console.log('Respuesta del reseteo:', response);
        if (response.success) {
          setResetEmailSent(true);
          triggerToast('Se ha enviado un correo con las instrucciones para restablecer tu contraseña.', 'success');        } else {
          console.error('Error en reseteo:', response.error);
          let errorMessage = 'Error al enviar el correo de reseteo';
          
          if (response.error) {
            if (typeof response.error === 'string') {
              errorMessage = response.error;
            } else if (response.error.message) {
              errorMessage = response.error.message;
            } else if (response.error.error) {
              errorMessage = response.error.error;
            }
          }
          
          triggerToast(errorMessage, 'error');
        }
      } catch (error: unknown) {
        console.error('Exception en reseteo:', error);
        let errorMsg = 'Error al solicitar reseteo de contraseña: ';
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
  });  // Mueve la función triggerToast aquí:
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setShowToast(false);
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setShowToast(true), 0);
  };
  // Funciones para manejar OTP
  const handleOTPSubmit = async (code: string) => {
    try {
      const response = await auth.verifyEmail(registeredEmail, code);
      if (response.success) {
        setShowOTPModal(false);
        triggerToast('¡Email verificado exitosamente! Tu cuenta está ahora activa.', 'success');
        // Limpiar estados
        setRegisteredEmail('');
        setOtpResendInfo({
          resendCount: 0,
          maxResends: 3,
          canResend: true
        });
        // Opcional: redirigir al login
      } else {
        triggerToast(response.error?.error || 'Código incorrecto. Inténtalo nuevamente.', 'error');      }
    } catch (error: unknown) {
      console.error('Error al verificar OTP:', error);
      triggerToast('Error al verificar el código. Inténtalo nuevamente.', 'error');
    }
  };  // Función para manejar el éxito del login con Google
  const handleGoogleLoginSuccess = async (response: { 
    success: boolean; 
    token?: string;
    user?: {
      id: string;
      email: string;
      username: string;
      first_name: string;
      last_name: string;
    };
    data?: { 
      requires_verification?: boolean; 
      email?: string; 
      message?: string; 
    }; 
    message?: string;
    error?: string | { error: string } | { [key: string]: string[] }; 
  }) => {
    try {
      if (response.success) {        
        // Si requiere verificación OTP (usuario nuevo)
        if (response.data?.requires_verification) {
          setRegisteredEmail(response.data.email || '');
          setShowOTPModal(true);
          triggerToast('¡Cuenta creada con Google! Verifica tu email con el código que te enviamos.', 'success');        } else {          
          // Login exitoso directo (usuario existente o demo)
          
          if (!response.token || !response.user) {
            triggerToast('Error al procesar login con Google', 'error');
            return;
          }const loginSuccess = await authLogin({
            token: response.token,
            user: {
              id: parseInt(response.user.id) || 0,
              username: response.user.username,
              email: response.user.email,
              is_email_verified: true,
              profile: {
                first_name: response.user.first_name,
                last_name: response.user.last_name
              }
            }
          });
          
          if (loginSuccess) {
            triggerToast(response.message || 'Login exitoso con Google', 'success');
            navigate('/', { replace: true });
          } else {
            triggerToast('Error al inicializar la sesión con Google', 'error');
          }
        }
      } else {
        console.error('Error en Google login:', response.error);
        let errorMessage = 'Error al iniciar sesión con Google';
          if (response.error) {
          if (typeof response.error === 'string') {
            errorMessage = response.error;
          } else if (typeof response.error === 'object' && 'error' in response.error) {
            const errorValue = response.error.error;
            if (typeof errorValue === 'string') {
              errorMessage = errorValue;
            } else if (Array.isArray(errorValue)) {
              errorMessage = errorValue.join(', ');
            }
          }
        }
        
        triggerToast(errorMessage, 'error');
      }
    } catch (error: unknown) {
      console.error('Exception en Google login:', error);
      let errorMsg = 'Error al iniciar sesión con Google: ';
      if (error instanceof Error) {
        errorMsg += error.message;
      } else {
        errorMsg += 'Error inesperado';
      }
      triggerToast(errorMsg, 'error');
    }
  };

  // Función para manejar errores del login con Google
  const handleGoogleLoginError = (error: { error: string }) => {
    console.error('Error en Google login:', error);
    triggerToast(error.error || 'Error al iniciar sesión con Google', 'error');
  };

  const handleOTPCancel = () => {
    setShowOTPModal(false);
    setRegisteredEmail('');
    setOtpResendInfo({
      resendCount: 0,
      maxResends: 3,
      canResend: true
    });
  };

  const handleResendOTP = async () => {
    try {
      const response = await auth.resendVerificationCode(registeredEmail);
      if (response.success) {
        // Actualizar información de reenvío
        setOtpResendInfo({
          resendCount: response.data.resend_count,
          maxResends: response.data.max_resends,
          canResend: response.data.resend_count < response.data.max_resends,
          nextResendWait: response.data.next_resend_wait_minutes
        });
        
        triggerToast('Código reenviado exitosamente', 'success');
        
        // Iniciar countdown si hay tiempo de espera
        if (response.data.next_resend_wait_minutes) {
          const waitTime = response.data.next_resend_wait_minutes * 60; // convertir a segundos
          setResendTimer(waitTime);
          
          const interval = setInterval(() => {
            setResendTimer((prev) => {
              if (prev && prev <= 1) {
                clearInterval(interval);
                setOtpResendInfo(prevInfo => ({ ...prevInfo, canResend: true }));
                return null;
              }
              return prev ? prev - 1 : null;
            });
          }, 1000);
        }
      } else {
        triggerToast(response.error?.error || 'Error al reenviar código', 'error');      }
    } catch (error: unknown) {
      console.error('Error al reenviar OTP:', error);
      triggerToast('Error al reenviar código', 'error');
    }
  };

  const registerFormik = useFormik({
    initialValues: {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      username: Yup.string().required('Nombre de usuario es requerido'),
      email: Yup.string().email('Correo inválido').required('Correo es requerido'),
      firstName: Yup.string().required('Nombre es requerido'),
      lastName: Yup.string().required('Apellido es requerido'),      password: Yup.string()
        .min(10, 'La contraseña debe tener al menos 10 caracteres')
        .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
        .matches(/[a-z]/, 'Debe contener al menos una minúscula')
        .matches(/[0-9]/, 'Debe contener al menos un número')
        .matches(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo')
        .required('Contraseña es requerida'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Las contraseñas deben coincidir')
        .required('Confirmación de contraseña es requerida')
    }),
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        const response = await auth.register(
          values.username,
          values.email,
          values.password,
          values.firstName,
          values.lastName        );        if (response.success) {
          console.log('=== REGISTRO EXITOSO ===');
          console.log('Respuesta completa:', response);
          console.log('response.data:', response.data);
          console.log('requires_verification:', response.data?.requires_verification);
          
          // Verificar si requiere verificación OTP
          if (response.data && response.data.requires_verification) {
            console.log('Mostrando modal OTP para email:', response.data.email);
            // Mostrar modal OTP en lugar del toast de éxito inmediato
            setRegisteredEmail(response.data.email);
            setShowOTPModal(true);
            setIsSignUp(false); // Cambiar al panel de login
            triggerToast('¡Registro exitoso! Verifica tu email con el código que te enviamos.', 'success');
          } else {
            // Flujo antiguo para compatibilidad
            triggerToast('¡Registro exitoso!', 'success');
            resetForm();
            togglePanel();
          }
        } else {
          console.error('Respuesta de error desde el servidor:', response.error);
          
          if (response.error && typeof response.error === 'object') {
            const errorFields = response.error;
            
            // Verificar si hay errores específicos de campos
            if (errorFields.email || errorFields.username || errorFields.password || errorFields.firstName || errorFields.lastName) {
              const formikErrors: {
                email?: string,
                username?: string,
                password?: string,
                firstName?: string,
                lastName?: string,
                confirmPassword?: string
              } = {};
              
              if (errorFields.email && Array.isArray(errorFields.email)) {
                formikErrors.email = errorFields.email[0];
                triggerToast(errorFields.email[0], 'error');
              } else if (errorFields.username && Array.isArray(errorFields.username)) {
                formikErrors.username = errorFields.username[0];
                triggerToast(errorFields.username[0], 'error');
              } else if (errorFields.password && Array.isArray(errorFields.password)) {
                formikErrors.password = errorFields.password[0];
                triggerToast(errorFields.password[0], 'error');
              } else if (errorFields.firstName && Array.isArray(errorFields.firstName)) {
                formikErrors.firstName = errorFields.firstName[0];
                triggerToast(errorFields.firstName[0], 'error');
              } else if (errorFields.lastName && Array.isArray(errorFields.lastName)) {
                formikErrors.lastName = errorFields.lastName[0];
                triggerToast(errorFields.lastName[0], 'error');
              }
              
              registerFormik.setErrors(formikErrors);
            } else {
              triggerToast('Error en el registro. Por favor, verifica los datos proporcionados.', 'error');
            }
          } else {
            triggerToast(response.error || 'Error al registrarse. Por favor, intenta nuevamente.', 'error');
          }
        }
      } catch (error: unknown) {
        let errorMsg = 'Error en el registro: ';
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

  // Al hacer clic en Registrarse, disparar toast si contraseñas no coinciden
  const handleRegisterClick = () => {
    if (registerFormik.values.password !== registerFormik.values.confirmPassword) {
      triggerToast('Las contraseñas no coinciden', 'error');
    }
  };

  const togglePanel = () => setIsSignUp(!isSignUp);

  useEffect(() => {
    if (isSignUp && registerFormik.values.password) {
      setPasswordReqsStatus(passwordRequirements.map(req => req.test(registerFormik.values.password)));
    } else {
      setPasswordReqsStatus([false, false, false, false, false]);
    }
  }, [registerFormik.values.password, isSignUp]);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Correo inválido').required('Requerido'),
      password: Yup.string().required('')
    }),
    onSubmit: async (values, { setErrors }) => {
      // Verificar si hay campos vacíos
      if (!values.email || !values.password) {
        setToastMessage('Por favor complete todos los campos requeridos');
        setToastType('error');
        setShowToast(true);
        return;
      }

      try {
        const response = await auth.login(values.email, values.password);        if (response.success && response.data) {
          
          if (!response.data.token) {
            return;
          }
          
          const loginSuccess = await authLogin(response.data);
          
          if (loginSuccess) {
            navigate('/', { replace: true });
          } else {
            setToastMessage('Error al inicializar la sesión');
            setToastType('error');
            setShowToast(true);
          }
        } else {
          
          if (response.error && typeof response.error === 'object') {
            const errorFields = response.error;
            
            if (errorFields.email || errorFields.password) {
              const formikErrors: {email?: string, password?: string} = {};
              
              if (errorFields.email && Array.isArray(errorFields.email)) {
                formikErrors.email = errorFields.email[0];
              }
              
              if (errorFields.password && Array.isArray(errorFields.password)) {
                formikErrors.password = errorFields.password[0];
              }
              
              setErrors(formikErrors);
              setToastMessage('Error en los datos proporcionados. Por favor, verifica tus credenciales.');
              setToastType('error');
              setShowToast(true);
            } else {
              setToastMessage('Error en los datos proporcionados. Por favor, verifica tus credenciales.');
              setToastType('error');
              setShowToast(true);
            }
          } else {
            setToastMessage(response.error || 'Error al iniciar sesión. Verifica tus credenciales.');
            setToastType('error');
            setShowToast(true);
          }
        }
      } catch (error: unknown) {
        let errorMsg = 'Error al iniciar sesión: ';
        if (error instanceof Error) {
          errorMsg += error.message;
        } else {
          errorMsg += 'Error inesperado';
        }
        setToastMessage(errorMsg);
        setToastType('error');
        setShowToast(true);
      }
    }
  });

  const handleCloseToast = () => {
    setShowToast(false);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), toastDuration);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Mostrar toast para error de contraseñas no coinciden
  useEffect(() => {
    if (registerFormik.touched.confirmPassword && registerFormik.errors.confirmPassword) {
      triggerToast(registerFormik.errors.confirmPassword!, 'error');
    }
  }, [registerFormik.errors.confirmPassword, registerFormik.touched.confirmPassword]);
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
          '.container': {
            backgroundColor: '#ffffff !important',
          },
          '.form-container': {
            backgroundColor: 'rgba(255, 255, 255, 0.95) !important',
          },
          '.overlay-container': {
            backgroundColor: 'transparent !important',
          },
          '.MuiBox-root': {
            backgroundColor: 'transparent !important',
          }
        }}
      />      {/* Fondo animado con Squares */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: '#ffffff !important',
          overflow: 'hidden',
        }}
      >
        <Squares
          speed={0.5}
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
      
      {/* Modal para reseteo de contraseña */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Restablecer contraseña</h2>
              <CloseIcon 
                className="modal-close-icon" 
                onClick={() => setShowForgotPassword(false)}
              />
            </div>
            
            {!resetEmailSent ? (
              <form onSubmit={forgotPasswordFormik.handleSubmit}>
                <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
                
                <div className="input-container">
                  <EmailIcon className="input-icon" />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    name="email"
                    value={forgotPasswordFormik.values.email}
                    onChange={forgotPasswordFormik.handleChange}
                  />
                </div>
                {forgotPasswordFormik.errors.email && forgotPasswordFormik.touched.email && (
                  <div className="error-text">{forgotPasswordFormik.errors.email}</div>
                )}
                
                <div className="modal-buttons">
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button"
                    disabled={forgotPasswordFormik.isSubmitting}
                  >
                    {forgotPasswordFormik.isSubmitting ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="reset-email-sent">
                <CheckIcon style={{ color: '#27ae60', fontSize: 48, marginBottom: '16px' }} />
                <p>¡Correo enviado!</p>
                <p>Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.</p>
                <button 
                  className="submit-button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    forgotPasswordFormik.resetForm();
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={`container ${isSignUp ? 'right-panel-active' : ''}`} id="container">
        <div className="form-container sign-up-container">
          <form onSubmit={registerFormik.handleSubmit}>
            <h1>Crear Cuenta</h1>
            
            <div className="register-columns">
              {/* Nombre de usuario */}
              <div className="register-column">
                <div className="input-container">
                  <PersonIcon className="input-icon" />
                  <input
                    type="text"
                    placeholder="Nombre de usuario"
                    name="username"
                    value={registerFormik.values.username}
                    onChange={registerFormik.handleChange}
                  />
                </div>
                {registerFormik.errors.username && registerFormik.touched.username && (
                  <div className="error-text">{registerFormik.errors.username}</div>
                )}
              </div>

              {/* Correo electrónico */}
              <div className="register-column">
                <div className="input-container">
                  <EmailIcon className="input-icon" />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    name="email"
                    value={registerFormik.values.email}
                    onChange={registerFormik.handleChange}
                  />
                </div>
                {registerFormik.errors.email && registerFormik.touched.email && (
                  <div className="error-text">{registerFormik.errors.email}</div>
                )}
              </div>

              {/* Nombre */}
              <div className="register-column">
                <div className="input-container">
                  <PersonIcon className="input-icon" />
                  <input
                    type="text"
                    placeholder="Nombre"
                    name="firstName"
                    value={registerFormik.values.firstName}
                    onChange={registerFormik.handleChange}
                  />
                </div>
                {registerFormik.errors.firstName && registerFormik.touched.firstName && (
                  <div className="error-text">{registerFormik.errors.firstName}</div>
                )}
              </div>

              {/* Apellido */}
              <div className="register-column">
                <div className="input-container">
                  <PersonIcon className="input-icon" />
                  <input
                    type="text"
                    placeholder="Apellido"
                    name="lastName"
                    value={registerFormik.values.lastName}
                    onChange={registerFormik.handleChange}
                  />
                </div>
                {registerFormik.errors.lastName && registerFormik.touched.lastName && (
                  <div className="error-text">{registerFormik.errors.lastName}</div>
                )}
              </div>

              {/* Contraseña */}
              <div className="register-column" style={{ position: 'relative' }}>
                <div className="input-container">
                  <PasswordIcon className="input-icon" />
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    name="password"
                    value={registerFormik.values.password}
                    onChange={registerFormik.handleChange}
                    onFocus={() => setShowPasswordReqs(true)}
                    onBlur={() => setShowPasswordReqs(false)}
                  />
                  <div className="password-toggle" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                    {showRegisterPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                {registerFormik.errors.password && registerFormik.touched.password && (
                  <div className="error-text">{registerFormik.errors.password}</div>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="register-column">
                <div className="input-container">
                  <PasswordIcon className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmar contraseña"
                    name="confirmPassword"
                    value={registerFormik.values.confirmPassword}
                    onChange={registerFormik.handleChange}
                  />
                  <div className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </div>
                </div>
                {registerFormik.errors.confirmPassword && registerFormik.touched.confirmPassword && (
                  <div className="error-text">{registerFormik.errors.confirmPassword}</div>
                )}
              </div>
            </div>
            
            <button 
              type="submit" 
              className="register-button"
              onClick={handleRegisterClick}
            >
              REGISTRARSE
            </button>
          </form>
        </div>
        <div className="form-container sign-in-container">
          <form onSubmit={formik.handleSubmit}>
            <h1>INICIAR SESIÓN</h1>
            
            <div className="input-container">
              <EmailIcon className="input-icon" />
              <input
                type="email"
                placeholder="Correo electrónico"
                name="email"
                value={formik.values.email}
                onChange={formik.handleChange}
              />
            </div>
            {formik.errors.email && formik.touched.email && (
              <div className="error-text">{formik.errors.email}</div>
            )}
            
            <div className="input-container">
              <PasswordIcon className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                name="password"
                value={formik.values.password}
                onChange={formik.handleChange}
              />
              <div className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </div>
            </div>
            {formik.errors.password && formik.touched.password && (
              <div className="error-text">{formik.errors.password}</div>
            )}
              <div className="forgot-password-link">
              <a href="#" onClick={(e) => {
                e.preventDefault();
                setShowForgotPassword(true);
              }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            
            <button type="submit">INICIAR SESIÓN</button>
            
            {/* Botón de Google Login */}
            <GoogleLoginButton
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
          </form>
        </div>
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>¡Bienvenido de nuevo!</h1>
              <p>Inicie sesión con su sus credenciales</p>
              <button className="ghost" style={{ backgroundColor: "#002C54" }} onClick={togglePanel}>INICIAR SESIÓN</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>¡Bienvenido a UOH Market!</h1>
              <p>Regístrese si aún no lo ha hecho para ser parte de la comunidad Mercadito UOH</p>
              <button className="ghost" style={{ backgroundColor: "#002C54" }} onClick={togglePanel}>REGISTRARSE</button>
            </div>
          </div>
        </div>        {/* Formulario de reseteo de contraseña */}
        {showForgotPassword && (
          <div className="forgot-password-container">
            <div className="forgot-password-content">
              <h2>Restablecer Contraseña</h2>
              
              <div className="close-forgot-password" onClick={() => setShowForgotPassword(false)}>
                <CloseIcon />
              </div>
            </div>
          </div>
        )}
      </div>      {/* Modal para verificación OTP */}
      {showOTPModal && (
        <OTPVerificationModal
          email={registeredEmail}
          onSubmit={handleOTPSubmit}
          onCancel={handleOTPCancel}
          onResend={handleResendOTP}
          resendDisabled={!otpResendInfo.canResend}
          resendCountdown={resendTimer || 0}
          resendCount={otpResendInfo.resendCount}
          maxResends={otpResendInfo.maxResends}
        />
      )}
    </>
  );
};

export default LoginPage;
