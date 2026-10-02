'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Wallet, 
  Award, 
  Clock, 
  ArrowUpRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Gift,
  History,
  Sparkles,
  X,
  Package,
  Coffee,
  ShoppingBag,
  Zap,
  Heart,
  Star,
  Trash2,
  Receipt,
  MapPin,
  Calendar,
  Printer,
  AlertTriangle,
  PartyPopper,
  ThumbsUp
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function UserWallet() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState({
    points: 0,
    recycled: 0,
    fullName: 'User',
    email: '',
    userId: ''
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notification, setNotification] = useState({
    message: '',
    itemName: '',
    points: 0
  })
  const [redeemItems, setRedeemItems] = useState<any[]>([])
  const [redeemHistory, setRedeemHistory] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Fetch wallet data
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setLoading(false)
          return
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()

        if (userProfile) {
          setUserData({
            points: userProfile.total_points || 0,
            recycled: userProfile.total_recycled_kg || 0,
            fullName: userProfile.full_name || session.user.user_metadata?.full_name || 'User',
            email: session.user.email || '',
            userId: userProfile.id
          })
        }

        const { data: records } = await supabase
          .from('recycling_records')
          .select('*')
          .eq('user_id', userProfile?.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (records) {
          setTransactions(records)
        }

        // Fetch redeem items (only those with quantity > 0)
        const { data: items } = await supabase
          .from('redeem_items')
          .select('*')
          .eq('is_active', true)
          .order('points_required', { ascending: true })

        if (items) {
          setRedeemItems(items)
        }

        // Fetch redeem history
        const { data: history } = await supabase
          .from('redeem_history')
          .select('*')
          .eq('user_id', userProfile?.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (history) {
          setRedeemHistory(history)
        }

      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchWalletData()
  }, [])

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showNotification])

  const getPointsLevel = (points: number) => {
    if (points >= 1000) return { label: 'Gold', color: 'text-yellow-500', bg: 'bg-yellow-100', icon: '👑' }
    if (points >= 500) return { label: 'Silver', color: 'text-gray-400', bg: 'bg-gray-100', icon: '🥈' }
    return { label: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-100', icon: '🥉' }
  }

  const level = getPointsLevel(userData.points)

  const getItemIcon = (name: string) => {
    const icons: { [key: string]: any } = {
      'Coffee': Coffee,
      'Shopping Bag': ShoppingBag,
      'Gift Card': Gift,
      'Package': Package,
      'Zap': Zap,
      'Heart': Heart,
      'Star': Star,
      'Trash': Trash2,
      'Plant': Heart,
      'Reusable Bottle': Package,
      'T-Shirt': Star,
      'Canned Food': Package,
      'miniral water': Package,
      'rice': Package
    }
    return icons[name] || Package
  }

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return { label: 'Out of Stock', className: 'out-of-stock', icon: X }
    } else if (quantity <= 10) {
      return { label: 'Running Out', className: 'running-out', icon: AlertTriangle }
    } else {
      return { label: 'In Stock', className: 'in-stock', icon: CheckCircle }
    }
  }

  // Show confirmation popup with stock check
  const showConfirmation = (item: any) => {
    // Check if item is in stock
    if (item.quantity <= 0) {
      alert('This item is currently out of stock. Please check back later.')
      return
    }
    setSelectedItem(item)
    setShowConfirmModal(true)
  }

  const handleConfirmRedeem = async () => {
    if (!selectedItem) return

    // Double-check stock before redeeming
    if (selectedItem.quantity <= 0) {
      alert('This item is out of stock and cannot be redeemed.')
      setShowConfirmModal(false)
      setSelectedItem(null)
      return
    }

    setShowConfirmModal(false)
    setRedeemLoading(true)

    try {
      // Check if user has enough points
      if (userData.points < selectedItem.points_required) {
        alert(`You need ${selectedItem.points_required} points to redeem this item. You currently have ${userData.points} points.`)
        setRedeemLoading(false)
        setSelectedItem(null)
        return
      }

      // Update user points
      const newPoints = userData.points - selectedItem.points_required
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ total_points: newPoints })
        .eq('id', userData.userId)

      if (updateError) throw updateError

      // Deduct quantity from redeem_items
      const newQuantity = selectedItem.quantity - 1
      
      const { error: quantityError } = await supabase
        .from('redeem_items')
        .update({ quantity: newQuantity })
        .eq('id', selectedItem.id)

      if (quantityError) throw quantityError

      // Add to redeem history (quantity removed — column doesn't exist in schema)
      const { data: historyData, error: historyError } = await supabase
        .from('redeem_history')
        .insert({
          user_id: userData.userId,
          item_id: selectedItem.id,
          item_name: selectedItem.name,
          points_spent: selectedItem.points_required,
          status: 'Completed'
        })
        .select()

      if (historyError) throw historyError

      // Update local state
      setUserData(prev => ({ ...prev, points: newPoints }))
      
      // Refresh redeem history
      const { data: history } = await supabase
        .from('redeem_history')
        .select('*')
        .eq('user_id', userData.userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (history) {
        setRedeemHistory(history)
      }

      // Refresh available items
      const { data: items } = await supabase
        .from('redeem_items')
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true })

      if (items) {
        setRedeemItems(items)
      }

      // Set receipt data
      const receiptId = historyData?.[0]?.id
      setReceiptData({
        id: receiptId,
        itemName: selectedItem.name,
        pointsSpent: selectedItem.points_required,
        date: new Date().toLocaleString(),
        userName: userData.fullName,
        userEmail: userData.email,
        remainingPoints: newPoints
      })

      // Show receipt popup
      setShowReceiptModal(true)
      setShowRedeemModal(false)
      setSelectedItem(null)

    } catch (error: any) {
      alert('Error redeeming item: ' + error.message)
    } finally {
      setRedeemLoading(false)
    }
  }

  const handleCancelRedeem = () => {
    setShowConfirmModal(false)
    setSelectedItem(null)
  }

  const closeReceipt = () => {
    setShowReceiptModal(false)
    if (receiptData) {
      setNotification({
        message: `Thank you for redeeming your points! You can claim the ${receiptData.itemName} at the barangay hall to claim it.`,
        itemName: receiptData.itemName,
        points: receiptData.pointsSpent
      })
      setShowNotification(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-container">
      {/* Notification Toast */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999999,
          backgroundColor: '#f0fdf4',
          borderLeft: '4px solid #22c55e',
          borderRadius: '12px',
          padding: '16px 20px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.5s ease-out',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#166534' }}>Redeem Successful!</p>
            <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            style={{ flexShrink: 0, padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Confirmation Popup Modal */}
      {showConfirmModal && selectedItem && (
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
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'scaleIn 0.3s ease-out',
              textAlign: 'center'
            }}
          >
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: '#fef3c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 12px'
            }}>
              <Gift className="w-8 h-8 text-yellow-500" />
            </div>
            
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
              Confirm Redemption
            </h3>
            
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Redeem <strong style={{ color: '#1a1a1a' }}>{selectedItem.name}</strong> for
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#d97706', marginBottom: '16px' }}>
              {selectedItem.points_required} points
            </p>
            
            {selectedItem.quantity <= 10 && selectedItem.quantity > 0 && (
              <p style={{ fontSize: '12px', color: '#d97706', marginBottom: '12px' }}>
                ⚠️ Only {selectedItem.quantity} left in stock!
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCancelRedeem}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRedeem}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
              >
                Confirm Redeem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Popup Modal (replaces Receipt Modal) */}
      {showReceiptModal && receiptData && (
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
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '40px 32px',
              maxWidth: '420px',
              width: '100%',
              margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'scaleIn 0.3s ease-out',
              textAlign: 'center'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)'
            }}>
              <PartyPopper style={{ width: '44px', height: '44px', color: '#22c55e' }} />
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
              Thank You!
            </h3>

            <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '8px' }}>
              Thank you for receiving the item you redeemed!
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Enjoy your <strong style={{ color: '#16a34a' }}>{receiptData.itemName}</strong>!
            </p>

            <button
              onClick={closeReceipt}
              style={{
                padding: '10px 32px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#15803d'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#16a34a'
              }}
            >
              <ThumbsUp size={18} />
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Wallet Header */}
      <div className="wallet-header">
        <div className="wallet-header-content">
          <div className="wallet-header-top">
            <div className="wallet-header-icon">
              <Wallet />
            </div>
            <div className="wallet-header-info">
              <h2>Eco-Wallet</h2>
              <div className="name">{userData.fullName}</div>
              <div className="email">{userData.email}</div>
            </div>
          </div>
          
          <div className="wallet-balance-row">
            <div className="wallet-balance-left">
              <div className="label">Available Balance</div>
              <div className="amount">
                {userData.points.toLocaleString()}
                <span className="unit">pts</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${level.bg} ${level.color}`}>
                  {level.icon} {level.label} Member
                </span>
              </div>
            </div>
            <div className="wallet-balance-right">
              <div className="label">Recycled Total</div>
              <div className="amount">{userData.recycled.toFixed(1)} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="wallet-actions">
        <button 
          className="wallet-btn wallet-btn-redeem"
          onClick={() => setShowRedeemModal(true)}
        >
          <Gift className="btn-icon" />
          <span className="btn-text">Redeem Points</span>
          <Sparkles className="btn-extra" />
        </button>
        <button 
          className="wallet-btn wallet-btn-history"
          onClick={() => setShowHistoryModal(true)}
        >
          <History className="btn-icon" />
          <span className="btn-text">View History</span>
          <ArrowUpRight className="btn-extra" />
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="wallet-transactions">
        <div className="wallet-transactions-header">
          <div className="wallet-transactions-title">
            <Clock className="w-5 h-5 text-[#1b5e20]" />
            Recent Transactions
          </div>
          <span className="wallet-transactions-badge">{transactions.length} entries</span>
        </div>
        
        {transactions.length > 0 ? (
          <div>
            {transactions.map((tx, index) => (
              <div key={index} className="wallet-transaction-item">
                <div className="wallet-transaction-left">
                  <div className="wallet-transaction-icon">
                    <CheckCircle />
                  </div>
                  <div className="wallet-transaction-details">
                    <div className="title">
                      Recycled {tx.weight_kg}kg {tx.waste_type}
                    </div>
                    <div className="date">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
                <div className="wallet-transaction-points">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{tx.points_earned} pts
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="wallet-empty">
            <div className="wallet-empty-icon">
              <AlertCircle />
            </div>
            <div className="wallet-empty-title">No transactions yet</div>
            <div className="wallet-empty-sub">Start recycling to earn points!</div>
          </div>
        )}
      </div>

      {/* Points Tips */}
      {userData.points > 0 && (
        <div className="wallet-tip">
          <div className="wallet-tip-content">
            <div className="wallet-tip-icon">
              <Award />
            </div>
            <div>
              <div className="wallet-tip-title">Keep Going!</div>
              <div className="wallet-tip-text">
                You've earned <strong>{userData.points} points</strong> from recycling <strong>{userData.recycled.toFixed(1)}kg</strong> of waste.
                {userData.points >= 1000 ? ' You\'re a Gold member!' : 
                 userData.points >= 500 ? ' You\'re a Silver member!' : 
                 ' Keep recycling to reach the next level!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== REDEEM MODAL ===== */}
      {showRedeemModal && (
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
              padding: '32px',
              maxWidth: '560px',
              width: '100%',
              margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'scaleIn 0.3s ease-out',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Fixed Header */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gift className="w-6 h-6 text-yellow-500" />
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>Redeem Points</h3>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>({userData.points} pts available)</span>
              </div>
              <button
                onClick={() => setShowRedeemModal(false)}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Scrollable Items */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {redeemItems.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {redeemItems.map((item) => {
                    const Icon = getItemIcon(item.name)
                    const canAfford = userData.points >= item.points_required
                    const isInStock = item.quantity > 0
                    const isLowStock = item.quantity > 0 && item.quantity <= 10
                    
                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          border: `2px solid ${isInStock && canAfford ? '#86efac' : '#e5e7eb'}`,
                          transition: 'all 0.2s ease',
                          opacity: isInStock && canAfford ? 1 : 0.6,
                          cursor: isInStock && canAfford ? 'pointer' : 'not-allowed',
                          backgroundColor: isInStock && canAfford ? '#f0fdf4' : '#ffffff',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (isInStock && canAfford) {
                            e.currentTarget.style.borderColor = '#22c55e'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(34,197,94,0.15)'
                            e.currentTarget.style.transform = 'scale(1.02)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isInStock && canAfford ? '#86efac' : '#e5e7eb'
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                        onClick={() => isInStock && canAfford && showConfirmation(item)}
                      >
                        {/* Out of Stock Overlay */}
                        {!isInStock && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            zIndex: 10,
                            pointerEvents: 'none'
                          }}>
                            Out of Stock
                          </div>
                        )}
                        
                        {/* Low stock badge */}
                        {isLowStock && (
                          <div style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: '10px',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            border: '1px solid #fcd34d',
                            zIndex: 5
                          }}>
                            <AlertTriangle style={{ width: '10px', height: '10px', display: 'inline', marginRight: '4px' }} />
                            Running Out
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isInStock && canAfford ? '#dcfce7' : '#f3f4f6',
                            marginBottom: '8px'
                          }}>
                            <Icon className={`w-6 h-6 ${isInStock && canAfford ? 'text-green-600' : 'text-gray-400'}`} />
                          </div>
                          <h4 style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '14px' }}>{item.name}</h4>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{item.description || 'Redeemable item'}</p>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#d97706', marginTop: '8px' }}>{item.points_required} pts</p>
                          {canAfford && isInStock ? (
                            <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '500', marginTop: '4px' }}>✅ Available</span>
                          ) : !isInStock ? (
                            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '500', marginTop: '4px' }}>❌ Out of Stock</span>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '500', marginTop: '4px' }}>Need {item.points_required - userData.points} more pts</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Gift className="w-8 h-8 text-gray-400" />
                  </div>
                  <p style={{ color: '#6b7280' }}>No redeemable items available</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Check back later for new items</p>
                </div>
              )}

              {redeemLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                  <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                  <span style={{ marginLeft: '8px', color: '#6b7280' }}>Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== HISTORY MODAL ===== */}
      {showHistoryModal && (
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
              padding: '32px',
              maxWidth: '560px',
              width: '100%',
              margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              animation: 'scaleIn 0.3s ease-out',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History className="w-6 h-6 text-blue-500" />
                <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a' }}>Redeem History</h3>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>({redeemHistory.length} records)</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {redeemHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {redeemHistory.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #f3f4f6',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Gift className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p style={{ fontWeight: '500', color: '#1a1a1a' }}>{item.item_name}</p>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(item.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>-{item.points_spent} pts</p>
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '500' }}>✅ Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: '64px', height: '64px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <p style={{ color: '#6b7280' }}>No redeem history yet</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Start redeeming your points for rewards!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}