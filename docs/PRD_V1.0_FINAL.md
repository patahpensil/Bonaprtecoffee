# Product Requirements Document — Bonaparte
Versi 1.0 FINAL | 18 November 2026 | Disahkan pemilik dalam percakapan proyek

## 1. Tujuan dan lingkup
Satu perusahaan multi-outlet dengan website promosi publik, POS tablet Android/iPad, dashboard internal, pembelian dan distribusi bahan terpusat, HPP resep, laporan operasional dan WhatsApp Takeaway. Website V7 tetap dalam evaluasi visual. Tidak ada checkout publik, akun pelanggan, pelayan khusus, shift, kredit pelanggan, EDC, loyalty, atau general ledger lengkap. Pengembangan dan deployment produksi memerlukan otorisasi terpisah.

## 2. Register keputusan
K-01 sampai K-28 berstatus APPROVED. Parameter teknis tambahan adalah usulan baseline untuk SAD, bukan keputusan bisnis yang telah disahkan.

| ID | Ketentuan |
|---|---|
| K-01 | Username/password, akun dibuat petugas berwenang, tanpa signup publik atau OTP/MFA wajib; satu akun bersama kasir per outlet. |
| K-02 | POS browser tablet Android/iPad. |
| K-03 | Tunai, QRIS, transfer; pembayaran gabungan/split bill, tanpa EDC/tempo pelanggan. |
| K-04 | Bayar sebelum atau setelah pelayanan; tambahan pesanan diperbolehkan. |
| K-05 | Online/offline untuk transaksi lokal; batas kemampuan eksternal dinyatakan. |
| K-06 | Printer thermal LAN/Wi-Fi kasir dan dapur; makanan otomatis, minuman tidak tercetak di dapur. |
| K-07 | Kasir membatalkan pesanan belum dibayar sesuai kewenangan; pembatalan dibayar/refund perlu Admin berwenang atau Super Admin. |
| K-08 | Moving Weighted Average per outlet. |
| K-09 | Accrual basis untuk laporan operasional. |
| K-10 | Harga pusat, override outlet, snapshot harga historis. |
| K-11 | Hak Admin dikonfigurasi Super Admin per outlet/modul/aksi. |
| K-12 | Buka/tutup kas harian tanpa shift dan tanpa approval rutin. |
| K-13 | Printer wajib, KDS makanan opsional diaktifkan Super Admin. |
| K-14 | Tidak ada akun pelayan. |
| K-15 | Website promosi, katalog read-only terintegrasi, login staf; tanpa checkout publik. |
| K-16 | Diskon nominal/persen, promo terjadwal, bundling, happy hour, buy-one-get-one; tanpa loyalty. |
| K-17 | Backup harian retensi 90 hari, PITR 14 hari, target RPO 15 menit/RTO 8 jam, enkripsi dan restore drill. |
| K-18 | Pajak opsional per outlet oleh Super Admin, inclusive/exclusive, terpisah dari HPP. |
| K-19 | Koreksi selisih opname disetujui Admin berwenang/Super Admin; pemakaian rutin tanpa approval. |
| K-20 | Satu otoritas transaksi offline per outlet, tanpa failover otomatis; usulan izin offline maksimal 72 jam. |
| K-21 | Gateway lokal ringan untuk cetak, KDS dan cadangan antrean; kompatibilitas wajib dibuktikan. |
| K-22 | Verifikasi QRIS/transfer melalui kanal resmi merchant/bank, rekonsiliasi referensi dan saldo. |
| K-23 | Distribusi pusat dua tahap, penerimaan sebagian/selisih, tanpa approval rutin. |
| K-24 | Pembelian tunai/sebagian/tempo, utang pemasok, retur dan pelunasan. |
| K-25 | Waste, kerusakan, kedaluwarsa, batch dan FEFO; valuasi MWA. |
| K-26 | Sesi, perangkat dan pemulihan akun aman; usulan auto-lock 5 menit, idle 30 menit, absolut online 12 jam; otorisasi offline terpisah. |
| K-27 | Tutup periode bulanan, biaya pusat dan alokasi terdokumentasi, koreksi periode tertutup berotorisasi. |
| K-28 | WhatsApp Business Platform semi otomatis: inbox POS, kasir menyusun dan mengonfirmasi pesanan, makanan otomatis ke dapur, notifikasi pelanggan sesuai kebijakan API. |

