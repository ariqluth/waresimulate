PRD WareTrack — Dashboard Operasi Cross-Dock v1

Sumber visual: tangkapan layar v1. Label antarmuka mengikuti bahasa Inggris pada desain. Prosa persyaratan ini berbahasa Indonesia.

Yang tercantum di bagian 8 dan 12 sebagai teks UI adalah isi layar, kecuali nilai yang diberi tanda contoh. Tanda itu hanya dipakai untuk nilai panel kanan yang glyph-nya masih samar. Wilayah, label, ID, delta, rasio tab, dan baris antrian di bawah ini ikut v1.

1. Ringkasan produk

WareTrack adalah dashboard operasi cross-dock untuk satu konteks gudang, WH-04 di Southfield. Layar v1 menunjukkan stok, truk di site, ketepatan waktu 30 hari terakhir, yard isometrik beserta rute, detail satu truk di panel kanan, pelacakan kiriman di pita bawah kiri, dan antrian dock, forklift, serta truk di pita bawah kanan.

v1 hanya layar ini.

2. Masalah

Di cross-dock, sebagian truk sudah di dock, sebagian masih dalam perjalanan, dan stok pallet berubah sepanjang pagi. Manajer operasi perlu satu layar untuk melihat isi WH-04, truk mana yang sudah di site, truk mana yang masih En route, dan langkah kiriman yang sedang berjalan.

3. Pengguna

Pengguna v1 adalah Operations Manager yang sedang bertugas di site ini.

Header menampilkan Alex Chen dan peran Operations Manager. Keduanya teks tampilan. v1 tidak membuka menu profil.

4. Tujuan

Tanpa pindah halaman, manajer dapat:





Membaca tiga KPI WH-04 beserta delta dan subteks yang tercetak di kartu.



Melihat yard isometrik, garis rute, pin, label TRK-2401, dan callout en route.



Membaca detail TRK-2207 di panel kanan, termasuk customer dan destination.



Membaca Shipment Tracking untuk TRK-2401 / Carnation, termasuk waktu langkah, SHIP-78452, ETA, dan arriving.



Membaca antrian dengan rasio tab dan empat baris truk, termasuk status En route.



Melihat bahwa data sedang hidup lewat LIVE dan jam 08:44.



5. Asumsi

Asumsi hanya menutup perilaku yang tidak berupa teks pada gambar. Isi layar yang sudah disebut di bagian 8 tidak diturunkan menjadi asumsi.







ID



Asumsi





A1



Chip WH-04 di dekat kolom cari adalah konteks gudang layar ini. v1 tidak membuka daftar gudang lain.





A2



Kontrol site menampilkan teks terpotong Southfield Crosso-D... dan subteks 38% full · 2/5 docked. Nama utuh Southfield Cross-Dock muncul pada destination panel kanan, digabung dengan gudang: WH-04 Southfield Cross-Dock.





A3



Alex Chen dan Operations Manager hanya tampilan.





A4



LIVE berarti sambungan data hidup. Jam di sampingnya pada state layar ini 08:44. Selama hidup, data disegarkan di tempat setiap 5 detik tanpa mengosongkan layar. Jam ikut waktu site.





A5



Stock on hand menghitung pallet onHand di WH-04. Angka kartu pada desain adalah 610, satuan pallets, delta +20. Yard tidak menggambar 610 pallet satu per satu.





A6



Trucks on site menghitung truk dengan kegiatan di site: Loading, Unloading, Docking. Truk En route tidak masuk angka ini. Pada desain, nilainya 3, delta +2, subteks 2 inbound.





A7



Dari tiga truk di site, dua bertanda inbound: TRK-2205 (Unloading) dan TRK-2307 (Docking). TRK-2209 (Loading) tidak inbound. Bendera ini ada agar subteks 2 inbound benar. Layar tidak menulis kata inbound pada tiap baris.





A8



