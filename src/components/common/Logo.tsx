import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => (
  <img
    src={`${import.meta.env.BASE_URL}zot-logo.png`}
    alt="ZOT"
    width={size}
    height={size}
    className={`logo-mark ${className}`}
  />
);
