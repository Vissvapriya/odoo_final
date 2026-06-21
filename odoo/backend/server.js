const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const productRoutes = require('./routes/productRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const bomRoutes = require('./routes/bomRoutes');
const salesRoutes = require('./routes/salesRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const manufacturingRoutes = require('./routes/manufacturingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const stockLedgerRoutes = require('./routes/stockLedgerRoutes');

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: '*', // For development, allow all. In prod, restrict.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.io to request so controllers can use it
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.io connection handling (Room-based updates)
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client joins a room named after their role upon connection/authentication
  socket.on('join_role_room', (role) => {
    const uppercaseRole = String(role).toUpperCase();
    const validRoles = ['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'];
    
    if (validRoles.includes(uppercaseRole)) {
      socket.join(uppercaseRole);
      console.log(`Socket ${socket.id} joined room: ${uppercaseRole}`);
      socket.emit('joined', { room: uppercaseRole });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Wire routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/sales-orders', salesRoutes);
app.use('/api/purchase-orders', purchaseRoutes);
app.use('/api/manufacturing-orders', manufacturingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stock-ledger', stockLedgerRoutes);

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Odoo ERP Server running on port ${PORT}`);
});
