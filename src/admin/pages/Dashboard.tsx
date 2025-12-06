import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { kpiData, chartData, recentActivity } from '../data';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const Dashboard = () => {
    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((item) => (
                    <div
                        key={item.title}
                        className="group relative overflow-hidden rounded-2xl border border-surface bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,199,230,0.1)]"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted">{item.title}</p>
                                <p className="mt-2 text-3xl font-bold text-text">{item.value}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            {item.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                            {item.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
                            {item.trend === 'neutral' && <Activity className="h-4 w-4 text-blue-500" />}
                            <span
                                className={`text-sm font-medium ${item.trend === 'up'
                                    ? 'text-green-500'
                                    : item.trend === 'down'
                                        ? 'text-red-500'
                                        : 'text-blue-500'
                                    }`}
                            >
                                {item.change}
                            </span>
                            <span className="text-sm text-muted">vs last month</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Chart */}
                <div className="rounded-2xl border border-surface bg-surface p-6 lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-text">Platform Traffic</h2>
                        <select className="rounded-lg border border-surface bg-background px-3 py-1 text-sm text-muted focus:border-primary focus:outline-none">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Last Year</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00C7E6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00C7E6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181B',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#F8FAFC',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#00C7E6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl border border-surface bg-surface p-6">
                    <h2 className="mb-6 text-lg font-semibold text-text">Recent Activity</h2>
                    <div className="space-y-6">
                        {recentActivity.map((activity) => (
                            <div key={activity.id} className="relative flex gap-4">
                                <div className="absolute left-0 top-0 mt-1.5 h-full w-px bg-surface last:hidden"></div>
                                <div className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-surface"></div>
                                <div className="flex-1">
                                    <p className="text-sm text-text">
                                        <span className="font-medium text-primary">{activity.user}</span>{' '}
                                        {activity.action}{' '}
                                        <span className="font-medium text-text">{activity.target}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-muted">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="mt-6 w-full rounded-xl border border-surface py-2 text-sm font-medium text-muted hover:bg-background hover:text-text transition-colors">
                        View All Activity
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
