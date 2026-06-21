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
  Divider
} from '@mui/material';
import { Edit2, Plus, Trash2, Search, Info, Trash } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const Boms = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && ['ADMIN', 'MANUFACTURING'].includes(user.role);

  const [boms, setBoms] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');

  // Dialogs
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [selectedBom, setSelectedBom] = useState(null);
  const [selectedBomDetails, setSelectedBomDetails] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Details Tab
  const [tabValue, setTabValue] = useState(0);

  // Form Fields
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [bomItems, setBomItems] = useState([{ productId: '', quantity: 1 }]);
  const [formError, setFormError] = useState('');

  const fetchBoms = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      const response = await fetch(`http://localhost:5000/api/boms?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setBoms(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProductsForSelect = async () => {
    try {
      // Fetch finished goods (1-400 or isFinishedGoods = true)
      const finishedRes = await fetch('http://localhost:5000/api/products?limit=100&isFinished=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const finishedData = await finishedRes.json();
      setFinishedProducts(finishedData.data || []);

      // Fetch raw materials (isFinishedGoods = false)
      const rawRes = await fetch('http://localhost:5000/api/products?limit=100&isFinished=false', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const rawData = await rawRes.json();
      setRawMaterials(rawData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBoms();
    fetchProductsForSelect();
  }, [page, rowsPerPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchBoms();
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedBom(null);
    setName('');
    setProductId('');
    setQuantity(1);
    setBomItems([{ productId: '', quantity: 1 }]);
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenEdit = async (bom) => {
    try {
      // Fetch fresh full BOM details with items
      const res = await fetch(`http://localhost:5000/api/boms/${bom.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const details = await res.json();
      
      setFormMode('edit');
      setSelectedBom(bom);
      setName(details.name);
      setProductId(details.productId);
      setQuantity(details.quantity);
      setBomItems(details.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })));
      setFormError('');
      setOpenFormDialog(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load BOM details for editing.');
    }
  };

  const handleOpenDetails = async (bom) => {
    try {
      setSelectedBom(bom);
      setTabValue(0);
      setOpenDetailDialog(true);
      // Fetch full details
      const res = await fetch(`http://localhost:5000/api/boms/${bom.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const details = await res.json();
      setSelectedBomDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRow = () => {
    setBomItems([...bomItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveRow = (index) => {
    const updated = [...bomItems];
    updated.splice(index, 1);
    setBomItems(updated);
  };

  const handleRowChange = (index, field, val) => {
    const updated = [...bomItems];
    updated[index][field] = val;
    setBomItems(updated);
  };

  const handleSave = async () => {
    if (!name || !productId) {
      setFormError('BOM Name and Finished Product are required.');
      return;
    }

    const filteredItems = bomItems.filter(item => item.productId !== '');
    if (filteredItems.length === 0) {
      setFormError('At least one raw material component must be added.');
      return;
    }

    try {
      setFormError('');
      const url = formMode === 'create' 
        ? 'http://localhost:5000/api/boms' 
        : `http://localhost:5000/api/boms/${selectedBom.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          productId,
          quantity,
          items: filteredItems
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Operation failed.');
      }

      setOpenFormDialog(false);
      await fetchBoms();
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
      const response = await fetch(`http://localhost:5000/api/boms/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }
      setOpenConfirmDialog(false);
      await fetchBoms();
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
            placeholder="Search BOM by product..."
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
            Create BOM
          </Button>
        )}
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>BOM Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Finished Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Yield Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Actions' : 'Details'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {boms.map((bom) => (
                <TableRow key={bom.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{bom.name}</TableCell>
                  <TableCell>{bom.product?.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{bom.product?.sku}</TableCell>
                  <TableCell align="right">{bom.quantity}</TableCell>
                  <TableCell align="center">
                    <IconButton color="default" onClick={() => handleOpenDetails(bom)} size="small" sx={{ mr: 0.5 }}>
                      <Info size={16} />
                    </IconButton>
                    {canWrite && (
                      <>
                        <IconButton color="primary" onClick={() => handleOpenEdit(bom)} size="small" sx={{ mr: 0.5 }}>
                          <Edit2 size={16} />
                        </IconButton>
                        <IconButton color="error" onClick={() => handleDeleteClick(bom.id)} size="small">
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

      {/* BOM Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Create Bill of Materials (BOM)' : 'Modify BOM Settings'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField label="BOM Name" required fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard BOM for Product X" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Finished Product Assembly</InputLabel>
                  <Select
                    value={productId}
                    label="Finished Product Assembly"
                    onChange={(e) => setProductId(e.target.value)}
                    disabled={formMode === 'edit'}
                  >
                    {finishedProducts.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name} ({p.sku})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField label="Yield Qty" type="number" fullWidth value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5 }}>Raw Materials & Components Required:</Typography>

            {bomItems.map((item, index) => (
              <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 1.5 }}>
                <Grid item xs={12} sm={7}>
                  <FormControl fullWidth required>
                    <InputLabel>Raw Material Component</InputLabel>
                    <Select
                      value={item.productId}
                      label="Raw Material Component"
                      onChange={(e) => handleRowChange(index, 'productId', e.target.value)}
                    >
                      {rawMaterials.map(rm => (
                        <MenuItem key={rm.id} value={rm.id}>{rm.name} ({rm.sku}) - On Hand: {rm.onHandQty}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={8} sm={3}>
                  <TextField label="Quantity Needed" type="number" fullWidth value={item.quantity} onChange={(e) => handleRowChange(index, 'quantity', parseFloat(e.target.value) || 1)} />
                </Grid>
                <Grid item xs={4} sm={2} align="center">
                  <IconButton color="error" onClick={() => handleRemoveRow(index)} disabled={bomItems.length === 1}>
                    <Trash size={18} />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Button variant="outlined" startIcon={<Plus size={16} />} onClick={handleAddRow} sx={{ mt: 1, textTransform: 'none' }}>
              Add Raw Material
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save BOM</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          BOM Profile: {selectedBom?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={(e, newVal) => setTabValue(newVal)}>
              <Tab label="General Info" />
              <Tab label="Audit History" />
            </Tabs>
          </Box>

          {tabValue === 0 && selectedBomDetails && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Finished Product Assembly:</Typography><Typography fontWeight="600">{selectedBomDetails.product?.name}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Yield Quantity Output:</Typography><Typography>{selectedBomDetails.quantity}</Typography></Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1.5 }}>Component List:</Typography>

              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Raw Material</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Qty Needed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedBomDetails.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.product?.sku}</TableCell>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && selectedBom && (
            <EntityAuditLogs tableName="BOM" recordId={selectedBom.id} />
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
          <Typography>Are you sure you want to delete this Bill of Materials? This will delete all component records from the BOM configuration.</Typography>
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

export default Boms;
