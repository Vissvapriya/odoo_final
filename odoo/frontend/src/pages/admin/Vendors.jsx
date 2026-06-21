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
  Tabs,
  Tab,
  Rating,
  Divider
} from '@mui/material';
import { Edit2, Plus, Trash2, Search, Info } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const Vendors = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && user.role === 'ADMIN';

  const [vendors, setVendors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');

  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Details Tab
  const [tabValue, setTabValue] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [priceScore, setPriceScore] = useState(80);
  const [deliveryScore, setDeliveryScore] = useState(80);
  const [qualityScore, setQualityScore] = useState(80);
  const [reliabilityScore, setReliabilityScore] = useState(80);
  const [formError, setFormError] = useState('');

  const fetchVendors = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      const response = await fetch(`http://localhost:5000/api/vendors?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setVendors(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page, rowsPerPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchVendors();
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedVendor(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setPriceScore(80);
    setDeliveryScore(80);
    setQualityScore(80);
    setReliabilityScore(80);
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenEdit = (vendor) => {
    setFormMode('edit');
    setSelectedVendor(vendor);
    setName(vendor.name);
    setEmail(vendor.email);
    setPhone(vendor.phone || '');
    setAddress(vendor.address || '');
    setPriceScore(vendor.priceScore);
    setDeliveryScore(vendor.deliveryScore);
    setQualityScore(vendor.qualityScore);
    setReliabilityScore(vendor.reliabilityScore);
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenDetails = (vendor) => {
    setSelectedVendor(vendor);
    setTabValue(0);
    setOpenDetailDialog(true);
  };

  const handleSave = async () => {
    if (!name || !email) {
      setFormError('Name and Email are required.');
      return;
    }

    try {
      setFormError('');
      const url = formMode === 'create' 
        ? 'http://localhost:5000/api/vendors' 
        : `http://localhost:5000/api/vendors/${selectedVendor.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          priceScore,
          deliveryScore,
          qualityScore,
          reliabilityScore
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setOpenFormDialog(false);
      await fetchVendors();
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
      const response = await fetch(`http://localhost:5000/api/vendors/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }
      setOpenConfirmDialog(false);
      await fetchVendors();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Search and Add */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <TextField
            size="small"
            placeholder="Search vendor name..."
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
            Add Vendor
          </Button>
        )}
      </Box>

      {/* Vendors Table */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }} stickyHeader>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Performance Score</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Actions' : 'Details'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{v.name}</TableCell>
                  <TableCell>{v.email}</TableCell>
                  <TableCell>{v.phone || 'N/A'}</TableCell>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                    <Rating value={(v.finalScore || 0) / 20} precision={0.1} readOnly size="small" />
                    <Typography variant="body2" fontWeight="600" color="text.secondary">
                      {(v.finalScore || 0).toFixed(0)}/100
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="default" onClick={() => handleOpenDetails(v)} size="small" sx={{ mr: 0.5 }}>
                      <Info size={16} />
                    </IconButton>
                    {canWrite && (
                      <>
                        <IconButton color="primary" onClick={() => handleOpenEdit(v)} size="small" sx={{ mr: 0.5 }}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(v.id)} size="small">
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

      {/* Vendor Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Register Vendor' : 'Update Vendor Profiles'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Vendor Name" required fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email Address" required fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Office Address" fullWidth value={address} onChange={(e) => setAddress(e.target.value)} />
              </Grid>
              
              <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 'bold' }}>Performance Parameters (0 - 100):</Typography></Grid>
              
              <Grid item xs={6}>
                <TextField label="Price Rating" type="number" fullWidth value={priceScore} onChange={(e) => setPriceScore(parseFloat(e.target.value) || 0)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Delivery Rating" type="number" fullWidth value={deliveryScore} onChange={(e) => setDeliveryScore(parseFloat(e.target.value) || 0)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Quality Rating" type="number" fullWidth value={qualityScore} onChange={(e) => setQualityScore(parseFloat(e.target.value) || 0)} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Reliability Rating" type="number" fullWidth value={reliabilityScore} onChange={(e) => setReliabilityScore(parseFloat(e.target.value) || 0)} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Vendor Dashboard: {selectedVendor?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)}>
              <Tab label="General Info" />
              <Tab label="Audit Trail" />
            </Tabs>
          </Box>

          {tabValue === 0 && selectedVendor && (
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Name:</Typography><Typography fontWeight="600">{selectedVendor.name}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Email:</Typography><Typography>{selectedVendor.email}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Phone:</Typography><Typography>{selectedVendor.phone || 'N/A'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Address:</Typography><Typography>{selectedVendor.address || 'N/A'}</Typography></Grid>
              
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Price Rating Score:</Typography><Typography>{(selectedVendor.priceScore || 0).toFixed(0)}/100</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Delivery Score:</Typography><Typography>{(selectedVendor.deliveryScore || 0).toFixed(0)}/100</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Quality Score:</Typography><Typography>{(selectedVendor.qualityScore || 0).toFixed(0)}/100</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Reliability Score:</Typography><Typography>{(selectedVendor.reliabilityScore || 0).toFixed(0)}/100</Typography></Grid>
              
              <Grid item xs={12} sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" fontWeight="600">Calculated Score:</Typography>
                <Rating value={(selectedVendor.finalScore || 0) / 20} precision={0.1} readOnly size="small" />
                <Typography fontWeight="bold">({(selectedVendor.finalScore || 0).toFixed(1)}/100)</Typography>
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && selectedVendor && (
            <EntityAuditLogs tableName="Vendor" recordId={selectedVendor.id} />
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
          <Typography>Are you sure you want to delete this vendor? All associated purchase orders will also be deleted.</Typography>
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

export default Vendors;