2/5 docked pada kontrol site berarti 2 dari 5 pintu dock sedang ditempati. Dua truk yang sudah docked pada data contoh: TRK-2209 di Dock 2 dan TRK-2205 di WH-04. TRK-2307 masih Docking, jadi belum masuk dua itu.





A9



On-time delivery adalah persen shipment Delivered dalam last 30 days yang selesai pada atau sebelum waktu janjinya, satu desimal. Penyebut 0 menampilkan —. Kartu desain menampilkan 96.2% dan delta +0.4%.





A10



Delta kartu adalah bagian data yang ditampilkan, dengan tanda plus seperti pada desain. Delta tidak dihitung ulang dari selisih baris antrian. +2 pada truk dan subteks 2 inbound adalah dua teks yang berbeda.





A11



38% full ditampilkan apa adanya pada kontrol site. v1 tidak menggantinya dengan hasil 610 dibagi kapasitas.





A12



Label tab Docks 4/4 dan subteks 2/5 docked keduanya ditampilkan. Keduanya penghitung yang berbeda dan tidak diseragamkan.





A13



Yard memakai kamera isometrik tetap: ada garis rute, pin lokasi, truk berlabel, dan callout. Tidak ada zoom, geser peta, atau editor denah.





A14



Pencarian menyaring objek yang sudah ada di layar. Tidak ada halaman hasil dan tidak ada dropdown. KPI, delta, dan rasio tab tetap angka konteks WH-04, tidak menyusut mengikuti kueri. Badan antrian yang tidak cocok disembunyikan.





A15



Panel kanan dan Shipment Tracking terikat pada subjek yang berbeda pada state layar ini: kanan TRK-2207, tracking TRK-2401. Memilih baris tidak menimpa salah satu panel dengan subjek yang lain.





A16



Tab aktif pada state layar ini adalah Trucks, karena badan yang terlihat adalah empat baris truk. Label Docks 4/4 dan Forklifts 2/4 tetap terlihat.





A17



Badan tab Docks dan Forklifts tidak tergambar. Saat tab itu dipilih, badan menampilkan rasio yang sama dalam kalimat 4 of 4 docks atau 2 of 4 forklifts, tanpa kode forklift atau kode dock tambahan.





A18



Toolbar vertikal di tepi kanan yard selalu ada. Ikon lapisan dan ikon peringatan termasuk di dalamnya. Ikon lain yang pictogram-nya belum teridentifikasi tetap digambar sebagai tombol ikon, lihat pertanyaan terbuka.





A19



Salinan kosong, muat, dan gagal yang tidak ada di gambar memakai bahasa Inggris.





A20



Lebar target adalah desktop. Di bawah 1100 px, urutan tumpuk: header, KPI, yard beserta toolbar, panel kanan, tracking, antrian.



6. Ruang lingkup v1

Satu dashboard, tujuh wilayah:





Header



Kartu KPI



Yard isometrik



Toolbar vertikal yard



Panel kanan detail truk



Pita bawah kiri, Shipment Tracking



Pita bawah kanan, antrian docks, forklifts, dan trucks

Termasuk delta KPI, status En route, state kosong, loading, error, dan live.

7. Di luar lingkup





Login, kelola pengguna, dan menu profil



Membuat atau mengubah shipment, truk, dock, forklift, dan pallet



Dispatch, scan barcode, dan penugasan forklift



Laporan historis, ekspor, dan perbandingan antar site



Zoom atau editor denah



Aplikasi native



Daftar gudang selain konteks WH-04



8. Peta informasi dan wilayah layar

Urutan baca: header, KPI, yard dengan toolbar di tepi kanannya, panel kanan, lalu pita bawah kiri dan kanan.







Wilayah



Isi yang terlihat





Header



WareTrack, cari, chip WH-04, site terpotong, LIVE, jam, pengguna





KPI



tiga kartu, masing-masing dengan nilai, delta, dan konteks WH-04





