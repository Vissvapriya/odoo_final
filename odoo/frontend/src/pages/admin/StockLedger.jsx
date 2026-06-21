import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  MenuItem,
  Chip
} from '@mui/material';
import { Plus, Search, RefreshCw } from 'lucide-react';

const StockLedger = () => {
  const { token, user } = useSelector((state) => state.auth);

  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transactionType, setTransactionType] = useState('ADJUSTMENT_ADD');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMovements = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search,
        type: filterType
      });
      const response = await fetch(`http://localhost:5000/api/stock-ledger?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMovements(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [page, rowsPerPage, filterType]);

  useEffect(() => {
    if (openDialog) {
      fetchProducts();
    }
  }, [openDialog]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchMovements();
  };

  const handleOpenDialog = () => {
    setSelectedProductId('');
    setTransactionType('ADJUSTMENT_ADD');
    setQuantity('');
    setDescription('');
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSave = async () => {
    if (!selectedProductId || !quantity) {
      setFormError('Please select a product and input quantity.');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive number.');
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      const response = await fetch('http://localhost:5000/api/stock-ledger/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: selectedProductId,
          transactionType,
          quantity: qty,
          description: description || `Manual adjustment by ${user?.name}`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to apply stock adjustment.');
      }

      setOpenDialog(false);
      await fetchMovements();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionChip = (type) => {
    const t = String(type).toUpperCase();
    let color = 'default';
    if (t.includes('ADD') || t.includes('RECEIPT') || t.includes('PRODUCTION')) color = 'success';
    if (t.includes('SUB') || t.includes('DELIVER') || t.includes('CONSUMP')) color = 'warning';
    
    return <Chip label={t} size="small" color={color} variant="outlined" sx={{ fontSize: 11 }} />;
  };

  // Check if current user has write access to Stock Ledger (Inventory CRUD roles: ADMIN, OWNER, INVENTORY)
  const canAdjust = ['ADMIN', 'OWNER', 'INVENTORY'].includes(user?.role);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <TextField
              size="small"
              placeholder="Search SKU or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                endAdornment: (
                  <IconButton type="submit" size="small">
                    <Search size={16} />
                  </IconButton>
                )
              }}
            />
          </form>
          
          <TextField
            select
            size="small"
            label="Transaction Type"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Movements</MenuItem>
            <MenuItem value="ADJUSTMENT_ADD">Manual Add (+)</MenuItem>
            <MenuItem value="ADJUSTMENT_SUB">Manual Sub (-)</MenuItem>
            <MenuItem value="SALES_DELIVERY">Sales Delivery (-)</MenuItem>
            <MenuItem value="PURCHASE_RECEIPT">Purchase Receipt (+)</MenuItem>
            <MenuItem value="MFG_PRODUCTION">MFG Production Output (+)</MenuItem>
            <MenuItem value="MFG_CONSUMPTION">MFG Consumption (-)</MenuItem>
          </TextField>

          <IconButton onClick={fetchMovements} size="small" color="primary">
            <RefreshCw size={18} />
          </IconButton>
        </Box>

        {canAdjust && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenDialog}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Post Adjustment
          </Button>
        )}
      </Box>

      {/* Grid List */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Movement Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date/Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No ledger entries found.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((move) => (
                  <TableRow key={move.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{move.product?.sku}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{move.product?.name}</TableCell>
                    <TableCell>{getTransactionChip(move.transactionType)}</TableCell>
                    <TableCell 
                      align="right" 
                      sx={{ 
                        fontWeight: 600, 
                        color: move.quantity > 0 ? 'success.main' : 'warning.main' 
                      }}
                    >
                      {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{move.description}</TableCell>
                    <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                      {new Date(move.createdAt).toLocaleDateString()} {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Adjust Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Post Stock Adjustment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              select
              fullWidth
              label="Select Product SKU / Name"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            >
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  [{p.sku}] - {p.name} (Qty: {p.availableQty})
                </MenuItem>
              ))}
            </TextField>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Adjustment Type"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                >
                  <MenuItem value="ADJUSTMENT_ADD">Add Stock (+)</MenuItem>
                  <MenuItem value="ADJUSTMENT_SUB">Subtract Stock (-)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Adjustment Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason / Remarks"
              placeholder="e.g. Audit correction, damage scrap, count adjustment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {loading ? 'Processing...' : 'Apply Stock Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockLedger;
