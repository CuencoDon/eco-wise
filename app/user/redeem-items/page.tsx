'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Gift, 
  Award, 
  Calendar, 
  Loader2,
  Package,
  Coffee,
  ShoppingBag,
  Star,
  Heart,
  ChevronRight,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function RedeemItemsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redeemHistory, setRedeemHistory] = useState<any[]>([])
  const [userPoints, setUserPoints] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!session) {
          router.push('/')
          return
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, total_points')
          .eq('email', session.user.email)
          .single()

        if (profileError) throw profileError

        if (userProfile) {
          setUserPoints(userProfile.total_points || 0)

          const { data: history, error: historyError } = await supabase
            .from('redeem_history')
            .select('*')
            .eq('user_id', userProfile.id)
            .order('created_at', { ascending: false })

          if (historyError) {
            console.warn('History warning:', historyError)
          } else if (history) {
            setRedeemHistory(history)
          }
        }

      } catch (err: any) {
        console.error('Redeem items fetch error:', err)
        setError(err.message || 'Failed to load redeem items')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const getItemIcon = (name: string) => {
    const icons: { [key: string]: any } = {
      'Coffee': Coffee,
      'Shopping Bag': ShoppingBag,
      'Gift Card': Gift,
      'Package': Package,
      'Star': Star,
      'Heart': Heart
    }
    return icons[name] || Gift
  }

  const getStatusDisplay = (status: string) => {
    if (status === 'Received') {
      return { label: 'Received', className: 'received', icon: CheckCircle }
    }
    if (status === 'Completed') {
      return { label: 'Ready for Pickup', className: 'ready', icon: Clock }
    }
    return { label: 'Ready for Pickup', className: 'ready', icon: Clock }
  }

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A'
    try {
      const d = new Date(dateValue)
      if (isNaN(d.getTime())) return 'N/A'
      return d.toLocaleDateString()
    } catch {
      return 'N/A'
    }
  }

  // Count items that are ready to claim (not yet Received)
  const readyToClaimCount = redeemHistory.filter(
    (item) => item.status !== 'Received'
  ).length

  // Loading State
  if (loading) {
    return (
      <div className="redeem-loading-container">
        <div className="redeem-loading-content">
          <Loader2 className="redeem-loading-spinner" />
          <p>Loading redeem items...</p>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="redeem-loading-container">
        <div className="redeem-loading-content">
          <XCircle className="redeem-loading-spinner" style={{ color: '#dc2626' }} />
          <p style={{ color: '#dc2626' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="redeem-empty-btn"
            style={{ marginTop: '16px' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="redeem-container"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '16px 20px'
      }}
    >
      <div
        className="redeem-wrapper"
        style={{
          maxWidth: '72rem',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: 1,
          minHeight: 0
        }}
      >
        {/* Header — centered icon + title, badge on the right */}
        <div
          className="redeem-header-card"
          style={{
            position: 'relative',
            padding: '24px 24px',
            background: 'linear-gradient(135deg, #B6FFA1, #A0D683)',
            border: '1px solid #72BF78',
            boxShadow: '0 2px 8px rgba(114, 191, 120, 0.2)',
            flexShrink: 0
          }}
        >
          {/* Centered content block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#ffffff',
                borderRadius: '14px',
                color: '#3b8f40',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <Gift size={26} />
            </div>
            <div
              className="redeem-header-title"
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1a1a1a',
                margin: 0
              }}
            >
              My Redeemed Items
            </div>
            <div
              className="redeem-header-subtitle"
              style={{
                fontSize: '13px',
                color: '#3b8f40',
                margin: 0
              }}
            >
              {userPoints} points available • {redeemHistory.length} items redeemed
            </div>
          </div>

          {/* Badge — absolutely positioned on the right */}
          <span
            className="redeem-header-badge"
            style={{
              position: 'absolute',
              top: '50%',
              right: '24px',
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              background: '#ffffff',
              color: '#3b8f40',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            {redeemHistory.length} redeemed
          </span>
        </div>

        {/* Ready-to-Claim / All-claimed message (stays at top, above card) */}
        {readyToClaimCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '10px',
              color: '#1d4ed8',
              fontSize: '14px',
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            <Clock size={18} style={{ flexShrink: 0 }} />
            <span>
              You have{' '}
              <strong>
                {readyToClaimCount}{' '}
                {readyToClaimCount === 1 ? 'item' : 'items'}
              </strong>{' '}
              ready to claim at the barangay hall.
            </span>
          </div>
        )}

        {readyToClaimCount === 0 && redeemHistory.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '10px',
              color: '#166534',
              fontSize: '14px',
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>All your redeemed items have been claimed. Nice!</span>
          </div>
        )}

        {/* Redeem History — SINGLE CARD with internal scroll */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e0efe4',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Card header — fixed at top */}
          <div
            style={{
              flexShrink: 0,
              padding: '16px 20px',
              borderBottom: '1px solid #f0f3f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f5f9f6'
            }}
          >
            <h3
              className="redeem-history-title"
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#2d3a32',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Gift size={18} style={{ color: '#8fbfa0' }} />
              Redeem History
            </h3>
            <span
              style={{
                fontSize: '12px',
                color: '#8aa997',
                fontWeight: 500
              }}
            >
              {redeemHistory.length} {redeemHistory.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Card body — scrollable */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 20px',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {redeemHistory.length > 0 ? (
              <div className="redeem-grid">
                {redeemHistory.map((item) => {
                  const Icon = getItemIcon(item.item_name)
                  const statusInfo = getStatusDisplay(item.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <div
                      key={item.id}
                      className="redeem-item-card history"
                      onClick={() => router.push(`/user/redeem-items/${item.id}`)}
                      style={{
                        background: 'linear-gradient(135deg, #fef9c3, #fde68a)',
                        border: '1px solid #fcd34d',
                        boxShadow: '0 2px 8px rgba(252, 211, 77, 0.25)'
                      }}
                    >
                      <div className="redeem-item-left">
                        <div
                          className="redeem-item-icon"
                          style={{
                            background: '#fef3c7',
                            color: '#b45309'
                          }}
                        >
                          <Icon />
                        </div>
                        <div className="redeem-item-info">
                          <div className="name">{item.item_name || 'Unknown Item'}</div>
                          <div className="details">
                            <span>
                              <Award />
                              {item.points_spent || 0} pts
                            </span>
                            <span>
                              <Calendar />
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="redeem-item-right">
                        <span className={`redeem-item-status ${statusInfo.className}`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                        <ChevronRight className="redeem-item-arrow" size={16} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="redeem-empty" style={{ boxShadow: 'none', border: 'none' }}>
                <div className="redeem-empty-icon">
                  <Gift />
                </div>
                <div className="redeem-empty-title">No redeemed items yet</div>
                <div className="redeem-empty-sub">
                  Start redeeming your points for rewards!
                </div>
                <button
                  onClick={() => router.push('/user/wallet')}
                  className="redeem-empty-btn"
                >
                  Go to Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}