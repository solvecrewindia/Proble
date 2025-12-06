import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function RealTimeChart() {
    const [dataPoints, setDataPoints] = useState<number[]>([]);
    const [labels, setLabels] = useState<string[]>([]);

    useEffect(() => {
        // Simulate WebSocket push
        const interval = setInterval(() => {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString();
            const value = Math.floor(Math.random() * 50) + 100; // Random requests per minute

            setDataPoints(prev => {
                const newPoints = [...prev, value];
                if (newPoints.length > 20) newPoints.shift();
                return newPoints;
            });

            setLabels(prev => {
                const newLabels = [...prev, timeLabel];
                if (newLabels.length > 20) newLabels.shift();
                return newLabels;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const data = {
        labels,
        datasets: [
            {
                label: 'Requests per Minute',
                data: dataPoints,
                borderColor: '#00C7E6',
                backgroundColor: 'rgba(0, 199, 230, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Real-time Traffic',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f1f5f9',
                }
            },
            x: {
                grid: {
                    display: false,
                }
            }
        },
        interaction: {
            intersect: false,
        },
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px]">
            <Line options={options} data={data} />
        </div>
    );
}
