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

// Utilidad para validar requisitos de contraseña
const passwordRequirements = [
  {
    label: 'Al menos 8 caracteres',
    test: (pw: string) => pw.length >= 8,
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

  // Mueve la función triggerToast aquí:
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setShowToast(false);
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setShowToast(true), 0);
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
      lastName: Yup.string().required('Apellido es requerido'),
      password: Yup.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
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
          values.lastName
        );
        if (response.success) {
          triggerToast('¡Registro exitoso!', 'success');
          resetForm();
          togglePanel();
        } else {
          triggerToast('Error en el registro: ' + response.error, 'error');
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
        const response = await auth.login(values.email, values.password);
        if (response.success && response.data) {
          console.log('Datos recibidos para autenticación:', response.data);
          
          if (!response.data.token) {
            console.error('La respuesta no contiene un token:', response.data);
            return;
          }
          
          const loginSuccess = await authLogin(response.data);
          
          console.log('Resultado del login en contexto:', loginSuccess);
          
          if (loginSuccess) {
            navigate('/', { replace: true });
          } else {
            setToastMessage('Error al inicializar la sesión');
            setToastType('error');
            setShowToast(true);
          }
        } else {
          console.error('Respuesta de error desde el servidor:', response.error);
          
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
    <>
      <Toast 
        message={toastMessage}
        type={toastType}
        show={showToast}
        onClose={handleCloseToast}
        duration={toastDuration}
      />
      
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
              Registrarse
            </button>
          </form>
        </div>
        <div className="form-container sign-in-container">
          <form onSubmit={formik.handleSubmit}>
            <h1>Iniciar Sesión</h1>
            
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
            
            <button type="submit">Iniciar Sesión</button>
          </form>
        </div>
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>¡Bienvenido de nuevo!</h1>
              <p>Inicie sesión con su sus credenciales</p>
              <button className="ghost" style={{ backgroundColor: "#002C54" }} onClick={togglePanel}>Iniciar Sesión</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>¡Bienvenido a UOH Market!</h1>
              <p>Regístrese si aún no lo ha hecho para ser parte de la comunidad Mercadito UOH</p>
              <button className="ghost" style={{ backgroundColor: "#002C54" }} onClick={togglePanel}>Registrarse</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
