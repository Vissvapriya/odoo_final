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
  Divider
} from '@mui/material';
import { Edit2, Plus, Trash2, Search, Info } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const Customers = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && ['ADMIN', 'SALES'].includes(user.role);

  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');

  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Details Tab
  const [tabValue, setTabValue] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      const response = await fetch(`http://localhost:5000/api/customers?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCustomers(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, rowsPerPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchCustomers();
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenEdit = (customer) => {
    setFormMode('edit');
    setSelectedCustomer(customer);
    setName(customer.name);
    setEmail(customer.email);
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenDetails = (customer) => {
    setSelectedCustomer(customer);
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
        ? 'http://localhost:5000/api/customers' 
        : `http://localhost:5000/api/customers/${selectedCustomer.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, phone, address })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setOpenFormDialog(false);
      await fetchCustomers();
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
      const response = await fetch(`http://localhost:5000/api/customers/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }
      setOpenConfirmDialog(false);
      await fetchCustomers();
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
            placeholder="Search customer name..."
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
            Add Customer
          </Button>
        )}
      </Box>

      {/* Customers Table */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Actions' : 'Details'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone || 'N/A'}</TableCell>
                  <TableCell>{c.address || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <IconButton color="default" onClick={() => handleOpenDetails(c)} size="small" sx={{ mr: 0.5 }}>
                      <Info size={16} />
                    </IconButton>
                    {canWrite && (
                      <>
                        <IconButton color="primary" onClick={() => handleOpenEdit(c)} size="small" sx={{ mr: 0.5 }}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(c.id)} size="small">
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

      {/* Customer Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Register Customer' : 'Update Customer Profile'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Customer Name" required fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email Address" required fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Billing Address" fullWidth value={address} onChange={(e) => setAddress(e.target.value)} />
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
          Customer Workspace: {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)}>
              <Tab label="General Info" />
              <Tab label="Audit Trails" />
            </Tabs>
          </Box>

          {tabValue === 0 && selectedCustomer && (
            <Grid container spacing={2}>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Name:</Typography><Typography fontWeight="600">{selectedCustomer.name}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Email:</Typography><Typography>{selectedCustomer.email}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Phone:</Typography><Typography>{selectedCustomer.phone || 'N/A'}</Typography></Grid>
              <Grid item xs={6}><Typography variant="caption" color="text.secondary">Address:</Typography><Typography>{selectedCustomer.address || 'N/A'}</Typography></Grid>
            </Grid>
          )}

          {tabValue === 1 && selectedCustomer && (
            <EntityAuditLogs tableName="Customer" recordId={selectedCustomer.id} />
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
          <Typography>Are you sure you want to delete this customer? All associated sales orders will also be deleted.</Typography>
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

export default Customers;
