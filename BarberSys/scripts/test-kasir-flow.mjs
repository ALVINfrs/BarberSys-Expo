import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testKasirFlow() {
  console.log('=== VERIFIKASI F1.5 - F1.7: ALUR KASIR (K1, K2, K3) ===');

  // 1. Sign in as kasir
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'kasir@barbersys.com',
    password: 'Password123!',
  });

  if (err) {
    console.error('❌ Login kasir failed:', err.message);
    process.exit(1);
  }

  const kasirId = signInData.session?.user.id;

  // 2. Fetch pending queue (F1.5)
  const { data: pendingList } = await supabase.from('queue').select('*').eq('status', 'menunggu');
  console.log(`✅ F1.5 - Antrian 'menunggu' ditemukan: ${pendingList?.length} item`);

  if (!pendingList || pendingList.length === 0) {
    console.error('❌ Tidak ada antrian menunggu untuk di-test');
    process.exit(1);
  }

  const targetQueue = pendingList[0];

  // 3. Get barber ID
  const { data: barber } = await supabase.from('profiles').select('id').eq('role', 'barber').single();

  // 4. Call queue & assign barber (F1.6)
  const { data: calledData, error: callErr } = await supabase
    .from('queue')
    .update({
      status: 'dipanggil',
      barber_id: barber.id,
      kasir_id: kasirId,
      called_at: new Date().toISOString(),
    })
    .eq('id', targetQueue.id)
    .select()
    .single();

  if (callErr) {
    console.error('❌ F1.6 - Panggil antrian failed:', callErr.message);
    process.exit(1);
  }

  console.log(`✅ F1.6 - Antrian No. ${calledData.nomor_antrian} berhasil dipanggil! Status: ${calledData.status}`);

  // Simulasi barber merubah status jadi 'selesai'
  await supabase.from('queue').update({ status: 'selesai' }).eq('id', targetQueue.id);

  // 5. Kasir proses pembayaran 'lunas' (F1.7)
  const { data: paidData, error: payErr } = await supabase
    .from('queue')
    .update({
      status: 'lunas',
      metode_bayar: 'qris',
      kasir_id: kasirId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', targetQueue.id)
    .select()
    .single();

  if (payErr) {
    console.error('❌ F1.7 - Proses bayar failed:', payErr.message);
    process.exit(1);
  }

  console.log(`✅ F1.7 - Transaksi berhasil dilunasi! Status: ${paidData.status}, Metode: ${paidData.metode_bayar}`);

  console.log('🎉 F1.5, F1.6, F1.7 (ALUR KASIR PANGGIL & BAYAR) LULUS 100%!');
  process.exit(0);
}

testKasirFlow();
