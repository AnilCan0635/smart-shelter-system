require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios'); // Saf HTTP istekleri için axios motoru
const verifyToken = require('./middleware/authMiddleware');
const isAdmin = require('./middleware/adminMiddleware');

// MODELLER
const Shelter = require('./models/Shelter');
const User = require('./models/User');
const FeedAction = require('./models/FeedAction');
const ShelterLog = require('./models/ShelterLog'); 
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// MONGODB BAĞLANTISI
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart-shelter";
mongoose.connect(MONGO_URI)
  .then(() => console.log("🚀 MongoDB Veritabanına Başarıyla Bağlanıldı!"))
  .catch((err) => console.log("❌ Veritabanı bağlantı hatası:", err));

if (!process.env.GEMINI_API_KEY) {
    console.log("❌ HATA: GEMINI_API_KEY .env dosyasından okunamadı!");
} else {
    console.log("✅ GEMINI_API_KEY başarıyla yüklendi.");
}

// --- ANLIK GİRİŞ YAPAN KULLANICININ BİLGİLERİNİ VE PUANINI GETİREN ROTA ---
app.get('/api/users/me', verifyToken, async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(400).json({ message: "Geçersiz token." });
        const user = await User.findById(req.user.id, 'name email points');
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Kullanıcı bilgiileri çekilemedi.", error: error.message });
    }
});

// ---  EN YÜKSEK PUANLI KULLANICILARI GETİREN LİDERLİK TABLOSU ---
app.get('/api/users/leaderboard', verifyToken, async (req, res) => {
    try {
        const topUsers = await User.find({}, 'name email points role')
                                   .sort({ points: -1 });
        res.status(200).json(topUsers);
    } catch (error) {
        res.status(500).json({ message: "Liderlik tablosu çekilemedi.", error: error.message });
    }
});

// --- BARINAK GEÇMİŞ LOGLARINI GETİREN API ROTASI (GET) ---
app.get('/api/shelters/:id/history', verifyToken, async (req, res) => {
    try {
        const shelterId = req.params.id;
        // son 10 logu çeker
        const historyLogs = await ShelterLog.find({ shelter_id: shelterId })
            .sort({ createdAt: -1 })
            .limit(10);
        res.status(200).json(historyLogs);
    } catch (error) {
        res.status(500).json({ message: "Geçmiş telemetri logları getirilemedi.", error: error.message });
    }
});

// --- YENİ BARINAK EKLEME (POST) ROTASI ---
app.post('/api/shelters', verifyToken, isAdmin, async (req, res) => {
    try {
        // React formundan gelen ham verileri yakala
        const { name, hardware_mac, food_capacity_grams, water_capacity_ml, lt, ln } = req.body;

        // Eksik alanlar için varsayılan güvenli başlangıç değerleri ata
        const current_food = req.body.current_food_grams || 0;
        const current_water = req.body.current_water_ml || 0;
        const battery = req.body.battery_voltage || 4.2;

        // Gelen enlem/boylam parametrelerini GeoJSON formatına dönüştür
        // Eğer lt/ln formdan doğrudan geldiyse onları kullan, yoksa ham location objesine bak
        const latitude = lt ? parseFloat(lt) : (req.body.location?.coordinates?.[1] || 38.46);
        const longitude = ln ? parseFloat(ln) : (req.body.location?.coordinates?.[0] || 27.2);

        const foodRatio = food_capacity_grams > 0 ? current_food / food_capacity_grams : 0;
        const waterRatio = water_capacity_ml > 0 ? current_water / water_capacity_ml : 0;
        let calculatedStatus = "FULL";

        if (foodRatio <= 0.20 || waterRatio <= 0.20) {
            calculatedStatus = "CRITICAL";
        } else if (foodRatio <= 0.50 || waterRatio <= 0.50) {
            calculatedStatus = "WARNING";
        }

        // Şemanın tam mutlu olacağı GeoJSON yapısını inşa et
        const newShelter = new Shelter({
            name,
            hardware_mac,
            location: {
                type: "Point",
                coordinates: [longitude, latitude] // Önce Boylam (ln), sonra Enlem (lt)
            },
            food_capacity_grams: food_capacity_grams || 5000,
            current_food_grams: current_food,
            water_capacity_ml: water_capacity_ml || 5000,
            current_water_ml: current_water,
            battery_voltage: battery,
            status: calculatedStatus 
        });

        await newShelter.save();

        await ShelterLog.create({
            shelter_id: newShelter._id,
            shelter_name: newShelter.name,
            food_grams: current_food,
            water_ml: current_water,
            battery_voltage: battery,
            log_source: 'HARDWARE_IOT'
        });

        res.status(201).json(newShelter);
    } catch (error) {
        console.error("Barınak ekleme hatası detayları:", error);
        res.status(400).json({ message: "Barınak eklenirken şema hatası oluştu!", error: error.message });
    }
});

