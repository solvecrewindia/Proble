import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
    footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    title,
    description,
    footer
}) => {
    return (
        <div className={`bg-surface rounded-lg border border-neutral-300 dark:border-neutral-600 shadow-sm ${className}`}>
            {(title || description) && (
                <div className="p-6 pb-4 border-b border-neutral-300 dark:border-neutral-600">
                    {title && <h3 className="text-lg font-semibold text-text">{title}</h3>}
                    {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
            {footer && (
                <div className="px-6 py-4 bg-background border-t border-neutral-300 dark:border-neutral-600 rounded-b-lg">
                    {footer}
                </div>
            )}
        </div>
    );
};