Yard



isometrik, garis rute, pin, TRK-2401, callout en route





Toolbar yard



kolom ikon di tepi kanan yard, termasuk lapisan dan peringatan





Panel kanan



detail TRK-2207, terpisah dari pita bawah





Tracking



TRK-2401 / Carnation, referensi, ETA, arriving, timeline





Antrian



tab rasio dan empat baris truk

Latar desain terang. Yard bernuansa biru-abu. v1 membedakan status dengan penekanan visual, tanpa mengunci kode warna.

8.1 Header





Wordmark WareTrack.



Placeholder cari, persis: Search sites, trucks, forklifts, pallets, shipments...



Chip WH-04 di dekat kolom cari.



Kontrol site, baris utama terpotong: Southfield Crosso-D...



Subteks kontrol site, persis: 38% full · 2/5 docked



Indikator LIVE



Jam 08:44 di samping indikator itu



Alex Chen



Operations Manager



8.2 KPI

Tiga kartu. Setiap kartu membawa konteks WH-04. Delta ikut ditampilkan.







Kartu



Nilai



Delta



Satuan atau subteks



Konteks





Stock on hand



610



+20



pallets



WH-04





Trucks on site



3



+2



2 inbound



WH-04





On-time delivery



96.2%



+0.4%



last 30 days



WH-04

Trucks on site = 3 karena tiga truk sudah di site. Tab Trucks = 4 karena daftar antrian juga memuat TRK-2401 yang masih En route. Kedua angka itu wajib tampil bersama.

8.3 Yard isometrik

Wilayah gambar utama. Isometrik dengan garis rute, pin lokasi, dan truk berlabel TRK-2401 beserta callout en route.

Tiga truk di site juga digambar di area WH-04: TRK-2209 pada Dock 2, TRK-2205, dan TRK-2307. TRK-2401 berada pada garis rute menuju WH-04, dengan pin dan callout en route.

Tumpukan pallet pada yard bersifat gambar. Jumlah resmi pallet ada di kartu Stock on hand.

8.4 Toolbar yard

Kolom tombol ikon vertikal di tepi kanan yard, di antara gambar yard dan panel kanan. Toolbar ini wilayah sendiri.

Ikon yang terbaca kelompoknya: lapisan dan peringatan. Ikon tambahan yang pictogram-nya belum teridentifikasi tetap menjadi bagian toolbar. Identitas pictogram itu ada di pertanyaan terbuka. Toolbar tidak dihilangkan.

8.5 Panel kanan

Wilayah terpisah, bukan bagian pita bawah. Subjeknya TRK-2207.

Teks yang terkunci:





Judul / ID: TRK-2207



Customer: Sunrise Grocers



Destination: WH-04 Southfield Cross-Dock

Label field yang wajib ada, urutan tampil mengikuti daftar ini:





Status



Weight



Pallets



ETA



Driver



Route

Nilai kelima field terakhir dan nilai Status belum cukup tajam untuk dikunci. v1 tetap menampilkan field itu. Nilai seed-nya ada di bagian 12 sebagai contoh, bukan sebagai transkripsi.

TRK-2207 tidak ditambahkan ke empat baris antrian.

8.6 Pita bawah kiri, Shipment Tracking

Judul wilayah: Shipment Tracking.

Subjek: TRK-2401 dan Carnation.

Juga terlihat:





Referensi SHIP-78452



ETA 10:23



Arriving 09:48

Timeline, berurutan, dengan waktu yang tercetak:







Langkah



Waktu pada desain





Order Confirmed



07:02





Picked



08:29





Loaded



09:22





In Transit



tidak ada waktu





Delivered



tidak ada waktu

Langkah yang sedang berjalan pada kartu ini adalah In Transit, selaras dengan TRK-2401 yang En route. Tiga langkah sebelumnya selesai dan membawa waktu di atas. Delivered belum tercapai.

