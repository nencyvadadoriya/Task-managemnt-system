type Stat = {
    name: string;
    value: number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
};

interface StatsGridProps {
    stats: Stat[];
}

const StatsGrid = ({ stats }: StatsGridProps) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded shadow">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                {stat.change && (
                    <p className={`text-sm ${
                        stat.changeType === 'positive' ? 'text-green-500' :
                        stat.changeType === 'negative' ? 'text-red-500' :
                        'text-gray-500'
                    }`}>
                        {stat.change}
                    </p>
                )}
            </div>
        ))}
    </div>
);

export default StatsGrid;
