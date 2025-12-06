import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course } from '../types';

interface CourseCardProps {
    course: Course;
    showDate: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, showDate }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/course/${course.id}`)}
            className="bg-surface rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden transition-transform duration-200 hover:-translate-y-1 border border-border-custom cursor-pointer"
        >
            <img src={course.image} alt={course.title} className="w-full h-[150px] object-cover" />
            <div className="p-3">
                <div className="text-sm font-bold mb-2 line-clamp-2 h-10 text-text">{course.title}</div>
                <div className="flex justify-between text-xs text-muted items-center">
                    <div className="flex items-center gap-2">
                        <img
                            src={`https://i.pravatar.cc/100?img=${course.id}`}
                            alt={course.author}
                            className="w-[26px] h-[26px] rounded-full"
                        />
                        <span>{course.author}</span>
                    </div>
                    <span className="font-bold text-text">Module {(course.id % 10) + 1}</span>
                </div>
                {showDate && <div className="text-xs mt-2 text-muted">{course.date}</div>}
            </div>
        </div>
    );
};

export default CourseCard;
