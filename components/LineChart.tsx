'use client'
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '@/lib/supabaseClient'

export default function LineChartComponent() {
  const [data, setData] = useState([
    { day: 'Mon', points: 0, households: 0 },
    { day: 'Tue', points: 0, households: 0 },
    { day: 'Wed', points: 0, households: 0 },
    { day: 'Thu', points: 0, households: 0 },
    { day: 'Fri', points: 0, households: 0 },
    { day: 'Sat', points: 0, households: 0 },
    { day: 'Sun', points: 0, households: 0 },
  ])
  const [loading, setLoading] = useState(true)
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  // Responsive detection
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth
      if (w <= 640) setScreenSize('mobile')
      else if (w <= 1024) setScreenSize('tablet')
      else setScreenSize('desktop')
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [])

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const today = new Date()
        const dayOfWeek = today.getDay()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        startOfWeek.setHours(0, 0, 0, 0)

        const weekData = []
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek)
          date.setDate(startOfWeek.getDate() + i)
          const dateStr = date.toISOString().split('T')[0]
          const nextDateStr = new Date(date)
          nextDateStr.setDate(date.getDate() + 1)
          const nextDateStrISO = nextDateStr.toISOString().split('T')[0]

          const { data: pointsData, error: pointsError } = await supabase
            .from('recycling_records')
            .select('points_earned')
            .gte('created_at', dateStr)
            .lt('created_at', nextDateStrISO)

          if (pointsError) {
            console.error('Error fetching points:', pointsError)
          }

          const totalPoints = pointsData?.reduce((sum, record) => sum + (record.points_earned || 0), 0) || 0

          const { data: usersData, error: usersError } = await supabase
            .from('recycling_records')
            .select('user_id')
            .gte('created_at', dateStr)
            .lt('created_at', nextDateStrISO)

          if (usersError) {
            console.error('Error fetching users:', usersError)
          }

          const uniqueUsers = new Set(usersData?.map(r => r.user_id) || []).size

          weekData.push({
            day: dayNames[i],
            points: totalPoints,
            households: uniqueUsers
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
      <div className="flex items-center justify-center h-full min-h-[180px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  // Responsive sizing
  const isMobile = screenSize === 'mobile'
  const isTablet = screenSize === 'tablet'

  // Chart margins — give breathing room for axis labels on mobile
  const chartMargin = isMobile
    ? { top: 8, right: 8, left: -10, bottom: 0 }
    : isTablet
    ? { top: 10, right: 10, left: -5, bottom: 5 }
    : { top: 10, right: 10, left: 0, bottom: 5 }

  // Font sizes scale down on mobile but stay readable
  const axisFontSize = isMobile ? 10 : 11
  const tooltipFontSize = isMobile ? 11 : 12

  // Dot size — smaller on mobile so they don't crowd the line
  const dotRadius = isMobile ? 3 : 4
  const activeDotRadius = isMobile ? 5 : 6

  // Stroke width — slightly thinner on mobile
  const strokeWidth = isMobile ? 2 : 2.5

  return (
    <div
      className="chart-wrapper"
      style={{
        width: '100%',
        height: '100%',
        minHeight: isMobile ? '220px' : '180px',
        position: 'relative'
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="day"
            stroke="#9ca3af"
            fontSize={axisFontSize}
            axisLine={false}
            tickLine={false}
            interval={0}
            tickMargin={6}
          />
          <YAxis
            stroke="#9ca3af"
            fontSize={axisFontSize}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}`}
            width={isMobile ? 28 : 32}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: `${tooltipFontSize}px`,
              padding: isMobile ? '6px 10px' : '8px 12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }}
            labelStyle={{
              fontSize: `${tooltipFontSize}px`,
              fontWeight: 600,
              marginBottom: '2px'
            }}
            itemStyle={{
              fontSize: `${tooltipFontSize}px`,
              padding: '1px 0'
            }}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: dotRadius }}
            activeDot={{ r: activeDotRadius }}
          />
          <Line
            type="monotone"
            dataKey="households"
            stroke="#3b82f6"
            strokeWidth={strokeWidth}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: dotRadius }}
            activeDot={{ r: activeDotRadius }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}