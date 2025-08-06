import React from 'react';

interface FontAwesomeIconProps {
  icon: string;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  style?: 'solid' | 'regular' | 'light' | 'thin' | 'duotone' | 'brands';
  fixedWidth?: boolean;
}

const FontAwesomeIcon: React.FC<FontAwesomeIconProps> = ({ 
  icon, 
  className = '', 
  size = 'base',
  style = 'solid',
  fixedWidth = false
}) => {
  // Remove 'fa-' prefix if present
  const iconName = icon.startsWith('fa-') ? icon.substring(3) : icon;
  
  // Map style to Font Awesome class
  const styleClass = {
    solid: 'fas',
    regular: 'far',
    light: 'fal',
    thin: 'fat',
    duotone: 'fad',
    brands: 'fab'
  }[style];
  
  // Map size to Tailwind classes
  const sizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
    '6xl': 'text-6xl'
  }[size];
  
  // Add fixed width class if requested
  const fixedWidthClass = fixedWidth ? 'fa-fw' : '';
  
  return (
    <i 
      className={`${styleClass} fa-${iconName} ${sizeClass} ${fixedWidthClass} ${className}`.trim()} 
      aria-hidden="true"
    />
  );
};

export default FontAwesomeIcon; 