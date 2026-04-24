
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
} from "recharts";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  RefreshCw,
  XCircle,
} from "lucide-react";

interface DashboardData {
  totalPlanning: number;
  approved: number;
  pending: number;
  rejected: number;
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
      // Fetch data from Supabase indent table
      // Using only columns that exist in your schema
      const { data: indentData, error: supabaseError } = await supabase
        .from("planning_master")
        .select(`
          id,
          planning_no,
          date,
          vendor_name,
          status,
          planning_item_master (id)
        `)
        .order("id", { ascending: false });

      if (supabaseError) {
        console.error("[Dashboard] Supabase error details:", supabaseError);
        throw new Error(`Supabase error: ${supabaseError.message}`);
      }

      if (!indentData || indentData.length === 0) {
        console.log("[Dashboard] No data found in indent table");
        setData({
          totalPlanning: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          activeVendors: 0,
          approvedOrders: [],
          monthlyData: [],
          statusData: [],
        });
        setLoading(false);
        return;
      }

      console.log("[Dashboard] Fetched data count:", indentData.length);
      
      // Process data to calculate stats
      const processedData = processDashboardData(indentData);
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

  const processDashboardData = (indentData: any[]): DashboardData => {
    if (!indentData || indentData.length === 0) {
      return {
        totalPlanning: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        activeVendors: 0,
        approvedOrders: [],
        monthlyData: [],
        statusData: [],
      };
    }

    let totalPlanning = indentData.length;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    const approvedOrders: Array<{ id: string; planningNo: string; description: string }> = [];
    const vendorSet = new Set<string>();
    const monthlyStats: Record<
      string,
      { planning: number; approved: number; received: number }
    > = {};

    indentData.forEach((row, index) => {
      // Process vendor names
      const vendorName = row.vendor_name?.toString().trim() || "";
      if (vendorName) vendorSet.add(vendorName);

      // Process status - status comes primarily from planning_master now!!
      const masterStatus = row.status?.toString().toLowerCase() || "";
      const items = row.planning_item_master || [];

      if (masterStatus === "approved") {
        approved++;
        approvedOrders.push({
          id: `approved-${row.id || index}`,
          planningNo: row.planning_no || "",
          description: `${items.length} item(s) in ${row.planning_no || "N/A"}`,
        });
      } else if (
        masterStatus === "pending" ||
        masterStatus === "pending review" ||
        !masterStatus
      ) {
        pending++;
      } else if (masterStatus === "rejected") {
        rejected++;
      }

      // Monthly stats (using date field)
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
            if (masterStatus === "approved") monthlyStats[month].approved++;
          }
        } catch (e) {
          console.warn(`Invalid date format for row: ${dateValue}`);
        }
      }
    });

    // Calculate monthly data
    const monthlyData = Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      planning: stats.planning,
      approved: stats.approved,
      received: Math.floor(stats.approved * 0.9), // Estimate received as 90% of approved
    }));

    // Sort monthly data by date
    monthlyData.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

    // Status data
    const statusData = [
      { name: "Approved", value: approved, color: "#10B981" },
      { name: "Pending", value: pending, color: "#F59E0B" },
      { name: "Rejected", value: rejected, color: "#EF4444" },
    ];

    console.log("[Dashboard] Processed stats:", {
      totalPlanning,
      approved,
      pending,
      rejected,
      activeVendors: vendorSet.size,
      approvedOrdersCount: approvedOrders.length,
    });

    return {
      totalPlanning,
      approved,
      pending,
      rejected,
      activeVendors: vendorSet.size,
      approvedOrders: approvedOrders.slice(0, 10), // Limit to latest 10
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
          title: "Total Planning Requests",
          value: data.totalPlanning.toLocaleString(),
          change: "+12.5%",
          changeType: "positive" as const,
          icon: Package,
          color: "bg-blue-500",
        },
        {
          title: "Approved Orders",
          value: data.approved.toLocaleString(),
          change: "+8.2%",
          changeType: "positive" as const,
          icon: CheckCircle,
          color: "bg-green-500",
        },
        {
          title: "Pending Approvals",
          value: data.pending.toLocaleString(),
          change: "-5.1%",
          changeType: "negative" as const,
          icon: Clock,
          color: "bg-yellow-500",
        },
        {
          title: "Active Vendors",
          value: data.activeVendors.toLocaleString(),
          change: "+3.8%",
          changeType: "positive" as const,
          icon: Users,
          color: "bg-purple-500",
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
                className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <div className="flex items-center mt-2">
                      <span
                        className={`text-sm font-medium ${
                          stat.changeType === "positive"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="ml-1 text-sm text-gray-500">
                        from last month
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Grid */}
      {!loading && !error && data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Progress Chart */}
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Monthly Progress
            </h3>
            {data.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="planning"
                    fill="#3B82F6"
                    name="Planning"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="approved"
                    fill="#10B981"
                    name="Approved"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="received"
                    fill="#6366F1"
                    name="Received"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64 text-gray-500">
                No monthly data available
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Status Distribution
            </h3>
            {data.statusData.some(s => s.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.statusData.filter(s => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {data.statusData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm text-gray-600">
                        {item.name}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-64 text-gray-500">
                No status data available
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
      {!loading && !error && (!data || data.totalPlanning === 0) && (
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