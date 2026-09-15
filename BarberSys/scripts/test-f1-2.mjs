import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testF1_2() {
  console.log('=== VERIFIKASI F1.2: AMBIL ANTRIAN & AUTO NOMOR ANTRIAN ===');

  // 1. Login as customer
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'customer@barbersys.com',
    password: 'Password123!',
  });

  if (err) {
    console.error('❌ Login customer failed:', err.message);
    process.exit(1);
  }

  const userId = signInData.session?.user.id;

  // 2. Get first active treatment
  const { data: treatments } = await supabase.from('treatments').select('*').limit(1);
  const treatment = treatments[0];

  console.log(`Mengambil antrian untuk user ${userId} dengan treatment: ${treatment.nama}...`);

  // Clear existing active queue for customer to allow new test queue
  await supabase.from('queue').delete().eq('user_id', userId);

  // 3. Insert new queue row
  const { data: qData, error: qErr } = await supabase
    .from('queue')
    .insert({
      user_id: userId,
      treatment_id: treatment.id,
      barber_id: null,
      status: 'menunggu',
    })
    .select()
    .single();

  if (qErr) {
    console.error('❌ Insert queue failed:', qErr.message);
    process.exit(1);
  }

  console.log(`✅ Antrian berhasil dibuat!`);
  console.log(` - Queue ID: ${qData.id}`);
  console.log(` - Nomor Antrian (Auto-Generated Trigger): No. ${qData.nomor_antrian}`);
  console.log(` - Status: ${qData.status}`);

  if (qData.nomor_antrian >= 1 && qData.status === 'menunggu') {
    console.log('🎉 F1.2 (Ambil Antrian & Generate Nomor Antrian) LULUS 100%!');
    process.exit(0);
  } else {
    console.error('❌ Data antrian tidak sesuai ekspektasi');
    process.exit(1);
  }
}

testF1_2();
