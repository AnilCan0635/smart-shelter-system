const mongoose = require('mongoose');

const shelterSchema = new mongoose.Schema({
    name: { type: String, required: true }, 
    hardware_mac: { type: String, required: true, unique: true }, 
    location: {
        type: { type: String, enum: ['Point'], required: true, default: 'Point' },
        coordinates: { type: [Number], required: true } 
    },
    food_capacity_grams: { type: Number, required: true },
    current_food_grams: { type: Number, default: 0 },
    previous_food_grams: { type: Number, default: 0 },
    water_capacity_ml: { type: Number, required: true, default: 5000 }, 
    current_water_ml: { type: Number, default: 0 },
    previous_water_ml: { type: Number, default: 0 },
    battery_voltage: { type: Number, default: 4.2 },
    status: { type: String, enum: ['FULL', 'WARNING', 'CRITICAL'], default: 'CRITICAL' },
    last_seen: { type: Date, default: Date.now },
    
    // Barınaktan gelen en son saatlik canlı fotoğraf
    last_image_url: { type: String, default: "" } 
    
}, { timestamps: true });

shelterSchema.index({ location: "2dsphere" });

module.exports = mongoose.model('Shelter', shelterSchema);