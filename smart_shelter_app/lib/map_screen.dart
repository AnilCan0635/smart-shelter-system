import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';

class MapScreen extends StatefulWidget {
  final String token;

  const MapScreen({super.key, required this.token});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  GoogleMapController? _mapController;
  List<dynamic> _shelters = [];
  final Set<Marker> _markers = {};
  final ImagePicker _picker = ImagePicker();
  

  // --- İZMİR MERKEZ KOORDİNATLARI  ---
  static const LatLng _center = LatLng(38.4237, 27.1428); 

  @override
  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  @override
  void initState() {
    super.initState();
    _fetchShelters();
  }

  // --- BACKEND'DEN BARINAKLARI ÇEKEN GET İSTEĞİ ---
  Future<void> _fetchShelters() async {
    try {
      final response = await http.get(
        Uri.parse('http://172.20.10.2:5000/api/shelters'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _shelters = data;
          _updateMarkers();
        });
      }
    } catch (e) {
      debugPrint("Veri çekme hatası: $e");
    }
  }

  // --- HARİTADAKİ İŞARETÇİLERİ GÜNCELLEME ---
  void _updateMarkers() {
    _markers.clear();
    for (var shelter in _shelters) {
      final loc = shelter['location'];
      if (loc != null && loc['coordinates'] != null) {
        final List<dynamic> coords = loc['coordinates'];
        final double lng = (coords[0] is int) ? (coords[0] as int).toDouble() : (coords[0] as double);
        final double lat = (coords[1] is int) ? (coords[1] as int).toDouble() : (coords[1] as double);

        BitmapDescriptor markerColor;
        if (shelter['status'] == 'CRITICAL') {
          markerColor = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
        } else if (shelter['status'] == 'WARNING') {
          markerColor = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
        } else {
          markerColor = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
        }

        _markers.add(
          Marker(
            markerId: MarkerId(shelter['_id']),
            position: LatLng(lat, lng),
            icon: markerColor,
            onTap: () => _showShelterDetails(shelter),
          ),
        );
      }
    }
    setState(() {});
  }

  // --- ESTETİK VE BİRİMLİ PROGRESS BAR WIDGET'I ---
  Widget _buildProgressBar(String label, dynamic currentVal, dynamic capacityVal, IconData icon, Color color, String unit) {
    final int current = (currentVal is int) ? currentVal : (currentVal ?? 0).toInt();
    final int capacity = (capacityVal is int) ? capacityVal : (capacityVal ?? 2000).toInt();

    double progress = (capacity > 0) ? current / capacity : 0.0;
    if (progress > 1.0) progress = 1.0;
    if (progress < 0.0) progress = 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: color),
                const SizedBox(width: 8),
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              ],
            ),
            Text("%${(progress * 100).toInt()}", style: TextStyle(color: color, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 12,
            backgroundColor: color.withOpacity(0.1),
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
        const SizedBox(height: 6),
        Text("$current $unit / $capacity $unit", style: TextStyle(fontSize: 12, color: Colors.grey[600])),
      ],
    );
  }

  // --- DETAY MODAL PANELİ ---
  void _showShelterDetails(dynamic shelter) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          ),
          padding: const EdgeInsets.all(25),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 50,
                  height: 5,
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      shelter['name'] ?? 'Bilinmeyen Barınak',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: shelter['status'] == 'FULL' ? Colors.green[100] : Colors.orange[100],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      shelter['status'] ?? 'Bilinmiyor',
                      style: TextStyle(color: shelter['status'] == 'FULL' ? Colors.green[700] : Colors.orange[700], fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 25),
              
              _buildProgressBar("Mama Seviyesi", shelter['current_food_grams'], shelter['food_capacity_grams'], Icons.restaurant, Colors.orange, "gr"),
              const SizedBox(height: 20),
              _buildProgressBar("Su Seviyesi", shelter['current_water_ml'], shelter['water_capacity_ml'], Icons.water_drop, Colors.blue, "ml"),
              
              const SizedBox(height: 25),

              // --- YOL TARİFİ AL BUTONU ---
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.navigation_sharp, color: Colors.orange),
                  label: const Text("Yol Tarifi Al", style: TextStyle(color: Colors.orange, fontSize: 16, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Colors.orange, width: 2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                  ),
                  onPressed: () async { 
                    final loc = shelter['location'];
                    if (loc != null && loc['coordinates'] != null) {
                      final List<dynamic> coords = loc['coordinates'];
                      // GeoJSON parse: Boylam[0], Enlem[1]
                      final double lng = (coords[0] is int) ? (coords[0] as int).toDouble() : (coords[0] as double);
                      final double lat = (coords[1] is int) ? (coords[1] as int).toDouble() : (coords[1] as double);
                      
                      // 🗺️ Gerçek Google Maps Navigasyon URI Protokolü
                      final String mapUrl = "https://www.google.com/maps/search/?api=1&query=$lat,$lng";
                      debugPrint("Navigasyon Tetiklendi: $mapUrl");

                      final Uri googleMapsUri = Uri.parse(mapUrl);
                      try {
                        await launchUrl(googleMapsUri, mode: LaunchMode.externalApplication);
                      } catch (e) {
                        debugPrint("Harita açılırken hata oluştu: $e");
                        //  fallback koruması
                        await launchUrl(googleMapsUri, mode: LaunchMode.platformDefault);
                      }
                    }
                  },
                ),
              ),
              const SizedBox(height: 15),

              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.add_a_photo, color: Colors.white),
                      label: const Text("Mama Ver", style: TextStyle(color: Colors.white, fontSize: 16)),
                      onPressed: () {
                        Navigator.pop(context);
                        _reportFeeding(shelter, "food");
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 15),
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.opacity, color: Colors.white),
                      label: const Text("Su Ver", style: TextStyle(color: Colors.white, fontSize: 16)),
                      onPressed: () {
                        Navigator.pop(context);
                        _reportFeeding(shelter, "water");
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 15),
            ],
          ),
        );
      },
    );
  }

  // --- GEMINI DOĞRULAMALI FOTOĞRAF GÖNDERME METODU ---
  Future<void> _reportFeeding(dynamic shelter, String actionType) async {
    try {
      //  GEOLOCATOR İZİN VE KONUM KONTROLÜ
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lütfen telefonunuzun konum/GPS servisini açın! 📍')),
        );
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Uygulamanın konum izni reddedildi!')),
          );
          return;
        }
      }

      // Kullanıcının anlık hassas konumunu
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Siyah ekran donmasını önlemek
      await Future.delayed(const Duration(milliseconds: 200));

      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 20, 
      );

      if (photo == null) return;
      if (!mounted) return;

      // Yapay Zeka yükleniyor diyaloğu
      showDialog(
        context: context,
        barrierDismissible: false,
        useRootNavigator: true, 
        builder: (context) => const Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
            child: Card(
              elevation: 4,
              child: Padding(
                padding: EdgeInsets.all(25.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.orange),
                    SizedBox(height: 15),
                    Text("Konum ve AI Analizi yapılıyor... 🤖", style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      final bytes = await photo.readAsBytes();
      final String base64Image = "data:image/jpeg;base64,${base64Encode(bytes)}";

      // ANLIK GPS VERİSİ
      final response = await http.post(
        Uri.parse('http://172.20.10.2:5000/api/feed-actions'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}'
        },
        body: jsonEncode({
          "shelter_id": shelter['_id'],
          "shelter_name": shelter['name'],
          "image_url": base64Image,
          "action_type": actionType,
          "user_lat": position.latitude,  
          "user_lng": position.longitude  
        }),
      );

      if (!mounted) return;
      Navigator.of(context, rootNavigator: true).pop();

      final responseData = jsonDecode(response.body);

      // Backend'den 201 harici (örneğin 403 Mesafe Hatası) geldiyse burası yakalar
      bool isSuccess = response.statusCode == 201 && responseData['status'] == 'approved';

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(isSuccess ? "Başarılı! ✅" : "İşlem Reddedildi ❌"),
          content: Text(responseData['message'] ?? 'İşlem tamamlandı.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _fetchShelters(); 
              },
              child: const Text("Tamam"),
            )
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      try { Navigator.of(context, rootNavigator: true).pop(); } catch(_) {}
      debugPrint("İşlem hatası: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Akıllı Barınak Sistemi 🐾", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.orange,
        elevation: 0,
        actions: [IconButton(icon: const Icon(Icons.refresh, color: Colors.white), onPressed: _fetchShelters)],
      ),
      body: GoogleMap(
        onMapCreated: _onMapCreated,
        initialCameraPosition: const CameraPosition(
          target: _center,
          zoom: 11.5,
        ),
        markers: _markers,
        myLocationEnabled: true,
        zoomControlsEnabled: false,
        mapToolbarEnabled: false,
      ),
    );
  }
}