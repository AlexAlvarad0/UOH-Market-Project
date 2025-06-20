import React from 'react';
import styled from 'styled-components';

interface CustomSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({ checked, onChange, disabled = false }) => {
  return (
    <StyledWrapper>
      <label className="switch">
        <input 
          type="checkbox" 
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="slider" />
      </label>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* The switch - the box around the slider */
  .switch {
   font-size: 1rem;
   position: relative;
   display: inline-block;
   width: 3em;
   height: 2em;
  }

  /* Hide default HTML checkbox */
  .switch input {
   opacity: 0;
   width: 0;
   height: 0;
  }

  /* The slider */
  .slider {
   position: absolute;
   cursor: pointer;
   inset: 0;
   background-color: #eee;
   transition: 0.4s;
   border-radius: 0.5em;
   box-shadow: 0 0.2em #dfd9d9;
  }

  .slider:before {
   position: absolute;
   content: "";
   height: 1.5em;
   width: 1.4em;
   border-radius: 0.3em;
   left: 0.3em;
   bottom: 0.7em;
   background-color: lightsalmon;
   transition: 0.4s;
   box-shadow: 0 0.4em #bcb4b4;
  }

  .slider:hover::before {
   box-shadow: 0 0.2em #bcb4b4;
   bottom: 0.5em;
  }

  input:checked+.slider:before {
   transform: translateX(2em);
   background: lightgreen;
  }

  /* Disabled state */
  .switch input:disabled + .slider {
   opacity: 0.6;
   cursor: not-allowed;
  }

  .switch input:disabled + .slider:hover::before {
   box-shadow: 0 0.4em #bcb4b4;
   bottom: 0.7em;
  }
`;

export default CustomSwitch;