## 3. Modul dan persyaratan
Setiap ID MOD adalah baseline traceability; kriteria penerimaan terpisah dari hasil pengujian.

### MOD-01 — Website publik
Logo asli, hero video V7 berulang, playback 0,60 seluruh video (bukan selektif), reduced-motion, navigasi Beranda/Menu/Tentang/Lokasi, login staf, footer logo sosial dan kredit Made with Patah Pensil. Katalog hanya menu aktif dan harga outlet yang ditentukan, tanpa HPP atau data internal. Alamat Rappang sesuai data pemilik; tautan sosial, nomor WA bisnis, jam operasional dan katalog wajib diverifikasi sebelum tayang. CTA WhatsApp membuka kanal komunikasi, bukan checkout. Responsif, keyboard accessible, SEO metadata, sitemap, canonical, gambar optimal, poster fallback; target WCAG 2.2 AA dan Core Web Vitals diuji pada perangkat representatif. Tidak menggunakan foto profil Google; aset asli/berizin. Visual final memerlukan persetujuan pemilik. Keputusan pemilik: autoplay dan loop, muted, tanpa zoom tambahan atau tombol jeda pada hero; kontrol animasi di footer dan preferensi reduced-motion. Uji browser nyata tetap menjadi gate sebelum tayang.

### MOD-02 — Autentikasi
Username/password, Argon2id, rate limiting, cookie Secure/HttpOnly/SameSite, CSRF, rotasi dan revokasi sesi, pemulihan identitas Super Admin melalui prosedur terdokumentasi. Tidak ada password plaintext atau token jangka panjang di localStorage. Izin offline khusus perangkat, unlock lokal aman, batas masa berlaku tidak dapat diperpanjang offline. Sesi online dan izin offline berbeda; logout tidak menghapus antrean. MFA opsional untuk admin.

### MOD-03 — Pengguna dan RBAC
Lima peran: Super Admin, Admin, Kasir, Petugas Belanja, Petugas Dapur. Deny by default dan scope outlet pada setiap query serta aksi; Admin tidak dapat menaikkan hak sendiri atau delegasi di luar kewenangan. Audit akun/perangkat/sesi, bukan identitas manusia kasir bersama. Persetujuan sensitif tidak boleh dilakukan pengaju yang sama. Akses vendor teknis terpisah dan terbatas; tidak merupakan peran operasional tambahan.

### MOD-04 — Outlet
Pusat sebagai penerima pembelian dan pemasok internal; cabang mengambil bahan. Konfigurasi outlet, printer, meja, zona waktu Asia/Makassar, perangkat, harga, pajak dan KDS. Nonaktifkan tanpa menghapus sejarah, selesaikan saldo/transaksi tertunda sebelum penonaktifan.

### MOD-05 — Master menu
Kategori makanan/minuman, produk, varian, modifier, catatan, foto, status aktif/tersedia per outlet. Produk historis tidak dihapus. Routing produksi berdasarkan atribut master yang disnapshot pada item; kategori minuman tidak pernah masuk tiket dapur.

### MOD-06 — Harga
Harga pusat dan override outlet; histori efektif, audit, validasi nominal, snapshot harga/varian/modifier pada konfirmasi. Perubahan harga tidak mengubah pesanan terdahulu; tambahan item memakai aturan harga saat ditambahkan dan dikonfirmasi. Kasir melihat total sebelum konfirmasi.

