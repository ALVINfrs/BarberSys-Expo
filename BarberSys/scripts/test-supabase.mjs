import { createClient } from '@supabase/supabase-js';

const url = 'https://qsfocxoqnkekmndcswlu.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZm9jeG9xbmtla21uZGNzd2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzk2MDMsImV4cCI6MjEwNDk1NTYwM30.a4iZtZO-E_rlKzSiH3IUXOo6_dw3tiilOxlczW3pvUI';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Supabase Auth error:', error.message);
    process.exit(1);
  } else {
    console.log('Supabase connected successfully! Auth session:', data);
    process.exit(0);
  }
}

test();
