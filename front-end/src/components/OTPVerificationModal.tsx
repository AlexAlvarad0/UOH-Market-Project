import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface OTPVerificationModalProps {
  email: string;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({ email, onSubmit, onCancel }) => {
  const [values, setValues] = useState(Array(6).fill(''));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = values.join('');
    if (code.length === 6) {
      onSubmit(code);
    }
  };

  return (
    <Wrapper>
      <div className="overlay" onClick={onCancel} />
      <StyledWrapper>
        <form className="form" onSubmit={handleSubmit}>
          <div className="title">OTP Verification Code</div>
          <p className="message">Se ha enviado un código de verificación a {email}</p>
          <div className="inputs">
            {values.map((v, i) => (
              <input
                key={i}
                ref={el => inputsRef.current[i] = el}
                type="text"
                maxLength={1}
                value={v}
                onChange={e => handleChange(i, e.target.value)}
              />
            ))}
          </div>
          <button type="submit" className="action">Verificar</button>
        </form>
      </StyledWrapper>
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
    width: 300px;
    background-color: white;
    border-radius: 12px;
    padding: 20px;
    position: relative;
    z-index: 1001;
  }

  .title {
    font-size: 20px;
    font-weight: bold;
    color: black;
    text-align: center;
  }

  .message {
    color: #a3a3a3;
    font-size: 14px;
    margin-top: 4px;
    text-align: center;
  }

  .inputs {
    margin-top: 10px;
    display: flex;
    justify-content: center;
  }

  .inputs input {
    width: 32px;
    height: 32px;
    text-align: center;
    border: none;
    border-bottom: 1.5px solid #d2d2d2;
    margin: 0 5px;
    font-size: 18px;
  }

  .inputs input:focus {
    border-bottom: 1.5px solid royalblue;
    outline: none;
  }

  .action {
    margin-top: 24px;
    padding: 12px 16px;
    border-radius: 8px;
    border: none;
    background-color: royalblue;
    color: white;
    cursor: pointer;
    align-self: end;
  }
`;

export default OTPVerificationModal;
