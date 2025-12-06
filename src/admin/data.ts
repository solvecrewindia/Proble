import { User, Shield, BookOpen, LayoutDashboard } from 'lucide-react';

export const users = [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Student", status: "Active", avatar: "https://i.pravatar.cc/150?u=alice" },
    { id: 2, name: "Bob Smith", email: "bob@example.com", role: "Teacher", status: "Active", avatar: "https://i.pravatar.cc/150?u=bob" },
    { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "Student", status: "Suspended", avatar: "https://i.pravatar.cc/150?u=charlie" },
    { id: 4, name: "Diana Prince", email: "diana@example.com", role: "Admin", status: "Active", avatar: "https://i.pravatar.cc/150?u=diana" },
    { id: 5, name: "Evan Wright", email: "evan@example.com", role: "Teacher", status: "Pending", avatar: "https://i.pravatar.cc/150?u=evan" },
];

export const quizzes = [
    { id: 1, title: "Introduction to Algebra", category: "Math", difficulty: "Easy", createdDate: "2023-10-01", questions: 10 },
    { id: 2, title: "Advanced Physics", category: "Science", difficulty: "Hard", createdDate: "2023-10-05", questions: 25 },
    { id: 3, title: "World History 101", category: "History", difficulty: "Medium", createdDate: "2023-10-10", questions: 15 },
    { id: 4, title: "Organic Chemistry", category: "Science", difficulty: "Hard", createdDate: "2023-10-12", questions: 20 },
    { id: 5, title: "Basic Grammar", category: "English", difficulty: "Easy", createdDate: "2023-10-15", questions: 12 },
];

export const alerts = [
    { id: 1, user: "Alice Johnson", quiz: "Advanced Physics", type: "Tab Switch", severity: "High", time: "10 mins ago", status: "Pending" },
    { id: 2, user: "Charlie Brown", quiz: "World History 101", type: "Multiple Faces", severity: "Critical", time: "1 hour ago", status: "Resolved" },
    { id: 3, user: "Bob Smith", quiz: "Introduction to Algebra", type: "Background Noise", severity: "Low", time: "2 hours ago", status: "Pending" },
];

export const recentActivity = [
    { id: 1, user: "Alice Johnson", action: "finished Quiz", target: "Advanced Physics", time: "5 mins ago" },
    { id: 2, user: "Bob Smith", action: "created new Module", target: "Calculus II", time: "1 hour ago" },
    { id: 3, user: "System", action: "flagged user", target: "Charlie Brown", time: "2 hours ago" },
    { id: 4, user: "Diana Prince", action: "updated settings", target: "Security Policy", time: "1 day ago" },
];

export const kpiData = [
    { title: "Total Users", value: "12.5k", change: "+5%", icon: User, trend: "up" },
    { title: "Active Quizzes", value: "340", change: "+12%", icon: BookOpen, trend: "up" },
    { title: "Flagged Incidents", value: "23", change: "-2%", icon: Shield, trend: "down", critical: true },
    { title: "System Health", value: "99.9%", change: "Stable", icon: LayoutDashboard, trend: "neutral" },
];

export const chartData = [
    { name: 'Mon', users: 4000, quizzes: 2400 },
    { name: 'Tue', users: 3000, quizzes: 1398 },
    { name: 'Wed', users: 2000, quizzes: 9800 },
    { name: 'Thu', users: 2780, quizzes: 3908 },
    { name: 'Fri', users: 1890, quizzes: 4800 },
    { name: 'Sat', users: 2390, quizzes: 3800 },
    { name: 'Sun', users: 3490, quizzes: 4300 },
];
