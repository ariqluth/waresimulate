# PRD WareTrack — Site ke-6: MPM Learning Center Sidoarjo (peta 3D lokasi nyata)

| | |
|---|---|
| Versi | v2.1, draf |
| Jenis | Addendum untuk `prd.md` (v2). Semua yang tidak disebut di sini tetap mengikuti v2. |
| Lokasi acuan | MPM Learning Center - Sidoarjo. Pin Google Maps: `-7.3907092, 112.7516072`. |
| Bahasa | Label antarmuka berbahasa Inggris, prosa persyaratan berbahasa Indonesia, sama seperti v2. |
| Status | Diimplementasikan 9 Okt 2026 dari peta berlabel pengguna (`src/data/geo/mpm.geojson`). Q1, Q2, Q3, Q6, Q7 terjawab (§16). Q4 masih nilai sementara. Nilai yang masih berupa tebakan diberi tanda ⚠. |

## 1. Ringkasan

WareTrack v2 menampilkan kota 3D fiktif di New Jersey dengan lima site. Addendum ini menambahkan **WH-06, MPM Learning Center Sidoarjo**, sebagai site keenam yang bentuk fisiknya diambil dari peta nyata (bangunan, jalan, dan lahan di sekitar pin), digambar dengan gaya low-poly yang sama dengan site lain.

Di atas lokasi nyata itu berjalan **operasi logistik virtual** dengan mekanisme yang sama seperti site lain: truk masuk gerbang, mundur ke dock, forklift memindahkan pallet, charger mengisi baterai. Data dan simulasinya mock.

### Keputusan yang sudah diambil

| Topik | Keputusan |
|---|---|
| Posisi dalam aplikasi | Site ke-6 (WH-06) di samping WH-01 s/d WH-05. Switcher, Network overview, pencarian, dan KPI ikut mencakupnya. |
| Sumber geometri 3D | Footprint bangunan dan jalan dari OpenStreetMap, ditambah gedung utama MPM Learning Center yang dimodel manual lebih detail. |
| Objek yang ditampilkan | Logistik ala WareTrack: truk, dock, forklift, pallet, charger. |
| Sumber data | Mock dan simulasi lokal, tanpa backend. |

## 2. Masalah dan tujuan

Dashboard v2 sudah membuktikan bahwa operasi gudang terbaca sekilas dalam dunia 3D, tetapi dunianya fiktif. Dengan satu lokasi nyata di dalamnya, tim MPM bisa menilai apakah pendekatan ini layak dipakai untuk lokasi MPM lain, dan demo menjadi lebih mudah dipahami karena penonton mengenali tempatnya.

Tujuan:

1. Pengguna dapat memilih WH-06 dan melihat gedung MPM Learning Center beserta lingkungan terdekatnya dalam 3D, dengan posisi dan bentuk yang dikenali.
2. WH-06 berperilaku seperti site lain: semua objek bisa diklik, KPI dan antrian terisi, kamera bisa fokus dan mengikuti.
3. Menambah WH-06 tidak mengubah perilaku WH-01 s/d WH-05.
4. Alur pengambilan data peta bisa diulang untuk lokasi lain tanpa mengubah kode render.

Bukan tujuan:

- Replika presisi. Ini peta bergaya, bukan model survei.
- Menampilkan operasi nyata Learning Center. Dock, gerbang, forklift, dan truk di WH-06 adalah simulasi yang ditumpangkan pada bangunan nyata.
- Foto udara, tekstur satelit, atau tile 3D fotorealistik. Gaya visual tetap §7 pada v2.

## 3. Pengguna

Sama dengan v2: Operations Manager (`Alex Chen`) yang memantau seluruh jaringan. Tidak ada peran baru.

## 4. Hasil pengecekan kelayakan (9 Okt 2026)

Dicek ke OpenStreetMap lewat Overpass API pada pin di atas.

