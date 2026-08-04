import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Line,
  Legend,
  ComposedChart
} from "recharts";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  RefreshCw,
  XCircle,
  FileText,
  CreditCard,
} from "lucide-react";

interface DashboardData {
  planning: { total: number; pending: number };
  purchaseOrder: { total: number; pending: number };
  receipt: { total: number; pending: number };
  payment: { total: number; pending: number; totalAmount: number };
  activeVendors: number;
  approvedOrders: Array<{ id: string; planningNo: string; description: string }>;
  monthlyData: Array<{
    month: string;
    planning: number;
    approved: number;
    received: number;
  }>;
  statusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Planning Data
      const { data: planningData, error: planningError } = await supabase
        .from("planning_master")
        .select("id, status, vendor_name, date, planning_no");

      if (planningError) throw planningError;

      // 2. Fetch Purchase Order Data
      const { data: poData, error: poError } = await supabase
        .from("purchase_order_master")
        .select("id, status, planning_no");

      if (poError) throw poError;

      // 3. Fetch Receipt Data
      const { data: receiptData, error: receiptError } = await supabase
        .from("receipt_master")
        .select("id, planning_no, total_invoice_amount");

      if (receiptError) throw receiptError;

      const { data: receiptItemData, error: receiptItemError } = await supabase
        .from("receipt_item_master")
        .select("planning_no, remaining_qty, received_status");

      if (receiptItemError) throw receiptItemError;

      // 4. Fetch Payment Data
      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_master")
        .select("id, planning_no, amount, deduction");

      if (paymentError) throw paymentError;

      // Process all data
      const processedData = processDashboardData({
        planningData: planningData || [],
        poData: poData || [],
        receiptData: receiptData || [],
        receiptItemData: receiptItemData || [],
        paymentData: paymentData || []
      });