### MOD-07 — POS
Dine-in dan takeaway, sumber order kasir/WhatsApp terpisah dari fulfillment_type. Draft, konfirmasi, tambahan, catatan per item, produksi, pembatalan, nomor unik per outlet dan UUID global. Pesanan tersimpan dulu, outbox produksi atomik. Tidak ada pengurangan stok otomatis dari penjualan. Perubahan draft boleh; setelah konfirmasi gunakan amendment atau reversal dengan audit. Offline hanya dengan otoritas yang sah.

### MOD-07.01 — WhatsApp Takeaway (K-28)
Pesan melalui API resmi Meta dan HTTPS webhook; autentikasi signature atas raw body, cocokkan WABA/phone_number_id yang terdaftar, durable inbox sebelum ACK sukses, deduplikasi scope akun+ID pesan, proses asynchronous, retry/dead-letter dan monitoring. Inbox percakapan berisi beberapa pesan; satu pesan bukan satu pesanan. Kasir menetapkan outlet, nama/kontak seperlunya, menu, kuantitas, modifier, catatan, jadwal pickup dan imbalan pembayaran. Draft mempunyai ID sendiri, conversation_id dan hubungan pesan; konfirmasi atomik dengan idempotency key dan version check. Pesan masuk tidak pernah otomatis memicu produksi. Pesanan tambahan memakai amendment; jangan membuat ulang order yang sudah dikonfirmasi melalui retry. Makanan tercetak otomatis setelah konfirmasi dan penyimpanan; minuman hanya antrean kasir/barista melalui peran yang sudah ada. Jadwal pickup tampil di tiket; penundaan produksi otomatis belum menjadi persyaratan, kasir mengonfirmasi saat siap mulai produksi. Ready hanya jika semua item siap. Notifikasi konfirmasi/siap via outbox, template dan dasar izin sesuai kebijakan Meta saat implementasi; kegagalan notifikasi tidak membatalkan pesanan. Status pesan terpisah dari pesanan, produksi, pengambilan, pembayaran dan refund. Tidak ada akses pelanggan ke POS; nomor WA tidak dicetak di dapur. No-show ditandai dan diselesaikan sesuai K-07; kebijakan uang muka/forfeit belum disahkan, tidak dipotong otomatis. Media yang belum didukung ditandai dan tidak diabaikan diam-diam; kasir meminta konfirmasi teks. Internet diperlukan untuk pesan baru dan pengiriman notifikasi. Order tersimpan dapat dilanjutkan offline. Routing nomor pusat vs per outlet belum ditetapkan; default rancangan mendukung keduanya, pesan tanpa outlet masuk antrean belum ditugaskan hanya untuk petugas berwenang. Nomor, biaya, akun Meta, izin dan template adalah readiness gate live.

### MOD-08 — Meja
Satu sesi aktif per meja, status meja terpisah dari item/order/bill; pindah/gabung meja hanya melalui aksi atomik berotorisasi bila diimplementasikan, tidak wajib V1. Sesi selesai setelah pelayanan dan pelunasan atau penyelesaian pembatalan sah; tambahan pesanan pada sesi terbuka tidak mengubah pembayaran terdahulu.

### MOD-09 — Pembayaran
Split berdasarkan item atau nominal; alokasi tidak boleh melebihi saldo, jumlah seluruh alokasi sama dengan pembayaran. Cash change bukan pendapatan. QRIS/transfer hanya sukses setelah konfirmasi dana resmi; screenshot pelanggan bukan bukti tunggal. Referensi pembayaran unik dalam scope kanal/merchant jika tersedia, lainnya masuk rekonsiliasi manual; transaksi pending bukan lunas. Refund parsial/penuh terkait pembayaran asli, maksimum sisa refundable, audit alasan dan otorisasi online; refund tidak otomatis restock. Pembayaran sebelum pelayanan adalah penerimaan di muka untuk laporan accrual. Tidak ada kredit pelanggan; penyelesaian outstanding/no-show dengan prosedur yang sah, bukan piutang pelanggan rutin.

