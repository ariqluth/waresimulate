# PRD WareTrack — Dashboard Operasi Gudang 3D

| | |
|---|---|
| Versi | v2, draf |
| Sumber | Video demo asli WareTrack oleh Dilum Sanjaya (@DilumSanjaya, X, 3 Oktober 2026), 72 detik, 3456×1990 px. Dibagikan ulang di LinkedIn oleh Florian Bansac. Tangkapan layar 688×396 yang dipakai draf sebelumnya adalah satu frame dari video ini, sekitar detik ke-22. |
| Bahasa | Label antarmuka berbahasa Inggris, persis seperti video. Prosa persyaratan berbahasa Indonesia. |
| Versi sebelumnya | `prd-lama.md` (v1). v1.1 digantikan dokumen ini. |

## 0. Perubahan dari v1.1

| Topik | v1.1 | v2 |
|---|---|---|
| Sumber | satu frame 688×396 | video 72 detik, 3456×1990 |
| Cakupan | satu site, WH-04 | lima site dalam satu kota 3D, plus Network overview |
| Panel kanan | detail truk | inspector untuk enam jenis objek: site, truck, forklift, pallet, dock bay, charger |
| Tombol panel | pin, buka, tutup | locate ⌖, follow ↗, close × |
| Kamera | zoom dan putar, tanpa geser | geser, zoom, putar, reset, locate, follow |
| Jam | waktu nyata | jam simulasi 12× (1 menit simulasi = 5 detik nyata) |
| Data | snapshot statis | truk, forklift, dan pallet berjalan sesuai siklus. KPI ikut berubah. |
| Tab antrian default | Trucks | Docks |
| Nilai yang dulu ⚠ | — | terkonfirmasi: `2/6 docked`, `Docks 4/6`, `Forklifts 2/5`, `Sunvale Grocers`, `#SHP-78456`, `#SHP-78466`, timeline TRK-2481 |

## 1. Ringkasan produk

WareTrack adalah dashboard operasi gudang yang tampil seperti game strategi. Seluruh layar di bawah header adalah dunia 3D: sebuah kota berisi lima site gudang milik jaringan WareTrack di New Jersey.

Di dalam dunia itu:

- truk melaju di jalan kota, masuk gerbang, lalu mundur ke dock
- forklift memindahkan pallet antara truk, area staging, dan gudang
- forklift kembali ke charger saat baterainya rendah

Manajer bisa memilih site, mengklik objek apa pun untuk melihat status live-nya, dan mengikuti perjalanan kiriman satu truk. Model datanya tetap model gudang standar: sites, trucks, docks, stock, shipments, forklifts, pallets, chargers.

## 2. Masalah dan pendekatan

Software gudang biasanya berupa tabel dan dashboard yang harus dibaca satu per satu. Manajer operasi kesulitan melihat di mana masalah sedang terjadi dan ke mana harus bertindak.

Game strategi sudah memecahkan masalah serupa. Pemain memahami operasi yang rumit lewat dunia yang bisa dibaca sekilas, status live di setiap objek, dan umpan balik visual.

WareTrack meminjam pola itu tanpa menyembunyikan detail yang dibutuhkan operator: setiap objek tetap punya angka, kode, dan waktu yang presisi.

## 3. Pengguna

Operations Manager yang memantau kelima site. Header menampilkan `Alex Chen` dan `Operations Manager`.

## 4. Tujuan

Tanpa pindah halaman, manajer dapat:

1. Membaca kondisi satu site sekilas: KPI, stok, bay, forklift, dan inventory.
2. Berpindah antar lima site, atau melihat seluruh jaringan sekaligus.
3. Mengklik objek apa pun, di dunia 3D maupun di daftar, untuk melihat status live-nya.
4. Mengikuti perjalanan shipment satu truk dari order sampai diterima.
5. Mengendalikan kamera: geser, zoom, putar, fokus ke objek, dan ikuti objek yang bergerak.

## 5. Ruang lingkup

**Termasuk**

- Dunia 3D: kota beserta lima site, truk, forklift, pallet, charger, dan lalu lintas.
- Header dengan pencarian, site switcher, Network overview, pil Live, lonceng, dan profil.
- KPI per site.
- Toolbar kamera.
- Inspector untuk enam jenis objek.
- Shipment Tracking.
- Antrian dengan tab Docks, Forklifts, dan Trucks.
- Seleksi yang tersinkron di dunia 3D, daftar, inspector, dan tracking.
- Simulasi live berbasis data mock.
- State loading, kosong, dan error.

**Di luar lingkup**

- Backend dan API nyata.
- Login, kelola pengguna, menu profil.
- Panel notifikasi. Lonceng hanya tampil.
- Membuat atau mengubah data: shipment, truk, dock, forklift, pallet.
- Dispatch dan penugasan manual. v1 hanya memantau.
- Laporan historis, ekspor, mode game (XP, skor, misi).
- Aplikasi native dan tata letak mobile.

## 6. Teknologi dan data

| Aspek | Keputusan |
|---|---|
| Aplikasi | Frontend saja: React, TypeScript, Vite. |
| 3D | Three.js lewat React Three Fiber dan drei, sama dengan aslinya. Semua model dibangun prosedural dari geometri dasar, tanpa file model eksternal. Logo dan tulisan di trailer serta papan nama memakai tekstur kanvas. |
| Data | Mock lokal (§15). Tidak ada request jaringan. |
| Simulasi | Berjalan di browser (§12), deterministik berdasarkan seed. |
| Font | Inter (Google Fonts). |
| Ikon UI | Ikon garis bergaya Lucide. |
| Browser | Chrome, Edge, Firefox, dan Safari versi terbaru di desktop, dengan WebGL2. |

Ekspektasi visual: komposisi, palet, bentuk bangunan, livery truk, dan sudut kamera mengikuti video. Model prosedural boleh lebih sederhana daripada render di video.

## 7. Tata letak dan gaya

### 7.1 Tata letak

- Header berlatar hampir putih, tinggi ±64 px.
- Di bawah header, kanvas 3D mengisi sisa layar.
- Kartu lain melayang di atas kanvas: latar putih, radius ±14 px, garis tepi tipis, bayangan lembut.

| Elemen | Posisi (perkiraan dari video 3456 px) |
|---|---|
| Kartu KPI | kiri atas, tiga kartu berjejer, masing-masing ±14% lebar layar |
| Toolbar kamera | vertikal, menempel di kiri inspector |
| Inspector | kanan atas, lebar ±24%. Tinggi mengikuti isi dan bisa di-scroll bila melebihi ruang. |
| Shipment Tracking | kiri bawah, lebar ±60% |
| Antrian | kanan bawah, lebar ±30%, empat baris terlihat lalu scroll |

Target layar desktop 1440×900 ke atas. Di bawah 1100 px, kanvas mendapat tinggi tetap 420 px dan kartu menumpuk di bawahnya dengan urutan: KPI, toolbar, inspector, tracking, antrian.

### 7.2 Palet

