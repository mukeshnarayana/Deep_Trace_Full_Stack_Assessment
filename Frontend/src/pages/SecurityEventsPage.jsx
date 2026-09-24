import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { securityEventsApi } from '../api/securityEventsApi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useQueryParams } from '../hooks/useQueryParams';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import {
  EVENT_TYPES,
} from '../utils/constants';
import { formatDateTime, formatEnumText, toDateTimeLocalInput } from '../utils/formatters';

export const SecurityEventsPage = () => {
  const { isAdmin, isManager } = useAuth();
  const { success, error: showToastError } = useToast();

  const canManageEvents = isAdmin || isManager;

  // Sync state with URL query parameters
  const { params, setParams, resetParams } = useQueryParams({
    page: 1,
    limit: 10,
    severity: '',
    status: '',
    startDate: '',
    endDate: '',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });

  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch events using server-side query with primitive dependency tracking
  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        const query = {
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
          sortBy: params.sortBy || 'timestamp',
          sortOrder: params.sortOrder || 'desc',
        };
        if (params.severity) query.severity = params.severity;
        if (params.status) query.status = params.status;
        if (params.startDate) query.startDate = params.startDate;
        if (params.endDate) query.endDate = params.endDate;

        const response = await securityEventsApi.getSecurityEvents(query);
        if (isMounted && response?.data) {
          setEvents(response.data);
          setPagination({
            page: response.page || 1,
            limit: response.limit || 10,
            total: response.total || 0,
            totalPages: response.totalPages || 1,
          });
        }
      } catch (err) {
        if (isMounted) {
          showToastError(err.message || 'Failed to load security events.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [
    params.page,
    params.limit,
    params.severity,
    params.status,
    params.startDate,
    params.endDate,
    params.sortBy,
    params.sortOrder,
    refreshKey,
    showToastError,
  ]);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState('SUSPICIOUS_LOGIN');
  const [createSeverity, setCreateSeverity] = useState('MEDIUM');
  const [createStatus, setCreateStatus] = useState('OPEN');
  const [createDescription, setCreateDescription] = useState('');
  const [createTimestamp, setCreateTimestamp] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit / Status Update Modal State
  const [editingEvent, setEditingEvent] = useState(null);
  const [editStatus, setEditStatus] = useState('OPEN');
  const [editSeverity, setEditSeverity] = useState('LOW');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // View Details Modal State
  const [viewingEvent, setViewingEvent] = useState(null);

  // Handle open create modal
  const handleOpenCreate = () => {
    setCreateType('SUSPICIOUS_LOGIN');
    setCreateSeverity('MEDIUM');
    setCreateStatus('OPEN');
    setCreateDescription('');
    setCreateTimestamp(toDateTimeLocalInput(new Date().toISOString()));
    setIsCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createDescription.trim()) {
      showToastError('Event description is required.');
      return;
    }

    try {
      setIsCreating(true);
      await securityEventsApi.createSecurityEvent({
        type: createType,
        severity: createSeverity,
        status: createStatus,
        description: createDescription.trim(),
        timestamp: createTimestamp ? new Date(createTimestamp).toISOString() : new Date().toISOString(),
      });
      success('Security event logged successfully.');
      setIsCreateModalOpen(false);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to log security event.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle open edit
  const handleOpenEdit = (event) => {
    setEditingEvent(event);
    setEditStatus(event.status || 'OPEN');
    setEditSeverity(event.severity || 'LOW');
    setEditDescription(event.description || '');
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      setIsUpdating(true);
      await securityEventsApi.updateSecurityEvent(editingEvent._id || editingEvent.id, {
        status: editStatus,
        severity: editSeverity,
        description: editDescription.trim(),
      });
      success('Security event updated successfully.');
      setEditingEvent(null);
      triggerRefresh();
    } catch (err) {
      showToastError(err.message || 'Failed to update event.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Table columns
  const columns = [
    {
      header: 'Event Type & Description',
      key: 'type',
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 block font-mono text-xs">
            {row.type}
          </span>
          <span className="text-xs text-gray-500 block truncate max-w-sm mt-0.5">
            {row.description}
          </span>
        </div>
      ),
    },
    {
      header: 'Severity',
      key: 'severity',
      width: '110px',
      render: (row) => <Badge variant={row.severity}>{row.severity}</Badge>,
    },
    {
      header: 'Status',
      key: 'status',
      width: '130px',
      render: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
    {
      header: 'Detected At',
      key: 'timestamp',
      render: (row) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {formatDateTime(row.timestamp || row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Reported By',
      key: 'createdBy',
      render: (row) => (
        <span className="text-xs text-gray-600">
          {row.createdBy?.name || 'Automated Rule'}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setViewingEvent(row)}
            title="Inspect Details"
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {canManageEvents && (
            <button
              type="button"
              onClick={() => handleOpenEdit(row)}
              title="Update Status / Severity"
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            >
              <Edit className="w-4 h-4" />
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
            Security Events & Alerts
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tenant-isolated threat detection, authentication anomalies, and incident response tracking.
          </p>
        </div>

        {canManageEvents && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            icon={Plus}
          >
            Log Security Event
          </Button>
        )}
      </div>

      {/* Filter Bar with Severity, Status, Date Range and Sort */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Severity Filter */}
          <Select
            label="Severity"
            id="filter-severity"
            value={params.severity || ''}
            onChange={(e) => setParams({ severity: e.target.value, page: 1 })}
            options={[
              { value: '', label: 'All Severities' },
              { value: 'LOW', label: 'Low (Gray)' },
              { value: 'MEDIUM', label: 'Medium (Amber)' },
              { value: 'HIGH', label: 'High (Orange)' },
              { value: 'CRITICAL', label: 'Critical (Red)' },
            ]}
          />

          {/* Status Filter */}
          <Select
            label="Resolution Status"
            id="filter-status"
            value={params.status || ''}
            onChange={(e) => setParams({ status: e.target.value, page: 1 })}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'OPEN', label: 'Open' },
              { value: 'INVESTIGATING', label: 'Investigating' },
              { value: 'RESOLVED', label: 'Resolved' },
              { value: 'CLOSED', label: 'Closed' },
            ]}
          />

          {/* Date Range Start */}
          <Input
            label="From Date"
            id="filter-start-date"
            type="date"
            value={params.startDate ? params.startDate.split('T')[0] : ''}
            onChange={(e) =>
              setParams({
                startDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                page: 1,
              })
            }
          />

          {/* Date Range End */}
          <Input
            label="To Date"
            id="filter-end-date"
            type="date"
            value={params.endDate ? params.endDate.split('T')[0] : ''}
            onChange={(e) =>
              setParams({
                endDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                page: 1,
              })
            }
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Sort By:</span>
            <select
              value={`${params.sortBy || 'timestamp'}-${params.sortOrder || 'desc'}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setParams({ sortBy: sb, sortOrder: so, page: 1 });
              }}
              className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 bg-white"
            >
              <option value="timestamp-desc">Time: Newest First</option>
              <option value="timestamp-asc">Time: Oldest First</option>
              <option value="severity-desc">Severity</option>
              <option value="status-asc">Status</option>
            </select>
          </div>

          {(params.severity || params.status || params.startDate || params.endDate) && (
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => resetParams()}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Events Table */}
      <Table
        columns={columns}
        data={events}
        isLoading={isLoading}
        emptyTitle="No security events found"
        emptyDescription="No events match your current filter parameters or no incidents have occurred."
        emptyActionLabel={canManageEvents ? 'Log Event' : undefined}
        onEmptyAction={canManageEvents ? handleOpenCreate : undefined}
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

      {/* CREATE EVENT MODAL (ADMIN / MANAGER) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Log Security Event"
        subtitle="Report an anomalous event or security incident"
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
              Submit Event
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Select
            label="Event Type"
            id="createType"
            value={createType}
            onChange={(e) => setCreateType(e.target.value)}
            options={EVENT_TYPES.map((t) => ({ value: t, label: formatEnumText(t) }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Severity Level"
              id="createSeverity"
              value={createSeverity}
              onChange={(e) => setCreateSeverity(e.target.value)}
              options={[
                { value: 'LOW', label: 'LOW (Muted Gray)' },
                { value: 'MEDIUM', label: 'MEDIUM (Amber)' },
                { value: 'HIGH', label: 'HIGH (Orange)' },
                { value: 'CRITICAL', label: 'CRITICAL (Red)' },
              ]}
              required
            />

            <Select
              label="Initial Status"
              id="createStatus"
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value)}
              options={[
                { value: 'OPEN', label: 'OPEN' },
                { value: 'INVESTIGATING', label: 'INVESTIGATING' },
                { value: 'RESOLVED', label: 'RESOLVED' },
                { value: 'CLOSED', label: 'CLOSED' },
              ]}
            />
          </div>

          <div>
            <label
              htmlFor="createDescription"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Incident Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="createDescription"
              rows={3}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Provide IP, affected endpoints, or suspicious behavior details..."
              className="block w-full rounded-lg text-sm border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              required
            />
          </div>

          <Input
            label="Timestamp of Detection"
            id="createTimestamp"
            type="datetime-local"
            value={createTimestamp}
            onChange={(e) => setCreateTimestamp(e.target.value)}
          />
        </form>
      </Modal>

      {/* UPDATE STATUS / SEVERITY MODAL */}
      {editingEvent && (
        <Modal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          title="Update Security Event"
          subtitle={`Event: ${editingEvent.type}`}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingEvent(null)}
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
                Save Updates
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Select
              label="Triage Status"
              id="editStatus"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              options={[
                { value: 'OPEN', label: 'OPEN' },
                { value: 'INVESTIGATING', label: 'INVESTIGATING' },
                { value: 'RESOLVED', label: 'RESOLVED' },
                { value: 'CLOSED', label: 'CLOSED' },
              ]}
            />

            <Select
              label="Severity"
              id="editSeverity"
              value={editSeverity}
              onChange={(e) => setEditSeverity(e.target.value)}
              options={[
                { value: 'LOW', label: 'LOW' },
                { value: 'MEDIUM', label: 'MEDIUM' },
                { value: 'HIGH', label: 'HIGH' },
                { value: 'CRITICAL', label: 'CRITICAL' },
              ]}
            />

            <div>
              <label
                htmlFor="editDescription"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Resolution Notes / Description
              </label>
              <textarea
                id="editDescription"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="block w-full rounded-lg text-sm border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </form>
        </Modal>
      )}

      {/* VIEW EVENT DETAILS MODAL */}
      {viewingEvent && (
        <Modal
          isOpen={!!viewingEvent}
          onClose={() => setViewingEvent(null)}
          title="Security Event Dossier"
          subtitle={`ID: ${viewingEvent._id || viewingEvent.id}`}
          footer={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingEvent(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-mono text-gray-900 font-semibold">{viewingEvent.type}</span>
              <div className="flex items-center gap-2">
                <Badge variant={viewingEvent.severity}>{viewingEvent.severity}</Badge>
                <Badge variant={viewingEvent.status}>{viewingEvent.status}</Badge>
              </div>
            </div>

            <div>
              <span className="text-gray-500 font-medium block mb-1">Details & Payload</span>
              <p className="p-3 bg-gray-50 rounded-lg text-gray-800 leading-relaxed font-mono text-xs">
                {viewingEvent.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 border-y border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block">Reported At</span>
                <span className="font-semibold text-gray-800">
                  {formatDateTime(viewingEvent.timestamp || viewingEvent.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Reported By</span>
                <span className="font-semibold text-gray-800">
                  {viewingEvent.createdBy?.name || 'Security Sensor'}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SecurityEventsPage;
