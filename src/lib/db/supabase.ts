import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder')

// Only create real client if configured, otherwise provide a mock
export const supabase = isPlaceholder
  ? ({} as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseKey)
