'use client'
import { useState, useRef, useEffect } from 'react'
import { 
  Download, 
  Search, 
  Users, 
  Award, 
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Eye,
  Printer,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Package,
  Clock,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabaseClient'

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDate, setCurrentDate] = useState('')
  const [formattedDate, setFormattedDate] = useState('')
  const [userData, setUserData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRecords, setUserRecords] = useState<any[]>([])
  const [viewingUser, setViewingUser] = useState<any>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const userReportRef = useRef<HTMLDivElement>(null)

  // ===== Edit User Modal State =====
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    barangay: '',
    status: 'Active',
    totalPoints: 0,
    totalRecycled: 0
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // ===== Delete User Modal State =====
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteDeleting, setDeleteDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // ===== Toast State =====
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Fetch users from database
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        const transformedData = data.map((user: any) => ({
          id: user.id,
          name: user.full_name || user.email?.split('@')[0] || 'User',
          age: user.age || Math.floor(Math.random() * 30) + 20,
          email: user.email,
          phone: user.phone || 'N/A',
          barangay: user.barangay || 'Barangay Banicain',
          points: user.total_points || 0,
          recycling: `${user.total_recycled_kg || 0} kg`,
          joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A',
          joinDateFull: user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
          status: user.status || 'Active',
          total_recycled_kg: user.total_recycled_kg || 0
        }))
        setUserData(transformedData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const now = new Date()
    setCurrentDate(now.toLocaleString())
    setFormattedDate(now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))
  }, [])

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Fetch user's recycling records
  const fetchUserRecords = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('recycling_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user records:', error)
        return []
      }
      return data || []
    } catch (error) {
      console.error('Error:', error)
      return []
    }
  }

  const handleUserClick = async (user: any) => {
    const records = await fetchUserRecords(user.id)
    setUserRecords(records)
    setViewingUser(user)
    setSelectedUser(user)
  }

  const handleBackToList = () => {
    setViewingUser(null)
    setSelectedUser(null)
    setUserRecords([])
  }

  // ===== EDIT =====
  const openEditModal = () => {
    if (!viewingUser) return
    setEditForm({
      fullName: viewingUser.name || '',
      email: viewingUser.email || '',
      phone: viewingUser.phone === 'N/A' ? '' : (viewingUser.phone || ''),
      barangay: viewingUser.barangay === 'Barangay Banicain' ? 'Barangay Banicain' : (viewingUser.barangay || 'Barangay Banicain'),
      status: viewingUser.status || 'Active',
      totalPoints: viewingUser.points || 0,
      totalRecycled: viewingUser.total_recycled_kg || 0
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!viewingUser) return
    setEditSaving(true)
    setEditError('')

    try {
      if (!editForm.fullName.trim()) {
        throw new Error('Full name is required')
      }
      if (!editForm.email.trim()) {
        throw new Error('Email is required')
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: editForm.fullName.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || null,
          barangay: editForm.barangay.trim() || null,
          status: editForm.status,
          total_points: Number(editForm.totalPoints) || 0,
          total_recycled_kg: Number(editForm.totalRecycled) || 0
        })
        .eq('id', viewingUser.id)

      if (error) throw error

      await fetchUsers()

      // Update the currently-viewed user locally so the detail view reflects changes immediately
      const updatedUser = {
        ...viewingUser,
        name: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || 'N/A',
        barangay: editForm.barangay.trim() || 'Barangay Banicain',
        status: editForm.status,
        points: Number(editForm.totalPoints) || 0,
        total_recycled_kg: Number(editForm.totalRecycled) || 0,
        recycling: `${Number(editForm.totalRecycled) || 0} kg`
      }
      setViewingUser(updatedUser)
      setSelectedUser(updatedUser)

      setShowEditModal(false)
      setToast({ type: 'success', message: 'User updated successfully' })
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user')
    } finally {
      setEditSaving(false)
    }
  }

  // ===== DELETE =====
  const openDeleteModal = () => {
    if (!viewingUser) return
    setDeleteError('')
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!viewingUser) return
    setDeleteDeleting(true)
    setDeleteError('')

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', viewingUser.id)

      if (error) throw error

      await fetchUsers()

      // Reset view and go back to list
      setViewingUser(null)
      setSelectedUser(null)
      setUserRecords([])

      setShowDeleteModal(false)
      setToast({ type: 'success', message: 'User deleted successfully' })
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user')
    } finally {
      setDeleteDeleting(false)
    }
  }

  const filteredUsers = userData
    .filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'All' || user.status === filterStatus
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const aVal = a[sortField as keyof typeof a]
      const bVal = b[sortField as keyof typeof b]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return 0
    })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // ============================================================
  // GENERATE USER PDF — clean, professional, no UI artifacts
  // ============================================================
  const generateUserPDF = async () => {
    if (!selectedUser) return
    setIsGenerating(true)

    try {
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.top = '0'
      container.style.left = '-9999px'
      container.style.width = '820px'
      container.style.background = '#ffffff'
      container.style.fontFamily =
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

      const totalRecycled = userRecords.reduce((sum, r) => sum + (r.weight_kg || 0), 0)
      const totalPointsEarned = userRecords.reduce((sum, r) => sum + (r.points_earned || 0), 0)
      const isActive = (selectedUser.status || 'Active') === 'Active'
      const reportDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

      const rowsHTML = userRecords.length > 0
        ? userRecords.map((record, index) => {
            const bg = index % 2 === 0 ? '#ffffff' : '#f9fafb'
            const date = record.created_at
              ? new Date(record.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'N/A'
            return `
              <tr style="background:${bg}; border-bottom:1px solid #f3f4f6;">
                <td style="padding:10px 12px; font-size:12px; color:#6b7280; text-align:center;">${index + 1}</td>
                <td style="padding:10px 12px; font-size:13px; color:#1a1a1a;">${date}</td>
                <td style="padding:10px 12px; font-size:13px; color:#1a1a1a; font-weight:500;">${record.waste_type || 'N/A'}</td>
                <td style="padding:10px 12px; font-size:13px; color:#1a1a1a; text-align:right;">${record.weight_kg || 0} kg</td>
                <td style="padding:10px 12px; font-size:13px; color:#d97706; font-weight:700; text-align:right;">+${record.points_earned || 0}</td>
                <td style="padding:10px 12px; text-align:center;">
                  <span style="display:inline-block; padding:3px 10px; border-radius:9999px; font-size:11px; font-weight:600; background:#B6FFA1; color:#3b8f40;">
                    ${record.status || 'Completed'}
                  </span>
                </td>
              </tr>
            `
          }).join('')
        : `
          <tr>
            <td colspan="6" style="padding:40px 20px; text-align:center; color:#9ca3af; font-size:13px;">
              No recycling records found for this user.
            </td>
          </tr>
        `

      container.innerHTML = `
        <div style="position:relative; background:#ffffff; overflow:hidden; width:820px;">
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:520px; height:520px; border-radius:50%; background:#72BF78; opacity:0.05; pointer-events:none; z-index:0;"></div>

          <div style="position:relative; z-index:1; background:linear-gradient(135deg, #72BF78, #3b8f40, #A0D683); padding:24px 32px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
            <div style="width:70px; height:70px; border-radius:50%; overflow:hidden; background:#ffffff; border:3px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0;">
              <img src="/banicain.png" alt="Barangay Banicain" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;" />
            </div>
            <div style="flex:1; text-align:center; min-width:0;">
              <div style="font-size:24px; font-weight:700; color:#ffffff; letter-spacing:0.3px;">User Report</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.9); margin-top:4px;">Barangay Banicain — EcoWaste Program</div>
            </div>
            <div style="width:70px; height:70px; border-radius:50%; overflow:hidden; background:#ffffff; border:3px solid #ffffff; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex-shrink:0;">
              <img src="/ecowaste.png" alt="EcoWaste" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;" />
            </div>
          </div>

          <div style="position:relative; z-index:1; background:#f0fdf4; padding:12px 32px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #dcfce7;">
            <div style="font-size:12px; color:#3b8f40; font-weight:600;">Report Generated</div>
            <div style="font-size:12px; color:#3b8f40;">${reportDate}</div>
          </div>

          <div style="position:relative; z-index:1; padding:28px 32px;">
            <div style="display:flex; align-items:center; gap:20px; padding:20px; background:#f0fdf4; border-radius:14px; border:1px solid #B6FFA1; margin-bottom:20px;">
              <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #B6FFA1, #72BF78); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:32px; font-weight:700; flex-shrink:0;">
                ${selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:22px; font-weight:700; color:#1a1a1a; margin-bottom:6px;">${selectedUser.name}</div>
                <div style="font-size:13px; color:#4b5563; line-height:1.7;">
                  <div><strong>Email:</strong> ${selectedUser.email}</div>
                  <div><strong>Phone:</strong> ${selectedUser.phone || 'N/A'}</div>
                  <div><strong>Barangay:</strong> ${selectedUser.barangay || 'Barangay Banicain'}</div>
                  <div><strong>Member Since:</strong> ${selectedUser.joinDateFull || selectedUser.joinDate || 'N/A'}</div>
                </div>
              </div>
              <div style="flex-shrink:0;">
                <span style="display:inline-block; padding:6px 16px; border-radius:9999px; font-size:12px; font-weight:600; ${isActive ? 'background:#B6FFA1; color:#3b8f40;' : 'background:#fee2e2; color:#991b1b;'}">
                  ${selectedUser.status || 'Active'}
                </span>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:24px;">
              <div style="padding:16px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#2563eb; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Total Records</div>
                <div style="font-size:26px; font-weight:700; color:#1e40af; margin-top:6px;">${userRecords.length}</div>
              </div>
              <div style="padding:16px; background:#fef3c7; border:1px solid #fcd34d; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Points Earned</div>
                <div style="font-size:26px; font-weight:700; color:#78350f; margin-top:6px;">${totalPointsEarned.toLocaleString()}</div>
              </div>
              <div style="padding:16px; background:#dcfce7; border:1px solid #86efac; border-radius:12px; text-align:center;">
                <div style="font-size:11px; color:#166534; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Total Recycled</div>
                <div style="font-size:26px; font-weight:700; color:#14532d; margin-top:6px;">${totalRecycled.toFixed(1)} kg</div>
              </div>
            </div>

            <div style="margin-bottom:20px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <div style="font-size:15px; font-weight:600; color:#1a1a1a;">Recycling Records</div>
                <div style="font-size:12px; color:#6b7280;">${userRecords.length} record${userRecords.length === 1 ? '' : 's'}</div>
              </div>
              <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
                <thead>
                  <tr style="background:#f9fafb; border-bottom:2px solid #e5e7eb;">
                    <th style="padding:10px 12px; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:center; width:40px;">#</th>
                    <th style="padding:10px 12px; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Date</th>
                    <th style="padding:10px 12px; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Waste Type</th>
                    <th style="padding:10px 12px; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Weight</th>
                    <th style="padding:10px 12px; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Points</th>
                    <th style="padding:10px 12px; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHTML}
                </tbody>
              </table>
            </div>

            <div style="text-align:center; font-size:11px; color:#9ca3af; margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb;">
              This report was generated by the EcoWaste Management System<br/>
              Barangay Banicain — Smart Community Recyclable Waste Management
            </div>
          </div>
        </div>
      `

      document.body.appendChild(container)

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

      document.body.removeChild(container)

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      const pageHeight = pdf.internal.pageSize.getHeight()
      let heightLeft = pdfHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save(
        `${selectedUser.name.replace(/\s+/g, '_')}_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      )
    } catch (error) {
      console.error('PDF error:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const totalPoints = userData.reduce((sum, u) => sum + (u.points || 0), 0)
  const totalRecycling = userData.reduce((sum, u) => sum + (u.total_recycled_kg || 0), 0)
  const activeUsers = userData.filter(u => u.status === 'Active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading users...</p>
        </div>
      </div>
    )
  }

  // User Detail View
  if (viewingUser) {
    const totalRecycled = userRecords.reduce((sum, r) => sum + (r.weight_kg || 0), 0)
    const totalPointsEarned = userRecords.reduce((sum, r) => sum + (r.points_earned || 0), 0)

    return (
      <div className="reports-detail-container">
        <div className="reports-detail-wrapper">
          {/* Back Button and Actions */}
          <div className="reports-detail-actions">
            <button
              onClick={handleBackToList}
              className="reports-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Users</span>
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={openEditModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#ffffff',
                  color: '#3b82f6',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Edit className="w-4 h-4" />
                Edit User
              </button>
              <button
                onClick={openDeleteModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#ffffff',
                  color: '#ef4444',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </button>
              <button
                onClick={generateUserPDF}
                disabled={isGenerating}
                className="reports-download-btn"
              >
                {isGenerating ? (
                  <>
                    <span className="reports-spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* User Profile Card */}
          <div ref={userReportRef} className="reports-profile-card">
            <div className="reports-profile-header">
              <h2 className="reports-profile-title">User Profile</h2>
            </div>
            
            <div className="reports-profile-body">
              <div className="reports-profile-content">
                <div className="reports-profile-avatar">
                  {viewingUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="reports-profile-info">
                  <h3 className="reports-profile-name">{viewingUser.name}</h3>
                  <div className="reports-profile-grid">
                    <div className="reports-profile-item">
                      <Mail className="w-4 h-4" />
                      <span>{viewingUser.email}</span>
                    </div>
                    <div className="reports-profile-item">
                      <Phone className="w-4 h-4" />
                      <span>{viewingUser.phone || 'N/A'}</span>
                    </div>
                    <div className="reports-profile-item">
                      <MapPin className="w-4 h-4" />
                      <span>{viewingUser.barangay || 'N/A'}</span>
                    </div>
                    <div className="reports-profile-item">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {viewingUser.joinDate || 'N/A'}</span>
                    </div>
                    <div className="reports-profile-item">
                      <Star className="w-4 h-4" />
                      <span>{viewingUser.points || 0} points</span>
                    </div>
                    <div className="reports-profile-item">
                      <Package className="w-4 h-4" />
                      <span>{viewingUser.recycling || '0 kg'} recycled</span>
                    </div>
                  </div>
                </div>
                <div className="reports-profile-status">
                  <span className={`reports-status-badge ${viewingUser.status === 'Active' ? 'active' : 'inactive'}`}>
                    {viewingUser.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="reports-stats-grid">
            <div className="reports-stat-box blue">
              <p className="reports-stat-label">Total Records</p>
              <p className="reports-stat-number">{userRecords.length}</p>
            </div>
            <div className="reports-stat-box yellow">
              <p className="reports-stat-label">Total Points Earned</p>
              <p className="reports-stat-number">{totalPointsEarned}</p>
            </div>
            <div className="reports-stat-box green">
              <p className="reports-stat-label">Total Recycled</p>
              <p className="reports-stat-number">{totalRecycled.toFixed(1)} kg</p>
            </div>
          </div>

          {/* Recycling Records */}
          <div className="reports-records-card">
            <div className="reports-records-header">
              <h3 className="reports-records-title">
                <Clock className="w-4 h-4" />
                Recycling Records
                <span className="reports-records-count">
                  {userRecords.length} record{userRecords.length > 1 ? 's' : ''}
                </span>
              </h3>
            </div>
            <div className="reports-records-table-wrapper">
              {userRecords.length > 0 ? (
                <table className="reports-records-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Waste Type</th>
                      <th className="text-right">Weight</th>
                      <th className="text-right">Points</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRecords.map((record, index) => (
                      <tr key={record.id || index}>
                        <td>{index + 1}</td>
                        <td>
                          {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>{record.waste_type || 'N/A'}</td>
                        <td className="text-right">{record.weight_kg || 0} kg</td>
                        <td className="text-right font-semibold text-yellow-600">{record.points_earned || 0}</td>
                        <td className="text-center">
                          <span className="reports-status-badge completed">
                            {record.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="reports-empty-state">
                  <Package className="w-12 h-12" />
                  <p>No recycling records found for this user.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== EDIT MODAL ===== */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
              <div className="modal-header">
                <div className="modal-header-left">
                  <div className="modal-header-icon">
                    <Edit />
                  </div>
                  <h2 className="modal-title">Edit User</h2>
                </div>
                <button onClick={() => setShowEditModal(false)} className="modal-close-btn">
                  <X />
                </button>
              </div>

              {editError && (
                <div className="modal-error">
                  <AlertCircle />
                  <span>{editError}</span>
                </div>
              )}

              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="form-required">*</span></label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email <span className="form-required">*</span></label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="form-input"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Barangay</label>
                  <input
                    type="text"
                    value={editForm.barangay}
                    onChange={(e) => setEditForm({ ...editForm, barangay: e.target.value })}
                    className="form-input"
                    placeholder="Barangay"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Total Points</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.totalPoints}
                      onChange={(e) => setEditForm({ ...editForm, totalPoints: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Recycled (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editForm.totalRecycled}
                      onChange={(e) => setEditForm({ ...editForm, totalRecycled: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={editSaving}
                    className="btn-submit"
                  >
                    {editSaving ? (
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
                    onClick={() => setShowEditModal(false)}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DELETE MODAL ===== */}
        {showDeleteModal && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <div className="delete-modal-icon">
                  <Trash2 />
                </div>
                <h2 className="delete-modal-title">Delete User</h2>
              </div>

              {deleteError && (
                <div className="modal-error">
                  <AlertCircle />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="delete-modal-message">
                Are you sure you want to delete <strong>{viewingUser.name}</strong>?
              </p>
              <p className="delete-modal-warning">
                This will permanently remove the user account and cannot be undone.
              </p>

              <div className="delete-modal-actions">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteDeleting}
                  className="btn-delete"
                >
                  {deleteDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete User
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-cancel"
                  disabled={deleteDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TOAST ===== */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 999999,
              backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
              borderLeft: `4px solid ${toast.type === 'success' ? '#22c55e' : '#dc2626'}`,
              borderRadius: '12px',
              padding: '14px 20px',
              maxWidth: '380px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />
            ) : (
              <AlertCircle style={{ width: '20px', height: '20px', color: '#dc2626' }} />
            )}
            <span
              style={{
                fontSize: '14px',
                color: toast.type === 'success' ? '#166534' : '#dc2626',
                fontWeight: 500
              }}
            >
              {toast.message}
            </span>
          </div>
        )}
      </div>
    )
  }

  // List View
  return (
    <div className="reports-container">
      <div className="reports-wrapper">
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Users</h1>
            <p className="reports-subtitle">Click on any user to view their records</p>
          </div>
        </div>

        <div className="reports-stats-cards">
          <div className="reports-stat-card">
            <div className="reports-stat-card-content">
              <span className="reports-stat-card-label">Total Users</span>
              <div className="reports-stat-card-icon blue">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="reports-stat-card-value">{userData.length}</p>
          </div>
          <div className="reports-stat-card">
            <div className="reports-stat-card-content">
              <span className="reports-stat-card-label">Total Points</span>
              <div className="reports-stat-card-icon yellow">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="reports-stat-card-value">{totalPoints.toLocaleString()}</p>
          </div>
          <div className="reports-stat-card">
            <div className="reports-stat-card-content">
              <span className="reports-stat-card-label">Recycled Total</span>
              <div className="reports-stat-card-icon green">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="reports-stat-card-value">{totalRecycling.toFixed(1)} kg</p>
          </div>
          <div className="reports-stat-card">
            <div className="reports-stat-card-content">
              <span className="reports-stat-card-label">Active Users</span>
              <div className="reports-stat-card-icon purple">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="reports-stat-card-value">{activeUsers}</p>
          </div>
        </div>

        <div className="reports-search-wrapper">
          <Search className="reports-search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="reports-search-input"
          />
        </div>

        <div className="reports-table-container">
          <div className="reports-table-header">
            <div className="reports-table-header-content">
              <div className="reports-table-header-icon">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="reports-table-title">Users List</h2>
                <p className="reports-table-subtitle">Click on a user to view their records</p>
              </div>
            </div>
          </div>

          <div className="reports-filter-bar">
            <div className="reports-filter-content">
              <span className="reports-filter-label">Filter by:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="reports-filter-select"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-gray-800">
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('age')} className="cursor-pointer hover:text-gray-800">
                    <div className="flex items-center gap-1">
                      Age
                      {sortField === 'age' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th onClick={() => handleSort('points')} className="cursor-pointer hover:text-gray-800 text-right">
                    <div className="flex items-center justify-end gap-1">
                      Points
                      {sortField === 'points' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th>Recycled</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className="reports-table-row"
                    onClick={() => handleUserClick(user)}
                  >
                    <td className="text-center text-sm text-gray-500">{index + 1}</td>
                    <td>
                      <span className="font-medium text-gray-800">{user.name}</span>
                    </td>
                    <td className="text-sm text-gray-600">{user.age || 'N/A'}</td>
                    <td className="text-sm text-gray-600 truncate max-w-[150px]">{user.email}</td>
                    <td className="text-sm text-gray-600">{user.phone || 'N/A'}</td>
                    <td className="text-right">
                      <span className="font-bold text-yellow-600">{(user.points || 0).toLocaleString()}</span>
                    </td>
                    <td className="text-sm text-gray-600">{user.recycling || '0 kg'}</td>
                    <td className="text-center">
                      <span className={`reports-status-badge ${user.status === 'Active' ? 'active' : 'inactive'}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(user)
                        }}
                        className="reports-view-btn"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="reports-table-footer">
            <span>Showing {filteredUsers.length} of {userData.length} users</span>
            <span>Click on a user to view their records</span>
          </div>
        </div>
      </div>
    </div>
  )
}