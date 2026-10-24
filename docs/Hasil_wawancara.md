# Rangkuman Hasil Wawancara Calon Pengguna
## MyLanundry — Laundry Marketplace

**Acuan:** PRD MyLanundry versi 1.2  
**Metode:** Wawancara semi-terstruktur  
**Responden:** 2 pelanggan dan 1 mitra laundry  
**Status:** Rangkuman berdasarkan catatan yang diberikan

## 1. Tujuan Wawancara

- Memahami kebiasaan dan masalah pelanggan saat menggunakan jasa laundry.
- Mengetahui kendala mitra dalam mengelola operasional laundry.
- Menentukan kebutuhan yang perlu dipertimbangkan dalam pengembangan MyLanundry.

## 2. Ringkasan per Responden

### P-01 — Putih Zuknia Fahma (Pelanggan)

- **Pengalaman:** Layanan di outlet langganan dekat kos umumnya memuaskan, tetapi pernah mengalami pakaian hilang yang tidak ditemukan meskipun sudah dicari beberapa hari.
- **Pemilihan outlet:** Membandingkan outlet dengan tarif Rp3.000/kg dan Rp5.000/kg. Menurut catatan, kualitas kebersihan dinilai seimbang, sementara outlet yang lebih mahal relatif lebih cepat. Layanan express dikenakan biaya tambahan.
- **Kendala:** Keterlambatan dari waktu yang dijanjikan dan informasi keterlambatan yang baru disampaikan ketika pelanggan tiba di outlet.
- **Kebutuhan:** Kejelasan harga per kilogram dan biaya express, informasi kualitas/reputasi outlet, keamanan pakaian, serta layanan antar-jemput.

### P-02 — Hilman (Pelanggan)

- **Pengalaman:** Menggunakan laundry untuk pakaian kerja melalui WhatsApp dengan layanan jemput. Hasil dinilai rapi, tetapi penjemputan mundur dari perkiraan sehingga jadwal perlu disesuaikan.
- **Pemilihan outlet:** Mempertimbangkan ulasan, ketepatan waktu, layanan antar-jemput, dan harga yang sepadan dengan layanan; tidak selalu memilih yang termurah.
- **Kendala:** Jadwal pickup/pengantaran yang tidak jelas dan pengalaman menerima pakaian tertukar, sehingga proses konfirmasi merepotkan.
- **Kebutuhan:** Estimasi selesai, jadwal dan wilayah antar-jemput, total biaya, status pesanan, riwayat transaksi, rincian pembayaran, dan komplain dengan bukti foto. Responden juga mengharapkan waktu komplain yang cukup untuk memeriksa pakaian.

### M-01 — Mbo Wiji (Mitra Laundry)

- **Proses saat ini:** Pesanan datang langsung atau melalui WhatsApp. Data pelanggan, jenis layanan, berat, dan estimasi selesai dicatat di nota. Pakaian diberi penanda, pelanggan dihubungi saat selesai, dan status pembayaran dicatat.
- **Kendala operasional:** Saat pesanan ramai, pencatatan dan pembaruan informasi dapat tertinggal. Antrean layanan biasa dan express perlu diatur; mesin bermasalah atau staf tidak masuk dapat menyebabkan keterlambatan.
- **Harga dan kapasitas:** Harga ditentukan berdasarkan jenis layanan dan biaya operasional. Kapasitas diperkirakan dari antrean, mesin, dan staf, tetapi belum dicatat secara teratur setiap hari.
- **Penanganan masalah:** Perubahan harga dijelaskan kepada pelanggan sebelum diproses. Jika terlambat, pelanggan diberi tahu penyebab dan estimasi baru. Komplain diperiksa berdasarkan nota dan kondisi pakaian; cucian kurang bersih dapat ditawarkan untuk dicuci ulang.
- **Kebutuhan:** Daftar pesanan, status pengerjaan dan pembayaran, pengaturan kapasitas, serta catatan persetujuan perubahan harga.

## 3. Temuan Utama Lintas Responden

| Tema | Rangkuman temuan |
|---|---|
| Transparansi harga & timbangan | Pelanggan dan mitra sepakat bahwa berat di awal hanya perkiraan. Penagihan langsung di muka sebelum cucian ditimbang riil rawan menimbulkan selisih dan sengketa. Alur ideal: pesanan dibuat dengan estimasi berat, mitra menimbang ulang saat pakaian diterima, menerbitkan harga pasti/fix, baru kemudian pelanggan mengonfirmasi pembayaran. |
| Kepastian jadwal dan status | Pelanggan mengalami keterlambatan atau perubahan jadwal tanpa informasi yang cukup. Status dan estimasi perlu mudah dilihat secara live. |
| Keamanan pakaian | Catatan pelanggan mencakup pakaian hilang dan tertukar. Pencatatan catatan khusus serta penandaan pakaian menjadi area yang sangat krusial. |
| Pickup dan pengantaran | Jadwal penjemputan yang mundur dapat mengganggu aktivitas pelanggan; informasi preferensi jam penjemputan perlu jelas. |
| Operasional mitra | Pencatatan berbasis nota/WhatsApp manual menyulitkan pengelolaan. Fitur penimbangan digital langsung di dashboard mempermudah penetapan harga fix tanpa salah hitung. |
| Komplain | Pelanggan menginginkan cara menyampaikan komplain yang mudah dan dapat menyertakan bukti pendukung dalam batas waktu wajar. |

## 4. Rekomendasi untuk PRD MyLanundry

| Rekomendasi |
|---|
| **Prioritas sangat tinggi (Alur Timbangan & Pembayaran):** Terapkan mekanisme *Weighing-First Payment Flow*: Pelanggan membuat pesanan dengan estimasi berat -> Outlet menerima & menimbang ulang cucian -> Sistem memunculkan harga pasti/fix -> Pelanggan melakukan konfirmasi pembayaran (QRIS/tunai) -> Pengerjaan cuci baru dimulai. |
| Tampilkan rincian tarif layanan, biaya tambahan, dan estimasi waktu secara transparan sebelum dan sesudah penimbangan ulang. |
| Sediakan status pesanan realtime dan notifikasi proaktif ketika hasil timbangan & harga fix telah terbit, cucian sedang diproses, hingga pesanan selesai. |
| **Prioritas tinggi:** Catat detail rincian pakaian dan catatan khusus pelanggan untuk membantu mencegah risiko tertukar atau hilang. |
| **Prioritas menengah:** Sediakan pilihan jadwal preferensi pickup/pengantaran dan informasi wilayah layanan yang jelas. |

## 5. Kesimpulan

Berdasarkan catatan yang diberikan, kebutuhan yang paling menonjol adalah transparansi harga, kepastian jadwal dan status, keamanan pakaian, serta kemudahan pickup/pengantaran. Dari sisi mitra, pengelolaan pesanan dan kapasitas juga menjadi perhatian. Temuan ini dapat menjadi masukan untuk meninjau fitur MyLanundry.

## Catatan Sumber dan Batasan

Rangkuman ini disusun dari catatan jawaban yang diberikan pengguna. Tidak ada jawaban tambahan yang dibuat. Rekomendasi fitur merupakan interpretasi dari catatan dan perlu dipertimbangkan bersama PRD. Identitas responden ditulis sesuai materi yang diberikan.
