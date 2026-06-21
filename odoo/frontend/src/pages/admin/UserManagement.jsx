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
  Chip,
  Grid,
  Alert
} from '@mui/material';
import { Edit2, Plus, Trash2, Search } from 'lucide-react';

const UserManagement = () => {
  const { token, user: currentUser } = useSelector((state) => state.auth);

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [search, setSearch] = useState('');

  // Modals state
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('SALES');
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    try {
      const query = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        search
      });
      const response = await fetch(`http://localhost:5000/api/users?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.data || []);
      setTotalRows(data.meta?.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('SALES');
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleOpenEdit = (user) => {
    setFormMode('edit');
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // leave blank unless changing
    setRole(user.role);
    setFormError('');
    setOpenFormDialog(true);
  };

  const handleSaveUser = async () => {
    if (!name || !email || (formMode === 'create' && !password)) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      setFormError('');
      const url = formMode === 'create' 
        ? 'http://localhost:5000/api/users' 
        : `http://localhost:5000/api/users/${selectedUser.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';
      
      const payload = { name, email, role };
      if (password) payload.password = password;

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
      await fetchUsers();
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
      const response = await fetch(`http://localhost:5000/api/users/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Delete failed.');
      }
      setOpenConfirmDialog(false);
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header and Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <TextField
            size="small"
            placeholder="Search by name, email..."
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

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
        >
          Create User
        </Button>
      </Box>

      {/* Users Table */}
      <Paper sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: '#f3f4f6' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created At</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      size="small"
                      color={
                        u.role === 'ADMIN' ? 'error' : 
                        u.role === 'OWNER' ? 'secondary' : 
                        u.role === 'SALES' ? 'success' : 
                        u.role === 'PURCHASE' ? 'primary' : 
                        'default'
                      }
                      sx={{ fontSize: 11, fontWeight: 600, height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => handleOpenEdit(u)} size="small" sx={{ mr: 1 }}>
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDeleteClick(u.id)} 
                      disabled={u.id === currentUser?.id}
                      size="small"
                    >
                      <Trash2 size={16} />
                    </IconButton>
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

      {/* User Form Dialog */}
      <Dialog open={openFormDialog} onClose={() => setOpenFormDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {formMode === 'create' ? 'Create New User' : 'Edit User Settings'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              label="Full Name"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <TextField
              label="Email Address"
              required
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label={formMode === 'create' ? 'Password' : 'New Password (Optional)'}
              required={formMode === 'create'}
              fullWidth
              type="password"
              placeholder={formMode === 'edit' ? 'Leave blank to keep same' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Role Assignment</InputLabel>
              <Select
                value={role}
                label="Role Assignment"
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="ADMIN">Admin (Full Access)</MenuItem>
                <MenuItem value="OWNER">Business Owner (Monitor)</MenuItem>
                <MenuItem value="SALES">Sales User (Sales/Clients)</MenuItem>
                <MenuItem value="PURCHASE">Purchase User (Vendors/Procure)</MenuItem>
                <MenuItem value="MANUFACTURING">Manufacturing User (Ops/MO)</MenuItem>
                <MenuItem value="INVENTORY">Inventory Manager (Stock/Ledger)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFormDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this user? This action cannot be undone.</Typography>
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

export default UserManagement;