Disampel dari video. Nilai latar pil adalah perkiraan.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `primary` | `#2557E3` | logo, ikon, badge site, link, langkah timeline selesai, pin, garis rute, tombol follow aktif |
| `bg-app` | `#F4F7FE` | header dan latar halaman |
| `surface` | `#FFFFFF` | kartu |
| `tile` | `#E4EDFF` | tile ikon KPI dan inspector |
| `success` | `#2ABF54` | titik Live, panah delta naik |
| `bar-green` | `#38CF6C` | bar Truck bays, baterai, dan progres muat/bongkar |
| `step-todo` | `#E0E5ED` | langkah timeline yang belum dicapai |
| pil hijau | latar `#E3F6E8`, teks `#1E9E4A` | Operational, In Stock, Loading, Unloading, Staged, Loading truck, Unloading truck |
| pil biru | latar `#E6EDFD`, teks `#2557E3` | Docking, En route, Moving |
| pil oranye | latar `#FDEBD8`, teks `#D9741C` | At gate, Booked, Charging, Low Stock |
| pil abu | latar `#EEF1F5`, teks `#6B7280` | Available, Free, Idle |
| `ground` | biru-abu sangat muda | lantai yard dan kota |
| `road` | biru muda | jalan, marka putih putus-putus |
| `grass` | `#D2EDE8` | jalur hijau di sepanjang pagar |
| `tree` | `#80DCA1` | pohon bulat |
| `forklift` | `#ECAF40` | badan forklift |
| `charge-pad` | `#DEFAE9` | tikar area charger |
| `marking` | kuning hangat | slot truk di depan dock, marka lantai |

**Warna carrier**

| Carrier | Warna | Dipakai pada |
|---|---|---|
| WareTrack | `#2553E3` biru | titik warna baris, garis trailer, kepala truk |
| Nordline | `#159F9B` toska | sama |
| Cargoviva | `#E16721` oranye | sama |
| Bluepeak | `#1E2F7A` biru tua | sama |

**Warna badge site**: semua `primary`, kecuali WH-03 yang berwarna toska karena cold chain.

## 8. Dunia 3D

### 8.1 Kota

- Grid jalan multi-lajur bermarka putih putus-putus, zebra cross di persimpangan, dan trotoar.
- Pagar panel di sepanjang batas site, dengan jalur hijau berisi pohon bulat.
- Blok kota berupa gedung putih rendah berjendela biru.
- Kontainer kapal, salah satunya toska.
- Truk lalu lintas ambient di jalan kota. Truk ini dekoratif dan tidak bisa diklik.

### 8.2 Lima site

Setiap site punya:

- pagar keliling
- gerbang dengan palang merah-putih yang naik-turun
- area parkir truk
- bay dock dengan slot parkir bergaris kuning di depan setiap pintu
- marka lantai kuning
- area staging pallet
- area charger forklift: tikar hijau dengan unit charger putih

| Kode | Nama | Tipe (eyebrow) | Ciri bangunan | Bay |
|---|---|---|---|---|
| WH-01 | Riverside Hub | `DEPOT` | Kelompok gudang biru beratap pelana dengan logo MPM Group di atap. Rak pallet terbuka, tumpukan kontainer plastik biru, kontainer kapal toska. | Bay 1–2 |
| WH-02 | Northgate DC | `DISTRIBUTION CENTER` | Gedung panjang berdinding terang dengan list biru. Pelat nomor di atas pintu. Papan nama MPM Group (§19). | Bay 1–4 |
| WH-03 | Eastport Cold Chain | `COLD STORE` | Gedung putih dengan deretan unit pendingin di atap, tangki silinder, dan platform muat bertepi kuning. | Bay 1–3 |
| WH-04 | Southfield Cross-Dock | `CROSS-DOCK` | Gedung panjang beratap biru. Pintu In 1–3 dan Out 1–3 berjejer di sisi depan. Slot staging di halaman depan, area charger C1–C3 di sudut tenggara. Parkir truk di seberang jalan. | In 1–3, Out 1–3 |
| WH-05 | Westgate Robotics Hub | `AUTOMATED DC` | Gedung besar putih dengan unit atap dan pintu gulung abu. | Bay 1–4 |

### 8.3 Objek dinamis

| Objek | Bentuk | Bisa diklik |
|---|---|---|
| Truk | Kepala dan box trailer. Livery per carrier: WareTrack berkepala biru dengan logo WareTrack di trailer putih. Nordline berkepala putih dengan garis toska. Cargoviva berkepala putih dengan garis oranye. Bluepeak berkepala putih dengan garis biru tua dan logo gunung. | ya |
| Forklift | Badan kuning, kursi biru, operator, garpu yang bisa membawa pallet | ya |
| Pallet | Tumpukan kardus, bungkus putih, atau kontainer plastik biru di atas pallet. Pallet staged diberi pin biru. | ya |
| Dock bay | Pintu dock dan slot parkir di depannya | ya |
| Charger | Unit putih di tikar hijau | ya |
| Bangunan site | Gedung dan yard | ya, memilih site |

### 8.4 Animasi

- Truk melaju di jalan, berhenti di gerbang (palang naik), masuk, mundur ke slot bay, diam selama bongkar atau muat, lalu keluar.
- Forklift bolak-balik antara truk dan area staging atau gudang, sambil membawa pallet di garpu. Forklift pergi ke charger saat baterainya rendah.
- Semua gerakan halus, mengikuti jalur. Tidak ada objek yang melompat.

### 8.5 Penanda

| Keadaan | Tampilan |
|---|---|
| Hover | Kursor tangan, objek sedikit terang, label pil putih di atasnya, misalnya `PAL-1026 Safety Helmet`, `Bay 3 Arriving`, `In 2 Booked`. |
| Terpilih | Braket sudut 3D biru di sekeliling objek, zona lantai biru muda, label pil biru tua berisi kode tebal dan status, misalnya `TRK-2481 En route`, `FL-10 Unloading truck`, `C1 Free`. |
| Truk terpilih menuju bay | Garis rute biru tebal dengan chevron di jalan, disambung titik-titik ke bay tujuan dan pin di bay itu. |

### 8.6 Kamera

- Perspektif sudut tinggi.
- Setiap site punya kamera default yang membingkai gedung dan yard-nya.
- Network overview membingkai kelima site.

## 9. Wilayah layar

### 9.1 Header

Kiri ke kanan:

1. Logo kubus biru dan wordmark `WareTrack`.
2. Kolom cari dengan placeholder `Search sites, trucks, forklifts, pallets, shipments...` dan chip `/`.
3. Site switcher:
   - badge `WH-0x`
   - nama site, dipotong ellipsis
   - subteks `{pct}% full · {docked}/{bays} docked`
   - tombol `>` untuk pindah ke site berikutnya
   - tombol `v` yang membuka dropdown. Ikonnya menjadi `^` saat dropdown terbuka.
4. Pil Live: titik hijau, `Live`, dan jam simulasi `HH:MM`.
5. Lonceng dengan titik merah.
6. Garis pemisah.
7. Avatar, `Alex Chen`, `Operations Manager`, dan chevron.

**Dropdown site**

| Baris | Isi |
|---|---|
| Pertama | Badge gelap `ALL`, `Network overview`, `Zoom out to all 5 sites` |
| Per site | Badge, nama, persen terisi, bar persen terisi, `{docked}/{bays} docked · {inbound} inbound` |

Site aktif ditandai bingkai dan latar biru muda.

### 9.2 KPI

Tiga kartu untuk site aktif. Setiap kartu memuat tile ikon, label, nilai besar, delta (panah naik hijau dan angka), dan subteks.

| Kartu | Ikon | Nilai | Subteks |
|---|---|---|---|
| Stock on hand | kubus | jumlah pallet, misalnya `610` | `pallets · WH-04` |
| Trucks on site | truk | misalnya `3` | `{n} inbound · WH-04` |
| On-time delivery | jam | misalnya `96.2%` | `last 30 days · WH-04` |

- Delta negatif memakai panah turun merah. Delta nol tampil `+0`, seperti `4 +0` di video.
- Nilai berganti di tempat saat site berganti atau data berubah, tanpa skeleton.

### 9.3 Toolbar kamera

Kartu vertikal dengan tiga kelompok: `+` `−` | `↺` `↻` | `⌂`.

