import React from 'react';
import styled from 'styled-components';

interface DeleteButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onClick }) => (
  <StyledWrapper>
    <button className="bin-button" onClick={onClick} type="button">
      <svg className="bin-top" viewBox="0 0 39 7" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line y1={5} x2={39} y2={5} stroke="white" strokeWidth={4} />
        <line x1={12} y1="1.5" x2="26.0357" y2="1.5" stroke="white" strokeWidth={3} />
      </svg>
      <svg className="bin-bottom" viewBox="0 0 33 39" fill="none" xmlns="http://www.w3.org/2000/svg">
        <mask id="path-1-inside-1_8_19" fill="white">
          <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" />
        </mask>
        <path d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z" fill="white" mask="url(#path-1-inside-1_8_19)" />
        <path d="M12 6L12 29" stroke="white" strokeWidth={4} />
        <path d="M21 6V29" stroke="white" strokeWidth={4} />
      </svg>
    </button>
  </StyledWrapper>
);

const StyledWrapper = styled.div`
  .bin-button {
    width: 55px;
    height: 55px;
    border-radius: 15px;
    background-color: rgb(255, 95, 95);
    border: 3px solid rgb(255, 201, 201);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.1s;
    position: relative;
  }
  .bin-top {
    width: 17px;
    transition: transform 0.3s;
    transform-origin: right;
  }
  .bin-bottom {
    width: 15px;
  }
  .bin-button:hover .bin-top {
    transform: rotate(45deg);
  }
  .bin-button:hover {
    background-color: rgb(255, 0, 0);
  }
  .bin-button:active {
    transform: scale(0.9);
  }
`;

export default DeleteButton;
