import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Users as UsersIcon,
  Trash2,
  Edit,
  Eye,
  UserCheck,
  UserX,
} from 'lucide-react';
import { campaignsApi } from '../api/campaignsApi';
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
import {
  CAMPAIGN_TRANSITIONS,
} from '../utils/constants';
import { formatDateOnly, toDateTimeLocalInput, formatDateTime } from '../utils/formatters';

export const CampaignsPage = () => {
  const { isAdmin, isManager } = useAuth();
  const { success, error: showToastError } = useToast();

  const canCreateOrEdit = isAdmin || isManager;
  const canDelete = isAdmin;

  // URL query params synchronization
  const { params, setParams } = useQueryParams({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

  // Search input state with debounce
  const [searchInput, setSearchInput] = useState(params.search || '');
  const debouncedSearch = useDebounce(searchInput, 400);

  // Sync debounced search to URL params
  useEffect(() => {
    if (debouncedSearch !== (params.search || '')) {
      setParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, params.search, setParams]);

  // Fetch campaigns from backend API
  useEffect(() => {
    let isMounted = true;

    const loadCampaigns = async () => {
      try {
        setIsLoading(true);
        const query = {
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
          sortBy: params.sortBy || 'createdAt',
          sortOrder: params.sortOrder || 'desc',
        };
        if (params.search) query.search = params.search;
        if (params.status) query.status = params.status;

        const response = await campaignsApi.getCampaigns(query);
        if (isMounted && response?.data) {
          setCampaigns(response.data);
          setPagination({
            page: response.page || 1,
            limit: response.limit || 10,
            total: response.total || 0,
            totalPages: response.totalPages || 1,
          });
        }
      } catch (err) {
        if (isMounted) {
          showToastError(err.message || 'Failed to fetch campaigns.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCampaigns();

    return () => {
      isMounted = false;
    };
  }, [
    params.page,
    params.limit,
    params.search,
    params.status,
    params.sortBy,
    params.sortOrder,
    refreshKey,
    showToastError,
  ]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('DRAFT');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  // Details Modal
  const [viewingCampaign, setViewingCampaign] = useState(null);

  // User Assignment Modal
  const [assigningCampaign, setAssigningCampaign] = useState(null);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isAssigningLoading, setIsAssigningLoading] = useState(false);

  // Delete confirmation
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCampaign(null);
    setFormName('');
    setFormDescription('');
    setFormStatus('DRAFT');

    const now = new Date();
    const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    setFormStartDate(toDateTimeLocalInput(now.toISOString()));
    setFormEndDate(toDateTimeLocalInput(future.toISOString()));

    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormName(campaign.name || '');
    setFormDescription(campaign.description || '');
    setFormStatus(campaign.status || 'DRAFT');
    setFormStartDate(toDateTimeLocalInput(campaign.startDate));
    setFormEndDate(toDateTimeLocalInput(campaign.endDate));
    setIsFormModalOpen(true);
  };

  // Save (Create or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToastError('Campaign name is required.');
      return;
    }
    if (!formStartDate || !formEndDate) {
      showToastError('Both start and end dates are required.');
      return;
    }
    if (new Date(formEndDate) < new Date(formStartDate)) {
      showToastError('End date cannot be earlier than start date.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCampaign) {
        // Edit
        await campaignsApi.updateCampaign(editingCampaign._id || editingCampaign.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
          startDate: new Date(formStartDate).toISOString(),
          endDate: new Date(formEndDate).toISOString(),
        });
        success('Campaign updated successfully.');
      } else {
        // Create
        await campaignsApi.createCampaign({
          name: formName.trim(),
          description: formDescription.trim(),
          status: formStatus,
          startDate: new Date(formStartDate).toISOString(),
          endDate: new Date(formEndDate).toISOString(),
        });
        success('Campaign created successfully.');
      }
      setIsFormModalOpen(false);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;
    try {
      setIsDeleting(true);
      await campaignsApi.deleteCampaign(campaignToDelete._id || campaignToDelete.id);
      success(`Campaign "${campaignToDelete.name}" deleted.`);
      setCampaignToDelete(null);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to delete campaign.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load tenant users for assignment modal
  const handleOpenAssignModal = async (campaign) => {
    setAssigningCampaign(campaign);
    setSelectedUserId('');
    try {
      // Only Admin and Manager can fetch users list
      if (isAdmin || isManager) {
        const res = await usersApi.getUsers({ limit: 100 });
        if (res?.data) {
          setTenantUsers(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to load users for assignment:', err);
    }
  };

  // Assign user to campaign
  const handleAssignUser = async () => {
    if (!selectedUserId || !assigningCampaign) return;
    try {
      setIsAssigningLoading(true);
      const campaignId = assigningCampaign._id || assigningCampaign.id;
      const updated = await campaignsApi.assignUser(campaignId, selectedUserId);
      success('User assigned to campaign.');
      setSelectedUserId('');
      setAssigningCampaign(updated);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to assign user.');
    } finally {
      setIsAssigningLoading(false);
    }
  };

  // Remove user from campaign
  const handleRemoveUser = async (userId) => {
    if (!assigningCampaign) return;
    try {
      setIsAssigningLoading(true);
      const campaignId = assigningCampaign._id || assigningCampaign.id;
      const updated = await campaignsApi.removeUser(campaignId, userId);
      success('User removed from campaign.');
      setAssigningCampaign(updated);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to remove user.');
    } finally {
      setIsAssigningLoading(false);
    }
  };

  // Allowed status options when editing based on VALID_TRANSITIONS
  const allowedStatusOptions = useMemo(() => {
    if (!editingCampaign) {
      // On create, backend allows DRAFT or ACTIVE (default DRAFT)
      return [
        { value: 'DRAFT', label: 'DRAFT' },
        { value: 'ACTIVE', label: 'ACTIVE' },
      ];
    }

    const currentStatus = editingCampaign.status;
    const allowedNext = CAMPAIGN_TRANSITIONS[currentStatus] || [];

    // Current status is always a valid selection (unchanged)
    const options = [{ value: currentStatus, label: `${currentStatus} (Current)` }];

    // Add only allowed target states
    allowedNext.forEach((st) => {
      options.push({ value: st, label: `Transition to ${st}` });
    });

    return options;
  }, [editingCampaign]);

  // Columns definition for Table
  const columns = [
    {
      header: 'Campaign Name',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block">{row.name}</span>
          {row.description && (
            <span className="text-xs text-gray-500 block truncate max-w-xs">
              {row.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      width: '120px',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Schedule',
      key: 'schedule',
      render: (row) => (
        <div className="text-xs text-gray-600 whitespace-nowrap">
          <div>{formatDateOnly(row.startDate)}</div>
          <div className="text-gray-400">to {formatDateOnly(row.endDate)}</div>
        </div>
      ),
    },
    {
      header: 'Assigned Users',
      key: 'assignedUsers',
      render: (row) => {
        const count = Array.isArray(row.assignedUsers) ? row.assignedUsers.length : 0;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
            <UsersIcon className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">{count} users</span>
          </span>
        );
      },
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (row) => (
        <span className="text-xs text-gray-600">{row.createdBy?.name || 'System'}</span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewingCampaign(row)}
            title="View Details"
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Assign Users (Admin/Manager) */}
          {canCreateOrEdit && (
            <button
              type="button"
              onClick={() => handleOpenAssignModal(row)}
              title="Assign / Remove Users"
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          )}

          {/* Edit (Admin/Manager) */}
          {canCreateOrEdit && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              title="Edit Campaign"
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {/* Delete (Admin only) */}
          {canDelete && (
            <button
              type="button"
              onClick={() => setCampaignToDelete(row)}
              title="Delete Campaign"
              className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Security Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Configure security drills, phishing simulations, and training workflows.
          </p>
        </div>

        {canCreateOrEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={Plus}
          >
            New Campaign
          </Button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            id="campaign-search"
            placeholder="Search campaigns..."
            icon={Search}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Status Filter & Sort */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            id="status-filter"
            value={params.status || ''}
            onChange={(e) => setParams({ status: e.target.value, page: 1 })}
            wrapperClassName="w-full sm:w-44"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />

          <Select
            id="sort-order"
            value={`${params.sortBy || 'createdAt'}-${params.sortOrder || 'desc'}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              setParams({ sortBy: sb, sortOrder: so, page: 1 });
            }}
            wrapperClassName="w-full sm:w-44"
            options={[
              { value: 'createdAt-desc', label: 'Newest First' },
              { value: 'createdAt-asc', label: 'Oldest First' },
              { value: 'name-asc', label: 'Name (A-Z)' },
              { value: 'name-desc', label: 'Name (Z-A)' },
              { value: 'startDate-desc', label: 'Start Date' },
            ]}
          />
        </div>
      </div>

      {/* Campaigns Table */}
      <Table
        columns={columns}
        data={campaigns}
        isLoading={isLoading}
        emptyTitle="No campaigns found"
        emptyDescription={
          params.search || params.status
            ? 'No campaigns match your filters. Try clearing your search or status filter.'
            : 'No campaigns created yet.'
        }
        emptyActionLabel={canCreateOrEdit ? 'Create First Campaign' : undefined}
        onEmptyAction={canCreateOrEdit ? handleOpenCreate : undefined}
      />

      {/* Server-Side Pagination */}
      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        totalPages={pagination.totalPages}
        onPageChange={(newPage) => setParams({ page: newPage })}
        onLimitChange={(newLimit) => setParams({ limit: newLimit, page: 1 })}
      />

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCampaign ? 'Edit Campaign' : 'Create Security Campaign'}
        subtitle={
          editingCampaign
            ? `ID: ${editingCampaign._id || editingCampaign.id}`
            : 'Initialize a new tenant security campaign'
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFormSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {editingCampaign ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Campaign Name"
            id="formName"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Q3 Enterprise Phishing Drill"
            required
          />

          <div>
            <label
              htmlFor="formDescription"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="formDescription"
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Detail the objectives and training expectations..."
              className="block w-full rounded-lg text-sm border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
          </div>

          {/* Status selector (Respecting valid transitions) */}
          <Select
            label="Lifecycle Status"
            id="formStatus"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
            options={allowedStatusOptions}
            helperText={
              editingCampaign && (CAMPAIGN_TRANSITIONS[editingCampaign.status] || []).length === 0
                ? `Terminal status: no further transitions permitted from ${editingCampaign.status}.`
                : 'Status transitions follow the enforced backend state machine.'
            }
            disabled={
              editingCampaign && (CAMPAIGN_TRANSITIONS[editingCampaign.status] || []).length === 0
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              id="formStartDate"
              type="datetime-local"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              required
            />

            <Input
              label="End Date"
              id="formEndDate"
              type="datetime-local"
              value={formEndDate}
              onChange={(e) => setFormEndDate(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      {viewingCampaign && (
        <Modal
          isOpen={!!viewingCampaign}
          onClose={() => setViewingCampaign(null)}
          title="Campaign Details"
          subtitle={viewingCampaign.name}
          footer={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingCampaign(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Status</span>
              <Badge variant={viewingCampaign.status}>{viewingCampaign.status}</Badge>
            </div>

            <div>
              <span className="text-gray-500 font-medium block mb-1">Description</span>
              <p className="p-3 bg-gray-50 rounded-lg text-gray-700 leading-relaxed">
                {viewingCampaign.description || 'No description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 border-y border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block">Start Date</span>
                <span className="font-semibold text-gray-800">
                  {formatDateTime(viewingCampaign.startDate)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">End Date</span>
                <span className="font-semibold text-gray-800">
                  {formatDateTime(viewingCampaign.endDate)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-gray-500 font-medium block mb-1.5">
                Assigned Users ({viewingCampaign.assignedUsers?.length || 0})
              </span>
              <div className="max-h-40 overflow-y-auto divide-y divide-gray-100 bg-gray-50 rounded-lg p-2">
                {!viewingCampaign.assignedUsers || viewingCampaign.assignedUsers.length === 0 ? (
                  <div className="text-xs text-gray-400 text-center py-2">
                    No users currently assigned.
                  </div>
                ) : (
                  viewingCampaign.assignedUsers.map((u) => (
                    <div key={u._id || u.id || u} className="py-1.5 px-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-800">
                        {typeof u === 'object' ? u.name : u}
                      </span>
                      <span className="text-gray-400">
                        {typeof u === 'object' ? u.email : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* USER ASSIGNMENT MODAL */}
      {assigningCampaign && (
        <Modal
          isOpen={!!assigningCampaign}
          onClose={() => setAssigningCampaign(null)}
          title="Campaign Assignments"
          subtitle={`Managing users for "${assigningCampaign.name}"`}
          footer={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAssigningCampaign(null)}
            >
              Done
            </Button>
          }
        >
          <div className="space-y-4">
            {/* Add User Section */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label
                htmlFor="assign-user-select"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Assign Tenant User
              </label>
              <div className="flex items-center gap-2">
                <Select
                  id="assign-user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Select a tenant user..."
                  options={tenantUsers.map((u) => ({
                    value: u._id || u.id,
                    label: `${u.name} (${u.email}) [${u.role}]`,
                    disabled: (assigningCampaign.assignedUsers || []).some(
                      (au) => (typeof au === 'object' ? au._id || au.id : au) === (u._id || u.id)
                    ),
                  }))}
                  wrapperClassName="flex-1"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAssignUser}
                  disabled={!selectedUserId || isAssigningLoading}
                  isLoading={isAssigningLoading}
                >
                  Assign
                </Button>
              </div>
            </div>

            {/* Currently assigned users list */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Currently Assigned ({assigningCampaign.assignedUsers?.length || 0})
              </h4>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {!assigningCampaign.assignedUsers || assigningCampaign.assignedUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">
                    No users assigned to this campaign yet.
                  </div>
                ) : (
                  assigningCampaign.assignedUsers.map((assigned) => {
                    const uId = typeof assigned === 'object' ? assigned._id || assigned.id : assigned;
                    const uName = typeof assigned === 'object' ? assigned.name : uId;
                    const uEmail = typeof assigned === 'object' ? assigned.email : '';
                    return (
                      <div
                        key={uId}
                        className="p-2.5 flex items-center justify-between hover:bg-gray-50 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">{uName}</div>
                          {uEmail && <div className="text-gray-400 text-[11px]">{uEmail}</div>}
                        </div>
                        <Button
                          size="sm"
                          variant="dangerOutline"
                          onClick={() => handleRemoveUser(uId)}
                          disabled={isAssigningLoading}
                          icon={UserX}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!campaignToDelete}
        onClose={() => setCampaignToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Campaign"
        message={`Are you sure you want to permanently delete campaign "${campaignToDelete?.name}"? All assignment linkages and logs tied to this campaign will be removed.`}
        confirmText="Permanently Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CampaignsPage;
