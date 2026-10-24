# MyLanundry
## Product Requirements Document (PRD)

**Versi:** 1.2  
**Status:** Draft untuk pengembangan tugas akhir  
**Platform:** Aplikasi mobile Android untuk pelanggan dan dashboard web untuk mitra  
**Teknologi:** React Native + TypeScript, React + Vite + TypeScript, Supabase Auth, PostgreSQL, Supabase Edge Functions (TypeScript), Supabase Storage, Supabase Realtime, Jest

---

# 1. Product Overview

## 1.1 Ringkasan Produk

MyLanundry adalah aplikasi marketplace jasa laundry yang menghubungkan pelanggan dengan berbagai outlet laundry dalam satu platform. Konsepnya terinspirasi dari marketplace pesan-antar seperti ShopeeFood, tetapi berfokus pada layanan laundry.

Pelanggan dapat mencari outlet laundry, membandingkan layanan dan harga, membuat pesanan, memilih metode penyerahan pakaian, melihat status pengerjaan, serta memberikan ulasan. Mitra laundry mengelola profil outlet, layanan, harga, dan pesanan melalui dashboard web.

## 1.2 Latar Belakang Masalah

Pelanggan sering perlu mencari informasi laundry secara terpisah, menanyakan harga melalui chat, dan menghubungi outlet untuk mengetahui status pakaian. Informasi harga, layanan, dan estimasi pengerjaan juga belum tentu tersedia dalam satu tempat.

MyLanundry mengumpulkan informasi tersebut dalam satu aplikasi dan menyediakan alur pemesanan serta pemantauan status yang terstruktur.

## 1.3 Pernyataan Solusi

MyLanundry menyediakan katalog outlet laundry dengan informasi layanan dan harga, proses pemesanan digital, serta pembaruan status pesanan yang dikelola oleh mitra laundry.

## 1.4 Platform dan Pengguna

- **Aplikasi mobile:** digunakan pelanggan.
- **Dashboard web mitra:** digunakan pemilik atau staf outlet laundry.

## 1.5 Definisi Istilah

- **Pelanggan:** pengguna yang mencari dan memesan jasa laundry.
- **Mitra:** pengguna yang mengelola satu atau lebih outlet laundry.
- **Komisi:** persentase nilai jasa yang menjadi pendapatan marketplace.
- **Reservasi kapasitas:** kapasitas kilogram pada tanggal layanan yang ditahan untuk pesanan.
- **Ledger simulasi:** catatan pergerakan saldo, komisi, dan payout untuk MVP; bukan rekening atau penyimpanan uang sungguhan.
- **Pesanan:** transaksi layanan laundry yang dibuat pelanggan.
- **Layanan:** jenis pengerjaan laundry, misalnya cuci setrika atau setrika saja.
- **Estimasi biaya:** perkiraan biaya sebelum berat atau jumlah barang aktual dikonfirmasi.
- **RLS:** Row Level Security, aturan Supabase untuk membatasi data yang dapat diakses pengguna.

# 2. Product Goals & Objectives

## 2.1 Tujuan Produk

1. Memudahkan pelanggan menemukan dan membandingkan outlet laundry.
2. Menyediakan informasi harga, layanan, dan estimasi pengerjaan secara transparan.
3. Memungkinkan pelanggan membuat dan memantau pesanan melalui aplikasi.
4. Membantu mitra mengelola layanan dan pesanan secara terstruktur.
5. Menyediakan studi kasus nyata untuk penerapan pengembangan perangkat lunak dan database relasional.

## 2.2 Indikator Keberhasilan

Target berikut digunakan sebagai kriteria pengujian proyek, bukan klaim performa produk yang sudah berjalan.

- Pelanggan dapat menyelesaikan alur pencarian sampai pembuatan pesanan secara mandiri.
- Sistem menyimpan pesanan beserta detail layanan dan harga pada saat pemesanan.
- Mitra hanya dapat melihat dan mengubah pesanan milik outlet yang dikelolanya.
- Pelanggan hanya dapat melihat data pesanan miliknya.
- Perubahan status pesanan tercatat dan terlihat oleh pelanggan.
- Pengujian mencakup autentikasi, otorisasi, validasi pesanan, dan konsistensi data.

## 2.3 Tujuan Akademik

- Menerapkan proses SDLC dari analisis hingga pengujian.
- Menerapkan TypeScript dan komponen React Native.
- Menerapkan autentikasi dan akses data melalui Supabase.
- Mendesain skema PostgreSQL yang terhubung melalui primary key dan foreign key.
- Menerapkan transaksi atau operasi atomik untuk menjaga konsistensi pembuatan pesanan.
- Menulis pengujian unit dan integrasi untuk fungsi utama.

# 3. Target Users / User Persona

## 3.1 Persona Pelanggan

**Nama contoh:** Dinda, mahasiswa  
**Kebutuhan:** mencari laundry yang dekat, mengetahui harga sebelum memesan, dan memantau pengerjaan tanpa harus menghubungi outlet.

**Hambatan:**
- Harus bertanya kepada beberapa outlet untuk membandingkan harga.
- Tidak mengetahui status pengerjaan secara pasti.
- Membutuhkan pilihan layanan sesuai anggaran dan waktu.

**Kriteria keberhasilan:** Dinda dapat memilih outlet, memahami estimasi biaya, membuat pesanan, dan melihat statusnya di aplikasi.

## 3.2 Persona Mitra Laundry

**Nama contoh:** Pak Budi, pemilik laundry  
**Kebutuhan:** menampilkan layanan, mengatur harga, menerima pesanan, dan memperbarui status pengerjaan.

**Hambatan:**
- Pesanan dari berbagai kanal berisiko tidak tercatat rapi.
- Informasi layanan dan harga sulit diperbarui secara konsisten.
- Pelanggan sering bertanya tentang progres pesanan.

**Kriteria keberhasilan:** Pak Budi dapat mengelola outlet dan pesanan dari dashboard web.

# 4. Scope & Features

## 4.1 Fitur MVP

### A. Aplikasi Pelanggan
- Registrasi, login, dan logout.
- Profil pelanggan dan alamat.
- Katalog outlet laundry.
- Pencarian berdasarkan nama dan area.
- Filter atau pengurutan sederhana berdasarkan harga dan rating jika data tersedia.
- Detail outlet, jam operasional, layanan, harga, dan estimasi pengerjaan.
- Pembuatan pesanan dengan satu outlet per pesanan.
- Pilihan antar-jemput atau antar sendiri.
- Ringkasan estimasi biaya dan konfirmasi pesanan.
- Memilih pembayaran simulasi digital atau tunai untuk alur demonstrasi MVP.
- Mengunggah bukti transfer simulasi jika skenario tersebut digunakan.
- Menyetujui atau menolak penyesuaian harga yang diajukan mitra.
- Mengajukan komplain maksimal 1 jam setelah pesanan ditandai selesai.
- Riwayat dan detail pesanan serta pelacakan status melalui Supabase Realtime.
- Rating dan ulasan setelah pesanan selesai.

