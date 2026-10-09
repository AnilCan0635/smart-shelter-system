import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { 
  Container, Box, Typography, TextField, Button, Paper, Alert, 
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Tabs, Tab, Card, CardMedia, CardContent, CardActions, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Avatar, Divider, IconButton
} from '@mui/material';

import PetsIcon from '@mui/icons-material/Pets';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ImageIcon from '@mui/icons-material/Image';

const API_BASE_URL = 'http://localhost:5000/api';

// --- 1. GİRİŞ EKRANI (LOGIN) ---
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      if (response.data && response.data.role !== 'admin') {
        setError('Bu panele giriş yetkiniz bulunmamaktadır!');
        return;
      }
      if (response.data && response.data.token) {
        localStorage.setItem('adminToken', response.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş hatası gerçekleşti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)' }}>
      <Container maxWidth="xs">
        <Paper elevation={4} sx={{ p: 4, borderRadius: 4, textAlign: 'center', bgcolor: 'white' }}>
          <Box sx={{ width: 64, height: 64, bgcolor: 'orange', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <PetsIcon sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight="800" sx={{ mb: 1, color: '#2c3e50' }}>Smart Shelter</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>Merkezi Operasyon & AI Yönetim Masası</Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          
          <form onSubmit={handleLogin}>
            <TextField fullWidth label="E-posta Adresi" margin="normal" variant="outlined" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField fullWidth label="Şifre" type="password" margin="normal" variant="outlined" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button fullWidth type="submit" variant="contained" disabled={loading} sx={{ mt: 3, py: 1.6, borderRadius: 3, fontWeight: 'bold', fontSize: '15px', bgcolor: 'orange', '&:hover': { bgcolor: '#e68a00' } }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sisteme Yetkili Girişi'}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

// --- 2. OPERASYONEL PANEL (DASHBOARD) ---
function Dashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0); 
  const [shelters, setShelters] = useState([]);
  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [specialFilter, setSpecialFilter] = useState('ALL'); 
  const [historyOpen, setHistoryOpen] = useState(false);
  
  const [shelterHistoryLogs, setShelterHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedShelterData, setSelectedShelterData] = useState({ name: '', current_food: 0, capacity_food: 5000, current_water: 0, capacity_water: 5000 });

  // GÖRSEL KUTUCUĞU VE GALERİ PANELI İÇERİĞİ İÇİN  STATELER
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [hardwareMac, setHardwareMac] = useState('');
  const [longitude, setLongitude] = useState('');
  const [latitude, setLatitude] = useState('');
  const [foodCapacity, setFoodCapacity] = useState('');
  const [waterCapacity, setWaterCapacity] = useState('');

  const [editShelter, setEditShelter] = useState({ _id: '', name: '', food_capacity_grams: 0, current_food_grams: 0, water_capacity_ml: 0, current_water_ml: 0 });

  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 5000); 
    return () => clearInterval(interval);
  }, [token, navigate]);

  const fetchData = async () => {
    const activeToken = localStorage.getItem('adminToken');
    if (!activeToken) return;
    try {
      const config = { headers: { Authorization: `Bearer ${activeToken}` } };
      const resShelters = await axios.get(`${API_BASE_URL}/shelters`, config);
      const resActions = await axios.get(`${API_BASE_URL}/feed-actions/pending`, config);
      const resUsers = await axios.get(`${API_BASE_URL}/users`, config);
      
      setShelters(resShelters.data || []);
      setActions(resActions.data || []);
      setUsers(resUsers.data || []);
    } catch (err) {
      console.error("Veri yenileme hatası:", err);
    }
  };

  const openHistoryDialog = async (shelter) => {
    const foodCap = shelter.food_capacity_grams > 0 ? shelter.food_capacity_grams : 5000;
    const waterCap = shelter.water_capacity_ml > 0 ? shelter.water_capacity_ml : 5000;

    setSelectedShelterData({
      name: shelter.name,
      current_food: shelter.current_food_grams,
      capacity_food: foodCap,
      current_water: shelter.current_water_ml,
      capacity_water: waterCap
    });
    
    setHistoryOpen(true);
    setHistoryLoading(true);
    setShelterHistoryLogs([]);

    try {
      const activeToken = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${activeToken}` } };
      const res = await axios.get(`${API_BASE_URL}/shelters/${shelter._id}/history`, config);
      setShelterHistoryLogs(res.data || []);
    } catch (err) {
      console.error("Geçmiş telemetri logları çekilirken hata oluştu:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateShelter = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        name,
        hardware_mac: hardwareMac,
        location: { type: "Point", coordinates: [parseFloat(longitude || 0), parseFloat(latitude || 0)] },
        food_capacity_grams: parseInt(foodCapacity || 5000),
        water_capacity_ml: parseInt(waterCapacity || 5000),
        current_food_grams: 0,
        current_water_ml: 0
      };
      await axios.post(`${API_BASE_URL}/shelters`, payload, config);
      setOpen(false);
      setName(''); setHardwareMac(''); setLongitude(''); setLatitude(''); setFoodCapacity(''); setWaterCapacity('');
      fetchData();
    } catch (err) {
      alert("Barınak eklenirken hata oluştu!");
    }
  };

  const handleUpdateShelter = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_BASE_URL}/shelters/${editShelter._id}`, editShelter, config);
      setEditOpen(false);
      fetchData();
    } catch (err) {
      alert("Güncelleme hatası!");
    }
  };

  const handleDeleteShelter = async (id) => {
    if (!window.confirm("Bu barınağı silmek istediğinize emin misiniz?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_BASE_URL}/shelters/${id}`, config);
      fetchData();
    } catch (err) {
      alert("Barınak silinemedi.");
    }
  };

  const handleApprove = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_BASE_URL}/feed-actions/${id}/approve`, {}, config);
      fetchData();
    } catch (err) {
      alert("İşlem onaylanamadı.");
    }
  };

  const handleReject = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_BASE_URL}/feed-actions/${id}/reject`, {}, config);
      fetchData();
    } catch (err) {
      alert("İşlem reddedilemedi.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Bu gönüllü hesabını silmek istediğinize emin misiniz?")) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_BASE_URL}/users/${id}`, config);
      fetchData();
    } catch (err) {
      alert("Kullanıcı silinemedi.");
    }
  };

  const safeShelters = Array.isArray(shelters) ? shelters : [];
  const safeActions = Array.isArray(actions) ? actions : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const volunteerOnlyUsers = safeUsers.filter(u => u && u.role !== 'admin');

  const processedShelters = safeShelters.filter(shelter => {
    if (!shelter) return false;
    const matchesSearch = (shelter.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const foodCap = shelter.food_capacity_grams > 0 ? shelter.food_capacity_grams : 5000;
    const waterCap = shelter.water_capacity_ml > 0 ? shelter.water_capacity_ml : 5000;
    const isFoodCritical = (shelter.current_food_grams / foodCap) <= 0.20;
    const isWaterCritical = (shelter.current_water_ml / waterCap) <= 0.20;

    if (specialFilter === 'CRITICAL_FOOD') return matchesSearch && isFoodCritical;
    if (specialFilter === 'CRITICAL_WATER') return matchesSearch && isWaterCritical;
    return matchesSearch;
  });

  //  Gelen loglardan sadece resmi olanları süzüp ayıran havuz
  const logsWithImages = shelterHistoryLogs.filter(log => log && log.image_url && log.image_url.trim() !== "");

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#f8f9fa', minHeight: '100vh', pb: 5 }}>
      
      {/* NAVBAR */}
      <Paper square elevation={2} sx={{ p: 2, bgcolor: '#2c3e50', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid orange' }}>
        <Typography variant="h5" fontWeight="900" sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: 0.5 }}>
          <PetsIcon sx={{ color: 'orange', fontSize: 32 }} /> SMART SHELTER <span style={{color: 'orange', fontSize: '16px', fontWeight: '400'}}>CONTROL CENTER</span>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button onClick={fetchData} startIcon={<RefreshIcon />} variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}>Yenile</Button>
          <Button onClick={() => { localStorage.removeItem('adminToken'); navigate('/'); }} color="error" variant="contained" sx={{ fontWeight: 'bold' }}>Güvenli Çıkış</Button>
        </Box>
      </Paper>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        
        {/* KPI METRİK PANELİ KARTLARI */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4} md={2.4}>
            <Paper elevation={1} sx={{ p: 2.5, borderLeft: '6px solid #9c27b0', bgcolor: 'white', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">TOPLAM İSTASYON</Typography>
                <Typography variant="h4" fontWeight="bold" color="#7b1fa2" sx={{ my: 0.5 }}>{safeShelters.length}</Typography>
                <Typography variant="caption" color="secondary" fontWeight="600">🌐 Sistem Kayıtlı</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#f3e5f5', color: '#9c27b0', width: 40, height: 40 }}><PetsIcon sx={{ fontSize: 20 }} /></Avatar>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4} md={2.4}>
            <Paper elevation={1} sx={{ p: 2.5, borderLeft: '6px solid #f44336', bgcolor: 'white', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">CRITICAL STATIONS</Typography>
                <Typography variant="h4" fontWeight="bold" color="#c62828" sx={{ my: 0.5 }}>{safeShelters.filter(s => s && s.status === 'CRITICAL').length}</Typography>
                <Typography variant="caption" color="error" fontWeight="600">🚨 Acil Durum Alarmı</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#ffebee', color: '#f44336', width: 40, height: 40 }}><PetsIcon sx={{ fontSize: 20 }} /></Avatar>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4} md={2.4}>
            <Paper elevation={1} sx={{ p: 2.5, borderLeft: '6px solid #ff9800', bgcolor: 'white', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">WARNING STATIONS</Typography>
                <Typography variant="h4" fontWeight="bold" color="#ef6c00" sx={{ my: 0.5 }}>{safeShelters.filter(s => s && s.status === 'WARNING').length}</Typography>
                <Typography variant="caption" color="warning.main" fontWeight="600">⚡ Azalmakta Olanlar</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#fff3e0', color: '#ff9800', width: 40, height: 40 }}><PetsIcon sx={{ fontSize: 20 }} /></Avatar>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={1} sx={{ p: 2.5, borderLeft: '6px solid #2196f3', bgcolor: 'white', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">SAHA AKTİVİSTLERİ</Typography>
                <Typography variant="h4" fontWeight="bold" color="#1565c0" sx={{ my: 0.5 }}>{volunteerOnlyUsers.length}</Typography>
                <Typography variant="caption" color="primary" fontWeight="600">🐾 Gönüllü Topluluk</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#e3f2fd', color: '#2196f3', width: 40, height: 40 }}><PetsIcon sx={{ fontSize: 20 }} /></Avatar>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Paper elevation={1} sx={{ p: 2.5, borderLeft: '6px solid #4caf50', bgcolor: 'white', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="textSecondary" fontWeight="bold">AI PENDING PROOFS</Typography>
                <Typography variant="h4" fontWeight="bold" color="#2e7d32" sx={{ my: 0.5 }}>{safeActions.length}</Typography>
                <Typography variant="caption" color="success.main" fontWeight="600">🤖 Yapay Zeka Havuzu</Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#e8f5e9', color: '#4caf50', width: 40, height: 40 }}><PetsIcon sx={{ fontSize: 20 }} /></Avatar>
            </Paper>
          </Grid>
        </Grid>

        {/* SEKME BAŞLIKLARI */}
        <Paper elevation={1} sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} textColor="primary" indicatorColor="primary" variant="fullWidth">
            <Tab label="🐾 İSTASYON SAĞLIK RAPORLARI" sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab label={`🤖 AI MODERASYONU (${safeActions.length})`} sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab label="👥 GÖNÜLLÜ HESAP YÖNETİMİ" sx={{ fontWeight: 'bold', py: 2 }} />
            <Tab label="🏆 SKOR LİDERLİK TABLOSU" sx={{ fontWeight: 'bold', py: 2 }} />
          </Tabs>
        </Paper>

        {/* TAB 0: AKILLI İSTASYON TABLOSU */}
        {tabValue === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <TextField placeholder="İstasyon adına göre canlı ara..." size="small" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: 260, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                <Button variant={specialFilter === 'ALL' ? 'contained' : 'outlined'} size="small" onClick={() => setSpecialFilter('ALL')} sx={{ borderRadius: 2, fontWeight: 'bold' }}>Hepsi</Button>
                <Button variant={specialFilter === 'CRITICAL_FOOD' ? 'contained' : 'outlined'} size="small" color="warning" onClick={() => setSpecialFilter('CRITICAL_FOOD')} sx={{ borderRadius: 2, fontWeight: 'bold' }}>🍖 Mama Kritik (≤%20)</Button>
                <Button variant={specialFilter === 'CRITICAL_WATER' ? 'contained' : 'outlined'} size="small" color="primary" onClick={() => setSpecialFilter('CRITICAL_WATER')} sx={{ borderRadius: 2, fontWeight: 'bold' }}>💧 Su Kritik (≤%20)</Button>
              </Box>
              <Button variant="contained" sx={{ bgcolor: 'orange', borderRadius: 2, px: 3, fontWeight: 'bold', '&:hover': { bgcolor: '#e68a00' } }} onClick={() => setOpen(true)}>+ Yeni İstasyon Tanımla</Button>
            </Box>
            
            <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f3f5' }}>
                  <TableRow>
                    <TableCell><b>İstasyon Konumu</b></TableCell>
                    <TableCell><b>Donanım MAC ID</b></TableCell>
                    <TableCell><b>Mama Seviyesi</b></TableCell>
                    <TableCell><b>Su Seviyesi</b></TableCell>
                    <TableCell><b>Enerji / Pil</b></TableCell>
                    <TableCell><b>Sistem Durumu</b></TableCell>
                    <TableCell align="center"><b>Yönetim Opsiyonları</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedShelters.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'grey.500', py: 5 }}>Aktif cihaz bulunamadı.</TableCell></TableRow>
                  ) : (
                    processedShelters.map((shelter) => {
                      if (!shelter) return null;
                      const foodCap = shelter.food_capacity_grams > 0 ? shelter.food_capacity_grams : 5000;
                      const waterCap = shelter.water_capacity_ml > 0 ? shelter.water_capacity_ml : 5000;
                      let foodPerc = Math.min(100, Math.max(0, (shelter.current_food_grams / foodCap) * 100));
                      let waterPerc = Math.min(100, Math.max(0, (shelter.current_water_ml / waterCap) * 100));
                      
                      return (
                        <TableRow key={shelter._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold" color="#2c3e50">{shelter.name}</Typography>
                            <Typography variant="caption" color="textSecondary">Hex: {shelter._id.substring(18)}</Typography>
                          </TableCell>
                          <TableCell><code>{shelter.hardware_mac}</code></TableCell>
                          <TableCell sx={{ width: '22%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" fontWeight="bold" color="orange">🍖 {shelter.current_food_grams}/{foodCap}g</Typography>
                              <Typography variant="caption" fontWeight="bold" color="textSecondary">{foodPerc.toFixed(0)}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={foodPerc} color="warning" sx={{ height: 8, borderRadius: 5 }} />
                          </TableCell>
                          <TableCell sx={{ width: '22%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" fontWeight="bold" color="primary">💧 {shelter.current_water_ml}/{waterCap}ml</Typography>
                              <Typography variant="caption" fontWeight="bold" color="textSecondary">{waterPerc.toFixed(0)}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={waterPerc} color="primary" sx={{ height: 8, borderRadius: 5 }} />
                          </TableCell>
                          <TableCell><Typography variant="body2" fontWeight="600">🔋 {shelter.battery_voltage ? `${shelter.battery_voltage} V` : '4.2 V'}</Typography></TableCell>
                          <TableCell><Chip label={shelter.status === 'FULL' ? 'ONLINE' : shelter.status === 'WARNING' ? 'UYARI' : 'ALARM'} color={shelter.status === 'FULL' ? 'success' : shelter.status === 'WARNING' ? 'warning' : 'error'} size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                          <TableCell align="center">
                            <Button size="small" variant="contained" color="success" onClick={() => alert(`${shelter.name} terazisi başarıyla kalibre edildi, sıfır noktası (Tare) ayarlandı! ⚖️`)} sx={{ borderRadius: 2, mr: 1, fontSize: '11px' }}>Kalibre Et</Button>
                            <Button size="small" variant="contained" color="primary" onClick={() => openHistoryDialog(shelter)} sx={{ borderRadius: 2, mr: 1, fontSize: '11px' }}>Geçmiş</Button>
                            <Button size="small" variant="outlined" onClick={() => { setEditShelter(shelter); setEditOpen(true); }} sx={{ color: 'orange', borderColor: 'orange', borderRadius: 2, mr: 1, fontSize: '11px' }}>Düzenle</Button>
                            <IconButton color="error" onClick={() => handleDeleteShelter(shelter._id)} size="small"><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 1: AI MODERASYONU */}
        {tabValue === 1 && (
          <Box>
            <Typography variant="h6" fontWeight="bold" color="#2c3e50" sx={{ mb: 3 }}>Gemini AI Tarafından Algılanan Canlı Besleme Kanıtları</Typography>
            {safeActions.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                <Typography variant="body1" color="textSecondary" fontWeight="bold">Onay bekleyen kanıt bildirimi bulunmamaktadır. 🎉</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {safeActions.map((action) => {
                  if (!action) return null;
                  return (
                    <Grid item xs={12} sm={6} md={4} key={action._id}>
                      <Card sx={{ borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <CardMedia component="img" height="220" image={action.image_url} alt="AI Proof" />
                        <CardContent sx={{ flexGrow: 1, p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="h6" fontWeight="800" color="#2c3e50">{action.shelter_name}</Typography>
                            <Chip label={action.action_type === 'water' ? '💧 SU DESTEĞİ' : '🍖 MAMA DESTEĞİ'} color={action.action_type === 'water' ? 'primary' : 'warning'} size="small" />
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="textSecondary"><b>Saha Aktivisti:</b> {action.volunteer_name || 'Anonim Gönüllü'}</Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'space-between', p: 2, bgcolor: '#f8f9fa' }}>
                          <Button variant="contained" color="success" onClick={() => handleApprove(action._id)}>Onayla</Button>
                          <Button variant="outlined" color="error" onClick={() => handleReject(action._id)}>Reddet</Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* TAB 2: GÖNÜLLÜ HESAP YÖNETİMİ */}
        {tabValue === 2 && (
          <Box>
            <Typography variant="h6" fontWeight="bold" color="#2c3e50" sx={{ mb: 2 }}>👥 Sistem Kayıtlı Kullanıcı Hesapları</Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f3f5' }}>
                  <TableRow>
                    <TableCell><b>Kullanıcı Profil Kartı</b></TableCell>
                    <TableCell><b>E-Posta Adresi</b></TableCell>
                    <TableCell><b>Sistem Rolü</b></TableCell>
                    <TableCell align="center"><b>Hesap İşlemleri</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {safeUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'grey.500', py: 5 }}>Kayıtlı kullanıcı bulunamadı.</TableCell></TableRow>
                  ) : (
                    safeUsers.map((user) => {
                      if (!user) return null;
                      return (
                        <TableRow key={user._id} hover>
                          <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: user.role === 'admin' ? '#ef4444' : 'orange', fontWeight: 'bold' }}>{user.name ? user.name[0].toUpperCase() : 'G'}</Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold" color="#2c3e50">{user.name}</Typography>
                              <Typography variant="caption" color="textSecondary">{user.role === 'admin' ? 'Sistem Yöneticisi' : 'Saha Gönüllüsü'}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell><code>{user.email}</code></TableCell>
                          <TableCell><Chip label={user.role === 'admin' ? 'PANELE YETKİLİ' : 'SAHA GÖNÜLLÜSÜ'} color={user.role === 'admin' ? 'error' : 'primary'} variant="outlined" size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                          <TableCell align="center">
                            <IconButton color="error" onClick={() => handleDeleteUser(user._id)} disabled={user.role === 'admin'} size="small"><DeleteIcon fontSize="small" /></IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 3: SKOR LİDERLİK TABLOSU */}
        {tabValue === 3 && (
          <Box>
            <Typography variant="h6" fontWeight="bold" color="#2c3e50" sx={{ mb: 2 }}>🏆 En Çok Katkı Sağlayan Gönüllü Sıralaması </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f3f5' }}>
                  <TableRow>
                    <TableCell><b>Sıra</b></TableCell>
                    <TableCell><b>Gönüllü Profil Kartı</b></TableCell>
                    <TableCell><b>E-Posta Adresi</b></TableCell>
                    <TableCell align="center"><b>Kazanılan Toplam Skor</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {volunteerOnlyUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'grey.500', py: 5 }}>Henüz aktif puanı olan bir gönüllü bulunamadı.</TableCell></TableRow>
                  ) : (
                    [...volunteerOnlyUsers]
                      .sort((a, b) => (b.points || 0) - (a.points || 0))
                      .map((user, index) => (
                        <TableRow key={user._id} hover>
                          <TableCell sx={{ fontWeight: 'bold', color: '#7f8c8d', width: '100px' }}>
                            {index === 0 ? "🥇 1." : index === 1 ? "🥈 2." : index === 2 ? "🥉 3." : `${index + 1}.`}
                          </TableCell>
                          <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'orange', fontWeight: 'bold' }}>{user.name ? user.name[0].toUpperCase() : 'G'}</Avatar>
                            <Typography variant="body2" fontWeight="bold" color="#2c3e50">{user.name}</Typography>
                          </TableCell>
                          <TableCell><code>{user.email}</code></TableCell>
                          <TableCell align="center">
                            <Chip label={`${user.points || 0} Patipuan`} sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 'bold', fontSize: '13px', px: 1, borderRadius: 2 }} />
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Container>

      {/* GERÇEK VERİTABANI TELEMETRİ LOG PANELİ */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight="bold" sx={{ color: '#2c3e50', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 3 }}>
          <span>📊 {selectedShelterData.name} - Son 10 Telemetri Ölçüm Analizi</span>
          
          {/* TABLODAN SÖKÜLEN GÖRSELLERİ AYRI PENCEREDE İNCELEMEK İÇİN */}
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<ImageIcon />}
            onClick={() => setGalleryOpen(true)}
            sx={{ borderRadius: 2.5, fontWeight: 'bold', textTransform: 'none' }}
          >
            Saatlik Görseller ({logsWithImages.length})
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Donanımdaki yük hücrelerinden (HX711) ve AI kanıt havuzundan veritabanına kaydedilen zaman damgalı gerçek log kayıtları:
          </Typography>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, gap: 2 }}><CircularProgress size={30} /><Typography variant="body2">Canlı loglar çekiliyor...</Typography></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f1f3f5' }}>
                  <TableRow>
                    <TableCell><b>Kayıt Zamanı</b></TableCell>
                    <TableCell><b>Mama Seviyesi</b></TableCell>
                    <TableCell><b>Su Seviyesi</b></TableCell>
                    <TableCell><b>Pil</b></TableCell>
                    <TableCell><b>Veri Kaynağı</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shelterHistoryLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">Henüz log kaydı bulunmuyor.</TableCell></TableRow>
                  ) : (
                    shelterHistoryLogs.map((log) => (
                      <TableRow key={log._id} hover>
                        <TableCell>{new Date(log.createdAt).toLocaleString('tr-TR')}</TableCell>
                        <TableCell><b style={{ color: 'orange' }}>{log.food_grams} g</b> / {selectedShelterData.capacity_food}g</TableCell>
                        <TableCell><b style={{ color: '#2196f3' }}>{log.water_ml} ml</b> / {selectedShelterData.capacity_water}ml</TableCell>
                        <TableCell>🔋 {log.battery_voltage || 4.2} V</TableCell>
                        <TableCell><Chip label={log.log_source === 'HARDWARE_IOT' ? '📶 CİHAZ' : '🤖 AI GÖNÜLLÜ'} color={log.log_source === 'HARDWARE_IOT' ? 'info' : 'success'} variant="outlined" size="small" /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setHistoryOpen(false)} variant="contained" sx={{ bgcolor: '#2c3e50' }}>Kapat</Button></DialogActions>
      </Dialog>

      {/*SAATLİK GELEN FOTOĞRAFLARI AYRI BİR ALANDA TUTAN GALERİ KUTUSU */}
      <Dialog 
        open={galleryOpen} 
        onClose={() => setGalleryOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle fontWeight="bold" sx={{ color: '#2c3e50' }}>📸 {selectedShelterData.name} - Saatlik Kamera Arşivi</DialogTitle>
        <DialogContent dividers>
          {logsWithImages.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>Son 10 telemetri döngüsünde henüz saatlik fotoğraf kaydı bulunmuyor.</Typography>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              {logsWithImages.map((log) => (
                <Grid item xs={4} key={log._id}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 0.8, 
                      borderRadius: 3, 
                      border: '1px solid #e2e8f0', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                    }}
                    onClick={() => {
                      setSelectedImageUrl(log.image_url);
                      setImageModalOpen(true);
                    }}
                  >
                    <Box 
                      component="img" 
                      src={log.image_url} 
                      alt="Saatlik Kayıt" 
                      sx={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 2 }} 
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px', display: 'block', mt: 0.5, fontWeight: 'bold' }}>
                      {new Date(log.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setGalleryOpen(false)} variant="contained" sx={{ bgcolor: '#2c3e50' }}>Galariyi Kapat</Button></DialogActions>
      </Dialog>

      {/* FOTOĞRAFA TIKLANDIĞINDA AÇILAN BÜYÜK PREVIEW POP-UP MODALI */}
      <Dialog 
        open={imageModalOpen} 
        onClose={() => setImageModalOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ bgcolor: '#2c3e50', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <PetsIcon sx={{ color: 'orange' }} /> 📸 Kamera Detay İnceleme
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', bgcolor: '#1a252f' }}>
          <Box 
            component="img" 
            src={selectedImageUrl} 
            alt="Barınak Odası Tam Boy" 
            sx={{ width: '100%', height: 'auto', maxHeight: '72vh', objectFit: 'contain' }} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
          <Button onClick={() => window.open(selectedImageUrl, '_blank')} variant="outlined" sx={{ color: '#2c3e50', borderColor: '#2c3e50', fontWeight: 'bold' }}>Yeni Sekmede Aç</Button>
          <Button onClick={() => setImageModalOpen(false)} variant="contained" sx={{ bgcolor: 'orange', '&:hover': { bgcolor: '#e68a00' }, fontWeight: 'bold' }}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* İSTASYON EKLEME MODAL */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">Sisteme Yeni Akıllı İstasyon Tanımla</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="Barınak Bölge Adı" value={name} onChange={(e) => setName(e.target.value)} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Donanım MAC Kimliği" value={hardwareMac} onChange={(e) => setHardwareMac(e.target.value)} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Konum Boylam" type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Konum Enlem" type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Mama Sınırı (Gram)" type="number" value={foodCapacity} onChange={(e) => setFoodCapacity(e.target.value)} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Su Sınırı (Mililitre)" type="number" value={waterCapacity} onChange={(e) => setWaterCapacity(e.target.value)} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setOpen(false)}>İptal</Button><Button onClick={handleCreateShelter} variant="contained" sx={{ bgcolor: 'orange' }}>Ağa Bağla</Button></DialogActions>
      </Dialog>

      {/* AYAR DÜZENLEME MODAL */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">İstasyon Sınır Kapasite Ayarı</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="İstasyon Konum Adı" value={editShelter.name} onChange={(e)=>setEditShelter({...editShelter, name: e.target.value})} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Mama Kapasitesi (g)" type="number" value={editShelter.food_capacity_grams} onChange={(e)=>setEditShelter({...editShelter, food_capacity_grams: e.target.value})} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Simüle Edilen Mama (g)" type="number" value={editShelter.current_food_grams} onChange={(e)=>setEditShelter({...editShelter, current_food_grams: e.target.value})} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Su Kapasitesi (ml)" type="number" value={editShelter.water_capacity_ml} onChange={(e)=>setEditShelter({...editShelter, water_capacity_ml: e.target.value})} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Simüle Edilen Su (ml)" type="number" value={editShelter.current_water_ml} onChange={(e)=>setEditShelter({...editShelter, current_water_ml: e.target.value})} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}><Button onClick={()=>setEditOpen(false)}>Kapat</Button><Button onClick={handleUpdateShelter} variant="contained" sx={{ bgcolor: 'orange', fontWeight: 'bold' }}>Değişiklikleri İşle</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

// --- 3. YÖNLENDİRİCİ MOTORU ---
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}