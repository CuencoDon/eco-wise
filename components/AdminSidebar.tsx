'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Gift,
  Recycle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Robust mobile detection — matchMedia + user agent + resize + orientation
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')

    const update = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const uaMobile = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|webOS/i.test(userAgent)
      const smallScreen = mq.matches
      const mobile = uaMobile || smallScreen
      setIsMobile(mobile)
      if (mobile) {
        setIsCollapsed(false)
        setIsMobileOpen(false)
      }
    }

    update()

    if (mq.addEventListener) {
      mq.addEventListener('change', update)
    } else {
      mq.addListener(update)
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)

    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', update)
      } else {
        mq.removeListener(update)
      }
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
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

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return pathname === '/admin/dashboard'
    }
    if (path === '/admin/reports') {
      return pathname === '/admin/reports' || pathname?.startsWith('/admin/reports/')
    }
    if (path === '/admin/settings') {
      return pathname === '/admin/settings' || pathname?.startsWith('/admin/settings/')
    }
    if (path === '/admin/redeem-items') {
      return pathname === '/admin/redeem-items' || pathname?.startsWith('/admin/redeem-items/')
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
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/redeem-items', icon: Gift, label: 'Redeem Items' },
    { path: '/admin/reports', icon: FileText, label: 'Reports' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
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
              Admin Panel
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

            {/* App description */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '12px',
                border: '1px solid rgba(160, 214, 131, 0.5)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
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
                  About EcoWaste
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: 1.5,
                  color: '#3b8f40',
                  margin: 0
                }}
              >
                A barangay waste management system for Barangay Banicain that
                helps residents recycle, earn points, and redeem rewards — while
                giving admins tools to track collections, manage items, and
                generate reports.
              </p>
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
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div
        className="sidebar-brand"
        style={{
          minHeight: '67px',
          paddingLeft: '16px'
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
              Admin Panel
            </div>
          )}
        </div>
        <button onClick={toggleSidebar} className="sidebar-toggle">
          {isCollapsed ? <Menu /> : <X />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`sidebar-nav-link ${active ? 'active' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon />
              <span>{item.label}</span>
              {!isCollapsed && active && (
                <ChevronRight className="chevron" />
              )}
            </Link>
          )
        })}

        {/* App description */}
        {!isCollapsed && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '1px solid rgba(160, 214, 131, 0.5)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
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
                About EcoWaste
              </span>
            </div>
            <p
              style={{
                fontSize: '12px',
                lineHeight: 1.5,
                color: '#3b8f40',
                margin: 0
              }}
            >
              A barangay waste management system for Barangay Banicain that
              helps residents recycle, earn points, and redeem rewards — while
              giving admins tools to track collections, manage items, and
              generate reports.
            </p>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="sidebar-logout">
        <button onClick={handleLogout} className="sidebar-logout-btn">
          <LogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}