const mongoose = require('mongoose');

const shelterLogSchema = new mongoose.Schema({
    shelter_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Shelter',
        required: true 
    },
    shelter_name: { 
        type: String, 
        required: true 
    },
    food_grams: { 
        type: Number, 
        required: true 
    },
    water_ml: { 
        type: Number, 
        required: true 
    },
    battery_voltage: { 
        type: Number, 
        default: 4.2 
    },
    log_source: {
        type: String,
        enum: ['HARDWARE_IOT', 'AI_VOLUNTEER_FEED'],
        default: 'HARDWARE_IOT'
    },
    
    // O saat diliminde IoT cihazından gelen fotoğraf
    image_url: { 
        type: String, 
        default: "" 
    }
    
}, { timestamps: true });

module.exports = mongoose.model('ShelterLog', shelterLogSchema);