| Kontrol | Perilaku |
|---|---|
| `+` / `−` / scroll | Zoom, langkah 1.25×, dalam batas jarak minimum dan maksimum. |
| `↺` / `↻` | Putar 45° mengelilingi titik pusat pandang. |
| Seret kiri | Geser kamera. Kursor berubah menjadi tangan. |
| Seret kanan | Putar bebas. |
| `⌂` | Kembali ke kamera default site aktif, atau ke kamera Network overview. |
| Animasi | 300 ms untuk tombol, 1.2 detik untuk terbang antar site. Dimatikan bila `prefers-reduced-motion` aktif. |

### 9.4 Inspector (panel kanan)

**Struktur umum**

1. Kepala:
   - tile ikon objek
   - eyebrow huruf kapital biru
   - judul
   - subjudul abu
   - tombol aksi di kanan
2. Baris status: pil status dan kalimat status.
3. Bar (opsional), dengan teks di kanan.
4. Isi: daftar field (label kiri, nilai kanan, dipisah garis tipis) atau blok khusus.

**Tombol aksi**

| Tombol | Perilaku |
|---|---|
| ⌖ Locate | Kamera terbang ke objek. |
| ↗ Follow | Kamera mengikuti objek yang bergerak. Tombol berlatar biru selama aktif. Berhenti saat pengguna menyeret kamera, menekan `⌂`, atau memilih objek lain. |
| × Close | Batal memilih. Inspector kembali ke panel site. |

Berganti subjek memakai crossfade ±250 ms. Isi lama memudar sambil isi baru muncul, seperti frame yang dipakai draf sebelumnya.

Nilai bergaris bawah biru adalah link. Klik link memilih objek yang dirujuk: truk, bay, forklift, pallet, atau charger.

#### A. Site (tampil saat tidak ada objek terpilih)

| Bagian | Isi |
|---|---|
| Eyebrow | `{TIPE} · {kode}`, misalnya `CROSS-DOCK · WH-04` |
| Judul / subjudul | nama site / alamat |
| Aksi | ⌖. WH-05 punya tombol lapisan tambahan (§18). |
| Status | `Operational` dan `{docked} docked · {arriving} arriving · {staged} staged` |
| Tile 1 | `Stock on hand` — `{stock} / {capacity}` dengan bar biru |
| Tile 2 | `Truck bays` — `{busy} / {bays} busy` dengan bar hijau |
| Tile 3 | `Outbound today` — `{n} trucks` |
| Tile 4 | `Put-aways today` — `{n} pallets` |
| Inventory | Kepala `Inventory` dan `units`. Empat baris SKU: ikon, nama, jumlah, pil `In Stock` atau `Low Stock`. |
| Forklift fleet | Kepala `Forklift fleet` dan `{working}/{total} working`. Satu baris berisi forklift kerja pertama: `FL-xx`, aktivitasnya, bar baterai, dan persen baterai. |

#### B. Truck

| Bagian | Isi |
|---|---|
| Eyebrow | nama tampilan carrier, misalnya `NORDLINE LOGISTICS` |
| Judul / subjudul | `TRK-xxxx` / `{driver} · {plat}` |
| Aksi | ⌖ ↗ × |
| Status dan bar | menurut status, lihat tabel di bawah |
| Field | `Shipment` (link `#SHP-xxxxx`), `Customer`, `Destination`, `ETA`, `Speed`, `Bay` (link `{bay}` · `{site}`), `Cargo` |

| Status | Kalimat status | Bar dan teks kanan | ETA |
|---|---|---|---|
| En route | `To WH-04 · ETA 1 min` | jarak tersisa, `4 m left` | `09:45 (1 min)` |
| At gate | `At gate · WH-04` | jarak tersisa | `HH:MM (x min)` |
| Docking | `Reversing into In 3 · WH-04` | jarak mundur, `25 m left` | `HH:MM (x min)` |
| Unloading / Loading | `WH-04 · In 1 · 2/6 pallets` | pallet, `2/6` | `Done in 13 min` |

`Cargo` = `{pallet di truk}/{kapasitas} pallets · {berat}`, dengan berat ditulis `kg` atau `t`.

#### C. Forklift

| Bagian | Isi |
|---|---|
| Eyebrow | `FORKLIFT · {site}` |
| Judul / subjudul | `FL-xx` / `{operator} · {model}` |
| Aksi | ⌖ ↗ × |
| Status | `Loading truck`, `Unloading truck`, `Charging`, atau `Idle`, dengan kalimat seperti `Unloading TRK-2205 at In 1` atau `Charging at bay` |
| Bar | baterai, teks kanan `Battery 84%` |
| Field | `Carrying` (link `PAL-xxxx · {SKU}` atau `Empty`), `Moves today`, `Speed`, `Charger` (link), `Site` |

#### D. Pallet

| Bagian | Isi |
|---|---|
| Eyebrow | `PALLET · {kategori}`, misalnya `PALLET · PPE` |
| Judul / subjudul | nama SKU / `{kode pallet} · {SKU}`, misalnya `PAL-1026 · PPE-HLM-Y` |
| Aksi | ⌖ × |
| Status | `Staged` dengan `WH-01 · Yard slot S01`, `Moving` dengan `On forks of FL-01`, `Stored`, atau `Loaded` |
| Field | `Quantity`, `Gross weight`, `Location`, `Lot`, `Received`, `Site` |

#### E. Dock bay

| Bagian | Isi |
|---|---|
| Eyebrow | `DOCK BAY · {site}` |
| Judul / subjudul | nama bay, misalnya `In 2` / `Dock door with leveller` |
| Aksi | ⌖ × |
| Status | `Available`, `Booked` (`TRK-2481 due in 3 min`), `Arriving` (truk sedang mundur), `Loading`, atau `Unloading` |
| Field | `Truck` (link `TRK-xxxx · {carrier}` atau `—`), `Rear doors`, `Trucks today`, `Site` |

#### F. Charger

| Bagian | Isi |
|---|---|
| Eyebrow | `CHARGER · {site}` |
| Judul / subjudul | `C1` / `48 V lithium-ion forklift charger` |
| Aksi | ⌖ × |
| Status | `Free` (`FL-10 is out · Unloading TRK-2205 at In 1`) atau `Charging` (`Charging FL-12`) |
| Field | `Forklift` (link `FL-xx · battery {n}%`), `Sessions today`, `Energy today`, `Charge rate` (`8% a minute`), `Site` |

### 9.5 Shipment Tracking (kiri bawah)

Kepala: ikon truk biru dan judul `Shipment Tracking`. Di kanan kepala tertulis `{TRK} · {carrier}`.

**Timeline lima langkah**

Lingkaran ikon dihubungkan garis. Langkah selesai: lingkaran biru penuh dengan ikon putih, garis biru. Langkah aktif: cincin biru besar dengan glow. Langkah belum dicapai: lingkaran dan garis abu.

| Jenis truk | Langkah |
|---|---|
| Outbound, sedang dimuat | `Order Confirmed`, `Picked`, **`Loading n/m`**, `In Transit`, `Delivered` |
| Inbound, belum di bay | `Order Confirmed`, `Picked`, `Loaded`, **`In Transit`**, `Delivered` |
| Inbound, sedang dibongkar | `Order Confirmed`, `Picked`, `Loaded`, `In Transit`, **`Unloading n/m`** |

Teks di bawah label:

- langkah selesai: jam selesai
- In Transit yang aktif: jam mulai
- Loading atau Unloading yang aktif: `ETA HH:MM` selesai
- langkah berikutnya: `ETA HH:MM`

Ikon langkah: dokumen, kotak, paket, truk, centang.

**Kartu ringkas di kanan**

- ilustrasi truk dengan livery carrier
- `#SHP-xxxxx`
- `To: {tujuan}`, dipotong ellipsis
- pil status truk
- baris info: `WH-04 · In 1 · 13 min left` bila truk di bay, atau `Arriving 09:46 · 1 min` bila belum
- chevron `>`

