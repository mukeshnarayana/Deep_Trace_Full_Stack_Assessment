import React, { useState, useEffect } from 'react';
import {
  Clock,
  Laptop,
  Code,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { auditLogsApi } from '../api/auditLogsApi';
import { useToast } from '../hooks/useToast';
import { useQueryParams } from '../hooks/useQueryParams';
import Table from '../components/Table';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { formatDateTime } from '../utils/formatters';

export const AuditLogsPage = () => {
  const { error: showToastError } = useToast();

  const { params, setParams, resetParams } = useQueryParams({
    page: 1,
    limit: 10,
    action: '',
    startDate: '',
    endDate: '',
  });

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Inspector modal for metadata
  const [inspectingLog, setInspectingLog] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadLogs = async () => {
      try {
        setIsLoading(true);
        const query = {
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
        };
        if (params.action) query.action = params.action;
        if (params.startDate) query.startDate = params.startDate;
        if (params.endDate) query.endDate = params.endDate;

        const response = await auditLogsApi.getAuditLogs(query);
        if (isMounted && response?.data) {
          setLogs(response.data);
          setPagination({
            page: response.page || 1,
            limit: response.limit || 10,
            total: response.total || 0,
            totalPages: response.totalPages || 1,
          });
        }
      } catch (err) {
        if (isMounted) {
          showToastError(err.message || 'Failed to fetch audit trail.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      isMounted = false;
    };
  }, [params.page, params.limit, params.action, params.startDate, params.endDate, showToastError]);

  const columns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      width: '180px',
      render: (row) => (
        <span className="text-xs text-gray-600 font-mono flex items-center gap-1.5 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {formatDateTime(row.timestamp || row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'action',
      width: '160px',
      render: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Actor',
      key: 'actorId',
      render: (row) => {
        if (!row.actorId) {
          return <span className="text-xs text-gray-400 italic">System Process</span>;
        }
        return (
          <div>
            <span className="font-semibold text-gray-900 block text-xs">
              {row.actorId.name || 'Unknown User'}
            </span>
            <span className="text-[11px] text-gray-500 block">
              {row.actorId.email} ({row.actorId.role})
            </span>
          </div>
        );
      },
    },
    {
      header: 'Target Entity',
      key: 'entityType',
      render: (row) => (
        <div className="text-xs">
          <span className="font-medium text-gray-700">{row.entityType}</span>
          {row.entityId && (
            <span className="block text-[11px] font-mono text-gray-400 truncate max-w-[140px]">
              {row.entityId}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Client IP',
      key: 'ip',
      width: '120px',
      render: (row) => (
        <span className="text-xs font-mono text-gray-500 flex items-center gap-1">
          <Laptop className="w-3 h-3 text-gray-400" />
          {row.ip || '127.0.0.1'}
        </span>
      ),
    },
    {
      header: 'Metadata',
      key: 'metadata',
      headerClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInspectingLog(row)}
            icon={Code}
            className="text-xs py-1 px-2"
          >
            Inspect
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Tenant Audit Logs
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Immutable, append-only security telemetry tracking mutations, logins, and permission changes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">Append-Only Integrity Enforced</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Action Filter */}
          <Select
            label="Filter by Event Action"
            id="action-filter"
            value={params.action || ''}
            onChange={(e) => setParams({ action: e.target.value, page: 1 })}
            options={[
              { value: '', label: 'All Logged Actions' },
              { value: 'LOGIN_SUCCESS', label: 'LOGIN_SUCCESS' },
              { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
              { value: 'LOGOUT', label: 'LOGOUT' },
              { value: 'CAMPAIGN_CREATE', label: 'CAMPAIGN_CREATE' },
              { value: 'CAMPAIGN_UPDATE', label: 'CAMPAIGN_UPDATE' },
              { value: 'CAMPAIGN_DELETE', label: 'CAMPAIGN_DELETE' },
              { value: 'USER_ASSIGNED', label: 'USER_ASSIGNED' },
              { value: 'USER_REMOVED', label: 'USER_REMOVED' },
              { value: 'USER_CREATE', label: 'USER_CREATE' },
              { value: 'USER_UPDATE', label: 'USER_UPDATE' },
              { value: 'USER_DELETE', label: 'USER_DELETE' },
              { value: 'SECURITY_EVENT_CREATE', label: 'SECURITY_EVENT_CREATE' },
              { value: 'SECURITY_EVENT_UPDATE', label: 'SECURITY_EVENT_UPDATE' },
            ]}
          />

          {/* Start Date */}
          <Input
            label="From Date"
            id="audit-start-date"
            type="date"
            value={params.startDate ? params.startDate.split('T')[0] : ''}
            onChange={(e) =>
              setParams({
                startDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                page: 1,
              })
            }
          />

          {/* End Date */}
          <Input
            label="To Date"
            id="audit-end-date"
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

        {(params.action || params.startDate || params.endDate) && (
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => resetParams()}
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyTitle="No audit records found"
        emptyDescription="No audit logs matched your query parameters."
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

      {/* METADATA INSPECTION MODAL */}
      {inspectingLog && (
        <Modal
          isOpen={!!inspectingLog}
          onClose={() => setInspectingLog(null)}
          title="Audit Entry Inspection"
          subtitle={`${inspectingLog.action} on ${inspectingLog.entityType}`}
          maxWidth="max-w-xl"
          footer={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInspectingLog(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-gray-400 block">Record ID</span>
                <span className="font-mono text-gray-800">{inspectingLog._id || inspectingLog.id}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Timestamp</span>
                <span className="font-mono text-gray-800">{formatDateTime(inspectingLog.timestamp)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Actor</span>
                <span className="text-gray-800 font-semibold">{inspectingLog.actorId?.name || 'System'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Client IP</span>
                <span className="font-mono text-gray-800">{inspectingLog.ip}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-700 block mb-1">
                Metadata JSON Payload
              </span>
              <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                {JSON.stringify(inspectingLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogsPage;
