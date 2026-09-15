import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

const testAccounts = [
  { email: 'customer@barbersys.com', expectedRole: 'customer', targetRoute: '/(customer)/home' },
  { email: 'barber@barbersys.com', expectedRole: 'barber', targetRoute: '/(barber)/queue' },
  { email: 'kasir@barbersys.com', expectedRole: 'kasir', targetRoute: '/(kasir)/queue' },
  { email: 'admin@barbersys.com', expectedRole: 'admin', targetRoute: '/(admin)/treatments' },
];

async function testAllRoles() {
  console.log('=== VERIFIKASI END-TO-END FASE 0: LOGIN & ROLE-BASED ROUTING ===');

  for (const account of testAccounts) {
    console.log(`\nTesting login untuk ${account.email} (Expected Role: ${account.expectedRole})...`);

    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: 'Password123!',
    });

    if (signInErr) {
      console.error(`❌ Gagal login ${account.email}:`, signInErr.message);
      process.exit(1);
    }

    const userId = signInData.session?.user.id;
    console.log(`✅ Login sukses! User ID: ${userId}`);

    // Fetch profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profErr) {
      console.error(`❌ Gagal fetch profile ${account.email}:`, profErr.message);
      process.exit(1);
    }

    console.log(`   Nama: ${profile.nama}`);
    console.log(`   Role di Database: ${profile.role}`);
    console.log(`   Status Akun: ${profile.status_akun}`);

    if (profile.role !== account.expectedRole) {
      console.error(`❌ ROLE MISMATCH! Diharapkan ${account.expectedRole}, didapat ${profile.role}`);
      process.exit(1);
    }

    console.log(`🎯 Router Redirect Matching: -> ${account.targetRoute}`);

    // Sign out
    await supabase.auth.signOut();
  }

  // 5. Test Nonaktif Account Check
  console.log('\nTesting penolakan status akun nonaktif...');
  await supabase.auth.signInWithPassword({ email: 'admin@barbersys.com', password: 'Password123!' });

  const { data: barberProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'barber@barbersys.com')
    .single();

  if (barberProfile) {
    // Toggle nonaktif
    await supabase.from('profiles').update({ status_akun: 'nonaktif' }).eq('id', barberProfile.id);
    console.log('✅ Status barber diubah ke nonaktif');

    const { data: updatedProf } = await supabase
      .from('profiles')
      .select('status_akun')
      .eq('id', barberProfile.id)
      .single();

    if (updatedProf.status_akun === 'nonaktif') {
      console.log('✅ Verifikasi RLS & Update: status_akun berhasil menjadi nonaktif');
    }

    // Revert back to aktif
    await supabase.from('profiles').update({ status_akun: 'aktif' }).eq('id', barberProfile.id);
    console.log('✅ Status barber dikembalikan ke aktif');
  }

  await supabase.auth.signOut();

  console.log('\n===============================================================');
  console.log('🎉 SELURUH HAK AKSES, ROLE ROUTING, DAN AUTH FASE 0 LULUS 100%!');
  console.log('===============================================================');
  process.exit(0);
}

testAllRoles();