| Temuan | Arti untuk desain |
|---|---|
| ≥ 24 footprint bangunan dalam radius 200 m, semuanya hanya bertag `building=yes`. Tidak ada nama, tinggi, maupun jumlah lantai. | Bentuk lantai bisa otomatis. Tinggi harus ditentukan dengan aturan (§6.3) dan ditimpa manual untuk gedung penting. |
| Tidak ada objek bernama "MPM" dalam radius 400 m. | Gedung utama harus ditunjuk manual (§13, Q1). Jawaban pengguna: gedung utama adalah **gudang** MPM Learning Center. |
| Kandidat gudang di sekitar pin (E = timur, S = selatan dari pin): way 669568315, 50 × 29 m, 1.354 m², 22 m ke E; way 669568326, 119 × 30 m, 3.548 m², 57 m ke NW; way 669568331, 118 × 43 m, 5.045 m², 84 m ke WSW; way 669568334, 331 × 65 m, 20.971 m², 170 m ke WSW. Deretan bangunan sangat panjang (≥ 500 m) di selatan, ±460 m dari pin, kemungkinan bukan bagian site. | Gudang biasanya berfootprint besar, jadi 669568326 atau 669568331 lebih masuk akal daripada 669568315 yang paling dekat dengan pin. Belum bisa dipastikan tanpa citra. Pratinjau peta berlabel ID ada di `preview-footprint-wh06.html` (buka di browser) untuk dikonfirmasi (§13, Q1). |
| Reverse geocoding OSM (Nominatim) pada pin: Sedati Agung, Kecamatan Sedati, Kabupaten Sidoarjo, Jawa Timur 60900. Nama jalan tidak ada di OSM. | Alamat administratif sudah ada. Nama jalan dan nomor dari listing resmi masih perlu dicari (§13, Q3). |
| Berkas logo `src/public/brand/mpm-logo.png`: 774 × 211 px, RGBA (latar transparan), oranye MPM. | Memenuhi syarat README (transparan, ≥ 600 px). Tinggal dipindah ke `public/brand/` (§7). |
| Tangkapan layar 3D Google dari pengguna (9 Okt 2026, pandangan miring): pin berada di tepi utara sebuah kluster gudang. Di kiri ada penanda "MPM Honda Safety Riding Center" dengan lintasan latihan yang dicat di halaman beraspal. Gudang berupa bangunan memanjang satu lantai, atap logam abu muda atau putih, sebagian berusuk atau bergerigi (sawtooth) dengan strip cahaya. Di utara ada gudang dengan panel surya di atap. Di kanan atas ada bangunan beratap genteng cokelat-merah. Garis biru di tepi kanan dan bawah tampaknya jangkauan Street View, jadi foto level jalan hanya ada dari jalan luar. | Cukup untuk gaya, warna atap, dan tata letak kasar. Tidak cukup untuk bentuk akurat: pandangan miring tidak memberi skala, arah utara, atau koordinat. Kompleksnya jauh lebih besar dari jendela blok 124 × 94 m (footprint di sekitarnya 119–331 m panjangnya), jadi harus dipilih bagian mana yang dipetakan (§13, Q1). Lintasan Safety Riding bisa menjadi ciri khas di halaman. |
| Jaringan jalan servis padat di dalam kompleks (±35 way `highway=service`), satu jalan `tertiary` (Jalan Rajawali, ±235 m ke timur), beberapa jalan `residential`. | Jalan dalam kompleks bisa digambar sebagai dekor. Jalur truk simulasi tidak mengikutinya (§6.5). |
| Ada satu poligon `landuse=industrial` di selatan pin dan satu `landuse=residential` bernama "Valencia" di barat daya. | Bisa dipakai untuk warna lahan. Tidak wajib. |

Google Maps, tampilan 3D, dan Street View hanya dipakai sebagai **acuan visual oleh manusia** untuk menentukan warna dan tinggi gedung (§6.3). Tidak ada data, gambar, tangkapan layar, atau tile Google yang masuk ke repo atau aplikasi. Yang masuk hanya angka dan kode warna hasil pengamatan.

## 5. Ruang lingkup

**Termasuk**

- Site WH-06 dengan kode, nama, tipe, alamat, kapasitas, dan badge (§8).
- Skrip build-time yang mengambil data OSM, memproyeksikannya ke koordinat dunia aplikasi, dan menyimpan hasilnya sebagai file JSON di repo (§6).
- Render bangunan, jalan, dan lahan dari file JSON itu pada blok WH-06.
- Model manual gedung utama MPM Learning Center, papan nama, dan logo MPM.
- Operasi virtual di WH-06: 3 bay, 2 charger, area staging, gerbang (§8).
- Data mock WH-06: truk, forklift, pallet, inventory, shipment (§9).
- Tampilan atribusi OpenStreetMap (§10).
- Penyesuaian kamera Network overview agar enam site terlihat.

**Di luar lingkup**

- Data atau API nyata, login, dan penyimpanan di server.
- Rute truk yang mengikuti jalan nyata, dan jalan penghubung antara WH-06 dan kota fiktif. Kandidat v3 (§12).
- Peta nyata untuk lokasi lain selain WH-06.
- Ruang kelas, okupansi, peserta, atau jadwal pelatihan.
- Interior gedung.
- Tekstur satelit, Google Photorealistic 3D Tiles, dan request jaringan saat aplikasi berjalan.

## 6. Pendekatan teknis

### 6.1 Alur data

```
OpenStreetMap ──┐
                ├─(skrip, sekali jalan)──> src/data/geo/wh06.json ──(runtime, tanpa jaringan)──> SiteModel
Jejak KML ──────┘                              ▲
(digambar pengguna)                 src/data/geo/wh06.overrides.json
src/data/geo/ref/wh06-trace.kml     (tinggi, warna, bangunan yang dibuang)
```

- **Jejak KML dari pengguna adalah sumber utama bentuk bangunan.** Footprint OSM di area ini terbukti ada yang tidak sesuai kenyataan, jadi OSM hanya dipakai untuk bangunan sekitar yang tidak dijejak. Bila sebuah bangunan ada di jejak KML, polygon OSM yang tumpang tindih dengannya dibuang.
- Cara pengguna membuat jejak: gambar poligon atap di atas citra satelit memakai Google My Maps, beri nama dan deskripsi pada tiap poligon, lalu ekspor sebagai KML (langkah di §6.1a).
- Skrip `scripts/fetch-geo.mjs` memanggil Overpass untuk radius ⚠ 250 m dari titik tengah gedung utama dan mengambil `building`, `highway`, dan `landuse`.
- Hasilnya dikerjakan skrip itu juga: proyeksi, rotasi, pemotongan, dan penerapan override. File JSON yang dihasilkan di-commit. Aplikasi tidak pernah memanggil Overpass saat berjalan, sehingga tetap memenuhi aturan v2 "tidak ada request jaringan".
- Skrip memakai User-Agent yang jelas dan satu kali panggilan per lokasi, untuk menghormati batas Overpass.

