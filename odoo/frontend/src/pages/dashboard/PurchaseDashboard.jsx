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
  Legend
} from 'recharts';
import {
  Receipt,
  Store,
  FileCheck,
  FileSpreadsheet
} from 'lucide-react';

const PurchaseDashboard = () => {
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
        if (!response.ok) throw new Error('Failed to load purchase metrics.');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError('Error fetching purchase dashboard data.');
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
    if (s === 'FULLY_RECEIVED') return 'success';
    if (s === 'CONFIRMED') return 'primary';
    if (s === 'PARTIAL_RECEIVED') return 'warning';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  const cards = [
    { title: 'Total Purchase Spend', val: formatCurrency(kpis.totalPurchaseSpend), icon: <Receipt size={22} color="#fff" />, bg: '#714b67' },
    { title: 'Purchase Orders', val: kpis.totalPurchaseOrders, icon: <FileSpreadsheet size={22} color="#fff" />, bg: '#8b7355' },
    { title: 'Pending Procurement', val: kpis.pendingProcurement, icon: <FileCheck size={22} color="#fff" />, bg: '#6b8e23' },
    { title: 'Active Vendors', val: kpis.totalVendors, icon: <Store size={22} color="#fff" />, bg: '#5f9ea0' },
  ];

  return (
    <Box sx={{ flexGrow: 1, py: 1 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="700" color="text.primary">Purchase Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Monitor supplier spends, active PO status, and vendor interactions</Typography>
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
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
        {/* Purchase Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Daily Procurement Spend Trend (Last 30 Days)
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#714b67" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#714b67" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Purchase Spend" dataKey="purchases" stroke="#714b67" strokeWidth={2} fillOpacity={1} fill="url(#purchaseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Table Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Recent Purchase Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Order Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Vendor Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Cost</TableCell>
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
      </Grid>
    </Box>
  );
};

export default PurchaseDashboard;
