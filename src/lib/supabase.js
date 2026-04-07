import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wenhudcyvlhilpgazylg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlbmh1ZGN5dmxoaWxwZ2F6eWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTY0MTgsImV4cCI6MjA4NTA3MjQxOH0.Jdx993pFvb0JC87NaYhOQ6UR_7UIJBA1mkFQUeoK7bA'

export const supabase = createClient(supabaseUrl, supabaseKey)

export const ALLOWED_DOMAIN = '@triffair.com'

export function isAllowedEmail(email) {
  return email?.toLowerCase().endsWith(ALLOWED_DOMAIN.toLowerCase())
}