### 9.6 Antrian (kanan bawah)

Kepala:

- ikon biru
- tab bersegmen `Docks {busy}/{total}`, `Forklifts {working}/{total}`, `Trucks {n}`. Tab aktif berlatar putih dengan angka biru.
- nama site di kanan

Tab default saat aplikasi dibuka adalah **Docks**. Tab yang aktif tetap aktif saat site berganti.

| Tab | Kolom per baris |
|---|---|
| Docks | Nama bay (tebal) dengan kode site di bawahnya. `● TRK-xxxx · {carrier}` atau `No truck assigned`. Pil `Loading`, `Unloading`, `Arriving`, `Booked`, atau `Available`. Bar `n/m` atau `x min`. Chevron. |
| Docks, lanjutan | Setelah baris bay, baris `Inbound` untuk truk yang menuju site tapi belum mendapat bay: `● TRK-2287 · Bluepeak`, `En route`, `3 min`. |
| Forklifts | `FL-xx` dengan kode site di bawahnya. Aktivitas, misalnya `Unloading TRK-2205 at In 1` atau `Charging at bay`. Pil `Unloading`, `Loading`, `Charging`, atau `Idle`. Bar baterai dan persen. Chevron. |
| Trucks | `TRK-xxxx` dengan carrier di bawahnya. `● WH-04 · Out 2` atau `● To WH-04`, dengan titik berwarna carrier. Pil status. Info: bar `n/m`, `docking`, atau `x min`. Chevron. |

Urutan baris Trucks:

1. truk di bay, urut nama bay
2. Docking
3. At gate
4. En route, urut ETA

Baris yang di-hover atau terpilih berlatar biru sangat muda. Klik baris atau chevron-nya memilih objek itu.

## 10. Seleksi dan navigasi

### 10.1 Seleksi

- Pada satu waktu ada nol atau satu objek terpilih. Saat nol, inspector menampilkan panel site.
- Cara memilih:
  - klik objek di dunia 3D (klik tanpa seret)
  - klik baris antrian
  - klik link di inspector
  - pilih hasil pencarian
- Batal memilih: klik ×, tekan Esc, atau klik tanah kosong di dunia 3D.
- Objek terpilih ditandai serentak di dunia 3D (§8.5), di baris antrian bila tabnya terbuka, dan di inspector.
- Memilih objek tidak mengganti tab antrian.

### 10.2 Truk aktif untuk Shipment Tracking

| Kejadian | Truk aktif |
|---|---|
| Memilih truk | truk itu |
| Memilih forklift, bay, atau charger yang terkait dengan truk | truk terkait tersebut, misalnya FL-10 → TRK-2205 |
| Memilih objek tanpa truk terkait | tidak berubah |
| Berganti site | truk pertama di bay, urut nama bay. Bila tidak ada, truk inbound dengan ETA terdekat. |

### 10.3 Berganti site

- Cara berganti site: `>` (berputar WH-01 → … → WH-05 → WH-01), dropdown, pencarian, atau klik bangunan site lain di dunia 3D.
- Kamera terbang 1.2 detik ke kamera default site itu.
- KPI, antrian, inspector, dan tracking berganti dengan crossfade.
- Seleksi kembali ke panel site.

### 10.4 Network overview

Network overview dipilih dari baris `ALL` di dropdown.

- Kamera mundur sampai kelima site terlihat.
- Badge di site switcher menjadi `ALL`, dengan judul `Network overview` dan subteks `5 sites · {docked}/{bays} docked`.
- KPI menampilkan agregat:
  - jumlah stok
  - jumlah truk on site
  - on-time rata-rata berbobot jumlah delivery
  - subteks berakhiran `· All sites`
- Inspector menampilkan daftar lima site seperti dropdown. Klik salah satunya untuk terbang ke site itu.
- Antrian menampilkan baris dari semua site. Kode site sudah ada di setiap baris.

Perilaku ini tidak terlihat di video (§18).

### 10.5 Pencarian

Pencarian juga tidak terlihat di video (§18).

- Tekan `/` untuk fokus ke kolom cari.
- Hasil tampil dalam dropdown, dikelompokkan: Sites, Trucks, Forklifts, Pallets, Shipments. Maksimal 8 hasil.
- Kueri dicocokkan tanpa membedakan huruf besar pada kode, nama, carrier, customer, dan SKU.
- Navigasi dengan ↑ ↓ dan Enter. Memilih hasil berpindah ke site objek itu, memilih objeknya, lalu menjalankan locate.
- Tanpa hasil, dropdown menampilkan `No matches`. Esc menutup dropdown.

## 11. Siklus hidup dan aturan hitung

### 11.1 Status objek

| Objek | Alur status |
|---|---|
| Truk inbound | `En route` → `At gate` → `Docking` → `Unloading` → keluar dari site |
| Truk outbound | `En route` → `At gate` → `Docking` → `Loading` → keluar sebagai In Transit |
| Dock bay | `Available` → `Booked` (truk ditugaskan) → `Arriving` (truk mundur) → `Unloading`/`Loading` → `Available` |
| Forklift | `Idle` ↔ `Loading truck` / `Unloading truck`. `Charging` dimulai saat baterai < 30%, selesai saat ≥ 95%. |
| Pallet | `Staged` (di yard slot) → `Moving` (di garpu) → `Stored` (di gudang) atau `Loaded` (di truk) |
| Charger | `Free` ↔ `Charging` |

### 11.2 Angka turunan

Semua aturan di bawah dicek terhadap angka di video.

| Angka | Aturan | Bukti di video |
|---|---|---|
| Trucks on site | truk berstatus At gate, Docking, Loading, atau Unloading | WH-04: 2 pada 09:41 → 3 pada 09:44 → 4 pada 09:45 |
| `n inbound` (KPI, dropdown) | truk berstatus En route, At gate, atau Docking | WH-04 `2 inbound` pada 09:44, `0 inbound` pada 09:51 setelah semua di bay |
| `arriving` (inspector site) | sama dengan inbound | WH-02 `2 docked · 2 arriving` |
| `docked` (header, dropdown, inspector) | truk berstatus Loading atau Unloading | WH-04 `2/6 docked` → `4/6 docked` |
| `{pct}% full` | stock ÷ capacity, dibulatkan | 610 / 1,600 = 38%, 1,412 / 1,800 = 78% |
| `Truck bays {busy}` dan tab `Docks {busy}/{total}` | bay yang statusnya bukan Available | WH-04 `4/6` (In 1, Out 2, ditambah In 2 dan In 3 yang Booked) |
| `staged` | pallet berstatus Staged di site itu | — |
| Tab `Forklifts` dan `Forklift fleet` | forklift berstatus Loading truck atau Unloading truck, dibagi total forklift | WH-04 `2/5`: FL-10 dan FL-11 |
| Tab `Trucks n` | semua truk yang menuju atau berada di site | WH-04 `4` |
| `Low Stock` | jumlah unit < reorder point SKU | — |
| `x min` | ETA disimpan sampai detik dan ditampilkan dibulatkan ke menit terdekat. `x` = pembulatan ke bawah dari (ETA − jam) dalam menit, minimal 1 selama ETA belum lewat. Nilai ≤ 0 tampil `now`. | `09:45 (1 min)` dan `09:46 (1 min)`, keduanya pada 09:44 |

**Nilai yang berasal dari data dan diperbarui oleh kejadian simulasi**

| Nilai | Berubah saat |
|---|---|
| delta KPI, On-time delivery | tidak berubah dalam satu sesi |
| `Outbound today` | +1 saat truk outbound keluar |
| `Put-aways today` | +1 saat pallet tersimpan |
| `Moves today` | +1 per pallet yang dipindah forklift |
| `Sessions today`, `Energy today` | charger memulai sesi atau mengisi |
| `Trucks today` (bay) | truk selesai di bay |
| Stock on hand | +1 saat pallet tersimpan, −1 saat pallet dimuat |

