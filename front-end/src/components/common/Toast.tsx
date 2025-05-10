import { useState, useEffect } from 'react';
import '../../styles/Toast.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
  show: boolean;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'error', 
  duration = 3000, 
  onClose, 
  show 
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    
    if (show) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return visible ? (
    <div className={`toast toast-${type} ${visible ? 'show' : ''}`}>
      <div className="toast-message">{message}</div>
    </div>
  ) : null;
};

export default Toast;
