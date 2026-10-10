require('dotenv').config();

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const seedDefaults = require('./config/seed');
const { startReminderService } = require('./services/reminders');

const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const barberRoutes = require('./routes/barbers');
const appointmentRoutes = require('./routes/appointments');
const customerRoutes = require('./routes/customers');
const reviewRoutes = require('./routes/reviews');
const aiRoutes = require('./routes/ai');
const barberPortalRoutes = require('./routes/barberPortal');

const app = express();
const port = Number(process.env.PORT) || 5001;

const configuredClientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === configuredClientOrigin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      try {
        const requestUrl = new URL(origin);
        const isLoopbackClient = ['localhost', '127.0.0.1'].includes(requestUrl.hostname);
        const isHttp = requestUrl.protocol === 'http:';
        if (isLoopbackClient && isHttp) return callback(null, true);
      } catch {
        // Reject malformed origins below.
      }
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/barber', barberPortalRoutes);

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.use((_request, response) => response.status(404).json({ message: 'Route not found.' }));
app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.name === 'ValidationError') return response.status(400).json({ message: error.message });
  if (error.name === 'CastError') return response.status(400).json({ message: 'Invalid record ID.' });
  if (error.status === 503) return response.status(503).json({ message: error.message });
  if (error.code === 11000 && error.keyPattern?.slotKeys) return response.status(409).json({ message: 'That time was just booked. Please choose another slot.' });
  if (error.code === 11000) return response.status(409).json({ message: 'A record with that value already exists.' });
  response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function startServer() {
  try {
    await connectDB();
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required. Configure it in server/.env.');
    await seedDefaults();
    startReminderService();
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  } catch (error) {
    console.error(`Startup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
