'use client';

import { useState, useEffect } from 'react';
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
import {
  Download,
  Filter,
  Search,
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
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Database,
  Key,
  UserPlus,
  UserMinus,
  DollarSign,
  Package,
  Wrench,
} from 'lucide-react';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'payment' | 'system';
  resource: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'warning';
  createdAt: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, actionFilter, resourceFilter, statusFilter, dateFrom, dateTo]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock activity logs
      const mockLogs: ActivityLog[] = [
        {
          id: '1',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'User logged in',
          actionType: 'login',
          resource: 'auth',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          status: 'success',
          createdAt: '2024-02-18T14:30:00Z',
        },
        {
          id: '2',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'Created new job',
          actionType: 'create',
          resource: 'jobs',
          resourceId: 'j123',
          resourceName: 'Job #J-2024-0156',
          details: { vehiclePlate: 'KDA 123A', services: ['Full Service Wash'] },
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: '2024-02-18T14:25:00Z',
        },
        {
          id: '3',
          userId: 'u2',
          userName: 'Mary Wanjiku',
          userRole: 'cashier',
          action: 'Processed payment',
          actionType: 'payment',
          resource: 'payments',
          resourceId: 'p456',
          resourceName: 'Payment #PAY-2024-0234',
          details: { amount: 1500, method: 'mpesa', jobId: 'j122' },
          ipAddress: '192.168.1.101',
          status: 'success',
          createdAt: '2024-02-18T14:20:00Z',
        },
        {
          id: '4',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'Updated service pricing',
          actionType: 'update',
          resource: 'services',
          resourceId: 's1',
          resourceName: 'Full Service Wash',
          details: { oldPrice: 1000, newPrice: 1200 },
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: '2024-02-18T14:15:00Z',
        },
        {
          id: '5',
          userId: 'u3',
          userName: 'Peter Ochieng',
          userRole: 'attendant',
          action: 'Updated job status',
          actionType: 'update',
          resource: 'jobs',
          resourceId: 'j121',
          resourceName: 'Job #J-2024-0155',
          details: { oldStatus: 'in_progress', newStatus: 'completed' },
          ipAddress: '192.168.1.102',
          status: 'success',
          createdAt: '2024-02-18T14:10:00Z',
        },
        {
          id: '6',
          userId: 'u2',
          userName: 'Mary Wanjiku',
          userRole: 'cashier',
          action: 'Failed login attempt',
          actionType: 'login',
          resource: 'auth',
          ipAddress: '192.168.1.105',
          status: 'failed',
          createdAt: '2024-02-18T14:05:00Z',
        },
        {
          id: '7',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'Added new customer',
          actionType: 'create',
          resource: 'customers',
          resourceId: 'c45',
          resourceName: 'John Doe',
          details: { phone: '+254712345678' },
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: '2024-02-18T14:00:00Z',
        },
        {
          id: '8',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'Deleted promotion',
          actionType: 'delete',
          resource: 'promotions',
          resourceId: 'pr12',
          resourceName: 'Expired Promo',
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: '2024-02-18T13:55:00Z',
        },
        {
          id: '9',
          userId: 'system',
          userName: 'System',
          userRole: 'system',
          action: 'Automatic backup completed',
          actionType: 'system',
          resource: 'backups',
          details: { size: '256MB', duration: '45s' },
          ipAddress: 'localhost',
          status: 'success',
          createdAt: '2024-02-18T13:00:00Z',
        },
        {
          id: '10',
          userId: 'u4',
          userName: 'Sarah Muthoni',
          userRole: 'manager',
          action: 'Viewed reports',
          actionType: 'view',
          resource: 'reports',
          resourceName: 'Daily Sales Report',
          ipAddress: '192.168.1.103',
          status: 'success',
          createdAt: '2024-02-18T12:45:00Z',
        },
        {
          id: '11',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'Updated inventory',
          actionType: 'update',
          resource: 'inventory',
          resourceId: 'inv5',
          resourceName: 'Car Wash Soap',
          details: { action: 'stock_in', quantity: 50, oldQuantity: 20, newQuantity: 70 },
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: '2024-02-18T12:30:00Z',
        },
        {
          id: '12',
          userId: 'u2',
          userName: 'Mary Wanjiku',
          userRole: 'cashier',
          action: 'Opened cash session',
          actionType: 'create',
          resource: 'cash_sessions',
          resourceId: 'cs12',
          details: { openingBalance: 5000 },
          ipAddress: '192.168.1.101',
          status: 'success',
          createdAt: '2024-02-18T07:00:00Z',
        },
        {
          id: '13',
          userId: 'system',
          userName: 'System',
          userRole: 'system',
          action: 'Low stock alert triggered',
          actionType: 'system',
          resource: 'inventory',
          resourceId: 'inv3',
          resourceName: 'Microfiber Towels',
          details: { currentQuantity: 5, threshold: 10 },
          ipAddress: 'localhost',
          status: 'warning',
          createdAt: '2024-02-18T06:00:00Z',
        },
        {
          id: '14',
          userId: 'u1',
          userName: 'James Mwangi',
          userRole: 'admin',
          action: 'Updated system settings',
          actionType: 'update',
          resource: 'settings',
          details: { section: 'notifications', changes: ['lowStockAlert: true'] },
          ipAddress: '192.168.1.100',
          status: 'success',
          createdAt: '2024-02-17T18:00:00Z',
        },
        {
          id: '15',
          userId: 'u3',
          userName: 'Peter Ochieng',
          userRole: 'attendant',
          action: 'User logged out',
          actionType: 'logout',
          resource: 'auth',
          ipAddress: '192.168.1.102',
          status: 'success',
          createdAt: '2024-02-17T19:00:00Z',
        },
      ];

      setLogs(mockLogs);
      setTotalPages(3);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (actionType: ActivityLog['actionType'], resource: string) => {
    switch (actionType) {
      case 'login':
        return <LogIn className="h-4 w-4" />;
      case 'logout':
        return <LogOut className="h-4 w-4" />;
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'payment':
        return <CreditCard className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: ActivityLog['actionType']) => {
    switch (actionType) {
      case 'login':
        return 'bg-green-100 text-green-700';
      case 'logout':
        return 'bg-gray-100 text-gray-700';
      case 'create':
        return 'bg-blue-100 text-blue-700';
      case 'update':
        return 'bg-yellow-100 text-yellow-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'view':
        return 'bg-purple-100 text-purple-700';
      case 'payment':
        return 'bg-emerald-100 text-emerald-700';
      case 'system':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'auth':
        return <Key className="h-4 w-4" />;
      case 'jobs':
        return <Car className="h-4 w-4" />;
      case 'payments':
        return <DollarSign className="h-4 w-4" />;
      case 'customers':
        return <User className="h-4 w-4" />;
      case 'services':
        return <Wrench className="h-4 w-4" />;
      case 'inventory':
        return <Package className="h-4 w-4" />;
      case 'settings':
        return <Settings className="h-4 w-4" />;
      case 'reports':
        return <FileText className="h-4 w-4" />;
      case 'backups':
        return <Database className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: ActivityLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      cashier: 'bg-green-100 text-green-700',
      attendant: 'bg-yellow-100 text-yellow-700',
      system: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);
    const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesAction && matchesResource && matchesStatus;
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={fetchLogs}>
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
                className="flex-1"
              />
              <SimpleSelect
                value={actionFilter}
                onValueChange={setActionFilter}
                options={[
                  { value: 'all', label: 'All Actions' },
                  { value: 'login', label: 'Login' },
                  { value: 'logout', label: 'Logout' },
                  { value: 'create', label: 'Create' },
                  { value: 'update', label: 'Update' },
                  { value: 'delete', label: 'Delete' },
                  { value: 'view', label: 'View' },
                  { value: 'payment', label: 'Payment' },
                  { value: 'system', label: 'System' },
                ]}
                className="w-36"
              />
              <SimpleSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'success', label: 'Success' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'warning', label: 'Warning' },
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
                      onValueChange={setResourceFilter}
                      options={[
                        { value: 'all', label: 'All Resources' },
                        { value: 'auth', label: 'Authentication' },
                        { value: 'jobs', label: 'Jobs' },
                        { value: 'payments', label: 'Payments' },
                        { value: 'customers', label: 'Customers' },
                        { value: 'services', label: 'Services' },
                        { value: 'inventory', label: 'Inventory' },
                        { value: 'settings', label: 'Settings' },
                        { value: 'reports', label: 'Reports' },
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Date From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Date To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionFilter('all');
                        setResourceFilter('all');
                        setStatusFilter('all');
                        setDateFrom('');
                        setDateTo('');
                        setSearchQuery('');
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <TableEmpty message="No activity logs found" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatDate(log.createdAt, true)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{log.userName}</div>
                                <Badge className={cn('text-xs', getRoleBadge(log.userRole))}>
                                  {log.userRole}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'h-8 w-8 rounded-full flex items-center justify-center',
                                  getActionColor(log.actionType)
                                )}
                              >
                                {getActionIcon(log.actionType, log.resource)}
                              </div>
                              <span className="text-sm">{log.action}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getResourceIcon(log.resource)}
                              <div>
                                <div className="text-sm capitalize">{log.resource.replace('_', ' ')}</div>
                                {log.resourceName && (
                                  <div className="text-xs text-muted-foreground">
                                    {log.resourceName}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.details ? (
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {Object.entries(log.details)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(', ')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredLogs.length} of {logs.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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
