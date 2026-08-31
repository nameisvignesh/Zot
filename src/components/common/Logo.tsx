import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8', size }) => {
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`} style={style}>
      <svg 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full drop-shadow-md"
      >
        {/* Outer Brand Orange Circle */}
        <circle cx="256" cy="256" r="256" fill="#FF9100" />
        
        {/* White Routing Channel Trace */}
        <path 
          d="M 152 144 H 360 C 420 144 420 256 360 256 H 152 C 92 256 92 368 152 368 H 360" 
          stroke="#FFFFFF" 
          strokeWidth="46" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Top Terminal Circle Node */}
        <circle cx="152" cy="144" r="44" fill="#FF9100" stroke="#FFFFFF" strokeWidth="22" />
        
        {/* Bottom Terminal Circle Node */}
        <circle cx="360" cy="368" r="44" fill="#FF9100" stroke="#FFFFFF" strokeWidth="22" />
      </svg>
    </div>
  );
};
