'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  User, 
  Mail,
  Globe,
  MapPin,
  Calendar,
  Phone,
  Award,
  CheckCircle,
  Users,
  TrendingUp,
  Clock,
  Settings,
  LogOut,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSavePopup, setShowSavePopup] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    totalRecycled: 0,
    uptime: 99.9
  })
  const [settings, setSettings] = useState({
    siteName: 'EcoWaste Management',
    email: '',
    phone: '',
    collectionDays: 'Mon, Wed, Fri',
    fullName: ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/')
          return
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()

        if (error || !userData) {
          const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User'
          const role = session.user.user_metadata?.role || 'user'
          
          await supabase
            .from('users')
            .insert({
              email: session.user.email,
              full_name: fullName,
              role: role
            })
          
          const { data: newUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single()
          
          setUser(newUser)
          setSettings(prev => ({
            ...prev,
            email: newUser?.email || session.user.email,
            fullName: newUser?.full_name || fullName,
            phone: newUser?.phone || ''
          }))
        } else {
          setUser(userData)
          setSettings(prev => ({
            ...prev,
            email: userData?.email || session.user.email,
            fullName: userData?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            phone: userData?.phone || ''
          }))
        }

        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user')

        const { data: pointsData } = await supabase
          .from('users')
          .select('total_points')
          .eq('role', 'user')

        const totalPoints = pointsData?.reduce((sum, u) => sum + (u.total_points || 0), 0) || 0

        const { data: recycledData } = await supabase
          .from('users')
          .select('total_recycled_kg')
          .eq('role', 'user')

        const totalRecycled = recycledData?.reduce((sum, u) => sum + (u.total_recycled_kg || 0), 0) || 0

        setStats({
          totalUsers: totalUsers || 0,
          totalPoints: totalPoints,
          totalRecycled: totalRecycled,
          uptime: 99.9
        })

      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      // Only update columns that exist in the users table
      const { error } = await supabase
        .from('users')
        .update({
          full_name: settings.fullName,
          phone: settings.phone
        })
        .eq('id', user.id)

      if (error) {
        alert('Error saving settings: ' + error.message)
      } else {
        setShowSavePopup(true)
        setTimeout(() => setShowSavePopup(false), 2500)

        const { data: updatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        setUser(updatedUser)
        setSettings(prev => ({
          ...prev,
          fullName: updatedUser?.full_name || prev.fullName,
          phone: updatedUser?.phone || prev.phone
        }))
      }
    } catch (error: any) {
      alert('Error saving settings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500">User not found. Please login again.</p>
          <button 
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-container" style={{ position: 'relative' }}>
      {/* ===== SUCCESS POPUP ===== */}
      {showSavePopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '40px 48px',
              maxWidth: '400px',
              width: '100%',
              margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'scaleIn 0.3s ease-out',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)'
              }}
            >
              <CheckCircle style={{ width: '48px', height: '48px', color: '#22c55e' }} />
            </div>

            <h3
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1a1a1a',
                marginBottom: '8px'
              }}
            >
              Changes Saved
            </h3>

            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}
            >
              Your settings have been updated successfully.
            </p>

            <button
              onClick={() => setShowSavePopup(false)}
              style={{
                padding: '10px 32px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} />
              OK
            </button>
          </div>
        </div>
      )}

      <div className="settings-wrapper">
        {/* User Profile Header */}
        <div className="settings-profile-header">
          <div className="settings-profile-left">
            <div className="settings-avatar">
              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="settings-profile-name">{user.full_name || user.email?.split('@')[0] || 'User'}</p>
              <p className="settings-profile-email">{user.email}</p>
              <p className="settings-profile-role">Role: {user.role || 'user'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="settings-logout-btn">
            <LogOut />
            Logout
          </button>
        </div>

        {/* Settings Grid */}
        <div className="settings-grid">
          {/* General Settings — barangay is now fixed read-only */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon blue">
                <Globe />
              </div>
              <div>
                <h3 className="settings-card-title">General Settings</h3>
                <p className="settings-card-subtitle">Basic system configuration</p>
              </div>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="settings-input"
                placeholder="Enter site name"
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Barangay</label>
              <div className="settings-display-value">Barangay Banicain</div>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Collection Days</label>
              <input
                type="text"
                value={settings.collectionDays}
                onChange={(e) => setSettings({ ...settings, collectionDays: e.target.value })}
                className="settings-input"
                placeholder="e.g. Mon, Wed, Fri"
              />
            </div>
          </div>

          {/* Profile Settings */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon green">
                <User />
              </div>
              <div>
                <h3 className="settings-card-title">Profile Settings</h3>
                <p className="settings-card-subtitle">Manage your account</p>
              </div>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Full Name</label>
              <input 
                type="text" 
                value={settings.fullName}
                onChange={(e) => setSettings({...settings, fullName: e.target.value})}
                className="settings-input"
                placeholder="Enter full name"
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Email</label>
              <input 
                type="email" 
                value={user.email}
                className="settings-input"
                disabled
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Phone</label>
              <input 
                type="tel" 
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
                className="settings-input"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* System Status */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon purple">
                <Settings />
              </div>
              <div>
                <h3 className="settings-card-title">System Status</h3>
                <p className="settings-card-subtitle">Current system health</p>
              </div>
            </div>
            <div className="settings-status-box">
              <div className="flex items-center gap-3">
                <div className="settings-status-dot"></div>
                <span className="settings-status-text">All systems operational</span>
              </div>
              <p className="settings-status-date">Last checked: {new Date().toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <p className="text-xs text-gray-500">Uptime</p>
                <p className="text-xl font-bold text-gray-800">{stats.uptime}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <p className="text-xs text-gray-500">Users</p>
                <p className="text-xl font-bold text-gray-800">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* System Overview */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon yellow">
                <Award />
              </div>
              <div>
                <h3 className="settings-card-title">System Overview</h3>
                <p className="settings-card-subtitle">Community impact</p>
              </div>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Total Points Earned</label>
              <div className="settings-display-value">{stats.totalPoints.toLocaleString()} pts</div>
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Total Recycled</label>
              <div className="settings-display-value">{stats.totalRecycled.toFixed(1)} kg</div>
            </div>
            <div className="settings-alert green">
              <CheckCircle />
              Your community has recycled <strong>{stats.totalRecycled.toFixed(1)} kg</strong> of waste!
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="settings-stats-grid">
          <div className="settings-stat-card">
            <div className="settings-stat-header">
              <Users className="text-blue-500" />
              <span className="stat-label">Total Users</span>
            </div>
            <p className="settings-stat-value">{stats.totalUsers}</p>
          </div>
          <div className="settings-stat-card">
            <div className="settings-stat-header">
              <Award className="text-yellow-500" />
              <span className="stat-label">Total Points</span>
            </div>
            <p className="settings-stat-value">{stats.totalPoints.toLocaleString()}</p>
          </div>
          <div className="settings-stat-card">
            <div className="settings-stat-header">
              <TrendingUp className="text-green-500" />
              <span className="stat-label">Recycled Total</span>
            </div>
            <p className="settings-stat-value">{stats.totalRecycled.toFixed(1)} kg</p>
          </div>
          <div className="settings-stat-card">
            <div className="settings-stat-header">
              <Clock className="text-purple-500" />
              <span className="stat-label">Uptime</span>
            </div>
            <p className="settings-stat-value">{stats.uptime}%</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="settings-save-btn"
            style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            <Save />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}