## 12. Simulasi live

### 12.1 Waktu

- Jam simulasi mulai **09:40**, seperti awal video.
- Kecepatan 12×: 1 menit simulasi = 5 detik nyata, sesuai laju jam di video (09:40 → 09:54 dalam 70 detik).
- Parameter `?speed=` mengubah kecepatan.

### 12.2 Gerak dan pembaruan

- Posisi objek diperbarui setiap frame.
- Angka di UI diperbarui paling sering dua kali per detik, di tempat, tanpa skeleton.

### 12.3 Durasi kegiatan (waktu simulasi)

| Kegiatan | Durasi |
|---|---|
| Docking (mundur ke bay) | ±2 menit |
| Bongkar/muat | ±2.5 menit per pallet |
| Antre di gerbang | ±1 menit |

### 12.4 Kedatangan truk

Setiap site mendapat truk baru (En route) dengan selang 6–10 menit simulasi. Truk datang dari salah satu dari tiga titik tepi peta terdekat, supaya tiba dalam beberapa menit. Jumlah truk per site dibatasi jumlah bay + 2.

### 12.5 Determinisme

Semua keacakan memakai RNG ber-seed, diatur lewat `?seed=` (default `1`). Seed yang sama menghasilkan urutan kejadian yang sama.

### 12.6 Skenario pembuka WH-04

Kejadian ini harus terjadi supaya momen di video bisa direproduksi:

| Jam | Kejadian |
|---|---|
| 09:40 | TRK-2205 Unloading di In 1 (2/6). TRK-2229 Loading di Out 2 (3/6). TRK-2307 dan TRK-2481 En route. In 2 Booked untuk TRK-2481, In 3 untuk TRK-2307. |
| 09:44 | TRK-2307 Docking ke In 3. Trucks on site 3. |
| 09:45 | TRK-2481 At gate. Trucks on site 4. |
| ±09:47 | TRK-2481 Docking ke In 2. |
| ±09:50 | TRK-2307 dan TRK-2481 Unloading. `4/6 docked`, `0 inbound`. |
| ±09:56 | TRK-2229 selesai dimuat lalu keluar menuju Providence, RI. |

## 13. Persyaratan fungsional

### Dunia 3D

- **FR-W1.** Kota dan kelima site tampil sesuai §8.1–8.2.
- **FR-W2.** Truk dan forklift bergerak sesuai §8.4 dan §11.1, mengikuti jalan dan jalur yard.
- **FR-W3.** Hover dan seleksi menampilkan penanda §8.5.
- **FR-W4.** Truk terpilih yang sedang menuju bay menampilkan garis rute ke bay itu.
- **FR-W5.** Setiap objek di §8.3 yang bisa diklik dapat dipilih. Truk lalu lintas ambient tidak bisa dipilih.

### Header

- **FR-H1.** Header tampil seperti §9.1.
- **FR-H2.** `>` berpindah ke site berikutnya secara berputar. `v` membuka dropdown §9.1. Klik di luar dropdown atau Esc menutupnya.
- **FR-H3.** Subteks site switcher dan baris dropdown memakai aturan §11.2.
- **FR-H4.** Pencarian sesuai §10.5.
- **FR-H5.** Pil Live menampilkan jam simulasi `HH:MM`.
- **FR-H6.** Lonceng dan menu pengguna tidak membuka apa pun di v1.

### KPI

- **FR-K1.** Tiga kartu §9.2 untuk site aktif, atau agregat saat Network overview.
- **FR-K2.** Trucks on site dan `n inbound` dihitung sesuai §11.2 dan berubah mengikuti simulasi.

### Toolbar kamera

- **FR-T1.** Tombol dan gestur sesuai §9.3.
- **FR-T2.** `⌂` kembali ke kamera default konteks aktif.

### Inspector

- **FR-I1.** Inspector menampilkan panel sesuai jenis objek terpilih (§9.4 A–F), atau panel site bila tidak ada yang terpilih.
- **FR-I2.** Locate, Follow, dan Close berperilaku sesuai §9.4.
- **FR-I3.** Link di inspector memilih objek yang dirujuk.
- **FR-I4.** Pergantian subjek memakai crossfade. Nilai live berubah di tempat.

### Shipment Tracking

- **FR-S1.** Tracking menampilkan truk aktif (§10.2) dengan varian timeline §9.5.
- **FR-S2.** Kartu ringkas menampilkan shipment truk aktif. Chevron-nya memilih truk itu dan menjalankan locate.
- **FR-S3.** Langkah timeline tidak bisa diklik.

### Antrian

- **FR-Q1.** Tiga tab beserta angkanya sesuai §11.2. Tab default Docks.
- **FR-Q2.** Baris dan urutan sesuai §9.6.
- **FR-Q3.** Klik baris memilih objek. Baris terpilih ditandai.
- **FR-Q4.** Daftar bisa di-scroll bila lebih dari empat baris.

### Non-fungsional

- **NFR-1.** ≥ 50 fps pada laptop dengan GPU terintegrasi di 1440×900, dengan ±20 truk, 17 forklift, dan 150 pallet. Objek berulang dirender dengan instancing.
- **NFR-2.** Dunia dan UI siap dalam ≤ 3 detik setelah halaman dibuka.
- **NFR-3.** Kontras teks pada kartu memenuhi WCAG AA. Tombol ikon punya `aria-label` dan tooltip: `Locate`, `Follow`, `Close`, `Zoom in`, `Zoom out`, `Rotate left`, `Rotate right`, `Reset view`.
- **NFR-4.** `prefers-reduced-motion`: kamera berpindah tanpa terbang, tanpa crossfade. Simulasi tetap berjalan.

## 14. Model data

```ts
type SiteType = 'DEPOT' | 'DISTRIBUTION CENTER' | 'COLD STORE' | 'CROSS-DOCK' | 'AUTOMATED DC';
type TruckStatus = 'En route' | 'At gate' | 'Docking' | 'Unloading' | 'Loading';
type BayStatus = 'Available' | 'Booked' | 'Arriving' | 'Unloading' | 'Loading';
type ForkliftStatus = 'Idle' | 'Loading truck' | 'Unloading truck' | 'Charging';
type PalletStatus = 'Staged' | 'Moving' | 'Stored' | 'Loaded';

interface Site {
  code: string; name: string; type: SiteType; address: string; badgeColor: string;
  capacity: number; stock: number; stockDelta: number; trucksDelta: number;
  onTimePct: number; onTimeDelta: number; outboundToday: number; putawaysToday: number;
  inventory: { sku: string; name: string; units: number; reorderPoint: number; icon: string }[];
}
interface Carrier { id: string; label: string; displayName: string; color: string }
interface Bay { siteCode: string; name: string; kind: 'Bay' | 'In' | 'Out'; status: BayStatus;
  truckCode?: string; trucksToday: number; rearDoors: string }
interface Truck {
  code: string; carrier: string; driver: string; plate: string; siteCode: string;
  direction: 'inbound' | 'outbound'; status: TruckStatus; bay?: string;
  etaAt?: string;             // 'HH:MM', tiba di bay (En route/At gate/Docking) atau selesai (Loading/Unloading)
  distanceM?: number;         // untuk 'x m left'
  speedKmh: number;
  pallets: { done: number; total: number };   // progres muat/bongkar
  cargo: { onBoard: number; capacity: number; weightKg: number };
  shipmentCode: string;
}
interface Shipment {
  code: string; truckCode: string; customer: string; destination: string;
  steps: { label: string; state: 'done' | 'active' | 'todo'; time?: string; eta?: string }[];
}
interface Forklift { code: string; siteCode: string; operator: string; model: string;
  status: ForkliftStatus; activity: string; battery: number; carrying?: string;
  movesToday: number; speedKmh: number; charger: string; truckCode?: string }
interface Pallet { code: string; sku: string; name: string; category: string; siteCode: string;
  status: PalletStatus; location: string; quantity: number; grossKg: number; lot: string; received: string }
interface Charger { siteCode: string; code: string; model: string; status: 'Free' | 'Charging';
  forklift: string; sessionsToday: number; energyKwh: number; ratePctPerMin: number }
```

