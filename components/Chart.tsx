'use client'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabaseClient'

export default function Chart() {
  const [data, setData] = useState([
    { day: 'Mon', kg: 0 },
    { day: 'Tue', kg: 0 },
    { day: 'Wed', kg: 0 },
    { day: 'Thu', kg: 0 },
    { day: 'Fri', kg: 0 },
    { day: 'Sat', kg: 0 },
    { day: 'Sun', kg: 0 },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Get the current date and calculate the start of the week (Monday)
        const today = new Date()
        const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        startOfWeek.setHours(0, 0, 0, 0)

        // Get data for the last 7 days
        const weekData = []
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek)
          date.setDate(startOfWeek.getDate() + i)
          const dateStr = date.toISOString().split('T')[0]
          const nextDateStr = new Date(date)
          nextDateStr.setDate(date.getDate() + 1)
          const nextDateStrISO = nextDateStr.toISOString().split('T')[0]

          // Get total weight_kg for this day from recycling_records
          const { data: kgData, error: kgError } = await supabase
            .from('recycling_records')
            .select('weight_kg')
            .gte('created_at', dateStr)
            .lt('created_at', nextDateStrISO)

          if (kgError) {
            console.error('Error fetching kg data:', kgError)
          }

          const totalKg = kgData?.reduce((sum, record) => sum + (record.weight_kg || 0), 0) || 0

          weekData.push({
            day: dayNames[i],
            kg: Math.round(totalKg * 10) / 10 // Round to 1 decimal place
          })
        }

        setData(weekData)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="day" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}
          formatter={(value: any) => [`${value} kg`, 'Recycled']}
        />
        <Bar dataKey="kg" fill="#4caf50" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}