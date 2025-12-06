import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Quiz } from '../../shared/types';

// Mock data for now
const UPCOMING_QUIZZES: Quiz[] = [
    {
        id: '1',
        title: 'Data Structures Mid-Term',
        description: 'Covers Arrays, Linked Lists, and Stacks.',
        durationMinutes: 60,
        totalQuestions: 30,
        status: 'upcoming',
        startTime: '2025-12-05T10:00:00'
    },
    {
        id: '2',
        title: 'Operating Systems Quiz 1',
        description: 'Process Management and Scheduling.',
        durationMinutes: 45,
        totalQuestions: 20,
        status: 'active'
    }
];

const PracticeList = () => {
    const navigate = useNavigate();
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-text">Practice List</h1>
                <p className="text-muted mt-2">Browse and attempt available practice quizzes.</p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {UPCOMING_QUIZZES.map((quiz) => (
                    <Card
                        key={quiz.id}
                        title={quiz.title}
                        description={quiz.description}
                        className="h-full flex flex-col"
                        footer={
                            <div className="flex justify-between items-center w-full mt-auto">
                                <span className="text-sm text-muted">{quiz.durationMinutes} mins</span>
                                <Button
                                    variant={quiz.status === 'active' ? 'primary' : 'secondary'}
                                    disabled={quiz.status !== 'active'}
                                    onClick={() => navigate(`/student/practice/${quiz.id}`)}
                                >
                                    View
                                </Button>
                            </div>
                        }
                    >
                        <div className="mt-2 text-sm text-muted flex-1">
                            <p>Questions: {quiz.totalQuestions}</p>
                            {quiz.startTime && <p>Starts: {new Date(quiz.startTime).toLocaleString()}</p>}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default PracticeList;
