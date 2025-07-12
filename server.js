const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URLSearchParams } = require('url');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const PORT = 3000;
const sessions = {};

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let bookingsCollection;

async function connectToDatabase() {
  try {
    await client.connect();
    const db = client.db('appointments');
    bookingsCollection = db.collection('bookings');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
}
connectToDatabase();

const getSession = (req) => {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
  const sessionId = cookies.sessionId;
  return sessionId && sessions[sessionId] ? { id: sessionId, ...sessions[sessionId] } : null;
};

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const url = req.url;
  const session = getSession(req);

  if (method === 'GET') {
    if (url === '/Navigation_page.html' && !session) {
      res.writeHead(302, { Location: '/' });
      return res.end();
    }

    if (url === '/me') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session ? { loggedIn: true, user: { name: session.username } } : { loggedIn: false }));
      return;
    }

    if (url === '/api/bookings') {
      try {
        const bookings = await bookingsCollection.find({}).toArray();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bookings));
      } catch (err) {
        res.writeHead(500);
        res.end('Database error.');
      }
      return;
    }

    let filePath = path.join(__dirname, 'public', url === '/' ? 'index.html' : url);
    if (!filePath.startsWith(path.join(__dirname, 'public'))) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });

  } else if (method === 'POST' && url === '/login') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const username = params.get('username');
      const password = params.get('password');

      if (username === 'userxy' && password === '1234') {
        const sessionId = crypto.randomUUID();
        sessions[sessionId] = { username, lastActivity: Date.now() };
        res.writeHead(302, {
          'Set-Cookie': `sessionId=${sessionId}; HttpOnly`,
          'Location': '/Navigation_page.html'
        });
        res.end();
      } else {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Invalid username or password.');
      }
    });

  } else if (method === 'POST' && url === '/logout') {
    if (session) delete sessions[session.id];
    res.writeHead(302, {
      'Set-Cookie': 'sessionId=; Max-Age=0',
      'Location': '/'
    });
    res.end();

  } else if (method === 'POST' && url === '/api/bookings') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { start, end } = JSON.parse(body);
        if (!start || !end) {
          res.writeHead(400);
          return res.end('Missing start or end time.');
        }

        const overlap = await bookingsCollection.findOne({
          start: { $lt: end },
          end: { $gt: start }
        });

        if (overlap) {
          res.writeHead(409);
          res.end('This time slot is already booked.');
        } else {
          const newEvent = {
            id: 'booking-' + Date.now(),
            start,
            end,
            title: 'Booked',
            color: '#9f0000'
          };

          await bookingsCollection.insertOne(newEvent);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newEvent));
        }
      } catch (err) {
        res.writeHead(400);
        res.end('Invalid request body.');
      }
    });

  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// 🕒 Inaktív session-ek törlése 10 perc után
setInterval(() => {
  const now = Date.now();
  for (const id in sessions) {
    if (now - sessions[id].lastActivity > 10 * 60 * 1000) {
      delete sessions[id];
    }
  }
}, 60 * 1000);

// 🧹 Régi foglalások törlése (7 napnál régebbi)
function deleteOldBookings() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  bookingsCollection.deleteMany({ end: { $lt: oneWeekAgo.toISOString() } })
    .then(result => {
      if (result.deletedCount > 0) {
        console.log(`🗑️ Deleted ${result.deletedCount} outdated bookings`);
      }
    })
    .catch(err => console.error('❌ Error deleting old bookings:', err));
}

// ⏱️ Törlés óránként
setInterval(deleteOldBookings, 60 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
