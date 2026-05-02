import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color = '#10b981', height = 36 }) => {
  const chartData = data.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace('#', '')}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
