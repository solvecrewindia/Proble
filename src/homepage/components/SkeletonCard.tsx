import React from 'react';

const SkeletonCard = () => {
    return (
        <div className="bg-surface rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden border border-neutral-300 dark:border-neutral-600 animate-pulse">
            {/* Image Placeholder */}
            <div className="w-full h-[160px] bg-neutral-200 dark:bg-neutral-800" />

            <div className="p-3">
                {/* Title Placeholders (2 lines to match line-clamp-2) */}
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full mb-2" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3 mb-4" />

                {/* Footer Placeholder */}
                <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="w-[26px] h-[26px] rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        {/* Author Name */}
                        <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    </div>
                    {/* Badge */}
                    <div className="h-5 w-12 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
