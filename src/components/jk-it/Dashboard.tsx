import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Users, 
  CreditCard, 
  Wallet, 
  Home, 
  LogOut, 
  User,
  Plus,
  TrendingUp,
  Calendar,
  Loader2,
  Edit,
  Trash2,
  MoreVertical,
  History,
  LayoutDashboard
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  description: string;
  image_url?: string;
  leader_id?: string;
  phone_number?: string;
  created_at: string;
}

const Overview = ({ setActiveTab, user }: { setActiveTab: (tab: string) => void, user: any }) => {
  const [stats, setStats] = useState({
    totalDue: 0,
    totalReceived: 0,
    activeMembers: 0,
    monthlyRevenue: 0,
    totalExpenses: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    monthlyTransactions: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const [membersRes, transRes, expenseRes, unitRes, rentPayRes] = await Promise.all([
          supabase.from('team_members').select('id').eq('user_id', user.id),
          supabase.from('member_transactions').select('*').eq('user_id', user.id),
          supabase.from('business_expenses').select('amount').eq('user_id', user.id),
          supabase.from('units').select('status').eq('user_id', user.id),
          supabase.from('unit_rent_payments').select('*').eq('user_id', user.id)
        ]);

        const transactions = transRes.data || [];
        const rentPayments = rentPayRes.data || [];
        const expenses = expenseRes.data || [];
        const units = unitRes.data || [];
        
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalUnits = units.length;
        const occupiedUnits = units.filter(u => u.status === 'Occupied').length;
        const totalGive = transactions.filter(t => t.type === 'give').reduce((sum, t) => sum + t.amount, 0);
        const memberReceived = transactions.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0);
        const rentReceived = rentPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalReceived = memberReceived + rentReceived;

        // Calculate Monthly Revenue (Received in current month)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthlyMemberRevenue = transactions
          .filter(t => {
            const d = new Date(t.created_at);
            return t.type === 'received' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        const monthlyRentRevenue = rentPayments
          .filter(p => {
            const d = new Date(p.created_at);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum, p) => sum + p.amount, 0);

        const monthlyRevenue = monthlyMemberRevenue + monthlyRentRevenue;

        // Group by date for chart (combine both)
        const allIncome = [
          ...transactions.filter(t => t.type === 'received').map(t => ({ date: t.created_at, amount: t.amount })),
          ...rentPayments.map(p => ({ date: p.created_at, amount: p.amount }))
        ];

        const grouped = allIncome.reduce((acc: any, t) => {
          const date = new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!acc[date]) acc[date] = { date, amount: 0 };
          acc[date].amount += t.amount;
          return acc;
        }, {});

        setStats({
          totalDue: totalGive - totalReceived,
          totalReceived,
          activeMembers: membersRes.data?.length || 0,
          monthlyRevenue,
          totalExpenses,
          totalUnits,
          occupiedUnits,
          monthlyTransactions: Object.values(grouped).slice(-7) // Last 7 days
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Welcome back!</h1>
        <p className="text-slate-600 text-lg">Here's what's happening with your business today</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6"
      >
        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="group relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 border border-red-200/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest opacity-70 text-red-700 font-semibold">Outstanding Due</p>
                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold text-red-700 mb-1">${stats.totalDue.toLocaleString()}</p>
              <p className="text-xs text-red-600/70">Pending payments</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest opacity-70 text-green-700 font-semibold">Total Received</p>
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold text-green-700 mb-1">${stats.totalReceived.toLocaleString()}</p>
              <p className="text-xs text-green-600/70">Collected this month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest opacity-70 text-blue-700 font-semibold">Monthly Revenue</p>
                <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold text-blue-700 mb-1">${stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-blue-600/70">This month's income</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest opacity-70 text-orange-700 font-semibold">Total Expenses</p>
                <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold text-orange-700 mb-1">${stats.totalExpenses.toLocaleString()}</p>
              <p className="text-xs text-orange-600/70">Business spending</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-100 border border-purple-200/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest opacity-70 text-purple-700 font-semibold">Total Units</p>
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Home className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold text-purple-700 mb-1">{stats.totalUnits}</p>
              <p className="text-xs text-purple-600/70">Properties managed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="group relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-100 border border-teal-200/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest opacity-70 text-teal-700 font-semibold">Occupancy Rate</p>
                <div className="h-8 w-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-serif font-bold text-teal-700 mb-1">
                {stats.totalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalUnits) * 100) : 0}%
              </p>
              <p className="text-xs text-teal-600/70">Units occupied</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts and Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* Transaction Volume Chart */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/60 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10 p-8">
            <CardHeader className="px-0 pt-0 pb-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif font-bold text-slate-900">Transaction Volume</CardTitle>
                  <p className="text-sm text-slate-600">Last 7 days performance</p>
                </div>
              </div>
            </CardHeader>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyTransactions}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAmountStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1e40af"/>
                      <stop offset="100%" stopColor="#3b82f6"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 12, fill: '#64748b'}}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 12, fill: '#64748b'}}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="url(#colorAmountStroke)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/60 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Card className="bg-transparent border-none h-full relative z-10 p-8">
            <CardHeader className="px-0 pt-0 pb-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-serif font-bold text-slate-900">Quick Actions</CardTitle>
                  <p className="text-sm text-slate-600">Common tasks and shortcuts</p>
                </div>
              </div>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  className="h-24 flex flex-col items-center justify-center space-y-3 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white border-none shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-1 rounded-2xl"
                  onClick={() => setActiveTab('team')}
                >
                  <Plus className="h-6 w-6" />
                  <span className="font-semibold text-sm">New Member</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-gradient-to-br from-slate-50 to-white hover:from-white hover:to-slate-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl"
                  onClick={() => setActiveTab('due')}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="font-semibold text-sm">Add Payment</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-gradient-to-br from-slate-50 to-white hover:from-white hover:to-slate-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl"
                  onClick={() => setActiveTab('expenses')}
                >
                  <Wallet className="h-6 w-6" />
                  <span className="font-semibold text-sm">Log Expense</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col items-center justify-center space-y-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 bg-gradient-to-br from-slate-50 to-white hover:from-white hover:to-slate-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl"
                  onClick={() => setActiveTab('rent')}
                >
                  <Home className="h-6 w-6" />
                  <span className="font-semibold text-sm">Rent Invoice</span>
                </Button>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

