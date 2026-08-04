import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  CheckCircle2,
  Clock,
  IndianRupee,
  FileSpreadsheet,
  Eye,
  X,
  FileText,
  User,
  Phone,
  Calendar,
  ExternalLink,
  ClipboardList,
  Layers,
  MapPin,
  FileCheck,
  ImageIcon,
  ShieldAlert,
  Download,
  Filter,
  Package,
  Receipt,
  Building2,
  CreditCard,
  Tag,
} from "lucide-react";
import { marketModeSupabase } from "../lib/supabase";

interface SalesCall {
  id: number;
  enquiry_number: string | null;
  planned: string | null;
  actual: string | null;
  delay: string | null;
  customer_feedback: string | null;
  stage: string | null;
  next_call_date: string | null;
  value_order: string | null;
}

interface AssignSurvey {
  id: number;
  enquiry_id: number;
  planned_1: string | null;
  actual_1: string | null;
  delay_1: string | null;
  survey_date: string | null;
  created_at: string | null;
  phase: string | null;
  backup_hours: string | null;
  no_of_floors: string | null;
  roof_top_area: string | null;
  grid_supply_available: string | null;
  control_room_space: string | null;
  control_room_area: string | null;
  distance_modules_to_control_room: string | null;
  distance_module_to_dcdb_earthing: string | null;
  distance_inverter_acdb_to_earthing: string | null;
  distance_la_to_earthing: string | null;
  distance_inverter_mcb_meter: string | null;
  shadow_free_area_terrace: string | null;
  geotag_photos: any | null;
  electricity_bills_3months: any | null;
  id_proof: string | null;
  address_proof: string | null;
  surveyor_name: string | null;
  surveyor_contact: string | null;
  pdf_generate: string | null;
}

interface EnquiryDetails {
  id?: number;
  enquiry_number?: string;
  beneficiary_name?: string;
  contact_number?: string;
  bp_number?: string;
  village_block?: string;
  district?: string;
  present_load?: string;
  cspdcl_contract_demand?: string;
  future_load_requirement?: string;
  system_type?: string;
  address?: string;
  load_details?: string;
}

interface Quotation {
  id: number;
  enquiry_number: string | null;
  planned: string | null;
  actual: string | null;
  delay: number | null;
  product: string | null;
  salesperson: string | null;
  customer: string | null;
  contact_no: string | null;
  email: string | null;
  dealer: string | null;
  alternative_phone_no: string | null;
  structure_type: string | null;
  place_of_installation: string | null;
  terms_conditions: string | null;
  qty: number | null;
  central_subsidy: number | null;
  state_subsidy: number | null;
  discount_percent: number | null;
  need_type: string | null;
  reference_by: string | null;
  bank_name: string | null;
  account_no: string | null;
  ifsc_code: string | null;
  branch: string | null;
  general_terms_conditions: string | null;
  load_details: string | null;
  product_name: string | null;
  bill_of_material: string | null;
  size: string | null;
  gst: number | null;
  rate: number | null;
  amount: number | null;
  net_cost: number | null;
  quatation_copy: string | null;
  quotation_date: string | null;
  send_status: string | null;
  send_status_time: string | null;
  status: string | null;
  created_at: string | null;
}

