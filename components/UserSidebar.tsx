'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  Wallet, 
  LogOut,
  Menu,
  X,
  Award,
  TrendingUp,
  ChevronRight,
  User,
  Mail,
  Gift,
  Recycle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function UserSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')
  const [userPoints, setUserPoints] = useState(0)
  const [userRecycled, setUserRecycled] = useState(0)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(false)
        setIsMobileOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-close mobile drawer on route change
  useEffect(() => {
    if (isMobile) setIsMobileOpen(false)
  }, [pathname, isMobile])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobile, isMobileOpen])

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserEmail(session.user.email || '')
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User')
        
        const { data: userData, error } = await supabase
          .from('users')
          .select('total_points, total_recycled_kg')
          .eq('email', session.user.email)
          .single()
        
        if (error) {
          console.error('Error fetching user data:', error)
        }
        
        if (userData) {
          setUserPoints(userData.total_points || 0)
          setUserRecycled(userData.total_recycled_kg || 0)
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchUserData()
  }, [])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email || '')
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User')
        fetchUserData()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isActive = (path: string) => {
    if (path === '/user/dashboard') {
      return pathname === '/user/dashboard'
    }
    if (path === '/user/schedule') {
      return pathname === '/user/schedule' || pathname?.startsWith('/user/schedule/')
    }
    if (path === '/user/wallet') {
      return pathname === '/user/wallet' || pathname?.startsWith('/user/wallet/')
    }
    if (path === '/user/redeem-items') {
      return pathname === '/user/redeem-items' || pathname?.startsWith('/user/redeem-items/')
    }
    return pathname === path
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  const menuItems = [
    { path: '/user/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/user/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/user/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/user/redeem-items', icon: Gift, label: 'Redeem Items' },
  ]

  // ---- MOBILE RENDERING ----
  if (isMobile) {
    return (
      <>
        {/* Floating hamburger button (mobile only) */}
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
          style={{
            position: 'fixed',
            top: '14px',
            left: '14px',
            zIndex: 100000,
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid #e0efe4',
            boxShadow: '0 4px 12px rgba(107, 157, 128, 0.15)',
            display: isMobileOpen ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#6b9d80'
          }}
        >
          <Menu style={{ width: '22px', height: '22px' }} />
        </button>

        {/* Backdrop */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(45, 58, 50, 0.45)',
              backdropFilter: 'blur(2px)',
              zIndex: 100001
            }}
          />
        )}

        {/* Drawer */}
        <aside
          className="sidebar"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100vh',
            width: '260px',
            maxWidth: '85vw',
            backgroundColor: '#ffffff',
            boxShadow: '4px 0 24px rgba(107, 157, 128, 0.20)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 100002,
            transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Brand */}
          <div
            className="sidebar-brand"
            style={{
              minHeight: '60px',
              padding: '0 16px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div
              className="sidebar-brand-label"
              style={{ fontSize: '18px', fontWeight: 600 }}
            >
              Resident
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close menu"
              className="sidebar-toggle"
              style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Navigation */}
          <nav
            className="sidebar-nav"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px'
            }}
          >
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`sidebar-nav-link ${active ? 'active' : ''}`}
                  onClick={() => setIsMobileOpen(false)}
                  style={{
                    flexShrink: 0,
                    minHeight: '46px',
                    padding: '10px 12px'
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px' }} />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="chevron" />}
                </Link>
              )
            })}

            {/* Quick Stats */}
            <div className="sidebar-quick-stats" style={{ flexShrink: 0, marginTop: '16px' }}>
              <div className="sidebar-quick-stats-label">Your Stats</div>
              <div className="sidebar-quick-stat">
                <Award />
                <span>{userPoints.toLocaleString()} Points</span>
              </div>
              <div className="sidebar-quick-stat">
                <TrendingUp />
                <span>{userRecycled.toFixed(1)} kg Recycled</span>
              </div>
              <div className="sidebar-quick-stat">
                <User />
                <span>Active Member</span>
              </div>
            </div>

            {/* How It Works card */}
            <div
              style={{
                marginTop: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
                border: '1px solid rgba(160, 214, 131, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 14px 6px 14px'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: '#72BF78',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}
                >
                  <Recycle style={{ width: '16px', height: '16px' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a9e6d' }}>
                  How It Works
                </span>
              </div>
              <div style={{ padding: '0 14px 14px 14px' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#3b8f40', margin: 0 }}>
                  Recycle paper, plastic, or metal — scan or upload a photo of your
                  waste with a weight scale, and earn points based on the weight
                  you submit. Use your points to redeem rewards from the barangay!
                </p>
                <ul
                  style={{
                    margin: '10px 0 0 0',
                    padding: '0 0 0 16px',
                    fontSize: '11px',
                    lineHeight: 1.7,
                    color: '#3b8f40'
                  }}
                >
                  <li><strong>Dashboard</strong> — track your recycling progress</li>
                  <li><strong>Schedule</strong> — see collection days per zone</li>
                  <li><strong>Wallet</strong> — view your points and history</li>
                  <li><strong>Redeem</strong> — claim rewards with your points</li>
                </ul>
              </div>
            </div>
          </nav>

          {/* Logout */}
          <div className="sidebar-logout" style={{ flexShrink: 0, padding: '12px 16px' }}>
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              style={{ minHeight: '46px' }}
            >
              <LogOut style={{ width: '20px', height: '20px' }} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </>
    )
  }

  // ---- DESKTOP RENDERING ----
  return (
    <aside
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Brand — height locked to match page header */}
      <div
        className="sidebar-brand"
        style={{
          minHeight: '67px',
          paddingLeft: '16px',
          flexShrink: 0
        }}
      >
        <div className="sidebar-brand-content">
          {!isCollapsed && (
            <div
              className="sidebar-brand-label"
              style={{
                fontSize: '18px',
                fontWeight: 600
              }}
            >
              Resident
            </div>
          )}
        </div>
        <button onClick={toggleSidebar} className="sidebar-toggle">
          {isCollapsed ? <Menu /> : <X />}
        </button>
      </div>

      {/* Navigation — fixed, does not scroll */}
      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`sidebar-nav-link ${active ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
              style={{ flexShrink: 0 }}
            >
              <Icon />
              <span>{item.label}</span>
              {!isCollapsed && active && (
                <ChevronRight className="chevron" />
              )}
            </Link>
          )
        })}

        {/* Quick Stats — fixed */}
        {!isCollapsed && (
          <div className="sidebar-quick-stats" style={{ flexShrink: 0 }}>
            <div className="sidebar-quick-stats-label">Your Stats</div>
            <div className="sidebar-quick-stat">
              <Award />
              <span>{userPoints.toLocaleString()} Points</span>
            </div>
            <div className="sidebar-quick-stat">
              <TrendingUp />
              <span>{userRecycled.toFixed(1)} kg Recycled</span>
            </div>
            <div className="sidebar-quick-stat">
              <User />
              <span>Active Member</span>
            </div>
          </div>
        )}

        {/* How It Works card — ONLY this section scrolls */}
        {!isCollapsed && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: '20px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '1px solid rgba(160, 214, 131, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Card header — stays fixed at top of the card */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 16px 8px 16px'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#72BF78',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}
              >
                <Recycle style={{ width: '16px', height: '16px' }} />
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1a9e6d'
                }}
              >
                How It Works
              </span>
            </div>

            {/* Card body — scrolls when content overflows */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '0 16px 16px 16px'
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#3b8f40',
                  margin: 0
                }}
              >
                Recycle paper, plastic, or metal — scan or upload a photo of your
                waste with a weight scale, and earn points based on the weight
                you submit. Use your points to redeem rewards from the barangay!
              </p>
              <ul
                style={{
                  margin: '10px 0 0 0',
                  padding: '0 0 0 16px',
                  fontSize: '11px',
                  lineHeight: 1.7,
                  color: '#3b8f40'
                }}
              >
                <li><strong>Dashboard</strong> — track your recycling progress</li>
                <li><strong>Schedule</strong> — see collection days per zone</li>
                <li><strong>Wallet</strong> — view your points and history</li>
                <li><strong>Redeem</strong> — claim rewards with your points</li>
              </ul>
            </div>
          </div>
        )}
      </nav>

      {/* Logout — fixed at bottom */}
      <div className="sidebar-logout" style={{ flexShrink: 0 }}>
        <button onClick={handleLogout} className="sidebar-logout-btn">
          <LogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}