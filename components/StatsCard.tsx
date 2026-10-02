interface StatsCardProps {
  icon: string
  value: string
  label: string
  change?: string
  color?: string
}

export default function StatsCard({ icon, value, label, change, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 hover:shadow-md transition-all hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {change && (
            <p className="text-xs text-green-600 mt-2">↑ {change} from last month</p>
          )}
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${color || 'from-green-500 to-green-600'} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}