'use client'
import UserSidebar from '@/components/UserSidebar'
import { Bell, Calendar, Gift, CheckCircle, LogOut, User as UserIcon, Lock, Save, X, Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect, useRef } from 'react'

interface Notification {
  id: string
  type: 'schedule' | 'redeem_item' | 'receipt'
  title: string
  message: string
  createdAt: string
  route: string
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userPoints, setUserPoints] = useState(0)
  const [userRecycled, setUserRecycled] = useState(0)
  const [userId, setUserId] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // ===== Account modal state =====
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountForm, setAccountForm] = useState({ fullName: '', phone: '' })
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [showSavedPopup, setShowSavedPopup] = useState(false)

  // ===== Change password state =====
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordSending, setPasswordSending] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Get user session + load read IDs
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserEmail(session.user.email || '')
        setUserName(
          session.user.user_metadata?.full_name ||
          session.user.email?.split('@')[0] ||
          'User'
        )

        const { data: profile } = await supabase
          .from('users')
          .select('id, total_points, total_recycled_kg, full_name, phone')
          .eq('email', session.user.email)
          .single()

        if (profile) {
          setUserId(profile.id)
          setUserPoints(profile.total_points || 0)
          setUserRecycled(profile.total_recycled_kg || 0)
          if (profile.full_name) setUserName(profile.full_name)
          setAccountForm({
            fullName: profile.full_name || '',
            phone: profile.phone || ''
          })
          const stored = localStorage.getItem(`read_notifications_${profile.id}`)
          if (stored) {
            try { setReadIds(JSON.parse(stored)) } catch {}
          }
        }
      }
    }
    getUser()
  }, [])

  // HEARTBEAT
  useEffect(() => {
    if (!userId) return
    let stopped = false
    let heartbeatInterval: NodeJS.Timeout | null = null

    const sendHeartbeat = async () => {
      if (stopped) return
      if (document.visibilityState !== 'visible') return
      try {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId)
      } catch {}
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sendHeartbeat()
    }

    sendHeartbeat()
    heartbeatInterval = setInterval(sendHeartbeat, 30000)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stopped = true
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [userId])

  // Fetch notifications
  useEffect(() => {
    if (!userId) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [userId])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    if (showDropdown || showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown, showAccountMenu])

  const fetchNotifications = async () => {
    if (!userId) return
    setLoadingNotifications(true)

    try {
      const all: Notification[] = []
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: schedules } = await supabase
        .from('collection_schedules')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5)

      schedules?.forEach((s) => {
        all.push({
          id: `schedule-${s.id}`,
          type: 'schedule',
          title: 'New Collection Schedule',
          message: `${s.zone} — ${s.day_of_week} at ${s.time}`,
          createdAt: s.created_at,
          route: '/user/schedule',
        })
      })

      const { data: items } = await supabase
        .from('redeem_items')
        .select('*')
        .eq('is_active', true)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5)

      items?.forEach((item) => {
        all.push({
          id: `redeem-${item.id}`,
          type: 'redeem_item',
          title: 'New Redeemable Item',
          message: `${item.name} — ${item.points_required} pts`,
          createdAt: item.created_at,
          route: '/user/redeem-items',
        })
      })

      const { data: receipts } = await supabase
        .from('redeem_history')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5)

      receipts?.forEach((r) => {
        all.push({
          id: `receipt-${r.id}`,
          type: 'receipt',
          title: 'Redeem Receipt',
          message: `You redeemed ${r.item_name} — ${r.points_spent} pts`,
          createdAt: r.created_at,
          route: `/user/redeem-items/${r.id}`,
        })
      })

      all.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setNotifications(all)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleNotificationClick = (n: Notification) => {
    const updated = Array.from(new Set([...readIds, n.id]))
    setReadIds(updated)
    if (userId) {
      localStorage.setItem(`read_notifications_${userId}`, JSON.stringify(updated))
    }
    setShowDropdown(false)
    router.push(n.route)
  }

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id)
    setReadIds(allIds)
    if (userId) {
      localStorage.setItem(`read_notifications_${userId}`, JSON.stringify(allIds))
    }
  }

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return <Calendar style={{ width: '16px', height: '16px' }} />
      case 'redeem_item':
        return <Gift style={{ width: '16px', height: '16px' }} />
      case 'receipt':
        return <CheckCircle style={{ width: '16px', height: '16px' }} />
      default:
        return <Bell style={{ width: '16px', height: '16px' }} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'schedule':
        return '#3b82f6'
      case 'redeem_item':
        return '#FCCD2A'
      case 'receipt':
        return '#72BF78'
      default:
        return '#6b7280'
    }
  }

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const handleLogout = async () => {
    if (userId) {
      try {
        await supabase
          .from('users')
          .update({ last_seen: null })
          .eq('id', userId)
      } catch {}
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  // ===== Account modal handlers =====
  const openAccountModal = () => {
    setAccountError('')
    setShowAccountMenu(false)
    setShowAccountModal(true)
  }

  const handleAccountSave = async () => {
    if (!userId) return
    setAccountSaving(true)
    setAccountError('')

    try {
      if (!accountForm.fullName.trim()) {
        throw new Error('Full name is required')
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: accountForm.fullName.trim(),
          phone: accountForm.phone.trim() || null
        })
        .eq('id', userId)

      if (error) throw error

      setUserName(accountForm.fullName.trim())
      setShowAccountModal(false)
      setShowSavedPopup(true)
      setTimeout(() => setShowSavedPopup(false), 2500)
    } catch (err: any) {
      setAccountError(err.message || 'Failed to save')
    } finally {
      setAccountSaving(false)
    }
  }

  // ===== Change password handlers =====
  const openPasswordModal = () => {
    setPasswordMessage('')
    setPasswordError('')
    setShowAccountMenu(false)
    setShowPasswordModal(true)
  }

  const handleSendResetEmail = async () => {
    if (!userEmail) return
    setPasswordSending(true)
    setPasswordMessage('')
    setPasswordError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/`
      })

      if (error) throw error

      setPasswordMessage(
        `A password reset link has been sent to ${userEmail}. Check your inbox.`
      )
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email')
    } finally {
      setPasswordSending(false)
    }
  }

  const getPageTitle = () => {
    if (pathname?.includes('/user/dashboard')) return 'Dashboard'
    if (pathname?.includes('/user/schedule')) return 'Schedule'
    if (pathname?.includes('/user/wallet')) return 'Wallet'
    if (pathname?.includes('/user/redeem-items')) return 'Redeem Items'
    return 'Dashboard'
  }

  return (
    <div className="admin-container">
      <UserSidebar />
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-content">
            <div className="admin-header-left">
              <div className="admin-logo">
                <img
                  src="/ecowaste.png"
                  alt="EcoWaste Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
                />
              </div>
              <div>
                <h1 className="admin-title">EcoWaste</h1>
                <p className="admin-subtitle">{getPageTitle()}</p>
              </div>
            </div>
            <div className="admin-header-right">
              <div className="admin-date">
                <span>📅</span>
                <span>
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Notification Bell */}
              <div ref={dropdownRef} style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowDropdown((prev) => !prev)
                    setShowAccountMenu(false)
                  }}
                  style={{
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '8px',
                    background: showDropdown ? 'rgba(255,255,255,0.2)' : 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                    zIndex: 10000,
                    transition: 'background 0.2s ease'
                  }}
                >
                  <Bell style={{ width: '18px', height: '18px', pointerEvents: 'none', color: '#ffffff' }} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        minWidth: '18px',
                        height: '18px',
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        borderRadius: '50%',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #72BF78',
                        pointerEvents: 'none'
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showDropdown && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 10px)',
                      right: 0,
                      width: '340px',
                      maxHeight: '440px',
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                      border: '1px solid #e5e7eb',
                      zIndex: 100000,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      pointerEvents: 'auto'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell style={{ width: '16px', height: '16px', color: '#374151' }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              padding: '2px 6px',
                              borderRadius: '8px'
                            }}
                          >
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAllAsRead()
                          }}
                          style={{ fontSize: '11px', color: '#72BF78', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '380px' }}>
                      {loadingNotifications && notifications.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                          Loading notifications...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                          <Bell style={{ width: '40px', height: '40px', margin: '0 auto 8px', color: '#d1d5db', display: 'block' }} />
                          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isRead = readIds.includes(n.id)
                          return (
                            <div
                              key={n.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNotificationClick(n)
                              }}
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                backgroundColor: isRead ? '#ffffff' : '#f0fdf4',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = isRead ? '#ffffff' : '#f0fdf4')
                              }
                            >
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <div
                                  style={{
                                    flexShrink: 0,
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: `${getTypeColor(n.type)}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: getTypeColor(n.type)
                                  }}
                                >
                                  {getIcon(n.type)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                                      {n.title}
                                    </p>
                                    {!isRead && (
                                      <span
                                        style={{
                                          width: '8px',
                                          height: '8px',
                                          borderRadius: '50%',
                                          backgroundColor: '#72BF78',
                                          flexShrink: 0,
                                          marginTop: '5px'
                                        }}
                                      />
                                    )}
                                  </div>
                                  <p
                                    style={{
                                      fontSize: '12px',
                                      color: '#6b7280',
                                      margin: '2px 0 0',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {n.message}
                                  </p>
                                  <p style={{ fontSize: '10px', color: '#9ca3af', margin: '4px 0 0' }}>
                                    {getRelativeTime(n.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== ACCOUNT MENU ===== */}
              <div ref={accountRef} style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto' }}>
                <div
                  className="admin-user"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAccountMenu((prev) => !prev)
                    setShowDropdown(false)
                  }}
                  style={{
                    cursor: 'pointer',
                    background: showAccountMenu ? 'rgba(255,255,255,0.2)' : undefined
                  }}
                >
                  <div className="admin-avatar">{userName.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="admin-user-name">{userName}</p>
                    <p className="admin-user-email">{userEmail}</p>
                  </div>
                </div>

                {showAccountMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 10px)',
                      right: 0,
                      width: '300px',
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                      border: '1px solid #e5e7eb',
                      zIndex: 100000,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* User info header */}
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #B6FFA1, #72BF78)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '20px',
                          flexShrink: 0
                        }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#1a1a1a',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {userName}
                        </p>
                        <p
                          style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            margin: '2px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {userEmail}
                        </p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#fef3c7',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          textAlign: 'center'
                        }}
                      >
                        <p style={{ fontSize: '10px', color: '#92400e', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Points
                        </p>
                        <p style={{ fontSize: '18px', color: '#78350f', margin: '4px 0 0', fontWeight: 700 }}>
                          {userPoints.toLocaleString()}
                        </p>
                      </div>
                      <div
                        style={{
                          backgroundColor: '#dcfce7',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          textAlign: 'center'
                        }}
                      >
                        <p style={{ fontSize: '10px', color: '#166534', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Recycled
                        </p>
                        <p style={{ fontSize: '18px', color: '#14532d', margin: '4px 0 0', fontWeight: 700 }}>
                          {userRecycled.toFixed(1)} kg
                        </p>
                      </div>
                    </div>

                    {/* Menu items */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openAccountModal()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 500,
                        width: '100%',
                        textAlign: 'left',
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <UserIcon style={{ width: '16px', height: '16px' }} />
                      My Account
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openPasswordModal()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: 500,
                        width: '100%',
                        textAlign: 'left',
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0fdf4')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Lock style={{ width: '16px', height: '16px' }} />
                      Change Password
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAccountMenu(false)
                        handleLogout()
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: 500,
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LogOut style={{ width: '16px', height: '16px' }} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>

      {/* ===== MY ACCOUNT MODAL ===== */}
      {showAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <UserIcon />
                </div>
                <h2 className="modal-title">My Account</h2>
              </div>
              <button onClick={() => setShowAccountModal(false)} className="modal-close-btn">
                <X />
              </button>
            </div>

            {accountError && (
              <div className="modal-error">
                <span>{accountError}</span>
              </div>
            )}

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name <span className="form-required">*</span></label>
                <input
                  type="text"
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  className="form-input"
                  disabled
                />
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  Email cannot be changed here. Contact the barangay hall to update it.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  value={accountForm.phone}
                  onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleAccountSave}
                  disabled={accountSaving}
                  className="btn-submit"
                >
                  {accountSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHANGE PASSWORD MODAL ===== */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-header-icon">
                  <Lock />
                </div>
                <h2 className="modal-title">Change Password</h2>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="modal-close-btn">
                <X />
              </button>
            </div>

            {passwordMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px 14px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  color: '#166534',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}
              >
                <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px' }} />
                <span>{passwordMessage}</span>
              </div>
            )}

            {passwordError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}
              >
                <span>{passwordError}</span>
              </div>
            )}

            <div className="modal-form">
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px', lineHeight: 1.6 }}>
                We'll email a secure link to <strong>{userEmail}</strong>. Click the link to set a new password.
              </p>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={userEmail}
                  className="form-input"
                  disabled
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={passwordSending}
                  className="btn-submit"
                >
                  {passwordSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Send Reset Link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-cancel"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SUCCESS POPUP after saving account ===== */}
      {showSavedPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '40px 48px',
              maxWidth: '380px',
              width: '100%',
              margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <CheckCircle style={{ width: '40px', height: '40px', color: '#22c55e' }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>
              Changes Saved
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Your account has been updated.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}