Jam header 08:44 dan cap waktu timeline ditampilkan bersama, apa adanya.

8.7 Pita bawah kanan, antrian

Tiga tab. Teks tab persis:





Docks 4/4



Forklifts 2/4



Trucks 4

Docks dan Forklifts memakai rasio, bukan satu bilangan. Trucks memakai jumlah 4.

Badan yang terlihat adalah empat baris:







Truk



Status



Lokasi



Tambahan pada baris





TRK-2209



Loading



Dock 2



—





TRK-2205



Unloading



WH-04



—





TRK-2307



Docking



to WH-04



—





TRK-2401



En route



to WH-04



tindakan route dan 1 min

Status kegiatan v1: Loading, Unloading, Docking, En route.

Callout yard memakai huruf kecil en route. Status baris memakai En route.

9. Persyaratan fungsional



Header





FR-H1. Wordmark WareTrack di kiri header.



FR-H2. Placeholder cari persis Search sites, trucks, forklifts, pallets, shipments.... Kueri kosong menampilkan seluruh badan antrian dan objek yard.



FR-H3. Kueri tidak peka huruf besar. Cocok pada ID site, warehouse, truk, dock, forklift, pallet, shipment, customer, dan nama Carnation.



FR-H4. Saat kueri aktif, baris antrian yang tidak cocok disembunyikan dan objek yard yang tidak cocok diredupkan. KPI, delta, subteks KPI, chip WH-04, dan teks rasio tab tidak berubah.



FR-H5. Chip WH-04 terlihat di dekat cari.



FR-H6. Kontrol site menampilkan Southfield Crosso-D... dan subteks 38% full · 2/5 docked.



FR-H7. Saat sambungan hidup, header menampilkan LIVE dan jam. Pada data desain, jam itu 08:44.



FR-H8. Header menampilkan Alex Chen dan Operations Manager.



KPI





FR-K1. Tiga kartu selalu tampil dalam urutan bagian 8.2 selama data berhasil dimuat.



FR-K2. Setiap kartu menampilkan nilai, delta bertanda, dan konteks WH-04.



FR-K3. Stock on hand menampilkan satuan pallets. Pada data desain: 610 dan +20.



FR-K4. Trucks on site menampilkan subteks 2 inbound. Pada data desain: 3 dan +2. Angka 3 sama dengan jumlah truk antrian yang kegiatannya Loading, Unloading, atau Docking.



FR-K5. On-time delivery menampilkan subteks last 30 days. Pada data desain: 96.2% dan +0.4%. Rumus mengikuti A9.



FR-K6. Kartu KPI tidak membuka halaman lain.



Yard dan toolbar





FR-Y1. Yard menggambar rute menuju WH-04, pin, TRK-2401, dan callout en route.



FR-Y2. TRK-2209 tergambar pada Dock 2. TRK-2205 dan TRK-2307 tergambar di area WH-04.



FR-Y3. Toolbar vertikal di tepi kanan yard selalu terlihat, termasuk ikon lapisan dan ikon peringatan, plus slot ikon yang masih belum teridentifikasi.



FR-Y4. Tidak ada kontrol zoom atau editor denah.



FR-Y5. Tindakan route pada baris TRK-2401 menekankan garis rute truk itu di yard.



Panel kanan





FR-R1. Panel kanan terlihat bersamaan dengan yard dan dengan pita bawah, bukan di dalam pita bawah.



FR-R2. Panel menampilkan TRK-2207, Customer Sunrise Grocers, dan Destination WH-04 Southfield Cross-Dock.



FR-R3. Panel menampilkan label Status, Weight, Pallets, ETA, Driver, dan Route.



FR-R4. Nilai contoh bagian 12 dipakai untuk enam label itu sampai pertanyaan terbuka tentang glyph nilai itu tertutup.



FR-R5. Isi panel kanan pada state layar tetap TRK-2207.



Shipment Tracking





FR-S1. Judul kartu Shipment Tracking.



