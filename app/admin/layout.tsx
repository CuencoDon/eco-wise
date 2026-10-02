'use client'
import AdminSidebar from '@/components/AdminSidebar'
import { Bell, Calendar, Gift, CheckCircle, Users, LogOut, Shield } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect, useRef } from 'react'

interface Notification {
  id: string
  type: 'recycling' | 'redemption' | 'redeem_item'
  title: string
  message: string
  createdAt: string
  route: string
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('admin')
  const [adminId, setAdminId] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // Get admin session + load read IDs
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserEmail(session.user.email || '')
        setUserName(
          session.user.user_metadata?.full_name ||
          session.user.email?.split('@')[0] ||
          'Admin'
        )

        const { data: profile } = await supabase
          .from('users')
          .select('id, role')
          .eq('email', session.user.email)
          .single()

        if (profile) {
          setAdminId(profile.id)
          setUserRole(profile.role || 'admin')
          const stored = localStorage.getItem(`read_notifications_admin_${profile.id}`)
          if (stored) {
            try { setReadIds(JSON.parse(stored)) } catch {}
          }
        }
      }
    }
    getUser()
  }, [])

  // Fetch notifications once adminId is ready + refresh every 60s
  useEffect(() => {
    if (!adminId) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [adminId])

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
    if (!adminId) return
    setLoadingNotifications(true)

    try {
      const all: Notification[] = []
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Recent user recycling submissions
      const { data: records } = await supabase
        .from('recycling_records')
        .select('*')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5)

      records?.forEach((r) => {
        all.push({
          id: `recycling-${r.id}`,
          type: 'recycling',
          title: 'New Recycling Record',
          message: `${r.waste_type} — ${r.weight_kg}kg (${r.points_earned} pts)`,
          createdAt: r.created_at,
          route: '/admin/dashboard',
        })
      })

      // 2. Recent redemptions
      const { data: redemptions } = await supabase
        .from('redeem_history')
        .select('*')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5)

      redemptions?.forEach((r) => {
        all.push({
          id: `redemption-${r.id}`,
          type: 'redemption',
          title: 'Item Redeemed',
          message: `${r.item_name} — ${r.points_spent} pts`,
          createdAt: r.created_at,
          route: '/admin/redeem-items',
        })
      })

      // 3. Recently added redeem items
      const { data: items } = await supabase
        .from('redeem_items')
        .select('*')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: false })
        .limit(5)

      items?.forEach((item) => {
        all.push({
          id: `item-${item.id}`,
          type: 'redeem_item',
          title: 'New Redeemable Item Added',
          message: `${item.name} — ${item.points_required} pts`,
          createdAt: item.created_at,
          route: '/admin/redeem-items',
        })
      })

      all.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setNotifications(all)
    } catch (err) {
      console.error('Error fetching admin notifications:', err)
    } finally {
      setLoadingNotifications(false)
    }
  }

  const handleNotificationClick = (n: Notification) => {
    const updated = Array.from(new Set([...readIds, n.id]))
    setReadIds(updated)
    if (adminId) {
      localStorage.setItem(`read_notifications_admin_${adminId}`, JSON.stringify(updated))
    }
    setShowDropdown(false)
    router.push(n.route)
  }

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id)
    setReadIds(allIds)
    if (adminId) {
      localStorage.setItem(`read_notifications_admin_${adminId}`, JSON.stringify(allIds))
    }
  }

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'recycling':
        return <CheckCircle style={{ width: '16px', height: '16px' }} />
      case 'redemption':
        return <Gift style={{ width: '16px', height: '16px' }} />
      case 'redeem_item':
        return <Users style={{ width: '16px', height: '16px' }} />
      default:
        return <Bell style={{ width: '16px', height: '16px' }} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'recycling':
        return '#72BF78'
      case 'redemption':
        return '#FCCD2A'
      case 'redeem_item':
        return '#3b82f6'
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
    await supabase.auth.signOut()
    router.push('/')
  }

  const getPageTitle = () => {
    if (pathname.includes('/admin/dashboard')) return 'Admin Dashboard'
    if (pathname.includes('/admin/reports')) return 'Admin Reports'
    if (pathname.includes('/admin/settings')) return 'Admin Settings'
    if (pathname.includes('/admin/redeem-items')) return 'Redeem Items'
    return 'Admin Dashboard'
  }

  const getPageSubtitle = () => {
    if (pathname.includes('/admin/dashboard')) return 'EcoWaste Management System'
    if (pathname.includes('/admin/reports')) return 'View and export user records'
    if (pathname.includes('/admin/settings')) return 'System configuration and preferences'
    if (pathname.includes('/admin/redeem-items')) return 'Manage items available for point redemption'
    return 'EcoWaste Management System'
  }

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-content">
            <div className="admin-header-left">
              {/* Logo with white frame */}
              <div
                className="admin-logo"
                style={{
                  background: '#ffffff',
                  padding: '2px',
                  border: '1px solid rgba(255,255,255,0.4)'
                }}
              >
                <img
                  src="/banicain.png"
                  alt="Barangay Banicain Logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    display: 'block'
                  }}
                />
              </div>
              <div>
                <h1 className="admin-title">{getPageTitle()}</h1>
                <p className="admin-subtitle">{getPageSubtitle()}</p>
              </div>
            </div>
            <div className="admin-header-right">
              <div className="admin-date">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* ===== NOTIFICATION BELL ===== */}
              <div
                ref={dropdownRef}
                style={{
                  position: 'relative',
                  zIndex: 9999,
                  pointerEvents: 'auto'
                }}
              >
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
                  <Bell
                    style={{
                      width: '18px',
                      height: '18px',
                      pointerEvents: 'none',
                      color: '#ffffff'
                    }}
                  />
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
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                          Notifications
                        </span>
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
                          style={{
                            fontSize: '11px',
                            color: '#72BF78',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '380px' }}>
                      {loadingNotifications && notifications.length === 0 ? (
                        <div
                          style={{
                            padding: '24px',
                            textAlign: 'center',
                            color: '#6b7280',
                            fontSize: '13px'
                          }}
                        >
                          Loading notifications...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                          <Bell
                            style={{
                              width: '40px',
                              height: '40px',
                              margin: '0 auto 8px',
                              color: '#d1d5db',
                              display: 'block'
                            }}
                          />
                          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                            No notifications yet
                          </p>
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
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = '#f3f4f6')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = isRead
                                  ? '#ffffff'
                                  : '#f0fdf4')
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
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      gap: '8px'
                                    }}
                                  >
                                    <p
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                        margin: 0
                                      }}
                                    >
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
                                  <p
                                    style={{
                                      fontSize: '10px',
                                      color: '#9ca3af',
                                      margin: '4px 0 0'
                                    }}
                                  >
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
              {/* ===== END NOTIFICATION BELL ===== */}

              {/* ===== ADMIN ACCOUNT MENU ===== */}
              <div
                ref={accountRef}
                style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto' }}
              >
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
                    {/* Admin info header */}
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

                    {/* Role badge */}
                    <div
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#dcfce7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#3b8f40',
                          flexShrink: 0
                        }}
                      >
                        <Shield style={{ width: '16px', height: '16px' }} />
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: '10px',
                            color: '#6b7280',
                            margin: 0,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                        >
                          Role
                        </p>
                        <p
                          style={{
                            fontSize: '14px',
                            color: '#1a1a1a',
                            margin: '2px 0 0',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        >
                          {userRole}
                        </p>
                      </div>
                    </div>

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
              {/* ===== END ADMIN ACCOUNT MENU ===== */}
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}