### B. Dashboard Mitra
- Registrasi/login mitra dan pembuatan outlet mandiri.
- Mengaktifkan outlet setelah profil, alamat, layanan, harga, dan kapasitas wajib lengkap.
- Pengelolaan profil outlet, area layanan, pickup/pengantaran, kapasitas harian, daftar layanan, dan harga.
- Melihat pesanan masuk dan menerima/menolak pesanan tunai dalam 30 menit.
- Memperbarui berat aktual, mengajukan penyesuaian harga, dan menunggu persetujuan pelanggan bila harga naik.
- Memperbarui status pengerjaan dan meninjau komplain terkait pesanan.
- Melihat komisi, tagihan komisi tunai, ledger simulasi, dan riwayat payout simulasi.

### D. Backend dan Database
- Supabase Auth dan dua role aplikasi: Pelanggan dan Mitra; tidak ada role Admin.
- PostgreSQL dengan RLS untuk membatasi akses data.
- Supabase Edge Functions menggunakan TypeScript untuk operasi bisnis sensitif.
- Reservasi kapasitas kilogram per outlet per tanggal layanan.
- Pembayaran/payout simulasi, ledger, perhitungan komisi, dan proses kedaluwarsa.
- Supabase Realtime untuk pembaruan status pesanan yang diizinkan.
- Penyimpanan riwayat perubahan status, harga, komplain, pembayaran, dan payout.

## 4.2 Di Luar Cakupan MVP

- Integrasi uang sungguhan dengan payment gateway dan payout provider (direncanakan untuk fase lanjutan).
- Penyimpanan atau penahanan dana sungguhan oleh MyLanundry.
- Pelacakan kurir berbasis GPS secara real-time.
- Voucher dan program loyalitas.
- Chat real-time penuh; komunikasi komplain MVP dapat memakai catatan dan bukti pada kasus komplain.
- Rekomendasi berbasis machine learning.
- Peluncuran banyak kota sekaligus.
- Role Admin internal. MVP hanya memiliki role Pelanggan dan Mitra; karena itu, kebijakan komplain harus dapat dijalankan tanpa dashboard Admin.

## 4.3 Keputusan Bisnis MVP

| Topik | Keputusan |
|---|---|
| Wilayah operasi | Satu kota/wilayah terbatas; nama wilayah belum ditentukan |
| Model bisnis | Marketplace multi-outlet; satu outlet per pesanan |
| Role aplikasi | Pelanggan dan Mitra Laundry; tidak ada Admin |
| Pendaftaran mitra | Mitra dapat membuat outlet sendiri setelah mendaftar; outlet baru ditampilkan setelah data wajib lengkap dan diaktifkan mitra |
| Jenis harga | Per kilogram atau per item sesuai layanan |
| Kapasitas | Kilogram per outlet per tanggal layanan; kapasitas ditahan saat checkout dan dilepas jika pesanan kedaluwarsa/dibatalkan sesuai aturan |
| Pembayaran MVP | Simulasi pembayaran digital dan payout; tunai juga tersedia sebagai skenario operasional. Tidak ada uang sungguhan yang diproses pada MVP |
| Tenggat pembayaran digital | 15 menit sejak pesanan dibuat; jika belum terverifikasi pada tenggat, pesanan kedaluwarsa dan reservasi dilepas |
| Respons pesanan tunai | Mitra harus menerima/menolak dalam 30 menit; jika tidak merespons, pesanan kedaluwarsa dan reservasi dilepas |
| Harga aktual | Mengikuti estimasi awal; kenaikan harga harus disetujui pelanggan sebelum pengerjaan dilanjutkan |
| Komisi marketplace | Rentang sasaran MVP 4–6%; 5% digunakan sebagai nilai default sementara dan perlu dikonfirmasi final |
| Dasar komisi | Nilai jasa final; pengecualian biaya antar-jemput, gateway, diskon, dan refund perlu dirinci sebelum implementasi final |
| Komisi pesanan tunai | Dicatat sebagai tagihan mitra dan dipotong dari payout digital berikutnya dalam simulasi ledger |
| Penyelesaian pesanan | Mitra menandai pesanan selesai; masa komplain pelanggan berlangsung 1 jam |
| Payout | Diproses otomatis dalam simulasi setelah masa komplain berakhir tanpa komplain terbuka; integrasi nyata bergantung penyedia yang mendukung marketplace/payout |
| Komplain | Komplain yang diajukan dalam 1 jam menahan payout sampai hasil penyelesaian dijalankan; penyelesaian dilakukan pelanggan dan mitra berdasarkan kebijakan yang perlu dirinci |
| Pickup/pengantaran | Diatur masing-masing mitra, termasuk area, jadwal, dan biaya |
| Rating | Satu ulasan per pesanan selesai |
| Publikasi outlet | Mitra dapat mengaktifkan/menonaktifkan outlet sendiri setelah informasi wajib lengkap |

# 5. User Flow & User Stories

## 5.1 Alur Pelanggan

1. Pelanggan membuka aplikasi.
2. Pelanggan login atau membuat akun.
3. Pelanggan melihat katalog outlet.
4. Pelanggan mencari atau memilih outlet.
5. Pelanggan melihat detail outlet dan layanan.
6. Pelanggan memilih layanan, memasukkan perkiraan/estimasi berat cucian (kuantitas), metode penyerahan (antar-jemput atau drop-off), serta catatan pakaian/preferensi jemput.
7. Sistem menampilkan estimasi biaya awal dan ringkasan pesanan.
8. Backend memeriksa kapasitas kilogram pada tanggal layanan dan menahan kuota secara atomik.
9. Pelanggan memilih preferensi metode pembayaran (simulasi digital QRIS atau tunai), lalu mengirim pesanan (status: `pending_partner`).
10. Pesanan masuk ke antrean outlet untuk diverifikasi dan ditimbang ulang secara akurat.
11. Setelah outlet menimbang ulang pakaian dan menginput berat riil, sistem menghitung harga pasti/fix (`final_service_amount`) dan status berubah ke `pending_payment`.
12. Pelanggan menerima notifikasi pembaruan secara realtime (Supabase Realtime) yang menampilkan rincian berat aktual dan tagihan harga fix.
13. Pelanggan melakukan konfirmasi pembayaran (menyelesaikan simulasi pembayaran digital QRIS atau konfirmasi siap bayar tunai saat cucian diserahkan).
14. Setelah pembayaran/tagihan terkonfirmasi, status pesanan otomatis berubah ke `processing` (Sedang Dicuci) dan proses pencucian dimulai.
15. Mitra menyelesaikan pengerjaan dan memperbarui status menjadi `ready_for_pickup` (Siap Diambil/Diantar) lalu `completed`.
16. Saat pesanan berstatus `completed`, backend memulai masa komplain 1 jam.
17. Jika tidak ada komplain terbuka setelah 1 jam, payout simulasi diproses otomatis dan komisi platform dihitung.
18. Pelanggan dapat memberikan rating bintang (1-5) dan ulasan tertulis setelah pesanan selesai.

## 5.2 Alur Mitra

