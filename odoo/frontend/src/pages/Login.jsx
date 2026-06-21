import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { roleDashboardMap } from '../components/RoleGuard';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  useTheme,
  CircularProgress,
  Grid
} from '@mui/material';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect directly to role dashboard
    if (isAuthenticated && user) {
      const redirectPath = roleDashboardMap[user.role] || '/login';
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      dispatch(setCredentials({ token: data.token, user: data.user }));
      
      // Navigate to dashboard based on role
      const redirectPath = roleDashboardMap[data.user.role] || '/login';
      navigate(redirectPath);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #714b67 0%, #5a3d52 100%)',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', overflow: 'hidden', bgcolor: '#fff' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ width: 80, height: 70, borderRadius: '12px', background: 'linear-gradient(135deg, #714b67 0%, #f3f4f6 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Typography variant="h5" fontWeight="bold" color="#fff">Odoo ERP</Typography>
            </Box>
            <Typography variant="h5" fontWeight="700" sx={{ color: '#0f172a' }}>
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Enter your credentials to access the Odoo ERP system
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} style={{ opacity: 0.6 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              />

              <TextField
                label="Password"
                variant="outlined"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} style={{ opacity: 0.6 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': {
                    boxShadow: 'none',
                  }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </Box>
          </form>

          {/* Quick Demo Credentials Footer */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ display: 'block', mb: 1, textAlign: 'center' }}>
              Quick Demo Accounts (Password: <b>password123</b>)
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Admin: <b>admin@erp.com</b>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Owner: <b>owner@erp.com</b>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Sales: <b>sales@erp.com</b>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Purchase: <b>purchase@erp.com</b>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Mfg: <b>mfg@erp.com</b>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  • Inventory: <b>inventory@erp.com</b>
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