### 6.1a Format jejak KML

Satu file KML, satu `Placemark` per objek. Skrip membaca nama dan deskripsi sebagai berikut.

| Objek | Jenis `Placemark` | Nama | Deskripsi (opsional, pisahkan dengan `;`) |
|---|---|---|---|
| Gudang utama | Poligon | `gudang-utama` | `tinggi=9; dinding=putih; atap=biru; atap-bentuk=datar; dock=4` |
| Bangunan lain di dalam site | Poligon | `bangunan-<nama>` | `tinggi=…; dinding=…; atap=…` |
| Pagar atau batas lahan | Poligon | `batas-site` | — |
| Gerbang | Titik | `gerbang` | — |
| Sisi pintu dock | Garis dua titik | `dock` | — |
| Parkir atau area truk | Poligon | `parkir` | — |

- GeoJSON (mis. dari geojson.io) juga diterima, dengan `wh06-trace.geojson` di folder yang sama. Properti `name` setara dengan nama `Placemark`, dan properti `description` atau properti terpisah (`tinggi`, `dinding`, `atap`, `dock`) setara dengan deskripsinya.
- Hanya `gudang-utama` yang wajib. Objek lain boleh menyusul, dan yang tidak ada diisi aturan bawaan (§6.2, §6.3).
- `tinggi` dalam meter, atau `lantai=` bila hanya tahu jumlah lantai. Warna boleh nama (putih, biru) atau kode hex.
- Jejak digambar di atas atap. Citra satelit miring menggeser sudut atap beberapa meter dari tapak bangunan sebenarnya. Selisih ini diterima selama ≤ 5 m (§15).
- Berkas ini buatan pengguna (gambar tangan). Citra Google hanya latar saat menggambar dan tidak ikut tersimpan.

### 6.2 Proyeksi dan orientasi

- Titik asal lokal = pusat footprint gedung utama (bukan pin).
- `x = (lon − lon0) · 111320 · cos(lat0)`, `z = −(lat − lat0) · 110574`. Satuan meter, sama dengan satuan dunia aplikasi (jarak antar bay 14–16 satuan, lebar jalan 18).
- Utara = −z sebelum rotasi.
- Mesin simulasi mengasumsikan fasad dock menghadap +z, bay berjajar sepanjang x, dan jalan akses di `center.z + 60`. Karena itu seluruh data peta diputar sebesar **heading offset θ** sehingga fasad yang dipilih sebagai sisi dock menghadap +z. θ disimpan di file JSON.
- Karena peta diputar, utara sejati tidak lagi di atas layar. WH-06 menampilkan penunjuk utara kecil di Inspector (tanpa ini pengguna akan salah membaca arah).

### 6.3 Tinggi bangunan

Urutan aturan, berhenti di yang pertama cocok:

1. Override di `wh06.overrides.json` per ID way. Untuk gudang utama dan bangunan di sekitarnya, tinggi dan warna dinding serta atap mengikuti tampilan 3D dan Street View Google, dibaca oleh manusia lalu dicatat di berkas override: tinggi dalam meter (atau jumlah lantai × 3,4 m), warna dalam kode hex, bentuk atap (datar atau pelana), dan tinggi pintu dock bila terlihat. Pengembang tidak dapat melihat tampilan Google, jadi angka ini harus diberikan pengguna (§13, Q4).
2. Tag `height`, lalu `building:levels × 3,4 m + 1 m`.
3. Tanpa tag, menurut luas footprint: < 60 m² → 3,5 m; 60–400 m² → 5 m; > 400 m² → 8 m. ⚠ Angka tebakan, disetel setelah dilihat di layar.

### 6.4 Render

- Footprint diekstrusi menjadi `ExtrudeGeometry`. Semua bangunan WH-06 digabung per material menjadi sedikit mesh supaya jumlah draw call kecil.
- Material mengikuti palet v2 §7.2: dinding terang, atap putih kebiruan, jendela memakai tekstur `windows()` yang sudah ada. Bangunan sekitar polos, gedung utama lebih detail.
- Jalan digambar sebagai pita datar menurut kelas: `tertiary` 8 m, `residential` 5,5 m, `service` 3,5 m, `path` dan `footway` 1,2 m. Warna jalan = token `road`.
- Lahan: `industrial` memakai warna `lot`, sisanya warna `ground`. Pohon opsional, pakai `Instanced` yang sudah ada.
- Semua dibatasi jendela blok site: `PLOT_HX × 2` kali `PLOT_HZ × 2` = 124 × 94 m. Bangunan yang titik pusatnya di luar jendela dibuang. Yang menyilang batas dipotong pada pagar.
- Pagar, gerbang, dan palang di tepi blok memakai komponen yang sudah ada di `SiteModel`.

