# Akun Uji BarberSys

Panel demo sudah **dihapus** dari layar login. Gunakan akun di bawah untuk pengujian manual.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@barbersys.com` | `Password123!` |
| Kasir | `kasir@barbersys.com` | `Password123!` |
| Barber | `barber@barbersys.com` | `Password123!` |
| Customer | `customer@barbersys.com` | `Password123!` |

## Catatan

- Akun staff (barber, kasir, admin) dibuat dan dikelola lewat menu **Pegawai** oleh Admin; tidak ada pendaftaran mandiri untuk staff.
- Halaman `/(auth)/register` hanya membuat akun **customer**.
- Role setelah login dibaca dari tabel `profiles`, bukan dipilih di form.
- Jangan menaruh kredensial di UI aplikasi atau di repository publik; file ini hanya untuk pengujian lokal.
