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
import { Edit2, Plus, Trash2, Search, Info, Trash, Check, Play, CheckCircle } from 'lucide-react';
import EntityAuditLogs from '../../components/EntityAuditLogs';

const ManufacturingOrders = () => {
  const { token, user } = useSelector((state) => state.auth);
  const canWrite = user && ['ADMIN', 'MANUFACTURING'].includes(user.role);

  // Top-level tabs
  const [topTab, setTopTab] = useState(0);

  // ==========================================
  // STATE: MANUFACTURING ORDERS
  // ==========================================
  const [moList, setMoList] = useState([]);
  const [moPage, setMoPage] = useState(0);
  const [moRowsPerPage, setMoRowsPerPage] = useState(10);
  const [moTotalRows, setMoTotalRows] = useState(0);
  const [moSearch, setMoSearch] = useState('');
  const [moStatus, setMoStatus] = useState('');

  // Dialogs
  const [openMoForm, setOpenMoForm] = useState(false);
  const [openMoDetails, setOpenMoDetails] = useState(false);
  const [selectedMo, setSelectedMo] = useState(null);
  const [selectedMoDetails, setSelectedMoDetails] = useState(null);
  const [moDetailTab, setMoDetailTab] = useState(0);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [confirmType, setConfirmType] = useState(''); // 'MO', 'WC', 'OP'
  const [deleteId, setDeleteId] = useState(null);

  // MO Form Fields
  const [moProductId, setMoProductId] = useState('');
  const [moBomId, setMoBomId] = useState('');
  const [moQuantity, setMoQuantity] = useState(1);
  const [moFormError, setMoFormError] = useState('');

  // Dependencies
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [boms, setBoms] = useState([]);
  const [dependenciesVersion, setDependenciesVersion] = useState(0);

  // ==========================================
  // STATE: WORK CENTERS
  // ==========================================
  const [wcs, setWcs] = useState([]);
  const [openWcForm, setOpenWcForm] = useState(false);
  const [selectedWc, setSelectedWc] = useState(null);
  const [wcName, setWcName] = useState('');
  const [wcCode, setWcCode] = useState('');
  const [wcCapacity, setWcCapacity] = useState(1);
  const [wcCost, setWcCost] = useState(0);
  const [wcError, setWcError] = useState('');

  // ==========================================
  // STATE: OPERATIONS
  // ==========================================
  const [operations, setOperations] = useState([]);
  const [openOpForm, setOpenOpForm] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);
  const [opName, setOpName] = useState('');
  const [opWcId, setOpWcId] = useState('');
  const [opSetup, setOpSetup] = useState(15);
  const [opRun, setOpRun] = useState(30);
  const [opSeq, setOpSeq] = useState(1);
  const [opError, setOpError] = useState('');


  // ==========================================
  // DATA FETCHING
  // ==========================================
  
  const fetchMOs = async () => {
    try {
      const query = new URLSearchParams({
        page: moPage + 1,
        limit: moRowsPerPage,
        search: moSearch
      });
      if (moStatus) query.append('status', moStatus);
      const res = await fetch(`http://localhost:5000/api/manufacturing-orders/orders?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMoList(data.data || []);
      setMoTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkCenters = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/manufacturing-orders/work-centers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWcs(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOperations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/manufacturing-orders/operations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setOperations(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDependencies = async () => {
    try {
      const prodRes = await fetch('http://localhost:5000/api/products?limit=10000&isFinished=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const prodData = await prodRes.json();
      setFinishedProducts(prodData.data || []);

      const bomRes = await fetch('http://localhost:5000/api/boms?limit=10000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bomData = await bomRes.json();
      setBoms(bomData.data || []);
      
      setDependenciesVersion(prev => prev + 1); // Increment version to force re-render
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (topTab === 0) {
      fetchMOs();
      fetchDependencies();
    } else if (topTab === 1) {
      fetchWorkCenters();
    } else if (topTab === 2) {
      fetchOperations();
      fetchWorkCenters();
    }
  }, [topTab, moPage, moRowsPerPage, moStatus]);

  const handleMoSearch = (e) => {
    e.preventDefault();
    setMoPage(0);
    fetchMOs();
  };

  // ==========================================
  // ACTIONS: MANUFACTURING ORDERS
  // ==========================================

  const handleOpenMoCreate = () => {
    setMoProductId('');
    setMoBomId('');
    setMoQuantity(1);
    setMoFormError('');
  };

  const handleOpenMoCreateWithRefresh = async () => {
    await fetchDependencies(); // Refresh dropdown data before opening
    handleOpenMoCreate();
    setOpenMoForm(true);
  };

  const handleProductChange = (val) => {
    setMoProductId(val);
    // Auto-select first matching BOM for product
    const matchingBom = boms.find(b => b.productId === val);
    if (matchingBom) {
      setMoBomId(matchingBom.id);
    } else {
      setMoBomId('');
    }
  };

  const handleSaveMO = async () => {
    if (!moProductId || !moBomId || !moQuantity) {
      setMoFormError('Product, BOM, and Quantity are required.');
      return;
    }

    try {
      setMoFormError('');
      const res = await fetch('http://localhost:5000/api/manufacturing-orders/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: moProductId, bomId: moBomId, quantity: moQuantity })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Create MO failed.');
      
      setOpenMoForm(false);
      await fetchMOs();
    } catch (err) {
      setMoFormError(err.message);
    }
  };

  const handleOpenMoDetails = async (mo) => {
    try {
      setSelectedMo(mo);
      setMoDetailTab(0);
      setOpenMoDetails(true);
      const res = await fetch(`http://localhost:5000/api/manufacturing-orders/orders/${mo.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const details = await res.json();
      setSelectedMoDetails(details);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMoStatus = async (moId, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/manufacturing-orders/orders/${moId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Status update failed.');
      await fetchMOs();
      if (openMoDetails && selectedMo?.id === moId) {
        const detailsRes = await fetch(`http://localhost:5000/api/manufacturing-orders/orders/${moId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const detailsData = await detailsRes.json();
        setSelectedMoDetails(detailsData);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteClick = (id, type) => {
    setDeleteId(id);
    setConfirmType(type);
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      let url = '';
      if (confirmType === 'MO') {
        url = `http://localhost:5000/api/manufacturing-orders/orders/${deleteId}`;
      } else if (confirmType === 'WC') {
        url = `http://localhost:5000/api/manufacturing-orders/work-centers/${deleteId}`;
      } else if (confirmType === 'OP') {
        url = `http://localhost:5000/api/manufacturing-orders/operations/${deleteId}`;
      }
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed.');
      setOpenConfirmDialog(false);
      if (confirmType === 'MO') await fetchMOs();
      else if (confirmType === 'WC') await fetchWorkCenters();
      else if (confirmType === 'OP') await fetchOperations();
    } catch (err) {
      alert(err.message);
    }
  };

  // ==========================================
  // ACTIONS: WORK CENTERS
  // ==========================================

  const handleOpenWcCreate = () => {
    setSelectedWc(null);
    setWcName('');
    setWcCode('');
    setWcCapacity(1);
    setWcCost(50);
    setWcError('');
    setOpenWcForm(true);
  };

  const handleOpenWcEdit = (wc) => {
    setSelectedWc(wc);
    setWcName(wc.name);
    setWcCode(wc.code);
    setWcCapacity(wc.capacity);
    setWcCost(wc.hourlyCost);
    setWcError('');
    setOpenWcForm(true);
  };

  const handleSaveWc = async () => {
    if (!wcName || !wcCode) {
      setWcError('Name and Code are required.');
      return;
    }
    try {
      setWcError('');
      const url = selectedWc 
        ? `http://localhost:5000/api/manufacturing-orders/work-centers/${selectedWc.id}`
        : 'http://localhost:5000/api/manufacturing-orders/work-centers';
      const method = selectedWc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: wcName, code: wcCode, capacity: wcCapacity, hourlyCost: wcCost })
      });
      if (!res.ok) throw new Error('Operation failed.');
      setOpenWcForm(false);
      fetchWorkCenters();
    } catch (err) {
      setWcError(err.message);
    }
  };

  // ==========================================
  // ACTIONS: OPERATIONS
  // ==========================================

  const handleOpenOpCreate = () => {
    setSelectedOp(null);
    setOpName('');
    setOpWcId(wcs[0]?.id || '');
    setOpSetup(15);
    setOpRun(30);
    setOpSeq(1);
    setOpError('');
    setOpenOpForm(true);
  };

  const handleOpenOpEdit = (op) => {
    setSelectedOp(op);
    setOpName(op.name);
    setOpWcId(op.workCenterId);
    setOpSetup(op.setupTime);
    setOpRun(op.runTime);
    setOpSeq(op.sequence);
    setOpError('');
    setOpenOpForm(true);
  };

  const handleSaveOp = async () => {
    if (!opName || !opWcId) {
      setOpError('Name and Work Center are required.');
      return;
    }
    try {
      setOpError('');
      const url = selectedOp
        ? `http://localhost:5000/api/manufacturing-orders/operations/${selectedOp.id}`
        : 'http://localhost:5000/api/manufacturing-orders/operations';
      const method = selectedOp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: opName, workCenterId: opWcId, setupTime: opSetup, runTime: opRun, sequence: opSeq })
      });
      if (!res.ok) throw new Error('Operation failed.');
      setOpenOpForm(false);
      fetchOperations();
    } catch (err) {
      setOpError(err.message);
    }
  };


  // ==========================================
  // HELPERS
  // ==========================================

  const getStatusChipColor = (status) => {
    const s = String(status).toUpperCase();
    if (s === 'PRODUCTS_RECEIVED') return 'success';
    if (s === 'COMPLETED') return 'info';
    if (s === 'IN_PROGRESS') return 'warning';
    if (s === 'CONFIRMED') return 'primary';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Top level tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={topTab} onChange={(e, newVal) => setTopTab(newVal)}>
          <Tab label="Manufacturing Orders" />
          <Tab label="Work Centers" />
          <Tab label="Operations Routing" />
        </Tabs>
      </Box>

      {/* ==========================================
          TAB 0: MANUFACTURING ORDERS LIST
          ========================================== */}
      {topTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: '12px' }}>
              <form onSubmit={handleMoSearch}>
                <TextField
                  size="small"
                  placeholder="Search MO or product..."
                  value={moSearch}
                  onChange={(e) => setMoSearch(e.target.value)}
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
                  value={moStatus}
                  label="Status"
                  onChange={(e) => setMoStatus(e.target.value)}
                >
                  <MenuItem value=""><em>All Orders</em></MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="PRODUCTS_RECEIVED">Received</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {user && ['ADMIN', 'MANUFACTURING'].includes(user.role) && (
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={handleOpenMoCreateWithRefresh}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                Create MO
              </Button>
            )}
          </Box>

          <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <TableContainer>
              <Table sx={{ minWidth: 600 }} stickyHeader>
                <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>MO Number</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Finished Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Yield BOM</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Target Qty</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Workflow Actions' : 'Progress'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">{canWrite ? 'Actions' : 'Details'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {moList.map((mo) => (
                    <TableRow key={mo.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{mo.moNumber}</TableCell>
                      <TableCell>{mo.product?.name}</TableCell>
                      <TableCell>{mo.bom?.name}</TableCell>
                      <TableCell align="right">{mo.quantity}</TableCell>
                      <TableCell>
                        <Chip label={mo.status} size="small" color={getStatusChipColor(mo.status)} variant="outlined" sx={{ fontSize: 11, fontWeight: 600, height: 22 }} />
                      </TableCell>
                      <TableCell align="center">
                         {/* MANUFACTURING actions */}
                         {user && user.role === 'MANUFACTURING' && (
                           <>
                             {mo.status === 'DRAFT' && (
                               <Button size="small" variant="contained" color="primary" startIcon={<Check size={14} />} onClick={() => handleUpdateMoStatus(mo.id, 'CONFIRMED')} sx={{ textTransform: 'none', fontSize: 11, py: 0.25 }}>
                                 Accept Order
                               </Button>
                             )}
                             {(mo.status === 'CONFIRMED' || mo.status === 'IN_PROGRESS') && (
                               <Button size="small" variant="contained" color="success" startIcon={<CheckCircle size={14} />} onClick={() => handleUpdateMoStatus(mo.id, 'COMPLETED')} sx={{ textTransform: 'none', fontSize: 11, py: 0.25 }}>
                                 Mark Completed
                               </Button>
                             )}
                             {mo.status === 'COMPLETED' && (
                               <Typography variant="caption" color="text.secondary">Awaiting Admin Receipt</Typography>
                             )}
                             {mo.status === 'PRODUCTS_RECEIVED' && (
                               <Typography variant="caption" color="success.main" fontWeight="600">Completed & Received</Typography>
                             )}
                             {mo.status === 'CANCELLED' && (
                               <Typography variant="caption" color="error.main">Cancelled</Typography>
                             )}
                           </>
                         )}

                         {/* ADMIN / OWNER actions */}
                         {user && (user.role === 'ADMIN' || user.role === 'OWNER') && (
                           <>
                             {mo.status === 'DRAFT' && (
                               <Typography variant="caption" color="text.secondary">Awaiting Acceptance</Typography>
                             )}
                             {(mo.status === 'CONFIRMED' || mo.status === 'IN_PROGRESS') && (
                               <Typography variant="caption" color="text.secondary">In Production</Typography>
                             )}
                             {mo.status === 'COMPLETED' && (
                               <Button size="small" variant="contained" color="secondary" startIcon={<CheckCircle size={14} />} onClick={() => handleUpdateMoStatus(mo.id, 'PRODUCTS_RECEIVED')} sx={{ textTransform: 'none', fontSize: 11, py: 0.25, fontWeight: 600 }}>
                                 Get Products
                               </Button>
                             )}
                             {mo.status === 'PRODUCTS_RECEIVED' && (
                               <Chip label="Received" size="small" color="success" sx={{ fontSize: 10, height: 20 }} />
                             )}
                             {mo.status === 'CANCELLED' && (
                               <Typography variant="caption" color="error.main">Cancelled</Typography>
                             )}
                           </>
                         )}

                         {/* Other roles */}
                         {user && !['ADMIN', 'OWNER', 'MANUFACTURING'].includes(user.role) && (
                           <Typography variant="caption" color="text.secondary">Read-only</Typography>
                         )}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton color="default" onClick={() => handleOpenMoDetails(mo)} size="small" sx={{ mr: 0.5 }}>
                          <Info size={16} />
                        </IconButton>
                        {user && user.role === 'ADMIN' && (
                          <IconButton color="error" onClick={() => handleDeleteClick(mo.id, 'MO')} size="small" disabled={mo.status === 'COMPLETED' || mo.status === 'PRODUCTS_RECEIVED'}>
                            <Trash2 size={16} />
                          </IconButton>
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
              count={moTotalRows}
              rowsPerPage={moRowsPerPage}
              page={moPage}
              onPageChange={(e, newPage) => setMoPage(newPage)}
              onRowsPerPageChange={(e) => { setMoRowsPerPage(parseInt(e.target.value, 10)); setMoPage(0); }}
            />
          </Paper>
        </Box>
      )}

      {/* ==========================================
          TAB 1: WORK CENTERS LIST
          ========================================== */}
      {topTab === 1 && (
        <Box>
           {canWrite && (
             <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
               <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleOpenWcCreate} sx={{ borderRadius: '8px', textTransform: 'none' }}>
                 Add Work Center
               </Button>
             </Box>
           )}

          <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Daily Capacity</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Hourly Cost (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wcs.map((wc) => (
                    <TableRow key={wc.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{wc.code}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{wc.name}</TableCell>
                      <TableCell align="right">{wc.capacity}</TableCell>
                      <TableCell align="right">₹{wc.hourlyCost}</TableCell>
                      <TableCell align="center">
                         {!canWrite && <Typography variant="caption" color="text.secondary">Read-only</Typography>}
                         {canWrite && (
                           <>
                             <IconButton color="primary" onClick={() => handleOpenWcEdit(wc)} size="small" sx={{ mr: 1 }}>
                               <Edit2 size={16} />
                             </IconButton>
                             <IconButton color="error" onClick={() => handleDeleteClick(wc.id, 'WC')} size="small">
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
          </Paper>
        </Box>
      )}

      {/* ==========================================
          TAB 2: OPERATIONS ROUTING LIST
          ========================================== */}
      {topTab === 2 && (
        <Box>
           {canWrite && (
             <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
               <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleOpenOpCreate} sx={{ borderRadius: '8px', textTransform: 'none' }}>
                 Add Operation Routing
               </Button>
             </Box>
           )}

          <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Seq No</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Operation Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Work Center Location</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Setup Time (mins)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Run Time (mins)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operations.map((op) => (
                    <TableRow key={op.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{op.sequence}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{op.name}</TableCell>
                      <TableCell>{op.workCenter?.name} ({op.workCenter?.code})</TableCell>
                      <TableCell align="right">{op.setupTime}</TableCell>
                      <TableCell align="right">{op.runTime}</TableCell>
                      <TableCell align="center">
                         {!canWrite && <Typography variant="caption" color="text.secondary">Read-only</Typography>}
                         {canWrite && (
                           <>
                             <IconButton color="primary" onClick={() => handleOpenOpEdit(op)} size="small" sx={{ mr: 1 }}>
                               <Edit2 size={16} />
                             </IconButton>
                             <IconButton color="error" onClick={() => handleDeleteClick(op.id, 'OP')} size="small">
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
          </Paper>
        </Box>
      )}


      {/* ==========================================
          MODALS & FORM DIALOGS
          ========================================== */}

      {/* MO CREATE DIALOG */}
      <Dialog open={openMoForm} onClose={() => setOpenMoForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Create Manufacturing Order</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            {moFormError && <Alert severity="error">{moFormError}</Alert>}

            <FormControl fullWidth required>
              <InputLabel>Finished Goods Product</InputLabel>
              <Autocomplete
                key={`product-select-${dependenciesVersion}`}
                options={finishedProducts}
                getOptionLabel={(option) => `${option.name} (${option.sku})`}
                value={finishedProducts.find(p => p.id === moProductId) || null}
                onChange={(e, newValue) => handleProductChange(newValue ? newValue.id : '')}
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
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Bill of Materials (BOM)</InputLabel>
              <Autocomplete
                key={`bom-select-${dependenciesVersion}`}
                options={boms.filter(b => b.productId === moProductId)}
                getOptionLabel={(option) => option.name}
                value={boms.find(b => b.id === moBomId) || null}
                onChange={(e, newValue) => setMoBomId(newValue ? newValue.id : '')}
                renderInput={(params) => (
                  <TextField {...params} label="Bill of Materials (BOM)" required fullWidth />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                disabled={!moProductId}
                filterOptions={(options, { inputValue }) => {
                  const lowerInput = inputValue.toLowerCase();
                  return options.filter(option => 
                    option.name?.toLowerCase().includes(lowerInput)
                  );
                }}
              />
            </FormControl>

            <TextField label="Quantity to Produce" type="number" required fullWidth value={moQuantity} onChange={(e) => setMoQuantity(parseFloat(e.target.value) || 1)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMoForm(false)}>Cancel</Button>
          <Button onClick={handleSaveMO} variant="contained">Create Order</Button>
        </DialogActions>
      </Dialog>

      {/* MO DETAILS DIALOG */}
      <Dialog open={openMoDetails} onClose={() => setOpenMoDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Manufacturing Console: {selectedMo?.moNumber}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={moDetailTab} onChange={(e, newVal) => setMoDetailTab(newVal)}>
              <Tab label="Production Details" />
              <Tab label="Audit Trail" />
            </Tabs>
          </Box>

          {moDetailTab === 0 && selectedMoDetails && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">MO Number:</Typography><Typography fontWeight="600" fontFamily="monospace">{selectedMoDetails.moNumber}</Typography></Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status:</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={selectedMoDetails.status} size="small" color={getStatusChipColor(selectedMoDetails.status)} variant="filled" sx={{ fontWeight: 600 }} />
                  </Box>
                </Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Product Assembly:</Typography><Typography>{selectedMoDetails.product?.name} ({selectedMoDetails.product?.sku})</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Target Quantity:</Typography><Typography fontWeight="600">{selectedMoDetails.quantity} units</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Scheduled Start Date:</Typography><Typography>{selectedMoDetails.startDate ? new Date(selectedMoDetails.startDate).toLocaleString() : 'Not started'}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Completed Date:</Typography><Typography>{selectedMoDetails.endDate ? new Date(selectedMoDetails.endDate).toLocaleString() : 'Not completed'}</Typography></Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1.5 }}>Component Reservation Status:</Typography>

              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Component Product</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Qty per Unit</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Total Required</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Warehouse Stock Available</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedMoDetails.bom?.items.map((item) => {
                      const totalReq = item.quantity * selectedMoDetails.quantity;
                      const hasStock = item.product?.availableQty >= totalReq;
                      return (
                        <TableRow key={item.id}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{item.product?.sku}</TableCell>
                          <TableCell>{item.product?.name}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{totalReq}</TableCell>
                          <TableCell align="right" sx={{ color: hasStock ? 'success.main' : 'error.main', fontWeight: 600 }}>
                            {item.product?.availableQty}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 1.5 }}>Operations Routing & Work Orders:</Typography>

              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Seq</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Operation Step</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Work Center Location</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Work Order Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Recorded Time (mins)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedMoDetails.workOrders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{wo.sequence}</TableCell>
                        <TableCell>{wo.name}</TableCell>
                        <TableCell>{wo.workCenter?.name}</TableCell>
                        <TableCell>
                          <Chip label={wo.status} size="small" color={wo.status === 'COMPLETED' ? 'success' : wo.status === 'IN_PROGRESS' ? 'warning' : 'default'} sx={{ fontSize: 9, height: 18, fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align="right">{wo.duration > 0 ? `${wo.duration} mins` : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {moDetailTab === 1 && selectedMo && (
            <EntityAuditLogs tableName="ManufacturingOrder" recordId={selectedMo.id} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMoDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* WC FORM DIALOG */}
      <Dialog open={openWcForm} onClose={() => setOpenWcForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{selectedWc ? 'Modify Work Center' : 'Add Work Center'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            {wcError && <Alert severity="error">{wcError}</Alert>}
            <TextField label="Code" required fullWidth disabled={!!selectedWc} value={wcCode} onChange={(e) => setWcCode(e.target.value)} placeholder="e.g. WC-ASY" />
            <TextField label="Work Center Name" required fullWidth value={wcName} onChange={(e) => setWcName(e.target.value)} placeholder="e.g. Primary Assembly Room" />
            <TextField label="Daily Capacity" type="number" fullWidth value={wcCapacity} onChange={(e) => setWcCapacity(parseFloat(e.target.value) || 1)} />
            <TextField label="Hourly Cost (₹)" type="number" fullWidth value={wcCost} onChange={(e) => setWcCost(parseFloat(e.target.value) || 0)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWcForm(false)}>Cancel</Button>
          <Button onClick={handleSaveWc} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* OP FORM DIALOG */}
      <Dialog open={openOpForm} onClose={() => setOpenOpForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{selectedOp ? 'Modify Operation' : 'Add Operation Routing'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            {opError && <Alert severity="error">{opError}</Alert>}
            <TextField label="Operation Step Name" required fullWidth value={opName} onChange={(e) => setOpName(e.target.value)} placeholder="e.g. Frame Polishing" />
            <FormControl fullWidth required>
              <InputLabel>Work Center Location</InputLabel>
              <Select value={opWcId} label="Work Center Location" onChange={(e) => setOpWcId(e.target.value)}>
                {wcs.map(w => (
                  <MenuItem key={w.id} value={w.id}>{w.name} ({w.code})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Setup Time (mins)" type="number" fullWidth value={opSetup} onChange={(e) => setOpSetup(parseFloat(e.target.value) || 0)} />
            <TextField label="Run Time (mins)" type="number" fullWidth value={opRun} onChange={(e) => setOpRun(parseFloat(e.target.value) || 0)} />
            <TextField label="Sequence Order" type="number" fullWidth value={opSeq} onChange={(e) => setOpSeq(parseInt(e.target.value) || 1)} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenOpForm(false)}>Cancel</Button>
          <Button onClick={handleSaveOp} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this manufacturing record? This action cannot be undone.</Typography>
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

export default ManufacturingOrders;
