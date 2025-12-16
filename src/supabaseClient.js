import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pytedcjlbulvztundtyh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dGVkY2psYnVsdnp0dW5kdHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDE5NTUsImV4cCI6MjA4MTM3Nzk1NX0.AhZZf8hqWZJRg4QNWVUiOPQa-8XSeeCD1jLnnOWh4Dw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)