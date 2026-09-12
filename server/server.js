require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/time', require('./routes/time'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/trainees', require('./routes/trainees'));
app.use('/api/enrollments', require('./routes/enrollments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/consents', require('./routes/consents'));
app.use('/api/followups', require('./routes/followups'));
app.use('/api/outcomes', require('./routes/outcomes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/skill-gaps', require('./routes/skillGaps'));
app.use('/api/remedial-actions', require('./routes/remedialActions'));
app.use('/api/provider-comparison', require('./routes/providerComparison'));
app.use('/api/course-comparison', require('./routes/courseComparison'));
app.use('/api/funding-schemes', require('./routes/fundingSchemes'));
app.use('/api/data-quality', require('./routes/dataQuality'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Skilling Tracker API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