## 15. Data contoh

Kecuali ditandai *(contoh)*, nilai dibaca langsung dari video. Kolom "Jam tangkap" mencatat jam simulasi saat nilai itu terlihat.

Simulasi dimulai 09:40. Untuk site selain WH-04, semua cap waktu dan ETA digeser sebesar (09:40 − jam tangkap). Dengan begitu kondisi awal setiap site sama dengan yang terlihat di video.

### 15.1 Carrier

| id | Label baris | Eyebrow inspector | Warna |
|---|---|---|---|
| waretrack | WareTrack | `WARETRACK FREIGHT` | `#2553E3` |
| nordline | Nordline | `NORDLINE LOGISTICS` | `#159F9B` |
| cargoviva | Cargoviva | `CARGOVIVA` | `#E16721` |
| bluepeak | Bluepeak | `BLUEPEAK FOODS` | `#1E2F7A` |

### 15.2 Site

| | WH-01 | WH-02 | WH-03 | WH-04 | WH-05 |
|---|---|---|---|---|---|
| Nama | Riverside Hub | Northgate DC | Eastport Cold Chain | Southfield Cross-Dock | Westgate Robotics Hub |
| Tipe | DEPOT | DISTRIBUTION CENTER | COLD STORE | CROSS-DOCK | AUTOMATED DC |
| Alamat | 12 Riverside Dr, Newark NJ | 480 Northgate Blvd, Newark NJ | 7 Harbor Way, Elizabeth NJ | 2200 Southfield Ave, Linden NJ | 300 Westgate Rd, Kearny NJ |
| Stock / capacity | 1,412 / 1,800 | 3,310 / 4,200 | 990 / 1,400 | 610 / 1,600 | 1,730 / 2,400 |
| Δ stock | +15 | +35 | +20 | +20 | +25 |
| Δ trucks | +1 | +2 | +2 | +2 | +2 |
| On-time, Δ | 96.6%, +0.4% | 98.2%, +0.4% | 96.0%, +0.4% | 96.2%, +0.4% | 95.9%, +0.4% |
| Outbound today | 23 | 21 | 31 | 29 | 33 |
| Put-aways today | 15 | 35 | 20 | 20 | 25 |
| Pallet staged | 3 | 5 | 0 | 8 | 0 |
| Bay | Bay 1–2 | Bay 1–4 | Bay 1–3 | In 1–3, Out 1–3 | Bay 1–4 |
| Forklift | FL-01–02 | FL-03–06 | FL-07–09 | FL-10–14 | FL-15–17 |
| Charger | C1 | C1–C2 *(contoh)* | C1–C2 *(contoh)* | C1–C3 | C1–C2 *(C2 contoh)* |
| Jam tangkap | 09:40 | 09:46 | 09:48 | 09:41–09:52 | 09:52 |

### 15.3 Inventory

Jumlah dalam unit SKU, bukan pallet.

| Site | SKU 1 | SKU 2 | SKU 3 | SKU 4 |
|---|---|---|---|---|
| WH-01 | Cardboard Box (M) 1,906 | Plastic Container 297 | Safety Helmet 212 **Low** | Packing Tape 4,448 |
| WH-02 | LED Panel 60×60 1,787 | Office Chair 174 | Cardboard Box (M) 993 **Low** | Nitrile Gloves 5,793 |
| WH-03 | Frozen Peas 10 kg 334 | Spring Water 24-pack 364 | Nitrile Gloves 495 **Low** | Plastic Container 208 |
| WH-04 | Spring Water 24-pack 288 | Packing Tape 1,922 | LED Panel 60×60 73 **Low** | Safety Helmet 320 |
| WH-05 | LED Panel 60×60 934 | Cardboard Box (M) 1,817 | Nitrile Gloves 865 **Low** | Safety Helmet 908 |

### 15.4 Truk WH-04 (state 09:44, momen tangkapan layar draf sebelumnya)

| | TRK-2205 | TRK-2229 | TRK-2307 | TRK-2481 |
|---|---|---|---|---|
| Carrier | WareTrack | Nordline | Nordline | Cargoviva |
| Driver · plat | Sam Chen · ZBY-5648 | Noah Tanaka · CRX-5820 | Ada Larsen · EKT-2697 | Alex Haddad · WKH-3157 |
| Arah | inbound | outbound | inbound | inbound |
| Status | Unloading | Loading | Docking | En route |
| Kalimat status | `WH-04 · In 1 · 2/6 pallets` | `WH-04 · Out 2 · 3/6 pallets` | `Reversing into In 3 · WH-04` | `To WH-04 · ETA 1 min` |
| Bar | 2/6 | 3/6 | `25 m left` | `4 m left` |
| Shipment | #SHP-78450 | #SHP-78452 | #SHP-78456 | #SHP-78466 |
| Customer | Oakridge Market | Harbor & Co. | Sunvale Grocers | Halcyon Retail |
| Destination | WH-04 Southfield Cross-Dock | Providence, RI | WH-04 Southfield Cross-Dock | WH-04 Southfield Cross-Dock |
| ETA | Done in 13 min | Done in 10 min | 09:46 | 09:45 |
| Speed | 0 km/h | 0 km/h | 15 km/h | 37 km/h |
| Bay | In 1 | Out 2 | In 3 | In 2 |
| Cargo | 4/7 pallets · 1.2 t | 3/7 pallets · 1.4 t | 4/8 pallets · 1.2 t *(contoh, §18)* | 5/10 pallets · 1.9 t *(contoh, §18)* |
| Order Confirmed | 06:57 | 06:36 | 06:37 | 07:03 |
| Picked | 08:25 | 08:16 | 08:16 | 08:29 |
| Loaded / Loading | 09:10 | **Loading 3/6**, ETA 09:55 | 09:12 | 09:12 |
| In Transit | 09:36 | ETA 10:03 | **09:26** (aktif) | **09:28** (aktif) |
| Delivered / Unloading | **Unloading 2/6**, ETA 09:55 | ETA 10:35 | ETA 10:26 | ETA 10:25 |

### 15.5 Truk site lain

Detail panel dan timeline yang tidak terlihat di video diisi saat implementasi, ditandai *(contoh)*.