const TeamMembers = ({ user }: { user: any }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newLeaderId, setNewLeaderId] = useState<string>('none');

  const fetchMembers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [membersRes, transRes] = await Promise.all([
        supabase.from('team_members').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('member_transactions').select('*').eq('user_id', user.id)
      ]);

      if (membersRes.error) {
        const errorMsg = membersRes.error.message || '';
        const isTableMissing = 
          membersRes.error.code === 'PGRST116' || 
          errorMsg.includes('relation "team_members" does not exist') ||
          errorMsg.includes('Could not find the table') ||
          errorMsg.includes('schema cache');
        
        if (isTableMissing) {
          console.warn('Team members table not found. Showing mock data.');
          setMembers([
            { id: '1', name: 'John Doe', role: 'Team Leader', description: 'Specializing in luxury real estate.', created_at: '', image_url: 'https://picsum.photos/seed/john/200' },
            { id: '2', name: 'Jane Smith', role: 'Property Manager', description: 'Expert in residential management.', created_at: '', image_url: 'https://picsum.photos/seed/jane/200', leader_id: '1' }
          ]);
        } else {
          toast.error('Failed to fetch members: ' + membersRes.error.message);
        }
      } else {
        setMembers(membersRes.data || []);
      }

      if (transRes.data) {
        setTransactions(transRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const resetForm = () => {
    setNewName('');
    setNewRole('');
    setNewPhone('');
    setNewDescription('');
    setSelectedFile(null);
    setNewLeaderId('none');
    setEditingMember(null);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setNewName(member.name);
    setNewRole(member.role);
    setNewPhone(member.phone_number || '');
    setNewDescription(member.description);
    setNewLeaderId(member.leader_id || 'none');
    setOpen(true);
  };

  const handleAddOrEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      let imageUrl = editingMember?.image_url || `https://picsum.photos/seed/${newName}/200`;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('team-assets')
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error('Image upload failed: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('team-assets')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl;
      }

      const payload: any = { 
        name: newName, 
        role: newRole, 
        phone_number: newPhone,
        description: newDescription,
        image_url: imageUrl,
        leader_id: newLeaderId === 'none' ? null : newLeaderId,
        user_id: user.id
      };
      
      if (editingMember) {
        const { data, error } = await supabase
          .from('team_members')
          .update(payload)
          .eq('id', editingMember.id)
          .select();

        if (error) throw error;
        toast.success('Member updated successfully!');
        setMembers(members.map(m => m.id === editingMember.id ? data[0] : m));
      } else {
        const { data, error } = await supabase
          .from('team_members')
          .insert([payload])
          .select();

        if (error) throw error;
        toast.success('Member added successfully!');
        setMembers([data[0], ...members]);
      }

      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Member deleted successfully');
      setMembers(members.filter(m => m.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const calculateDue = (memberId: string) => {
    const relevant = transactions.filter(t => t.member_id === memberId);
    const give = relevant.filter(t => t.type === 'give').reduce((sum, t) => sum + t.amount, 0);
    const received = relevant.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0);
    return give - received;
  };

  const leaders = members.filter(m => !m.leader_id);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Team Hierarchy</h2>
          <p className="text-muted-foreground">Manage leaders and their teams</p>
        </div>
        
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) resetForm(); }}>
          <DialogTrigger render={
            <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px] border-slate-200 shadow-xl">
            <form onSubmit={handleAddOrEditMember}>
              <DialogHeader>
                <DialogTitle className="text-slate-800">{editingMember ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
                <DialogDescription className="text-slate-600">
                  {editingMember ? 'Update the details of the team member.' : 'Enter the details and assign a leader if applicable.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Full Name" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Input 
                    id="role" 
                    placeholder="e.g. Senior Agent" 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Profile Picture</Label>
                  <Input 
                    id="image" 
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {editingMember ? 'Leave empty to keep current picture.' : 'Leave empty to use a random avatar.'}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="leader">Assign Leader</Label>
                  <select 
                    id="leader"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newLeaderId}
                    onChange={(e) => setNewLeaderId(e.target.value)}
                  >
                    <option value="none">No Leader (Independent/Leader)</option>
                    {leaders.filter(l => l.id !== editingMember?.id).map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="e.g. 017..." 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    placeholder="Brief bio..." 
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingMember ? 'Update Member' : 'Save Member'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-12">
          {leaders.map((leader) => (
            <div key={leader.id} className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-xl font-serif font-bold text-muted-foreground uppercase tracking-widest">
                  Team {leader.name}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Leader Card */}
                <div className="border border-slate-200 rounded-3xl shadow-sm bg-white">
                  <Card className="border-none shadow-xl relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-0 bg-black text-white px-3 py-1 text-[10px] uppercase font-bold tracking-tighter z-10">
                      Leader
                    </div>
                  
                  <div className="absolute top-8 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col space-y-1">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() => handleOpenEdit(leader)}
                      className="h-8 w-8 rounded-full bg-white/90 shadow-sm hover:bg-white hover:shadow-md transition-all duration-200"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDeleteMember(leader.id)}
                      className="h-8 w-8 rounded-full shadow-sm bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <CardHeader className="flex flex-row items-center space-x-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                      <img 
                        src={leader.image_url || `https://picsum.photos/seed/${leader.name}/200`} 
                        alt={leader.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = `https://picsum.photos/seed/${leader.name}/200`;
                        }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{leader.name}</CardTitle>
                      <p className="text-sm font-bold text-muted-foreground">{leader.role}</p>
                      <p className="text-xs font-bold text-red-500 mt-1">Due: ${calculateDue(leader.id).toFixed(2)}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm italic">"{leader.description}"</p>
                  </CardContent>
                </Card>
              </div>

              {/* Subordinates */}
                {members.filter(m => m.leader_id === leader.id).map((sub) => (
                  <div key={sub.id} className="border border-slate-200 rounded-3xl shadow-sm bg-white">
                    <Card className="hover:shadow-lg transition-all hover:-translate-y-1 border-none group relative h-full">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(sub)}
                        className="h-7 w-7 rounded-full bg-white/80 hover:bg-white shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteMember(sub.id)}
                        className="h-7 w-7 rounded-full bg-red-50 text-red-500 hover:text-red-600 hover:bg-red-100 shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <CardHeader className="flex flex-row items-center space-x-4">
                      <div className="h-12 w-12 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                        <img 
                          src={sub.image_url || `https://picsum.photos/seed/${sub.name}/200`} 
                          alt={sub.name}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = `https://picsum.photos/seed/${sub.name}/200`;
                          }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{sub.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{sub.role}</p>
                        <p className="text-[10px] font-bold text-red-500 mt-0.5">Due: ${calculateDue(sub.id).toFixed(2)}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{sub.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}

          {members.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No team members found. Add your first leader!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface Transaction {
  id: string;
  user_id: string;
  member_id: string | null;
  extra_member_name: string | null;
  extra_member_phone: string | null;
  extra_member_image_url?: string;
  amount: number;
  type: 'give' | 'received';
  description: string;
  created_at: string;
}

const DueManagement = ({ user }: { user: any }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [customerEditOpen, setCustomerEditOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'give' | 'received'>('give');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [historyMember, setHistoryMember] = useState<any>(null);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [extraName, setExtraName] = useState('');
  const [extraPhone, setExtraPhone] = useState('');
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustFile, setEditCustFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [membersRes, transRes] = await Promise.all([
        supabase.from('team_members').select('*').eq('user_id', user.id),
        supabase.from('member_transactions').select('*').eq('user_id', user.id)
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (transRes.data) setTransactions(transRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      let extraImageUrl = null;

      if (selectedMember === 'extra' && extraFile) {
        const fileExt = extraFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `extra-customers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('team-assets')
          .upload(filePath, extraFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('team-assets')
          .getPublicUrl(filePath);
          
        extraImageUrl = publicUrl;
      }

      const payload: any = {
        amount: parseFloat(amount),
        type: transactionType,
        description,
        user_id: user.id
      };

      if (editingTransaction) {
        const { data, error } = await supabase
          .from('member_transactions')
          .update(payload)
          .eq('id', editingTransaction.id)
          .eq('user_id', user.id)
          .select();

        if (error) throw error;
        toast.success('Transaction updated');
        setTransactions(transactions.map(t => t.id === editingTransaction.id ? data[0] : t));
      } else {
        if (selectedMember === 'extra') {
          payload.extra_member_name = extraName;
          payload.extra_member_phone = extraPhone;
          if (extraImageUrl) payload.extra_member_image_url = extraImageUrl;
        } else {
          payload.member_id = selectedMember.id;
        }

        const { data, error } = await supabase
          .from('member_transactions')
          .insert([payload])
          .select();

        if (error) throw error;
        toast.success(`Transaction recorded: ${transactionType}`);
        setTransactions([...transactions, data[0]]);
      }

      setOpen(false);
      setEditingTransaction(null);
      setAmount('');
      setDescription('');
      setExtraName('');
      setExtraPhone('');
      setExtraFile(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      const { error } = await supabase
        .from('member_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setTransactions(transactions.filter(t => t.id !== id));
      toast.success('Transaction deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setAmount(t.amount.toString());
    setDescription(t.description || '');
    setTransactionType(t.type);
    setOpen(true);
  };

  const handleDeleteCustomer = async (customer: any) => {
    const isExtra = !!customer.extra;
    const confirmMsg = isExtra 
      ? `Are you sure? This will delete ALL transactions for "${customer.name}".`
      : `Are you sure? This will delete the team member "${customer.name}" and all their records.`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      if (isExtra) {
        const { error } = await supabase
          .from('member_transactions')
          .delete()
          .eq('extra_member_name', customer.name)
          .eq('user_id', user.id);
        if (error) throw error;
        setTransactions(transactions.filter(t => t.extra_member_name !== customer.name));
      } else {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('id', customer.id)
          .eq('user_id', user.id);
        if (error) throw error;
        setMembers(members.filter(m => m.id !== customer.id));
        setTransactions(transactions.filter(t => t.member_id !== customer.id));
      }
      toast.success('Customer deleted successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      let newImageUrl = editingCustomer.image;

      if (editCustFile) {
        const fileExt = editCustFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = editingCustomer.extra ? `extra-customers/${fileName}` : `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('team-assets')
          .upload(filePath, editCustFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('team-assets')
          .getPublicUrl(filePath);
          
        newImageUrl = publicUrl;
      }

      if (editingCustomer.extra) {
        const updatePayload: any = { 
          extra_member_name: editCustName,
          extra_member_phone: editCustPhone 
        };
        if (newImageUrl) updatePayload.extra_member_image_url = newImageUrl;

        const { error } = await supabase
          .from('member_transactions')
          .update(updatePayload)
          .eq('extra_member_name', editingCustomer.name)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        setTransactions(transactions.map(t => 
          t.extra_member_name === editingCustomer.name 
            ? { ...t, extra_member_name: editCustName, extra_member_phone: editCustPhone, extra_member_image_url: newImageUrl } 
            : t
        ));
      } else {
        const updatePayload: any = { 
          name: editCustName,
          phone_number: editCustPhone 
        };
        if (newImageUrl) updatePayload.image_url = newImageUrl;

        const { error } = await supabase
          .from('team_members')
          .update(updatePayload)
          .eq('id', editingCustomer.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        setMembers(members.map(m => 
          m.id === editingCustomer.id 
            ? { ...m, name: editCustName, phone_number: editCustPhone, image_url: newImageUrl } 
            : m
        ));
      }
      
      toast.success('Customer updated successfully');
      setCustomerEditOpen(false);
      setEditCustFile(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setEditCustName(customer.name);
    setEditCustPhone(customer.phone || '');
    setEditCustFile(null);
    setCustomerEditOpen(true);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const relevantTransactions = transactions
      .filter(t => historyMember?.extra ? t.extra_member_name === historyMember.name : t.member_id === historyMember?.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let runningBalance = 0;
    const tableData = relevantTransactions.map(t => {
      if (t.type === 'give') runningBalance += t.amount;
      else runningBalance -= t.amount;
      
      return [
        new Date(t.created_at).toLocaleDateString(),
        t.type.toUpperCase(),
        `$${t.amount.toFixed(2)}`,
        t.description || '-',
        `$${runningBalance.toFixed(2)}`
      ];
    }).reverse(); // Show newest first in PDF too

    // Add Header
    doc.setFontSize(20);
    doc.text('JK_IT Management Suite', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Transaction History Report', 105, 25, { align: 'center' });
    
    // Add Customer Info
    doc.setFontSize(12);
    doc.text(`Customer: ${historyMember?.name}`, 14, 40);
    doc.text(`Phone: ${historyMember?.phone_number || historyMember?.phone || 'N/A'}`, 14, 47);
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 54);

    const totalDue = calculateDue(historyMember?.id, historyMember?.extra ? historyMember.name : undefined);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // Red color
    doc.text(`Total Balance Due: $${totalDue.toFixed(2)}`, 14, 61);
    doc.setTextColor(0, 0, 0); // Reset to black

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Type', 'Amount', 'Description', 'Current Due']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] },
      margin: { top: 70 }
    });

    doc.save(`Transaction_History_${historyMember?.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF Downloaded');
  };

  const calculateDue = (memberId?: string, extraName?: string) => {
    const relevant = transactions.filter(t => 
      memberId ? t.member_id === memberId : t.extra_member_name === extraName
    );
    const give = relevant.filter(t => t.type === 'give').reduce((sum, t) => sum + t.amount, 0);
    const received = relevant.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0);
    return give - received;
  };

  // Unique customers (Members + Extra Members from transactions)
  const extraCustomers: string[] = Array.from(new Set(transactions.map(t => t.extra_member_name).filter((name): name is string => !!name)));
  
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.phone_number && m.phone_number.includes(searchTerm))
  );

  const filteredExtraCustomers = extraCustomers.filter(name => {
    const firstTrans = transactions.find(t => t.extra_member_name === name);
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (firstTrans?.extra_member_phone && firstTrans.extra_member_phone.includes(searchTerm));
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-serif font-bold">Due Tracking</h2>
        <Button onClick={() => { setSelectedMember('extra'); setTransactionType('give'); setOpen(true); }} className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" /> Add New Customer Due
        </Button>
      </div>

      <div className="border border-slate-200 rounded-3xl shadow-sm bg-white">
        <Card className="border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Customer Ledger</CardTitle>
          <div className="relative w-64">
            <Input
              placeholder="Search by name or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">SL</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Current Due</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Team Members */}
                {filteredMembers.map((m, i) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden border bg-muted">
                          <img 
                            src={m.image_url || `https://picsum.photos/seed/${m.name}/200`} 
                            alt={m.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.phone_number || 'N/A'}</td>
                    <td className="px-4 py-3 font-bold text-red-500">
                      ${calculateDue(m.id).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <div className="flex items-center justify-end space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon-sm" className="h-8 w-8 hover:bg-slate-100 transition-colors duration-200">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="border-slate-200 shadow-lg">
                            <DropdownMenuItem onClick={() => openEditCustomer({ id: m.id, name: m.name, phone: m.phone_number })} className="hover:bg-slate-50 cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteCustomer({ id: m.id, name: m.name })}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" variant="outline" className="hover:bg-slate-50 border-slate-300 transition-colors duration-200" onClick={() => { setHistoryMember(m); setHistoryOpen(true); }}><History className="h-3.5 w-3.5 mr-1" /> History</Button>
                        <Button size="sm" variant="outline" className="hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800 transition-colors duration-200" onClick={() => { setSelectedMember(m); setTransactionType('give'); setOpen(true); }}>Give</Button>
                        <Button size="sm" variant="outline" className="hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 transition-colors duration-200" onClick={() => { setSelectedMember(m); setTransactionType('received'); setOpen(true); }}>Received</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Extra Members */}
                {filteredExtraCustomers.map((name, i) => {
                  const firstTrans = transactions.find(t => t.extra_member_name === name);
                  return (
                    <tr key={name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono">{filteredMembers.length + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden border bg-muted">
                            <img 
                              src={firstTrans?.extra_member_image_url || `https://picsum.photos/seed/${name}/200`} 
                              alt={name!}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <span className="font-medium">{name}</span>
                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1 rounded">Extra</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{firstTrans?.extra_member_phone || 'N/A'}</td>
                      <td className="px-4 py-3 font-bold text-red-500">
                        ${calculateDue(undefined, name!).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <div className="flex items-center justify-end space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={
                              <Button variant="ghost" size="icon-sm" className="h-8 w-8 hover:bg-slate-100 transition-colors duration-200">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            } />
                            <DropdownMenuContent align="end" className="border-slate-200 shadow-lg">
                              <DropdownMenuItem onClick={() => openEditCustomer({ id: null, name: name, phone: firstTrans?.extra_member_phone, extra: true })} className="hover:bg-slate-50 cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Customer
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDeleteCustomer({ id: null, name: name, extra: true })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button size="sm" variant="outline" className="hover:bg-slate-50 border-slate-300 transition-colors duration-200" onClick={() => { setHistoryMember({ id: null, name: name, extra: true }); setHistoryOpen(true); }}><History className="h-3.5 w-3.5 mr-1" /> History</Button>
                          <Button size="sm" variant="outline" className="hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800 transition-colors duration-200" onClick={() => { setSelectedMember('extra'); setExtraName(name!); setExtraPhone(firstTrans?.extra_member_phone || ''); setTransactionType('give'); setOpen(true); }}>Give</Button>
                          <Button size="sm" variant="outline" className="hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800 transition-colors duration-200" onClick={() => { setSelectedMember('extra'); setExtraName(name!); setExtraPhone(firstTrans?.extra_member_phone || ''); setTransactionType('received'); setOpen(true); }}>Received</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
            {!loading && members.length === 0 && extraCustomers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No customers found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>

      <Dialog open={customerEditOpen} onOpenChange={setCustomerEditOpen}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-3xl">
          <form onSubmit={handleUpdateCustomer}>
            <DialogHeader>
              <DialogTitle>Edit Customer Details</DialogTitle>
              <DialogDescription>
                Update name and phone number for {editingCustomer?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Customer Name</Label>
                <Input value={editCustName} onChange={(e) => setEditCustName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>Phone Number</Label>
                <Input 
                  value={editCustPhone} 
                  onChange={(e) => setEditCustPhone(e.target.value.replace(/\D/g, ''))} 
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-2">
                <Label>Profile Picture</Label>
                <Input type="file" accept="image/*" onChange={(e) => setEditCustFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'Update Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-[600px] border border-slate-200 shadow-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              Full history for {historyMember?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted sticky top-0">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Current Due</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const relevant = transactions
                    .filter(t => historyMember?.extra ? t.extra_member_name === historyMember.name : t.member_id === historyMember?.id)
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                  
                  let runningBalance = 0;
                  return relevant.map(t => {
                    if (t.type === 'give') runningBalance += t.amount;
                    else runningBalance -= t.amount;
                    return { ...t, runningBalance };
                  }).reverse().map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${t.type === 'give' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`px-4 py-2 font-mono font-bold ${t.type === 'give' ? 'text-red-500' : 'text-green-600'}`}>
                        {t.type === 'give' ? '+' : '-'}${t.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-xs italic">{t.description || '-'}</td>
                      <td className="px-4 py-2 font-bold text-red-500">
                        ${t.runningBalance.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right space-x-1">
                        <Button size="icon-sm" variant="ghost" className="h-7 w-7 hover:bg-slate-100 transition-colors duration-200" onClick={() => openEditTransaction(t)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200" onClick={() => deleteTransaction(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <div className="w-full flex justify-between items-center text-sm">
              <Button variant="outline" size="sm" onClick={downloadPDF} className="border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors duration-200">
                Download PDF
              </Button>
              <div className="flex items-center space-x-2">
                <span className="font-bold">Total Balance:</span>
                <span className="text-lg font-bold text-red-500">
                  ${calculateDue(historyMember?.id, historyMember?.extra ? historyMember.name : undefined).toFixed(2)}
                </span>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setEditingTransaction(null); }}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-3xl">
          <form onSubmit={handleTransaction}>
            <DialogHeader>
              <DialogTitle className={transactionType === 'give' ? 'text-red-600' : 'text-green-600'}>
                {editingTransaction ? 'Edit Transaction' : (transactionType === 'give' ? 'Give Amount (Add to Due)' : 'Received Amount (Reduce Due)')}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Update transaction details' : `Recording transaction for ${selectedMember === 'extra' ? (extraName || 'New Extra Member') : selectedMember?.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {selectedMember === 'extra' && (
                <>
                  <div className="grid gap-2">
                    <Label>Customer Name</Label>
                    <Input value={extraName} onChange={(e) => setExtraName(e.target.value)} placeholder="Full Name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone Number</Label>
                    <Input 
                      value={extraPhone} 
                      onChange={(e) => setExtraPhone(e.target.value.replace(/\D/g, ''))} 
                      placeholder="017..." 
                      inputMode="numeric"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Profile Picture</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setExtraFile(e.target.files?.[0] || null)} />
                  </div>
                </>
              )}
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Rent, Advance, etc." />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing} className={`text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 ${transactionType === 'give' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'}`}>
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : `Confirm ${transactionType}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  created_at: string;
}

const Expenses = ({ user }: { user: any }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const categories = [
    'Room Vara', 
    'Wifi Bill', 
    'Paybill', 
    'Mobile Load', 
    'Transport (Janbohon)', 
    'Electricity', 
    'Office Rent', 
    'Marketing', 
    'Supplies', 
    'Salaries', 
    'General'
  ];

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('business_expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.business_expenses" does not exist')) {
        // Table doesn't exist yet, we'll handle this gracefully
        setExpenses([]);
      } else {
        toast.error('Failed to fetch expenses');
      }
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setCategory('General');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setDate(expense.date);
    setDescription(expense.description);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);

    const payload = {
      user_id: user.id,
      title,
      amount: parseFloat(amount),
      category,
      date,
      description
    };

    try {
      if (editingExpense) {
        const { error } = await supabase
          .from('business_expenses')
          .update(payload)
          .eq('id', editingExpense.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Expense updated');
      } else {
        const { error } = await supabase
          .from('business_expenses')
          .insert([payload]);
        if (error) throw error;
        toast.success('Expense added');
      }
      setOpen(false);
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    const { error } = await supabase
      .from('business_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Expense deleted');
      fetchExpenses();
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Expenses</h2>
          <p className="text-muted-foreground">Track your business spending</p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-slate-200 rounded-3xl shadow-sm bg-white">
          <Card className="border-none h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time business spending</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 border border-slate-200 rounded-3xl shadow-sm bg-white">
          <Card className="border-none h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="mr-2 h-4 w-4 text-red-500" />
                Spending by Category
              </CardTitle>
            </CardHeader>
          <CardContent className="h-[100px]">
            <div className="flex items-end space-x-2 h-full">
              {categories.map(cat => {
                const catTotal = expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
                const height = totalExpenses > 0 ? (catTotal / totalExpenses) * 100 : 0;
                return (
                  <div key={cat} className="flex-1 flex flex-col items-center group relative">
                    <div 
                      className="w-full bg-red-500/20 group-hover:bg-red-500/40 transition-all rounded-t" 
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {cat}: ${catTotal.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

      <div className="border border-slate-200 rounded-3xl shadow-sm bg-white">
        <Card className="border-none">
          <CardHeader>
            <CardTitle>Expense Log</CardTitle>
          </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{expense.title}</div>
                      {expense.description && <div className="text-[10px] text-muted-foreground italic">{expense.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-red-500">
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="icon-sm" variant="ghost" onClick={() => handleOpenEdit(expense)} className="h-7 w-7 rounded-full hover:bg-slate-100 transition-colors duration-200">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(expense.id)} className="h-7 w-7 rounded-full text-red-500 hover:bg-red-50 transition-colors duration-200">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No expenses recorded yet.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto h-6 w-6" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-3xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              <DialogDescription>
                Record a business expense to track your spending.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Office Rent" 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    step="0.01"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Additional details..." 
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : (editingExpense ? 'Update Expense' : 'Add Expense')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  image_url?: string;
  created_at: string;
}

interface Unit {
  id: string;
  property_id: string;
  user_id: string;
  unit_number: string;
  rent_amount: number;
  status: 'Occupied' | 'Vacant';
  tenant_name?: string;
  tenant_phone?: string;
  last_rent_paid?: string;
  created_at: string;
}

const RentManagement = ({ user }: { user: any }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Property Dialog
  const [propOpen, setPropOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propFile, setPropFile] = useState<File | null>(null);

  // Unit Dialog
  const [unitOpen, setUnitOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedPropId, setSelectedPropId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [unitStatus, setUnitStatus] = useState<'Occupied' | 'Vacant'>('Vacant');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');

  // Rent Collection Dialog
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectUnit, setCollectUnit] = useState<Unit | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMonth, setCollectMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [collectDesc, setCollectDesc] = useState('');
  const [collectCategory, setCollectCategory] = useState('Room Vara');

  const rentCategories = ['Room Vara', 'Wifi Bill', 'Paybill', 'Mobile Load', 'Janbohon'];

  // History Dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUnit, setHistoryUnit] = useState<Unit | null>(null);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [propRes, unitRes] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('units').select('*').eq('user_id', user.id).order('unit_number', { ascending: true })
    ]);

    if (!propRes.error) setProperties(propRes.data || []);
    if (!unitRes.error) setUnits(unitRes.data || []);
    setLoading(false);
  };

  const handlePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);

    let image_url = editingProperty?.image_url;
    if (propFile) {
      const fileExt = propFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, propFile);
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('property-images').getPublicUrl(fileName);
        image_url = publicUrl;
      }
    }

    const payload = { user_id: user.id, name: propName, address: propAddress, image_url };

    try {
      if (editingProperty) {
        await supabase.from('properties').update(payload).eq('id', editingProperty.id).eq('user_id', user.id);
        toast.success('Property updated');
      } else {
        await supabase.from('properties').insert([payload]);
        toast.success('Property added');
      }
      setPropOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProcessing(true);

    const payload = {
      user_id: user.id,
      property_id: selectedPropId,
      unit_number: unitNumber,
      rent_amount: parseFloat(rentAmount),
      status: unitStatus,
      tenant_name: unitStatus === 'Occupied' ? tenantName : null,
      tenant_phone: unitStatus === 'Occupied' ? tenantPhone : null
    };

    try {
      if (editingUnit) {
        await supabase.from('units').update(payload).eq('id', editingUnit.id).eq('user_id', user.id);
        toast.success('Unit updated');
      } else {
        await supabase.from('units').insert([payload]);
        toast.success('Unit added');
      }
      setUnitOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCollectRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !collectUnit) return;
    setIsProcessing(true);

    try {
      // 1. Record the payment
      const { error: payError } = await supabase.from('unit_rent_payments').insert([{
        user_id: user.id,
        unit_id: collectUnit.id,
        amount: parseFloat(collectAmount),
        month_year: collectMonth,
        category: collectCategory,
        description: collectDesc
      }]);

      if (payError) throw payError;

      // 2. Update the unit's last_rent_paid
      await supabase.from('units').update({
        last_rent_paid: new Date().toISOString().split('T')[0]
      }).eq('id', collectUnit.id);

      // 3. Optional: Also record as income in member_transactions if you want it in overview
      // But for now we keep them separate for cleaner data.

      toast.success(`Rent collected for ${collectMonth}`);
      setCollectOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchHistory = async (unit: Unit) => {
    setHistoryUnit(unit);
    setHistoryLoading(true);
    setHistoryOpen(true);
    const { data, error } = await supabase
      .from('unit_rent_payments')
      .select('*')
      .eq('unit_id', unit.id)
      .order('created_at', { ascending: false });
    
    if (!error) setHistoryPayments(data || []);
    setHistoryLoading(false);
  };

  const deleteProperty = async (id: string) => {
    if (!confirm('Deleting a property will delete all its units. Continue?')) return;
    await supabase.from('properties').delete().eq('id', id).eq('user_id', user.id);
    fetchData();
  };

  const deleteUnit = async (id: string) => {
    if (!confirm('Delete this unit?')) return;
    await supabase.from('units').delete().eq('id', id).eq('user_id', user.id);
    fetchData();
  };

  const openAddProp = () => {
    setEditingProperty(null);
    setPropName('');
    setPropAddress('');
    setPropFile(null);
    setPropOpen(true);
  };

  const openEditProp = (p: Property) => {
    setEditingProperty(p);
    setPropName(p.name);
    setPropAddress(p.address);
    setPropFile(null);
    setPropOpen(true);
  };

  const openAddUnit = (propId: string) => {
    setEditingUnit(null);
    setSelectedPropId(propId);
    setUnitNumber('');
    setRentAmount('');
    setUnitStatus('Vacant');
    setTenantName('');
    setTenantPhone('');
    setUnitOpen(true);
  };

  const openEditUnit = (u: Unit) => {
    setEditingUnit(u);
    setSelectedPropId(u.property_id);
    setUnitNumber(u.unit_number);
    setRentAmount(u.rent_amount.toString());
    setUnitStatus(u.status);
    setTenantName(u.tenant_name || '');
    setTenantPhone(u.tenant_phone || '');
    setUnitOpen(true);
  };

  const occupiedCount = units.filter(u => u.status === 'Occupied').length;
  const vacantCount = units.filter(u => u.status === 'Vacant').length;
  const totalRent = units.filter(u => u.status === 'Occupied').reduce((sum, u) => sum + u.rent_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Rent Management</h2>
          <p className="text-muted-foreground">Manage properties, units, and tenants</p>
        </div>
        <Button onClick={openAddProp} className="bg-gradient-to-r from-indigo-600 to-slate-900 hover:from-slate-900 hover:to-indigo-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">
          <Plus className="mr-2 h-4 w-4" /> Add Property
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', val: units.length, color: 'text-black' },
          { label: 'Occupied', val: occupiedCount, color: 'text-green-600' },
          { label: 'Vacant', val: vacantCount, color: 'text-blue-600' },
          { label: 'Est. Monthly Revenue', val: `$${totalRent.toLocaleString()}`, color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="border border-slate-200 rounded-3xl shadow-sm bg-white">
            <Card className="border-none h-full">
              <CardHeader className="pb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.val}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {properties.map(prop => (
          <div key={prop.id} className="border border-slate-200 rounded-3xl shadow-sm bg-white">
            <Card className="overflow-hidden border-none">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-64 h-48 md:h-auto relative">
                  <img 
                    src={prop.image_url || `https://picsum.photos/seed/${prop.id}/400/300`} 
                    alt={prop.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button size="icon-sm" variant="secondary" className="h-8 w-8" onClick={() => openEditProp(prop)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon-sm" variant="destructive" className="h-8 w-8" onClick={() => deleteProperty(prop.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-serif font-bold">{prop.name}</h3>
                      <p className="text-sm text-muted-foreground">{prop.address}</p>
                    </div>
                    <Button size="sm" onClick={() => openAddUnit(prop.id)} className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">
                      <Plus className="mr-2 h-4 w-4" /> Add Unit
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {units.filter(u => u.property_id === prop.id).map(unit => (
                      <div key={unit.id} className="border border-slate-200 rounded-3xl shadow-sm bg-white">
                        <div className="p-4 rounded-xl border-none bg-muted/30 hover:bg-muted/50 transition-colors relative group h-full">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-lg font-bold">Unit {unit.unit_number}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${unit.status === 'Occupied' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                              {unit.status}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="font-bold text-red-500">${unit.rent_amount}/mo</p>
                            {unit.status === 'Occupied' ? (
                              <>
                                <p className="font-medium truncate">{unit.tenant_name}</p>
                                <p className="text-xs text-muted-foreground">{unit.tenant_phone}</p>
                                <div className="pt-2 flex gap-1">
                                  <Button 
                                    size="sm" 
                                    className="flex-1 h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200"
                                    onClick={() => {
                                      setCollectUnit(unit);
                                      setCollectAmount(unit.rent_amount.toString());
                                      setCollectOpen(true);
                                    }}
                                  >
                                    Collect Rent
                                  </Button>
                                  <Button 
                                    size="icon-sm" 
                                    variant="outline" 
                                    className="h-7 w-7"
                                    onClick={() => fetchHistory(unit)}
                                  >
                                    <History className="h-3 w-3" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Ready for lease</p>
                            )}
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                            <Button size="icon-sm" variant="ghost" className="h-7 w-7" onClick={() => openEditUnit(unit)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="icon-sm" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteUnit(unit.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {units.filter(u => u.property_id === prop.id).length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl text-muted-foreground bg-muted/10">
                        <p className="mb-4">No units added to this property yet.</p>
                        <Button size="sm" onClick={() => openAddUnit(prop.id)} className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">
                          <Plus className="mr-2 h-4 w-4" /> Add Your First Unit
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
        {properties.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed">
            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-serif font-bold">No Properties Found</h3>
            <p className="text-muted-foreground mb-6">Start by adding your first property building.</p>
            <Button onClick={openAddProp} className="bg-gradient-to-r from-indigo-600 to-slate-900 hover:from-slate-900 hover:to-indigo-700 text-white border-none shadow-md hover:shadow-lg transition-all duration-200">Add Property</Button>
          </div>
        )}
      </div>

      {/* Property Dialog */}
      <Dialog open={propOpen} onOpenChange={setPropOpen}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-3xl">
          <form onSubmit={handlePropertySubmit}>
            <DialogHeader>
              <DialogTitle>{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Property Name</Label>
                <Input value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="e.g. JK Heights" required />
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input value={propAddress} onChange={(e) => setPropAddress(e.target.value)} placeholder="Full Address" required />
              </div>
              <div className="grid gap-2">
                <Label>Property Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setPropFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : (editingProperty ? 'Update' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-3xl">
          <form onSubmit={handleUnitSubmit}>
            <DialogHeader>
              <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Unit Number / Name</Label>
                <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="e.g. 4A or Room 101" required />
              </div>
              <div className="grid gap-2">
                <Label>Monthly Rent Amount</Label>
                <Input type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={unitStatus}
                  onChange={(e) => setUnitStatus(e.target.value as any)}
                >
                  <option value="Vacant">Vacant</option>
                  <option value="Occupied">Occupied</option>
                </select>
              </div>
              {unitStatus === 'Occupied' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t">
                  <div className="grid gap-2">
                    <Label>Tenant Name</Label>
                    <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Full Name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tenant Phone</Label>
                    <Input value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} placeholder="017..." />
                  </div>
                </motion.div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : (editingUnit ? 'Update' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rent Collection Dialog */}
      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="border border-slate-200 shadow-xl rounded-3xl">
          <form onSubmit={handleCollectRent}>
            <DialogHeader>
              <DialogTitle>Collect Rent (Room Vara)</DialogTitle>
              <DialogDescription>
                Recording payment for Unit {collectUnit?.unit_number} - {collectUnit?.tenant_name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Payment Category</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={collectCategory}
                  onChange={(e) => setCollectCategory(e.target.value)}
                >
                  {rentCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Amount Received</Label>
                <Input type="number" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label>For Month/Year</Label>
                <Input value={collectMonth} onChange={(e) => setCollectMonth(e.target.value)} placeholder="e.g. April 2026" required />
              </div>
              <div className="grid gap-2">
                <Label>Description (Optional)</Label>
                <Input value={collectDesc} onChange={(e) => setCollectDesc(e.target.value)} placeholder="e.g. Paid via Bkash" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isProcessing} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-none shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'Confirm Collection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rent History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md border border-slate-200 shadow-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Rent History</DialogTitle>
            <DialogDescription>
              Unit {historyUnit?.unit_number} - {historyUnit?.tenant_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {historyLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6" /></div>
            ) : historyPayments.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {historyPayments.map(p => (
                  <div key={p.id} className="p-3 rounded-lg border bg-muted/30 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{p.month_year}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium">{p.category || 'Room Vara'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</p>
                      {p.description && <p className="text-[10px] italic mt-1">{p.description}</p>}
                    </div>
                    <p className="font-bold text-green-600">${p.amount}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground italic">No payments recorded yet.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar */}
      <aside className="w-80 bg-white/95 backdrop-blur-xl border-r border-slate-200/60 shadow-xl shadow-slate-900/5 flex flex-col">
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200/60">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg">
              <img
                src="/logo.svg"
                alt="JK_IT Logo"
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const title = document.createElement('h1');
                    title.className = 'text-xl font-serif font-bold text-white';
                    title.innerText = 'JK';
                    parent.appendChild(title);
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-900">JK IT</h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Management Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'team', label: 'Team Members', icon: Users },
            { id: 'due', label: 'Due Management', icon: CreditCard },
            { id: 'expenses', label: 'Expenses', icon: Wallet },
            { id: 'rent', label: 'Rent Management', icon: Home },
          ].map((item) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full group flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow-xl shadow-slate-900/25 transform scale-[1.02]'
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 hover:text-slate-900 hover:shadow-lg hover:shadow-slate-200/50'
              }`}
            >
              <item.icon className={`h-5 w-5 transition-all duration-300 ${
                activeTab === item.id ? 'scale-110 rotate-3' : 'group-hover:scale-105 group-hover:rotate-1'
              }`} />
              <span className="font-medium tracking-wide">{item.label}</span>
              {activeTab === item.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-2 h-2 bg-white rounded-full opacity-80"
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-200/60">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 mb-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200/60 shadow-sm"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-md">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Administrator</p>
            </div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 border border-red-200 hover:border-red-500 rounded-2xl py-3 font-medium transition-all duration-300 shadow-sm hover:shadow-lg"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </motion.div>
          <div className="mt-5 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
            Developed by Sinthiya Telecom
            <br />
            Md. Abdul Momin
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {activeTab === 'overview' && <Overview setActiveTab={setActiveTab} user={user} />}
            {activeTab === 'team' && <TeamMembers user={user} />}
            {activeTab === 'due' && <DueManagement user={user} />}
            {activeTab === 'expenses' && <Expenses user={user} />}
            {activeTab === 'rent' && <RentManagement user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
