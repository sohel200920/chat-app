const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve images

// Setup multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2)}${ext}`);
  }
});
const upload = multer({ storage: storage });

// Load users & messages
let users = JSON.parse(fs.readFileSync('users.json', 'utf8') || '[]');
let messages = JSON.parse(fs.readFileSync('messages.json', 'utf8') || '[]');

// ✅ Register user with image
app.post('/register', upload.single('profilePic'), (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }

  const profilePic = req.file ? req.file.filename : 'default.png';

  users.push({ username, password, profilePic });
  fs.writeFileSync('users.json', JSON.stringify(users));
  res.json({ message: 'Registered successfully' });
});

// ✅ Login user
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) return res.json({ success: true });
  res.status(401).json({ message: 'Invalid credentials' });
});

// ✅ Get all users (except current one)                                 
app.get('/users/:username', (req, res) => {
  const currentUser = req.params.username;
  const userList = users.filter(u => u.username !== currentUser);
  res.json(userList);
});

// ✅ Get profilePic of a user
app.get('/profilePic/:username', (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).send('User not found');
  res.json({ profilePic: user.profilePic || 'default.png' });
});

// ✅ Chat messages
app.get('/chat/:user1/:user2', (req, res) => {
  const { user1, user2 } = req.params;
  const filtered = messages.filter(
    m => (m.from === user1 && m.to === user2) || (m.from === user2 && m.to === user1)
  );
  res.json(filtered);
});

// ✅ Send message
app.post('/send', (req, res) => {
  const { from, to, message } = req.body;
  if (!from || !to || !message) return res.status(400).json({ message: 'Missing fields' });

  messages.push({ from, to, message, date: new Date().toISOString() });
  fs.writeFileSync('messages.json', JSON.stringify(messages));
  res.json({ message: 'Message sent' });
});

// ✅ All messages to current user (for notifications)
app.get('/chat/:user', (req, res) => {
  const user = req.params.user;
  const msgs = messages.filter(m => m.to === user);
  res.json(msgs);
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
