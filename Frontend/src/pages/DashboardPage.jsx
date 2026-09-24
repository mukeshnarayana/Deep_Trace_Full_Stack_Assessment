import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  ShieldAlert,
  AlertOctagon,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { useAuth } from '../hooks/useAuth';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import { formatDateTime } from '../utils/formatters';

export const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadInitialStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await dashboardApi.getDashboardStats();
        if (isMounted) setStats(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadInitialStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = stats?.metrics;
  const recentLogs = stats?.recentAuditLogs || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Security Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time multi-tenant telemetry and security health indicators for{' '}
            <span className="font-semibold text-gray-700">{user?.tenant?.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStats}
            isLoading={isLoading}
            icon={RefreshCw}
          >
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Error notification if fetch failed */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="dangerOutline" onClick={fetchStats}>
            Retry
          </Button>
        </div>
      )}

      {/* Metric Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" color="text-indigo-600" />
          <span className="mt-3 text-xs text-gray-500">Loading security metrics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Users */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Users
                </span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.usersCount ?? '—'}
                </div>
                <div className="mt-1 text-xs text-gray-500">Active tenant accounts</div>
              </div>
              {user?.role !== 'USER' && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Link
                    to="/users"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Manage directory</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Card 2: Campaigns */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Campaigns
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.campaignsByStatus?.ACTIVE ?? 0}
                  <span className="text-xs font-normal text-gray-400 ml-1.5">Active</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <Badge variant="DRAFT" size="xs">
                    {metrics?.campaignsByStatus?.DRAFT ?? 0} Draft
                  </Badge>
                  <Badge variant="COMPLETED" size="xs">
                    {metrics?.campaignsByStatus?.COMPLETED ?? 0} Completed
                  </Badge>
                  <Badge variant="CANCELLED" size="xs">
                    {metrics?.campaignsByStatus?.CANCELLED ?? 0} Cancelled
                  </Badge>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                  to="/campaigns"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <span>View all campaigns</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 3: Open Events */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Open Events
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics?.openEventsCount ?? 0}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Pending triage & investigation
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                  to="/security-events"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <span>View incidents</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 4: Critical Events */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Critical Alerts
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertOctagon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-rose-600">
                  {metrics?.criticalEventsCount ?? 0}
                </div>
                <div className="mt-1 text-xs text-gray-500">Requires immediate attention</div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                  to="/security-events?severity=CRITICAL"
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800"
                >
                  <span>Filter critical</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Recent Security Activity
                </h2>
              </div>
              {isAdmin && (
                <Link
                  to="/audit-logs"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Complete Audit Trail &rarr;
                </Link>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  No recent audit activity recorded for this tenant yet.
                </div>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log._id || log.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 text-xs font-semibold mt-0.5">
                        {log.actorId?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900">
                            {log.actorId?.name || 'System / Service'}
                          </span>
                          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-500">
                            on {log.entityType}
                          </span>
                        </div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-lg">
                            {JSON.stringify(log.metadata)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 sm:text-right flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