### 6.5 Operasi virtual dan jalur truk

- `path.ts` membangun graf jalan dari grid kota (`X_ROADS`, `Z_ROADS`) dan menganggap setiap site duduk di blok grid dengan jalan di depan gerbang. Karena itu WH-06 ditempatkan **di salah satu blok grid yang masih bebas**, bukan di luar grid. Mesin simulasi, path, dan pose tidak perlu diubah.
- Usulan blok: pusat `(-75, 120)`, tepat di barat WH-04. ⚠ Boleh diganti blok bebas lain dengan ukuran sama (132 × 102 m).
- Akibatnya jalan nyata di dalam blok hanya dekor. Truk simulasi masuk dari jalan grid fiktif di depan gerbang, lalu parkir di bay virtual. Hal ini harus terbaca jelas oleh pengguna (§8, label `Simulated`).
- Bay, staging, charger, dan titik parkir forklift ditentukan lewat `SiteSpec` seperti site lain, ditempatkan pada ruang kosong di depan fasad dock yang dipilih. Posisi persisnya ditetapkan di M0 setelah footprint terlihat.

## 7. Perubahan pada kode (acuan implementasi)

| Berkas | Perubahan |
|---|---|
| `src/data/types.ts` | `SiteCode` ditambah `'WH-06'`. `SiteType` ditambah `'LEARNING CENTER'`. `BuildingStyle` ditambah `'geo'`. |
| `src/data/sites.ts` | Tambah satu `SiteSpec` WH-06 dan masukkan ke `SITE_ORDER`. Bay, charger, home, dan gerbang memakai bentuk yang sama dengan site lain. |
| `src/data/seed.ts` | Semua `Record<SiteCode, …>` wajib ditambah entri WH-06. TypeScript akan menandai yang terlewat. |
| `src/data/geo/` | Baru: `wh06.json` (dihasilkan) dan `wh06.overrides.json` (ditulis tangan). |
| `scripts/fetch-geo.mjs` | Baru: ambil, proyeksikan, putar, potong, tulis JSON. |
| `src/world/SiteModel.tsx` | Tambah `case 'geo'` yang merender dari JSON, plus komponen gedung utama. |
| `src/world/City.tsx` | Tidak perlu diubah: `isSite` sudah membaca `SITES`. Catatan: kota acak memakai satu aliran `Rng`, jadi blok yang berubah menjadi site menggeser gedung acak di blok lain. Bila itu tidak diinginkan, tetap panggil `rng` untuk blok itu lalu buang hasilnya. |
| `src/data/sites.ts` `OVERVIEW_CAMERA` | Jarak dan target disetel ulang agar enam site muat. |
| `src/ui/Inspector.tsx` | Cabang khusus WH-06: label `Simulated` dan penunjuk utara. |
| UI global | Teks atribusi OSM (§10). |
| Logo | Berkas sudah ditentukan: `src/public/brand/mpm-logo.png` (774 × 211, RGBA). `textures.ts` memuat `/brand/mpm-logo.*`, sedangkan Vite hanya menyajikan `public/` di akar proyek, dan `dist/` tidak berisi folder `brand`. Logo kemungkinan belum tampil di semua site. Pindahkan berkas ke `public/brand/mpm-logo.png` sebagai bagian dari pekerjaan ini. |

## 8. Spesifikasi site WH-06

| Field | Nilai |
|---|---|
| Kode | `WH-06` |
| Nama | MPM Learning Center Sidoarjo ⚠ (nama tampilan boleh dipendekkan) |
| Tipe (eyebrow) | `LEARNING CENTER` |
| Alamat | Sedati Agung, Sedati, Sidoarjo, Jawa Timur 60900 ⚠ (dari OSM, belum ada nama jalan. Alamat resmi dari listing diisi setelah Q3 dijawab) |
| Badge | `primary` |
| Kapasitas | 1.200 pallet ⚠ |
| Bay | `Bay 1`–`Bay 3`, jenis `Bay` |
| Charger | `C1`, `C2`, laju 6 %/menit |
| Gaya bangunan | `geo` |
| Kamera site | Jarak 175 m, target `(0, 0)`. | Dock, sisi timur hall, dan jalan dari pos satpam masuk satu pandangan. |

Inspector site WH-06 menampilkan pil **Simulated** di dekat status, dan satu baris catatan: "Dock and vehicle activity at this site is simulated." Tujuannya agar tidak ada yang mengira dock dan truk itu nyata.

## 9. Data mock WH-06

Ikuti pola v2 §15. Isi awal minimal:

| Objek | Jumlah | Catatan |
|---|---|---|
| Truk | 3 | 1 di bay, 1 menunggu di gerbang, 1 en route. Carrier memakai empat carrier yang sudah ada. |
| Forklift | 2 | 1 bekerja, 1 charging. Kode melanjutkan penomoran (`FL-18`, `FL-19`). |
| Pallet | ≈ 6 | Sebagian di staging. |
| Inventory | 5–6 SKU | Memakai SKU yang sudah ada. |
| Shipment | 3 | Satu per truk. Customer dan tujuan memakai nama fiktif. |
| Pelat nomor | — | Format Indonesia, mis. `L 1234 AB` ⚠ |

