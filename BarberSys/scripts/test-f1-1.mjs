import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testF1_1() {
  console.log('=== VERIFIKASI F1.1: QUERY DAFTAR TREATMENT ===');
  
  // Sign in as customer
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'customer@barbersys.com',
    password: 'Password123!',
  });
  
  if (err) {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
  }

  const { data: treatments, error: treatErr } = await supabase
    .from('treatments')
    .select('*')
    .eq('aktif', true)
    .order('harga', { ascending: true });

  if (treatErr) {
    console.error('❌ Query treatments failed:', treatErr.message);
    process.exit(1);
  }

  console.log(`✅ Berhasil mengambil ${treatments.length} treatment aktif:`);
  treatments.forEach((t) => {
    console.log(` - [${t.id}] ${t.nama} | Rp ${t.harga.toLocaleString('id-ID')} | ${t.durasi_menit} mnt`);
  });

  if (treatments.length >= 3) {
    console.log('🎉 F1.1 (Lihat Daftar Treatment & Harga) LULUS 100%!');
    process.exit(0);
  } else {
    console.error('❌ Jumlah treatment kurang dari seed awal');
    process.exit(1);
  }
}

testF1_1();