FR-S2. Subjek TRK-2401 dan Carnation.



FR-S3. Kartu menampilkan referensi SHIP-78452, ETA 10:23, dan Arriving 09:48.



FR-S4. Timeline memuat lima langkah pada urutan bagian 8.6, dengan waktu 07:02, 08:29, dan 09:22 pada tiga langkah pertama.



FR-S5. In Transit adalah langkah aktif. Delivered tanpa waktu dan belum aktif.



FR-S6. Mengklik langkah timeline tidak mengubah status.



Antrian





FR-Q1. Tab menampilkan persis Docks 4/4, Forklifts 2/4, dan Trucks 4.



FR-Q2. State layar membuka tab Trucks dan menampilkan empat baris bagian 8.7, tidak kurang dan tidak lebih.



FR-Q3. Baris TRK-2401 memuat tindakan route dan 1 min.



FR-Q4. Status baris memakai kosakata Loading, Unloading, Docking, dan En route.



FR-Q5. Memilih Docks atau Forklifts mengikuti A17. Rasio tab tidak berubah.



FR-Q6. TRK-2207 tidak muncul sebagai baris kelima.



10. Interaksi







Tindakan



Hasil





Memuat dashboard



State bagian 12. Tab Trucks. LIVE dan jam 08:44 saat sambungan hidup. Panel kanan TRK-2207. Tracking TRK-2401.





Mengetik di pencarian



FR-H4. Panel kanan dan kartu tracking tetap pada subjeknya.





Menghapus kueri



Empat baris truk dan objek yard kembali.





Mengklik route pada TRK-2401



Garis rute TRK-2401 di yard ditekankan. Halaman tidak berganti.





Mengklik 1 min



Tidak membuka halaman lain. Teks 1 min tetap pada baris.





Mengklik pin atau label TRK-2401 di yard



Baris TRK-2401 di antrian ikut ditekankan. Panel kanan tetap TRK-2207. Tracking tetap TRK-2401.





Mengklik baris truk lain



Baris itu ditekankan. Isi panel kanan dan isi tracking tidak diganti.





Mengklik tab Docks atau Forklifts



Badan daftar mengikuti A17.





Mengklik kartu KPI, chip WH-04, atau nama pengguna



Tidak ada navigasi.





Sambungan putus



State error. Data terakhir tetap.





Sambungan pulih



LIVE kembali. Penyegaran 5 detik berlanjut.



11. Entitas data



Site







Field



Pada desain





headerLabel



Southfield Crosso-D...





fullName



Southfield Cross-Dock





fullText



38% full





dockedText



2/5 docked





clock



08:44 pada state layar





live



LIVE saat tersambung



Warehouse







Field



Pada desain





code



WH-04





siteName



Southfield Cross-Dock





destinationLine



WH-04 Southfield Cross-Dock

KPI dan chip cari memakai code.

Dock







Field



Arti





code



Teks lokasi yang terlihat: Dock 2





occupancy



Bagian dari rasio 2/5 docked

Tidak ada kode dock lain pada layar. v1 tidak menambahkan kode dock baru ke data contoh.

Truck







Field



Arti





code



TRK-2209, TRK-2205, TRK-2307, TRK-2401, dan pada panel kanan TRK-2207





activity



Loading, Unloading, Docking, atau En route





onSite



benar untuk tiga kegiatan pertama, salah untuk En route





inbound



lihat A7





locationLabel



Dock 2, WH-04, atau to WH-04





customer



pada panel TRK-2207: Sunrise Grocers





destination



pada panel TRK-2207: WH-04 Southfield Cross-Dock



Forklift

Tab menampilkan rasio Forklifts 2/4: 2 dari 4. Tidak ada kode forklift pada layar. Data contoh tidak memakai kode forklift.

Pallet







Field



Arti





onHand



dihitung ke Stock on hand bila benar





warehouseCode



WH-04