### MOD-10 — Printer dan KDS
Gateway lokal autentikasi perangkat, TLS/secure origin, pairing, jaringan tersegmentasi, antrean tahan restart, deduplikasi job ID, status queued/sent/confirmed/unknown/failed. ACK jaringan bukan bukti kertas tercetak; status ambigu memerlukan pemeriksaan operator sebelum retry. SALINAN untuk cetak ulang, tiket tambahan dan pembatalan hanya item terkait. KDS makanan opsional, status baru/diproses/siap, replay event, tidak menghambat printer; minuman tidak tercetak. Uji fisik Android/iPad dan printer/gateway wajib.

### MOD-11 — Kas harian
Satu sesi kas aktif per outlet, tanpa shift, modal awal, kas masuk/keluar, pembayaran tunai, refund, setoran/penarikan bukan biaya, hitung fisik, alasan selisih. Business date ditetapkan saat buka kas; lintas tengah malam tidak otomatis memecah sesi. Tutup offline provisional; final setelah sync dan rekonsiliasi, tanpa approval rutin. Koreksi melalui catatan baru, bukan edit sejarah.

### MOD-12 — Pembelian
Petugas belanja pusat mencatat supplier, invoice, penerimaan aktual, harga, kuantitas, batch, biaya langsung terkait perolehan; penerimaan parsial didukung. Utang diakui berdasarkan kewajiban aktual, pembayaran sebagian/tempo, jatuh tempo, referensi, retur terkait dokumen asal. Jangan menghitung invoice ulang saat pelunasan. Selisih invoice dan penerimaan direkonsiliasi; pembayaran berlebih dicatat sebagai uang muka/klaim, tidak utang negatif tanpa penjelasan. Tidak ada persetujuan pembelian rutin.

### MOD-13 — Persediaan
Ledger mutasi append-only per outlet/bahan; saldo tidak boleh negatif. Satuan kg, g, L, mL, kaleng, botol, unit. Satuan dasar g/mL/unit sesuai dimensi; kemasan memiliki faktor konversi positif spesifik bahan dan ukuran, dapat menyimpan kemasan utuh dan sisa. Tidak ada konversi massa-volume tanpa faktor densitas tervalidasi spesifik bahan; konversi disnapshot. MWA = (nilai awal + nilai masuk)/(kuantitas awal + kuantitas masuk), pengeluaran memakai nilai rata-rata saat posting. Decimal presisi ditentukan SAD, rounding residual direkonsiliasi. Kunci mutasi per outlet/bahan, urutan posting server; offline penjualan tidak mengubah stok, mutasi inventori otoritatif online sebagai usulan kontrol. Tidak menerima backdate yang mengubah sejarah tanpa koreksi berotorisasi. Batch FEFO untuk bahan relevan. Minimum stok dapat dikonfigurasi per bahan/outlet dan memicu indikator laporan. Pemakaian/waste rutin dicatat petugas dapur; kehilangan/koreksi perlu approval K-19. Tidak ada double count waste pada biaya bahan dan beban.

### MOD-14 — Distribusi
Pusat dispatch, saldo dan nilai pindah ke in-transit, penerima berwenang konfirmasi qty aktual per item; penerimaan parsial menyisakan in-transit. Tidak ada internal revenue atau markup. Selisih/rusak didokumentasi, koreksi selisih disetujui; reversal/retur berdasarkan mutasi asli. Tidak dapat menerima lebih dari sisa kiriman. Dispatch dan receive idempotent dan atomik, MWA tujuan dihitung ulang saat penerimaan.

### MOD-15 — Stock opname
Snapshot dan versi ledger pada waktu hitung; bila ada pergerakan selama hitung, rebase delta hanya jika dapat dibuktikan terkait waktu fisik; jika tidak, hitung ulang. Approval online oleh petugas berwenang selain pengaju. Tidak ada overwrite saldo. Selisih dan alasan, mutasi koreksi dan nilai terdokumentasi. Hitung kaleng/botol utuh dan isi tersisa dengan satuan dasar.

