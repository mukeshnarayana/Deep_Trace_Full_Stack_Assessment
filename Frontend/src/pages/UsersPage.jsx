import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Search,
  Edit,
  Mail,
  Lock,
  Trash2,
} from 'lucide-react';
import { usersApi } from '../api/usersApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { useQueryParams } from '../hooks/useQueryParams';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDateTime } from '../utils/formatters';

export const UsersPage = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { success, error: showToastError } = useToast();

  const { params, setParams } = useQueryParams({
    page: 1,
    limit: 10,
    search: '',
  });

  const [usersList, setUsersList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Search input state with debounce
  const [searchInput, setSearchInput] = useState(params.search || '');
  const debouncedSearch = useDebounce(searchInput, 400);

  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (debouncedSearch !== (params.search || '')) {
      setParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, params.search, setParams]);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const query = {
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
        };
        if (params.search) query.search = params.search;

        const response = await usersApi.getUsers(query);
        if (isMounted && response?.data) {
          setUsersList(response.data);
          setPagination({
            page: response.page || 1,
            limit: response.limit || 10,
            total: response.total || 0,
            totalPages: response.totalPages || 1,
          });
        }
      } catch (err) {
        if (isMounted) {
          showToastError(err.message || 'Failed to load organization users.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [params.page, params.limit, params.search, refreshKey, showToastError]);

  // Create User Modal (ADMIN only)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [isCreating, setIsCreating] = useState(false);

  // Edit User Modal (ADMIN only)
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('USER');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Deactivate / Delete User Dialog
  const [userToDeactivate, setUserToDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Open Create Modal
  const handleOpenCreate = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('USER');
    setIsCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      showToastError('Name, email, and password are required.');
      return;
    }

    try {
      setIsCreating(true);
      // NEVER send tenantId!
      await usersApi.createUser({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
      });
      success(`User ${newName} created successfully.`);
      setIsCreateModalOpen(false);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to create user.');
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditRole(user.role || 'USER');
    setEditIsActive(user.isActive !== false);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsUpdating(true);
      // NEVER send tenantId!
      await usersApi.updateUser(editingUser._id || editingUser.id, {
        name: editName.trim(),
        role: editRole,
        isActive: editIsActive,
      });
      success('User profile updated successfully.');
      setEditingUser(null);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to update user.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Deactivate User
  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;
    try {
      setIsDeactivating(true);
      await usersApi.deleteUser(userToDeactivate._id || userToDeactivate.id);
      success(`User account for ${userToDeactivate.name} deactivated.`);
      setUserToDeactivate(null);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Cannot deactivate user (last admin protection active).');
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns = [
    {
      header: 'Name & Email',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{row.name}</span>
          <span className="text-xs text-gray-500 block">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      key: 'role',
      width: '130px',
      render: (row) => <Badge variant={row.role}>{row.role}</Badge>,
    },
    {
      header: 'Account Status',
      key: 'status',
      width: '130px',
      render: (row) => (
        <Badge variant={row.isActive ? 'ACTIVE_USER' : 'DEACTIVATED'}>
          {row.isActive ? 'Active' : 'Deactivated'}
        </Badge>
      ),
    },
    {
      header: 'Enrolled On',
      key: 'createdAt',
      render: (row) => (
        <span className="text-xs text-gray-500">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      headerClassName: 'text-right',
      render: (row) => {
        if (!isAdmin) {
          return (
            <span className="text-xs text-gray-400 italic">View Only</span>
          );
        }

        const isSelf = (row._id || row.id) === currentUser?.id;

        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              title="Edit Role & Status"
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>

            {row.isActive && !isSelf && (
              <button
                type="button"
                onClick={() => setUserToDeactivate(row)}
                title="Deactivate Account"
                className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Tenant Users Directory
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage organization members, assign security roles, and enforce session lifecycles.
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={UserPlus}
          >
            Add Member
          </Button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            id="user-search"
            placeholder="Search by name or email..."
            icon={Search}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="text-xs text-gray-500">
          Role-enforced visibility: <span className="font-semibold text-gray-700">{currentUser?.role}</span>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={usersList}
        isLoading={isLoading}
        emptyTitle="No organization users found"
        emptyDescription={
          params.search ? 'No users match your search query.' : 'No users in this organization.'
        }
        emptyActionLabel={isAdmin ? 'Add First User' : undefined}
        onEmptyAction={isAdmin ? handleOpenCreate : undefined}
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={(newPage) => setParams({ page: newPage })}
        onLimitChange={(newLimit) => setParams({ limit: newLimit, page: 1 })}
      />

      {/* ADD USER MODAL (ADMIN ONLY) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Organization User"
        subtitle="Add a new member to your tenant organization"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSubmit}
              isLoading={isCreating}
              disabled={isCreating}
            >
              Create User
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Full Name"
            id="newName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Alice Smith"
            required
          />

          <Input
            label="Email Address"
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="e.g. alice@acmebank.com"
            icon={Mail}
            required
          />

          <Input
            label="Initial Password"
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            icon={Lock}
            required
          />

          <Select
            label="Role Assignment"
            id="newRole"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={[
              { value: 'USER', label: 'USER (Read-only assigned campaigns & events)' },
              { value: 'MANAGER', label: 'MANAGER (Campaigns & Events CRUD, View Users)' },
              { value: 'ADMIN', label: 'ADMIN (Full Tenant Control, User CRUD, Audit)' },
            ]}
          />
        </form>
      </Modal>

      {/* EDIT USER MODAL (ADMIN ONLY) */}
      {editingUser && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title="Update User Privileges"
          subtitle={`Editing: ${editingUser.name} (${editingUser.email})`}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEditSubmit}
                isLoading={isUpdating}
                disabled={isUpdating}
              >
                Save Changes
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Input
              label="Full Name"
              id="editName"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <Select
              label="Role Assignment"
              id="editRole"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              options={[
                { value: 'USER', label: 'USER' },
                { value: 'MANAGER', label: 'MANAGER' },
                { value: 'ADMIN', label: 'ADMIN' },
              ]}
              helperText="Note: Backend prevents demoting the last active administrator."
            />

            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-medium">Account is Active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 pl-6">
                Deactivating immediately revokes all active JWT tokens for this user.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!userToDeactivate}
        onClose={() => setUserToDeactivate(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate User Account"
        message={`Are you sure you want to deactivate ${userToDeactivate?.name}'s account? The user will immediately be logged out and unable to access the platform.`}
        confirmText="Deactivate User"
        confirmVariant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
};

export default UsersPage;
