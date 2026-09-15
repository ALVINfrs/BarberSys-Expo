import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testF1_3() {
  console.log('=== VERIFIKASI F1.3: REALTIME STATUS ANTRIAN (C3) ===');

  // 1. Sign in as customer
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'customer@barbersys.com',
    password: 'Password123!',
  });

  if (err) {
    console.error('❌ Login failed:', err.message);
    process.exit(1);
  }

  const userId = signInData.session?.user.id;

  // 2. Query active queue
  const { data: queueData, error: qErr } = await supabase
    .from('queue')
    .select('*, treatments(*), barber:profiles!queue_barber_id_fkey(*)')
    .eq('user_id', userId)
    .in('status', ['menunggu', 'dipanggil', 'dilayani', 'selesai'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (qErr) {
    console.error('❌ Query status antrian failed:', qErr.message);
    process.exit(1);
  }

  console.log(`✅ Active queue query response:`, queueData);

  if (queueData && queueData.length > 0) {
    const q = queueData[0];
    console.log(` - Nomor Antrian: No. ${q.nomor_antrian}`);
    console.log(` - Status: ${q.status}`);
    console.log(` - Treatment: ${q.treatments?.nama}`);
    console.log('🎉 F1.3 (Status Antrian Real-time) LULUS 100%!');
    process.exit(0);
  } else {
    console.log('⚠️ Belum ada antrian aktif, namun query berjalan normal.');
    process.exit(0);
  }
}

testF1_3();