Jumlah pada desain: 610. Delta tampilan: +20. Satuan label: pallets.

Panel kanan juga punya field Pallets untuk TRK-2207. Itu jumlah pada truk itu, terpisah dari 610.

Shipment







Field



Pada tracking





code



SHIP-78452





truckCode



TRK-2401





name



Carnation





eta



10:23





arriving



09:48





step



In Transit





stepTimes



Order Confirmed 07:02, Picked 08:29, Loaded 09:22



Detail panel TRK-2207

Field Status, Weight, Pallets, ETA, Driver, dan Route wajib. Nilai seed-nya contoh.

12. Data contoh untuk build

State ini memuat KPI 610 / 3 / 96.2% dan empat baris antrian sekaligus.

Konteks: warehouse WH-04, header Southfield Crosso-D..., subteks 38% full · 2/5 docked, chip WH-04, LIVE, jam 08:44, pengguna Alex Chen, peran Operations Manager.

KPI







Kartu



Nilai



Delta



Teks lain





Stock on hand



610



+20



pallets, konteks WH-04





Trucks on site



3



+2



2 inbound, konteks WH-04





On-time delivery



96.2%



+0.4%



last 30 days, konteks WH-04



Hubungan 3 dan 4

Tab Trucks 4 memuat empat baris. Trucks on site memuat tiga truk yang sudah di site. TRK-2401 tetap di antrian dan di yard karena masih En route, dan tidak menambah angka 3.







Truk



Status



Lokasi



Masuk Trucks on site



Inbound





TRK-2209



Loading



Dock 2



ya



tidak





TRK-2205



Unloading



WH-04



ya



ya





TRK-2307



Docking



to WH-04



ya



ya





TRK-2401



En route



to WH-04



tidak



tidak, karena belum di site

Dua inbound di antara tiga truk di site menghasilkan subteks 2 inbound. Delta +2 tetap teks kartu, terpisah dari subteks itu.

2/5 docked terisi oleh TRK-2209 dan TRK-2205. Tab tetap berlabel Docks 4/4, bukan 2/5.

Yard





Garis rute menuju WH-04, dengan pin.



TRK-2401 pada rute itu, callout en route.



TRK-2209 di Dock 2.



TRK-2205 dan TRK-2307 di area WH-04.



Toolbar vertikal di tepi kanan yard.



Panel kanan

Terkunci: TRK-2207, customer Sunrise Grocers, destination WH-04 Southfield Cross-Dock.

Nilai contoh, belum transkripsi layar:







Label



Nilai contoh





Status



Scheduled





Weight



12.6 t





Pallets



18





ETA



11:10





Driver



Mina Ortiz





Route



Southfield loop

ETA contoh ini sengaja berbeda dari 10:23 pada kartu tracking, karena kedua wilayah menampilkan subjek yang berbeda.

Shipment Tracking





Subjek TRK-2401 / Carnation



Referensi SHIP-78452



ETA 10:23



Arriving 09:48



Timeline sesuai bagian 8.6, langkah aktif In Transit



Antrian

Label tab: Docks 4/4, Forklifts 2/4, Trucks 4.

Empat baris bagian 8.7, termasuk route dan 1 min pada TRK-2401.

13. State kosong, loading, error, dan live



Live





Sambungan hidup: teks LIVE dan jam. Pada data desain, jam 08:44, lalu jam boleh maju mengikuti site.



Penyegaran 5 detik mengganti angka di tempat. Delta, rasio tab, dan empat baris tidak berkedip menjadi skeleton.



LIVE dan kalimat jeda tidak tampil bersamaan.



Loading





Hanya sebelum ada data sukses pertama.



Wordmark, chip WH-04, dan nama Alex Chen tetap.



KPI, yard, toolbar, panel kanan, tracking, dan antrian menampilkan skeleton.



LIVE belum tampil.



Kosong







Kondisi



Tampilan





