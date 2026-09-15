import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

async function testAuth() {
  console.log('--- Testing Auth & Role Profile Trigger ---');
  const testEmail = `user${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';

  console.log('1. Signing up test customer:', testEmail);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        nama: 'Test Customer',
        no_hp: '081299998888',
        role: 'customer',
      },
    },
  });

  if (signUpError) {
    console.error('SignUp Error:', signUpError.message);
    process.exit(1);
  }

  const userId = signUpData.user?.id;
  console.log('User created, ID:', userId);

  console.log('2. Fetching auto-created profile from public.profiles...');
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profError) {
    console.error('Profile Fetch Error:', profError.message);
    process.exit(1);
  }

  console.log('Profile retrieved:', profile);
  if (profile.role !== 'customer') {
    console.error('Role mismatch! Expected customer, got:', profile.role);
    process.exit(1);
  }
  if (profile.status_akun !== 'aktif') {
    console.error('Status mismatch! Expected aktif, got:', profile.status_akun);
    process.exit(1);
  }

  console.log('3. Testing sign in with password...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error('SignIn Error:', signInError.message);
    process.exit(1);
  }

  console.log('Sign in successful! Session active for:', signInData.session?.user.email);

  console.log('4. Testing treatments query while authenticated...');
  const { data: treatments, error: treatErr } = await supabase.from('treatments').select('*');
  if (treatErr) {
    console.error('Treatments query error:', treatErr.message);
    process.exit(1);
  }
  console.log('Treatments fetched:', treatments.length, 'items');

  console.log('--- ALL FASE 0 VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  process.exit(0);
}

testAuth();
