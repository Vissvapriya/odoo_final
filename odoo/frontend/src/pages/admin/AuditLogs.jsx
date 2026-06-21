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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid
} from '@mui/material';
import { Eye, Search } from 'lucide-react';

const AuditLogs = () => {
  const { token } = useSelector((state) => state.auth);

  // Table state
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [totalRows, setTotalRows] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [tableName, setTableName] = useState('');
  const [recordId, setRecordId] = useState('');

  // Dialog state (Diff viewer)
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search,
        action,
        tableName,
        recordId
      });

      const response = await fetch(`http://localhost:5000/api/audit-logs?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLogs(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (error) {
      console.error('Fetch logs error:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage, action, tableName, recordId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDiff = (log) => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  const renderJsonPretty = (val) => {
    if (!val) return <Typography variant="body2" color="text.secondary" fontStyle="italic">No data</Typography>;
    return (
      <Box component="pre" sx={{ bgcolor: '#0f172a', color: '#38bdf8', p: 2, borderRadius: '8px', overflowX: 'auto', fontSize: 12, lineHeight: 1.5, maxHeight: 350 }}>
        {JSON.stringify(val, null, 2)}
      </Box>
    );
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Filters & Search Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <form onSubmit={handleSearchSubmit}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Global Search"
                placeholder="SKU, IDs, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton type="submit" size="small">
                      <Search size={18} />
                    </IconButton>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={2.5}>
              <FormControl fullWidth>
                <InputLabel>Module (Table)</InputLabel>
                <Select
                  value={tableName}
                  label="Module (Table)"
                  onChange={(e) => { setTableName(e.target.value); setPage(0); }}
                >
                  <MenuItem value=""><em>All Modules</em></MenuItem>
                  <MenuItem value="User">User Management</MenuItem>
                  <MenuItem value="Product">Products</MenuItem>
                  <MenuItem value="Vendor">Vendors</MenuItem>
                  <MenuItem value="BOM">Bill of Materials</MenuItem>
                  <MenuItem value="SalesOrder">Sales Orders</MenuItem>
                  <MenuItem value="PurchaseOrder">Purchase Orders</MenuItem>
                  <MenuItem value="ManufacturingOrder">Manufacturing Orders</MenuItem>
                  <MenuItem value="WorkCenter">Work Centers</MenuItem>
                  <MenuItem value="Operation">Operations</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={2}>
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  value={action}
                  label="Action"
                  onChange={(e) => { setAction(e.target.value); setPage(0); }}
                >
                  <MenuItem value=""><em>All Actions</em></MenuItem>
                  <MenuItem value="CREATE">CREATE</MenuItem>
                  <MenuItem value="UPDATE">UPDATE</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3.5}>
              <TextField
                fullWidth
                label="Filter by Record ID"
                placeholder="Paste UUID..."
                value={recordId}
                onChange={(e) => { setRecordId(e.target.value); setPage(0); }}
              />
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Main Table */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Module</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Record ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontSize: 13 }}>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{log.user?.name || 'System'}</TableCell>
                    <TableCell>
                      <Chip label={log.user?.role || 'SYSTEM'} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: 'text.secondary' }}>{log.tableName}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{log.recordId}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        color={log.action === 'CREATE' ? 'success' : log.action === 'UPDATE' ? 'info' : 'error'}
                        sx={{ fontSize: 10, fontWeight: 600, height: 20 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => handleViewDiff(log)} color="primary" size="small">
                        <Eye size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No logs found matching filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 15, 25, 50]}
          component="div"
          count={totalRows}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Diff Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Audit Log Details</Typography>
            <Typography variant="caption" color="text.secondary">
              Record: {selectedLog?.tableName} ({selectedLog?.recordId}) • Action: {selectedLog?.action}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>Old Value (Before):</Typography>
              {renderJsonPretty(selectedLog?.oldValue)}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>New Value (After):</Typography>
              {renderJsonPretty(selectedLog?.newValue)}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditLogs;
