const mongoose = require('mongoose');

const feedActionSchema = new mongoose.Schema({
    volunteer_name: { type: String, required: true }, // Gönüllünün adı
    shelter_name: { type: String, required: true },   // Hangi barınağa mama döküldü
    shelter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shelter' }, // Barınağın veritabanındaki asıl ID'si
    image_url: { type: String, required: true },      // Yüklenen mama fotoğrafının linki
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending'
    },
    points: { type: Number, default: 50 }, // kazanılacak varsayılan puan

    action_type: { 
        type: String, 
        enum: ['food', 'water'], 
        default: 'food' 
    }
}, { timestamps: true });

module.exports = mongoose.model('FeedAction', feedActionSchema);