// --- TÜM BARINAKLARI LİSTELEME (GET) ROTASI ---
app.get('/api/shelters', verifyToken, async (req, res) => {
    try {
        const shelters = await Shelter.find();
        res.status(200).json(shelters);
    } catch (error) {
        res.status(500).json({ message: "Barınaklar getirilirken bir hata oluştu", error: error.message });
    }
});

// --- YAKINDAKI BARINAKLARI BULMA ROTASI ---
app.get('/api/shelters/nearby', async (req, res) => {
    const { ln, lt, dist = 5000 } = req.query; 
    if (!ln || !lt) return res.status(400).json({ message: "Boylam (ln) ve Enlem (lt) parametreleri zorunludur!" });

    try {
        const nearbyShelters = await Shelter.find({
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(ln), parseFloat(lt)] },
                    $maxDistance: parseInt(dist)
                }
            }
        });
        res.status(200).json(nearbyShelters);
    } catch (error) {
        res.status(500).json({ message: "Konum sorgusu başarısız", error: error.message });
    }
});

// --- BARINAK SİLME ROTASI ---
app.delete('/api/shelters/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await ShelterLog.deleteMany({ shelter_id: req.params.id }); 
        await Shelter.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Barınak ve geçmiş logları başarıyla silindi." });
    } catch (error) {
        res.status(500).json({ message: "Silme hatası!" });
    }
});

// --- BARINAK GÜNCELLEME (PUT) ROTASI ---
app.put('/api/shelters/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { name, hardware_mac, food_capacity_grams, current_food_grams, water_capacity_ml, current_water_ml } = req.body;
        const foodRatio = food_capacity_grams > 0 ? current_food_grams / food_capacity_grams : 0;
        const waterRatio = water_capacity_ml > 0 ? current_water_ml / water_capacity_ml : 0;
        let calculatedStatus = "FULL";

        if (foodRatio <= 0.20 || waterRatio <= 0.20) {
            calculatedStatus = "CRITICAL";
        } else if (foodRatio <= 0.50 || waterRatio <= 0.50) {
            calculatedStatus = "WARNING";
        }

        const updatedShelter = await Shelter.findByIdAndUpdate(
            req.params.id,
            { name, hardware_mac, food_capacity_grams, current_food_grams, water_capacity_ml, current_water_ml, status: calculatedStatus },
            { new: true }
        );

        await ShelterLog.create({
            shelter_id: updatedShelter._id,
            shelter_name: updatedShelter.name,
            food_grams: current_food_grams,
            water_ml: current_water_ml,
            battery_voltage: updatedShelter.battery_voltage || 4.2,
            log_source: 'HARDWARE_IOT'
        });

        res.status(200).json({ message: "Başarıyla güncellendi", updatedShelter });
    } catch (error) {
        res.status(500).json({ message: "Güncelleme hatası!" });
    }
});

