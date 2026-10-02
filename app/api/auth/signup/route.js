// app/api/auth/signup/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, fullName, role } = body

    // Validate inputs
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      )
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      )
    }

    // Create user in Auth using Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: role,
        full_name: fullName
      }
    })

    if (error) {
      console.error('Admin API error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    if (!data || !data.user) {
      return NextResponse.json(
        { error: 'Failed to create user in Auth' },
        { status: 400 }
      )
    }

    // Insert user into users table using admin client (bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email,
        full_name: fullName,
        role: role
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to add user to database: ' + insertError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      message: 'Account created successfully!'
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}