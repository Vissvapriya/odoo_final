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
  Factory,
  CheckCircle,
  Play,
  FileCode
} from 'lucide-react';

const ManufacturingDashboard = () => {
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
        if (!response.ok) throw new Error('Failed to load manufacturing metrics.');
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError('Error fetching manufacturing dashboard data.');
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

  const getStatusChipColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'COMPLETED') return 'success';
    if (s === 'IN_PROGRESS') return 'primary';
    if (s === 'CONFIRMED') return 'warning';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  const cards = [
    { title: 'Total Manufacturing Orders', val: kpis.totalMfgOrders, icon: <Factory size={22} color="#fff" />, bg: '#714b67' },
    { title: 'Completed Orders', val: kpis.completedMfgOrders, icon: <CheckCircle size={22} color="#fff" />, bg: '#6b8e23' },
    { title: 'Active Production (In-Progress)', val: kpis.activeMfgOrders, icon: <Play size={22} color="#fff" />, bg: '#8b7355' },
    { title: 'Bills of Materials (BOM)', val: kpis.totalBoms, icon: <FileCode size={22} color="#fff" />, bg: '#6a5acd' },
  ];

  return (
    <Box sx={{ flexGrow: 1, py: 1 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="700" color="text.primary">Manufacturing Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Monitor shop floor capacity, production outputs, and BOM structures</Typography>
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
        {/* MO Completed Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
              Daily Completed Manufacturing Orders (Last 30 Days)
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#6b6375' }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="MOs Completed" dataKey="mfgCompleted" fill="#cd853f" radius={[4, 4, 0, 0]} />
                </BarChart>
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
              Recent Manufacturing Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>MO Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Target Quantity</TableCell>
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
      </Grid>
    </Box>
  );
};

export default ManufacturingDashboard;