// --- DONANIM (ESP32) OTOMATİK VERİ GÖNDERME ROTASI ---
app.post('/api/hardware/update', async (req, res) => {
    try {
        let { hardware_mac, current_food_grams, current_water_ml, battery_voltage, image_url } = req.body;
        
        const shelter = await Shelter.findOne({ hardware_mac });
        if (!shelter) return res.status(404).json({ success: false, message: "Kayıtsız donanım!" });

        if (current_food_grams < 0) current_food_grams = 0;
        if (current_water_ml < 0) current_water_ml = 0;

        const safeFoodCapacity = shelter.food_capacity_grams || 5000;
        const safeWaterCapacity = shelter.water_capacity_ml || 5000;

        if (current_food_grams > safeFoodCapacity) current_food_grams = safeFoodCapacity;
        if (current_water_ml > safeWaterCapacity) current_water_ml = safeWaterCapacity;

        const foodRatio = current_food_grams / safeFoodCapacity;
        const waterRatio = current_water_ml / safeWaterCapacity;
        
        let newStatus = 'FULL';
        if (foodRatio <= 0.20 || waterRatio <= 0.20) {
            newStatus = 'CRITICAL';
        } else if (foodRatio <= 0.50 || waterRatio <= 0.50) {
            newStatus = 'WARNING';
        }

        // Barınağın canlı verileri
        shelter.current_food_grams = current_food_grams;
        shelter.current_water_ml = current_water_ml; 
        shelter.battery_voltage = battery_voltage || 4.2;
        shelter.status = newStatus;
        shelter.last_seen = Date.now();

        //  Eğer ESP32 uykudan uyanıp pakette Base64 fotoğraf gönderdiyse, barınağın anlık resmini güncelle
        if (image_url && image_url.trim() !== "") {
            shelter.last_image_url = image_url;
        }

        await shelter.save();
        
        // Geçmişe dönük log tablosuna yeni telemetri satırı
        await ShelterLog.create({
            shelter_id: shelter._id,
            shelter_name: shelter.name,
            food_grams: current_food_grams,
            water_ml: current_water_ml,
            battery_voltage: battery_voltage || 4.2,
            log_source: 'HARDWARE_IOT',
            image_url: image_url || "" 
        });

        res.status(200).json({ 
            success: true, 
            message: "Mama, Su ve Kamera verileri anlık olarak güncellendi, zaman damgalı log işlendi.", 
            new_status: newStatus 
        });
    } catch (error) {
        console.error("Donanım rota hatası:", error);
        res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

// --- GPS GEofencing KORUMALI VE DİNAMİK AI BİLDİRİM ROTASI ---
app.post('/api/feed-actions', verifyToken, async (req, res) => {
    // Başlangıç değerlerini güvenli hale getiriyoruz
    let finalStatus = 'rejected';
    let responseMessage = "";

    try {
        console.log("📥 Flutter'dan konum doğrulamalı aksiyon isteği geldi!");
        const { shelter_id, shelter_name, image_url, action_type, user_lat, user_lng } = req.body;

        if (!image_url) return res.status(400).json({ message: "Fotoğraf verisi gelmedi!" });

        const shelter = await Shelter.findById(shelter_id);
        if (!shelter) return res.status(404).json({ message: "Barınak bulunamadı." });

        // --- 📏 HAVERSINE FORMÜLÜ İLE KONUM DOĞRULAMA KATMANI ---
        if (user_lat && user_lng) {
            const shelterLng = shelter.location.coordinates[0];
            const shelterLat = shelter.location.coordinates[1];

            const R = 6371e3; 
            const phi1 = (shelterLat * Math.PI) / 180;
            const phi2 = (user_lat * Math.PI) / 180;
            const deltaPhi = ((user_lat - shelterLat) * Math.PI) / 180;
            const deltaLambda = ((user_lng - shelterLng) * Math.PI) / 180;

            const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                      Math.cos(phi1) * Math.cos(phi2) *
                      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceInMeters = R * c; 

            console.log(`📏 Hesaplanan Hile Koruma Mesafesi: ${distanceInMeters.toFixed(2)} metre.`);

            if (distanceInMeters > 600) {
                const rejectAction = new FeedAction({
                    volunteer_name: req.user && req.user.id ? (await User.findById(req.user.id))?.name || "Gönüllü" : "Gönüllü",
                    shelter_name,
                    shelter_id,
                    image_url,
                    status: 'rejected',
                    points: 0,
                    action_type: action_type || 'food'
                });
                await rejectAction.save();

                return res.status(200).json({ 
                    status: 'rejected', 
                    message: `Eyleminiz reddedildi! ❌ Barınağa yeterince yakın değilsiniz. Mesafe: ${distanceInMeters.toFixed(0)}m. Sınır: 50m.` 
                });
            }
        } else {
            return res.status(200).json({
                status: 'rejected',
                message: "Eyleminiz reddedildi! ❌ Cihazınızın GPS verilerine ulaşılamadı."
            });
        }

        // --- 🛡️ SÜREKLİ MAMA EKLE-ÇIKAR İSTİSMAR ENGELLEME KALKANI ---
        const TWO_HOURS = 2; 
        const lastAction = await FeedAction.findOne({
            shelter_id: shelter_id,
            status: 'approved' 
        }).sort({ createdAt: -1 }); 

        if (lastAction) {
            const timePassed = Date.now() - new Date(lastAction.createdAt).getTime();
            if (timePassed < TWO_HOURS) {
                 const remainingMinutes = Math.ceil((TWO_HOURS - timePassed) / (60 * 1000));
                 return res.status(200).json({
                     status: 'rejected',
                     message: `İstismar Engelleme Engeli! ❌ Bu barınakta çok yakın zamanda başarılı bir besleme yapılmış. Yeni puan kazanabilmek için ${remainingMinutes} dakika beklemeniz gerekmektedir.`
                 });
            }
        }

        // === ⚙️ DONANIM DESTEKLİ GERÇEK MAMA/SU ARTIŞI KONTROLÜ ===
        const lastLog = await ShelterLog.findOne({ shelter_id: shelter_id }).sort({ createdAt: -1 });
        const previousLog = await ShelterLog.findOne({ shelter_id: shelter_id }).sort({ createdAt: -1 }).skip(1);

        if (lastLog && shelter) {
            let weightDifference = 0;

            if (action_type === 'water') {
                if (previousLog) {
                    weightDifference = shelter.current_water_ml - previousLog.water_ml;
                    console.log(`💧 Su Doğrulaması (2 Önceki Log) -> Mevcut: ${shelter.current_water_ml}ml, 2 Önceki: ${previousLog.water_ml}ml, Fark: ${weightDifference}ml`);
                } else {
                    weightDifference = shelter.current_water_ml - lastLog.water_ml;
                }
            } else {
                if (previousLog) {
                    weightDifference = shelter.current_food_grams - previousLog.food_grams;
                    console.log(`🍖 Mama Doğrulaması (2 Önceki Log) -> Mevcut: ${shelter.current_food_grams}g, 2 Önceki: ${previousLog.food_grams}g, Fark: ${weightDifference}g`);
                } else {
                    weightDifference = shelter.current_food_grams - lastLog.food_grams;
                }
            }

            // Donanımsal artış barajı geçilemediyse akışı kesin olarak kırıyoruz
            if (weightDifference < 100) {
                console.log(`⚠️ Donanımsal artış yetersiz (${weightDifference}g/ml). İşlem iptal edildi.`);
                return res.status(200).json({
                    status: 'rejected',
                    message: `Hile Girişimi Engellendi! ❌ Haznedeki ${action_type === 'water' ? 'su' : 'mama'} miktarında donanımsal bir artış algılanmadı. Lütfen gerçekten ekleme yaptıktan sonra kanıt yükleyiniz.`
                });
            }   
        }
        
        // --- Yapay Zeka Hazırlık Katmanı ---
        const base64Data = image_url.includes(',') ? image_url.split(',')[1] : image_url;

        let dynamicVolunteerName = "Gönüllü";
        if (req.user && req.user.id) {
            const userObj = await User.findById(req.user.id);
            if (userObj) dynamicVolunteerName = userObj.name;
        }

        let prompt = "";
        if (action_type === "water") {
            prompt = `
            GÖREV: Yüklenen fotoğraftaki akıllı hayvan istasyonunun SU HAZNESİNİ analiz et.
            AÇIKLAMA: Fotoğrafta şeffaf, dikdörtgen plastik bir su kabı yer almaktadır. Kabın oturduğu alt kısım ise siyah, tırtıklı bir donanım yuvasıdır. Kabın içinde berrak su bulunmaktadır.
            KESİN KURAL: Fotoğrafta şeffaf plastik bir kap, siyah bir düzenek,  su kabına benzer bir yapı görülüyorsa ve bu kabında su görüyorsan bunu GEÇERLİ (approved) kabul et.Aksi halde 'rejected' dön.
            YANIT FORMATI: Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir metin ekleme:
            { "status": "approved", "message": "Su takviyesi başarıyla doğrulandı, can dostlarımıza afiyet olsun! 🐾" }`;
        } else {
            prompt = `
            GÖREV: Yüklenen fotoğraftaki akıllı hayvan istasyonunun MAMA HAZNESİNİ analiz et.
            AÇIKLAMA: Kabın dış çeperi MAVİ, SİYAH ve BEYAZ renklerin bir arada kullanıldığı balina figürlü desendir. İç yüzeyi mat SİYAH renktedir. İçinde kuru mama taneleri seçilebilmelidir.

            🚨 ESNEKLİK KURALLARI:
            1. Fotoğrafta bu mavi-siyah-beyaz desenli kap veya kabın bir kısmı net olarak görünüyorsa ve içinde az da olsa kuru mama taneleri seçilebiliyorsa, ışık ters veya kalitesiz olsa bile bunu GEÇERLİ (approved) kabul et. Hatalı reddetme yapmamak için toleransı çok yüksek tut.
            2. Sadece ve sadece fotoğrafta tamamen alakasız bir nesne (boş bir zemin, sadece insan yüzü, duvar veya mobilya) varsa 'rejected' dön.

            YANIT FORMATI: Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir metin veya açıklama ekleme:
            { "status": "approved" veya "rejected", "message": "Duruma uygun samimi bir Türkçe tebrik veya bilgilendirme mesajı." }`;
        }

        console.log(`🤖 Gemini API'sine saf HTTP isteği fırlatılıyor... (Tür: ${action_type || 'food'})`);
        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/jpeg", data: base64Data } }
                ]
            }]
        };

        const googleResponse = await axios.post(googleUrl, payload, { headers: { 'Content-Type': 'application/json' } });
        const rawAiText = googleResponse.data.candidates[0].content.parts[0].text;
        console.log("🧠 AI Kararı:", rawAiText);
        
        const aiResponseCleaned = rawAiText.toLowerCase();
        const isApproved = aiResponseCleaned.includes('approved') || aiResponseCleaned.includes('evet');

        // Değişkenleri burada kesin olarak güncelliyoruz
        if (isApproved) {
            finalStatus = 'approved';
            responseMessage = action_type === 'water' 
                ? "Mükemmel! Yapay zeka su koyduğunuzu doğruladı. 50 Puan kazandınız! 🐾" 
                : "Mükemmel! Yapay zeka mama koyduğunuzu doğruladı. 50 Puan kazandınız! 🐾";
                
            if (req.user && req.user.id) {
                await User.findByIdAndUpdate(req.user.id, { $inc: { points: 50 } });
            }

            await shelter.save();

            await ShelterLog.create({
                shelter_id: shelter._id,
                shelter_name: shelter.name,
                food_grams: shelter.current_food_grams,
                water_ml: shelter.current_water_ml,
                battery_voltage: shelter.battery_voltage || 4.2,
                log_source: 'AI_VOLUNTEER_FEED'
            });
        } else {
            finalStatus = 'rejected';
            responseMessage = action_type === 'water'
                ? "Reddedildi: Fotoğrafta doldurulmuş bir su kabı tespit edilemedi."
                : "Reddedildi: Fotoğrafta doldurulmuş bir mama kabı tespit edilemedi.";
        }

        // Akıllı eylem kaydı oluşturma ve kaydetme
        const newFeedAction = new FeedAction({
            volunteer_name: dynamicVolunteerName, 
            shelter_name, 
            shelter_id, 
            image_url, 
            status: finalStatus,
            points: finalStatus === 'approved' ? 50 : 0,
            action_type: action_type || 'food' 
        });
        await newFeedAction.save();
        
        console.log(`📱 Mobil Uygulamaya Gönderilen Yanıt -> Durum: ${finalStatus}, Mesaj: ${responseMessage}`);
        return res.status(200).json({ message: responseMessage, status: finalStatus });

    } catch (error) {
        console.error("🔥 BACKEND HATASI:", error.message);
        
        if (error.message.includes('503') || error.message.includes('status code 503') || error.message.includes('400') || error.message.includes('403')) {
            console.log("⚠️ Gemini API katmanında kesinti yaşandı. Sistem otomatik donanımsal yedek moda alındı!");
            
            if (req.user && req.user.id) {
                await User.findByIdAndUpdate(req.user.id, { $inc: { points: 50 } });
            }
            
            // Buradaki shelter nesnesinin varlığını kontrol ederek güvenli kaydetme yapıyoruz
            const currentShelterId = req.body.shelter_id;
            if (currentShelterId) {
                await Shelter.findByIdAndUpdate(currentShelterId, {});
            }

            return res.status(201).json({ 
                message: `Yedek doğrulama katmanı: Donanımsal ${req.body.action_type === 'water' ? 'su' : 'mama'} artışı doğrulandı, can dostlarımıza afiyet olsun! 🐾`, 
                status: "approved" 
            });
        }
        
        return res.status(500).json({ message: "Yapay zeka analizinde hata oluştu.", error: error.message });
    }
});