| Site | Truk | Carrier | Status / lokasi | Info | Yang terlihat di video |
|---|---|---|---|---|---|
| WH-01 | TRK-2051 | WareTrack | Loading · Bay 1 | 2/6 | #SHP-78442 → Philadelphia, PA. Timeline: 06:49, 08:19, Loading 2/6 ETA 09:53, In Transit ETA 10:01, Delivered ETA 10:33. |
| WH-01 | TRK-2287 | Bluepeak | En route · To WH-01 | 3 min | Baris `Inbound` di tab Docks |
| WH-02 | TRK-2127 | Bluepeak | Loading · Bay 3 | 4/7 | — |
| WH-02 | TRK-2104 | Nordline | Unloading · Bay 1 | 1/5 | #SHP-78444 → WH-02 Northgate DC. Timeline: 06:44, 08:21, 09:16, 09:42, Unloading 1/5 ETA 10:01. |
| WH-02 | TRK-2658 | Cargoviva | Docking · To WH-02 | docking | — |
| WH-02 | TRK-2526 | WareTrack | En route · To WH-02 | 3 min | — |
| WH-03 | TRK-2148 | Bluepeak | Unloading · Bay 2 | 3/4 | #SHP-78448 → WH-03 Eastport Cold Chain. Timeline: 06:40, 08:19, 09:16, 09:42, Unloading 3/4 ETA 09:52. |
| WH-03 | TRK-2471 | Bluepeak | Docking · To WH-03 | docking | — |
| WH-03 | TRK-2603 | Bluepeak | At gate · To WH-03 | 2 min | Alex Walsh · HUL-7099. #SHP-78472, Harbor & Co., Bay 3, 22 km/h. Timeline: 07:07, 08:34, 09:18, 09:32, Delivered ETA 10:32. |
| WH-05 | TRK-2339 | Cargoviva | Loading · Bay 1 | 1/5 | #SHP-78458. Timeline: 06:53, 08:28, Loading 1/5 ETA 10:05, In Transit ETA 10:13, Delivered ETA 10:45. |
| WH-05 | TRK-2574 | Nordline | Loading · Bay 2 | 0/4 | — |
| WH-05 | TRK-2372 | WareTrack | Docking · To WH-05 | docking | Luis Walsh · TTC-2870. #SHP-78460, Sunvale Grocers, Bay 3, 11 km/h, `5 m left`. Timeline: 07:01, 08:32, 09:21, 09:35, Delivered ETA 10:33. |
| WH-05 | TRK-2412 | Nordline | At gate · To WH-05 | 2 min | — |

### 15.6 Forklift

| Kode | Site | Operator · model | Status | Aktivitas | Baterai | Carrying | Moves | Speed | Charger |
|---|---|---|---|---|---|---|---|---|---|
| FL-01 | WH-01 | Sam Haddad · Toyota 8FBE18 | Loading truck | Loading TRK-2051 at Bay 1 | 75% | Empty | 28 | 5.6 km/h | C1 |
| FL-03 | WH-02 | *(contoh)* | Loading truck | Loading TRK-2127 at Bay 3 | 78% | — | — | — | — |
| FL-07 | WH-03 | *(contoh)* | Unloading truck | Unloading TRK-2148 at Bay 2 | 79% | — | — | — | — |
| FL-10 | WH-04 | Zoe Reyes · Jungheinrich EFG 216 | Unloading truck | Unloading TRK-2205 at In 1 | 84% | PAL-1060 · LED Panel 60×60 | 38 | 8.2 km/h | C1 |
| FL-11 | WH-04 | *(contoh)* | Loading truck | Loading TRK-2229 at Out 2 | 82% | — | — | — | — |
| FL-12 | WH-04 | Zoe Larsen · Toyota 8FBE18 | Charging | Charging at bay | 85% | Empty | 24 | 0.0 km/h | C3 |
| FL-13 | WH-04 | *(contoh)* | Charging | Charging at bay | 90% | Empty | — | 0.0 km/h | C2 |
| FL-14 | WH-04 | *(contoh)* | Idle | — | 64% | Empty | — | 0.0 km/h | C1 |
| FL-15 | WH-05 | Ines Moreau · Toyota 8FBE18 | Loading truck | Loading TRK-2339 at Bay 1 | 94% | Empty | 34 | 4.5 km/h | C1 |

Forklift FL-02, FL-04–06, FL-08–09, FL-16–17 diisi *(contoh)*, dengan jumlah forklift kerja mengikuti `Forklift fleet`: WH-01 1/2, WH-02 2/4, WH-03 1/3, WH-05 1/3.

### 15.7 Objek lain yang terlihat

| Objek | Nilai |
|---|---|
| Pallet PAL-1026 | `PALLET · PPE`, Safety Helmet, `PAL-1026 · PPE-HLM-Y`, Staged, `WH-01 · Yard slot S01`, 82 units, 56 kg, Lot L2501-870, Received Apr 19, 16:29, Riverside Hub. Lalu `Moving` dengan `On forks of FL-01`, Location `Forklift FL-01`. |
| Pallet PAL-1060 | LED Panel 60×60, di garpu FL-10 |
| Charger C1 WH-04 | 48 V lithium-ion forklift charger, `Free`, `FL-10 is out · Unloading TRK-2205 at In 1`, Forklift FL-10 · battery 85%, Sessions today 7, Energy today 40.1 kWh, Charge rate 8% a minute |
| Bay In 2 WH-04 | Dock door with leveller, `Booked`, `TRK-2481 due in 3 min`, Truck TRK-2481 · Cargoviva, Rear doors —, Trucks today 5 |

## 16. State loading, kosong, dan error

| State | Tampilan |
|---|---|
| Loading | Hanya sebelum data dan dunia siap. Header tampil tanpa pil Live. KPI, inspector, tracking, dan antrian menampilkan skeleton. Kanvas menampilkan latar `bg-app` dengan indikator kecil `Loading world…`. |
| Kosong | Site tanpa truk: tab `Trucks 0` dengan badan `No trucks`, Docks berisi `No truck assigned`, tracking `No shipment selected` dengan lima langkah abu. Pencarian tanpa hasil: `No matches`. |
| Error muat | Kartu di tengah layar: `Could not load WareTrack` dan tombol `Retry`. |
| Terputus | Pil Live diganti `Live updates paused` dengan tombol `Retry`. Simulasi dan jam berhenti, data terakhir tetap tampil. |

`Live` dan `Live updates paused` tidak pernah tampil bersamaan.

Parameter `?state=loading|empty|error|offline` memaksa state untuk pengujian. `offline` terjadi 10 detik setelah data tampil.

## 17. Kriteria penerimaan

Build diterima bila semua poin berikut terpenuhi.

**Saat dibuka**

- [ ] Saat dibuka:
  - site aktif WH-01 Riverside Hub dengan jam `Live 09:40`
  - tab Docks aktif: `Docks 2/2`, `Forklifts 1/2`, `Trucks 2`
  - inspector site menampilkan `DEPOT · WH-01`, `Riverside Hub`, `12 Riverside Dr, Newark NJ`
  - tracking TRK-2051 · WareTrack dengan `Loading 2/6`

**Dunia 3D dan kamera**

- [ ] Dunia 3D menampilkan kota dan kelima site dengan ciri §8.2.
- [ ] Truk berjalan di jalan, dan forklift membawa pallet.
- [ ] `+ − ↺ ↻ ⌂`, seret, dan scroll berfungsi sesuai §9.3.

**Seleksi dan inspector**

- [ ] Klik objek berikut menampilkan inspector yang sesuai §9.4:
  - truk
  - forklift
  - pallet
  - bay
  - charger
  - tanah kosong (kembali ke panel site)
- [ ] Pergantian isi inspector memakai crossfade.
- [ ] Locate menerbangkan kamera ke objek.
- [ ] Follow mengikuti truk, dan tombolnya biru selama aktif.
- [ ] × kembali ke panel site.

**Site**

- [ ] `>` berpindah WH-01 → WH-02 → … → WH-05 → WH-01, dan kamera terbang ke tiap site.
- [ ] Dropdown menampilkan `Network overview` dan lima site dengan persen, bar, serta `docked · inbound`.

**Skenario WH-04 dan angka turunan**

- [ ] Di WH-04 pada 09:44: KPI `610 +20`, `3 +2 / 2 inbound`, `96.2% +0.4%`, header `38% full · 2/6 docked`, dan `Docks 4/6`, `Forklifts 2/5`, `Trucks 4`.
- [ ] Klik TRK-2481 menampilkan inspector dan tracking persis seperti §15.4.
- [ ] Skenario §12.6 berjalan: Trucks on site 2 → 3 → 4, lalu `0 inbound` dan `4/6 docked` setelah kedua truk di bay.
- [ ] Semua angka turunan mengikuti aturan §11.2 di setiap site selama simulasi berjalan.