const MarketModeOrder = () => {
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [quotationsMap, setQuotationsMap] = useState<Record<string, Quotation>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("ALL");

  // Modal State
  const [selectedCall, setSelectedCall] = useState<SalesCall | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [surveyData, setSurveyData] = useState<AssignSurvey | null>(null);
  const [enquiryData, setEnquiryData] = useState<EnquiryDetails | null>(null);
  const [quotationData, setQuotationData] = useState<Quotation | null>(null);
  const [activeTab, setActiveTab] = useState<"quotation" | "overview" | "technical" | "distance" | "documents">("quotation");

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await marketModeSupabase
        .from("sales_calls")
        .select("*")
        .order("id", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const orderReceivedData = (data || []).filter(
        (item: SalesCall) =>
          item.stage && item.stage.trim().toLowerCase() === "order received"
      );

      setCalls(orderReceivedData);

      // Fetch quotations linked by enquiry_number
      const enquiryNumbers = orderReceivedData
        .map((item) => item.enquiry_number)
        .filter((num): num is string => Boolean(num && num.trim() !== ""));

      if (enquiryNumbers.length > 0) {
        const { data: qData, error: qError } = await marketModeSupabase
          .from("new_quatation_create")
          .select("*")
          .in("enquiry_number", enquiryNumbers);

        if (!qError && qData) {
          const qMap: Record<string, Quotation> = {};
          qData.forEach((q: Quotation) => {
            if (q.enquiry_number) {
              qMap[q.enquiry_number] = q;
            }
          });
          setQuotationsMap(qMap);
        }
      }
    } catch (err: any) {
      console.error("Error fetching market mode orders:", err);
      setError(err?.message || "Failed to fetch market mode orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRowClick = async (call: SalesCall) => {
    setSelectedCall(call);
    setShowModal(true);
    setModalLoading(true);
    setModalError(null);
    setSurveyData(null);
    setEnquiryData(null);
    setQuotationData(null);
    setActiveTab("quotation");

    if (!call.enquiry_number) {
      setModalError("No Enquiry Number found for this order.");
      setModalLoading(false);
      return;
    }

    try {
      // Fetch Quotation Data
      const { data: qSingle, error: qErr } = await marketModeSupabase
        .from("new_quatation_create")
        .select("*")
        .eq("enquiry_number", call.enquiry_number)
        .maybeSingle();

      if (!qErr && qSingle) {
        setQuotationData(qSingle);
      } else if (quotationsMap[call.enquiry_number]) {
        setQuotationData(quotationsMap[call.enquiry_number]);
      }

      // Fetch Enquiry Details
      const { data: enq, error: enqErr } = await marketModeSupabase
        .from("enquiries")
        .select("*")
        .eq("enquiry_number", call.enquiry_number)
        .maybeSingle();

      if (enqErr) {
        console.warn("Could not fetch enquiry details:", enqErr);
      }

      if (enq) {
        setEnquiryData(enq);
        const { data: survey, error: surveyErr } = await marketModeSupabase
          .from("assign_survey")
          .select("*")
          .eq("enquiry_id", enq.id)
          .maybeSingle();

        if (surveyErr) throw surveyErr;
        setSurveyData(survey);
      } else {
        const { data: surveyJoin } = await marketModeSupabase
          .from("assign_survey")
          .select("*, enquiries!inner(*)")
          .eq("enquiries.enquiry_number", call.enquiry_number)
          .maybeSingle();

        if (surveyJoin) {
          setSurveyData(surveyJoin);
          setEnquiryData(surveyJoin.enquiries);
        } else if (!isNaN(Number(call.enquiry_number))) {
          const { data: directSurvey } = await marketModeSupabase
            .from("assign_survey")
            .select("*")
            .eq("enquiry_id", Number(call.enquiry_number))
            .maybeSingle();

          if (directSurvey) {
            setSurveyData(directSurvey);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching survey or quotation details:", err);
      setModalError(err?.message || "Failed to load order details.");
    } finally {
      setModalLoading(false);
    }
  };

  // Extract unique products for dropdown filter
  const productOptions = Array.from(
    new Set(
      Object.values(quotationsMap)
        .flatMap((q) => [q.product_name, q.product])
        .filter((p): p is string => Boolean(p && p.trim() !== ""))
    )
  ).sort();

  // Filtered orders list
  const filteredCalls = calls.filter((item) => {
    const term = searchTerm.toLowerCase();
    const q = quotationsMap[item.enquiry_number || ""];

    const matchesSearch =
      (item.enquiry_number && item.enquiry_number.toLowerCase().includes(term)) ||
      (item.customer_feedback && item.customer_feedback.toLowerCase().includes(term)) ||
      (item.delay && item.delay.toLowerCase().includes(term)) ||
      (item.value_order && item.value_order.toLowerCase().includes(term)) ||
      (item.id && item.id.toString().includes(term)) ||
      (q?.product_name && q.product_name.toLowerCase().includes(term)) ||
      (q?.product && q.product.toLowerCase().includes(term)) ||
      (q?.salesperson && q.salesperson.toLowerCase().includes(term)) ||
      (q?.customer && q.customer.toLowerCase().includes(term));

    const matchesProduct =
      selectedProductFilter === "ALL" ||
      (q && (q.product_name === selectedProductFilter || q.product === selectedProductFilter));

    return matchesSearch && matchesProduct;
  });

  const totalOrders = calls.length;
  const totalOrderValue = calls.reduce((acc, curr) => {
    if (!curr.value_order) return acc;
    const cleaned = curr.value_order.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleaned);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const delayedCallsCount = calls.filter(
    (c) => c.delay && c.delay.trim() !== "" && c.delay.trim() !== "0" && c.delay.trim() !== "-"
  ).length;

  const linkedQuotationsCount = Object.keys(quotationsMap).length;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return (
        d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        " " +
        d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      return dateStr;
    }
  };

  const parseJsonArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v) => String(v));
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map((v) => String(v));
        return [val];
      } catch {
        return [val];
      }
    }
    return [];
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (filteredCalls.length === 0) {
      alert("No records available to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Enquiry Number",
      "Stage",
      "Planned Date",
      "Actual Date",
      "Delay",
      "Next Call Date",
      "Value Order",
      "Customer Feedback",
      "Product Category",
      "Product Name",
      "Size",
      "Qty",
      "Rate (Rs)",
      "Amount (Rs)",
      "GST (%)",
      "Net Cost (Rs)",
      "Customer Name",
      "Contact No",
      "Salesperson",
      "Dealer",
      "Quotation Date",
      "Quotation Status",
    ];

    const csvRows = [headers.join(",")];

    filteredCalls.forEach((call) => {
      const q = quotationsMap[call.enquiry_number || ""] || {};

      const row = [
        call.id || "",
        `"${(call.enquiry_number || "").replace(/"/g, '""')}"`,
        `"${(call.stage || "").replace(/"/g, '""')}"`,
        `"${(formatDate(call.planned) || "").replace(/"/g, '""')}"`,
        `"${(formatDateTime(call.actual) || "").replace(/"/g, '""')}"`,
        `"${(call.delay || "").replace(/"/g, '""')}"`,
        `"${(formatDate(call.next_call_date) || "").replace(/"/g, '""')}"`,
        `"${(call.value_order || "").replace(/"/g, '""')}"`,
        `"${(call.customer_feedback || "").replace(/"/g, '""')}"`,
        `"${(q.product || "").replace(/"/g, '""')}"`,
        `"${(q.product_name || "").replace(/"/g, '""')}"`,
        `"${(q.size || "").replace(/"/g, '""')}"`,
        q.qty ?? "",
        q.rate ?? "",
        q.amount ?? "",
        q.gst ?? "",
        q.net_cost ?? "",
        `"${(q.customer || "").replace(/"/g, '""')}"`,
        `"${(q.contact_no || "").replace(/"/g, '""')}"`,
        `"${(q.salesperson || "").replace(/"/g, '""')}"`,
        `"${(q.dealer || "").replace(/"/g, '""')}"`,
        `"${(q.quotation_date || "").replace(/"/g, '""')}"`,
        `"${(q.status || "").replace(/"/g, '""')}"`,
      ];

      csvRows.push(row.join(","));
    });

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Market_Mode_Orders_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Market Mode Order
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Sales Calls with stage <span className="font-semibold text-emerald-600">Order Received</span> & Quotation details
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium shadow-sm transition-all duration-200"
            title="Export filtered records to Excel/CSV"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {totalOrders}
            </h3>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Order Received
            </span>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Order Value</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              ₹{totalOrderValue.toLocaleString("en-IN")}
            </h3>
            <span className="text-xs text-gray-400 mt-1 block">
              Combined order value
            </span>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <IndianRupee className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Quotations Linked</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {linkedQuotationsCount}
            </h3>
            <span className="text-xs text-indigo-600 mt-1 block font-medium">
              Quotation records available
            </span>
          </div>
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Receipt className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Delayed Calls</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">
              {delayedCallsCount}
            </h3>
            <span className="text-xs text-amber-600 mt-1 block font-medium">
              Calls with reported delay
            </span>
          </div>
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Controls Bar: Search & Product Filter */}
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search enquiry, product, salesperson..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Product Filter Dropdown */}
            <div className="relative w-full sm:w-64">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none text-gray-700 font-medium cursor-pointer"
              >
                <option value="ALL">All Products (Filter)</option>
                {productOptions.map((prod, idx) => (
                  <option key={idx} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium self-end md:self-auto">
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Click row for full Quotation & Survey details
            </span>
            <span>
              Showing {filteredCalls.length} of {calls.length} records
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error Loading Data</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 whitespace-nowrap">
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Enquiry Number</th>
                <th className="px-5 py-3.5">Product Name / Details</th>
                <th className="px-5 py-3.5">Net Cost</th>
                <th className="px-5 py-3.5">Salesperson / Customer</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Planned Date</th>
                <th className="px-5 py-3.5">Actual Date</th>
                <th className="px-5 py-3.5">Delay</th>
                <th className="px-5 py-3.5">Next Call</th>
                <th className="px-5 py-3.5">Value Order</th>
                <th className="px-5 py-3.5">Quotation Copy</th>
                <th className="px-5 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="font-medium text-sm">Loading Market Mode Orders & Quotations...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                      <FileSpreadsheet className="w-10 h-10 stroke-1" />
                      <p className="text-base font-medium text-gray-600">No orders found</p>
                      <p className="text-xs text-gray-400">
                        {searchTerm || selectedProductFilter !== "ALL"
                          ? "No matching results for your search or product filter."
                          : 'No sales calls with stage "Order Received" were found.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((item) => {
                  const q = quotationsMap[item.enquiry_number || ""];

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors duration-150 group"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">
                        #{item.id}
                      </td>
                      <td className="px-5 py-4 font-semibold text-blue-600 group-hover:underline whitespace-nowrap">
                        {item.enquiry_number || "-"}
                      </td>

                      {/* Product Name & Specs */}
                      <td className="px-5 py-4 max-w-xs">
                        {q?.product_name || q?.product ? (
                          <div>
                            <span className="font-semibold text-gray-900 block truncate">
                              {q.product_name || q.product}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                              {q.size && (
                                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                  Size: {q.size}
                                </span>
                              )}
                              {q.qty && (
                                <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-medium">
                                  Qty: {q.qty}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No quotation details</span>
                        )}
                      </td>

                      {/* Net Cost */}
                      <td className="px-5 py-4 whitespace-nowrap font-semibold text-emerald-700">
                        {q?.net_cost != null ? (
                          `₹${q.net_cost.toLocaleString("en-IN")}`
                        ) : q?.rate != null ? (
                          `₹${q.rate.toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-gray-400 font-normal">-</span>
                        )}
                      </td>

                      {/* Salesperson & Customer */}
                      <td className="px-5 py-4 max-w-xs truncate text-xs">
                        {q?.salesperson || q?.customer ? (
                          <div>
                            <p className="font-medium text-gray-800">{q.customer || "-"}</p>
                            <p className="text-gray-400 text-[11px]">SP: {q.salesperson || "-"}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.stage || "Order Received"}
                        </span>
                      </td>

                      {/* Planned & Actual Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-xs">
                        {formatDate(item.planned)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-xs">
                        {formatDateTime(item.actual)}
                      </td>

                      {/* Delay */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.delay && item.delay !== "-" && item.delay !== "0" ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-medium border border-amber-200/50">
                            <Clock className="w-3 h-3" />
                            {item.delay}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Next Call Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-gray-600 text-xs">
                        {formatDate(item.next_call_date)}
                      </td>

                      {/* Value Order */}
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-gray-900 text-xs">
                        {item.value_order ? item.value_order : "-"}
                      </td>

                      {/* Quotation Copy */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {q?.quatation_copy ? (
                          <a
                            href={q.quatation_copy}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" /> Copy
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(item);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Full Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Portal Modal */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md border border-white/20">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Order & Quotation Details</h2>
                    <p className="text-xs text-blue-100 mt-0.5 flex items-center gap-1.5">
                      <span>Enquiry Number:</span>
                      <span className="font-semibold text-white bg-white/20 px-2 py-0.5 rounded text-xs">
                        {selectedCall?.enquiry_number || "-"}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 active:bg-white/30 rounded-xl transition-all text-white flex items-center justify-center"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              {!modalLoading && !modalError && (
                <div className="bg-gray-100/80 px-6 py-2 border-b border-gray-200 flex items-center gap-2 overflow-x-auto flex-shrink-0">
                  <button
                    onClick={() => setActiveTab("quotation")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "quotation"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" /> Quotation Details
                  </button>
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "overview"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Beneficiary & Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab("technical")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "technical"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Technical Specs
                  </button>
                  <button
                    onClick={() => setActiveTab("distance")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "distance"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Distance Specs
                  </button>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === "documents"
                        ? "bg-white text-blue-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Documents & Photos
                  </button>
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-gray-50/50">
                {modalLoading ? (
                  <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="font-medium text-base">Fetching Order & Quotation data...</p>
                  </div>
                ) : modalError ? (
                  <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Notice</p>
                      <p>{modalError}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* TAB 0: QUOTATION DETAILS */}
                    {activeTab === "quotation" && (
                      <div className="space-y-6">
                        {!quotationData ? (
                          <div className="py-12 bg-white rounded-2xl border border-gray-200 text-center p-8">
                            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-800">No Quotation Found</h3>
                            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                              There is no quotation record found for enquiry number{" "}
                              <span className="font-semibold text-gray-700">{selectedCall?.enquiry_number}</span>.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Product & Specifications Card */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                                <Package className="w-4 h-4 text-blue-600" /> Product Overview & Specs
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100/60 sm:col-span-2">
                                  <span className="text-gray-500 block text-[11px]">Product Name</span>
                                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.product_name || quotationData.product || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Product Category</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.product || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Size / Capacity</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.size || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Quantity</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.qty ?? "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Structure Type</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.structure_type || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 sm:col-span-2">
                                  <span className="text-gray-400 block text-[11px]">Place of Installation</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.place_of_installation || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Financial & Pricing Breakdown */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                                <IndianRupee className="w-4 h-4 text-emerald-600" /> Pricing & Financial Details
                              </h3>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                                  <span className="text-gray-500 block text-[11px]">Net Cost</span>
                                  <span className="font-bold text-emerald-700 text-base mt-0.5 block">
                                    {quotationData.net_cost != null ? `₹${quotationData.net_cost.toLocaleString("en-IN")}` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Rate</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.rate != null ? `₹${quotationData.rate.toLocaleString("en-IN")}` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Amount</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.amount != null ? `₹${quotationData.amount.toLocaleString("en-IN")}` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">GST (%)</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.gst != null ? `${quotationData.gst}%` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Central Subsidy</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.central_subsidy != null ? `₹${quotationData.central_subsidy.toLocaleString("en-IN")}` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">State Subsidy</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.state_subsidy != null ? `₹${quotationData.state_subsidy.toLocaleString("en-IN")}` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Discount Percent</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.discount_percent != null ? `${quotationData.discount_percent}%` : "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Quotation Status</span>
                                  <span className="font-semibold text-emerald-600 text-sm mt-0.5 block">
                                    {quotationData.status || "Approved"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Salesperson & Customer Details */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                              <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                                <User className="w-4 h-4 text-indigo-600" /> Customer & Sales Information
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Customer Name</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.customer || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Contact Number</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                                    {quotationData.contact_no || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Email</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block truncate">
                                    {quotationData.email || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Salesperson</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.salesperson || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Dealer</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.dealer || "-"}
                                  </span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                  <span className="text-gray-400 block text-[11px]">Referenced By</span>
                                  <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                    {quotationData.reference_by || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Bank Details */}
                            {(quotationData.bank_name || quotationData.account_no) && (
                              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                                <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                                  <CreditCard className="w-4 h-4 text-purple-600" /> Bank Account Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-400 block text-[11px]">Bank Name</span>
                                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                      {quotationData.bank_name || "-"}
                                    </span>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-400 block text-[11px]">Account No</span>
                                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block font-mono">
                                      {quotationData.account_no || "-"}
                                    </span>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-400 block text-[11px]">IFSC Code</span>
                                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block font-mono">
                                      {quotationData.ifsc_code || "-"}
                                    </span>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-400 block text-[11px]">Branch</span>
                                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                      {quotationData.branch || "-"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Quotation Copy Link & Extra Specs */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800">Quotation Document Copy</h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Quotation Date: {quotationData.quotation_date || "-"}
                                </p>
                              </div>

                              {quotationData.quatation_copy ? (
                                <a
                                  href={quotationData.quatation_copy}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
                                >
                                  <FileText className="w-4 h-4" />
                                  View Quotation Copy
                                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                                  No quotation copy document uploaded
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* TAB 1: OVERVIEW & BENEFICIARY */}
                    {activeTab === "overview" && (
                      <div className="space-y-6">
                        {/* Beneficiary Details */}
                        {enquiryData ? (
                          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                              <User className="w-4 h-4 text-blue-600" /> Beneficiary Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                <span className="text-gray-400 block text-[11px]">Beneficiary Name</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {enquiryData.beneficiary_name || "-"}
                                </span>
                              </div>
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                <span className="text-gray-400 block text-[11px]">Contact Number</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                                  {enquiryData.contact_number || "-"}
                                </span>
                              </div>
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                <span className="text-gray-400 block text-[11px]">BP Number</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {enquiryData.bp_number || "-"}
                                </span>
                              </div>
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                <span className="text-gray-400 block text-[11px]">District & Block</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                                  {enquiryData.district || "-"} {enquiryData.village_block ? `(${enquiryData.village_block})` : ""}
                                </span>
                              </div>
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                <span className="text-gray-400 block text-[11px]">System Type</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {enquiryData.system_type || "-"}
                                </span>
                              </div>
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                                <span className="text-gray-400 block text-[11px]">Contract Demand</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {enquiryData.cspdcl_contract_demand || "-"}
                                </span>
                              </div>
                              <div className="bg-gray-50/70 p-3 rounded-lg border border-gray-100 sm:col-span-2 md:col-span-3">
                                <span className="text-gray-400 block text-[11px]">Full Address</span>
                                <span className="font-medium text-gray-800 text-xs mt-0.5 block">
                                  {enquiryData.address || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-500">
                            No beneficiary master data linked to this enquiry number.
                          </div>
                        )}

                        {/* Survey Status & Timeline */}
                        {surveyData && (
                          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                              <Calendar className="w-4 h-4 text-emerald-600" /> Survey Status & Timeline
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                              <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Planned Date (1)</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {formatDate(surveyData.planned_1)}
                                </span>
                              </div>
                              <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                                <span className="text-gray-500 block text-[11px]">Actual Date (1)</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {formatDateTime(surveyData.actual_1)}
                                </span>
                              </div>
                              <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100">
                                <span className="text-gray-500 block text-[11px]">Delay</span>
                                <span className="font-semibold text-amber-700 text-sm mt-0.5 block">
                                  {surveyData.delay_1 || "-"}
                                </span>
                              </div>
                              <div className="bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
                                <span className="text-gray-500 block text-[11px]">Survey Date</span>
                                <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                                  {formatDateTime(surveyData.survey_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: TECHNICAL SPECS */}
                    {activeTab === "technical" && (
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                        <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                          <Layers className="w-4 h-4 text-indigo-600" /> Technical & Site Specifications
                        </h3>
                        {surveyData ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Phase</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.phase || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Backup Hours</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.backup_hours || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">No. of Floors</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.no_of_floors || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Roof Top Area</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.roof_top_area || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Grid Supply Available</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.grid_supply_available || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Control Room Space</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.control_room_space || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Control Room Area</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.control_room_area || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 sm:col-span-2">
                              <span className="text-gray-400 block text-[11px]">Terrace South Shadow Free Area</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.shadow_free_area_terrace || "-"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-gray-400 text-xs">
                            No technical survey data available.
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 3: DISTANCE SPECS */}
                    {activeTab === "distance" && (
                      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                        <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                          <FileCheck className="w-4 h-4 text-purple-600" /> Distance Measurements
                        </h3>
                        {surveyData ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Modules to Control Room</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.distance_modules_to_control_room || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Module to DCDB & Earthing</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.distance_module_to_dcdb_earthing || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">Inverter/ACDB to Earthing</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.distance_inverter_acdb_to_earthing || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100">
                              <span className="text-gray-400 block text-[11px]">LA Point to Earthing</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.distance_la_to_earthing || "-"}</span>
                            </div>
                            <div className="bg-gray-50 p-3.5 rounded-lg border border-gray-100 sm:col-span-2">
                              <span className="text-gray-400 block text-[11px]">Inverter to MCB / Meter</span>
                              <span className="font-semibold text-gray-900 text-sm mt-0.5 block">{surveyData.distance_inverter_mcb_meter || "-"}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-gray-400 text-xs">
                            No distance measurements available.
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 4: DOCUMENTS & PHOTOS */}
                    {activeTab === "documents" && (
                      <div className="space-y-6">
                        {/* Surveyor Details & PDF Report Card */}
                        {surveyData && (
                          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" /> Surveyor Information
                              </h3>
                              <div className="flex items-center gap-6 mt-2 text-xs">
                                <div>
                                  <span className="text-gray-400">Name: </span>
                                  <span className="font-semibold text-gray-900">{surveyData.surveyor_name || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Contact: </span>
                                  <span className="font-semibold text-gray-900">{surveyData.surveyor_contact || "-"}</span>
                                </div>
                              </div>
                            </div>

                            {surveyData.pdf_generate ? (
                              <a
                                href={surveyData.pdf_generate}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
                              >
                                <FileText className="w-4 h-4" />
                                View PDF Report
                                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                                No PDF report uploaded
                              </span>
                            )}
                          </div>
                        )}

                        {/* Uploaded Proofs & Photos */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                          <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                            <ImageIcon className="w-4 h-4 text-amber-600" /> Photos & Identification Proofs
                          </h3>

                          {!surveyData ||
                          (parseJsonArray(surveyData.geotag_photos).length === 0 &&
                            parseJsonArray(surveyData.electricity_bills_3months).length === 0 &&
                            !surveyData.id_proof &&
                            !surveyData.address_proof) ? (
                            <div className="py-8 text-center text-gray-400 text-xs">
                              <ShieldAlert className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              No files or photos uploaded for this survey.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              {/* ID Proof */}
                              {surveyData.id_proof && (
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                                  <span className="font-medium text-gray-700">ID Proof</span>
                                  <a
                                    href={surveyData.id_proof}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}

                              {/* Address Proof */}
                              {surveyData.address_proof && (
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                                  <span className="font-medium text-gray-700">Address Proof</span>
                                  <a
                                    href={surveyData.address_proof}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}

                              {/* Geotag Photos */}
                              {parseJsonArray(surveyData.geotag_photos).length > 0 && (
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2 space-y-2">
                                  <span className="font-semibold text-gray-800 block">
                                    Geotag Photos ({parseJsonArray(surveyData.geotag_photos).length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {parseJsonArray(surveyData.geotag_photos).map((url, idx) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 font-medium flex items-center gap-1 shadow-xs"
                                      >
                                        Photo #{idx + 1} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Electricity Bills */}
                              {parseJsonArray(surveyData.electricity_bills_3months).length > 0 && (
                                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 sm:col-span-2 space-y-2">
                                  <span className="font-semibold text-gray-800 block">
                                    Electricity Bills ({parseJsonArray(surveyData.electricity_bills_3months).length})
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {parseJsonArray(surveyData.electricity_bills_3months).map((url, idx) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 font-medium flex items-center gap-1 shadow-xs"
                                      >
                                        Bill #{idx + 1} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-gray-100/90 border-t border-gray-200 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default MarketModeOrder;

