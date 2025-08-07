import React, { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  footer,
  variant = 'default',
  padding = 'md',
  className = '',
  onClick
}) => {
  const cardClass = [
    'card',
    `card-${variant}`,
    `card-padding-${padding}`,
    onClick ? 'card-clickable' : '',
    className
  ].filter(Boolean).join(' ');

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent 
      className={cardClass}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      
      <div className="card-content">
        {children}
      </div>
      
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </CardComponent>
  );
};

export default Card;