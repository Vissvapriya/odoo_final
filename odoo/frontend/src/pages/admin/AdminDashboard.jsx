import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts';
import {
  Package,
  ShoppingCart,
  Receipt,
  Factory,
  Layers,
  Store,
  Truck,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

const AdminDashboard = () => {
  const theme = useTheme();
  const { token } = useSelector((state) => state.auth);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to load dashboard metrics.');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError('Error fetching dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  const { kpis, latest, trends } = data;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const getStatusChipColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'DELIVERED' || s === 'FULLY_RECEIVED' || s === 'COMPLETED') return 'success';
    if (s === 'CONFIRMED' || s === 'IN_PROGRESS') return 'primary';
    if (s === 'PARTIAL_DELIVERY' || s === 'PARTIAL_RECEIVED') return 'warning';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  const cards = [
    { title: 'Total Products', val: kpis.totalProducts, icon: <Package size={22} color="#fff" />, bg: '#714b67' },
    { title: 'Sales Orders', val: kpis.totalSalesOrders, icon: <ShoppingCart size={22} color="#fff" />, bg: '#8b7355' },
    { title: 'Purchase Orders', val: kpis.totalPurchaseOrders, icon: <Receipt size={22} color="#fff" />, bg: '#6b8e23' },
    { title: 'Mfg Orders', val: kpis.totalMfgOrders, icon: <Factory size={22} color="#fff" />, bg: '#cd853f' },
    { title: 'Inventory Value', val: formatCurrency(kpis.totalInventoryValue), icon: <Layers size={22} color="#fff" />, bg: '#a0522d' },
    { title: 'Total Vendors', val: kpis.totalVendors, icon: <Store size={22} color="#fff" />, bg: '#708090' },
    { title: 'Pending Deliveries', val: kpis.pendingDeliveries, icon: <Truck size={22} color="#fff" />, bg: '#5f9ea0' },
    { title: 'Pending Procure', val: kpis.pendingProcurement, icon: <FileCheck size={22} color="#fff" />, bg: '#6a5acd' },
    { title: 'Delayed Mfg Orders', val: kpis.delayedMfgOrders, icon: <AlertTriangle size={22} color="#fff" />, bg: '#dc143c' },
  ];

  return (
    <Box sx={{ flexGrow: 1, py: 1 }}>
      {/* Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card sx={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="500" sx={{ mb: 0.5 }}>
                    {card.title}
                  </Typography>
                  <Typography variant="h5" fontWeight="700" sx={{ color: '#0f172a' }}>
                    {card.val}
                  </Typography>
                </Box>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales vs Purchase Trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Sales vs Purchases Trend (Last 30 Days)
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Sales Revenue" dataKey="sales" stroke={theme.palette.primary.main} strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" name="Purchase Cost" dataKey="purchases" stroke={theme.palette.secondary.main} strokeWidth={2} fillOpacity={1} fill="url(#purchaseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Manufacturing Trend */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              MOs Completed (Last 30 Days)
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <Tooltip />
                  <Bar name="MOs Completed" dataKey="mfgCompleted" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Tables Grid */}
      <Grid container spacing={3}>
        {/* Latest Sales */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Recent Sales Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order No</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest.sales.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{order.orderNumber}</TableCell>
                      <TableCell>{order.customer?.name}</TableCell>
                      <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell>
                        <Chip label={order.status} size="small" color={getStatusChipColor(order.status)} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Latest Purchase */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Recent Purchase Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order No</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Vendor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Cost</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest.purchases.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{order.orderNumber}</TableCell>
                      <TableCell>{order.vendor?.name}</TableCell>
                      <TableCell align="right">{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell>
                        <Chip label={order.status} size="small" color={getStatusChipColor(order.status)} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Latest Manufacturing */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Recent Manufacturing Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>MO No</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest.manufacturing.map((mo) => (
                    <TableRow key={mo.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{mo.moNumber}</TableCell>
                      <TableCell>{mo.product?.name}</TableCell>
                      <TableCell align="right">{mo.quantity}</TableCell>
                      <TableCell>
                        <Chip label={mo.status} size="small" color={getStatusChipColor(mo.status)} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Latest Audit Logs */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Recent Actions (Audit)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest.auditLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{log.user?.name || 'System'}</TableCell>
                      <TableCell>{log.tableName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.action} 
                          size="small" 
                          color={log.action === 'CREATE' ? 'success' : log.action === 'UPDATE' ? 'info' : 'error'} 
                          variant="filled" 
                          sx={{ fontSize: 9, height: 18, fontWeight: 600 }} 
                        />
                      </TableCell>
                      <TableCell color="text.secondary" sx={{ fontSize: 12 }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