### MOD-16 — HPP
Resep semua makanan/minuman dan varian/modifier yang relevan, kuantitas dasar, konversi, versi, biaya estimasi menggunakan MWA outlet atau biaya referensi yang dilabeli. HPP = jumlah kuantitas resep x biaya per satuan; margin harga neto dikurangi HPP. Tidak termasuk kalkulasi pajak, tidak mengurangi stok. Laporan teoritis terpisah dari pemakaian aktual. Harga belum tersedia ditandai, bukan diasumsikan nol.

### MOD-17 — Promosi
Nominal/persen per item/transaksi, bundling, happy hour, buy-one-get-one, scope outlet dan periode. Aturan prioritas eksplisit, default tidak stacking; tie-break stabil, validasi eligibility dan batas diskon tidak melebihi harga. Alokasi proporsional dengan remainder deterministik untuk split/refund. Harga final disnapshot; promo offline hanya versi cache valid dan waktu terpercaya, jika tidak valid blok promo. Peringatan margin negatif, hak diskon kasir dikonfigurasi.

### MOD-18 — Keuangan dan pajak
Accrual operasional: pendapatan setelah pelayanan/pengambilan; pembayaran awal liability operasional, penerimaan dana bukan pendapatan kedua. Persediaan yang belum dipakai tetap aset; pemakaian normal dan waste normal menjadi biaya, abnormal dipisah; biaya langsung dan pusat tidak dihitung ganda. Refund/pembatalan terkait periode asli dengan adjustment periode terbuka jika sudah ditutup, atau reopen Super Admin dengan audit. Penutupan bulanan setelah rekonsiliasi dan pemeriksaan antrean offline; dilarang silent backdate. Alokasi pusat opsional berdasarkan driver terdokumentasi, jumlah alokasi sama dengan biaya sumber dan konsolidasi eliminasi internal. Pajak per outlet diaktifkan Super Admin, versi tarif efektif, inclusive/exclusive; decimal dan remainder yang dapat direkonsiliasi, pajak bukan omzet, refund memakai snapshot asli. Verifikasi jenis pajak, tarif, kewajiban dan format struk sebelum aktif; toggle bukan pembebasan hukum. Bukan general ledger atau laporan kepatuhan pajak lengkap.

### MOD-19 — Dashboard dan laporan
Penjualan, pembayaran, kas, stok/valuasi, distribusi, pembelian/utang, HPP estimasi vs aktual, waste, pajak, laba rugi per outlet/konsolidasi, arus kas operasional, monitoring integrasi. Filter business date/outlet, data as-of dan status offline/provisional; ekspor PDF/XLSX sesuai RBAC, sanitasi formula spreadsheet. Audit akses ekspor sensitif. Angka dapat ditelusuri ke dokumen sumber.

### MOD-20 — Sistem, keamanan dan pemeliharaan
PostgreSQL sebagai ledger pusat; satu otoritas kasir utama per outlet untuk write POS, perangkat tambahan hanya write melalui otoritas itu, bukan jalur independen saat partisi. Server menolak write yang melanggar epoch/fencing; tidak ada failover otomatis hanya karena timeout. Handover setelah rekonsiliasi terbukti atau prosedur insiden pemilik; jika data tidak diketahui, freeze domain terdampak dan investigasi. Antrean lokal persisten, UUID, idempotency key + payload hash, atomic outbox, sync berurutan, conflict quarantine, acknowledgement durable, backup lokal terenkripsi ke gateway; jika media penuh/rusak atau durability tidak terpenuhi, hentikan penerimaan transaksi baru dan beri prosedur kontinjensi. Tidak menjamin zero data loss jika tablet dan gateway hilang bersama. Backup pusat RPO 15 menit/RTO 8 jam belum mencakup data belum sync; uji terpisah. Audit append-only, log tanpa secret/PII berlebih, monitoring, alert, dependency/secret scanning, restore drill, incident response. Usulan retensi transaksi 10 tahun, audit 24 bulan, log teknis 90 hari, log keamanan 12 bulan, data percakapan minimum kebutuhan; validasi legal dan kebijakan sebelum produksi. Penulisan kode Inggris, UI Indonesia, tanpa watermark AI, lisensi tetap dipatuhi.

