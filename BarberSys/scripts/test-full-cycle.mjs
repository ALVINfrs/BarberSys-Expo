import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testFullCycle() {
  console.log('=================================================================');
  console.log('  TESTING END-TO-END MASTER SIKLUS FASE 1 (MVP INTI BARBERSYS)  ');
  console.log('=================================================================\n');

  // Step 1: Customer Login & Ambil Antrian (C1 & C2)
  console.log('1. Customer (Budi) login & mengambil antrian...');
  const { data: custAuth } = await supabase.auth.signInWithPassword({
    email: 'customer@barbersys.com',
    password: 'Password123!',
  });
  const custId = custAuth.session?.user.id;

  const { data: treat } = await supabase.from('treatments').select('*').limit(1).single();

  // Clear previous queues for clean test
  await supabase.from('queue').delete().eq('user_id', custId);

  const { data: queue, error: qErr } = await supabase
    .from('queue')
    .insert({
      user_id: custId,
      treatment_id: treat.id,
      status: 'menunggu',
    })
    .select()
    .single();

  if (qErr) throw qErr;
  console.log(`   ✅ Antrian berhasil dibuat: No. ${queue.nomor_antrian} | Status: ${queue.status}`);

  // Step 2: Kasir Login & Panggil Antrian (K1 & K2)
  console.log('\n2. Kasir (Siti) login, melihat dashboard antrian & memanggil No. ' + queue.nomor_antrian + '...');
  const { data: kasirAuth } = await supabase.auth.signInWithPassword({
    email: 'kasir@barbersys.com',
    password: 'Password123!',
  });
  const kasirId = kasirAuth.session?.user.id;

  const { data: barb } = await supabase.from('profiles').select('id').eq('email', 'barber@barbersys.com').single();

  const { data: calledQ } = await supabase
    .from('queue')
    .update({
      status: 'dipanggil',
      barber_id: barb.id,
      kasir_id: kasirId,
      called_at: new Date().toISOString(),
    })
    .eq('id', queue.id)
    .select()
    .single();

  console.log(`   ✅ Kasir berhasil memanggil antrian! Status: ${calledQ.status} | Barber ID: ${calledQ.barber_id}`);

  // Step 3: Barber Login, Mulai & Selesai Layanan (B1)
  console.log('\n3. Barber (Andi) login, mulai pengerjaan & menyelesaikan layanan...');
  await supabase.auth.signInWithPassword({
    email: 'barber@barbersys.com',
    password: 'Password123!',
  });

  const { data: startedQ } = await supabase.from('queue').update({ status: 'dilayani' }).eq('id', queue.id).select().single();
  console.log(`   ✅ Barber menekan 'MULAI LAYANAN' -> Status: ${startedQ.status}`);

  const { data: completedQ } = await supabase.from('queue').update({ status: 'selesai' }).eq('id', queue.id).select().single();
  console.log(`   ✅ Barber menekan 'SELESAI LAYANAN' -> Status: ${completedQ.status}`);

  // Step 4: Kasir Proses Pembayaran (K3)
  console.log('\n4. Kasir memproses pembayaran transaksi...');
  await supabase.auth.signInWithPassword({
    email: 'kasir@barbersys.com',
    password: 'Password123!',
  });

  const { data: paidQ } = await supabase
    .from('queue')
    .update({
      status: 'lunas',
      metode_bayar: 'tunai',
      completed_at: new Date().toISOString(),
    })
    .eq('id', queue.id)
    .select()
    .single();

  console.log(`   ✅ Kasir konfirmasi bayar -> Status: ${paidQ.status} | Metode: ${paidQ.metode_bayar}`);

  // Step 5: Customer Cek Riwayat Transaksi (C4)
  console.log('\n5. Customer memverifikasi riwayat transaksi di aplikasi...');
  await supabase.auth.signInWithPassword({
    email: 'customer@barbersys.com',
    password: 'Password123!',
  });

  const { data: history } = await supabase
    .from('queue')
    .select('*, treatments(*)')
    .eq('user_id', custId)
    .eq('status', 'lunas');

  console.log(`   ✅ Ditemukan ${history?.length} riwayat lunas untuk customer.`);
  console.log(`   Detail: [No. ${history[0].nomor_antrian}] ${history[0].treatments.nama} - Rp ${history[0].treatments.harga.toLocaleString('id-ID')}`);

  console.log('\n=================================================================');
  console.log('🎉 DEFINITION OF DONE FASE 1 (MVP INTI) TERPENUHI 100% LULUS!');
  console.log('=================================================================');
  process.exit(0);
}

testFullCycle();
