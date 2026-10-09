module.exports = function (req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next(); 
    } else {
        return res.status(403).json({ message: "Erişim reddedildi. Admin yetkisi gerekiyor!" });
    }
};