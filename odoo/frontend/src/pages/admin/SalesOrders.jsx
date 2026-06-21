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
  Autocomplete,
} from '@mui/material';
import { Edit2, Plus, Trash2, Search, Info, Trash, Check, X, Sparkles } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const SalesOrders = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && ['ADMIN', 'SALES'].includes(user.role);

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [dependenciesLoaded, setDependenciesLoaded] = useState(false);
  const [dependenciesVersion, setDependenciesVersion] = useState(0);
  const [formMode, setFormMode] = useState('create');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Details Tab
  const [tabValue, setTabValue] = useState(0);

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [items, setItems] = useState([{ productId: '', quantity: 1, price: 0 }]);
  const [formError, setFormError] = useState('');

  const fetchOrders = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      if (statusFilter) query.append('status', statusFilter);

      const response = await fetch(`http://localhost:5000/api/sales-orders?${query.toString()}`, {
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
    setDependenciesLoaded(false);
    try {
      // Fetch customers - high limit to show all including newly added
      const custRes = await fetch('http://localhost:5000/api/customers?limit=10000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const custData = await custRes.json();
      console.log('Fetched customers:', custData.data?.length, custData.data);
      setCustomers(custData.data || []);

      // Fetch finished goods products for selling - high limit to show all including newly added
      const prodRes = await fetch('http://localhost:5000/api/products?limit=10000&isFinished=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prodData = await prodRes.json();
      console.log('Fetched products:', prodData.data?.length);
      setProducts(prodData.data || []);

      // Fetch vendors - high limit to show all including newly added
      const vendorRes = await fetch('http://localhost:5000/api/vendors?limit=10000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const vendorData = await vendorRes.json();
      console.log('Fetched vendors:', vendorData.data?.length);
      setVendors(vendorData.data || []);
      
      setDependenciesLoaded(true);
      setDependenciesVersion(prev => prev + 1); // Increment version to force re-render
    } catch (err) {
      console.error('Error fetching dependencies:', err);
      setDependenciesLoaded(true);
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
    setCustomerId('');
    setStatus('DRAFT');
    setItems([{ productId: '', quantity: 1, price: 0 }]);
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
      const res = await fetch(`http://localhost:5000/api/sales-orders/${order.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const details = await res.json();

      setFormMode('edit');
      setSelectedOrder(order);
      setCustomerId(details.customerId);
      setStatus(details.status);
      setItems(details.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })));
      setFormError('');
      setOpenFormDialog(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load order details for editing.');
    }
  };

  const handleOpenDetails = async (order) => {
    try {
      setSelectedOrder(order);
      setTabValue(0);
      setOpenDetailDialog(true);
      // Fetch full details
      const res = await fetch(`http://localhost:5000/api/sales-orders/${order.id}`, {
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
      const response = await fetch(`http://localhost:5000/api/sales-orders/${orderId}`, {
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
        const detailsRes = await fetch(`http://localhost:5000/api/sales-orders/${orderId}`, {
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
    setItems([...items, { productId: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveRow = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleRowChange = (index, field, val) => {
    const updated = [...items];
    updated[index][field] = val;

    // Auto-populate price when product changes
    if (field === 'productId') {
      const selectedProd = products.find(p => p.id === val);
      if (selectedProd) {
        updated[index]['price'] = selectedProd.price;
      }
    }

    setItems(updated);
  };

  const [vendors, setVendors] = useState([]);
  const [openDeficitDialog, setOpenDeficitDialog] = useState(false);
  const [deficitItems, setDeficitItems] = useState([]);

  const handleAiRecommend = async (index) => {
    try {
      const res = await fetch('http://localhost:5000/api/vendors/ai-recommend', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.recommendedVendor) {
        const updated = [...deficitItems];
        updated[index].vendorId = data.recommendedVendor.id;
        updated[index].usedAi = true;
        updated[index].aiExplanation = data.explanation;
        setDeficitItems(updated);
      } else {
        alert('Failed to fetch AI recommendation: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect for AI recommendation.');
    }
  };

  const handleDeficitChange = (index, field, val) => {
    const updated = [...deficitItems];
    updated[index][field] = val;
    if (field === 'source' && val === 'manufacturer') {
      updated[index].usedAi = false;
      updated[index].aiExplanation = '';
    }
    setDeficitItems(updated);
  };

  const handleConfirmProcurement = () => {
    // Map deficitItems back to items
    const finalItems = items.filter(item => item.productId !== '').map(item => {
      const deficitMatch = deficitItems.find(d => d.productId === item.productId);
      if (deficitMatch) {
        return {
          ...item,
          procurement: {
            source: deficitMatch.source,
            vendorId: deficitMatch.source === 'vendor' ? deficitMatch.vendorId : undefined,
            usedAi: deficitMatch.usedAi,
            aiExplanation: deficitMatch.aiExplanation
          }
        };
      }
      return item;
    });

    handleSave(finalItems);
  };

  const handleSave = async (forceItems = null) => {
    const actualForceItems = (forceItems && (forceItems.nativeEvent || typeof forceItems.preventDefault === 'function')) ? null : forceItems;
    if (!customerId) {
      setFormError('Customer is required.');
      return;
    }

    const filteredItems = items.filter(item => item.productId !== '');
    if (filteredItems.length === 0) {
      setFormError('At least one product item must be added.');
      return;
    }

    // Intercept stock deficit if we haven't already resolved it (creation mode only)
    if (formMode === 'create' && !actualForceItems) {
      const itemsWithDeficit = [];
      
      for (const item of filteredItems) {
        const prod = products.find(p => p.id === item.productId);
        const avail = prod ? (prod.availableQty || 0) : 0;
        if (item.quantity > avail) {
          itemsWithDeficit.push({
            productId: item.productId,
            name: prod ? prod.name : 'Unknown Product',
            orderedQty: item.quantity,
            availableQty: avail,
            deficit: item.quantity - avail,
            source: 'vendor', // default
            vendorId: vendors[0]?.id || '',
            usedAi: false,
            aiExplanation: ''
          });
        }
      }

      if (itemsWithDeficit.length > 0) {
        setDeficitItems(itemsWithDeficit);
        setOpenDeficitDialog(true);
        return;
      }
    }

    const finalItems = actualForceItems || filteredItems;

    try {
      setFormError('');
      const url = formMode === 'create' 
        ? 'http://localhost:5000/api/sales-orders' 
        : `http://localhost:5000/api/sales-orders/${selectedOrder.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId,
          status: formMode === 'edit' ? status : 'DRAFT',
          items: finalItems
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setOpenFormDialog(false);
      setOpenDeficitDialog(false);
      fetchOrders();
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
      const response = await fetch(`http://localhost:5000/api/sales-orders/${deleteId}`, {
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
    if (s === 'DELIVERED') return 'success';
    if (s === 'CONFIRMED') return 'primary';
    if (s === 'PARTIAL_DELIVERY') return 'warning';
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
              placeholder="Search order or customer..."
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
              <MenuItem value="PARTIAL_DELIVERY">Partial Delivery</MenuItem>
              <MenuItem value="DELIVERED">Delivered</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {canWrite && (
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={handleOpenCreateWithRefresh}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Create Sales Order
          </Button>
        )}
      </Box>

      {/* Orders Grid */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }} stickyHeader>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Order Number</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Total Amount</TableCell>
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
                  <TableCell>{o.customer?.name}</TableCell>
                  <TableCell fontWeight="500">{formatCurrency(o.totalAmount)}</TableCell>
                  <TableCell>
                    <Chip label={o.status} size="small" color={getStatusChipColor(o.status)} variant="outlined" sx={{ fontSize: 11, fontWeight: 600, height: 22 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    {!canWrite && <Typography variant="caption" color="text.secondary">Read-only</Typography>}
                    {canWrite && o.status === 'DRAFT' && (
                      <Button size="small" variant="contained" color="primary" startIcon={<Check size={14} />} onClick={() => handleUpdateStatus(o.id, 'CONFIRMED')} sx={{ textTransform: 'none', py: 0.25, fontSize: 11 }}>
                        Confirm
                      </Button>
                    )}
                    {canWrite && o.status === 'CONFIRMED' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleUpdateStatus(o.id, 'DELIVERED')} sx={{ textTransform: 'none', py: 0.25, fontSize: 11 }}>
                        Ship Complete
                      </Button>
                    )}
                    {canWrite && o.status === 'PARTIAL_DELIVERY' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleUpdateStatus(o.id, 'DELIVERED')} sx={{ textTransform: 'none', py: 0.25, fontSize: 11 }}>
                        Deliver All
                      </Button>
                    )}
                    {canWrite && o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                      <IconButton size="small" color="error" onClick={() => handleUpdateStatus(o.id, 'CANCELLED')} sx={{ ml: 1 }}>
                        <X size={16} />
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="default" onClick={() => handleOpenDetails(o)} size="small" sx={{ mr: 0.5 }}>
                      <Info size={16} />
                    </IconButton>
                    {canWrite && (
                      <>
                        <IconButton color="primary" onClick={() => handleOpenEdit(o)} size="small" sx={{ mr: 0.5 }} disabled={o.status === 'DELIVERED' || o.status === 'CANCELLED'}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(o.id)} size="small" disabled={o.status === 'DELIVERED'}>
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

      {/* Sales Order Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Draft Sales Order' : 'Edit Sales Order Details'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  key={`customer-select-${dependenciesVersion}`}
                  options={customers}
                  getOptionLabel={(option) => `${option.name} (${option.email})`}
                  value={customers.find(c => c.id === customerId) || null}
                  onChange={(e, newValue) => setCustomerId(newValue ? newValue.id : '')}
                  disabled={formMode === 'edit'}
                  renderInput={(params) => (
                    <TextField {...params} label="Customer" required fullWidth />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, { inputValue }) => {
                    const lowerInput = inputValue.toLowerCase();
                    return options.filter(option => 
                      option.name?.toLowerCase().includes(lowerInput) ||
                      option.email?.toLowerCase().includes(lowerInput)
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
                      <MenuItem value="PARTIAL_DELIVERY">Partial Delivery</MenuItem>
                      <MenuItem value="DELIVERED">Delivered</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5 }}>Order Items:</Typography>

            {items.map((item, index) => (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    key={`product-select-${dependenciesVersion}`}
                    options={products}
                    getOptionLabel={(option) => `${option.name} (${option.sku}) - Price: ₹${option.price} (Qty: ${option.onHandQty})`}
                    value={products.find(p => p.id === item.productId) || null}
                    onChange={(e, newValue) => handleRowChange(index, 'productId', newValue ? newValue.id : '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Finished Goods Product" required fullWidth />
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
                  <TextField label="Selling Price (₹)" type="number" fullWidth value={item.price} onChange={(e) => handleRowChange(index, 'price', parseFloat(e.target.value) || 0)} />
                </Grid>
                <Grid item xs={12} sm={2} align="center">
                  <IconButton color="error" onClick={() => handleRemoveRow(index)} disabled={items.length === 1}>
                    <Trash size={18} />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddRow} sx={{ mt: 1, textTransform: 'none' }}>
              Add Order Line
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Cancel</Button>
          <Button onClick={() => handleSave()} variant="contained">Save Sales Order</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Sales Order Console: {selectedOrder?.orderNumber}
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
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Order Number:</Typography><Typography fontWeight="600" fontFamily="monospace">{selectedOrderDetails.orderNumber}</Typography></Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Order Status:</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedOrderDetails.status} size="small" color={getStatusChipColor(selectedOrderDetails.status)} variant="filled" sx={{ fontWeight: 600 }} />
                  </Box>
                </Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Customer Name:</Typography><Typography>{selectedOrderDetails.customer?.name}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Customer Email:</Typography><Typography>{selectedOrderDetails.customer?.email}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Total Amount Value:</Typography><Typography fontWeight="700" color="primary">{formatCurrency(selectedOrderDetails.totalAmount)}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Ordered Timestamp:</Typography><Typography>{new Date(selectedOrderDetails.createdAt).toLocaleString()}</Typography></Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1.5 }}>Line Items List:</Typography>

              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Unit Price</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Ordered Qty</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Delivered Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrderDetails.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.product?.sku}</TableCell>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ color: item.deliveredQty === item.quantity ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                          {item.deliveredQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && selectedOrder && (
            <EntityAuditLogs tableName="SalesOrder" recordId={selectedOrder.id} />
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
          <Typography>Are you sure you want to delete this Sales Order? All associated items and records will also be deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inventory Deficit Allocation Dialog */}
      <Dialog open={openDeficitDialog} onClose={() => setOpenDeficitDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sparkles color="#3b82f6" /> Inventory Deficit Allocation
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              The following products do not have enough stock available. Available quantities will be reserved. Please select a procurement method for the deficit.
            </Alert>

            {deficitItems.map((item, idx) => (
              <Box key={item.productId} sx={{ p: 2, mb: 2, border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', bgcolor: 'rgba(248,250,252,0.5)' }}>
                <Typography variant="subtitle1" fontWeight="bold" color="text.primary" sx={{ mb: 1.5 }}>
                  {item.name}
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Ordered Qty: <strong>{item.orderedQty}</strong></Typography>
                    <Typography variant="body2" color="text.secondary">Available Qty: <strong style={{ color: '#16a34a' }}>{item.availableQty}</strong></Typography>
                    <Typography variant="body2" color="text.secondary">Remaining Deficit: <strong style={{ color: '#dc2626' }}>{item.deficit}</strong></Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Procure Source</InputLabel>
                      <Select
                        value={item.source}
                        label="Procure Source"
                        onChange={(e) => handleDeficitChange(idx, 'source', e.target.value)}
                      >
                        <MenuItem value="vendor">Vendor (Purchase Order)</MenuItem>
                        <MenuItem value="manufacturer">Manufacturer (Mfg Order)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    {item.source === 'vendor' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Select Vendor</InputLabel>
                          <Select
                            value={item.vendorId}
                            label="Select Vendor"
                            onChange={(e) => handleDeficitChange(idx, 'vendorId', e.target.value)}
                          >
                            {vendors.map(v => (
                              <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <IconButton
                          color="primary"
                          onClick={() => handleAiRecommend(idx)}
                          title="AI Recommend Vendor"
                          sx={{ border: '1px dashed #714b67', borderRadius: '8px' }}
                        >
                          <Sparkles size={18} />
                        </IconButton>
                      </Box>
                    )}
                  </Grid>
                </Grid>

                {item.aiExplanation && (
                  <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(243,244,246,0.7)', border: '1px solid rgba(113,75,103,0.15)' }}>
                    <Typography variant="caption" display="flex" alignItems="center" gap={0.5} fontWeight="600" color="primary.main">
                      <Sparkles size={12} /> {item.aiExplanation}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeficitDialog(false)}>Back to Form</Button>
          <Button onClick={handleConfirmProcurement} variant="contained" color="primary">
            Confirm & Reserve Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesOrders;