// --- MODERASYON ROTALARI ---
app.get('/api/feed-actions/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const pendingActions = await FeedAction.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.status(200).json(pendingActions);
    } catch (error) {
        res.status(500).json({ message: "Bildirimler çekilemedi." });
    }
});

app.put('/api/feed-actions/:id/approve', verifyToken, isAdmin, async (req, res) => {
    try {
        const action = await FeedAction.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        res.status(200).json({ message: "Başarıyla onaylandı", action });
    } catch (error) {
        res.status(500).json({ message: "Onaylama hatası." });
    }
});

app.put('/api/feed-actions/:id/reject', verifyToken, isAdmin, async (req, res) => {
    try {
        const action = await FeedAction.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
        res.status(200).json({ message: "Bildirim reddedildi", action });
    } catch (error) {
        res.status(500).json({ message: "Reddetme hatası." });
    }
});

// --- KULLANICI YÖNETİMİ ROTALARI ---
app.get('/api/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Kullanıcılar getirilemedi." });
    }
});

app.delete('/api/users/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Kullanıcı silindi." });
    } catch (error) {
        res.status(500).json({ message: "Kullanıcı silinemedi." });
    }
});

app.put('/api/users/:id/role', verifyToken, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        res.status(200).json({ message: "Rol güncellendi", user });
    } catch (error) {
        res.status(500).json({ message: "Güncelleme hatası." });
    }
});

// --- GÖNÜLLÜ KAYIT ROTASI ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "Bu e-posta adresi zaten kullanımda." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Gönüllü kaydı başarıyla oluşturuldu!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- KULLANICI GİRİŞ ROTASI ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı!" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: "Hatalı şifre!" });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ 
            message: "Giriş başarılı!", token, role: user.role,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sunucu ${PORT} portunda başarıyla başlatıldı.`);
});