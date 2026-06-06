import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface ChartDataPoint {
  date: string
  userA: number
  userB: number
}

interface Props {
  data: ChartDataPoint[]
  userA: string
  userB: string
}

export default function ExpenseAreaChart({ data, userA, userB }: Props) {
  if (!data || data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorUserA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorUserB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#71717a" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false}
          dy={10}
        />
        <YAxis 
          stroke="#71717a" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(value) => `€${value}`}
          dx={-10}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
          itemStyle={{ color: '#e4e4e7' }}
          formatter={(value: any) => [`€${Number(value).toFixed(2)}`, '']}
        />
        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '14px', color: '#a1a1aa' }} />
        <Area
          type="monotone"
          dataKey="userA"
          name={userA}
          stroke="#10b981"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorUserA)"
        />
        <Area
          type="monotone"
          dataKey="userB"
          name={userB}
          stroke="#a855f7"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorUserB)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
