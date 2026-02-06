'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { PageHeader, PageContainer, Section } from '@/components/layout/PageHeader';
import {
  Button,
  Input,
  SearchInput,
  Card,
  StatCard,
  Badge,
  StatusBadge,
  Dialog,
  SimpleSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  Textarea,
  AlertDialog,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  Download,
  DollarSign,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  PlayCircle,
  StopCircle,
  User,
  FileText,
  Calculator,
  Banknote,
} from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'bank_transfer' | 'card';
  vendor?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface CashSession {
  id: string;
  cashierId: string;
  cashierName: string;
  openingBalance: number;
  closingBalance?: number;
  expectedClosing?: number;
  cashIn: number;
  cashOut: number;
  mpesaTotal: number;
  cardTotal: number;
  discrepancy?: number;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
  notes?: string;
  transactions: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  spent: number;
  color: string;
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('this_month');
  const [isLoading, setIsLoading] = useState(true);

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'mpesa' | 'bank_transfer' | 'card',
    vendor: '',
    receiptNumber: '',
    notes: '',
  });

  // Cash sessions state
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [isOpenSessionDialogOpen, setIsOpenSessionDialogOpen] = useState(false);
  const [isCloseSessionDialogOpen, setIsCloseSessionDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Categories state
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingApproval: 0,
    cashOnHand: 0,
    todayExpenses: 0,
    monthlyBudget: 0,
    budgetUsed: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock expense categories
      setCategories([
        { id: '1', name: 'Utilities', description: 'Electricity, water, internet', budget: 50000, spent: 32000, color: 'blue' },
        { id: '2', name: 'Supplies', description: 'Cleaning supplies, chemicals', budget: 80000, spent: 65000, color: 'green' },
        { id: '3', name: 'Maintenance', description: 'Equipment repairs, bay maintenance', budget: 40000, spent: 15000, color: 'orange' },
        { id: '4', name: 'Salaries', description: 'Staff wages and bonuses', budget: 200000, spent: 180000, color: 'purple' },
        { id: '5', name: 'Rent', description: 'Premises rent', budget: 100000, spent: 100000, color: 'red' },
        { id: '6', name: 'Marketing', description: 'Advertising and promotions', budget: 30000, spent: 8000, color: 'pink' },
        { id: '7', name: 'Miscellaneous', description: 'Other expenses', budget: 20000, spent: 5000, color: 'gray' },
      ]);

      // Mock expenses
      setExpenses([
        {
          id: '1',
          category: 'Supplies',
          description: 'Car wash soap and wax - 50 liters',
          amount: 12500,
          paymentMethod: 'mpesa',
          vendor: 'AutoChem Supplies',
          receiptNumber: 'RCP-2024-0234',
          status: 'approved',
          createdBy: 'user1',
          createdByName: 'James Mwangi',
          createdAt: '2024-02-18T10:30:00Z',
        },
        {
          id: '2',
          category: 'Utilities',
          description: 'February electricity bill',
          amount: 18500,
          paymentMethod: 'bank_transfer',
          vendor: 'Kenya Power',
          receiptNumber: 'KPLC-FEB-2024',
          status: 'approved',
          createdBy: 'user1',
          createdByName: 'James Mwangi',
          createdAt: '2024-02-17T14:00:00Z',
        },
        {
          id: '3',
          category: 'Maintenance',
          description: 'Pressure washer pump repair',
          amount: 8500,
          paymentMethod: 'cash',
          vendor: 'Bay Equipment Services',
          receiptNumber: 'BES-0456',
          status: 'pending',
          notes: 'Urgent repair needed for Bay 2',
          createdBy: 'user2',
          createdByName: 'Peter Ochieng',
          createdAt: '2024-02-18T16:00:00Z',
        },
        {
          id: '4',
          category: 'Supplies',
          description: 'Microfiber towels - 100 pcs',
          amount: 5000,
          paymentMethod: 'mpesa',
          vendor: 'CleanPro Distributors',
          receiptNumber: 'CPD-789',
          status: 'approved',
          createdBy: 'user3',
          createdByName: 'Mary Wanjiku',
          createdAt: '2024-02-16T09:15:00Z',
        },
        {
          id: '5',
          category: 'Marketing',
          description: 'Flyers printing - 1000 pcs',
          amount: 3500,
          paymentMethod: 'cash',
          vendor: 'Quick Print Ltd',
          status: 'rejected',
          notes: 'Budget exceeded for this month',
          createdBy: 'user2',
          createdByName: 'Peter Ochieng',
          createdAt: '2024-02-15T11:00:00Z',
        },
      ]);

      // Mock cash sessions
      setCashSessions([
        {
          id: '1',
          cashierId: 'user1',
          cashierName: 'James Mwangi',
          openingBalance: 5000,
          closingBalance: 28500,
          expectedClosing: 28000,
          cashIn: 35000,
          cashOut: 11500,
          mpesaTotal: 42000,
          cardTotal: 15000,
          discrepancy: 500,
          status: 'closed',
          openedAt: '2024-02-17T07:00:00Z',
          closedAt: '2024-02-17T19:00:00Z',
          notes: 'Normal day, slight positive variance',
          transactions: 45,
        },
        {
          id: '2',
          cashierId: 'user1',
          cashierName: 'James Mwangi',
          openingBalance: 5000,
          cashIn: 18500,
          cashOut: 3500,
          mpesaTotal: 25000,
          cardTotal: 8000,
          status: 'open',
          openedAt: '2024-02-18T07:00:00Z',
          transactions: 28,
        },
      ]);

      // Set current session
      const openSession = {
        id: '2',
        cashierId: 'user1',
        cashierName: 'James Mwangi',
        openingBalance: 5000,
        cashIn: 18500,
        cashOut: 3500,
        mpesaTotal: 25000,
        cardTotal: 8000,
        status: 'open' as const,
        openedAt: '2024-02-18T07:00:00Z',
        transactions: 28,
      };
      setCurrentSession(openSession);

      // Mock stats
      setStats({
        totalExpenses: 405000,
        pendingApproval: 8500,
        cashOnHand: 20000,
        todayExpenses: 21000,
        monthlyBudget: 520000,
        budgetUsed: 405000,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExpense = async () => {
    try {
      // API call would go here
      setIsExpenseDialogOpen(false);
      setSelectedExpense(null);
      resetExpenseForm();
      fetchData();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'cash',
      vendor: '',
      receiptNumber: '',
      notes: '',
    });
  };

  const handleOpenSession = async () => {
    try {
      // API call would go here
      setIsOpenSessionDialogOpen(false);
      setOpeningBalance('');
      fetchData();
    } catch (error) {
      console.error('Error opening session:', error);
    }
  };

  const handleCloseSession = async () => {
    try {
      // API call would go here
      setIsCloseSessionDialogOpen(false);
      setClosingBalance('');
      setClosingNotes('');
      fetchData();
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  const getExpenseStatusColor = (status: Expense['status']) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'mpesa':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'bank_transfer':
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      purple: 'bg-purple-100 text-purple-800',
      red: 'bg-red-100 text-red-800',
      pink: 'bg-pink-100 text-pink-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return colors[color] || colors.gray;
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.createdByName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const budgetPercentage = Math.round((stats.budgetUsed / stats.monthlyBudget) * 100);

  return (
    <MainLayout>
      <PageContainer>
        <PageHeader
          title="Expenses & Cash Management"
          description="Track expenses and manage cash sessions"
        >
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setIsExpenseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </PageHeader>

        {/* Current Cash Session Banner */}
        {currentSession && (
          <Card className="p-4 mb-6 border-primary/50 bg-primary/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Active Cash Session</h3>
                  <p className="text-sm text-muted-foreground">
                    Opened by {currentSession.cashierName} at{' '}
                    {formatDate(currentSession.openedAt, true)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Opening</div>
                  <div className="font-semibold">{formatCurrency(currentSession.openingBalance)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Cash In</div>
                  <div className="font-semibold text-success">
                    +{formatCurrency(currentSession.cashIn)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Cash Out</div>
                  <div className="font-semibold text-destructive">
                    -{formatCurrency(currentSession.cashOut)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Expected</div>
                  <div className="font-semibold">
                    {formatCurrency(
                      currentSession.openingBalance + currentSession.cashIn - currentSession.cashOut
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsCloseSessionDialogOpen(true)}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Close Session
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats.totalExpenses)}
            icon={<Receipt className="h-5 w-5" />}
            description="This month"
          />
          <StatCard
            title="Pending Approval"
            value={formatCurrency(stats.pendingApproval)}
            icon={<Clock className="h-5 w-5" />}
            className="border-warning/50"
          />
          <StatCard
            title="Cash on Hand"
            value={formatCurrency(stats.cashOnHand)}
            icon={<Wallet className="h-5 w-5" />}
          />
          <StatCard
            title="Today's Expenses"
            value={formatCurrency(stats.todayExpenses)}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Monthly Budget"
            value={formatCurrency(stats.monthlyBudget)}
            icon={<Calculator className="h-5 w-5" />}
          />
          <StatCard
            title="Budget Used"
            value={`${budgetPercentage}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            className={budgetPercentage > 90 ? 'border-destructive/50' : ''}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="expenses">
              <Receipt className="h-4 w-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FileText className="h-4 w-4 mr-2" />
              Categories & Budget
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Wallet className="h-4 w-4 mr-2" />
              Cash Sessions
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card className="p-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <SearchInput
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <SimpleSelect
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
                  ]}
                  className="w-40"
                />
                <SimpleSelect
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                  className="w-40"
                />
              </div>

              {/* Expenses Table */}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9}>
                            <TableEmpty message="No expenses found" />
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="text-sm">
                              {formatDate(expense.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getCategoryColor(
                                  categories.find((c) => c.name === expense.category)?.color || 'gray'
                                )}
                              >
                                {expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <div className="font-medium truncate">{expense.description}</div>
                                {expense.receiptNumber && (
                                  <div className="text-xs text-muted-foreground">
                                    Ref: {expense.receiptNumber}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{expense.vendor || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getPaymentMethodIcon(expense.paymentMethod)}
                                <span className="text-sm capitalize">
                                  {expense.paymentMethod.replace('_', ' ')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={getExpenseStatusColor(expense.status)}>
                                {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                              </StatusBadge>
                            </TableCell>
                            <TableCell className="text-sm">{expense.createdByName}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {expense.status === 'pending' && (
                                  <>
                                    <Button variant="ghost" size="sm" className="text-success">
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Categories & Budget Tab */}
          <TabsContent value="categories">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Categories List */}
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Expense Categories</h3>
                  <Button size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>

                <div className="space-y-4">
                  {categories.map((category) => {
                    const percentage = category.budget
                      ? Math.round((category.spent / category.budget) * 100)
                      : 0;
                    const isOverBudget = percentage > 100;

                    return (
                      <div key={category.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={getCategoryColor(category.color)}>
                                {category.name}
                              </Badge>
                            </div>
                            {category.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {category.description}
                              </p>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>

                        {category.budget && (
                          <>
                            <div className="flex justify-between text-sm mb-1">
                              <span>
                                {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                              </span>
                              <span
                                className={cn(
                                  'font-medium',
                                  isOverBudget ? 'text-destructive' : ''
                                )}
                              >
                                {percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all',
                                  isOverBudget
                                    ? 'bg-destructive'
                                    : percentage > 80
                                    ? 'bg-warning'
                                    : 'bg-success'
                                )}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Budget Overview */}
              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Monthly Budget Overview</h3>

                <div className="space-y-6">
                  {/* Total Budget Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Total Budget Usage</span>
                      <span>
                        {formatCurrency(stats.budgetUsed)} / {formatCurrency(stats.monthlyBudget)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4">
                      <div
                        className={cn(
                          'h-4 rounded-full transition-all',
                          budgetPercentage > 100
                            ? 'bg-destructive'
                            : budgetPercentage > 80
                            ? 'bg-warning'
                            : 'bg-primary'
                        )}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {budgetPercentage}% of monthly budget used
                    </p>
                  </div>

                  {/* Budget by Category */}
                  <div>
                    <h4 className="font-medium mb-3">By Category</h4>
                    <div className="space-y-3">
                      {categories
                        .filter((c) => c.budget)
                        .sort((a, b) => b.spent - a.spent)
                        .map((category) => {
                          const percentage = Math.round((category.spent / category.budget!) * 100);
                          return (
                            <div key={category.id} className="flex items-center gap-3">
                              <div className="w-24 text-sm truncate">{category.name}</div>
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div
                                  className={cn(
                                    'h-2 rounded-full',
                                    percentage > 100
                                      ? 'bg-destructive'
                                      : percentage > 80
                                      ? 'bg-warning'
                                      : 'bg-primary'
                                  )}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <div className="w-12 text-sm text-right">{percentage}%</div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Remaining Budget */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Remaining Budget</span>
                      <span
                        className={cn(
                          'text-xl font-bold',
                          stats.monthlyBudget - stats.budgetUsed < 0
                            ? 'text-destructive'
                            : 'text-success'
                        )}
                      >
                        {formatCurrency(stats.monthlyBudget - stats.budgetUsed)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Cash Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Cash Session History</h3>
                {!currentSession && (
                  <Button size="sm" onClick={() => setIsOpenSessionDialogOpen(true)}>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Open Session
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Cash In</TableHead>
                        <TableHead className="text-right">Cash Out</TableHead>
                        <TableHead className="text-right">M-Pesa</TableHead>
                        <TableHead className="text-right">Card</TableHead>
                        <TableHead className="text-right">Closing</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashSessions.map((session) => {
                        const expectedClosing =
                          session.openingBalance + session.cashIn - session.cashOut;
                        const variance = session.closingBalance
                          ? session.closingBalance - expectedClosing
                          : 0;

                        return (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(session.openedAt)}</div>
                                {session.closedAt && (
                                  <div className="text-muted-foreground">
                                    to {formatDate(session.closedAt)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{session.cashierName}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(session.openingBalance)}
                            </TableCell>
                            <TableCell className="text-right text-success">
                              +{formatCurrency(session.cashIn)}
                            </TableCell>
                            <TableCell className="text-right text-destructive">
                              -{formatCurrency(session.cashOut)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(session.mpesaTotal)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(session.cardTotal)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {session.closingBalance
                                ? formatCurrency(session.closingBalance)
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {session.closingBalance ? (
                                <span
                                  className={cn(
                                    'font-medium',
                                    variance > 0
                                      ? 'text-success'
                                      : variance < 0
                                      ? 'text-destructive'
                                      : ''
                                  )}
                                >
                                  {variance > 0 ? '+' : ''}
                                  {formatCurrency(variance)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge
                                status={session.status === 'open' ? 'success' : 'secondary'}
                              >
                                {session.status === 'open' ? 'Open' : 'Closed'}
                              </StatusBadge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Expense Dialog */}
        <Dialog
          open={isExpenseDialogOpen}
          onOpenChange={(open) => {
            setIsExpenseDialogOpen(open);
            if (!open) {
              setSelectedExpense(null);
              resetExpenseForm();
            }
          }}
          title={selectedExpense ? 'Edit Expense' : 'Add Expense'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label required>Category</Label>
                <SimpleSelect
                  value={expenseForm.category}
                  onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}
                  options={categories.map((cat) => ({ value: cat.name, label: cat.name }))}
                  placeholder="Select category"
                />
              </div>

              <div className="col-span-2">
                <Label required>Description</Label>
                <Textarea
                  placeholder="What was this expense for?"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label required>Amount (KES)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>

              <div>
                <Label required>Payment Method</Label>
                <SimpleSelect
                  value={expenseForm.paymentMethod}
                  onValueChange={(value) =>
                    setExpenseForm({
                      ...expenseForm,
                      paymentMethod: value as 'cash' | 'mpesa' | 'bank_transfer' | 'card',
                    })
                  }
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'mpesa', label: 'M-Pesa' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'card', label: 'Card' },
                  ]}
                />
              </div>

              <div>
                <Label>Vendor/Supplier</Label>
                <Input
                  placeholder="Vendor name"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                />
              </div>

              <div>
                <Label>Receipt Number</Label>
                <Input
                  placeholder="Receipt/Invoice number"
                  value={expenseForm.receiptNumber}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receiptNumber: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveExpense}>
                {selectedExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Open Session Dialog */}
        <Dialog
          open={isOpenSessionDialogOpen}
          onOpenChange={setIsOpenSessionDialogOpen}
          title="Open Cash Session"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Start a new cash session by entering the opening cash balance in the drawer.
            </p>

            <div>
              <Label required>Opening Balance (KES)</Label>
              <Input
                type="number"
                placeholder="Enter cash amount"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Count all cash in the drawer before starting
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpenSessionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleOpenSession} disabled={!openingBalance}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Open Session
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Close Session Dialog */}
        <Dialog
          open={isCloseSessionDialogOpen}
          onOpenChange={setIsCloseSessionDialogOpen}
          title="Close Cash Session"
        >
          <div className="space-y-4">
            {currentSession && (
              <>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Opening Balance</span>
                    <span>{formatCurrency(currentSession.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cash In</span>
                    <span className="text-success">+{formatCurrency(currentSession.cashIn)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cash Out</span>
                    <span className="text-destructive">-{formatCurrency(currentSession.cashOut)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Expected Closing</span>
                    <span>
                      {formatCurrency(
                        currentSession.openingBalance +
                          currentSession.cashIn -
                          currentSession.cashOut
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <Label required>Actual Closing Balance (KES)</Label>
                  <Input
                    type="number"
                    placeholder="Count and enter actual cash"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                  />
                  {closingBalance && (
                    <div className="mt-2">
                      {(() => {
                        const expected =
                          currentSession.openingBalance +
                          currentSession.cashIn -
                          currentSession.cashOut;
                        const variance = parseFloat(closingBalance) - expected;
                        return (
                          <div
                            className={cn(
                              'text-sm font-medium',
                              variance > 0
                                ? 'text-success'
                                : variance < 0
                                ? 'text-destructive'
                                : ''
                            )}
                          >
                            Variance: {variance > 0 ? '+' : ''}
                            {formatCurrency(variance)}
                            {variance !== 0 && (
                              <span className="font-normal text-muted-foreground ml-1">
                                ({variance > 0 ? 'surplus' : 'shortage'})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any notes about the session..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCloseSessionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleCloseSession}
                disabled={!closingBalance}
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Close Session
              </Button>
            </div>
          </div>
        </Dialog>
      </PageContainer>
    </MainLayout>
  );
}
