import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => (
  <img
    src="/zot-logo.png"
    alt="ZOT"
    width={size}
    height={size}
    className={`logo-mark ${className}`}
  />
);