Simulasi tetap deterministik berdasarkan seed (v2 §12.5). Skenario pembuka WH-04 (v2 §12.6) tidak boleh berubah.

## 10. Atribusi dan lisensi

- Data OpenStreetMap berlisensi ODbL. Teks **© OpenStreetMap contributors** wajib terlihat di UI, minimal di sudut kanvas, dan boleh tampil terus (bukan hanya saat WH-06 dipilih).
- Logo dan nama MPM dipakai sebagai papan nama, mengikuti README yang sudah ada.
- Tidak ada data Google yang dipakai (§4).

## 11. Persyaratan fungsional

| ID | Persyaratan |
|---|---|
| FR-G1 | Switcher menampilkan enam site berurutan WH-01 s/d WH-06. Tombol `>` berputar melewati enam. |
| FR-G2 | Network overview menampilkan keenam site dalam satu bingkai, dan total KPI = jumlah keenam site. |
| FR-G3 | Memilih WH-06 menggerakkan kamera ke site itu dengan animasi yang sama seperti site lain. |
| FR-G4 | Gedung utama MPM Learning Center tampil dengan papan nama dan logo MPM. Bangunan sekitar dari footprint nyata tampil dalam jendela blok. |
| FR-G5 | Jalan dan lahan dari data peta tampil sebagai dekor di dalam blok. |
| FR-G6 | Pencarian menemukan WH-06, truk, forklift, pallet, dan shipment milik WH-06. |
| FR-G7 | Setiap objek WH-06 (truk, forklift, pallet, bay, charger, site) bisa diklik dan memunculkan Inspector. |
| FR-G8 | Truk WH-06 menjalani siklus yang sama: en route, at gate, docking, working, departing. Tidak ada truk atau forklift yang menembus bangunan geo. |
| FR-G9 | Inspector WH-06 menampilkan pil `Simulated` dan penunjuk utara. |
| FR-G10 | Teks atribusi OSM terlihat di UI (§10). |
| FR-G11 | Skrip `fetch-geo` dapat dijalankan ulang dan menghasilkan JSON yang identik bila data OSM tidak berubah. |
| FR-G12 | Aplikasi tidak memanggil jaringan untuk data peta saat berjalan. |

### Non-fungsional

| ID | Persyaratan |
|---|---|
| NFR-1 | Penambahan WH-06 tidak menambah lebih dari ⚠ 25 draw call dan tidak menurunkan FPS rata-rata di Network overview lebih dari 10 % dibanding sebelum WH-06, diukur pada mesin yang sama. |
| NFR-2 | Ukuran `wh06.json` ≤ ⚠ 300 KB. |
| NFR-3 | `npm run build` (typecheck + build) lulus tanpa galat. |
| NFR-4 | Perilaku WH-01 s/d WH-05 dan skenario pembuka WH-04 tidak berubah. |

## 12. Fase dan tonggak

| Tonggak | Isi | Ukuran |
|---|---|---|
| M0 Survei data | Tentukan footprint gudang, fasad dock, titik gerbang, heading θ, tinggi dan warna gedung, alamat (§13). Logo sudah ada. Keluaran: `wh06.overrides.json` awal dan keputusan blok. | S |
| M1 Pipeline geo | `fetch-geo.mjs`, proyeksi, rotasi, pemotongan, JSON. Pratinjau 2D sederhana untuk memeriksa posisi. | M |
| M2 Render | `case 'geo'`: bangunan, jalan, lahan, pagar. Gedung utama manual. | M |
| M3 Integrasi | Tipe, `SiteSpec`, seed, Inspector, atribusi, kamera Overview. | M |
| M4 Poles dan uji | Performa, bandingkan dengan citra satelit secara visual, uji regresi WH-01 s/d WH-05. | S |

Kandidat v3, belum dijadwalkan:

- Distrik georeferensi di luar grid dengan skala dan jalan nyata, dengan jalan penghubung ke kota fiktif dan graf jalan yang diperluas.
- Rute truk yang mengikuti jalan nyata.
- Lokasi MPM lain memakai skrip yang sama.

## 13. Pertanyaan terbuka

