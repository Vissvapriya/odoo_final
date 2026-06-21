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
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Chip
} from '@mui/material';
import { Edit2, Plus, Trash2, Search, Info, Sparkles } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const Products = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && ['ADMIN', 'OWNER'].includes(user.role);

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');

  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  // Detail Tabs
  const [tabValue, setTabValue] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [cost, setCost] = useState(0);
  const [onHandQty, setOnHandQty] = useState(0); // initial load only
  const [thresholdQty, setThresholdQty] = useState(20);
  const [isFinishedGoods, setIsFinishedGoods] = useState(true);
  const [formError, setFormError] = useState('');

  // AI Forecasting
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    if (tabValue === 2 && selectedProduct) {
      const fetchPrediction = async () => {
        setPredictionLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/products/${selectedProduct.id}/prediction`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setPrediction(data);
        } catch (err) {
          console.error(err);
        } finally {
          setPredictionLoading(false);
        }
      };
      fetchPrediction();
    }
  }, [tabValue, selectedProduct, token]);

  const fetchProducts = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      const response = await fetch(`http://localhost:5000/api/products?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProducts(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, rowsPerPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchProducts();
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedProduct(null);
    setName('');
    setSku('');
    setDescription('');
    setPrice(0);
    setCost(0);
    setOnHandQty(0);
    setThresholdQty(20);
    setIsFinishedGoods(true);
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenEdit = (product) => {
    setFormMode('edit');
    setSelectedProduct(product);
    setName(product.name);
    setSku(product.sku);
    setDescription(product.description || '');
    setPrice(product.price);
    setCost(product.cost);
    setOnHandQty(product.onHandQty); // cannot direct modify stock here
    setThresholdQty(product.thresholdQty);
    setIsFinishedGoods(product.isFinishedGoods);
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenDetails = (product) => {
    setSelectedProduct(product);
    setTabValue(0);
    setPrediction(null);
    setOpenDetailDialog(true);
  };

  const handleSave = async () => {
    if (!name || !sku) {
      setFormError('Name and SKU are required.');
      return;
    }

    try {
      setFormError('');
      const url = formMode === 'create' 
        ? 'http://localhost:5000/api/products' 
        : `http://localhost:5000/api/products/${selectedProduct.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';
      
      const payload = {
        name,
        sku,
        description,
        price,
        cost,
        thresholdQty,
        isFinishedGoods
      };
      
      if (formMode === 'create') {
        payload.onHandQty = onHandQty; // initial stock allowed upon creation
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setOpenFormDialog(false);
      await fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Something went wrong.');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/products/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }
      setOpenConfirmDialog(false);
      await fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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

        {canWrite && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Add Product
          </Button>
        )}
      </Box>

      {/* Grid List */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }} stickyHeader>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Cost</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">On Hand</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Available</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Min Threshold</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Actions' : 'Details'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.sku}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {p.isFinishedGoods ? 'Finished Goods' : 'Raw Material'}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(p.price)}</TableCell>
                  <TableCell align="right">{formatCurrency(p.cost)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 500 }}>{p.onHandQty}</TableCell>
                  <TableCell align="right" sx={{ color: p.availableQty < p.thresholdQty ? 'error.main' : 'success.main', fontWeight: 600 }}>
                    {p.availableQty}
                  </TableCell>
                  <TableCell align="right">{p.thresholdQty}</TableCell>
                  <TableCell align="center">
                    <IconButton color="default" onClick={() => handleOpenDetails(p)} size="small" sx={{ mr: 0.5 }}>
                      <Info size={16} />
                    </IconButton>
                    {canWrite && (
                      <>
                        <IconButton color="primary" onClick={() => handleOpenEdit(p)} size="small" sx={{ mr: 0.5 }}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(p.id)} size="small">
                          <Trash2 size={16} />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={totalRows}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>

      {/* Product Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Add New Product' : 'Modify Product Details'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="SKU (Stock Keeping Unit)"
                  required
                  fullWidth
                  disabled={formMode === 'edit'}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Product Name"
                  required
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Selling Price (₹)"
                  fullWidth
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cost price (₹)"
                  fullWidth
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                />
              </Grid>

              {formMode === 'create' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Initial Stock On Hand"
                    fullWidth
                    type="number"
                    value={onHandQty}
                    onChange={(e) => setOnHandQty(parseFloat(e.target.value) || 0)}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Reorder Safety Threshold"
                  fullWidth
                  type="number"
                  value={thresholdQty}
                  onChange={(e) => setThresholdQty(parseFloat(e.target.value) || 20)}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isFinishedGoods}
                      onChange={(e) => setIsFinishedGoods(e.target.checked)}
                    />
                  }
                  label="Is Finished Goods? (Uncheck if raw material component)"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details & Audit Dialog */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          Product Console: {selectedProduct?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)}>
              <Tab label="General Info" />
              <Tab label="Audit History" />
              <Tab label="AI Forecast" icon={<Sparkles size={16} />} iconPosition="start" />
            </Tabs>
          </Box>

          {tabValue === 0 && selectedProduct && (
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">SKU:</Typography><Typography fontWeight="600">{selectedProduct.sku}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Type:</Typography><Typography>{selectedProduct.isFinishedGoods ? 'Finished Goods Assembly' : 'Raw Material'}</Typography></Grid>
              <Grid item xs={12}><Typography variant="caption" color="text.secondary">Description:</Typography><Typography>{selectedProduct.description || 'No description provided.'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Price:</Typography><Typography>{formatCurrency(selectedProduct.price)}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Cost:</Typography><Typography>{formatCurrency(selectedProduct.cost)}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="text.secondary">On Hand Stock:</Typography><Typography fontWeight="600">{selectedProduct.onHandQty}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="text.secondary">Reserved Stock:</Typography><Typography>{selectedProduct.reservedQty}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="text.secondary">Available Stock:</Typography><Typography fontWeight="600" color="primary">{selectedProduct.availableQty}</Typography></Grid>
            </Grid>
          )}

          {tabValue === 1 && selectedProduct && (
            <EntityAuditLogs tableName="Product" recordId={selectedProduct.id} />
          )}

          {tabValue === 2 && selectedProduct && (
            <Box>
              {predictionLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : prediction ? (
                <Box>
                  <Paper sx={{ p: 2, bgcolor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#6b21a8' }}>
                      <Sparkles size={18} />
                      <Typography variant="subtitle2" fontWeight="700">AI Demand Estimation</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {prediction.explanation || "Calculated optimal metrics based on historical consumption velocity and seasonal coefficients."}
                    </Typography>
                  </Paper>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="caption" color="text.secondary">AI Rec Threshold</Typography>
                        <Typography variant="h6" fontWeight="700">{prediction.calculatedThreshold.toFixed(0)} units</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="caption" color="text.secondary">Avg Daily Sales</Typography>
                        <Typography variant="h6" fontWeight="700">{prediction.avgDailySales.toFixed(1)} / day</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="caption" color="text.secondary">Sales Velocity</Typography>
                        <Typography variant="h6" fontWeight="700">{prediction.salesVelocity.toFixed(2)}x</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.06)' }}>
                        <Typography variant="caption" color="text.secondary">Reorder Freq (Days)</Typography>
                        <Typography variant="h6" fontWeight="700">{prediction.reorderFrequency.toFixed(0)} days</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Seasonal Demand Weight</Typography>
                        <Chip label={`${(prediction.seasonalDemand * 100).toFixed(0)}%`} color={prediction.seasonalDemand > 1 ? "success" : "default"} size="small" />
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Alert severity="warning">AI demand forecast data unavailable for this SKU.</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this product? All related orders, stock records, and bill of materials will also be deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products;
