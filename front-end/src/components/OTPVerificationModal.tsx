import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface OTPVerificationModalProps {
  email: string;
  onSubmit: (code: string) => void;
  onCancel: () => void;
  onResend?: () => void;
  resendDisabled?: boolean;
  resendCountdown?: number;
  resendCount?: number;
  maxResends?: number;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({ 
  email, 
  onSubmit, 
  onCancel, 
  onResend,
  resendDisabled = false,
  resendCountdown = 0,
  resendCount = 0,
  maxResends = 3
}) => {
  const [values, setValues] = useState(Array(6).fill(''));
  const [showConfirmation, setShowConfirmation] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);
  const handleChange = (index: number, val: string) => {
    if (/^[0-9]?$/.test(val)) {
      const newVals = [...values];
      newVals[index] = val;
      setValues(newVals);
      if (val && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Verificar que el texto pegado sea solo números y tenga 6 dígitos
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setValues(digits);
      // Enfocar el último input después de pegar
      inputsRef.current[5]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newVals = [...values];
      
      if (newVals[index]) {
        // Si la casilla actual tiene un valor, lo borramos
        newVals[index] = '';
        setValues(newVals);
      } else if (index > 0) {
        // Si la casilla actual está vacía, vamos a la anterior y la borramos
        newVals[index - 1] = '';
        setValues(newVals);
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = values.join('');
    if (code.length === 6) {
      onSubmit(code);
    }
  };

  const handleOverlayClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmation(false);
    onCancel();
  };

  const handleStayInModal = () => {
    setShowConfirmation(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  return (
    <Wrapper>
      <div className="overlay" onClick={handleOverlayClick} />
      <StyledWrapper>
        <form className="form" onSubmit={handleSubmit}>
          <div className="title">Verificación de Email</div>
          <p className="message">Se ha enviado un código de verificación a:</p>
          <p className="email">{email}</p>
            <div className="inputs">
            {values.map((v, i) => (
              <input
                key={i}
                ref={el => { inputsRef.current[i] = el; return undefined; }}
                type="text"
                maxLength={1}
                value={v}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
              />
            ))}
          </div>
          
          <div className="actions">
            <button type="submit" className="action" disabled={values.join('').length !== 6}>
              Verificar
            </button>
          </div>

          {/* Sección de reenvío */}
          <div className="resend-section">
            {resendCount < maxResends ? (
              <>
                <p className="resend-info">¿No recibiste el código?</p>
                {onResend && (
                  <button 
                    type="button" 
                    className="resend-button" 
                    onClick={onResend}
                    disabled={resendDisabled || resendCountdown > 0}
                  >
                    {resendCountdown > 0 
                      ? `Reenviar en ${formatTime(resendCountdown)}`
                      : resendDisabled 
                        ? 'Enviando...'
                        : 'Reenviar código'
                    }
                  </button>
                )}
                <p className="resend-count">Reenvíos: {resendCount}/{maxResends}</p>
              </>
            ) : (
              <p className="resend-limit">Has alcanzado el límite máximo de reenvíos</p>
            )}
          </div>

          <div className="warning">
            <p>⏰ El código expira en 30 minutos</p>
          </div>
        </form>
      </StyledWrapper>
      
      {/* Modal de confirmación */}
      {showConfirmation && (
        <ConfirmationModal>
          <div className="confirmation-overlay" onClick={handleStayInModal} />
          <div className="confirmation-content">
            <h3>¿Estás seguro?</h3>
            <p>Si sales ahora, no podrás verificar tu cuenta y tendrás que registrarte nuevamente.</p>
            <div className="confirmation-buttons">
              <button className="stay-button" onClick={handleStayInModal}>
                Quedarme
              </button>
              <button className="leave-button" onClick={handleConfirmCancel}>
                Salir
              </button>
            </div>
          </div>
        </ConfirmationModal>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
  }
`;

const StyledWrapper = styled.div`
  .form {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: space-around;
    width: 400px;
    background-color: white;
    border-radius: 12px;
    padding: 30px;
    position: relative;
    z-index: 1001;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }

  .title {
    font-size: 24px;
    font-weight: bold;
    color: #002C54;
    text-align: center;
    margin-bottom: 10px;
  }

  .message {
    color: #666;
    font-size: 14px;
    text-align: center;
    margin-bottom: 5px;
  }

  .email {
    color: #002C54;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
    margin-bottom: 20px;
  }

  .inputs {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  .inputs input {
    width: 45px;
    height: 45px;
    text-align: center;
    border: 2px solid #d2d2d2;
    border-radius: 8px;
    font-size: 20px;
    font-weight: bold;
    color: #002C54;
    transition: border-color 0.2s;
  }

  .inputs input:focus {
    border-color: #002C54;
    outline: none;
    box-shadow: 0 0 5px rgba(0, 44, 84, 0.3);
  }

  .actions {
    width: 100%;
    margin-bottom: 20px;
  }

  .action {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    border: none;
    background-color: #002C54;
    color: white;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .action:hover:not(:disabled) {
    background-color: #003a73;
  }

  .action:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .resend-section {
    text-align: center;
    margin-bottom: 15px;
    border-top: 1px solid #eee;
    padding-top: 15px;
  }

  .resend-info {
    color: #666;
    font-size: 13px;
    margin-bottom: 8px;
  }

  .resend-button {
    background: none;
    border: none;
    color: #002C54;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    text-decoration: underline;
    margin-bottom: 5px;
  }

  .resend-button:hover:not(:disabled) {
    color: #003a73;
  }

  .resend-button:disabled {
    color: #999;
    cursor: not-allowed;
  }

  .resend-count {
    color: #666;
    font-size: 12px;
    margin: 0;
  }

  .resend-limit {
    color: #e74c3c;
    font-size: 13px;
    font-weight: bold;
    margin: 0;
  }

  .warning {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 5px;
    padding: 10px;
    text-align: center;
  }
  .warning p {
    margin: 0;
    color: #856404;
    font-size: 12px;
    font-weight: bold;
  }
`;

const ConfirmationModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1002;

  .confirmation-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
  }

  .confirmation-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 1003;
    text-align: center;
    max-width: 400px;
    margin: 20px;
  }

  .confirmation-content h3 {
    margin: 0 0 15px 0;
    color: #002C54;
    font-size: 20px;
  }

  .confirmation-content p {
    margin: 0 0 25px 0;
    color: #666;
    font-size: 14px;
    line-height: 1.5;
  }

  .confirmation-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
  }

  .stay-button, .leave-button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 100px;
  }

  .stay-button {
    background-color: #002C54;
    color: white;
  }

  .stay-button:hover {
    background-color: #003a73;
  }

  .leave-button {
    background-color: #dc3545;
    color: white;
  }

  .leave-button:hover {
    background-color: #c82333;
  }
`;

export default OTPVerificationModal;