| # | Pertanyaan | Pemilik | Dampak bila belum dijawab |
|---|---|---|---|
| Q1 | **Sebagian terjawab:** gedung utama adalah gudang MPM Learning Center. Pengguna melaporkan bentuk poligon OSM salah, jadi bentuk gudang diambil dari jejak KML buatan pengguna (§6.1a), bukan dari ID way OSM. Perlu berkas `wh06-trace.kml` dengan minimal poligon `gudang-utama`. Karena kompleksnya besar (§4), pengguna juga harus menunjuk bangunan mana di kluster itu yang dimaksud gudang utama. Tangkapan layar miring tidak cukup sebagai pengganti jejak. | Pengguna | Gedung utama salah sasaran. Menghalangi M0. |
| Q2 | Sisi mana yang menjadi fasad dock virtual, dan di mana gerbang virtualnya? Menentukan θ. **Belum dijawab.** Bisa dijawab lewat jejak KML: garis `dock` dan titik `gerbang` (§6.1a). Bila tidak, usulan awal: sisi terpanjang gudang yang menghadap jalan servis terdekat. | Pengguna | θ dan posisi bay memakai usulan awal. |
| Q3 | **Sebagian terjawab:** pakai alamat resmi dari listing Google Maps. Pengembang tidak bisa membaca listing itu (halaman Google tidak terbaca dan hasil pencarian web tidak memuat alamat). Mohon tempel teks alamat dari listing: jalan, nomor, kelurahan, kecamatan, kode pos. | Pengguna | Memakai alamat OSM di §8: Sedati Agung, Sedati, Sidoarjo 60900. |
| Q4 | **Arah terjawab:** warna dan tinggi mengikuti tampilan 3D dan Street View Google. Pengembang tidak bisa melihat Google, jadi perlu angkanya: tinggi atau jumlah lantai gudang, warna dinding dan atap (nama warna cukup, mis. putih dan biru), bentuk atap, dan jumlah pintu dock yang terlihat. Angka ini ditulis di deskripsi poligon pada jejak KML (§6.1a), atau dikirim sebagai foto atau tangkapan layar langsung ke sesi ini (tidak di-commit). | Pengguna | Gedung utama memakai aturan tinggi umum (§6.3) dan warna standar. |
| Q5 | ✅ Selesai: `src/public/brand/mpm-logo.png`, 774 × 211, latar transparan. Hanya tinggal dipindah ke `public/brand/` (§7). | — | — |
| Q6 | Blok grid mana yang dipakai untuk WH-06? Usulan `(-75, 120)`. | Pengembang | Tidak menghalangi. Mudah diganti. |
| Q7 | Perlu atau tidak distrik georeferensi skala penuh (kandidat v3) dalam waktu dekat? | Pengguna | Menentukan apakah graf jalan perlu dirancang ulang lebih awal. |

## 14. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data OSM kurang lengkap atau usang (bangunan baru belum ada). | Peta tidak sama dengan kenyataan. | Override manual per bangunan, dan tambah bangunan tangan bila perlu. |
| Pengguna mengira dock dan truk WH-06 nyata. | Salah paham di demo. | Pil `Simulated` dan catatan di Inspector (§8). |
| Peta diputar sebesar θ. | Pengguna salah membaca arah. | Penunjuk utara (§6.2). |
| Jendela blok 124 × 94 m memotong kompleks nyata. **Sudah terkonfirmasi**: kompleksnya beberapa kali lebih besar dari jendela. | Hanya sebagian kompleks yang tampil. | Pilih sub-area yang paling mewakili (gudang utama dan Safety Riding Center bila muat), dan tandai jelas di UI bahwa ini sebagian. Bila ingin seluruh kompleks, naikkan ke v3. |
| Overpass membatasi atau mati saat dijalankan. | Skrip gagal. | JSON di-commit, jadi aplikasi tidak bergantung pada Overpass. |
| Geometri geo berat. | FPS turun. | Gabung mesh, batas jumlah bangunan, ukur dengan NFR-1. |

## 15. Kriteria penerimaan

Build diterima bila:

1. Switcher menampilkan enam site dan `>` berputar melewati WH-06.
2. WH-06 menampilkan gedung utama dengan papan nama, bangunan sekitar dari data peta, dan jalan dekor, dalam satu blok grid.
3. Posisi gedung utama dan bangunan di sekelilingnya cocok dengan citra satelit pada pemeriksaan visual: tiap bangunan di jendela blok berada pada sisi yang benar relatif terhadap gedung utama, dengan galat posisi tidak lebih dari ±5 m.
4. Inspector WH-06 menampilkan `Simulated`, penunjuk utara, dan alamat.
5. Truk WH-06 menyelesaikan siklus penuh tanpa menembus bangunan, dan forklift memindahkan pallet antara truk dan staging.
6. Total KPI di Network overview sama dengan jumlah keenam site.
7. Teks `© OpenStreetMap contributors` terlihat.
8. Tab Network di DevTools tidak menunjukkan request ke Overpass atau OSM saat aplikasi berjalan.
9. `npm run build` lulus dan skenario pembuka WH-04 sama seperti sebelum perubahan.
10. NFR-1 dan NFR-2 terpenuhi.

## 16. Catatan implementasi (9 Okt 2026)

Keputusan saat membangun WH-06. Nilai bertanda ⚠ menunggu konfirmasi pengguna (§13).

