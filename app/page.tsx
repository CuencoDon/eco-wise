'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mail, 
  Lock, 
  User, 
  Shield, 
  Users, 
  LogIn, 
  UserPlus, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  FileText,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Data privacy consent
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. Please check your credentials.')
        }
        throw signInError
      }

      if (!data.user) {
        throw new Error('No user returned')
      }

      let userRole = data.user.user_metadata?.role || 'user'
      let userStatus = 'Active'
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, status')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        userRole = data.user.user_metadata?.role || 'user'
        
        await supabase
          .from('users')
          .insert({
            email: email,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0] || 'User',
            role: userRole
          })
          .select()
      } else {
        userRole = userData.role || 'user'
        userStatus = userData.status || 'Active'
      }

      if (userStatus === 'Inactive') {
        throw new Error('Your account is inactive. Please contact support.')
      }

      if (role === 'admin' && userRole !== 'admin') {
        throw new Error(`You are not authorized to login as Admin. This account has "${userRole}" role.`)
      }

      if (role === 'user' && userRole !== 'user') {
        throw new Error(`You are not authorized to login as User. This account has "${userRole}" role.`)
      }

      if (userRole === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/user/dashboard')
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address (must contain @ and .)')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!fullName.trim()) {
      setError('Please enter your full name')
      setLoading(false)
      return
    }

    // Enforce data privacy consent
    if (!agreedToPrivacy) {
      setError('You must agree to the Data Privacy Policy to create an account.')
      setLoading(false)
      return
    }

    const cleanEmail = email.trim().toLowerCase()

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          role: role,
          agreedToPrivacy: true,
          privacyAgreedAt: new Date().toISOString()
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        await response.text()
        throw new Error('Server error. Please try again.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      setSuccess('Account created successfully! Logging in...')

      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      })

      if (!loginError && loginData?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', cleanEmail)
          .single()
          
        const userRole = userData?.role || role
        if (userRole === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/user/dashboard')
        }
      } else {
        setSuccess('Account created successfully! Please login.')
        setTimeout(() => {
          setIsLogin(true)
          setEmail(cleanEmail)
          setPassword(password)
          setSuccess('')
        }, 2000)
        setLoading(false)
      }

    } catch (err: any) {
      setError(err.message || 'Unable to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setSuccess('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFullName('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setAgreedToPrivacy(false)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className={`login-card ${role === 'admin' ? 'admin-mode' : ''}`}>
          {/* Brand Section - TWO LOGOS side by side */}
          <div className="brand-section">
            <div className="logo-pair">
              <div className="logo-icon-frame">
                <div className="logo-icon-ring">
                  <div className="logo-icon">
                    <img
                      src="/banicain.png"
                      alt="banicain"
                    />
                  </div>
                </div>
              </div>
              <div className="logo-icon-frame">
                <div className="logo-icon-ring">
                  <div className="logo-icon">
                    <img
                      src="/ecowaste.png"
                      alt="ecowaste"
                    />
                  </div>
                </div>
              </div>
            </div>
            <h1 className="brand-title">EcoWaste</h1>
            <p className="brand-subtitle">Sustainable waste management</p>
          </div>

          {/* Role Tabs */}
          <div className="role-tabs">
            <button
              type="button"
              onClick={() => {
                setRole('user')
                setError('')
              }}
              className={`role-tab ${role === 'user' ? 'active' : ''}`}
            >
              <Users className="w-3.5 h-3.5" />
              User
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('admin')
                setError('')
              }}
              className={`role-tab ${role === 'admin' ? 'active' : ''}`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          <div className="login-scrollable">
            {isLogin ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError('')
                      }}
                      placeholder="Enter your email"
                      className="form-input"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Enter your password"
                      className="form-input password-input"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="success-message">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {success}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {role === 'admin' ? 'Admin Login' : 'User Login'}
                    </>
                  )}
                </button>

                <div className="signup-section">
                  <p className="signup-text">
                    Don't have an account?{' '}
                    <button type="button" className="signup-link" onClick={toggleMode}>
                      Sign Up
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <User className="input-icon" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value)
                        setError('')
                      }}
                      placeholder="Enter your full name"
                      className="form-input"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError('')
                      }}
                      placeholder="Enter your email"
                      className="form-input"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Min 6 characters"
                      className="form-input password-input"
                      required
                      disabled={loading}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle-btn"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        setError('')
                      }}
                      placeholder="Confirm your password"
                      className="form-input password-input"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="password-toggle-btn"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Data Privacy Consent Checkbox */}
                <div className="form-group">
                  <label
                    className="privacy-consent-label"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: agreedToPrivacy ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${agreedToPrivacy ? '#86efac' : '#e5e7eb'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreedToPrivacy}
                      onChange={(e) => {
                        setAgreedToPrivacy(e.target.checked)
                        setError('')
                      }}
                      disabled={loading}
                      style={{
                        marginTop: '2px',
                        width: '18px',
                        height: '18px',
                        accentColor: '#16a34a',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.5,
                        color: '#374151'
                      }}
                    >
                      I have read and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowPrivacyModal(true)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#16a34a',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          font: 'inherit'
                        }}
                      >
                        Data Privacy Policy
                      </button>{' '}
                      and consent to the collection, use, and processing of my personal
                      information for the EcoWaste program.
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="error-message">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="success-message">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {success}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="login-button"
                  disabled={loading || !agreedToPrivacy}
                  style={{
                    opacity: !agreedToPrivacy ? 0.5 : 1,
                    cursor: !agreedToPrivacy ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </button>

                <div className="signup-section">
                  <p className="signup-text">
                    Already have an account?{' '}
                    <button type="button" className="signup-link" onClick={toggleMode}>
                      Login
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Data Privacy Modal */}
      {showPrivacyModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowPrivacyModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '16px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderBottom: '1px solid #f0f3f1',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(34, 197, 94, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                    flexShrink: 0
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <h2
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    margin: 0
                  }}
                >
                  Data Privacy Policy
                </h2>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#6b7280',
                  flexShrink: 0
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div
              style={{
                padding: '20px',
                overflowY: 'auto',
                fontSize: '13px',
                lineHeight: 1.7,
                color: '#374151'
              }}
            >
              <p style={{ marginTop: 0 }}>
                <strong>EcoWaste — Barangay Banicain</strong> is committed to
                protecting your personal data in compliance with the{' '}
                <strong>Data Privacy Act of 2012 (RA 10173)</strong> of the Philippines.
              </p>

              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '18px' }}>
                1. Information We Collect
              </h3>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Full name and email address</li>
                <li>Recycling activity (weight, type of waste, points earned)</li>
                <li>Photos uploaded as proof of recycling</li>
                <li>Account credentials (password is encrypted)</li>
              </ul>

              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '18px' }}>
                2. How We Use Your Information
              </h3>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>To create and manage your EcoWaste account</li>
                <li>To track and credit your recycling points</li>
                <li>To process redemptions of rewards</li>
                <li>To generate anonymous reports for the barangay</li>
              </ul>

              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '18px' }}>
                3. Data Sharing
              </h3>
              <p style={{ margin: '8px 0' }}>
                Your personal data will not be sold or shared with third parties.
                Information is only accessible to authorized barangay personnel
                for the purposes stated above.
              </p>

              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '18px' }}>
                4. Your Rights
              </h3>
              <p style={{ margin: '8px 0' }}>
                Under the Data Privacy Act, you have the right to:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Be informed about how your data is processed</li>
                <li>Access and correct your personal information</li>
                <li>Object to or withdraw consent</li>
                <li>Request deletion of your data</li>
                <li>File a complaint with the National Privacy Commission</li>
              </ul>

              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '18px' }}>
                5. Data Retention
              </h3>
              <p style={{ margin: '8px 0' }}>
                Your data is retained for the duration of your account and as
                required by barangay records policies. You may request deletion
                at any time by contacting the barangay office.
              </p>

              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginTop: '18px' }}>
                6. Contact
              </h3>
              <p style={{ margin: '8px 0 0 0' }}>
                For questions or concerns about your data, contact the EcoWaste
                team at <strong>Barangay Banicain Hall</strong>.
              </p>

              <p
                style={{
                  marginTop: '20px',
                  padding: '12px 14px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#166534'
                }}
              >
                By checking the consent box during signup, you acknowledge that
                you have read and understood this Data Privacy Policy.
              </p>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #f0f3f1',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                flexShrink: 0,
                background: '#fbfdfb'
              }}
            >
              <button
                onClick={() => {
                  setAgreedToPrivacy(true)
                  setShowPrivacyModal(false)
                  setError('')
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <ShieldCheck size={18} />
                I Agree to the Privacy Policy
              </button>
              <button
                onClick={() => setShowPrivacyModal(false)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}