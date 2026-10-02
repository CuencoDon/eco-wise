'use client'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  TrendingUp, 
  Truck, 
  Bell, 
  Calendar, 
  Star,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Settings,
  BarChart3,
  Clock,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Save,
  Plus,
  Crown,
  Medal,
  Trophy,
  User,
  AlertCircle,
  Loader2,
  Package,
  Recycle
} from 'lucide-react'
import LineChartComponent from '@/components/LineChart'
import { supabase } from '@/lib/supabaseClient'

const FIXED_MATERIALS = ['Paper', 'Plastic', 'Metal']

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_points: 0,
    total_users: 0,
    total_recycled: 0,
    active_users: 0,
  })
  const [topCollectors, setTopCollectors] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState([
    { label: 'Collections Today', value: '0 trips', change: '', icon: Truck },
    { label: 'Recycled Today', value: '0 kg', change: '', icon: CheckCircle },
    { label: 'Active Users', value: '0', change: '', icon: Users },
    { label: 'Points Earned', value: '0', change: '', icon: Award },
  ])
  const [collectionTrips, setCollectionTrips] = useState(0)
  
  // Schedule State
  const [activeTab, setActiveTab] = useState<'performance' | 'schedule' | 'materials'>('performance')
  const [schedules, setSchedules] = useState<any[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [scheduleForm, setScheduleForm] = useState({
    zone: '',
    day_of_week: '',
    time: '',
    schedule_date: '',
    is_active: true
  })
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')
  const [showDeleteScheduleModal, setShowDeleteScheduleModal] = useState(false)
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null)

  // ===== Fixed Materials State (Paper, Plastic, Metal) =====
  const [materials, setMaterials] = useState<any[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(true)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [materialForm, setMaterialForm] = useState({
    name: '',
    points_per_kg: 5
  })
  const [materialSubmitting, setMaterialSubmitting] = useState(false)
  const [materialError, setMaterialError] = useState('')
  const [materialSuccess, setMaterialSuccess] = useState('')

  useEffect(() => {
    fetchDashboardData()
    fetchSchedules()
    fetchMaterials()

    // Refresh online count + today's stats every 15 seconds
    const todayInterval = setInterval(fetchDashboardData, 15000)
    const expireInterval = setInterval(checkExpiredSchedules, 60000)

    return () => {
      clearInterval(todayInterval)
      clearInterval(expireInterval)
    }
  }, [])

  // ============ FIXED MATERIALS ============
  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true)

      const { data, error } = await supabase
        .from('recyclable_materials')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.warn('Materials fetch warning:', error)
        setMaterials(FIXED_MATERIALS.map((name, i) => ({
          id: `fallback-${i}`,
          name,
          points_per_kg: name === 'Metal' ? 2 : 5,
          is_active: true
        })))
        return
      }

      const existingNames = (data || []).map((m: any) => m.name)
      const missing = FIXED_MATERIALS.filter(n => !existingNames.includes(n))

      if (missing.length > 0) {
        const toInsert = missing.map(name => ({
          name,
          points_per_kg: name === 'Metal' ? 2 : 5,
          hold_until_scheduled: false,
          schedule_day: null,
          is_active: true
        }))

        const { error: insertError } = await supabase
          .from('recyclable_materials')
          .insert(toInsert)

        if (insertError) {
          console.warn('Failed to seed materials:', insertError)
        }

        const { data: refreshed } = await supabase
          .from('recyclable_materials')
          .select('*')
          .order('name', { ascending: true })

        setMaterials(refreshed || data || [])
      } else {
        setMaterials(data || [])
      }
    } catch (err) {
      console.warn('Materials fetch error:', err)
      setMaterials(FIXED_MATERIALS.map((name, i) => ({
        id: `fallback-${i}`,
        name,
        points_per_kg: name === 'Metal' ? 2 : 5,
        is_active: true
      })))
    } finally {
      setMaterialsLoading(false)
    }
  }

  const openEditMaterialModal = (material: any) => {
    setEditingMaterial(material)
    setMaterialForm({
      name: material.name || '',
      points_per_kg: material.points_per_kg ?? 5
    })
    setMaterialError('')
    setShowMaterialModal(true)
  }

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMaterialSubmitting(true)
    setMaterialError('')

    try {
      if (materialForm.points_per_kg <= 0) {
        throw new Error('Points per kg must be greater than 0')
      }

      const { error } = await supabase
        .from('recyclable_materials')
        .update({
          points_per_kg: Number(materialForm.points_per_kg)
        })
        .eq('id', editingMaterial.id)

      if (error) throw error

      setMaterialSuccess(`${editingMaterial.name} updated successfully!`)
      await fetchMaterials()
      setShowMaterialModal(false)
      setTimeout(() => setMaterialSuccess(''), 3000)
    } catch (err: any) {
      setMaterialError(err.message || 'Failed to save material')
    } finally {
      setMaterialSubmitting(false)
    }
  }

  // ============ SCHEDULES ============
  const checkExpiredSchedules = async () => {
    try {
      const { data: schedulesData, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .eq('is_active', true)

      if (error) throw error

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
      const currentTime = now.toTimeString().slice(0, 5)

      let hasExpired = false

      for (const schedule of schedulesData || []) {
        const isExpired = 
          (schedule.schedule_date && schedule.schedule_date < today) ||
          (schedule.day_of_week === currentDay && schedule.time <= currentTime)

        if (isExpired && schedule.is_active) {
          const { error: updateError } = await supabase
            .from('collection_schedules')
            .update({ is_active: false })
            .eq('id', schedule.id)

          if (updateError) {
            console.error('Error updating expired schedule:', updateError)
          } else {
            hasExpired = true
          }
        }
      }

      if (hasExpired) {
        await fetchSchedules()
      }
    } catch (error) {
      console.error('Error checking expired schedules:', error)
    }
  }

  // ============ DASHBOARD DATA ============
  const fetchDashboardData = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const date = now.getDate()

      const todayStart = new Date(year, month, date, 0, 0, 0).toISOString()
      const todayEnd = new Date(year, month, date + 1, 0, 0, 0).toISOString()
      const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })

      // 1. All users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'user')

      if (usersError) {
        console.error('Error fetching users:', usersError)
        setLoading(false)
        return
      }

      const totalPoints = usersData?.reduce((sum, user) => sum + (user.total_points || 0), 0) || 0
      const totalRecycled = usersData?.reduce((sum, user) => sum + (user.total_recycled_kg || 0), 0) || 0
      const totalUsers = usersData?.length || 0

      const sortedCollectors = usersData
        ?.sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
        .slice(0, 5) || []

      setTopCollectors(sortedCollectors)

      // ============================================================
      // ONLINE USERS — anyone whose last_seen is within the last 60s
      // ============================================================
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()
      const { data: onlineUsers, error: onlineError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'user')
        .gt('last_seen', sixtySecondsAgo)

      const onlineCount = !onlineError && onlineUsers ? onlineUsers.length : 0

      setStats({
        total_points: totalPoints,
        total_users: totalUsers,
        total_recycled: totalRecycled,
        active_users: onlineCount,
      })

      // 2. Collections today — schedules with schedule_date today OR day_of_week matches today
      const { data: allSchedules, error: schedError } = await supabase
        .from('collection_schedules')
        .select('*')

      let collectionsTodayCount = 0
      let activeSchedulesCount = 0

      if (!schedError && allSchedules) {
        collectionsTodayCount = allSchedules.filter(s => {
          if (s.schedule_date && s.schedule_date === todayStr) return true
          if (s.day_of_week === currentDay) return true
          return false
        }).length

        activeSchedulesCount = allSchedules.filter(s => s.is_active).length
      }

      setCollectionTrips(activeSchedulesCount)

      // 3. Today's recycling records — Recycled Today, Points Earned
      const { data: todayRecords, error: recordsError } = await supabase
        .from('recycling_records')
        .select('*')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)

      let totalRecycledToday = 0
      let totalPointsToday = 0

      if (!recordsError && todayRecords) {
        totalRecycledToday = todayRecords.reduce((sum, r) => sum + (r.weight_kg || 0), 0)
        totalPointsToday = todayRecords.reduce((sum, r) => sum + (r.points_earned || 0), 0)
      }

      // 4. Update today's tiles
      setTodayStats([
        {
          label: 'Collections Today',
          value: `${collectionsTodayCount} ${collectionsTodayCount === 1 ? 'trip' : 'trips'}`,
          change: '',
          icon: Truck
        },
        {
          label: 'Recycled Today',
          value: `${totalRecycledToday.toFixed(1)} kg`,
          change: '',
          icon: CheckCircle
        },
        {
          label: 'Active Users',
          value: `${onlineCount}`,
          change: '',
          icon: Users
        },
        {
          label: 'Points Earned',
          value: `${totalPointsToday.toLocaleString()}`,
          change: '',
          icon: Award
        },
      ])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedules = async () => {
    try {
      setScheduleLoading(true)
      const { data, error } = await supabase
        .from('collection_schedules')
        .select('*')
        .order('day_of_week', { ascending: true })

      if (error) {
        console.error('Error fetching schedules:', error)
        setSchedules([])
      } else {
        await checkExpiredSchedules()
        const { data: freshData } = await supabase
          .from('collection_schedules')
          .select('*')
          .order('day_of_week', { ascending: true })
        setSchedules(freshData || [])
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      setSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }

  const getDayIndex = (day: string) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days.indexOf(day)
  }

  const sortedSchedules = [...schedules].sort((a, b) => {
    return getDayIndex(a.day_of_week) - getDayIndex(b.day_of_week)
  })

  const openAddScheduleModal = () => {
    setEditingSchedule(null)
    const today = new Date().toISOString().split('T')[0]
    setScheduleForm({
      zone: '',
      day_of_week: '',
      time: '',
      schedule_date: today,
      is_active: true
    })
    setScheduleError('')
    setShowScheduleModal(true)
  }

  const openEditScheduleModal = (schedule: any) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      zone: schedule.zone || '',
      day_of_week: schedule.day_of_week || '',
      time: schedule.time || '',
      schedule_date: schedule.schedule_date || new Date().toISOString().split('T')[0],
      is_active: schedule.is_active !== undefined ? schedule.is_active : true
    })
    setScheduleError('')
    setShowScheduleModal(true)
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setScheduleSubmitting(true)
    setScheduleError('')

    try {
      if (!scheduleForm.zone.trim()) throw new Error('Zone is required')
      if (!scheduleForm.day_of_week) throw new Error('Day of week is required')
      if (!scheduleForm.time) throw new Error('Time is required')
      if (!scheduleForm.schedule_date) throw new Error('Date is required')

      const scheduleData = {
        zone: scheduleForm.zone.trim(),
        day_of_week: scheduleForm.day_of_week,
        time: scheduleForm.time,
        schedule_date: scheduleForm.schedule_date,
        is_active: scheduleForm.is_active
      }

      if (editingSchedule) {
        const { error } = await supabase
          .from('collection_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id)

        if (error) throw error
        setScheduleSuccess('Schedule updated successfully!')
      } else {
        const { error } = await supabase
          .from('collection_schedules')
          .insert([scheduleData])

        if (error) throw error
        setScheduleSuccess('Schedule created successfully!')
      }

      await fetchSchedules()
      await fetchDashboardData()
      setShowScheduleModal(false)
      setTimeout(() => setScheduleSuccess(''), 3000)
    } catch (error: any) {
      setScheduleError(error.message || 'Failed to save schedule')
    } finally {
      setScheduleSubmitting(false)
    }
  }

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .delete()
        .eq('id', scheduleToDelete.id)

      if (error) throw error

      await fetchSchedules()
      await fetchDashboardData()

      setShowDeleteScheduleModal(false)
      setScheduleToDelete(null)
      setScheduleSuccess('Schedule deleted successfully!')
      setTimeout(() => setScheduleSuccess(''), 3000)
    } catch (error: any) {
      setScheduleError(error.message || 'Failed to delete schedule')
    }
  }

  const toggleScheduleStatus = async (schedule: any) => {
    try {
      const { error } = await supabase
        .from('collection_schedules')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id)

      if (error) throw error
      await fetchSchedules()
      await fetchDashboardData()
    } catch (error: any) {
      setScheduleError(error.message || 'Failed to update status')
    }
  }

  const getMedal = (index: number) => {
    switch(index) {
      case 0: return <Trophy className="w-4 h-4 text-yellow-500" />
      case 1: return <Medal className="w-4 h-4 text-gray-400" />
      case 2: return <Medal className="w-4 h-4 text-amber-700" />
      default: return <Award className="w-4 h-4 text-blue-400" />
    }
  }

  const top1Collector = topCollectors.slice(0, 1)

  const statCards = [
    { label: 'Total Points', value: stats.total_points.toLocaleString(), change: '', icon: Award, cardClass: 'stat-square yellow' },
    { label: 'Households', value: stats.total_users.toString(), change: '', icon: Users, cardClass: 'stat-square blue' },
    { label: 'Waste Collected', value: `${stats.total_recycled.toFixed(1)} kg`, change: '', icon: Truck, cardClass: 'stat-square green' },
    { label: 'Top Collectors', value: topCollectors.length > 0 ? `Top ${topCollectors.length}` : '0', change: 'View All', icon: Crown, cardClass: 'stat-square purple', showTopCollectors: true },
  ]

  const displayMaterials = FIXED_MATERIALS.map(name => {
    const found = materials.find(m => m.name === name)
    return found || { id: `placeholder-${name}`, name, points_per_kg: name === 'Metal' ? 2 : 5, is_active: true }
  })

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-spinner"></div>
        <p className="dashboard-loading-text">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className={stat.cardClass}>
              <div className="stat-icon">
                <Icon />
              </div>
              <div className="stat-label" style={{ fontSize: '11px' }}>{stat.label}</div>
              <div className="stat-value" style={{ fontSize: '22px' }}>{stat.value}</div>
              {stat.change && (
                <div className="stat-change" style={{ fontSize: '10px' }}>
                  <span>{stat.change}</span>
                </div>
              )}
              {stat.showTopCollectors && top1Collector.length > 0 && (
                <div className="stat-top-collectors">
                  {top1Collector.map((collector, idx) => (
                    <div key={idx} className="stat-collector-item">
                      <span style={{ width: '14px', flexShrink: 0 }}>{getMedal(idx)}</span>
                      <span className="stat-collector-name" style={{ fontSize: '10px' }}>{collector.full_name || 'Anonymous'}</span>
                      <span className="stat-collector-points" style={{ fontSize: '10px' }}>{collector.total_points || 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-two-col">
        <div className="dashboard-left">
          <div className="overview-card">
            <div className="overview-card-header">
              <div className="overview-card-header-left">
                <div className="overview-card-header-icon">
                  <BarChart3 />
                </div>
                <div>
                  <div className="overview-card-header-title">Performance Overview</div>
                  <div className="overview-card-header-subtitle">Weekly points & households trend</div>
                </div>
              </div>
              <div className="overview-card-header-right">
                <div className="overview-legend">
                  <span className="overview-legend-dot yellow"></span>
                  <span className="overview-legend-label">Points</span>
                </div>
                <div className="overview-legend">
                  <span className="overview-legend-dot blue"></span>
                  <span className="overview-legend-label">Households</span>
                </div>
                <span className="overview-card-header-badge">This Week</span>
              </div>
            </div>
            <LineChartComponent />
          </div>
        </div>

        <div className="dashboard-right">
          {/* Tab Switcher */}
          <div className="tab-switcher">
            <button
              onClick={() => setActiveTab('performance')}
              className={`tab-btn ${activeTab === 'performance' ? 'active' : 'inactive'}`}
            >
              <Clock className="tab-btn-icon" />
              Performance
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`tab-btn ${activeTab === 'schedule' ? 'active' : 'inactive'}`}
            >
              <Calendar className="tab-btn-icon" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`tab-btn ${activeTab === 'materials' ? 'active' : 'inactive'}`}
            >
              <Recycle className="tab-btn-icon" />
              Materials
            </button>
          </div>

          {/* Today's Performance */}
          {activeTab === 'performance' && (
            <div className="today-stats-card">
              <div className="today-stats-header">
                <div className="today-stats-header-icon">
                  <Clock />
                </div>
                <div>
                  <div className="today-stats-header-title">Today's Performance</div>
                  <div className="today-stats-header-subtitle">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <span className="today-stats-live-badge">Live</span>
              </div>
              <div className="today-stats-body">
                {todayStats.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={index} className="today-stat-item">
                      <div className="today-stat-left">
                        <div className="today-stat-icon-wrapper">
                          <Icon />
                        </div>
                        <div className="today-stat-info">
                          <span className="today-stat-label">{item.label}</span>
                          <span className="today-stat-value">{item.value}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Schedule Card */}
          {activeTab === 'schedule' && (
            <div className="today-stats-card">
              <div className="today-stats-header">
                <div className="today-stats-header-icon">
                  <Calendar />
                </div>
                <div>
                  <div className="today-stats-header-title">Collection Schedule</div>
                  <div className="today-stats-header-subtitle">
                    {collectionTrips} Active {collectionTrips === 1 ? 'Trip' : 'Trips'}
                  </div>
                </div>
                <button onClick={openAddScheduleModal} className="schedule-add-btn">
                  <Plus className="schedule-add-icon" />
                  Add
                </button>
              </div>

              <div className="schedule-scrollable">
                {scheduleLoading ? (
                  <div className="schedule-loading-text">Loading schedules...</div>
                ) : sortedSchedules.length > 0 ? (
                  sortedSchedules.map((schedule, index) => {
                    const now = new Date()
                    const today = now.toISOString().split('T')[0]
                    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
                    const currentTime = now.toTimeString().slice(0, 5)
                    const isExpired = 
                      (schedule.schedule_date && schedule.schedule_date < today) ||
                      (schedule.day_of_week === currentDay && schedule.time <= currentTime)
                    
                    return (
                      <div key={schedule.id || index} className="schedule-item">
                        <div className="schedule-item-left">
                          <div className="schedule-item-icon">
                            <Calendar />
                          </div>
                          <div className="schedule-item-info">
                            <span className="schedule-item-day">
                              {schedule.day_of_week}
                              {schedule.schedule_date && (
                                <span className="schedule-item-date">
                                  {new Date(schedule.schedule_date).toLocaleDateString()}
                                </span>
                              )}
                              {isExpired && (
                                <span className="schedule-status-badge expired">Expired</span>
                              )}
                              {!isExpired && (
                                <span className={`schedule-status-badge ${schedule.is_active ? 'active' : 'inactive'}`}>
                                  {schedule.is_active ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </span>
                            <span className="schedule-item-details">{schedule.zone} - {schedule.time}</span>
                          </div>
                        </div>
                        <div className="schedule-actions">
                          <button onClick={() => toggleScheduleStatus(schedule)} className="schedule-action-btn toggle" title="Toggle Status">
                            <RefreshCw />
                          </button>
                          <button onClick={() => openEditScheduleModal(schedule)} className="schedule-action-btn edit" title="Edit">
                            <Edit />
                          </button>
                          <button
                            onClick={() => {
                              setScheduleToDelete(schedule)
                              setShowDeleteScheduleModal(true)
                            }}
                            className="schedule-action-btn delete"
                            title="Delete"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="schedule-empty-text">
                    No schedules found. Click "Add" to create one.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Materials Card */}
          {activeTab === 'materials' && (
            <div className="today-stats-card">
              <div className="today-stats-header">
                <div className="today-stats-header-icon">
                  <Recycle />
                </div>
                <div>
                  <div className="today-stats-header-title">Recyclable Materials</div>
                  <div className="today-stats-header-subtitle">
                    Paper, Plastic, Metal — Points per kg
                  </div>
                </div>
              </div>

              <div className="schedule-scrollable">
                {materialsLoading ? (
                  <div className="schedule-loading-text">Loading materials...</div>
                ) : (
                  displayMaterials.map((material, index) => (
                    <div key={material.id || index} className="schedule-item">
                      <div className="schedule-item-left">
                        <div className="schedule-item-icon">
                          <Package />
                        </div>
                        <div className="schedule-item-info">
                          <span className="schedule-item-day">
                            {material.name}
                            <span className="schedule-status-badge active">Active</span>
                          </span>
                          <span className="schedule-item-details">
                            {material.points_per_kg} pts/kg
                          </span>
                        </div>
                      </div>
                      <div className="schedule-actions">
                        <button
                          onClick={() => openEditMaterialModal(material)}
                          className="schedule-action-btn edit"
                          title="Edit points per kg"
                        >
                          <Edit />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Add/Edit Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <Calendar />
                </div>
                <h2 className="modal-title">
                  {editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
                </h2>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="modal-close-btn">
                <X />
              </button>
            </div>

            {scheduleError && (
              <div className="modal-error">
                <AlertCircle />
                <span>{scheduleError}</span>
              </div>
            )}

            {scheduleSuccess && (
              <div className="modal-success">
                <CheckCircle />
                <span>{scheduleSuccess}</span>
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Zone <span className="form-required">*</span></label>
                <input
                  type="text"
                  value={scheduleForm.zone}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, zone: e.target.value })}
                  placeholder="Enter zone name"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Day of Week <span className="form-required">*</span></label>
                <select
                  value={scheduleForm.day_of_week}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                  className="form-select"
                  required
                >
                  <option value="">Select day</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Time <span className="form-required">*</span></label>
                <input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date <span className="form-required">*</span></label>
                <input
                  type="date"
                  value={scheduleForm.schedule_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_active}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={scheduleSubmitting} className="btn-submit">
                  {scheduleSubmitting ? (
                    <>
                      <Loader2 className="btn-spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save />
                      {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Schedule Modal */}
      {showDeleteScheduleModal && scheduleToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteScheduleModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <div className="delete-modal-icon">
                <Trash2 />
              </div>
              <h2 className="delete-modal-title">Confirm Delete</h2>
            </div>
            <p className="delete-modal-message">
              Are you sure you want to delete <strong>{scheduleToDelete.zone}</strong> schedule?
            </p>
            <p className="delete-modal-warning">This action cannot be undone.</p>
            <div className="delete-modal-actions">
              <button onClick={handleDeleteSchedule} className="btn-delete">
                <Trash2 />
                Delete Schedule
              </button>
              <button
                onClick={() => {
                  setShowDeleteScheduleModal(false)
                  setScheduleToDelete(null)
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Edit Modal */}
      {showMaterialModal && editingMaterial && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <Recycle />
                </div>
                <h2 className="modal-title">
                  Edit {editingMaterial.name}
                </h2>
              </div>
              <button onClick={() => setShowMaterialModal(false)} className="modal-close-btn">
                <X />
              </button>
            </div>

            {materialError && (
              <div className="modal-error">
                <AlertCircle />
                <span>{materialError}</span>
              </div>
            )}

            {materialSuccess && (
              <div className="modal-success">
                <CheckCircle />
                <span>{materialSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMaterialSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Material</label>
                <input
                  type="text"
                  value={editingMaterial.name}
                  className="form-input"
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Points per kg <span className="form-required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={materialForm.points_per_kg}
                  onChange={(e) => setMaterialForm({ ...materialForm, points_per_kg: Number(e.target.value) })}
                  className="form-input"
                  required
                />
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                  Users earn this many points for every kg of {editingMaterial.name} they recycle.
                </p>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={materialSubmitting} className="btn-submit">
                  {materialSubmitting ? (
                    <>
                      <Loader2 className="btn-spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save />
                      Save Changes
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setShowMaterialModal(false)} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}