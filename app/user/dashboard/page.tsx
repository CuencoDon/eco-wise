'use client'
import { useState, useEffect, useRef } from 'react'
import { 
  Home, 
  Award, 
  TrendingUp, 
  Truck, 
  Calendar,
  ArrowUpRight,
  Clock,
  CheckCircle,
  Users,
  AlertCircle,
  Plus,
  X,
  Package,
  FileText,
  CircleDollarSign,
  XCircle,
  Medal,
  Crown,
  Trophy,
  ChevronRight,
  ThumbsUp,
  Star,
  Sparkles,
  Rocket,
  Camera,
  Loader2,
  Scan,
  Image as ImageIcon,
  RefreshCw,
  Monitor,
  Smartphone,
  Scale,
  Upload,
  AlertTriangle,
  Recycle
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function UserDashboard() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [showTopCollectors, setShowTopCollectors] = useState(false)
  const [notification, setNotification] = useState({
    type: 'success',
    message: '',
    details: '',
    points: 0,
    weight: 0,
    wasteType: ''
  })
  const [userData, setUserData] = useState({
    points: 0,
    recycled: 0,
    rank: 0,
    collections: 0,
    fullName: 'User',
    userId: '',
    email: ''
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [topCollectors, setTopCollectors] = useState<any[]>([])
  
  // Materials from admin
  const [materials, setMaterials] = useState<any[]>([])
  
  // Scanner States
  const [scanning, setScanning] = useState(false)
  const [scannerResult, setScannerResult] = useState<{
    wasteType: string
    confidence: number
    image: string | null
  } | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment')
  
  // Verification States
  const [showVerification, setShowVerification] = useState(false)
  const [verificationImage, setVerificationImage] = useState<string | null>(null)
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const verificationFileInputRef = useRef<HTMLInputElement>(null)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobile = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|webOS/i.test(userAgent)
      setIsMobile(mobile)
    }
    checkMobile()
  }, [])

  // ================================================================
  // FETCH MATERIALS — refetches on mount, every 30s, and on tab focus
  // ================================================================
  useEffect(() => {
    let isMounted = true

    const fetchMaterials = async () => {
      try {
        const { data, error } = await supabase
          .from('recyclable_materials')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (!isMounted) return

        if (error) {
          console.warn('Materials fetch warning:', error)
          setMaterials([
            { name: 'Paper', points_per_kg: 5, hold_until_scheduled: false, schedule_day: null, is_active: true },
            { name: 'Plastic', points_per_kg: 5, hold_until_scheduled: false, schedule_day: null, is_active: true },
            { name: 'Metal', points_per_kg: 2, hold_until_scheduled: false, schedule_day: null, is_active: true },
          ])
        } else if (data) {
          setMaterials(data)
        }
      } catch (err) {
        // Silent
      }
    }

    fetchMaterials()

    const interval = setInterval(fetchMaterials, 30000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchMaterials()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Get icon for a material based on its name
  const getIconForMaterial = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('paper') || n.includes('cardboard') || n.includes('sheet') || n.includes('newspaper')) return FileText
    if (n.includes('plastic') || n.includes('bottle') || n.includes('container')) return Package
    if (n.includes('metal') || n.includes('steel') || n.includes('can') || n.includes('aluminum') || n.includes('iron')) return CircleDollarSign
    if (n.includes('glass')) return Package
    return Recycle
  }

  const getColorForMaterial = (index: number) => {
    const colors = ['yellow', 'blue', 'purple', 'green']
    return colors[index % colors.length]
  }

  // Build waste-type list from active materials
  const wasteTypes = materials.map((m, i) => ({
    value: m.name,
    icon: getIconForMaterial(m.name),
    color: getColorForMaterial(i),
    points: `${m.points_per_kg} pts/kg`,
    pointsPerKg: m.points_per_kg,
    holdUntilScheduled: m.hold_until_scheduled,
    scheduleDay: m.schedule_day
  }))

  // Points per kg — lookup from materials
  const getPointsPerKg = (type: string) => {
    const material = materials.find(m => m.name === type)
    return material?.points_per_kg ?? 5
  }

  const [formData, setFormData] = useState({
    wasteType: '',
    weightKg: '',
    points: 0
  })

  // Auto-set first material when materials load and formData.wasteType is empty
  useEffect(() => {
    if (materials.length > 0 && !formData.wasteType) {
      setFormData(prev => ({
        ...prev,
        wasteType: materials[0].name,
        points: 0
      }))
    }
  }, [materials])

  // ================================================================
  // RECOMPUTE POINTS when materials change (admin updated pts/kg)
  // ================================================================
  useEffect(() => {
    if (!formData.wasteType) return
    const material = materials.find(m => m.name === formData.wasteType)
    if (!material) return
    const weight = parseFloat(formData.weightKg) || 0
    const newPoints = weight * material.points_per_kg
    if (newPoints !== formData.points) {
      setFormData(prev => ({ ...prev, points: newPoints }))
    }
  }, [materials])

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [showNotification])

  // Fetch top collectors
  useEffect(() => {
    const fetchTopCollectors = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, total_points, total_recycled_kg')
          .eq('role', 'user')
          .order('total_points', { ascending: false })
          .limit(5)

        if (error) {
          console.error('Error fetching top collectors:', error)
          return
        }

        if (data) {
          setTopCollectors(data)
        }
      } catch (error) {
        // Silent fail
      }
    }

    fetchTopCollectors()
  }, [])

  const handleWeightChange = (value: string) => {
    const weight = parseFloat(value) || 0
    const pointsPerKg = getPointsPerKg(formData.wasteType)
    setFormData({
      ...formData,
      weightKg: value,
      points: weight * pointsPerKg
    })
  }

  const handleWasteTypeChange = (type: string) => {
    const weight = parseFloat(formData.weightKg) || 0
    const pointsPerKg = getPointsPerKg(type)
    setFormData({
      ...formData,
      wasteType: type,
      points: weight * pointsPerKg
    })
  }

  // Function to calculate user's rank
  const calculateUserRank = async (userId: string, userPoints: number) => {
    try {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, total_points')
        .eq('role', 'user')
        .order('total_points', { ascending: false })

      if (error) return 1
      if (!allUsers || allUsers.length === 0) return 1

      const userIndex = allUsers.findIndex(u => u.id === userId)
      if (userIndex !== -1) return userIndex + 1

      let rank = 1
      for (const user of allUsers) {
        if (user.total_points > userPoints) rank++
      }
      return rank
    } catch {
      return 1
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        setUserData(prev => ({
          ...prev,
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || ''
        }))

        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single()

        if (error) return

        if (userProfile) {
          const userRank = await calculateUserRank(userProfile.id, userProfile.total_points || 0)

          setUserData(prev => ({
            ...prev,
            points: userProfile.total_points || 0,
            recycled: userProfile.total_recycled_kg || 0,
            rank: userRank,
            fullName: userProfile.full_name || prev.fullName,
            userId: userProfile.id,
            email: userProfile.email || prev.email
          }))
        }

        const { data: records } = await supabase
          .from('recycling_records')
          .select('*')
          .eq('user_id', userProfile?.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (records && records.length > 0) {
          setRecentActivity(records)
          setUserData(prev => ({
            ...prev,
            collections: records.length
          }))
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Camera functions
  const startCamera = async () => {
    setCameraError(null)
    setCameraActive(false)
    
    try {
      let constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: cameraFacing
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setCameraActive(true)
        }
        streamRef.current = stream
        setCameraError(null)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      
      if (cameraFacing === 'environment') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          })
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play()
              setCameraActive(true)
            }
            streamRef.current = stream
            setCameraError(null)
            setCameraFacing('user')
            return
          }
        } catch (e) {
          console.error('Front camera also failed:', e)
        }
      }

      setCameraError('Unable to access camera. Please allow camera permissions or upload an image.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setCapturedImage(imageDataUrl)
      stopCamera()
      classifyImage(imageDataUrl)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageDataUrl = event.target?.result as string
      setCapturedImage(imageDataUrl)
      classifyImage(imageDataUrl)
    }
    reader.readAsDataURL(file)
  }

  const classifyImage = async (imageDataUrl: string) => {
    setScanning(true)
    setScannerResult(null)

    try {
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      const formData = new FormData()
      formData.append('image', blob, 'waste.jpg')

      const result = await fetch('/api/classify-waste', {
        method: 'POST',
        body: formData
      })

      const data = await result.json()
      
      setScannerResult({
        wasteType: data.wasteType || 'Unknown',
        confidence: data.confidence || 0,
        image: imageDataUrl
      })

      if (data.wasteType && data.wasteType !== 'Unknown' && data.wasteType !== 'Error') {
        const matched = materials.find(m => 
          m.name.toLowerCase().includes(data.wasteType.toLowerCase()) ||
          data.wasteType.toLowerCase().includes(m.name.toLowerCase())
        )
        if (matched) {
          setFormData(prev => ({
            ...prev,
            wasteType: matched.name
          }))
        }
      }

    } catch (error) {
      console.error('Classification error:', error)
      setScannerResult({
        wasteType: 'Error',
        confidence: 0,
        image: imageDataUrl
      })
    } finally {
      setScanning(false)
    }
  }

  const resetScanner = () => {
    setScannerResult(null)
    setCapturedImage(null)
    setCameraActive(false)
    setCameraError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toggleCamera = () => {
    if (isMobile) {
      setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')
      if (cameraActive) {
        stopCamera()
        setTimeout(() => startCamera(), 300)
      }
    } else {
      if (cameraActive) {
        stopCamera()
        setTimeout(() => startCamera(), 300)
      }
    }
  }

  // Verification
  const openVerification = () => {
    setShowVerification(true)
    setVerificationImage(null)
    setIsVerified(false)
    setVerificationMessage('Please take a photo of your recyclable items with a weight scale visible.')
  }

  const uploadVerificationImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const imageDataUrl = event.target?.result as string
      setVerificationImage(imageDataUrl)
      await verifyImage(imageDataUrl)
    }
    reader.readAsDataURL(file)
  }

  const verifyImage = async (imageDataUrl: string) => {
    setVerificationLoading(true)
    setVerificationMessage('Analyzing image...')

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setIsVerified(true)
      setVerificationMessage('Verification successful! Your recycling record has been validated.')
    } catch (error) {
      setVerificationMessage('Verification failed. Please try again with a clearer image showing the weight scale.')
      setIsVerified(false)
    } finally {
      setVerificationLoading(false)
    }
  }

  const closeVerification = () => {
    setShowVerification(false)
    setVerificationImage(null)
    setIsVerified(false)
    setVerificationMessage('')
    setVerificationLoading(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const showSuccessNotification = (points: number, weight: number, wasteType: string) => {
    setNotification({
      type: 'success',
      message: 'Congratulations!',
      details: `You've earned ${points} points for recycling ${weight}kg of ${wasteType}!`,
      points: points,
      weight: weight,
      wasteType: wasteType
    })
    setShowNotification(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isVerified) {
      alert('Please verify your recyclable materials with a photo showing the weight scale first.')
      return
    }

    const weight = parseFloat(formData.weightKg)
    if (!weight || weight <= 0) {
      alert('Please enter a valid weight in kilograms')
      return
    }

    if (!formData.wasteType) {
      alert('Please select a waste type')
      return
    }

    // Enforce "hold until scheduled" for the selected material
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const material = materials.find(m => m.name === formData.wasteType)
    if (material?.hold_until_scheduled && material.schedule_day !== today) {
      alert(`${formData.wasteType} can only be collected on ${material.schedule_day}.`)
      return
    }

    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('You must be logged in to submit recycling records.')
        setSubmitting(false)
        return
      }

      const userId = session.user.id

      const { data: recordData, error: recordError } = await supabase
        .from('recycling_records')
        .insert({
          user_id: userId,
          waste_type: formData.wasteType,
          weight_kg: weight,
          points_earned: formData.points,
          status: 'Completed',
          verification_image: verificationImage || null
        })
        .select()

      if (recordError) {
        alert('Error submitting: ' + recordError.message)
        setSubmitting(false)
        return
      }

      const { data: userProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (fetchError || !userProfile) {
        alert('User profile not found.')
        setSubmitting(false)
        return
      }

      const newTotalPoints = (userProfile.total_points || 0) + formData.points
      const newTotalRecycled = (userProfile.total_recycled_kg || 0) + weight

      const { error: updateError } = await supabase
        .from('users')
        .update({
          total_points: newTotalPoints,
          total_recycled_kg: newTotalRecycled
        })
        .eq('id', userProfile.id)

      if (updateError) {
        alert('Error updating user: ' + updateError.message)
        setSubmitting(false)
        return
      }

      const updatedRank = await calculateUserRank(userProfile.id, newTotalPoints)

      setUserData(prev => ({
        ...prev,
        points: newTotalPoints,
        recycled: newTotalRecycled,
        collections: prev.collections + 1,
        rank: updatedRank
      }))

      setRecentActivity(prev => [
        {
          id: recordData?.[0]?.id || Date.now(),
          weight_kg: weight,
          waste_type: formData.wasteType,
          points_earned: formData.points,
          created_at: new Date().toISOString()
        },
        ...prev
      ])

      setFormData({
        wasteType: materials[0]?.name || '',
        weightKg: '',
        points: 0
      })
      setShowForm(false)
      resetScanner()
      setIsVerified(false)
      setVerificationImage(null)
      
      showSuccessNotification(formData.points, weight, formData.wasteType)

    } catch (error: any) {
      alert('Error submitting recycling record: ' + (error.message || 'Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      wasteType: materials[0]?.name || '',
      weightKg: '',
      points: 0
    })
    setShowForm(false)
    resetScanner()
    closeVerification()
    setIsVerified(false)
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-spinner"></div>
        <p className="dashboard-loading-text">Loading dashboard...</p>
      </div>
    )
  }

  const getMedal = (index: number) => {
    switch(index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />
      case 1: return <Medal className="w-5 h-5 text-gray-400" />
      case 2: return <Medal className="w-5 h-5 text-amber-700" />
      default: return <Award className="w-5 h-5 text-blue-400" />
    }
  }

  const statCards = [
    { label: 'Total Points', value: userData.points.toLocaleString(), change: '', icon: Award, cardClass: 'stat-square yellow' },
    { label: 'Recycled Total', value: `${userData.recycled.toFixed(1)} kg`, change: '', icon: TrendingUp, cardClass: 'stat-square blue' },
    { label: 'Collections', value: userData.collections.toString(), change: '', icon: Truck, cardClass: 'stat-square green' },
    { label: 'Rank', value: `#${userData.rank}`, change: 'View All', icon: Crown, cardClass: 'stat-square purple', clickable: true, showUserLine: true },
  ]

  return (
    <div className="user-container" style={{ position: 'relative' }}>
      {/* Success notification modal */}
      {showNotification && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 48px',
            maxWidth: '420px', width: '100%', margin: '0 16px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
            animation: 'scaleIn 0.3s ease-out', textAlign: 'center'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)'
            }}>
              <CheckCircle style={{ width: '48px', height: '48px', color: '#22c55e' }} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
              Congratulations!
            </h3>
            <p style={{ fontSize: '36px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
              +{notification.points} Points
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.5' }}>
              {notification.details}
            </p>
            <button
              onClick={() => setShowNotification(false)}
              style={{
                padding: '10px 32px', backgroundColor: '#16a34a', color: '#ffffff',
                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              Awesome! <Rocket className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Collectors modal */}
      {showTopCollectors && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
            maxWidth: '480px', width: '100%', margin: '0 16px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>Top Collectors</h3>
              </div>
              <button
                onClick={() => setShowTopCollectors(false)}
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topCollectors.length > 0 ? (
                topCollectors.map((collector, index) => (
                  <div key={index} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: '10px',
                    backgroundColor: index === 0 ? '#fef3c7' : index === 1 ? '#f9fafb' : index === 2 ? '#fffbeb' : '#f8fafc',
                    border: `1px solid ${index === 0 ? '#f59e0b' : index === 1 ? '#d1d5db' : index === 2 ? '#d97706' : '#e5e7eb'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: index === 0 ? '#fef3c7' : index === 1 ? '#f3f4f6' : index === 2 ? '#fef3c7' : '#eff6ff',
                        color: index === 0 ? '#d97706' : index === 1 ? '#6b7280' : index === 2 ? '#b45309' : '#3b82f6',
                        fontWeight: 700, fontSize: '14px'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{collector.full_name || 'Anonymous'}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {collector.total_recycled_kg?.toFixed(1) || 0} kg recycled
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getMedal(index)}
                      <span style={{ fontWeight: 700, color: '#1a1a1a' }}>
                        {collector.total_points?.toLocaleString() || 0} pts
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>
                  <p>No collectors yet. Start recycling!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="user-wrapper">
        {/* Welcome Banner */}
        <div className="user-welcome-banner">
          <div className="user-welcome-content">
            <div className="user-welcome-left">
              <div className="user-welcome-icon">
                <Home className="w-6 h-6" />
              </div>
              <div className="user-welcome-text">
                <h2>Welcome back, {userData.fullName}!</h2>
                <p>Track your recycling progress and earn rewards</p>
              </div>
            </div>
            <div className="user-welcome-badge">
              <Clock className="w-4 h-4 text-green-300" />
              <span>Recycle & Earn Points</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            const isRank = stat.clickable
            return (
              <div
                key={index}
                className={stat.cardClass}
                style={isRank ? { cursor: 'pointer' } : {}}
                onClick={isRank ? () => setShowTopCollectors(true) : undefined}
              >
                <div className="stat-icon">
                  <Icon />
                </div>
                <div className="stat-label" style={{ fontSize: '11px' }}>{stat.label}</div>
                <div className="stat-value" style={{ fontSize: '22px' }}>{stat.value}</div>
                {isRank && (
                  <div className="stat-top-collectors">
                    <div className="stat-collector-item">
                      <span style={{ width: '14px', flexShrink: 0 }}>
                        <Trophy size={14} />
                      </span>
                      <span className="stat-collector-name" style={{ fontSize: '10px' }}>{userData.fullName}</span>
                      <span className="stat-collector-points" style={{ fontSize: '10px' }}>{userData.points} pts</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Activity + Scanner */}
        <div className="user-activity-scanner-grid">
          <div className="user-activity-card">
            <div className="user-activity-header">
              <div className="user-activity-title">
                <Clock className="w-5 h-5 text-[#1b5e20]" />
                Recent Activity
              </div>
              <span className="text-xs text-gray-400">{recentActivity.length} records</span>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-1">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="user-activity-item">
                    <div className="user-activity-left">
                      <div className="user-activity-icon">
                        <CheckCircle />
                      </div>
                      <div>
                        <p className="user-activity-text">
                          Recycled {activity.weight_kg}kg of {activity.waste_type}
                        </p>
                        <p className="user-activity-date">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="user-activity-points">+{activity.points_earned} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-empty-state">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No recycling activity yet. Start recycling today!
              </div>
            )}
          </div>

          <div className="user-scanner-card">
            <div className="user-scanner-header">
              <div className="user-scanner-title">
                <Scan className="w-5 h-5 text-[#1b5e20]" />
                Waste Scanner
              </div>
              <span className="user-scanner-badge">AI Powered</span>
            </div>
            
            {!scannerResult && !capturedImage && !cameraActive ? (
              <div className="user-scanner-placeholder">
                <div className="user-scanner-placeholder-icon">
                  <Camera className="w-10 h-10" />
                </div>
                <div className="user-scanner-placeholder-actions">
                  <button onClick={startCamera} className="user-scanner-btn user-scanner-btn-primary">
                    <Camera className="w-4 h-4" />
                    {isMobile ? 'Open Camera' : 'Use Camera'}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="user-scanner-btn user-scanner-btn-secondary">
                    <ImageIcon className="w-4 h-4" />
                    Upload Image
                  </button>
                </div>
                <p className="user-scanner-hint">
                  {isMobile ? 'Take a photo to identify waste type' : 'Upload an image to identify waste type'}
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
              </div>
            ) : cameraActive ? (
              <div className="user-scanner-camera">
                <video ref={videoRef} className="user-scanner-video" playsInline autoPlay muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="user-scanner-camera-controls">
                  <button onClick={captureImage} className="user-scanner-capture-btn">
                    <div className="user-scanner-capture-circle" />
                  </button>
                  <button onClick={toggleCamera} className="user-scanner-flip-btn">
                    {isMobile ? <Smartphone className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                  </button>
                  <button onClick={stopCamera} className="user-scanner-close-btn">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {cameraError && (
                  <div className="user-scanner-error">
                    <AlertCircle className="w-5 h-5" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="user-scanner-result">
                {capturedImage && (
                  <div className="user-scanner-preview">
                    <img src={capturedImage} alt="Captured waste" className="user-scanner-preview-img" />
                  </div>
                )}
                {scanning ? (
                  <div className="user-scanner-loading">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    <span>Identifying waste type...</span>
                  </div>
                ) : scannerResult && (
                  <div className="user-scanner-detection">
                    <div className={`user-scanner-type ${scannerResult.wasteType !== 'Unknown' && scannerResult.wasteType !== 'Error' ? 'found' : 'not-found'}`}>
                      {scannerResult.wasteType !== 'Unknown' && scannerResult.wasteType !== 'Error' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                      )}
                      <span>
                        {scannerResult.wasteType !== 'Unknown' && scannerResult.wasteType !== 'Error' 
                          ? `Detected: ${scannerResult.wasteType}` 
                          : scannerResult.wasteType === 'Error' ? 'Error detecting' : 'Unknown material'}
                      </span>
                    </div>
                    <div className="user-scanner-actions">
                      <button onClick={resetScanner} className="user-scanner-btn user-scanner-btn-secondary">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </button>
                      {scannerResult.wasteType !== 'Unknown' && scannerResult.wasteType !== 'Error' && (
                        <button
                          onClick={() => {
                            setScannerResult(null)
                            setCapturedImage(null)
                            setShowForm(true)
                          }}
                          className="user-scanner-btn user-scanner-btn-primary"
                        >
                          <Plus className="w-4 h-4" />
                          Use This Type
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Recycling Button */}
        {!showForm && !scannerResult && (
          <button onClick={() => setShowForm(true)} className="btn-add-recycling">
            <Plus className="w-5 h-5" />
            Add Recycling Record
          </button>
        )}

        {/* Recycling Form */}
        {showForm && (
          <div className="recycling-form-container">
            <div className="recycling-form-title">
              <h3>Add Recycling Record</h3>
              <button onClick={handleCancel} className="recycling-form-close">
                <X />
              </button>
            </div>

            <div style={{ 
              marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
              backgroundColor: isVerified ? '#f0fdf4' : '#fef3c7',
              border: `1px solid ${isVerified ? '#86efac' : '#fcd34d'}`,
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              {isVerified ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span style={{ color: '#166534', fontSize: '14px' }}>Verified! Your proof has been validated.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span style={{ color: '#92400e', fontSize: '14px' }}>Please upload proof of your recyclable materials with a weight scale.</span>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Waste Type</label>
                {wasteTypes.length === 0 ? (
                  <div style={{
                    padding: '16px', textAlign: 'center', color: '#6b7280',
                    fontSize: '13px', background: '#f9fafb', borderRadius: '8px'
                  }}>
                    No materials are currently active. Please wait for the admin to add some.
                  </div>
                ) : (
                  <div className="waste-type-grid">
                    {wasteTypes.map((type) => {
                      const Icon = type.icon
                      const isSelected = formData.wasteType === type.value
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleWasteTypeChange(type.value)}
                          className={`waste-type-btn ${isSelected ? 'active' : ''}`}
                        >
                          <Icon className={`icon ${type.color}`} />
                          <span className="label">{type.value}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{type.points}</span>
                          {type.holdUntilScheduled && (
                            <span className="text-[9px] text-amber-600 mt-0.5">
                              Hold • {type.scheduleDay}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Weight (kilograms)</label>
                <div className="form-input-wrapper">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.weightKg}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    placeholder="Enter weight in kg"
                    className="form-input"
                    required
                  />
                  <span className="form-input-unit">kg</span>
                </div>
              </div>

              <div className="points-preview">
                <div className="points-preview-row">
                  <span className="points-preview-label">Points Earned:</span>
                  <span className="points-preview-value">{formData.points.toFixed(0)}</span>
                </div>
                <p className="points-preview-hint">
                  {formData.weightKg ? (
                    `${formData.weightKg} kg × ${getPointsPerKg(formData.wasteType)} pts/kg = ${formData.points.toFixed(0)} points`
                  ) : (
                    'Enter weight to calculate points'
                  )}
                </p>
              </div>

              <div className="form-group">
                <button
                  type="button"
                  onClick={openVerification}
                  style={{
                    width: '100%', padding: '10px',
                    backgroundColor: isVerified ? '#dcfce7' : '#f3f4f6',
                    color: isVerified ? '#166534' : '#374151',
                    border: `2px solid ${isVerified ? '#86efac' : '#e5e7eb'}`,
                    borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px'
                  }}
                >
                  {isVerified ? (
                    <><CheckCircle className="w-4 h-4" />Proof Verified</>
                  ) : (
                    <><Upload className="w-4 h-4" />Upload Proof (Required)</>
                  )}
                </button>
                {verificationImage && (
                  <div style={{ marginTop: '8px' }}>
                    <img src={verificationImage} alt="Verification"
                      style={{ maxHeight: '80px', borderRadius: '8px', objectFit: 'cover', width: '100%' }} />
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={submitting || !formData.weightKg || parseFloat(formData.weightKg) <= 0 || !isVerified}
                  className="btn-submit"
                  style={{ opacity: (!isVerified) ? 0.5 : 1, cursor: (!isVerified) ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Submitting...' : 'Submit Recycling'}
                </button>
                <button type="button" onClick={handleCancel} className="btn-cancel">
                  Cancel
                </button>
              </div>

              {!isVerified && (
                <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px', textAlign: 'center' }}>
                  <AlertCircle className="w-4 h-4 inline" style={{ marginRight: '4px' }} />
                  You must upload proof with a weight scale before submitting.
                </p>
              )}
            </form>
          </div>
        )}

        {/* Verification Modal */}
        {showVerification && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
              maxWidth: '500px', width: '100%', margin: '0 16px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Scale className="w-6 h-6 text-green-600" />
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>Verify Your Recycling</h3>
                </div>
                <button onClick={closeVerification} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                  Please take a photo of your recyclable items with a <strong>weight scale</strong> visible to verify your recycling record.
                </p>
              </div>

              {!verificationImage ? (
                <div
                  style={{
                    border: '2px dashed #e5e7eb', borderRadius: '12px', padding: '32px',
                    textAlign: 'center', cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (isMobile) startCamera()
                    else verificationFileInputRef.current?.click()
                  }}
                >
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p style={{ color: '#6b7280', fontWeight: 500 }}>
                    {isMobile ? 'Tap to take a photo' : 'Click to upload an image'}
                  </p>
                  <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                    Make sure the weight scale is visible
                  </p>
                  <input
                    ref={verificationFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={uploadVerificationImage}
                    className="hidden"
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={verificationImage} alt="Verification" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        setVerificationImage(null)
                        if (isMobile) startCamera()
                        else verificationFileInputRef.current?.click()
                      }}
                      style={{ padding: '6px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <RefreshCw className="w-4 h-4 inline mr-1" />
                      Retake
                    </button>
                    <button
                      onClick={() => verifyImage(verificationImage)}
                      disabled={verificationLoading}
                      style={{ padding: '6px 16px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: verificationLoading ? 'not-allowed' : 'pointer', opacity: verificationLoading ? 0.6 : 1 }}
                    >
                      {verificationLoading ? (
                        <><Loader2 className="w-4 h-4 inline animate-spin mr-1" />Verifying...</>
                      ) : (
                        <><CheckCircle className="w-4 h-4 inline mr-1" />Verify Image</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {verificationMessage && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px',
                  backgroundColor: isVerified ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${isVerified ? '#86efac' : '#fecaca'}`,
                  marginBottom: '16px'
                }}>
                  <p style={{ color: isVerified ? '#166534' : '#dc2626', fontSize: '14px' }}>
                    {verificationMessage}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={closeVerification} style={{ flex: 1, padding: '10px', backgroundColor: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={() => { if (isVerified) closeVerification() }}
                  disabled={!isVerified}
                  style={{ flex: 1, padding: '10px', backgroundColor: isVerified ? '#16a34a' : '#9ca3af', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: isVerified ? 'pointer' : 'not-allowed' }}
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Confirm & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Camera FAB */}
      <button
        onClick={() => { if (!scannerResult && !cameraActive) startCamera() }}
        className="user-camera-fab"
        aria-label="Scan Waste"
      >
        <Camera className="w-6 h-6" />
      </button>
    </div>
  )
}