Tidak ada pallet di WH-04



Stock on hand 0, satuan pallets, delta dari data





Tidak ada truk di site dan tidak ada yang en route



Trucks on site 0, subteks 0 inbound, tab Trucks 0, badan No trucks





Ada truk en route dan tidak ada yang di site



Trucks on site 0, tab Trucks tetap menghitung baris en route





Panel kanan tanpa subjek



judul wilayah tetap, isi No truck selected





Tracking tanpa subjek



judul Shipment Tracking, isi No shipment, timeline lima langkah tanpa waktu dan tanpa langkah aktif





Pencarian tanpa cocok



badan tab yang terbuka No matches. KPI, delta, dan rasio tab tetap



Error





Gagal muat pertama: Could not load WH-04 dan tindakan Retry. LIVE tidak menyala.



Putus setelah data pernah tampil: data terakhir tetap, LIVE disembunyikan, header menampilkan Live updates paused dan Retry.



Retry gagal meninggalkan error. Retry berhasil kembali ke live.



14. Metrik sukses







Metrik



Target





KPI lengkap



Nilai, delta, subteks, dan WH-04 terbaca tanpa scroll pada lebar ≥ 1280 px





Dua angka truk



Trucks on site 3 dan tab Trucks 4 tampil bersama pada data desain





Dua subjek detail



Panel kanan TRK-2207 dan tracking TRK-2401 tampil bersamaan





Rute



Callout yard en route dan status baris En route sama-sama ada untuk TRK-2401





Timeline



Tiga cap waktu 07:02, 08:29, 09:22 ada pada langkah yang benar, dan In Transit aktif





Live



LIVE tampil saat tersambung, dan tidak tampil bersama Live updates paused



15. Pertanyaan terbuka

Hanya glyph yang masih samar. Field dan ID yang sudah disebut di bagian 8 tidak dibuka lagi.





Pictogram ikon toolbar yard selain ikon lapisan dan ikon peringatan, serta urutannya. Toolbar tetap digambar lengkap.



Nilai pasti Status, Weight, Pallets, ETA, Driver, dan Route pada panel TRK-2207. Labelnya wajib. Sampai glyph itu terbaca, build memakai nilai contoh bagian 12.



16. Kriteria penerimaan

Build v1 diterima bila:





Header memuat placeholder Search sites, trucks, forklifts, pallets, shipments..., chip WH-04, teks Southfield Crosso-D..., subteks 38% full · 2/5 docked, LIVE, jam 08:44, Alex Chen, dan Operations Manager.



KPI menampilkan 610 +20 pallets, 3 +2 2 inbound, dan 96.2% +0.4% last 30 days, masing-masing dengan konteks WH-04.



Yard menampilkan garis rute, pin, label TRK-2401, dan callout en route, plus toolbar vertikal di tepi kanan yard.



Panel kanan, terpisah dari pita bawah, menampilkan TRK-2207, Sunrise Grocers, WH-04 Southfield Cross-Dock, dan enam label Status, Weight, Pallets, ETA, Driver, Route.



Shipment Tracking menampilkan TRK-2401, Carnation, SHIP-78452, ETA 10:23, Arriving 09:48, dan timeline dengan 07:02, 08:29, 09:22, langkah aktif In Transit.



Tab antrian persis Docks 4/4, Forklifts 2/4, Trucks 4, dengan empat baris TRK-2209, TRK-2205, TRK-2307, dan TRK-2401 seperti bagian 8.7, termasuk route dan 1 min.



Trucks on site tetap 3 sementara baris antrian tetap empat, karena TRK-2401 En route.



Memilih baris atau pin tidak mengganti panel kanan menjadi TRK-2401 dan tidak mengganti tracking menjadi TRK-2207.



State loading, kosong, error, dan live mengikuti bagian 13.



Tidak ada kode TRK-1041, D-04, atau FL-02, dan tidak ada mode yang menyembunyikan delta.