## 4. Matriks kewenangan
A = akses berwenang; C = dikonfigurasi Super Admin; S = hanya scope outlet/tugas; — = tidak ada. Hak baca finansial terpisah dari hak tulis. Super Admin bukan akses infrastruktur tanpa batas.

| Aksi | Super Admin | Admin | Kasir | Belanja | Dapur |
|---|---|---|---|---|---|
| Kelola izin/outlet/pajak/KDS | A | — | — | — | — |
| Master menu/harga/promo | A | C | baca S | — | baca S |
| POS, inbox WA, pembayaran, kas | A | C | S | — | — |
| Batalkan belum bayar | A | C | S | — | — |
| Approve refund dibayar | A | C | — | — | — |
| Pembelian pusat/retur/utang | A | C | — | S sesuai tugas | — |
| Dispatch/penerimaan | A | C | — | S | S penerimaan |
| Pemakaian/waste rutin | A | C | — | — | S |
| Hitung opname/ajukan koreksi | A | C | — | S | S |
| Approve koreksi | A | C | — | — | — |
| HPP/laporan finansial | A | C | — | — | — |
| KDS/status makanan | A | C | S baca/status sesuai tugas | — | S |
| Reopen periode | A | — | — | — | — |

## 5. Arsitektur kandidat (SAD belum disahkan)
Website publik terpisah dari POS dan dashboard Next.js/TypeScript/PWA; backend NestJS/TypeScript modular monolith, PostgreSQL, pooler, WebSocket, object storage, Cloudflare security edge, repo privat/GitHub Actions. Gateway lokal bukan pengganti ledger pusat. IndexedDB hanya kandidat; PoC wajib membuktikan persistensi dan komunikasi secure-origin Android/iPad. Public API DTO allowlist dan privasi terpisah. Upload foto memvalidasi tipe konten aktual, ukuran, metadata dan menyimpan di object storage terpisah. Tidak mengadopsi kode repo referensi tanpa audit lisensi. Benchmark Node HTTP/SQLite adalah proof of concept, bukan stack produksi.

## 6. Release gates dan penerimaan
RTM terlampir: setiap modul dan keputusan dilacak. Semua UAT produk berstatus NOT_RUN; dua tes benchmark tidak menggantikan UAT. Sebelum implementasi penuh: persetujuan PRD, SAD, prototype otoritas offline dan printer (termasuk kegagalan/partisi), spesifikasi ledger/rounding, threat model. Sebelum produksi: UAT seluruh fitur, ASVS Level 2 baseline dengan kontrol transaksi tambahan, uji race/TOCTOU/idempotency, cross-outlet, XSS/CSRF/injection, auth/session, dependency, backup restore, pengujian tablet dan aksesibilitas, legal/pajak/privasi, Meta live dan verifikasi nomor, SOP pembayaran/no-show, persetujuan visual website dan deployment. Target performa dan kapasitas numerik ditetapkan SAD setelah jumlah outlet/perangkat dan beban diketahui; tidak mengarang SLA. Tidak boleh ada temuan kritis/tinggi keamanan atau integritas data yang belum ditangani pada release.

## 7. Pengesahan
Pemilik telah mengesahkan RC2 menjadi V1.0 FINAL dan seluruh K-01–K-28; seluruh temuan audit dan risiko residual wajib ditangani. SAD diperintahkan tanpa deployment. Penerimaan risiko akun kasir bersama dan ketergantungan infrastruktur dicatat. Tidak ada otorisasi otomatis pembelian perangkat, deployment, commit/push atau aktivasi Meta. Perubahan setelah persetujuan melalui change request dan versi baru.