import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testF1_4() {
  console.log('=== VERIFIKASI F1.4: QUERY RIWAYAT TRANSAKSI (C4) ===');

  // 1. Sign in as customer
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'customer@barbersys.com',
    password: 'Password123!',
  });

  if (err) {
    console.error('❌ Login customer failed:', err.message);
    process.exit(1);
  }

  const userId = signInData.session?.user.id;

  // 2. Query history list with status 'lunas'
  const { data: historyList, error: hErr } = await supabase
    .from('queue')
    .select('*, treatments(*), barber:profiles!queue_barber_id_fkey(*)')
    .eq('user_id', userId)
    .eq('status', 'lunas')
    .order('completed_at', { ascending: false });

  if (hErr) {
    console.error('❌ Query history failed:', hErr.message);
    process.exit(1);
  }

  console.log(`✅ Query history berhasil! Ditemukan ${historyList.length} transaksi lunas.`);
  console.log('🎉 F1.4 (Lihat Riwayat Transaksi) LULUS 100%!');
  process.exit(0);
}

testF1_4();
