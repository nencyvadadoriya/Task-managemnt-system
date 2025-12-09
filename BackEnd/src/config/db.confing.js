const mongoose = require('mongoose');
const mongoUrl = ('mongodb+srv://vadadoriyanency8_db_user:FFPkiEwCLFobi9SZ@cluster0.ryukyak.mongodb.net/?appName=Cluster0/task-management');
const db = mongoose.connection;
mongoose.connect(mongoUrl);
db.on('connected', () => console.log('DB is Connected..'));
db.on('error', (err) => console.log('DB is not Connected..', err));
db.on('disconnected', () => console.log('DB is Disconnected..'));
module.exports = db;    