| Topik | Keputusan | Alasan dan sumber |
|---|---|---|
| Sumber batas kompleks | Peta berlabel dari pengguna: `src/data/geo/mpm.geojson` (9 garis + titik alamat). Garis-garis ini menentukan bagian kompleks dan batasnya. | Pengguna: "ini yang betul". Dua pilihan gedung utama sebelumnya (669568315, lalu 669568326) salah. |
| Bagian kompleks | Kantor utama, Tempat penitipan helm (2), Gudang part 1, Kantin dan learning study MPM: gedung dari garis pengguna. Parkir motor dan Pos satpam: area terbuka, berisi bangunan OSM di dalamnya (shed motor, pos jaga). Gudang part utama: lahan berisi hall gudang utama, gedung baru di lahan kosong barat hall, dan gedung Safety Riding Center (669568315). Lapangan tidak digambar (`kind: removed`): tanahnya menjadi halaman truk dock utama. Label tampil di atas tiap bagian saat WH-06 dibuka. | Isi tiap garis dicocokkan dengan citra satelit. Ejaan label dirapikan untuk tampilan ("pakir" → "Parkir", "tmpat penitioan" → "Tempat penitipan"); berkas GeoJSON tidak diubah. |
| Skala dan posisi (Q6, Q7) | Skala asli, utuh, tidak ada yang terpotong. Kompleks ±148 × 380 m terlalu besar untuk satu blok kota (124 × 94 m), jadi WH-06 menjadi distrik sendiri di barat kota (pusat operasi `(-680, 0)`). Sisi utaranya menghadap jalan utara (Jalan Rajawali) yang bertemu jalan kota z = 60. Blok `(-75, 120)` kembali menjadi blok kota biasa. | Permintaan pengguna: "benarkan yang masih kepotong". |
| Gedung utama (Q1) | Hall panjang di dalam "Gudang part utama", tidak ada di OSM: x 49,4–77,9, z −75 s/d 141 (kerangka grid, ±29 × 216 m), tinggi 11 m, atap pelana dalam 3 bagian warna sesuai citra. Ujung utara (z −102,6 s/d −75) bukan bangunan, tetapi jalan dan apron bongkar muat Gudang part 1. Lahan kosong di barat hall (x −6,8 s/d 49,4, z 16 s/d 141) diisi gedung baru bagian Gudang part utama: tinggi 10 m, atap 3 pelana. Pagar kompleks tidak berubah. | Diukur dari citra satelit dengan grid meter; sisi timur mengikuti garis pengguna. Ujung utara dihapus atas permintaan pengguna (kotak biru, 9 Okt 2026). Gedung barat juga atas permintaan pengguna: "border biru tolong buatkan gedung jadikan gudang part utama (jangan rusak pagar itu)" (9 Okt 2026). |
| Fasad dock dan θ (Q2) | Sisi timur hall, menghadap area terbuka tempat truk berdiri di citra. Peta diputar 80,38° (grid −9,62° lalu seperempat putaran). | Pengguna: truk ke Gudang part utama bongkar dengan forklift lewat jalan di sisi timur (kotak merah, 9 Okt 2026). |
| Halaman dock | Tiga area (koordinat lokal): halaman dock utama x −200 s/d −105, z −15 s/d 31, ditambah x −105 s/d −86, z −15 s/d 11 (bekas Lapangan, di ujung selatan dinding timur hall); dan apron Gudang part 1, x 28 s/d 54, z −47 s/d −10. Bangunan OSM yang dibuang: 669568314 (bangunan kecil di jalur truk ke Gudang part 1, kotak merah) dan 669568300 (berdiri di tempat gedung barat). Lintasan latihan dihapus. | Permintaan pengguna (9 Okt 2026). Bangunan lain tidak tersentuh. |
| Alamat (Q3) | `Jl. Raya Sedati No.101, Sidoarjo 61254`. | Titik alamat di peta pengguna. |
| Tinggi dan warna (Q4) ⚠ | Hall 11 m; Kantor utama 10 m; Gudang part 1 9 m (atap putih 4 pelana); Tempat penitipan helm 8 m dan 4,5 m (atap karat); Kantin 7 m; Safety Riding Center 9 m dengan atap merah. List oranye logo MPM di hall. | Dari citra satelit tampak atas dan screenshot Google 3D pengguna; hanya dilihat, tidak disimpan. |
| Kerangka fitur buatan tangan | Override memakai kerangka grid (meter dari pin, diputar −9,62°). Kerangka lokal = grid diputar agar sisi dock menghadap +z, dengan `frame.anchor` di pusat site. | Mengganti gedung utama atau sisi dock tidak menggeser fitur lain. |
| Bay, gerbang, charger | 6 bay. Bay 1–5 di dinding timur hall, x −116, −130, −144, −158, −172 (ujung selatan, kotak hijau). Gudang 1 di dinding timur Gudang part 1 (30,5, −47,8), menghadap apron, tanpa pintu forklift samping. C1 dan C2 di (−130, 26) dan (−134,5, 26). Titik parkir forklift (−150, 24). Palang gerbang di depan pos satpam. Papan nama dan logo atap di atas dock hall. | Pengguna: "di gudang part utama border hijau … di isi 5 truk" dan "cuma bisa 1 truk aja di gudang part 1" (9 Okt 2026). |
| Rute truk WH-06 | Turun di jalan utara, belok kanan melewati palang di depan pos satpam, lalu menyusuri jalan antara Kantor utama dan Tempat penitipan helm. Titik tunggu bersama di (60, −5,4), untuk truk Gudang 1 dan truk yang belum mendapat bay. Truk Bay 1–5 terus ke titik tunggu sendiri di samping hall (−70, −5,4), lalu masuk halaman dan mundur ke bay. Truk Gudang 1 menepi ke sisi jalan seberang, lalu mundur ke apron; berbelok dari sisi seberang membuat kabin tidak mengenai sudut hall. Keluar lewat lajur sebelah di jalan yang sama, belok kanan ke jalan utara (`entrance` di `SiteDef`, lajur sendiri `BayDef.lane`). | Pengguna: "pintu masuk truk lewat depan pos satpam bukan di samping", "border merah itu jalan", dan "merah border itu di hapus aja agar truk route bisa masuk" (9 Okt 2026). Truk WH-06 tidak memakai jalan kota. |
| Kunci per lajur | Lajur dock utama dan lajur Gudang 1 masing-masing dikunci sendiri: truk menunggu hanya bila lajurnya sendiri sedang dipakai mundur, atau ada truk bergerak di area lajur itu (`hold`). Kedua lajur bisa dipakai bersamaan. | Satu kunci bersama membuat truk menunggu lama setelah bongkar. |
| Persilangan | Dua tempat yang hanya boleh dilewati satu arus truk sekaligus (`crossings`): gerbang (truk masuk dan truk keluar) dan penyeberangan Gudang 1 (truk Gudang 1 dan truk lain di jalan samping hall). Truk arus lain menunggu sebelum masuk. Truk yang sudah mulai mundur memegang setiap persilangan di jalurnya. | Badan truk 16 m yang berbelok masuk ke lajur sebelah. Uji 5 seed × 2 jam: tumpang tindih truk WH-06 0 frame. |
| Batas truk dan kedatangan | Maksimal 7 truk aktif (`maxTrucks`; bawaan site lain bay + 2). Truk baru tiap 3–5 menit (`spawnEvery`; site lain 6–10 menit). | Dengan 6 bay, paling banyak satu truk menunggu bay di titik tunggu bersama. Kedatangan lebih sering membuat kelima bay hall terus terisi: rata-rata 20 truk keluar per 2 jam. |
| Forklift | 5: FL-18 sampai FL-22. Saat dibuka 4 bekerja di Bay 1–4, FL-19 charging. Forklift tidak pernah merencanakan rute di sepanjang kedua lajur truk di jalan samping hall (`noForklift`); ke Gudang 1 mereka lewat jalur di sepanjang dinding hall. Truk WH-06 memberi jalan kepada forklift yang sedang melaju, dan baru mulai mundur atau keluar bila tidak ada forklift yang rutenya melintasi area sapuan truk itu. | Kontak forklift–truk WH-06 0 frame di semua fase truk (5 seed × 2 jam). Forklift tidak pernah berhenti di tengah rute, jadi aturan ini tidak bisa macet. |
| Kamera site | Jarak 190 m, target `(-140, 0)`. | Kelima dock hall dan halamannya masuk satu pandangan. |
| Network overview | Kamera: azimut 0,22, polar 0,78, jarak 1.350 m, target `(-40, 40)`. Kabut mulai di luar jarak kamera. | Keenam site (kota dan distrik WH-06) masuk satu bingkai tanpa tertutup panel. |
| Nama tampilan | `MPM Learning Center`. | §8 membolehkan nama dipendekkan. |
| Data mock | 7 truk: Bay 1–5 terisi saat dibuka (TRK-3064 bongkar di Bay 1, TRK-3061 muat di Bay 2, TRK-3067 muat di Bay 3, TRK-3070 bongkar di Bay 4, TRK-3073 di Bay 5 menunggu forklift), TRK-3076 menunggu Gudang 1, TRK-3079 en route tanpa bay. Shipment SHP-60601 s/d 60613. 6 pallet di staging, 5 SKU, pelat `W`/`L`. Truk baru WH-06 memakai nama, pelanggan, kota tujuan, dan pelat Indonesia. | §9; permintaan pengguna "di isi 5 truk". |
| Staging | Bongkaran di WH-06: 40% ditaruh di staging untuk truk keluar berikutnya, sisanya masuk gedung. | Kriteria §15 no. 5. |
| Aliran acak | WH-06 memakai aliran acak dan penomoran sendiri: truk TRK-3100 s/d 3999, pallet PAL-6100+, shipment SHP-60610+. | Menambah WH-06 tidak menggeser urutan acak site lain. |
| Penunjuk utara | Jarum di Inspector berputar mengikuti arah kamera. | §6.2. |
| Atribusi | `© OpenStreetMap contributors` selalu tampil di sudut kanan bawah kanvas, bertaut ke halaman hak cipta OSM. | §10. |
| Perbaikan bersama 1 | Slot staging yang sudah dipesan siklus bongkar menjadi rintangan rute forklift lain. | Ditemukan di WH-06. Kontak forklift–pallet 0 di semua site. |
| Perbaikan bersama 2 | Setelah batas tunggu 8 menit forklift boleh memotong area truk yang masih menunggu atau akan datang, tetapi tetap menunggu truk yang sedang mundur ke bay atau keluar (paling lama ±2 menit). | Ditemukan di WH-06; kontak forklift–truk juga ada di WH-02 s/d WH-05. Uji 7 seed × 2 jam: kontak forklift–truk 0 di semua site (sebelumnya 2–7 frame per seed). Skenario pembuka WH-04 (§12.6 v2, 09:40–09:56) tetap identik; sesudah ±09:58 urutan kejadian site lain bisa berbeda dari sebelumnya karena forklift kadang menunggu. |