1. Mitra mendaftar/login dan membuat outlet.
2. Mitra melengkapi profil, area layanan, layanan/harga, dan kapasitas harian lalu mengaktifkan outlet.
3. Mitra membuka pesanan masuk pada tab pesanan (`pending_partner`).
4. Mitra menerima pesanan fisik dari pelanggan/kurir, memeriksa cucian, dan melakukan penimbangan ulang secara akurat.
5. Mitra menginput berat riil aktual ke dashboard web via modal "Timbang & Tetapkan Harga".
6. Sistem secara otomatis menghitung total harga fix berdasarkan snapshot tarif layanan dan menerbitkan tagihan fix ke pelanggan (status berubah menjadi `pending_payment`).
7. Mitra menunggu pelanggan mengonfirmasi pembayaran (QRIS digital atau konfirmasi tunai).
8. Begitu pembayaran terverifikasi, status pesanan otomatis berganti menjadi `processing` (Sedang Dicuci).
9. Mitra mencuci cucian hingga selesai, memperbarui status menjadi `ready_for_pickup` lalu `completed`.
10. Masa komplain 1 jam dimulai; mitra memantau ringkasan komisi dan payout simulasi.

## 5.3 User Stories & Acceptance Criteria

Sesuai kriteria evaluasi IK102 Software Development Fundamentals dan instrumen riset lapangan ([`docs/Kerangka_Wawancara_MyLanundry_V1.md`](file:///c:/KULIAH/MyLaundry/docs/Kerangka_Wawancara_MyLanundry_V1.md)), berikut adalah 8 User Stories inti yang dilengkapi dengan Kriteria Penerimaan (*Acceptance Criteria*):

### US-01: Autentikasi Pengguna (Pelanggan & Mitra)
- **Sebagai:** Pelanggan atau Mitra Baru
- **Saya ingin:** Mendaftar akun dengan email & password dan login ke sistem
- **Agar:** Saya dapat mengakses layanan MyLaundry sesuai peran (*role*) saya secara aman
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-01.1 (Pendaftaran Berhasil):** Given formulir registrasi diisi dengan nama, email valid, password minimal 6 karakter, dan role (`customer`/`partner`), When tombol "Daftar" ditekan, Then akun tersimpan di Supabase Auth, trigger `handle_new_user` membuat baris di `profiles`, dan pengguna langsung diarahkan ke layar sesuai perannya.
  - **AC-01.2 (Validasi Kredensial Invalid):** Given email salah format atau password keliru dimasukkan pada form login, When tombol "Masuk" ditekan, Then sistem menampilkan pesan error informatif dan memblokir akses ke fitur privat.

### US-02: Pencarian & Eksplorasi Outlet
- **Sebagai:** Pelanggan
- **Saya ingin:** Mencari dan memfilter outlet laundry berdasarkan nama outlet atau area layanan
- **Agar:** Saya dapat menemukan laundry terdekat yang melayani lokasi saya dengan cepat
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-02.1 (Pencarian Kata Kunci):** Given pengguna mengetik kata kunci pada kolom pencarian di Beranda (misal "Setiabudi" atau "Dago"), When hasil dimuat, Then daftar outlet yang ditampilkan hanya yang memiliki kecocokan pada `name` atau `service_area`.
  - **AC-02.2 (Filter Outlet Aktif):** Given outlet ditandai `is_active = false` oleh mitra, When pelanggan mencari laundry di katalog publik, Then outlet non-aktif tersebut tidak ditampilkan.

### US-03: Katalog Layanan & Perbandingan Harga
- **Sebagai:** Pelanggan
- **Saya ingin:** Melihat daftar layanan, jenis tarif (per kg/item), dan estimasi durasi pengerjaan outlet
- **Agar:** Saya dapat membandingkan harga secara transparan sebelum memesan
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-03.1 (Rincian Tarif Transparan):** Given pelanggan membuka profil outlet tertentu, When katalog layanan dibuka, Then sistem menampilkan rincian nama layanan, format harga Rupiah yang valid, satuan (`kg` atau `item`), dan estimasi jam pengerjaan.
  - **AC-03.2 (Empty State):** Given outlet belum mendaftarkan layanan aktif, When pelanggan membuka modal pemesanan, Then sistem menampilkan pesan *empty state* dan menonaktifkan tombol pemesanan.

### US-04: Pembuatan Pesanan Atomik (Checkout)
- **Sebagai:** Pelanggan
- **Saya ingin:** Membuat pesanan dengan memilih layanan, estimasi kuantitas, metode penyerahan, dan metode pembayaran
- **Agar:** Pesanan laundry saya tercatat secara resmi dan kuota kapasitas outlet teralokasikan
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-04.1 (Transaksi Atomik Sukses):** Given pelanggan memilih layanan aktif, kuantitas minimal 1, metode penyerahan, dan metode pembayaran, When tombol "Pesan Sekarang" dikonfirmasi, Then stored procedure atomik `create_order_atomic` mengeksekusi insert ke `orders`, `order_items` (snapshot harga), `order_status_history`, dan `capacity_reservations` dalam satu transaksi ACID yang berhasil seluruhnya.
  - **AC-04.2 (Rollback pada Input Invalid):** Given kuantitas bernilai 0 atau negatif dimasukkan, When pesanan dikirim, Then stored procedure me-ROLLBACK seluruh operasi dan tidak ada data parsial yang tersimpan di database.

### US-05: Pelacakan Status Pesanan Realtime
- **Sebagai:** Pelanggan
- **Saya ingin:** Memantau perkembangan status pengerjaan pakaian saya dari penerimaan hingga selesai secara live
- **Agar:** Saya mengetahui kapan laundry sedang dicuci, siap diambil, atau diantar tanpa perlu menghubungi outlet
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-05.1 (Live Update via Realtime):** Given pelanggan membuka tab "Pesanan" pada aplikasi mobile, When mitra mengubah status pesanan dari "accepted" ke "processing", Then layar pelanggan otomatis memperbarui status dan linimasa tanpa perlu reload manual.
  - **AC-05.2 (Isolasi Data Pesanan):** Given pelanggan terautentikasi dengan ID tertentu, When membaca riwayat pesanan, Then RLS database menjamin pelanggan hanya dapat melihat data pesanannya sendiri.

### US-06: Ulasan & Penilaian Pesanan Selesai
- **Sebagai:** Pelanggan
- **Saya ingin:** Memberikan rating bintang (1-5) dan ulasan tertulis setelah pesanan selesai
- **Agar:** Saya dapat memberikan apresiasi atau masukan performa kepada outlet laundry
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-06.1 (Submit Rating Pesanan Selesai):** Given pesanan telah berstatus `completed`, When pelanggan memilih rating bintang 1–5, menulis komentar, dan menekan "Kirim Ulasan", Then ulasan tersimpan di tabel `reviews` dan outlet menerima nilai rating tersebut.
  - **AC-06.2 (Enforce 1 Review per Order):** Given pesanan telah memiliki ulasan di database, When terjadi upaya pengiriman ulasan ulang untuk `order_id` yang sama, Then sistem menolak penyimpanan karena adanya unique constraint pada `reviews.order_id`.

### US-07: Pengelolaan Layanan & Tarif Mitra
- **Sebagai:** Mitra Laundry
- **Saya ingin:** Menambah, mengubah harga, dan mengaktifkan/menonaktifkan layanan laundry di dashboard web
- **Agar:** Katalog layanan outlet saya selalu mutakhir dan mencerminkan kapasitas operasional
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-07.1 (Pembaruan Tarif Tanpa Merusak Data Lama):** Given mitra mengubah tarif layanan dari Rp8.000 menjadi Rp10.000/kg, When disimpan, Then harga baru berlaku untuk pesanan baru, sementara pesanan lama tetap menjaga harga snapshot di `order_items`.
  - **AC-07.2 (Validasi Nilai Non-Negatif):** Given mitra memasukkan tarif bernilai negatif, When tombol simpan ditekan, Then sistem menampilkan validasi error dan memblokir penyimpanan ke database.

### US-08: Manajemen Operasional & Penimbangan Ulang Mitra
- **Sebagai:** Mitra Laundry
- **Saya ingin:** Menerima/menolak pesanan masuk, menimbang cucian riil, menetapkan harga fix, dan memperbarui status pengerjaan
- **Agar:** Alur penagihan transparan berdasarkan berat aktual dan pengerjaan laundry berjalan tertib
- **Acceptance Criteria (Kriteria Penerimaan):**
  - **AC-08.1 (Penyesuaian Berat Aktual & Penetapan Harga Fix):** Given pesanan berstatus `pending_partner` atau `accepted`, When mitra menimbang cucian dan memasukkan berat riil, Then total biaya pasti/fix dihitung (`final_service_amount`), status berubah ke `pending_payment`, dan tagihan diterbitkan ke pelanggan untuk dikonfirmasi sebelum proses cuci dimulai.
  - **AC-08.2 (Penyelesaian & Penetapan Batas Komplain):** Given cucian selesai dikerjakan, When mitra menandai pesanan `completed`, Then server mencatat `completed_at` dan otomatis menetapkan `complaint_deadline = completed_at + 1 hour`.

# 6. Functional Requirements

Persyaratan diberi ID agar dapat dilacak ke implementasi dan pengujian.

| ID | Persyaratan | Prioritas | Kriteria penerimaan |
|---|---|---|---|
| FR-01 | Sistem menyediakan registrasi, login, dan logout | Must | Pengguna dapat masuk dengan kredensial valid dan menerima pesan kesalahan untuk kredensial tidak valid |
| FR-02 | Sistem membedakan dua peran, pelanggan dan mitra | Must | Pelanggan dan mitra hanya dapat membuka fungsi sesuai perannya |
| FR-03 | Sistem menampilkan outlet yang aktif | Must | Outlet yang dinonaktifkan oleh mitra tidak tampil di katalog publik |
| FR-04 | Sistem menyediakan pencarian outlet | Must | Hasil pencarian sesuai nama atau area yang dimasukkan |
| FR-05 | Sistem menampilkan detail outlet dan layanan | Must | Informasi nama, alamat/area, jam operasional, layanan, harga, dan estimasi tersedia jika diisi |
| FR-06 | Sistem menghitung estimasi biaya awal | Must | Total estimasi dihitung saat pemesanan berdasarkan harga layanan dan estimasi kuantitas/berat |
| FR-07 | Sistem membuat pesanan | Must | Pesanan tersimpan beserta item, snapshot harga, metode penyerahan, catatan, dan pelanggan |
| FR-08 | Sistem mencegah pesanan dibuat dengan layanan tidak aktif | Must | Server menolak pesanan dengan layanan yang tidak tersedia |
| FR-09 | Mitra dapat menerima atau menolak pesanan baru | Must | Hanya mitra pemilik outlet terkait yang dapat melakukan tindakan |
| FR-10 | Mitra menimbang ulang dan menetapkan harga fix | Must | Mitra memasukkan berat aktual cucian, sistem menghitung harga fix dan menerbitkan tagihan |
| FR-11 | Pelanggan dapat melihat riwayat dan detail pesanan sendiri | Must | Pelanggan tidak dapat membaca pesanan milik pengguna lain |
| FR-12 | Pelanggan mengonfirmasi pembayaran tagihan fix | Must | Pelanggan menyelesaikan konfirmasi pembayaran (QRIS/tunai) atas harga fix sebelum cucian diproses cuci |
| FR-13 | Sistem menyimpan metode dan status pembayaran | Must | Status pembayaran ditampilkan sesuai data yang diverifikasi |
| FR-14 | Pelanggan dapat memberi rating dan ulasan | Should | Ulasan hanya dapat dibuat untuk pesanan selesai dan tidak dapat diduplikasi untuk pesanan yang sama |
| FR-15 | Sistem menahan kapasitas kg saat checkout | Must | Reservasi dibuat atomik berdasarkan outlet dan tanggal layanan; kapasitas tidak dapat terlampaui oleh checkout bersamaan |
| FR-16 | Sistem menangani tenggat pembayaran/respons | Must | Konfirmasi pembayaran harga fix kedaluwarsa setelah 15 menit jika belum diverifikasi; pesanan estimasi kedaluwarsa setelah 30 menit tanpa respons mitra |
| FR-17 | Sistem menampilkan pesan loading, kosong, berhasil, dan gagal | Must | Pengguna mendapat umpan balik untuk setiap operasi utama |
| FR-18 | Sistem mencatat riwayat perubahan status | Must | Riwayat memuat pesanan, status, waktu, dan aktor perubahan |
| FR-19 | Sistem mengelola komplain dan payout simulasi | Must | Komplain dapat diajukan dalam 1 jam setelah selesai; payout otomatis hanya layak jika tidak ada komplain terbuka |
| FR-20 | Sistem menghitung komisi dan tagihan mitra | Must | Komisi dihitung dari nilai jasa final dengan snapshot tarif; tagihan komisi tunai dipotong dari payout digital berikutnya |
| FR-21 | Sistem memperbarui status melalui Realtime | Must | Pengguna berwenang menerima perubahan status tanpa refresh manual |

## 6.1 Aturan Status Pesanan, Pembayaran, dan Reservasi

Status siklus hidup pesanan:
- `pending_partner`: pesanan dibuat pelanggan dengan estimasi berat; menunggu konfirmasi dan penimbangan ulang oleh mitra.
- `pending_payment`: mitra telah menimbang ulang dan menerbitkan harga fix; menunggu konfirmasi pembayaran pelanggan.
- `accepted`: pesanan diterima mitra (jika dipisahkan dari proses timbang).
- `rejected`: pesanan ditolak mitra.
- `awaiting_customer_approval`: menunggu keputusan pelanggan jika ada penyesuaian biaya khusus.
- `processing`: pembayaran/tagihan telah dikonfirmasi pelanggan; pengerjaan pencucian pakaian berlangsung.
- `ready_for_pickup`: pencucian selesai, pakaian siap diambil atau diserahkan ke pelanggan.
- `completed`: pesanan telah diserahkan dan diselesaikan secara resmi.
- `cancelled`: pesanan dibatalkan sesuai aturan yang berlaku.
- `expired`: melewati tenggat waktu (30 menit respons mitra atau 15 menit pembayaran harga fix).

Status pembayaran dan keuangan dipisahkan dari status pesanan:
- Pembayaran: `pending`, `paid`, `failed`, `late_payment`, `refund_pending`, `refunded`.
- Reservasi kapasitas: `held`, `committed`, `released`.
- Komplain: `none`, `open`, `resolved`.
- Payout simulasi: `held`, `eligible`, `processing`, `paid`, `blocked`, `failed`.

Aturan transisi utama:
- Pesanan baru berstatus `pending_partner`. Mitra memiliki waktu 30 menit untuk merespons dan menimbang cucian; jika tidak, pesanan kedaluwarsa otomatis dan reservasi dilepas.
- Setelah mitra menginput berat aktual, pesanan beralih ke `pending_payment` dengan tenggat waktu 15 menit untuk konfirmasi pembayaran oleh pelanggan.
- Begitu pembayaran dikonfirmasi pelanggan, status otomatis berpindah ke `processing`. Mitra dilarang mencuci sebelum pembayaran terkonfirmasi.
- Saat pesanan ditandai selesai, server mencatat `completed_at` dan menetapkan `complaint_deadline = completed_at + 1 hour`.
- Jika tidak ada komplain terbuka setelah tenggat, payout simulasi menjadi layak dan diproses otomatis.
- Jika komplain masuk sebelum tenggat, payout diblokir sampai hasil penyelesaian dijalankan.
- Semua tenggat menggunakan waktu server/database. Operasi kedaluwarsa dan payout harus idempoten.
- Server memvalidasi setiap transisi. Klien tidak boleh mengubah status keuangan secara bebas.

# 7. Non-Functional Requirements

| ID | Kategori | Persyaratan |
|---|---|---|
| NFR-01 | Keamanan | Seluruh akses data harus menerapkan autentikasi dan otorisasi sesuai peran |
| NFR-02 | Keamanan | RLS harus aktif pada tabel yang dapat diakses melalui Supabase API |
| NFR-03 | Keamanan | Service role key tidak boleh disimpan di aplikasi mobile atau browser |
| NFR-04 | Integritas | Relasi data menggunakan primary key, foreign key, constraint, dan validasi yang sesuai |
| NFR-05 | Integritas | Harga pada detail pesanan disimpan sebagai snapshot agar perubahan harga layanan tidak mengubah pesanan lama |
| NFR-06 | Kinerja | Pada lingkungan uji dan data demo yang ditentukan, halaman katalog utama ditargetkan tampil dalam 3 detik pada jaringan normal |
| NFR-07 | Kegunaan | Navigasi utama mudah dipahami dan menggunakan istilah konsisten dalam Bahasa Indonesia |
| NFR-08 | Kompatibilitas | Aplikasi mobile menargetkan Android; versi minimum ditentukan saat konfigurasi proyek |
| NFR-09 | Pemeliharaan | Kode dipisah berdasarkan fitur dan tanggung jawab, dengan TypeScript untuk pemeriksaan tipe |
| NFR-10 | Pengujian | Fungsi kritis diuji, terutama perhitungan harga, akses peran, pembuatan pesanan, dan transisi status |
| NFR-11 | Privasi | Data profil dan alamat hanya dapat dibaca oleh pemiliknya serta pihak yang berwenang untuk memproses pesanan |
| NFR-12 | Ketersediaan | Sistem menampilkan pesan yang jelas jika jaringan atau backend tidak tersedia dan tidak menganggap operasi gagal sebagai berhasil |

# 8. Requirements Specification (SRS)

## 8.1 Tujuan SRS

SRS menerjemahkan kebutuhan produk menjadi spesifikasi yang dapat digunakan untuk desain, implementasi, dan pengujian.

## 8.2 Lingkungan Sistem

- Mobile: React Native dengan TypeScript.
- Dashboard web: React dengan Vite dan TypeScript.
- Backend: Supabase Auth, PostgreSQL, Supabase Edge Functions berbasis TypeScript, Supabase Storage, dan Supabase Realtime.
- Version control: Git dan GitHub.
- Testing: Jest untuk unit test; alat pengujian integrasi dipilih sesuai implementasi.

## 8.3 Aktor Sistem

- Pelanggan.
- Mitra laundry.
- Supabase Auth sebagai penyedia autentikasi.
- Supabase Edge Functions/database sebagai pemvalidasi dan penyimpan data.
- Tidak ada aktor Admin pada MVP.

## 8.4 Input dan Output Utama

| Proses | Input | Output |
|---|---|---|
| Login | Email dan kata sandi | Sesi pengguna atau pesan kesalahan |
| Pencarian outlet | Kata kunci dan filter | Daftar outlet yang sesuai |
| Melihat layanan | ID outlet | Daftar layanan aktif dan harga |
| Membuat pesanan | Outlet, tanggal layanan, layanan, kuantitas, metode penyerahan, pembayaran | Nomor pesanan, reservasi kapasitas, dan tenggat |
| Menerima pesanan tunai | ID pesanan dan keputusan mitra dalam 30 menit | Status pesanan baru |
| Pembayaran simulasi | ID pesanan dan tindakan simulasi | Status pembayaran yang tercatat |
| Payout simulasi | Pesanan selesai, masa komplain berakhir, tanpa komplain terbuka | Ledger komisi dan payout simulasi |
| Memperbarui status | ID pesanan dan status tujuan | Status dan riwayat terbaru |
| Menyetujui biaya | Keputusan pelanggan | Persetujuan atau pembatalan sesuai aturan |
| Memberi ulasan | ID pesanan, rating, komentar | Ulasan tersimpan |

## 8.5 Validasi Data

- Email harus valid dan unik pada sistem autentikasi.
- Harga layanan harus bernilai nol atau lebih, tetapi layanan yang dapat dipesan harus memiliki harga yang valid sesuai jenisnya.
- Kuantitas harus lebih besar dari nol.
- Rating hanya berada pada rentang 1 sampai 5.
- Pesanan harus memiliki setidaknya satu item.
- Semua item dalam satu pesanan harus berasal dari outlet yang sama.
- Pelanggan tidak boleh menentukan sendiri status pesanan.
- Mitra hanya dapat memperbarui pesanan milik outlet yang dikelolanya.
- Total biaya dihitung atau divalidasi oleh sisi server, bukan dipercaya dari total yang dikirim aplikasi.
- Kapasitas kg harus dicek dan ditahan secara atomik untuk outlet serta tanggal layanan.
- Tenggat 15 menit untuk pembayaran digital dan 30 menit untuk respons pesanan tunai ditetapkan oleh server.
- Payout simulasi tidak boleh diproses jika ada komplain terbuka atau masa komplain 1 jam belum berakhir.
- Komisi, tagihan komisi tunai, dan payout dicatat dalam ledger dengan operasi pembalik/penyesuaian, bukan mengubah riwayat lama.
- Status pembayaran tidak boleh ditandai lunas hanya berdasarkan klaim klien.

## 8.6 Kebutuhan Hak Akses

| Data/aksi | Pelanggan | Mitra pemilik outlet |
|---|---|---|---|
| Melihat katalog outlet publik | Ya | Ya |
| Mengubah profil pelanggan sendiri | Ya | Tidak |
| Mengelola profil outlet | Tidak | Ya |
| Mengelola layanan outlet | Tidak | Ya |
| Membuat pesanan | Ya | Tidak melalui peran mitra |
| Melihat detail pesanan | Pesanan sendiri | Pesanan outlet sendiri |
| Memperbarui status pengerjaan | Tidak | Ya, sesuai transisi |
| Memberi ulasan | Untuk pesanan sendiri yang selesai | Tidak |

Hak akses di atas harus ditegakkan di backend/database menggunakan RLS dan fungsi server yang sesuai. Menyembunyikan tombol pada UI saja tidak cukup.

## 8.7 Kriteria Selesai

Fitur dianggap selesai jika:
1. Alur utama berjalan dari UI sampai database.
2. Validasi input tersedia.
3. Hak akses telah diuji.
4. Kondisi loading, kosong, berhasil, dan gagal ditangani.
5. Pengujian relevan lulus.
6. Dokumentasi penggunaan atau konfigurasi diperbarui.

# 9. System Design

## 9.1 Arsitektur Tingkat Tinggi

```text
+------------------------+       +-------------------------+
| Mobile App             |       | Web Dashboard           |
| React Native + TS      |       | React + Vite + TS       |
| Pelanggan              |       | Mitra                   |
+------------+-----------+       +------------+------------+
             |                                |
             +---------------+----------------+
                             v
               +-----------------------------+
               | Supabase Auth               |
               | PostgreSQL + RLS            |
               | Edge Functions (TypeScript) |
               | Realtime + Storage          |
               +-----------------------------+
                             |
                             v
               +-----------------------------+
               | Simulasi payment, ledger,   |
               | komisi, complaint, payout   |
               +-----------------------------+
```

Klien menggunakan Supabase SDK untuk operasi yang aman di bawah RLS. Operasi sensitif—pembuatan pesanan/reservasi, kedaluwarsa, perubahan harga, ledger, komplain, dan payout—melewati Edge Functions dan/atau fungsi PostgreSQL yang menjaga validasi serta konsistensi atomik. MVP hanya mensimulasikan pembayaran/payout; jangan mengklaim atau memproses uang sungguhan.

## 9.2 Komponen Sistem

- **Mobile app:** layar pelanggan, navigasi, validasi awal, dan pemanggilan API.
- **Dashboard web:** pengelolaan outlet, layanan, dan pesanan oleh mitra.
- **Supabase Auth:** autentikasi dan identitas pengguna.
- **PostgreSQL:** penyimpanan data terstruktur.
- **RLS:** pembatasan akses berdasarkan pengguna, peran, dan kepemilikan outlet.
- **Supabase Edge Functions (TypeScript):** validasi bisnis dan orkestrasi operasi sensitif.
- **PostgreSQL functions/transactions:** operasi atomik untuk reservasi kapasitas, pesanan, komisi, dan ledger.
- **Supabase Realtime:** pembaruan status pesanan/komplain yang boleh diakses pengguna.
- **Supabase Storage:** foto outlet/layanan dan bukti komplain dengan akses terbatas.
- **Scheduled worker/cron:** memproses pesanan kedaluwarsa dan payout simulasi secara idempoten.

## 9.3 Rancangan Entitas Database

Tabel inti yang disarankan untuk implementasi:

| Tabel | Tujuan | Kolom inti |
|---|---|---|
| `profiles` | Profil dan role | `id`, `full_name`, `phone`, `role`, `created_at` |
| `addresses` | Alamat pelanggan | `id`, `user_id`, `label`, `address_text`, `latitude`, `longitude`, `is_default` |
| `laundry_outlets` | Profil outlet dan pemilik | `id`, `owner_id`, `name`, `address_text`, `service_area`, `operating_hours`, `is_active` |
| `laundry_services` | Layanan dan harga | `id`, `outlet_id`, `name`, `pricing_type`, `price`, `estimated_duration_hours`, `is_active` |
| `outlet_daily_capacity` | Kapasitas harian outlet | `id`, `outlet_id`, `service_date`, `capacity_kg`, `reserved_kg`, `committed_kg` |
| `orders` | Header pesanan | `id`, `order_number`, `customer_id`, `outlet_id`, `service_date`, `status`, `handover_method`, `subtotal_estimate`, `final_service_amount`, `payment_method`, `payment_status`, `payment_deadline`, `partner_response_deadline`, `completed_at`, `complaint_deadline` |
| `order_items` | Item dan snapshot harga | `id`, `order_id`, `service_id`, `service_name_snapshot`, `unit_price_snapshot`, `quantity`, `unit`, `line_total` |
| `capacity_reservations` | Reservasi kg per tanggal | `id`, `order_id`, `outlet_id`, `service_date`, `reserved_kg`, `status`, `expires_at`, `released_at` |
| `order_status_history` | Riwayat status | `id`, `order_id`, `old_status`, `new_status`, `changed_by`, `note`, `created_at` |
| `payments` | Pembayaran simulasi | `id`, `order_id`, `method`, `amount`, `status`, `reference`, `verified_at` |
| `price_adjustments` | Perubahan harga | `id`, `order_id`, `old_amount`, `new_amount`, `reason`, `status`, `requested_at`, `responded_at` |
| `complaints` | Komplain dan resolusi | `id`, `order_id`, `customer_id`, `reason`, `evidence_path`, `status`, `resolution_type`, `resolution_amount`, `created_at`, `resolved_at` |
| `commission_entries` | Komisi dan tagihan mitra | `id`, `order_id`, `outlet_id`, `rate_snapshot`, `basis_amount`, `commission_amount`, `status` |
| `ledger_entries` | Catatan debit/kredit simulasi | `id`, `outlet_id`, `order_id`, `entry_type`, `amount`, `direction`, `created_at`, `idempotency_key` |
| `payouts` | Payout simulasi | `id`, `outlet_id`, `amount_gross`, `commission_deduction`, `cash_commission_debt_deduction`, `amount_net`, `status`, `eligible_at`, `processed_at` |
| `reviews` | Ulasan pesanan | `id`, `order_id`, `customer_id`, `outlet_id`, `rating`, `comment`, `created_at` |

Catatan desain:
- `profiles.id` merujuk ke `auth.users.id`; role dibatasi ke `customer` atau `partner`.
- Tidak ada `admin` role maupun alur persetujuan outlet oleh Admin.
- Kapasitas dan reservasi perlu dikunci secara transaksional agar dua checkout tidak memakai kapasitas yang sama.
- Harga dan tarif komisi disimpan sebagai snapshot agar perubahan berikutnya tidak mengubah transaksi lama.
- Ledger bersifat append-only secara logis; koreksi dilakukan dengan entri penyesuaian/pembalik.
- Gunakan `NUMERIC` untuk uang, bukan floating point.
- Tambahkan unique constraint pada `reviews.order_id`, kunci idempotensi, dan constraint status yang sesuai.
- Data bukti komplain berada di Storage privat; akses dibatasi berdasarkan pesanan.

## 9.4 Relasi Entitas

```text
auth.users 1 ---- 1 profiles
profiles   1 ---- N addresses
profiles   1 ---- N laundry_outlets (sebagai owner)
laundry_outlets 1 ---- N laundry_services
profiles   1 ---- N orders (sebagai customer)
laundry_outlets 1 ---- N orders
orders     1 ---- N order_items
orders     1 ---- N order_status_history
orders     1 ---- N payments
orders     1 ---- N capacity_reservations
orders     1 ---- N price_adjustments
orders     1 ---- 0..N complaints (sesuai kebijakan)
orders     1 ---- 0..N commission_entries
laundry_outlets 1 ---- N ledger_entries / payouts
orders     1 ---- 0..1 reviews
```

Relasi tersebut merupakan rancangan awal. Constraint dan kebijakan penghapusan harus ditetapkan saat implementasi.

## 9.5 Aturan Konsistensi Pesanan

- Pembuatan header pesanan dan item pesanan dilakukan secara atomik.
- Total dihitung ulang di sisi tepercaya berdasarkan harga layanan yang masih berlaku.
- Harga snapshot disimpan agar perubahan harga katalog tidak mengubah transaksi lama.
- Perubahan status dan pencatatan riwayat status dilakukan dalam satu operasi atomik.
- Permintaan ganda akibat retry sebaiknya ditangani dengan mekanisme idempotensi atau pemeriksaan pesanan.
- Perubahan biaya aktual harus memiliki nilai awal, nilai baru, alasan, status persetujuan, dan waktu persetujuan.
- Reservasi kapasitas, header pesanan, dan item pesanan dibuat/diperbarui secara atomik.
- Pelepasan reservasi, komisi, ledger, dan payout harus idempoten.
- Pembayaran digital simulasi memiliki tenggat 15 menit; pesanan tunai memiliki tenggat respons mitra 30 menit.
- Payout simulasi baru layak setelah 1 jam sejak pesanan selesai dan tidak ada komplain terbuka.
- Komisi default sementara 5% (rentang sasaran 4–6%) dihitung dari nilai jasa final; tarif disimpan sebagai snapshot.
- Tagihan komisi dari pesanan tunai dipotong dari payout digital mitra berikutnya, dengan sisa utang tetap tercatat.
- Akses pembayaran dibatasi dan perubahan status pembayaran harus diverifikasi oleh backend.
- Pembayaran yang terdeteksi terlambat setelah pesanan kedaluwarsa harus masuk proses rekonsiliasi/refund, bukan diabaikan.

## 9.6 Keamanan Supabase

- Aktifkan RLS pada tabel yang dapat diakses dari klien.
- Pelanggan hanya dapat membaca dan mengubah data profil miliknya.
- Pelanggan hanya dapat membaca pesanan miliknya.
- Mitra hanya dapat mengelola outlet dan pesanan yang terkait dengan outlet miliknya.
- Simpan kunci rahasia hanya di lingkungan server.
- Uji kebijakan dengan akun dari setiap peran.

## 9.7 Edge Functions dan Proses Terjadwal

Fungsi yang disarankan (nama implementasi dapat disesuaikan):
- `create-order`: validasi layanan/harga, cek kapasitas, buat pesanan dan reservasi secara atomik.
- `respond-to-order`: menerima/menolak pesanan tunai sebelum tenggat 30 menit.
- `simulate-payment`: simulasi hasil pembayaran; hanya backend yang boleh menandai pembayaran terverifikasi.
- `expire-orders`: kedaluwarsa setelah tenggat pembayaran digital 15 menit atau respons tunai 30 menit, lalu melepas reservasi.
- `submit-price-adjustment` / `respond-to-price-adjustment`: menangani pengajuan kenaikan dan keputusan pelanggan.
- `update-order-status`: memvalidasi transisi status pengerjaan.
- `submit-complaint` / `resolve-complaint`: mencatat komplain, bukti, dan hasil penyelesaian.
- `calculate-commission`: mencatat komisi berdasarkan tarif snapshot.
- `process-simulated-payout`: memproses payout simulasi otomatis setelah masa komplain 1 jam berakhir tanpa komplain terbuka.
- `reconcile-late-payment`: mencatat pembayaran yang terdeteksi setelah pesanan kedaluwarsa dan mengarahkannya ke prosedur refund/rekonsiliasi.

Proses terjadwal tidak boleh mengandalkan aplikasi pelanggan/mitra tetap terbuka. Semua proses harus idempoten, memvalidasi status terbaru, dan mencatat hasilnya.

## 9.8 Struktur Folder yang Disarankan

```text
MyLanundry/
├── frontend/
│   ├── mobile/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── navigation/
│   │   │   ├── screens/
│   │   │   ├── services/
│   │   │   ├── hooks/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── tests/
│   │   └── package.json
│   └── dashboard/
│       ├── src/
│       │   ├── components/
│       │   ├── features/
│       │   ├── pages/
│       │   ├── services/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
├── backend/
│   ├── supabase/
│   │   ├── migrations/
│   │   ├── functions/
│   │   ├── seed.sql
│   │   └── config.toml
│   └── README.md
├── docs/
│   └── MyLanundry_PRD.md
├── .gitignore
└── README.md
```

Struktur ini adalah target organisasi repositori. Penyesuaian boleh dilakukan sesuai kebutuhan konfigurasi proyek.

# 10. UI/UX Flow

## 10.1 Navigasi Pelanggan

Navigasi utama mobile:
- Beranda
- Cari Laundry
- Pesanan
- Profil

## 10.2 Daftar Layar Pelanggan

| Layar | Isi utama | Aksi |
|---|---|---|
| Splash / onboarding | Identitas dan pengenalan aplikasi | Lanjut |
| Login | Email dan kata sandi | Masuk |
| Registrasi | Nama, email, kata sandi | Buat akun |
| Beranda | Pencarian, lokasi/area, outlet pilihan | Cari atau pilih outlet |
| Hasil pencarian | Daftar outlet, filter sederhana | Buka outlet |
| Detail outlet | Informasi outlet, layanan, harga, estimasi | Pilih layanan |
| Form pesanan | Layanan, kuantitas, metode penyerahan, alamat | Lanjut |
| Ringkasan pesanan | Item, estimasi biaya, tanggal layanan, kapasitas, metode pembayaran | Konfirmasi |
| Pembayaran simulasi | Instruksi dan status pembayaran simulasi | Selesaikan simulasi sebelum 15 menit |
| Pesanan berhasil | Nomor pesanan dan status awal | Lihat pesanan |
| Daftar pesanan | Pesanan aktif dan riwayat | Buka detail |
| Detail/pelacakan pesanan | Status, ringkasan biaya, riwayat status | Pantau pesanan |
| Persetujuan biaya | Estimasi awal dan biaya aktual | Setujui atau tolak |
| Komplain | Form alasan dan bukti | Ajukan dalam 1 jam setelah pesanan selesai |
| Ringkasan pembayaran | Status pembayaran, komisi/payout simulasi | Lihat detail transaksi yang relevan |
| Ulasan | Rating dan komentar | Kirim ulasan |
| Profil | Data pelanggan dan alamat | Edit profil |

## 10.3 Navigasi Dashboard Mitra

- Login.
- Ringkasan.
- Pesanan masuk.
- Detail pesanan.
- Pengelolaan layanan dan harga.
- Profil outlet.
- Riwayat pesanan.

## 10.4 Flow Ringkas Pelanggan

```text
Mulai
  |
  v
Login / Registrasi
  |
  v
Beranda dan Pencarian
  |
  v
Pilih Outlet
  |
  v
Pilih Layanan
  |
  v
Isi Detail Pesanan
  |
  v
Lihat Estimasi Biaya
  |
  v
Konfirmasi Pesanan
  |
  v
Reservasi Kapasitas (kg/tanggal)
  |
  +---- Digital: pembayaran simulasi dalam 15 menit
  |        +---- Belum terverifikasi -> Kedaluwarsa + kapasitas dilepas
  |
  +---- Tunai: keputusan mitra dalam 30 menit
  |        +---- Tidak direspons -> Kedaluwarsa + kapasitas dilepas
  |
  v
Diterima Mitra
  |
  +---- Biaya berubah ----> Persetujuan Pelanggan
  |                            |
  |                            v
  |                       Lanjut / Batalkan
  v
Pengerjaan
  |
  v
Siap Diambil / Diserahkan
  |
  v
Selesai
  |
  v
Masa Komplain 1 Jam
  |
  +---- Komplain terbuka -> Payout ditahan sampai resolusi
  |
  +---- Tanpa komplain -> Payout simulasi otomatis + hitung komisi
  |
  v
Beri Ulasan
```

## 10.5 Prinsip UI/UX

- Gunakan Bahasa Indonesia yang konsisten.
- Tampilkan harga dan jenis satuan dengan jelas.
- Bedakan estimasi biaya dari biaya final.
- Tampilkan status pesanan dan waktu pembaruan.
- Sediakan loading, empty state, error state, dan konfirmasi tindakan penting.
- Minta izin lokasi hanya saat dibutuhkan. Jika izin ditolak, sediakan pencarian berdasarkan area atau alamat.
- Jangan menyatakan lokasi atau status kurir secara real-time jika fitur tersebut belum tersedia.
- Berikan konfirmasi sebelum pembatalan atau tindakan yang mengubah pesanan.

# 11. Strategi Pengujian

## 11.1 Unit Test
- Perhitungan subtotal dan total.
- Validasi kuantitas dan harga.
- Validasi transisi status.
- Validasi aturan rating.
- Perhitungan komisi 4–6% dan pembulatan uang.
- Tenggat pembayaran 15 menit, respons mitra tunai 30 menit, dan masa komplain 1 jam.
- Reservasi kapasitas atomik dan pelepasan idempoten.

## 11.2 Integration Test
- Registrasi dan login.
- Pembuatan pesanan beserta item.
- Perubahan status beserta riwayat.
- Persetujuan perubahan biaya.
- Reservasi dan pelepasan kapasitas.
- Pembayaran/payout simulasi dan ledger komisi.
- Pengajuan komplain dan pemblokiran payout.
- Penyimpanan dan pembacaan ulasan.

## 11.3 Security Test
- Pelanggan mencoba membaca pesanan pengguna lain.
- Mitra mencoba mengubah pesanan outlet lain.
- Klien mencoba mengirim total biaya palsu.
- Pengguna mencoba mengubah status ke transisi yang tidak diizinkan.
- Mitra mencoba mengakses outlet atau pesanan mitra lain.
- Pelanggan mencoba memalsukan status pembayaran atau payout.

## 11.4 Acceptance Test
- Pelanggan dapat menemukan outlet dan membuat pesanan valid.
- Mitra dapat menerima dan memproses pesanan.
- Pelanggan dapat melihat perubahan status.
- Pelanggan dapat menyelesaikan pesanan dan memberikan ulasan.
- Seluruh batas akses berjalan sesuai peran.

# 12. Risiko dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Ruang lingkup melebar | Prioritaskan fitur MVP dan tunda fitur lanjutan |
| Data antarperan bocor | Terapkan dan uji RLS pada semua tabel terkait |
| Harga berubah setelah pesanan dibuat | Simpan snapshot harga dan validasi biaya final |
| Status pesanan tidak konsisten | Validasi transisi di server dan simpan riwayat secara atomik |
| Lokasi pengguna tidak tersedia | Sediakan pencarian berdasarkan nama atau area |
| Pembayaran simulasi dianggap transaksi nyata | Labeli seluruh alur sebagai simulasi; jangan menerima/menahan uang sungguhan pada MVP |
| Reservasi kapasitas ganda | Gunakan transaksi/locking dan uji checkout bersamaan |
| Pembayaran terlambat setelah kedaluwarsa | Catat untuk rekonsiliasi/refund; jangan abaikan notifikasi |
| Payout atau komisi tercatat ganda | Gunakan idempotency key dan ledger append-only |
| Komplain tidak mencapai kesepakatan | Tetapkan kebijakan default dan tenggat penyelesaian sebelum integrasi nyata |
| Pembayaran simulasi perlu dibedakan dari transaksi nyata | Pada MVP, tandai jelas sebagai simulasi; integrasi nyata membutuhkan webhook tervalidasi |
| Mitra terlambat memperbarui status | Tampilkan waktu pembaruan terakhir dan sediakan riwayat status |

# 13. Asumsi dan Hal yang Belum Diputuskan

Hal-hal berikut masih perlu diputuskan sebelum implementasi terkait dianggap final:

1. **Wilayah peluncuran:** kota/kecamatan yang dipakai untuk MVP.
2. **Tarif komisi final:** rentang sasaran 4–6%; 5% hanya default sementara. Konfirmasi angka final sebelum implementasi produksi.
3. **Dasar komisi final:** apakah biaya pickup/pengantaran, diskon, pajak, atau biaya gateway masuk ke dasar komisi; rancangan awal menghitung dari nilai jasa final saja.
4. **Penolakan kenaikan harga:** apa yang terjadi jika pelanggan menolak atau tidak merespons—pembatalan, negosiasi, atau penyelesaian sesuai estimasi awal jika memungkinkan.
5. **Tenggat persetujuan harga:** berapa lama pelanggan diberi waktu untuk menyetujui perubahan harga.
6. **Komplain tanpa kesepakatan:** prosedur default, tenggat, dan kondisi refund/kompensasi tanpa role Admin.
7. **Pembayaran terlambat:** kebijakan final jika pembayaran diterima setelah pesanan kedaluwarsa, termasuk refund dan rekonsiliasi.
8. **Refund pesanan tunai:** cara mitra mengembalikan uang dan bagaimana komisi/tagihan disesuaikan.
9. **Kapasitas untuk layanan per item:** bagaimana layanan per item dikonversi menjadi kebutuhan kapasitas kilogram; jika tidak relevan, tentukan aturan kapasitas terpisah.
10. **Biaya pickup/pengantaran:** format biaya, batas area, dan apakah biaya ini dikecualikan dari komisi.
11. **Kegagalan payout simulasi:** jumlah retry, kapan payout menjadi `failed`, dan cara koreksi ledger.
12. **Verifikasi mitra:** MVP tidak memiliki Admin; jika verifikasi identitas diperlukan, mekanismenya harus ditentukan di luar persetujuan Admin dalam aplikasi.
13. **Versi minimum Android, desain visual final, dan metode deployment.**

## 13.1 Batasan Pembayaran MVP

Pembayaran, komisi, ledger, refund, dan payout pada MVP adalah simulasi untuk kebutuhan akademik. Sistem tidak boleh menyatakan dana sungguhan telah ditahan atau dicairkan. Integrasi produksi harus menggunakan penyedia pembayaran berizin yang secara eksplisit mendukung kebutuhan marketplace, settlement/payout, refund, dan ketentuan penahanan dana yang sesuai. Jangan menyimpan secret key pada aplikasi mobile atau dashboard web.

# 14. Definition of Done

Proyek MVP dinyatakan siap untuk demonstrasi tugas akhir jika:
- Fitur wajib telah diimplementasikan.
- Skema database dan migration tersedia di repositori.
- RLS dan hak akses setiap peran telah diuji.
- Alur pemesanan dari pelanggan hingga selesai berfungsi.
- Perhitungan biaya dan perubahan status konsisten.
- Unit test dan integration test utama lulus.
- Tidak ada secret key di repositori atau bundle klien.
- README menjelaskan cara instalasi, konfigurasi environment, migrasi, seed data, dan pengujian.
- Batasan fitur yang belum dibuat dicantumkan dalam dokumentasi.

---

**Akhir dokumen PRD MyLanundry versi 1.2.**