**Pencarian dan state**

- [ ] `/` membuka pencarian. Mengetik `TRK-2603` lalu Enter berpindah ke WH-03 dan memilih truk itu.
- [ ] `?state=loading|empty|error|offline` menampilkan state §16.

## 18. Asumsi dan catatan sumber

### A. Tidak terlihat di video, diputuskan dalam PRD ini

1. Isi Network overview: KPI agregat, inspector daftar site, antrian gabungan (§10.4).
2. Perilaku pencarian (§10.5).
3. Klik tanah kosong dan Esc membatalkan seleksi.
4. Tombol lapisan di inspector WH-05: tampil, tanpa aksi di v1. Fungsinya belum diketahui.
5. Chevron kartu ringkas tracking memilih truk lalu menjalankan locate. Chevron baris antrian sama dengan klik baris.
6. Status `At gate` di inspector: `At gate · WH-04`. Status bay `Arriving` hanya terlihat sebagai label hover `Bay 3 Arriving`.
7. Alur status forklift `Idle` dan ambang baterai 30% / 95%.
8. Laju simulasi, durasi kegiatan, dan kedatangan truk baru (§12).
9. Data yang ditandai *(contoh)* di §15.

### B. Inkonsistensi di video yang diselesaikan dengan aturan §11.2

1. **Daftar Docks WH-04** pada 09:41 menulis `In 2 · No truck assigned · Available`, padahal inspector bay pada saat yang sama menulis `In 2 · Booked · TRK-2481`. PRD mengikuti inspector: bay yang dipesan tampil `Booked` di daftar.
2. **Cargo truk inbound yang belum dibongkar** tertulis `0/8 pallets · 0 kg` dan `0/10 pallets · 0 kg`. PRD memakai aturan "pallet di truk / kapasitas", sehingga truk inbound penuh sebelum dibongkar. Nilainya di §15.4 ditandai contoh.
3. **Tujuan TRK-2339** yang sedang dimuat di WH-05 tertulis `To: WH-05 Westgate Roboti…`. Ini truk outbound, jadi tujuannya diganti kota tujuan *(contoh)*.
4. **Satuan `m left`** muncul pada truk En route (`4 m left`) maupun Docking (`25 m left`). PRD memperlakukan keduanya sebagai meter jarak tersisa ke bay.
5. **Delta Trucks on site** bisa berubah (`+2` → `+1` → `+0`), tapi aturannya tidak terlihat. PRD menganggapnya data tetap per site dalam satu sesi.

## 19. Catatan implementasi v1

Keputusan yang diambil saat membangun, di luar yang sudah tertulis di atas:

| Topik | Keputusan |
|---|---|
| Kode | Satu aplikasi Vite di root proyek: `src/data` (site dan seed), `src/sim` (engine, jalur, angka turunan), `src/world` (adegan Three.js), `src/ui` (kartu dan header). |
| Cargo | `Cargo` mengikuti aturan "pallet di truk / kapasitas" (§18B). Karena itu TRK-2205 tampil `4/7 pallets · 1.2 t`, bukan `3/7` seperti di video. |
| Aktivitas forklift `Idle` | Kalimat status: `Parked · waiting for task`. |
| Status charger | `Charging FL-xx` saat mengisi. Bila bebas: `FL-xx is out · …` (forklift asalnya sedang bekerja), `FL-xx is parked · Idle`, atau `Ready`. |
| Kedatangan truk di gerbang | Hanya satu truk boleh docking pada satu waktu per site. Truk lain menunggu dengan status At gate. |
| Forklift | Forklift idle dengan baterai ≥ 30% otomatis ditugaskan ke truk di bay yang belum punya forklift. Selama belum ada forklift, progres bongkar/muat berhenti. |
| Truk lalu lintas | 12 truk ambient berputar antara tepi peta. Ditambah 7 truk diam di lahan parkir seberang WH-04. |
| Kualitas render | Bayangan hanya dihitung di sekitar titik pandang kamera, dan dimatikan saat kamera sangat jauh (Network overview). |
| Papan nama gedung | Papan di fasad kelima gedung dan decal di atap WH-01 memakai identitas MPM Group: logo resmi, `MPM Group`, `PT Mitra Pinasthika Mustika Tbk`, dan `{kode} · {nama site}`. Logo dibaca dari `public/brand/mpm-logo.svg` atau `public/brand/mpm-logo.png`. Selama file belum ada, papan hanya menampilkan teks. Nama aplikasi (header) dan truk WareTrack Freight tidak berubah. |
| Staging dan jalur forklift | Setiap bay punya 3 slot staging di celah sampingnya (sisi +x pintu). Forklift bongkar/muat hanya memakai slot bay-nya sendiri, atau pintu forklift kecil di sebelah pintu dock untuk pallet yang masuk/keluar gedung. Rute forklift direncanakan dengan A* yang menghindari gedung, truk yang parkir, pallet staging, charger, forklift lain yang parkir, dan area yang akan disapu truk docking/berangkat. Bila jalurnya sedang terhalang manuver truk, forklift menunggu (maksimal 3 menit simulasi) sebelum berangkat. Charger dan tempat parkir forklift diletakkan di luar jalur truk. |
| Lalu lintas truk | Truk (termasuk lalu lintas kota) bergerak dengan kecepatan, bukan jadwal tetap. Setiap langkah, truk memeriksa 34 m jalur di depannya; bila badannya akan bersinggungan dengan kendaraan lain, truk melambat atau berhenti dan mengantre. Kendaraan yang memotong jalur dihindari dari jarak 18 m. Saling-tunggu antar dua kendaraan didahulukan yang posisinya di depan; saling-tunggu melingkar (gridlock) dipecah dengan mendahulukan satu kendaraan. Truk baru hanya muncul bila titik masuknya kosong. ETA dihitung dari sisa jarak, sehingga ikut mundur saat truk tertahan. |
| Gerbang | Gerbang punya dua lajur: masuk di sisi timur, keluar di sisi barat (lalu lintas kanan), dan berada sekitar 49 m dari persimpangan. Truk menunggu di dalam pagar dengan hidung di palang, tidak menghalangi jalan. Hanya satu truk boleh berada di 34 m terakhir sebelum gerbang; truk berikutnya menunggu di lajurnya. Hanya satu truk bermanuver di yard pada satu waktu (docking atau keluar), dan truk keluar satu per satu. Forklift dilepas begitu bongkar/muat selesai, walau truknya masih menunggu giliran keluar. |
| Slot staging yang dipesan | Slot yang sudah dipesan siklus bongkar (pallet belum diletakkan) ikut dihitung sebagai rintangan saat forklift lain merencanakan rute, supaya forklift tidak melintas tepat saat pallet diletakkan. |
| Forklift dan truk yang sedang bergerak | Forklift yang sudah menunggu lebih dari 8 menit boleh memotong area truk yang masih menunggu di gerbang atau akan datang, tetapi tetap menunggu truk yang sedang mundur ke bay atau keluar dari halaman. |
| Site ke-6 | WH-06 MPM Learning Center Sidoarjo ditambahkan lewat addendum `prd-mpm-learning-center.md`, sebagai distrik berskala asli di barat kota. Keputusan implementasinya di §16 addendum itu. |
| Site dengan pintu masuk samping | Hanya WH-06; site kota tidak berubah. Bay boleh punya lajur dock sendiri, dan tiap lajur dikunci sendiri, bukan satu kunci yard per site. Di persilangan arus truk, hanya satu arus yang boleh lewat pada satu waktu. Forklift tidak merencanakan rute di sepanjang lajur truk. Truk memberi jalan kepada forklift yang sedang melaju, dan baru mulai mundur atau keluar bila tidak ada forklift yang rutenya melintasi area sapuan truk itu. |
