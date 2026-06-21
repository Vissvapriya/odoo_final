import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid
} from '@mui/material';
import { Eye } from 'lucide-react';

const EntityAuditLogs = ({ tableName, recordId }) => {
  const { token } = useSelector((state) => state.auth);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchEntityLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/audit-logs?tableName=${tableName}&recordId=${recordId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setLogs(data.data || []);
      } catch (err) {
        console.error('Fetch entity logs error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tableName && recordId) {
      fetchEntityLogs();
    }
  }, [tableName, recordId, token]);

  const handleOpenDiff = (log) => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  const renderJsonPretty = (val) => {
    if (!val) return <Typography variant="body2" color="text.secondary" fontStyle="italic">No data</Typography>;
    return (
      <Box component="pre" sx={{ bgcolor: '#0f172a', color: '#38bdf8', p: 2, borderRadius: '8px', overflowX: 'auto', fontSize: 11, maxHeight: 300 }}>
        {JSON.stringify(val, null, 2)}
      </Box>
    );
  };

  if (loading) return <Typography variant="body2" color="text.secondary">Loading log history...</Typography>;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="subtitle2" fontWeight="600" color="text.secondary" sx={{ mb: 2 }}>
        Change History Logs for this {tableName}
      </Typography>

      {logs.length > 0 ? (
        <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ fontSize: 12 }}>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{log.user?.name || 'System'}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.action}
                      size="small"
                      color={log.action === 'CREATE' ? 'success' : log.action === 'UPDATE' ? 'info' : 'error'}
                      sx={{ fontSize: 9, height: 18, fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDiff(log)} color="primary">
                      <Eye size={14} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No audit logs recorded for this record yet.
        </Typography>
      )}

      {/* Difference Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: 16 }}>
          Historical Change Details
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight="bold">Before Changes:</Typography>
              {renderJsonPretty(selectedLog?.oldValue)}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" fontWeight="bold">After Changes:</Typography>
              {renderJsonPretty(selectedLog?.newValue)}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntityAuditLogs;
