import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart'; 
import 'package:geolocator/geolocator.dart';
import 'map_screen.dart';

class HomeScreen extends StatefulWidget {
  final String token;

  const HomeScreen({super.key, required this.token});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0; // 0: Ana Sayfa, 1: Barınaklar, 2: Sıralama
  List<dynamic> _shelters = [];
  List<dynamic> _leaderboard = []; 
  bool _isLoading = false;
  String _selectedFilter = 'ALL';
  final ImagePicker _picker = ImagePicker(); 

  // Dinamik Kullanıcı Verileri
  String _userName = "Gönüllü";
  int _userPoints = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() { _isLoading = true; });
    await Future.wait([
      _fetchShelters(),
      _fetchUserProfile(),
      _fetchLeaderboard(),
    ]);
    setState(() { _isLoading = false; });
  }

  Future<void> _fetchUserProfile() async {
    try {
      final response = await http.get(
        Uri.parse('http://10.0.2.2:5000/api/users/me'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      if (response.statusCode == 200) {
        final userData = jsonDecode(response.body);
        setState(() {
          _userName = userData['name'] ?? "Gönüllü";
          _userPoints = userData['points'] ?? 0;
        });
      }
    } catch (e) {
      debugPrint("Profil puanı yükleme hatası: $e");
    }
  }

  Future<void> _fetchLeaderboard() async {
    try {
      final response = await http.get(
        Uri.parse('http://172.20.10.2:5000/api/users/leaderboard'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.token}',
        },
      );
      if (response.statusCode == 200) {
        List<dynamic> allUsers = jsonDecode(response.body);
        setState(() {
          _leaderboard = allUsers.where((user) => user['role'] != 'admin').toList();
        });
      }
    } catch (e) {
      debugPrint("Liderlik tablosu çekme hatası: $e");
    }
  }

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
        setState(() {
          _shelters = jsonDecode(response.body);
        });
      }
    } catch (e) {
      debugPrint("Veri çekme hatası: $e");
    }
  }

  String _getBadge(int points) {
    if (points >= 2000) return 'Doğa ve Can Dostu Bilge 👑';
    if (points >= 1200) return 'Kıdemli Hayvan Koruyucu 🛡️';
    if (points >= 600) return 'Aktif Saha Görevlisi 🐾';
    if (points >= 200) return 'Gönüllü Besleyici 🌱';
    return 'Aday Gönüllü 🥚';
  }

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

  void _showShelterDetailsInList(dynamic shelter) {
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
                  onPressed: () {},
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
                        _reportFeedingInList(shelter, "food");
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
                        _reportFeedingInList(shelter, "water");
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

  Future<void> _reportFeedingInList(dynamic shelter, String actionType) async {
    try {
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
            const SnackBar(content: Text('Konum izni gerekli!')),
          );
          return;
        }
      }

      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      await Future.delayed(const Duration(milliseconds: 200));

      final XFile? photo = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 20, 
      );

      if (photo == null) return;
      if (!mounted) return;

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
      bool isSuccess = response.statusCode == 201 && responseData['status'] == 'approved';

      if (isSuccess) {
        await _fetchUserProfile();
        await _fetchLeaderboard();
      }

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
    // 🏠 1. SEKME: ANA SAYFA PANELİ
    Widget mainDashboardTab = RefreshIndicator(
      onRefresh: _loadDashboardData,
      color: Colors.orange,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 40),
            const Icon(Icons.pets, size: 90, color: Colors.orange),
            const SizedBox(height: 15),
            Text(
              'Hoş Geldiniz, $_userName!',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 5),
            const Text('Barınakları görmek için haritayı açın.', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 25),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 25.0),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Colors.orange, Colors.orangeAccent],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.orange.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.emoji_events, color: Colors.white, size: 24),
                        const SizedBox(width: 8),
                        Text('Mevcut Skorunuz'.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('$_userPoints Patipuan', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.25), borderRadius: BorderRadius.circular(12)),
                      child: Text('Ünvan: ${_getBadge(_userPoints)}', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 30), 

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 25.0),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => MapScreen(token: widget.token))).then((_) => _loadDashboardData());
                },
                icon: const Icon(Icons.map),
                label: const Text('Haritayı Görüntüle'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );

    // 📑 2. SEKME: BARINAK DURUM LİSTESİ
    List<dynamic> filteredShelters = _shelters.where((shelter) {
      if (_selectedFilter == 'ALL') return true;
      return shelter['status'] == _selectedFilter;
    }).toList();

    Widget listWithFiltersTab = Column(
      children: [
        const SizedBox(height: 20),
        _buildFilterBar(),
        Expanded(
          child: _isLoading 
            ? const Center(child: CircularProgressIndicator(color: Colors.orange))
            : _buildShelterListView(filteredShelters),
        ),
      ],
    );

    // 🏆 3. SEKME: BAĞIMSIZ LİDERLİK TABLOSU GÖRÜNÜMÜ
    Widget leaderboardTab = RefreshIndicator(
      onRefresh: _loadDashboardData,
      color: Colors.orange,
      child: ListView(
        padding: const EdgeInsets.all(25),
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.leaderboard, color: Colors.orange, size: 26),
              ),
              const SizedBox(width: 15),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Gönüllü Liderlik Havuzu", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text("En çok besleme yapan aktif kahramanlar", style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              )
            ],
          ),
          const SizedBox(height: 20),
          Card(
            elevation: 0,
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.withOpacity(0.15))),
            child: _leaderboard.isEmpty
                ? const Padding(padding: EdgeInsets.all(30.0), child: Center(child: Text("Sıralama listesi boş veya yüklenemedi.", style: TextStyle(color: Colors.grey))))
                : ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _leaderboard.length > 10 ? 10 : _leaderboard.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final user = _leaderboard[index];
                      Widget rankIcon;
                      if (index == 0) rankIcon = const Text("🥇", style: TextStyle(fontSize: 20));
                      else if (index == 1) rankIcon = const Text("🥈", style: TextStyle(fontSize: 20));
                      else if (index == 2) rankIcon = const Text("🥉", style: TextStyle(fontSize: 20));
                      else rankIcon = Text("  ${index + 1}  ", style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.bold));

                      return ListTile(
                        leading: rankIcon,
                        title: Text(user['name'] ?? 'Anonim Gönüllü', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text(_getBadge(user['points'] ?? 0), style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(color: Colors.orange.withOpacity(0.08), borderRadius: BorderRadius.circular(12)),
                          child: Text("${user['points'] ?? 0} Puan", style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );

    Widget activeBodyWidget;
    if (_currentIndex == 0) activeBodyWidget = mainDashboardTab;
    else if (_currentIndex == 1) activeBodyWidget = listWithFiltersTab;
    else activeBodyWidget = leaderboardTab;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: activeBodyWidget,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: Colors.orange,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        onTap: (index) { setState(() { _currentIndex = index; }); },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Ana Sayfa'),
          BottomNavigationBarItem(icon: Icon(Icons.format_list_bulleted), label: 'Barınaklar'),
          BottomNavigationBarItem(icon: Icon(Icons.star_half_rounded), label: 'Sıralama'),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 15),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _filterChip('HEPSİ', 'ALL', Colors.grey),
            const SizedBox(width: 6),
            _filterChip('KRİTİK', 'CRITICAL', Colors.red),
            const SizedBox(width: 6),
            _filterChip('UYARI', 'WARNING', Colors.orange),
            const SizedBox(width: 6),
            _filterChip('DOLU', 'FULL', Colors.green),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, String filterKey, Color color) {
    bool isSelected = _selectedFilter == filterKey;
    return ChoiceChip(
      label: Text(label, style: TextStyle(color: isSelected ? Colors.white : color, fontWeight: FontWeight.bold, fontSize: 11)),
      selected: isSelected,
      selectedColor: color,
      backgroundColor: color.withOpacity(0.08),
      onSelected: (bool selected) { setState(() { _selectedFilter = filterKey; }); },
    );
  }

  Widget _buildShelterListView(List<dynamic> list) {
    if (list.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 40, color: Colors.grey[400]),
            const SizedBox(height: 8),
            Text("Barınak bulunamadı.", style: TextStyle(color: Colors.grey[500])),
          ],
        ),
      );
    }

    return ListView.builder(
      itemCount: list.length,
      padding: const EdgeInsets.all(20),
      itemBuilder: (context, index) {
        final shelter = list[index];
        Color statusColor = Colors.green;
        if (shelter['status'] == 'CRITICAL') statusColor = Colors.red;
        if (shelter['status'] == 'WARNING') statusColor = Colors.orange;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 0,
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.withOpacity(0.15), width: 1)),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            leading: CircleAvatar(backgroundColor: statusColor.withOpacity(0.1), child: Icon(Icons.pets, color: statusColor, size: 18)),
            title: Text(shelter['name'] ?? 'Bilinmeyen Barınak', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            subtitle: Text("Durum: ${shelter['status']}", style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: Colors.grey),
            onTap: () { _showShelterDetailsInList(shelter); },
          ),
        );
      },
    );
  }
}