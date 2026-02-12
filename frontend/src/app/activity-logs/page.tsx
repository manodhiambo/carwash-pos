'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer } from '@/components/layout/PageHeader';
import {
  Button,
  SearchInput,
  Card,
  Badge,
  SimpleSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  Spinner,
  Input,
  Label,
} from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';
import { activityLogsApi } from '@/lib/api';
import {
  Download,
  Filter,
  User,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  Car,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Database,
  Key,
  DollarSign,
  Package,
  Wrench,
} from 'lucide-react';

interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent?: string;
  created_at: string;
}

export default function ActivityLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', currentPage, actionFilter, resourceFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        limit: 20,
      };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (resourceFilter !== 'all') params.entity_type = resourceFilter;
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const response = await activityLogsApi.getAll(params);
      return response;
    },
  });

  const logs: ActivityLog[] = (data?.data || []) as any;
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false };
  const totalPages = pagination.totalPages || 1;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <LogIn className="h-4 w-4" />;
      case 'logout': return <LogOut className="h-4 w-4" />;
      case 'create': return <Plus className="h-4 w-4" />;
      case 'update': return <Edit className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      case 'view': return <Eye className="h-4 w-4" />;
      case 'payment': return <CreditCard className="h-4 w-4" />;
      case 'refund': return <DollarSign className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-700';
      case 'logout': return 'bg-gray-100 text-gray-700';
      case 'create': return 'bg-blue-100 text-blue-700';
      case 'update': return 'bg-yellow-100 text-yellow-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'view': return 'bg-purple-100 text-purple-700';
      case 'payment': return 'bg-emerald-100 text-emerald-700';
      case 'refund': return 'bg-orange-100 text-orange-700';
      case 'override': return 'bg-red-100 text-red-700';
      case 'void': return 'bg-red-100 text-red-700';
      case 'export': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'user': return <Key className="h-4 w-4" />;
      case 'job': return <Car className="h-4 w-4" />;
      case 'payment': return <DollarSign className="h-4 w-4" />;
      case 'customer': return <User className="h-4 w-4" />;
      case 'service': return <Wrench className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'setting': return <Settings className="h-4 w-4" />;
      case 'report': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
      view: 'Viewed',
      payment: 'Payment',
      refund: 'Refund',
      override: 'Override',
      void: 'Voided',
      export: 'Export',
    };
    return labels[action] || action;
  };

  const formatDetails = (log: ActivityLog) => {
    const parts: string[] = [];
    if (log.new_values) {
      Object.entries(log.new_values).forEach(([key, value]) => {
        if (typeof value === 'object') return;
        parts.push(`${key}: ${value}`);
      });
    }
    if (log.old_values && Object.keys(log.old_values).length > 0) {
      Object.entries(log.old_values).forEach(([key, value]) => {
        if (typeof value === 'object') return;
        parts.push(`prev ${key}: ${value}`);
      });
    }
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Client-side search filter
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.user_name || '').toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.ip_address || '').includes(q)
    );
  });

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Activity Logs"
          description="Track all system activities and user actions"
        >
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </PageHeader>

        <Card className="p-4">
          {/* Search and Quick Filters */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <SearchInput
                placeholder="Search by user, action, resource, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className="flex-1"
              />
              <SimpleSelect
                value={actionFilter}
                onValueChange={(val) => { setActionFilter(val); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'All Actions' },
                  { value: 'login', label: 'Login' },
                  { value: 'logout', label: 'Logout' },
                  { value: 'create', label: 'Create' },
                  { value: 'update', label: 'Update' },
                  { value: 'delete', label: 'Delete' },
                  { value: 'view', label: 'View' },
                  { value: 'payment', label: 'Payment' },
                  { value: 'refund', label: 'Refund' },
                ]}
                className="w-36"
              />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <Label>Resource</Label>
                    <SimpleSelect
                      value={resourceFilter}
                      onValueChange={(val) => { setResourceFilter(val); setCurrentPage(1); }}
                      options={[
                        { value: 'all', label: 'All Resources' },
                        { value: 'user', label: 'Authentication' },
                        { value: 'job', label: 'Jobs' },
                        { value: 'payment', label: 'Payments' },
                        { value: 'customer', label: 'Customers' },
                        { value: 'service', label: 'Services' },
                        { value: 'inventory', label: 'Inventory' },
                        { value: 'setting', label: 'Settings' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <div>
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionFilter('all');
                        setResourceFilter('all');
                        setDateFrom('');
                        setDateTo('');
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logs Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <TableEmpty message="No activity logs found" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatDate(log.created_at, true)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{log.user_name || 'System'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'h-8 w-8 rounded-full flex items-center justify-center',
                                  getActionColor(log.action)
                                )}
                              >
                                {getActionIcon(log.action)}
                              </div>
                              <span className="text-sm">{getActionLabel(log.action)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getResourceIcon(log.entity_type)}
                              <div>
                                <div className="text-sm capitalize">{log.entity_type.replace('_', ' ')}</div>
                                {log.entity_id && (
                                  <div className="text-xs text-muted-foreground">
                                    ID: {log.entity_id}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDetails(log) ? (
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {formatDetails(log)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.ip_address || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {pagination.total || 0} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrev && currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!pagination.hasNext && currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </PageContainer>
    </MainLayout>
  );
}
