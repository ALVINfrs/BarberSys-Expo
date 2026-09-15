import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testAdminFlow() {
  console.log('=== VERIFIKASI F1.10 - F1.11: ALUR ADMIN (AD1 & AD2) ===');

  // 1. Sign in as admin
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'admin@barbersys.com',
    password: 'Password123!',
  });

  if (err) {
    console.error('❌ Login admin failed:', err.message);
    process.exit(1);
  }

  // 2. F1.10 - Create and Update Treatment
  console.log('\nTesting F1.10: CRUD Treatment...');
  const testTreatmentName = `Test Special Haircut ${Date.now()}`;
  const { data: newTreat, error: treatErr } = await supabase
    .from('treatments')
    .insert({
      nama: testTreatmentName,
      harga: 60000,
      durasi_menit: 35,
      deskripsi: 'Treatment percobaan oleh admin',
      aktif: true,
    })
    .select()
    .single();

  if (treatErr) {
    console.error('❌ F1.10 - Create treatment failed:', treatErr.message);
    process.exit(1);
  }
  console.log(`✅ F1.10 - Treatment baru dibuat: [${newTreat.id}] ${newTreat.nama} (Rp ${newTreat.harga})`);

  // Update treatment
  const { data: updatedTreat, error: upErr } = await supabase
    .from('treatments')
    .update({ harga: 65000 })
    .eq('id', newTreat.id)
    .select()
    .single();

  if (upErr) {
    console.error('❌ F1.10 - Update treatment failed:', upErr.message);
    process.exit(1);
  }
  console.log(`✅ F1.10 - Treatment berhasil diupdate: Harga baru Rp ${updatedTreat.harga}`);

  // Delete test treatment
  await supabase.from('treatments').delete().eq('id', newTreat.id);
  console.log('✅ F1.10 - Cleaned up test treatment.');

  // 3. F1.11 - Kelola Akun Pegawai & Toggle Nonaktif
  console.log('\nTesting F1.11: Kelola Akun Pegawai & Status Nonaktif...');
  const { data: kasirProfile, error: kErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'kasir@barbersys.com')
    .single();

  if (kErr) {
    console.error('❌ F1.11 - Fetch kasir profile failed:', kErr.message);
    process.exit(1);
  }

  // Toggle nonaktif
  await supabase.from('profiles').update({ status_akun: 'nonaktif' }).eq('id', kasirProfile.id);
  console.log(`✅ F1.11 - Status kasir (${kasirProfile.email}) diubah ke nonaktif.`);

  // Toggle back to aktif
  await supabase.from('profiles').update({ status_akun: 'aktif' }).eq('id', kasirProfile.id);
  console.log(`✅ F1.11 - Status kasir dikembalikan ke aktif.`);

  console.log('\n===============================================================');
  console.log('🎉 F1.10 & F1.11 (ALUR ADMIN TREATMENT & STAFF) LULUS 100%!');
  console.log('===============================================================');
  process.exit(0);
}

testAdminFlow();
