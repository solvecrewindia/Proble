import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap } from 'lucide-react';
import type { Course } from '../types';

interface CourseCardProps {
    course: Course;
    showDate: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, showDate }) => {
    const navigate = useNavigate();



    return (
        <div
            onClick={() => {
                if (course.type === 'module') {
                    navigate(`/module/${course.id}`);
                } else {
                    navigate(`/course/details/${course.id}`);
                }
            }}
            className="group bg-surface rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-neutral-200/80 dark:border-neutral-800 cursor-pointer overflow-hidden flex flex-col h-full"
        >
            {/* Image / Placeholder Area */}
            <div className="relative w-full h-[60px] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                {course.image && !course.image.includes('ui-avatars') ? (
                    <img
                        src={course.image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-primary/5 dark:bg-primary/10 text-primary flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                        {/* Subtle dotted pattern for premium feel */}
                        <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.2]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                    </div>
                )}
                

            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="text-[15px] font-display font-bold mb-3 line-clamp-2 leading-snug text-text group-hover:text-primary transition-colors h-11">{course.title}</div>
                
                <div className="mt-auto">
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                            {course.author === 'Proble' || course.author === 'Admin' ? (
                                <span className="text-xs font-semibold text-muted">Proble</span>
                            ) : (
                                <>
                                    {course.author_avatar_url && !course.author_avatar_url.includes('ui-avatars') ? (
                                        <img
                                            src={course.author_avatar_url}
                                            alt={course.author}
                                            className="w-6 h-6 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <span className="text-[10px] font-bold text-primary">
                                                {course.author ? course.author.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        </div>
                                    )}
                                    <span className="truncate max-w-[140px] text-xs font-medium text-muted">{course.author}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {showDate && <div className="text-[10px] font-medium text-muted/80">{course.date}</div>}
                            <div className="bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded">
                                <span className="font-bold text-primary text-[10px] tracking-wider uppercase">
                                    {course.type === 'module' ? 'Module' : 'Test'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseCard;
