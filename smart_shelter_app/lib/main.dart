import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import 'map_screen.dart'; 
import 'home_screen.dart';
import 'register_screen.dart';

void main() => runApp(const SmartShelterApp());

class SmartShelterApp extends StatelessWidget {
  const SmartShelterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.orange,
      ),
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // BACKEND ADRESİ
  final String apiUrl = "http://172.20.10.2:5000/api/auth/login";
  
  bool _isLoading = false; // Yükleniyor dairesi için

  Future<void> login() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "email": _emailController.text.trim(),
          "password": _passwordController.text.trim(),
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        String token = data['token'];

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Giriş Başarılı! Hoş geldiniz.")),
        );
        print("Gelen Token: $token");
        
        // SENİN YÖNTEMİN: HomeScreen'e yönlendirme
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => HomeScreen(token: token),
          ),
        );
      } else {
        print("Backend'den Gelen Hata: ${response.body}");
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Hata: E-posta veya şifre yanlış!")),
        );
      }
    } catch (e) {
      print("Hata oluştu: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Barınak Yönetim Paneli"),
        backgroundColor: Colors.orange,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.pets, size: 80, color: Colors.orange),
            const SizedBox(height: 20),
            
            TextField(
              controller: _emailController, 
              decoration: const InputDecoration(labelText: "E-posta")
            ),
            
            TextField(
              controller: _passwordController, 
              obscureText: true, 
              decoration: const InputDecoration(labelText: "Şifre")
            ),
            
            const SizedBox(height: 30),
            
            SizedBox(
              height: 50,
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : login,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
                child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text("Giriş Yap", style: TextStyle(fontSize: 18, color: Colors.white)),
              ),
            ),

            // DÜZELTİLEN KISIM: Kayıt Ol butonu artık doğru yerde, build içindeki Column'da!
            const SizedBox(height: 15),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text("Hesabın yok mu?"),
                TextButton(
                  onPressed: () {
                    // Kayıt ekranına geçiş yap
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const RegisterScreen()),
                    );
                  },
                  child: const Text(
                    "Kayıt Ol",
                    style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}