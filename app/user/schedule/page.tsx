'use client'
import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function UserSchedule() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true)
        setError(null)

        const now = new Date()
        const today = now.toISOString().split('T')[0]
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
        const currentTime = now.toTimeString().slice(0, 5)

        const { data, error } = await supabase
          .from('collection_schedules')
          .select('*')
          .order('day_of_week', { ascending: true })

        if (error) {
          console.error('Error fetching schedules:', error)
          setError('Failed to load collection schedules')
          setSchedules([])
          return
        }

        if (!data || data.length === 0) {
          setSchedules([])
          return
        }

        const activeSchedules = data.filter(schedule => {
          const isExpired = 
            (schedule.schedule_date && schedule.schedule_date < today) ||
            (schedule.day_of_week === currentDay && schedule.time <= currentTime)
          
          return schedule.is_active && !isExpired
        })

        setSchedules(activeSchedules)

      } catch (error) {
        console.error('Error fetching schedules:', error)
        setError('An unexpected error occurred')
        setSchedules([])
      } finally {
        setLoading(false)
      }
    }

    fetchSchedules()
  }, [])

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  const getDayIndex = (day: string) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days.indexOf(day)
  }

  const sortedSchedules = [...schedules].sort((a, b) => {
    return getDayIndex(a.day_of_week) - getDayIndex(b.day_of_week)
  })

  const todaySchedule = sortedSchedules.find(s => s.day_of_week === getCurrentDay())

  const getNextSchedule = () => {
    const today = getCurrentDay()
    const todayIndex = getDayIndex(today)
    
    const todaySch = sortedSchedules.find(s => s.day_of_week === today)
    if (todaySch) return todaySch
    
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7
      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][nextDayIndex]
      const nextSch = sortedSchedules.find(s => s.day_of_week === dayName)
      if (nextSch) return nextSch
    }
    
    return sortedSchedules[0] || null
  }

  const nextSchedule = getNextSchedule()

  if (loading) {
    return (
      <div className="user-schedule-loading">
        <div className="user-schedule-loading-content">
          <Loader2 className="user-schedule-loading-spinner" />
          <p className="user-schedule-loading-text">Loading schedule...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="user-schedule-error-container">
        <div className="user-schedule-error-card">
          <div className="user-schedule-error-content">
            <AlertCircle className="user-schedule-error-icon" />
            <p className="user-schedule-error-message">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="user-schedule-error-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="user-schedule-container">
      <div className="user-schedule-card">
        {/* Header */}
        <div className="user-schedule-header">
          <div className="user-schedule-header-left">
            <div className="user-schedule-header-icon">
              <Calendar className="user-schedule-header-icon-svg" />
            </div>
            <div>
              <div className="user-schedule-header-title">Collection Schedule</div>
              <div className="user-schedule-header-subtitle">Barangay Banicain</div>
            </div>
          </div>
          <span className="user-schedule-header-badge">
            {schedules.length} {schedules.length === 1 ? 'Schedule' : 'Schedules'}
          </span>
        </div>

        {/* Today's Schedule Highlight */}
        {todaySchedule && (
          <div className="user-schedule-today">
            <div className="user-schedule-today-content">
              <div className="user-schedule-today-left">
                <div className="user-schedule-today-labels">
                  <span className="user-schedule-today-label">Today</span>
                  <span className="user-schedule-today-day">{getCurrentDay()}</span>
                  {todaySchedule.schedule_date && (
                    <span className="user-schedule-today-date">
                      {new Date(todaySchedule.schedule_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h3 className="user-schedule-today-zone">{todaySchedule.zone}</h3>
                <div className="user-schedule-today-details">
                  <span className="user-schedule-today-detail">
                    <Clock className="user-schedule-today-detail-icon" />
                    {todaySchedule.time}
                  </span>
                  <span className="user-schedule-today-detail">
                    <MapPin className="user-schedule-today-detail-icon" />
                    Collection Day
                  </span>
                </div>
              </div>
              <CheckCircle className="user-schedule-today-check" />
            </div>
          </div>
        )}

        {/* Schedule Cards */}
        {sortedSchedules.length > 0 ? (
          <div className="user-schedule-grid">
            {sortedSchedules.map((schedule, index) => {
              const isToday = schedule.day_of_week === getCurrentDay()
              return (
                <div 
                  key={index} 
                  className={`user-schedule-item ${isToday ? 'today' : ''}`}
                >
                  <div className="user-schedule-item-header">
                    <div className="user-schedule-item-left">
                      <div className="user-schedule-item-icon">
                        <MapPin className="user-schedule-item-icon-svg" />
                      </div>
                      <div>
                        <h3 className="user-schedule-item-zone">{schedule.zone}</h3>
                        <p className="user-schedule-item-day">{schedule.day_of_week}</p>
                        {schedule.schedule_date && (
                          <p className="user-schedule-item-date">
                            {new Date(schedule.schedule_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="user-schedule-item-time">
                      <Clock className="user-schedule-item-time-icon" />
                      <span className="user-schedule-item-time-text">{schedule.time}</span>
                    </div>
                  </div>
                  <div className="user-schedule-item-footer">
                    <span className="user-schedule-item-status">
                      <CheckCircle className="user-schedule-item-status-icon" />
                      Active collection
                    </span>
                    {isToday && (
                      <span className="user-schedule-item-today-badge">Today</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="user-schedule-empty">
            <Calendar className="user-schedule-empty-icon" />
            <p className="user-schedule-empty-title">No active schedules available</p>
            <p className="user-schedule-empty-sub">Check back later for schedule updates</p>
          </div>
        )}

        {/* Next Collection Reminder */}
        {nextSchedule && sortedSchedules.length > 0 && (
          <div className="user-schedule-next">
            <div className="user-schedule-next-content">
              <div className="user-schedule-next-icon">
                <AlertCircle className="user-schedule-next-icon-svg" />
              </div>
              <div className="user-schedule-next-info">
                <p className="user-schedule-next-title">Next Collection</p>
                <p className="user-schedule-next-details">
                  <span className="user-schedule-next-bold">{nextSchedule.day_of_week}</span> at{' '}
                  <span className="user-schedule-next-bold">{nextSchedule.time}</span> -{' '}
                  <span className="user-schedule-next-zone">{nextSchedule.zone}</span>
                  {nextSchedule.schedule_date && (
                    <span className="user-schedule-next-date">
                      ({new Date(nextSchedule.schedule_date).toLocaleDateString()})
                    </span>
                  )}
                </p>
                {todaySchedule && (
                  <p className="user-schedule-next-today">
                    ✓ Collection is scheduled for today
                  </p>
                )}
              </div>
              <ChevronRight className="user-schedule-next-arrow" />
            </div>
          </div>
        )}

        {/* No Schedules Message */}
        {sortedSchedules.length === 0 && !loading && !error && (
          <div className="user-schedule-no-schedules">
            <div className="user-schedule-no-schedules-content">
              <AlertCircle className="user-schedule-no-schedules-icon" />
              <div>
                <p className="user-schedule-no-schedules-title">No Active Schedules</p>
                <p className="user-schedule-no-schedules-sub">
                  There are no active collection schedules available at the moment. Please check back later.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}