      setData(processedData);
    } catch (err) {
      console.error("[Dashboard] Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (allData: {
    planningData: any[];
    poData: any[];
    receiptData: any[];
    receiptItemData: any[];
    paymentData: any[];
  }): DashboardData => {
    const { planningData, poData, receiptData, receiptItemData, paymentData } = allData;

    // 1. Planning Request Stats
    const totalPlanning = planningData.length;
    const pendingPlanning = planningData.filter(
      (r) => !r.status || r.status.toLowerCase() === "pending"
    ).length;
    const approvedPlanningCount = planningData.filter(
      (r) => r.status?.toLowerCase() === "approved"
    ).length;
    const rejectedPlanningCount = planningData.filter(
      (r) => r.status?.toLowerCase() === "rejected"
    ).length;

    // 2. Purchase Order Stats
    const totalPO = poData.length;
    const pendingPO = poData.filter(
      (r) => !r.status || r.status.toLowerCase() === "pending"
    ).length;
    const approvedPOData = poData.filter(
      (r) => r.status?.toLowerCase() === "approved"
    );

    // 3. Receipt Stats
    const totalReceipt = receiptData.length;
    // Pending Receipt: Approved POs that are not fully received
    // Simplified: Approved POs that don't have a fully received status in receipt_item_master
    const approvedPlanningNos = new Set(approvedPOData.map(po => po.planning_no));
    const receivedPlanningNos = new Set(receiptData.map(r => r.planning_no));

    // Count how many approved POs are still pending receipt
    const pendingReceiptPlanningNos = new Set<string>();
    approvedPOData.forEach(po => {
      const pNo = po.planning_no;
      if (!receivedPlanningNos.has(pNo)) {
        pendingReceiptPlanningNos.add(pNo);
      } else {
        // Has some receipt, check if any item is still remaining
        const hasRemaining = receiptItemData.some(
          item => item.planning_no === pNo && (Number(item.remaining_qty) > 0)
        );
        if (hasRemaining) {
          pendingReceiptPlanningNos.add(pNo);
        }
      }
    });
    const pendingReceipt = pendingReceiptPlanningNos.size;

    // 4. Payment Stats
    const totalPayment = paymentData.length;
    const totalPaymentAmount = paymentData.reduce((acc, p) => acc + (Number(p.amount) || 0) + (Number(p.deduction) || 0), 0);
    
    // Pending Payment: Planning numbers where total invoiced > total paid
    const paymentMap: Record<string, number> = {};
    paymentData.forEach(p => {
      const pNo = p.planning_no;
      paymentMap[pNo] = (paymentMap[pNo] || 0) + (Number(p.amount) || 0) + (Number(p.deduction) || 0);
    });

    const receiptTotalMap: Record<string, number> = {};
    receiptData.forEach(r => {
      const pNo = r.planning_no;
      receiptTotalMap[pNo] = (receiptTotalMap[pNo] || 0) + (Number(r.total_invoice_amount) || 0);
    });

    const pendingPaymentPlanningNos = new Set<string>();
    Object.entries(receiptTotalMap).forEach(([pNo, totalInvoice]) => {
      const paidAmount = paymentMap[pNo] || 0;
      if (totalInvoice > paidAmount) {
        pendingPaymentPlanningNos.add(pNo);
      }
    });
    const pendingPayment = pendingPaymentPlanningNos.size;

    // 5. Vendor and other data
    const vendorSet = new Set<string>();
    planningData.forEach((row) => {
      const vendorName = row.vendor_name?.toString().trim() || "";
      if (vendorName) vendorSet.add(vendorName);
    });

    const approvedOrders = planningData
      .filter(r => r.status?.toLowerCase() === "approved")
      .slice(0, 10)
      .map(r => ({
        id: r.id.toString(),
        planningNo: r.planning_no || "",
        description: `Approved request for ${r.vendor_name || "N/A"}`,
      }));

    // Monthly stats (using planning data for consistency)
    const monthlyStats: Record<
      string,
      { planning: number; approved: number; received: number }
    > = {};

    planningData.forEach((row) => {
      const dateValue = row.date;
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            const month = date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
            if (!monthlyStats[month]) {
              monthlyStats[month] = { planning: 0, approved: 0, received: 0 };
            }
            monthlyStats[month].planning++;
            if (row.status?.toLowerCase() === "approved") monthlyStats[month].approved++;
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    // Sort and calculate monthly data
    const monthlyData = Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month,
        planning: stats.planning,
        approved: stats.approved,
        received: Math.floor(stats.approved * 0.9), // Keep existing estimation logic
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Status data (Planning status distribution)
    const statusData = [
      { name: "Approved", value: approvedPlanningCount, color: "#10B981" },
      { name: "Pending", value: pendingPlanning, color: "#F59E0B" },
      { name: "Rejected", value: rejectedPlanningCount, color: "#EF4444" },
    ];

    return {
      planning: { total: totalPlanning, pending: pendingPlanning },
      purchaseOrder: { total: totalPO, pending: pendingPO },
      receipt: { total: totalReceipt, pending: pendingReceipt },
      payment: { total: totalPayment, pending: pendingPayment, totalAmount: totalPaymentAmount },
      activeVendors: vendorSet.size,
      approvedOrders,
      monthlyData,
      statusData,
    };
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = data
    ? [
      {
        title: "Planning Request",
        value: data.planning.total,
        pending: data.planning.pending,
        icon: Package,
        color: "from-blue-600 to-blue-400",
        lightColor: "bg-blue-50",
        textColor: "text-blue-700"
      },
      {
        title: "Purchase Order",
        value: data.purchaseOrder.total,
        pending: data.purchaseOrder.pending,
        icon: FileText,
        color: "from-emerald-600 to-emerald-400",
        lightColor: "bg-emerald-50",
        textColor: "text-emerald-700"
      },
      {
        title: "No of Receipt",
        value: data.receipt.total,
        pending: data.receipt.pending,
        icon: CheckCircle,
        color: "from-amber-600 to-amber-400",
        lightColor: "bg-amber-50",
        textColor: "text-amber-700"
      },
      {
        title: "Payment",
        value: data.payment.totalAmount,
        pending: data.payment.pending,
        icon: CreditCard,
        color: "from-violet-600 to-violet-400",
        lightColor: "bg-violet-50",
        textColor: "text-violet-700",
        isCurrency: true
      },
    ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-gray-600">
              Monitor your delivery operations and track key performance metrics
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 text-red-600 bg-red-100 rounded-lg border border-red-200">
          <div className="flex items-center">
            <XCircle className="mr-2 w-4 h-4" />
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin" />
        </div>
      )}

      {/* Stats Grid */}
      {!loading && !error && stats.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="relative overflow-hidden p-6 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-black text-gray-900">
                      {stat.isCurrency ? "₹" : ""}{stat.value.toLocaleString()}
                    </p>
                    <div className={`inline-flex items-center mt-3 px-2 py-1 rounded-lg ${stat.lightColor} ${stat.textColor} text-xs font-bold`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {stat.title === "Payment" ? "Pending Indents: " : "Pending: "}{stat.pending.toLocaleString()}
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                {/* Decorative background circle */}
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Grid */}
      {!loading && !error && data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Operations Health Stack (Half Width - Swapped to Top) */}
          <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900">
                Operations Health Stack
              </h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Total</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Pending</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: "Planning", total: data.planning.total, pending: data.planning.pending },
                  { name: "PO", total: data.purchaseOrder.total, pending: data.purchaseOrder.pending },
                  { name: "Receipt", total: data.receipt.total, pending: data.receipt.pending },
                  { name: "Payment", total: data.payment.total, pending: data.payment.pending },
                ]}
              >
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
                    <stop offset="100%" stopColor="#FCD34D" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="url(#totalGradient)"
                  name="Total"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  stackId="a"
                />
                <Bar
                  dataKey="pending"
                  fill="url(#pendingGradient)"
                  name="Pending"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  stackId="b"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Process Health (Doughnut - Half Width) */}
          <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="mb-6 text-lg font-bold text-gray-900">
              Process Health
            </h3>
            {data.statusData.some(s => s.value > 0) ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.statusData.filter(s => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.statusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="hover:opacity-80 transition-opacity duration-300"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-10">
                  <span className="text-3xl font-black text-gray-900">{data.statusData.reduce((acc, curr) => acc + curr.value, 0)}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Indents</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {data.statusData.map((item, index) => (
                    <div key={index} className="flex flex-col items-center p-2 rounded-xl bg-gray-50">
                      <div
                        className="w-2 h-2 rounded-full mb-1"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{item.name}</span>
                      <span className="text-sm font-black text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 text-gray-500">
                No status data available
              </div>
            )}
          </div>

          {/* Monthly Performance Trends (Full Width - Swapped to Bottom) */}
          <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Monthly Performance Trends
              </h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Planning Volume</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Approval Rate</span>
                </div>
              </div>
            </div>
            {data.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data.monthlyData}>
                  <defs>
                    <linearGradient id="colorPlanningFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApprovedFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    padding={{ left: 20, right: 20 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "none",
                      borderRadius: "16px",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(8px)"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="planning"
                    stroke="#3B82F6"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorPlanningFull)"
                    name="Planning"
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    stroke="#10B981"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorApprovedFull)"
                    name="Approved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64 text-gray-500 font-medium">
                No monthly trends to display
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approved Orders */}
      {!loading && !error && data && data.approvedOrders && data.approvedOrders.length > 0 && (
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Approved Orders
          </h3>
          <div className="space-y-2">
            {data.approvedOrders.map((order, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-green-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-green-900">
                    {order.planningNo}
                  </span>
                  <span className="ml-2 text-green-700">
                    {order.description}
                  </span>
                </div>
                <span className="px-2 py-1 text-sm text-green-800 bg-green-100 rounded">
                  Approved
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && (!data || data.planning.total === 0) && (
        <div className="py-16 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-center items-center mx-auto mb-6 w-24 h-24 bg-gray-100 rounded-full">
            <AlertTriangle className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            No data available
          </h3>
          <p className="mb-6 text-gray-500">
            Unable to load dashboard data from indent table
          </p>
          <button
            onClick={fetchDashboardData}
            className="inline-flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;