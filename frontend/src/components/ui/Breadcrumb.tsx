import React from 'react';
import './Breadcrumb.css';

export interface BreadcrumbItem {
  id: string;
  name: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onItemClick?: (item: BreadcrumbItem, index: number) => void;
  separator?: string;
  className?: string;
  maxItems?: number;
  showRoot?: boolean;
  rootLabel?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  onItemClick,
  separator = '/',
  className = '',
  maxItems = 5,
  showRoot = true,
  rootLabel = 'Root'
}) => {
  // Add root item if showRoot is true and items don't start with root
  const breadcrumbItems = showRoot && items.length > 0 && items[0].name !== rootLabel
    ? [{ id: 'root', name: rootLabel }, ...items]
    : items;

  // Truncate items if they exceed maxItems
  const displayItems = breadcrumbItems.length > maxItems
    ? [
        breadcrumbItems[0],
        { id: 'ellipsis', name: '...' },
        ...breadcrumbItems.slice(-maxItems + 2)
      ]
    : breadcrumbItems;

  const handleItemClick = (item: BreadcrumbItem, index: number) => {
    if (item.id === 'ellipsis') return;
    onItemClick?.(item, index);
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: BreadcrumbItem, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item, index);
    }
  };

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb navigation">
      <ol className="breadcrumb__list">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.id === 'ellipsis';
          const isClickable = !isLast && !isEllipsis && onItemClick;

          return (
            <li key={`${item.id}-${index}`} className="breadcrumb__item">
              {isClickable ? (
                <button
                  className="breadcrumb__link"
                  onClick={() => handleItemClick(item, index)}
                  onKeyDown={(e) => handleKeyDown(e, item, index)}
                  aria-current={isLast ? 'page' : undefined}
                  title={`Navigate to ${item.name}`}
                >
                  {item.name}
                </button>
              ) : (
                <span
                  className={`breadcrumb__text ${isLast ? 'breadcrumb__text--current' : ''} ${isEllipsis ? 'breadcrumb__text--ellipsis' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.name}
                </span>
              )}
              
              {!isLast && (
                <span className="breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;