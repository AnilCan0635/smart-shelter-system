const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Token gösterme
    const token = req.header('Authorization');

    // 401: Unauthorized
    if (!token) {
        return res.status(401).json({ message: "Erişim reddedildi. Lütfen önce giriş yapın!" });
    }

    try {
        const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;

        // Bileklik sahte mi, bizim gizli anahtarımızla mı üretilmiş
        const verified = jwt.verify(cleanToken, process.env.JWT_SECRET);

        req.user = verified;
        next(); 
    } catch (error) {
        res.status(400).json({ message: "Geçersiz veya süresi dolmuş token!" });
    }
};