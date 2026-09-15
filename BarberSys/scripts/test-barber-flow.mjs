import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function testBarberFlow() {
  console.log('=== VERIFIKASI F1.8 - F1.9: ALUR BARBER (B1 MULAI & SELESAI) ===');

  // 1. Sign in as kasir to create assigned queue
  await supabase.auth.signInWithPassword({
    email: 'kasir@barbersys.com',
    password: 'Password123!',
  });

  const { data: barb } = await supabase.from('profiles').select('id').eq('email', 'barber@barbersys.com').single();
  const { data: cust } = await supabase.from('profiles').select('id').eq('role', 'customer').single();
  const { data: treat } = await supabase.from('treatments').select('id').limit(1).single();

  const { data: q, error: insertErr } = await supabase
    .from('queue')
    .insert({
      user_id: cust.id,
      barber_id: barb.id,
      treatment_id: treat.id,
      status: 'dipanggil',
      called_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) {
    console.error('❌ Create mock queue failed:', insertErr.message);
    process.exit(1);
  }

  // 2. Sign in as barber
  const { data: signInData, error: err } = await supabase.auth.signInWithPassword({
    email: 'barber@barbersys.com',
    password: 'Password123!',
  });

  if (err) {
    console.error('❌ Login barber failed:', err.message);
    process.exit(1);
  }

  console.log(`✅ F1.8 - Antrian No. ${q.nomor_antrian} ditugaskan ke Barber! Status awal: ${q.status}`);

  // 3. Barber starts service -> status 'dilayani' (F1.9)
  const { data: startedQ, error: startErr } = await supabase
    .from('queue')
    .update({ status: 'dilayani' })
    .eq('id', q.id)
    .select()
    .single();

  if (startErr) {
    console.error('❌ F1.9 Mulai Layanan failed:', startErr.message);
    process.exit(1);
  }

  console.log(`✅ F1.9 - Barber mulai layanan! Status berubah menjadi: ${startedQ.status}`);

  // 4. Barber completes service -> status 'selesai' (F1.9)
  const { data: completedQ, error: compErr } = await supabase
    .from('queue')
    .update({ status: 'selesai' })
    .eq('id', q.id)
    .select()
    .single();

  if (compErr) {
    console.error('❌ F1.9 Selesai Layanan failed:', compErr.message);
    process.exit(1);
  }

  console.log(`✅ F1.9 - Barber selesai layanan! Status berubah menjadi: ${completedQ.status}`);

  // Cleanup test row
  await supabase.from('queue').delete().eq('id', q.id);

  console.log('🎉 F1.8 & F1.9 (ALUR BARBER MULAI & SELESAI) LULUS 100%!');
  process.exit(0);
}

testBarberFlow();
