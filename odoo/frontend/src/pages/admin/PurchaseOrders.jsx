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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Tabs,
  Tab,
  Divider,
  Chip,
  Card,
  CardContent,
  Autocomplete,
} from '@mui/material';
import { Edit2, Plus, Trash2, Search, Info, Trash, Check, X, Sparkles } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const PurchaseOrders = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && ['ADMIN', 'PURCHASE'].includes(user.role);

  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [dependenciesVersion, setDependenciesVersion] = useState(0);
  const [formMode, setFormMode] = useState('create');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Details Tab
  const [tabValue, setTabValue] = useState(0);

  // Form Fields
  const [vendorId, setVendorId] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [items, setItems] = useState([{ productId: '', quantity: 1, cost: 0 }]);
  const [formError, setFormError] = useState('');

  const fetchOrders = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      if (statusFilter) query.append('status', statusFilter);

      const response = await fetch(`http://localhost:5000/api/purchase-orders?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setOrders(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDependencies = async () => {
    try {
      // Fetch vendors - high limit to show all including newly added
      const vendorRes = await fetch('http://localhost:5000/api/vendors?limit=10000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const vendorData = await vendorRes.json();
      setVendors(vendorData.data || []);

      // Fetch all products - high limit to show all including newly added
      const prodRes = await fetch('http://localhost:5000/api/products?limit=10000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prodData = await prodRes.json();
      setProducts(prodData.data || []);
      
      setDependenciesVersion(prev => prev + 1); // Increment version to force re-render
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDependencies();
  }, [page, rowsPerPage, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchOrders();
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedOrder(null);
    setVendorId('');
    setStatus('DRAFT');
    setItems([{ productId: '', quantity: 1, cost: 0 }]);
    setFormError('');
  };

  const handleOpenCreateWithRefresh = async () => {
    await fetchDependencies(); // Refresh dropdown data before opening
    handleOpenCreate();
    setOpenFormDialog(true);
  };

  const handleOpenEdit = async (order) => {
    await fetchDependencies(); // Refresh dropdown data before opening
    try {
      const res = await fetch(`http://localhost:5000/api/purchase-orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const details = await res.json();

      setFormMode('edit');
      setSelectedOrder(order);
      setVendorId(details.vendorId);
      setStatus(details.status);
      setItems(details.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        cost: item.cost
      })));
      setFormError('');
      setOpenFormDialog(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load PO details for editing.');
    }
  };

  const handleOpenDetails = async (order) => {
    try {
      setSelectedOrder(order);
      setTabValue(0);
      setOpenDetailDialog(true);
      // Fetch full details
      const res = await fetch(`http://localhost:5000/api/purchase-orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const details = await res.json();
      setSelectedOrderDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Status update failed.');
      fetchOrders();
      if (openDetailDialog && selectedOrder?.id === orderId) {
        // Refresh details modal
        const detailsRes = await fetch(`http://localhost:5000/api/purchase-orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const detailsData = await detailsRes.json();
        setSelectedOrderDetails(detailsData);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddRow = () => {
    setItems([...items, { productId: '', quantity: 1, cost: 0 }]);
  };

  const handleRemoveRow = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleRowChange = (index, field, val) => {
    const updated = [...items];
    updated[index][field] = val;

    // Auto-populate cost when product changes
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === val);
      if (selectedProd) {
        updated[index]['cost'] = selectedProd.cost;
      }
    }

    setItems(updated);
  };

  const handleSave = async () => {
    if (!vendorId) {
      setFormError('Vendor is required.');
      return;
    }

    const filteredItems = items.filter(item => item.productId !== '');
    if (filteredItems.length === 0) {
      setFormError('At least one raw material product item must be added.');
      return;
    }

    try {
      setFormError('');
      const url = formMode === 'create' 
        ? 'http://localhost:5000/api/purchase-orders' 
        : `http://localhost:5000/api/purchase-orders/${selectedOrder.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vendorId,
          status: formMode === 'edit' ? status : 'DRAFT',
          items: filteredItems
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setOpenFormDialog(false);
      await fetchOrders();
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
      const response = await fetch(`http://localhost:5000/api/purchase-orders/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }
      setOpenConfirmDialog(false);
      await fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const getStatusChipColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'FULLY_RECEIVED') return 'success';
    if (s === 'COMPLETED') return 'info';
    if (s === 'CONFIRMED') return 'primary';
    if (s === 'PARTIAL_RECEIVED') return 'warning';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Filters bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: '12px' }}>
          <form onSubmit={handleSearch}>
            <TextField
              size="small"
              placeholder="Search order or vendor..."
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

          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value=""><em>All Orders</em></MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="PARTIAL_RECEIVED">Partial Received</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="FULLY_RECEIVED">Fully Received</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {user && user.role === 'ADMIN' && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreateWithRefresh}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Create Purchase Order
          </Button>
        )}
      </Box>

      {/* Orders Table */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }} stickyHeader>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Order Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Vendor</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Total Cost</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                 <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Workflow Actions' : 'Progress'}</TableCell>
                 <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Actions' : 'Details'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{o.orderNumber}</TableCell>
                  <TableCell>{o.vendor?.name}</TableCell>
                  <TableCell fontWeight="500">{formatCurrency(o.totalAmount)}</TableCell>
                  <TableCell>
                    <Chip label={o.status} size="small" color={getStatusChipColor(o.status)} variant="outlined" sx={{ fontSize: 11, fontWeight: 600, height: 22 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                     {/* PURCHASE role actions */}
                     {user && user.role === 'PURCHASE' && (
                       <>
                         {o.status === 'DRAFT' && (
                           <Button size="small" variant="contained" color="primary" startIcon={<Check size={14} />} onClick={() => handleUpdateStatus(o.id, 'CONFIRMED')} sx={{ textTransform: 'none', py: 0.25, fontSize: 11 }}>
                             Accept Order
                           </Button>
                         )}
                         {(o.status === 'CONFIRMED' || o.status === 'PARTIAL_RECEIVED') && (
                           <Button size="small" variant="contained" color="success" onClick={() => handleUpdateStatus(o.id, 'COMPLETED')} sx={{ textTransform: 'none', py: 0.25, fontSize: 11 }}>
                             Mark Completed
                           </Button>
                         )}
                         {o.status === 'COMPLETED' && (
                           <Typography variant="caption" color="text.secondary">Awaiting Admin Receipt</Typography>
                         )}
                         {o.status === 'FULLY_RECEIVED' && (
                           <Typography variant="caption" color="success.main" fontWeight="600">Goods Received</Typography>
                         )}
                         {o.status === 'CANCELLED' && (
                           <Typography variant="caption" color="error.main">Cancelled</Typography>
                         )}
                       </>
                     )}

                     {/* ADMIN / OWNER role actions */}
                     {user && (user.role === 'ADMIN' || user.role === 'OWNER') && (
                       <>
                         {o.status === 'DRAFT' && (
                           <Typography variant="caption" color="text.secondary">Awaiting Acceptance</Typography>
                         )}
                         {(o.status === 'CONFIRMED' || o.status === 'PARTIAL_RECEIVED') && (
                           <Typography variant="caption" color="text.secondary">In Transit / Approved</Typography>
                         )}
                         {o.status === 'COMPLETED' && (
                           <Button size="small" variant="contained" color="success" onClick={() => handleUpdateStatus(o.id, 'FULLY_RECEIVED')} sx={{ textTransform: 'none', py: 0.25, fontSize: 11, fontWeight: 600 }}>
                             Receive Goods
                           </Button>
                         )}
                         {o.status === 'FULLY_RECEIVED' && (
                           <Chip label="Received" size="small" color="success" sx={{ fontSize: 10, height: 20 }} />
                         )}
                         {o.status === 'CANCELLED' && (
                           <Typography variant="caption" color="error.main">Cancelled</Typography>
                         )}
                       </>
                     )}

                     {/* Other roles */}
                     {user && !['ADMIN', 'OWNER', 'PURCHASE'].includes(user.role) && (
                       <Typography variant="caption" color="text.secondary">Read-only</Typography>
                     )}

                     {/* Cancel action button for Purchase and Admin */}
                     {user && ['ADMIN', 'OWNER', 'PURCHASE'].includes(user.role) && o.status !== 'FULLY_RECEIVED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                       <IconButton size="small" color="error" onClick={() => handleUpdateStatus(o.id, 'CANCELLED')} sx={{ ml: 1 }}>
                         <X size={16} />
                       </IconButton>
                     )}
                  </TableCell>
                   <TableCell align="center">
                     <IconButton color="default" onClick={() => handleOpenDetails(o)} size="small" sx={{ mr: 0.5 }}>
                       <Info size={16} />
                     </IconButton>
                     {user && user.role === 'ADMIN' && (
                       <>
                         <IconButton color="primary" onClick={() => handleOpenEdit(o)} size="small" sx={{ mr: 0.5 }} disabled={o.status === 'FULLY_RECEIVED' || o.status === 'CANCELLED'}>
                           <Edit2 size={16} />
                         </IconButton>
                         <IconButton color="error" onClick={() => handleDeleteClick(o.id)} size="small" disabled={o.status === 'FULLY_RECEIVED' || o.status === 'COMPLETED'}>
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

      {/* Purchase Order Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Draft Purchase Order' : 'Edit Purchase Order Details'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  key={`vendor-select-${dependenciesVersion}`}
                  options={vendors}
                  getOptionLabel={(option) => `${option.name} (Score: ${option.finalScore.toFixed(0)}%)`}
                  value={vendors.find(v => v.id === vendorId) || null}
                  onChange={(e, newValue) => setVendorId(newValue ? newValue.id : '')}
                  disabled={formMode === 'edit'}
                  renderInput={(params) => (
                    <TextField {...params} label="Vendor" required fullWidth />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, { inputValue }) => {
                    const lowerInput = inputValue.toLowerCase();
                    return options.filter(option => 
                      option.name?.toLowerCase().includes(lowerInput)
                    );
                  }}
                />
              </Grid>
              {formMode === 'edit' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      label="Status"
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <MenuItem value="DRAFT">Draft</MenuItem>
                      <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                      <MenuItem value="PARTIAL_RECEIVED">Partial Received</MenuItem>
                      <MenuItem value="FULLY_RECEIVED">Fully Received</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5 }}>Purchase Items (Finished Goods & Raw Materials):</Typography>

            {items.map((item, index) => (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    key={`product-select-${dependenciesVersion}`}
                    options={products}
                    getOptionLabel={(option) => `${option.name} (${option.sku}) - Cost: ₹${option.cost} (Qty: ${option.onHandQty})`}
                    value={products.find(p => p.id === item.productId) || null}
                    onChange={(e, newValue) => handleRowChange(index, 'productId', newValue ? newValue.id : '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Product (Raw Material / Finished Good)" required fullWidth />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    filterOptions={(options, { inputValue }) => {
                      const lowerInput = inputValue.toLowerCase();
                      return options.filter(option => 
                        option.name?.toLowerCase().includes(lowerInput) ||
                        option.sku?.toLowerCase().includes(lowerInput)
                      );
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField label="Quantity" type="number" fullWidth value={item.quantity} onChange={(e) => handleRowChange(index, 'quantity', parseFloat(e.target.value) || 1)} />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField label="Unit Cost (₹)" type="number" fullWidth value={item.cost} onChange={(e) => handleRowChange(index, 'cost', parseFloat(e.target.value) || 0)} />
                </Grid>
                <Grid item xs={12} sm={2} align="center">
                  <IconButton color="error" onClick={() => handleRemoveRow(index)} disabled={items.length === 1}>
                    <Trash size={18} />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddRow} sx={{ mt: 1, textTransform: 'none' }}>
              Add Purchase Line
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save Purchase Order</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Purchase Order Console: {selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)}>
              <Tab label="General Info" />
              <Tab label="Audit Trails" />
            </Tabs>
          </Box>

          {tabValue === 0 && selectedOrderDetails && (
            <Box>
              {/* AI Recommendation Alert */}
              {selectedOrderDetails.recommendations && selectedOrderDetails.recommendations.length > 0 && (
                <Card sx={{ mb: 3, border: '1px solid #c084fc', bgcolor: '#faf5ff' }}>
                  <CardContent sx={{ py: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box sx={{ mt: 0.5, color: '#a855f7' }}><Sparkles size={22} /></Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="700" color="#7e22ce" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        AI Vendor Recommendation Engine
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, color: '#581c87' }}>
                        {selectedOrderDetails.recommendations[0].explanation}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <Chip label={`Rec Score: ${selectedOrderDetails.recommendations[0].score.toFixed(0)}/100`} size="small" sx={{ bgcolor: '#d8b4fe', color: '#581c87', fontWeight: 600 }} />
                        <Chip label={`Recommended: ${selectedOrderDetails.recommendations[0].recommendedVendor?.name}`} size="small" sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Order Number:</Typography><Typography fontWeight="600" fontFamily="monospace">{selectedOrderDetails.orderNumber}</Typography></Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Order Status:</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedOrderDetails.status} size="small" color={getStatusChipColor(selectedOrderDetails.status)} variant="filled" sx={{ fontWeight: 600 }} />
                  </Box>
                </Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Vendor:</Typography><Typography>{selectedOrderDetails.vendor?.name}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Vendor Contact:</Typography><Typography>{selectedOrderDetails.vendor?.email}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Total Cost Value:</Typography><Typography fontWeight="700" color="primary">{formatCurrency(selectedOrderDetails.totalAmount)}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Created Date:</Typography><Typography>{new Date(selectedOrderDetails.createdAt).toLocaleString()}</Typography></Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1.5 }}>Line Items List:</Typography>

              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Unit Cost</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Ordered Qty</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Received Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderDetails.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.product?.sku}</TableCell>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ color: item.receivedQty === item.quantity ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                          {item.receivedQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && selectedOrder && (
            <EntityAuditLogs tableName="PurchaseOrder" recordId={selectedOrder.id} />
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
          <Typography>Are you sure you want to delete this Purchase Order? All associated items and recommendations will also be deleted.</Typography>
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

export default PurchaseOrders;
