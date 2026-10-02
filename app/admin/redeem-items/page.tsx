'use client'
import { useState, useEffect } from 'react'
import { 
  Gift, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Package,
  Coffee,
  ShoppingBag,
  Star,
  Heart,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Award,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Leaf,
  Wallet,
  ShoppingCart,
  AlertTriangle,
  Droplet,
  Utensils
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface RedeemItem {
  id: string
  name: string
  description: string
  points_required: number
  quantity: number
  is_active: boolean
  created_at: string
  image_url?: string
}

export default function AdminRedeemItemsPage() {
  const [items, setItems] = useState<RedeemItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RedeemItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_required: '',
    quantity: '',
    is_active: true
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<RedeemItem | null>(null)

  // Responsive state
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth
      if (w <= 640) setScreenSize('mobile')
      else if (w <= 1024) setScreenSize('tablet')
      else setScreenSize('desktop')
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('redeem_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
      setError('Failed to load redeem items')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getItemIcon = (name: string) => {
    const icons: { [key: string]: any } = {
      'Coffee': Coffee,
      'Shopping Bag': ShoppingBag,
      'Gift Card': Gift,
      'Package': Package,
      'Star': Star,
      'Heart': Heart,
      'Plant': Leaf,
      'Reusable Bottle': Wallet,
      'T-Shirt': ShoppingCart,
      'Canned Food': Package,
      'miniral water': Droplet,
      'rice': Utensils
    }
    return icons[name] || Gift
  }

  const filteredItems = items
    .filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField as keyof RedeemItem]
      const bVal = b[sortField as keyof RedeemItem]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc' ? (aVal ? 1 : -1) - (bVal ? 1 : -1) : (bVal ? 1 : -1) - (aVal ? 1 : -1)
      }
      return 0
    })

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      description: '',
      points_required: '',
      quantity: '',
      is_active: true
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (item: RedeemItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      description: item.description || '',
      points_required: item.points_required ? item.points_required.toString() : '',
      quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity.toString() : '0',
      is_active: item.is_active !== undefined ? item.is_active : true
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const points = parseInt(formData.points_required)
      const quantity = parseInt(formData.quantity)

      if (!formData.name.trim()) {
        throw new Error('Item name is required')
      }
      if (!points || points <= 0) {
        throw new Error('Points required must be greater than 0')
      }
      if (isNaN(quantity) || quantity < 0) {
        throw new Error('Quantity must be 0 or greater')
      }

      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        points_required: points,
        quantity: quantity,
        is_active: formData.is_active
      }

      if (editingItem) {
        const { error } = await supabase
          .from('redeem_items')
          .update(itemData)
          .eq('id', editingItem.id)

        if (error) throw error
        setSuccess('Item updated successfully!')
      } else {
        const { error } = await supabase
          .from('redeem_items')
          .insert([itemData])

        if (error) throw error
        setSuccess('Item created successfully!')
      }

      await fetchItems()
      setShowModal(false)
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    try {
      const { error } = await supabase
        .from('redeem_items')
        .delete()
        .eq('id', itemToDelete.id)

      if (error) throw error

      await fetchItems()
      setShowDeleteModal(false)
      setItemToDelete(null)
      setSuccess('Item deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to delete item')
    }
  }

  const toggleStatus = async (item: RedeemItem) => {
    try {
      const { error } = await supabase
        .from('redeem_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)

      if (error) throw error
      await fetchItems()
    } catch (error: any) {
      setError(error.message || 'Failed to update status')
    }
  }

  const totalItems = items.length
  const activeItems = items.filter(item => item.is_active).length
  const totalPoints = items.reduce((sum, item) => sum + (item.points_required || 0), 0)
  const lowStockItems = items.filter(item => (item.quantity || 0) > 0 && (item.quantity || 0) <= 10).length
  const outOfStockItems = items.filter(item => (item.quantity || 0) === 0).length

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) {
      return { 
        label: 'Out of Stock', 
        className: 'out-of-stock',
        icon: X,
        bgColor: '#fee2e2',
        textColor: '#991b1b'
      }
    } else if (quantity <= 10) {
      return { 
        label: 'Running Out', 
        className: 'running-out',
        icon: AlertTriangle,
        bgColor: '#fef3c7',
        textColor: '#92400e'
      }
    } else {
      return { 
        label: 'In Stock', 
        className: 'in-stock',
        icon: CheckCircle,
        bgColor: '#dcfce7',
        textColor: '#166534'
      }
    }
  }

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

  const isMobile = screenSize === 'mobile'
  const isTablet = screenSize === 'tablet'

  return (
    <div
      className="redeem-admin-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <div
        className="redeem-admin-wrapper"
        style={{ minWidth: 0, width: '100%' }}
      >
        {/* Success/Error Messages */}
        {success && (
          <div className="redeem-success-message">
            <CheckCircle className="w-5 h-5" style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="redeem-error-message">
            <AlertCircle className="w-5 h-5" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Header — stacks on mobile */}
        <div
          className="redeem-header-section"
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            minWidth: 0
          }}
        >
          <div className="redeem-header-left" style={{ minWidth: 0 }}>
            <h1
              className="redeem-header-title"
              style={{
                fontSize: isMobile ? '20px' : '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                margin: 0
              }}
            >
              <Gift className="redeem-header-icon" style={{ flexShrink: 0 }} />
              Redeem Items
            </h1>
            <p
              className="redeem-header-subtitle"
              style={{ fontSize: isMobile ? '12px' : '14px', margin: 0 }}
            >
              Manage items available for point redemption
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="redeem-add-btn"
            style={{
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>

        {/* Stats Cards — 4 → 2 columns */}
        <div
          className="redeem-stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, minmax(0, 1fr))'
              : isTablet
              ? 'repeat(2, minmax(0, 1fr))'
              : 'repeat(4, minmax(0, 1fr))',
            gap: isMobile ? '8px' : '12px',
            width: '100%',
            minWidth: 0
          }}
        >
          <div className="redeem-stat-card" style={{ minWidth: 0 }}>
            <div className="redeem-stat-header" style={{ minWidth: 0 }}>
              <span
                className="redeem-stat-label"
                style={{ fontSize: isMobile ? '11px' : '13px', minWidth: 0 }}
              >
                Total Items
              </span>
              <div className="redeem-stat-icon blue" style={{ flexShrink: 0 }}>
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <p
              className="redeem-stat-value"
              style={{ fontSize: isMobile ? '20px' : '24px' }}
            >
              {totalItems}
            </p>
          </div>
          <div className="redeem-stat-card" style={{ minWidth: 0 }}>
            <div className="redeem-stat-header" style={{ minWidth: 0 }}>
              <span
                className="redeem-stat-label"
                style={{ fontSize: isMobile ? '11px' : '13px', minWidth: 0 }}
              >
                Active Items
              </span>
              <div className="redeem-stat-icon green" style={{ flexShrink: 0 }}>
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p
              className="redeem-stat-value"
              style={{ fontSize: isMobile ? '20px' : '24px' }}
            >
              {activeItems}
            </p>
          </div>
          <div className="redeem-stat-card" style={{ minWidth: 0 }}>
            <div className="redeem-stat-header" style={{ minWidth: 0 }}>
              <span
                className="redeem-stat-label"
                style={{ fontSize: isMobile ? '11px' : '13px', minWidth: 0 }}
              >
                Total Points
              </span>
              <div className="redeem-stat-icon yellow" style={{ flexShrink: 0 }}>
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p
              className="redeem-stat-value"
              style={{ fontSize: isMobile ? '20px' : '24px' }}
            >
              {totalPoints.toLocaleString()}
            </p>
          </div>
          <div className="redeem-stat-card" style={{ minWidth: 0 }}>
            <div className="redeem-stat-header" style={{ minWidth: 0 }}>
              <span
                className="redeem-stat-label"
                style={{ fontSize: isMobile ? '11px' : '13px', minWidth: 0 }}
              >
                Low Stock
              </span>
              <div className="redeem-stat-icon orange" style={{ flexShrink: 0 }}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p
              className="redeem-stat-value"
              style={{ fontSize: isMobile ? '20px' : '24px' }}
            >
              {lowStockItems + outOfStockItems}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="redeem-search-wrapper" style={{ width: '100%', minWidth: 0 }}>
          <Search className="redeem-search-icon" />
          <input
            type="text"
            placeholder={isMobile ? 'Search items...' : 'Search items by name or description...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="redeem-search-input"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Items Table — horizontal scroll on small screens */}
        <div
          className="redeem-table-container"
          style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}
        >
          <div
            className="redeem-table-wrapper"
            style={{
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <table
              className="redeem-table"
              style={{ minWidth: isMobile ? '720px' : '100%' }}
            >
              <thead>
                <tr>
                  <th className="redeem-table-th w-12 text-center">#</th>
                  <th onClick={() => handleSort('name')} className="redeem-table-th sortable">
                    <div className="redeem-sort-header">
                      Item Name
                      {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="redeem-table-th">Description</th>
                  <th onClick={() => handleSort('points_required')} className="redeem-table-th sortable text-right">
                    <div className="redeem-sort-header justify-end">
                      Points
                      {sortField === 'points_required' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th onClick={() => handleSort('quantity')} className="redeem-table-th sortable text-right">
                    <div className="redeem-sort-header justify-end">
                      Qty
                      {sortField === 'quantity' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="redeem-table-th text-center">Stock</th>
                  <th className="redeem-table-th text-center">Status</th>
                  <th className="redeem-table-th text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => {
                    const Icon = getItemIcon(item.name || '')
                    const stockStatus = getStockStatus(item.quantity || 0)
                    const StockIcon = stockStatus.icon
                    const isLowStock = (item.quantity || 0) > 0 && (item.quantity || 0) <= 10
                    const isOutOfStock = (item.quantity || 0) === 0
                    
                    return (
                      <tr key={item.id} className="redeem-table-tr">
                        <td className="redeem-table-td text-center">{index + 1}</td>
                        <td className="redeem-table-td">
                          <div className="redeem-item-cell">
                            <div className="redeem-item-icon" style={{ flexShrink: 0 }}>
                              <Icon />
                            </div>
                            <span className="redeem-item-name">{item.name}</span>
                            {isLowStock && (
                              <span className="redeem-low-stock-badge">Low Stock</span>
                            )}
                            {isOutOfStock && (
                              <span className="redeem-out-of-stock-badge">Out of Stock</span>
                            )}
                          </div>
                        </td>
                        <td className="redeem-table-td">
                          <span className="redeem-item-description">{item.description || '—'}</span>
                        </td>
                        <td className="redeem-table-td text-right">
                          <span className="redeem-points-value">{item.points_required}</span>
                        </td>
                        <td className="redeem-table-td text-right">
                          <span className={`redeem-quantity-value ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}>
                            {item.quantity}
                          </span>
                        </td>
                        <td className="redeem-table-td text-center">
                          <span 
                            className="redeem-stock-badge"
                            style={{
                              backgroundColor: stockStatus.bgColor,
                              color: stockStatus.textColor,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              border: '1px solid',
                              borderColor: stockStatus.bgColor,
                              minWidth: '100px',
                              justifyContent: 'center',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <StockIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                            {stockStatus.label}
                          </span>
                        </td>
                        <td className="redeem-table-td text-center">
                          <button
                            onClick={() => toggleStatus(item)}
                            className={`redeem-status-badge ${item.is_active ? 'active' : 'inactive'}`}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {item.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="redeem-table-td">
                          <div className="redeem-action-buttons">
                            <button
                              onClick={() => openEditModal(item)}
                              className="redeem-action-btn edit"
                              title="Edit"
                            >
                              <Edit />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(item)
                                setShowDeleteModal(true)
                              }}
                              className="redeem-action-btn delete"
                              title="Delete"
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="redeem-empty-state">
                        <Gift className="redeem-empty-icon" />
                        <p>No redeem items found</p>
                        <p className="redeem-empty-sub">Click "Add New Item" to create one</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div
            className="redeem-table-footer"
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: isMobile ? '12px' : '13px' }}>
              Showing {filteredItems.length} of {items.length} items
            </span>
            <button
              onClick={fetchItems}
              className="redeem-refresh-btn"
              style={{ justifyContent: 'center' }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="redeem-modal-overlay"
          onClick={() => setShowModal(false)}
          style={{ padding: isMobile ? '12px' : '16px' }}
        >
          <div
            className="redeem-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: isMobile ? '20px' : '24px'
            }}
          >
            <div className="redeem-modal-header">
              <div className="redeem-modal-header-left" style={{ minWidth: 0 }}>
                <div className="redeem-modal-icon-wrapper" style={{ flexShrink: 0 }}>
                  <Gift />
                </div>
                <h2
                  className="redeem-modal-title"
                  style={{ fontSize: isMobile ? '18px' : '20px' }}
                >
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="redeem-modal-close"
                style={{ flexShrink: 0 }}
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="redeem-modal-form">
              <div className="redeem-form-group">
                <label className="redeem-form-label">
                  Item Name <span className="redeem-required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter item name"
                  className="redeem-form-input"
                  required
                />
              </div>

              <div className="redeem-form-group">
                <label className="redeem-form-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter item description"
                  className="redeem-form-textarea"
                />
              </div>

              <div className="redeem-form-group">
                <label className="redeem-form-label">
                  Points Required <span className="redeem-required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.points_required}
                  onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                  placeholder="Enter points required"
                  min="1"
                  className="redeem-form-input"
                  required
                />
              </div>

              <div className="redeem-form-group">
                <label className="redeem-form-label">
                  Quantity <span className="redeem-required">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity available"
                  min="0"
                  className="redeem-form-input"
                  required
                />
                <p className="redeem-form-hint">Set to 0 for out of stock</p>
              </div>

              <div className="redeem-form-group">
                <label className="redeem-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="redeem-checkbox"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div
                className="redeem-modal-actions"
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: '10px'
                }}
              >
                <button type="submit" disabled={submitting} className="redeem-btn-submit">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 redeem-spinning" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingItem ? 'Update Item' : 'Create Item'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="redeem-btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div
          className="redeem-modal-overlay"
          onClick={() => setShowDeleteModal(false)}
          style={{ padding: isMobile ? '12px' : '16px' }}
        >
          <div
            className="redeem-delete-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: isMobile ? '20px' : '24px'
            }}
          >
            <div className="redeem-delete-header">
              <div className="redeem-delete-icon-wrapper" style={{ flexShrink: 0 }}>
                <Trash2 />
              </div>
              <h2
                className="redeem-delete-title"
                style={{ fontSize: isMobile ? '18px' : '20px' }}
              >
                Confirm Delete
              </h2>
            </div>
            <p className="redeem-delete-message">
              Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
            </p>
            <p className="redeem-delete-warning">This action cannot be undone.</p>
            <div
              className="redeem-delete-actions"
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: '10px'
              }}
            >
              <button onClick={handleDelete} className="redeem-btn-delete">
                <Trash2 className="w-4 h-4" />
                Delete Item
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setItemToDelete(null)
                }}
                className="redeem-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}