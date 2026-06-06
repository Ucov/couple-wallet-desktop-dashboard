import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface CategoryData {
  name: string
  value: number
  color: string
}

interface Props {
  data: CategoryData[]
}

export default function CategoryDonutChart({ data }: Props) {
  // Filter out zero values to avoid tiny slices
  const validData = data.filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={validData}
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {validData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: any) => `€${Number(value).toFixed(2)}`}
          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
          itemStyle={{ color: '#e4e4e7' }}
        />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
