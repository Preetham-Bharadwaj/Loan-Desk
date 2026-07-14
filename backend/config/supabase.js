const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const envFilesToTry = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', 'frontend', '.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envFilesToTry) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, override: false });
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAuthKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  supabaseKey;

if (!supabaseUrl || !supabaseKey || !supabaseAuthKey) {
  throw new Error('Missing SUPABASE_URL or Supabase API key in backend environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Keep credential verification separate from the service-role client so concurrent logins do not share Auth state.
const supabaseAuth = createClient(supabaseUrl, supabaseAuthKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

module.exports = { supabase, supabaseAuth };
