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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Package,
  Layers,
  AlertTriangle,
  History
} from 'lucide-react';

const InventoryDashboard = () => {
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
        if (!response.ok) throw new Error('Failed to load inventory metrics.');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError('Error fetching inventory dashboard data.');
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

  const getTransactionChipColor = (type) => {
    const t = String(type).toUpperCase();
    if (t.includes('ADD') || t.includes('RECEIPT') || t.includes('PRODUCTION')) return 'success';
    if (t.includes('SUB') || t.includes('DELIVER') || t.includes('CONSUMP')) return 'warning';
    return 'default';
  };

  const cards = [
    { title: 'Total Items Cataloged', val: kpis.totalProducts, icon: <Package size={22} color="#fff" />, bg: '#714b67' },
    { title: 'Stock On-Hand Value', val: formatCurrency(kpis.totalInventoryValue), icon: <Layers size={22} color="#fff" />, bg: '#8b7355' },
    { title: 'Low Stock Item Alerts', val: kpis.lowStockAlerts, icon: <AlertTriangle size={22} color="#fff" />, bg: '#dc143c' },
    { title: 'Total Ledger Movements', val: kpis.totalStockMovements, icon: <History size={22} color="#fff" />, bg: '#6a5acd' },
  ];

  return (
    <Box sx={{ flexGrow: 1, py: 1 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="700" color="text.primary">Inventory Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Monitor stock adjustments, warnings, and absolute ledger volumes</Typography>
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
                  <Typography variant="h5" fontWeight="700" sx={{ color: card.title.includes('Alert') && card.val > 0 ? '#ef4444' : '#0f172a' }}>
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
        {/* Stock Volume Trend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Daily absolute stock movement volumes (Last 30 Days)
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="Stock Volume Moved" dataKey="stockMoved" fill="#714b67" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Stock Movements Table Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Recent Stock Movements (Ledger)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Movement Type</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest.stockMovements.map((move) => (
                    <TableRow key={move.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{move.product?.sku}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{move.product?.name}</TableCell>
                      <TableCell>
                        <Chip label={move.transactionType} size="small" color={getTransactionChipColor(move.transactionType)} variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: move.quantity > 0 ? 'success.main' : 'warning.main' }}>
                        {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>{move.description}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(move.createdAt).toLocaleDateString()} {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

export default InventoryDashboard;
