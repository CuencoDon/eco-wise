'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  Receipt, 
  MapPin, 
  Calendar, 
  Clock, 
  Award, 
  Gift, 
  ArrowLeft, 
  Download, 
  CheckCircle,
  ShoppingBag,
  Package,
  Coffee,
  Star,
  Heart,
  Loader2,
  CircleCheckBig,
  PartyPopper,
  ThumbsUp,
  Gift as GiftIcon,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface RedeemData {
  id: string
  itemName: string
  pointsSpent: number
  date: string
  status: string
  userName: string
  userEmail: string
  remainingPoints: number
  itemId?: string
  quantity?: number
}

export default function RedeemItemsDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [redeemData, setRedeemData] = useState<RedeemData | null>(null)
  const [showThankYouPopup, setShowThankYouPopup] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchRedeemData = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!session) {
          router.push('/')
          return
        }

        const redeemId = params?.id as string
        if (!redeemId) {
          setError('Invalid redeem ID')
          return
        }

        const { data: historyData, error: historyError } = await supabase
          .from('redeem_history')
          .select('*')
          .eq('id', redeemId)
          .single()

        if (historyError || !historyData) {
          setError('Redeem item not found')
          return
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()

        if (profileError) {
          console.warn('Profile warning:', profileError)
        }

        const rawStatus = historyData.status || 'Completed'
        const normalizedStatus = rawStatus === 'Completed' ? 'Ready for Pickup' : rawStatus

        setRedeemData({
          id: historyData.id,
          itemName: historyData.item_name || 'Unknown Item',
          pointsSpent: historyData.points_spent || 0,
          date: historyData.created_at
            ? new Date(historyData.created_at).toLocaleString()
            : 'N/A',
          status: normalizedStatus,
          userName: userProfile?.full_name || 'User',
          userEmail: userProfile?.email || session.user.email || '',
          remainingPoints: (userProfile?.total_points || 0),
          itemId: historyData.item_id,
          quantity: historyData.quantity || 1
        })

      } catch (err: any) {
        console.error('Redeem detail fetch error:', err)
        setError(err.message || 'Failed to load redeem details')
      } finally {
        setLoading(false)
      }
    }

    fetchRedeemData()
  }, [params?.id, router])

  const handleReceive = async () => {
    if (!redeemData) return
    setUpdating(true)

    try {
      const { error } = await supabase
        .from('redeem_history')
        .update({ status: 'Received' })
        .eq('id', redeemData.id)

      if (error) throw error

      setRedeemData((prev) => {
        if (!prev) return null
        return { ...prev, status: 'Received' }
      })

      setShowThankYouPopup(true)

    } catch (err: any) {
      alert('Error updating status: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

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

  // ============================================================
  // PDF GENERATION — includes BOTH logos in the PDF header.
  // The on-screen card has no logos; the PDF does.
  // ============================================================
  const downloadPDF = async () => {
    if (!redeemData) return
    setDownloading(true)

    try {
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.top = '0'
      container.style.left = '-9999px'
      container.style.width = '800px'
      container.style.background = '#ffffff'
      container.style.padding = '0'
      container.style.fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

      const isReceived = redeemData.status === 'Received'
      const receiptId = `#RED-${redeemData.id.slice(0, 8)}`

      container.innerHTML = `
        <div style="position:relative; background:#ffffff; padding:0; overflow:hidden; width:800px;">

          <!-- Watermark -->
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:480px; height:480px; border-radius:50%; background:#72BF78; opacity:0.06; pointer-events:none;"></div>
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:320px; height:320px; border-radius:50%; border:40px solid #72BF78; opacity:0.05; pointer-events:none;"></div>

          <!-- Header with logos (PDF ONLY) -->
          <div style="position:relative; z-index:1; background:linear-gradient(135deg, #72BF78, #3b8f40, #A0D683); padding:24px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
            <div style="width:70px; height:70px; border-radius:50%; overflow:hidden; background:#ffffff; border:3px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0;">
              <img src="/banicain.png" alt="Barangay Banicain" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;" />
            </div>
            <div style="flex:1; text-align:center; min-width:0;">
              <div style="font-size:22px; font-weight:700; color:#ffffff; letter-spacing:0.3px;">EcoWaste Program</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.9); margin-top:4px;">Barangay Banicain — Official Receipt</div>
            </div>
            <div style="width:70px; height:70px; border-radius:50%; overflow:hidden; background:#ffffff; border:3px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0;">
              <img src="/ecowaste.png" alt="EcoWaste" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;" />
            </div>
          </div>

          <!-- Receipt ID bar -->
          <div style="position:relative; z-index:1; background:#f0fdf4; padding:14px 24px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #dcfce7;">
            <div style="font-size:14px; font-weight:600; color:#1a9e6d;">Redemption Receipt</div>
            <div style="font-size:12px; font-weight:500; background:#ffffff; color:#3b8f40; padding:4px 14px; border-radius:9999px; border:1px solid #A0D683;">${receiptId}</div>
          </div>

          <!-- Body -->
          <div style="position:relative; z-index:1; padding:32px 40px;">

            <!-- Status badge -->
            <div style="text-align:center; margin-bottom:24px;">
              <div style="display:inline-flex; align-items:center; gap:8px; padding:8px 20px; border-radius:9999px; font-weight:500; font-size:14px; ${isReceived ? 'background:#B6FFA1; color:#3b8f40; border:1px solid #A0D683;' : 'background:#dbeafe; color:#2563eb; border:1px solid #93c5fd;'}">
                ${isReceived ? '✓ Item Received' : '⏱ Ready for Pickup'}
              </div>
            </div>

            <!-- Item display -->
            <div style="background:#f9fafb; border-radius:14px; padding:24px; text-align:center; margin-bottom:24px;">
              <div style="width:80px; height:80px; border-radius:50%; background:#B6FFA1; margin:0 auto 12px; display:flex; align-items:center; justify-content:center; font-size:36px;">🎁</div>
              <div style="font-size:22px; font-weight:700; color:#1a1a1a;">${redeemData.itemName}</div>
              <div style="font-size:13px; color:#6b7280; margin-top:4px;">${isReceived ? 'Item has been claimed' : 'Item ready for pickup'}</div>
            </div>

            <!-- User info -->
            <div style="background:#f9fafb; border-radius:12px; padding:16px 20px; margin-bottom:20px; display:flex; align-items:center; gap:14px;">
              <div style="width:52px; height:52px; border-radius:50%; background:#72BF78; display:flex; align-items:center; justify-content:center; color:#ffffff; font-weight:700; font-size:20px; flex-shrink:0;">${redeemData.userName.charAt(0).toUpperCase()}</div>
              <div>
                <div style="font-weight:600; color:#1a1a1a; font-size:15px;">${redeemData.userName}</div>
                <div style="font-size:13px; color:#6b7280; margin-top:2px;">${redeemData.userEmail}</div>
              </div>
            </div>

            <!-- Details table -->
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:14px 0; font-size:14px; color:#6b7280; width:50%;">Item Redeemed</td>
                <td style="padding:14px 0; font-size:14px; color:#1a1a1a; text-align:right; font-weight:500;">${redeemData.itemName}</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:14px 0; font-size:14px; color:#6b7280;">Points Spent</td>
                <td style="padding:14px 0; font-size:14px; color:#ef4444; text-align:right; font-weight:600;">-${redeemData.pointsSpent} pts</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:14px 0; font-size:14px; color:#6b7280;">Remaining Points</td>
                <td style="padding:14px 0; font-size:14px; color:#3b8f40; text-align:right; font-weight:600;">${redeemData.remainingPoints} pts</td>
              </tr>
              <tr style="border-bottom:1px solid #f3f4f6;">
                <td style="padding:14px 0; font-size:14px; color:#6b7280;">Date &amp; Time</td>
                <td style="padding:14px 0; font-size:14px; color:#1a1a1a; text-align:right; font-weight:500;">${redeemData.date}</td>
              </tr>
              <tr>
                <td style="padding:14px 0; font-size:14px; color:#6b7280;">Status</td>
                <td style="padding:14px 0; font-size:14px; text-align:right; font-weight:600; ${isReceived ? 'color:#3b8f40;' : 'color:#2563eb;'}">${isReceived ? 'Received' : 'Ready for Pickup'}</td>
              </tr>
            </table>

            ${!isReceived ? `
              <div style="background:#B6FFA1; border-radius:12px; padding:18px 20px; border:1px solid #A0D683; margin-bottom:20px;">
                <div style="font-weight:600; color:#3b8f40; font-size:15px; margin-bottom:8px;">📍 How to Claim Your Item</div>
                <div style="font-size:13px; color:#3b8f40; line-height:1.7;">
                  <div>1. Go to the <strong>Barangay Hall, New Banicain</strong></div>
                  <div>2. Present this receipt (print or show on your phone)</div>
                  <div>3. Show a valid ID for verification</div>
                  <div>4. Claim your <strong>${redeemData.itemName}</strong></div>
                </div>
                <div style="font-size:12px; color:#3b8f40; margin-top:12px; padding-top:12px; border-top:1px solid #A0D683;">
                  🕐 Office Hours: Monday - Friday, 8:00 AM - 5:00 PM
                </div>
              </div>
            ` : `
              <div style="background:#B6FFA1; border-radius:12px; padding:20px; border:1px solid #A0D683; margin-bottom:20px; text-align:center;">
                <div style="font-size:32px; margin-bottom:6px;">✅</div>
                <div style="font-weight:600; color:#3b8f40; font-size:16px;">Item successfully claimed!</div>
                <div style="font-size:13px; color:#3b8f40; margin-top:4px;">Thank you for participating in the EcoWaste program.</div>
              </div>
            `}

            <div style="text-align:center; font-size:11px; color:#9ca3af; margin-top:24px;">
              This is an official redeem item record for the EcoWaste Program
            </div>
          </div>
        </div>
      `

      document.body.appendChild(container)

      // Wait for logos to load
      const images = Array.from(container.querySelectorAll('img'))
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if ((img as HTMLImageElement).complete) return resolve()
              img.addEventListener('load', () => resolve())
              img.addEventListener('error', () => resolve())
              setTimeout(() => resolve(), 2000)
            })
        )
      )

      await new Promise((r) => setTimeout(r, 150))

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(
        `Redeem_Item_${redeemData.itemName.replace(/\s+/g, '_')}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      )

      document.body.removeChild(container)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Error generating PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="redeem-loading-container">
        <div className="redeem-loading-content">
          <Loader2 className="redeem-loading-spinner" />
          <p>Loading redeem details...</p>
        </div>
      </div>
    )
  }

  if (error || !redeemData) {
    return (
      <div className="redeem-loading-container">
        <div className="redeem-loading-content">
          <XCircle className="redeem-loading-spinner" style={{ color: '#dc2626' }} />
          <p style={{ color: '#dc2626' }}>{error || 'Redeem item not found'}</p>
          <button
            onClick={() => router.push('/user/redeem-items')}
            className="redeem-empty-btn"
            style={{ marginTop: '16px' }}
          >
            Back to Redeem Items
          </button>
        </div>
      </div>
    )
  }

  const ItemIcon = getItemIcon(redeemData.itemName)
  const isReceived = redeemData.status === 'Received'

  return (
    <div className="redeem-container">
      <div className="redeem-wrapper">
        {/* Thank You Popup */}
        {showThankYouPopup && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
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
                padding: '40px 32px',
                maxWidth: '420px',
                width: '100%',
                margin: '0 16px',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <PartyPopper size={56} color="#22c55e" style={{ display: 'block' }} />
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
                Thank You!
              </h3>

              <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '8px' }}>
                Thank you for receiving the item you redeemed!
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                Enjoy your <strong style={{ color: '#16a34a' }}>{redeemData.itemName}</strong>!
              </p>

              <button
                onClick={() => setShowThankYouPopup(false)}
                style={{
                  padding: '10px 32px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <ThumbsUp size={18} />
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/user/redeem-items')}
            className="redeem-detail-back"
            style={{ margin: 0 }}
          >
            <ArrowLeft size={18} />
            Back to Redeem Items
          </button>
        </div>

        {/* On-screen Redeem Card — logos REMOVED here, only PDF has them */}
        <div ref={receiptRef} className="redeem-detail-card" style={{ position: 'relative', overflow: 'hidden' }}>

          {/* Green coin watermark */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '480px',
              height: '480px',
              borderRadius: '50%',
              backgroundColor: '#72BF78',
              opacity: 0.06,
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              border: '40px solid #72BF78',
              opacity: 0.05,
              pointerEvents: 'none',
              zIndex: 0
            }}
          />

          {/* Header — NO logos on-screen, just a green gradient title bar */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'linear-gradient(135deg, #72BF78, #3b8f40, #A0D683)',
              padding: '20px 24px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.3px' }}>
              EcoWaste Program
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginTop: '2px' }}>
              Barangay Banicain — Official Receipt
            </div>
          </div>

          <div className="redeem-detail-header" style={{ position: 'relative', zIndex: 1 }}>
            <div className="redeem-detail-header-left">
              <div className="redeem-detail-header-icon">
                <Receipt />
              </div>
              <div>
                <div className="redeem-detail-header-title">Redeem Item</div>
                <div className="redeem-detail-header-sub">EcoWaste - Barangay Banicain</div>
              </div>
            </div>
            <div className="redeem-detail-id">
              #RED-{redeemData.id.slice(0, 8)}
            </div>
          </div>

          <div className="redeem-detail-body" style={{ position: 'relative', zIndex: 1 }}>
            <div className="redeem-detail-status">
              {isReceived ? (
                <div className="redeem-detail-status-inner received">
                  <CheckCircle size={18} />
                  Item Received
                </div>
              ) : (
                <div className="redeem-detail-status-inner ready">
                  <Clock size={18} />
                  Ready for Pickup
                </div>
              )}
            </div>

            <div className="redeem-detail-item">
              <div className="redeem-detail-item-icon">
                <ItemIcon />
              </div>
              <div className="redeem-detail-item-name">{redeemData.itemName}</div>
              <div className="redeem-detail-item-sub">
                {isReceived ? 'Item has been claimed' : 'Item ready for pickup'}
              </div>
            </div>

            <div className="redeem-detail-user">
              <div className="redeem-detail-avatar">
                {redeemData.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="redeem-detail-user-name">{redeemData.userName}</div>
                <div className="redeem-detail-user-email">{redeemData.userEmail}</div>
              </div>
            </div>

            <div className="redeem-detail-info">
              <div className="redeem-detail-row">
                <div className="redeem-detail-label">
                  <GiftIcon size={18} />
                  Item Redeemed
                </div>
                <span className="redeem-detail-value">{redeemData.itemName}</span>
              </div>

              <div className="redeem-detail-row">
                <div className="redeem-detail-label">
                  <Award size={18} />
                  Points Spent
                </div>
                <span className="redeem-detail-value points-spent">-{redeemData.pointsSpent} pts</span>
              </div>

              <div className="redeem-detail-row">
                <div className="redeem-detail-label">
                  <Award size={18} />
                  Remaining Points
                </div>
                <span className="redeem-detail-value points-remaining">{redeemData.remainingPoints} pts</span>
              </div>

              <div className="redeem-detail-row">
                <div className="redeem-detail-label">
                  <Calendar size={18} />
                  Date & Time
                </div>
                <span className="redeem-detail-value">{redeemData.date}</span>
              </div>

              <div className="redeem-detail-row">
                <div className="redeem-detail-label">
                  <Clock size={18} />
                  Status
                </div>
                <span className={`redeem-detail-value ${isReceived ? 'status-received' : 'status-ready'}`}>
                  {isReceived ? 'Received' : 'Ready for Pickup'}
                </span>
              </div>
            </div>

            {!isReceived && (
              <div className="redeem-detail-claim">
                <div className="redeem-claim-title">
                  <MapPin size={18} />
                  How to Claim Your Item
                </div>
                <div className="redeem-claim-steps">
                  <p>1. Go to the <strong>Barangay Hall, New Banicain</strong></p>
                  <p>2. Present this page (print or show on your phone)</p>
                  <p>3. Show a valid ID for verification</p>
                  <p>4. Claim your <strong>{redeemData.itemName}</strong></p>
                </div>
                <div className="redeem-claim-hours">
                  <Clock size={16} />
                  Office Hours: Monday - Friday, 8:00 AM - 5:00 PM
                </div>
              </div>
            )}

            <div className="redeem-detail-actions">
              {!isReceived && (
                <button onClick={handleReceive} disabled={updating} className="btn-receive">
                  {updating ? (
                    <>
                      <Loader2 size={18} className="redeem-spinning" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Receive Item
                    </>
                  )}
                </button>
              )}

              <button onClick={downloadPDF} disabled={downloading} className="btn-download">
                {downloading ? (
                  <>
                    <Loader2 size={18} className="redeem-spinning" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download PDF
                  </>
                )}
              </button>
            </div>

            {isReceived && (
              <div className="redeem-received-message">
                <CircleCheckBig className="check-icon" />
                <div className="title">Item successfully claimed!</div>
                <div className="sub">Thank you for participating in the EcoWaste program.</div>
              </div>
            )}

            <div className="redeem-detail-footer">
              This is an official redeem item record for EcoWaste Program
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}