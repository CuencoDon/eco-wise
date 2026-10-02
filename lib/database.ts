// lib/database.ts
import { supabase } from './supabaseClient'

export async function getDashboardStats() {
  const { data, error } = await supabase
    .from('dashboard_stats')
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function getRecentRecycling(limit = 5) {
  const { data, error } = await supabase
    .from('recent_recycling')
    .select('*')
    .limit(limit)
  
  if (error) throw error
  return data
}

export async function getTodayStats() {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('recycling_records')
    .select('*')
    .gte('created_at', today)
    .lte('created_at', today + 'T23:59:59')
  
  if (error) throw error
  return data
}