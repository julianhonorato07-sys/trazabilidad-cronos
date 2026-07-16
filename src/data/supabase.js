import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const USE_SUPABASE = !!(url && key)

export const supabase = USE_SUPABASE ? createClient(url, key) : null
