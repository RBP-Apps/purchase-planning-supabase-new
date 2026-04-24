import { supabase } from "../lib/supabase";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Building,
  Package,
  Eye,
  Edit,
  Trash2,
  Download,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import PlanningForm from "../components/Planning/PlanningForm";
import { useLayout } from "../contexts/LayoutContext";

const Planning = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const { setAllHidden } = useLayout();

  const [editData, setEditData] = useState<{
    formData: any;
    products: any[];
    planningNo: string;
  } | null>(null);

  const [selectedPlanningData, setSelectedPlanningData] = useState<Row[]>([]);
  const [showPlanningModal, setShowPlanningModal] = useState(false);

  type Row = {
    planningNo: string;
    itemCode: string;
    date: string;
    requesterName: string;
    projectName: string;
    firmName: string;
    vendorName: string;
    itemType: string;
    packingDetail: string;
    itemName: string;
    uom: string;
    qty: string;
    qtySet: string;
    totalQty: string;
    remarks: string;
    state: string;
    department: string;
    vendorId: string;
  };

  const [rows, setRows] = useState<Row[]>([]);


  const loadRows = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("planning_master")
        .select(`*, planning_item_master (id, planning_no, item, qty, description, uom, item_code)`)
        .order("id", { ascending: false });

      if (error) throw error;

      const transformedData: any[] = [];
      if (data) {
        data.forEach((master: any) => {
          const items = master.planning_item_master || [];
          if (items.length === 0) {
            transformedData.push({
              planningNo: master.planning_no,
              itemCode: "-",
              date: master.date,
              requesterName: master.requester_name,
              projectName: master.project,
              firmName: master.firm,
              vendorName: master.vendor_name,
              itemType: master.item_type,
              packingDetail: "-",
              itemName: "-",
              uom: "-",
              qty: "0",
              qtySet: "1",
              totalQty: "0",
              remarks: "-",
              state: master.state,
              department: master.department,
              vendorId: master.vendor_id,
            });
          } else {
            items.forEach((item: any, idx: number) => {
              let remarks = item.description || "";
              let uomMatch = item.uom || "";
              if (!uomMatch) {
                const uomRegex = /\(UOM:\s*(.*?)\)/;
                const match = remarks.match(uomRegex);
                if (match) {
                  uomMatch = match[1];
                  remarks = remarks.replace(uomRegex, "").trim();
                }
              }

              transformedData.push({
                planningNo: master.planning_no,
                itemCode: item.item_code || "-",
                date: master.date,
                requesterName: master.requester_name,
                projectName: master.project,
                firmName: master.firm,
                vendorName: master.vendor_name,
                itemType: master.item_type,
                packingDetail: "-",
                itemName: item.item,
                uom: uomMatch || "-",
                qty: String(item.qty),
                qtySet: "1",
                totalQty: String(item.qty),
                remarks: remarks,
                state: master.state,
                department: master.department,
                vendorId: master.vendor_id,
              });
            });
          }
        });
      }

      setRows(transformedData);
    } catch (e: any) {
      setError(e.message || "Failed to load planning data");
    } finally {
      setLoading(false);
    }
  };



  const handleView = (planningNo: string) => {
    handlePlanningNumberClick(planningNo);
  };

  // Add this function to handle edit
  const handleEdit = async (planningNo: string) => {
    try {
      setLoading(true);

      const { data: mData, error: mError } = await supabase
        .from("planning_master")
        .select("*")
        .eq("planning_no", planningNo);
      if (mError) throw mError;

      const { data: iData, error: iError } = await supabase
        .from("planning_item_master")
        .select("*")
        .eq("planning_no", planningNo)
        .order("id", { ascending: true });
      if (iError) throw iError;

      if (mData && mData.length > 0) {
        const master = mData[0];
        const items = iData || [];

        const formData = {
          date: master.date || new Date().toISOString().split('T')[0],
          requesterName: master.requester_name || "",
          projectName: master.project || "",
          firmName: master.firm || "",
          vendorName: master.vendor_name || "",
          itemType: master.item_type || "",
          state: master.state || "",
          department: master.department || "",
          vendorId: master.vendor_id || "",
          packingDetailSelect: "",
          masterQuantity: "",
        };

        const products = items.map((item: any) => {
          let remarks = item.description || "";
          let uomMatch = item.uom || "";
          if (!uomMatch) {
            const uomRegex = /\(UOM:\s*(.*?)\)/;
            const match = remarks.match(uomRegex);
            if (match) {
              uomMatch = match[1];
              remarks = remarks.replace(uomRegex, "").trim();
            }
          }

          return {
            id: `edit-${item.id}-${Date.now()}`,
            packingDetail: "",
            itemName: item.item || "",
            uom: uomMatch || "",
            qty: Number(item.qty) || 0,
            qtySet: 1,
            totalQty: Number(item.qty) || 0,
            remarks: remarks,
          };
        });

        // Construct flat rows again exactly like before for `selectedPlanningData` if needed
        const flatRows = items.map((item: any, idx: number) => ({
          planningNo: master.planning_no,
          itemCode: item.item_code || "-",
          date: master.date,
          requesterName: master.requester_name,
          projectName: master.project,
          firmName: master.firm,
          vendorName: master.vendor_name,
          itemType: master.item_type,
          packingDetail: "-",
          itemName: item.item,
          uom: "-",
          qty: String(item.qty),
          qtySet: "1",
          totalQty: String(item.qty),
          remarks: item.description,
          state: master.state,
          department: master.department,
        }));

        setEditData({
          formData,
          products,
          planningNo: master.planning_no,
        });
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error loading planning for edit:", error);
      alert("Failed to load planning data for edit");
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle delete
  const handleDelete = async (planningNo: string) => {
    if (!window.confirm(`Are you sure you want to delete Planning ${planningNo} and all its items?`)) {
      return;
    }

    try {
      setLoading(true);

      // First delete items
      const { error: itemsError } = await supabase
        .from("planning_item_master")
        .delete()
        .eq("planning_no", planningNo);
      if (itemsError) throw itemsError;

      // Then delete master
      const { error: masterError } = await supabase
        .from("planning_master")
        .delete()
        .eq("planning_no", planningNo);
      if (masterError) throw masterError;

      // Refresh the data
      await loadRows();
      alert("Planning deleted successfully");
    } catch (error) {
      console.error("Error deleting planning:", error);
      alert("Failed to delete planning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  // Hide layout elements when form is open
  useEffect(() => {
    setAllHidden(showForm);
    return () => {
      setAllHidden(false);
    };
  }, [showForm, setAllHidden]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        (v || "").toString().toLowerCase().includes(q)
      )
    );
  }, [rows, searchTerm]);

  const getStatusColor = (status: string | undefined): string => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string | undefined): JSX.Element => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "active":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const formatDateToDDMMYYYY = (dateString: any) => {
    if (!dateString) return "N/A";

    let date;
    // Regex to match "Date(YYYY,MM,DD,HH,MM,SS)" or "Date(YYYY,MM,DD)"
    const dateMatch = dateString.match(
      /^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,(\d{1,2}),(\d{1,2}),(\d{1,2}))?\)$/
    );

    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10); // Month from GS is already 0-indexed
      const day = parseInt(dateMatch[3], 10);
      const hours = dateMatch[4] ? parseInt(dateMatch[4], 10) : 0;
      const minutes = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0;
      const seconds = dateMatch[6] ? parseInt(dateMatch[6], 10) : 0;

      date = new Date(year, month, day, hours, minutes, seconds);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      console.error("Invalid Date object after parsing:", dateString);
      return "N/A";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Add 1 for 1-indexed display
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePlanningNumberClick = (planningNo: string) => {
    const planningData = filteredRows.filter(
      (row) => row.planningNo === planningNo
    );
    setSelectedPlanningData(planningData);
    setShowPlanningModal(true);
  };

  const getUniqueRows = (rows: Row[]) => {
    const seen = new Set();
    return rows.filter((row) => {
      if (seen.has(row.planningNo)) {
        return false;
      }
      seen.add(row.planningNo);
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br via-blue-50 to-indigo-100 from-slate-50">
      <div className="p-6 mx-auto space-y-8 max-w-7xl">
        {/* Modern Header */}
        <div className="overflow-hidden relative bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-white/20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-5"></div>
          <div className="relative p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-4 items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800">
                    Planning Management
                  </h1>
                  <p className="mt-1 text-gray-600">
                    Advanced procurement planning & analytics dashboard
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {error && (
                  <div className="flex gap-2 items-center px-4 py-2 text-red-700 bg-red-50 rounded-lg border border-red-200">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <button
                  onClick={() => loadRows(true)}
                  disabled={loading}
                  className="flex gap-2 items-center px-4 py-2 text-gray-700 rounded-lg border border-gray-200 backdrop-blur-sm transition-all duration-200 bg-white/70 hover:bg-white hover:shadow-md disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <button className="flex gap-2 items-center px-4 py-2 text-gray-700 rounded-lg border border-gray-200 backdrop-blur-sm transition-all duration-200 bg-white/70 hover:bg-white hover:shadow-md">
                  <Download className="w-4 h-4" />
                  Export
                </button>

                <button
                  onClick={() => setShowForm(true)}
                  className="flex gap-2 items-center px-6 py-2 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  New Planning
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Search and Filters */}
        <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search across all fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="py-3 pr-4 pl-10 w-full bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="py-3 pr-4 pl-10 w-full bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex-1 py-2 px-4 rounded-lg transition-all duration-200 ${viewMode === "table"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex-1 py-2 px-4 rounded-lg transition-all duration-200 ${viewMode === "cards"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  Cards View
                </button>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <span className="px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                <span className="font-semibold text-blue-600">
                  {filteredRows.length}
                </span>{" "}
                of {rows.length} entries
              </span>
            </div>
          </div>
        </div>

        {/* Data Display */}
        <div className="relative">
          {loading && (
            <div className="flex absolute inset-0 z-20 justify-center items-center rounded-xl backdrop-blur-sm bg-white/80">
              <div className="flex flex-col gap-3 items-center p-6 bg-white rounded-lg border border-gray-200 shadow-lg">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="font-medium text-gray-700">
                  Loading from Google Sheet...
                </p>
              </div>
            </div>
          )}

          {viewMode === "table" ? (
            <div className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-lg">
              <div className="overflow-x-auto overflow-y-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 sticky top-0 to-gray-100">
                    <tr>
                      {[
                        "Planning No",
                        "Date",
                        "Requester",
                        "Item Code",
                        "Project",
                        "Firm",
                        "Vendor",
                        "Vendor ID",
                        "Item Type",
                        // "Packing Detail",
                        "Item Name",
                        "UOM",
                        "Qty",
                        "Qty/Set",
                        "Total Qty",
                        "Remarks",
                        "State",
                        "Department",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-6 py-4 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getUniqueRows(filteredRows).map((row, idx) => (
                      <tr
                        key={`${row.planningNo}-${idx}`}
                        className="transition-colors duration-150 hover:bg-blue-50"
                      >
                        {/* <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {row.planningNo || "-"}
                        </td> */}

                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handlePlanningNumberClick(row.planningNo)
                            }
                            className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                          >
                            {row.planningNo || "-"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {formatDateToDDMMYYYY(row.date) || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          <div className="flex gap-2 items-center">
                            <User className="w-4 h-4 text-gray-400" />
                            {row.requesterName || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.itemCode || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.projectName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.firmName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.vendorName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.vendorId || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          <span className="inline-flex gap-1 items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full border border-blue-200">
                            {row.itemType || "-"}
                          </span>
                        </td>
                        {/* <td
                          className="px-6 py-4 text-sm text-gray-700 truncate max-w-48"
                          title={row.packingDetail}
                        >
                          {row.packingDetail || "-"}
                        </td> */}
                        <td
                          className="px-6 py-4 text-sm text-gray-700 truncate max-w-48"
                          title={row.itemName}
                        >
                          {row.itemName || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.uom || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right text-gray-900 whitespace-nowrap">
                          {row.qty || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right text-gray-900 whitespace-nowrap">
                          {row.qtySet || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                          {row.totalQty || "-"}
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-gray-700 truncate max-w-48"
                          title={row.remarks}
                        >
                          {row.remarks || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span
                            className={`inline-flex gap-1 items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                              "active"
                            )}`}
                          >
                            {getStatusIcon("active")}
                            {row.state || "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {row.department || "-"}
                        </td>
                        {/* <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          <div className="flex gap-2 items-center">
                            <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-blue-600 hover:bg-blue-50">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-emerald-600 hover:bg-emerald-50">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td> */}

                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleView(row.planningNo)}
                              className="p-2 text-gray-400 rounded-lg transition-colors hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(row.planningNo)}
                              className="p-2 text-gray-400 rounded-lg transition-colors hover:text-emerald-600 hover:bg-emerald-50"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(row.planningNo)}
                              className="p-2 text-gray-400 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRows.map((row, idx) => (
                <div
                  key={`card-${row.planningNo}-${idx}`}
                  className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-lg transition-all duration-300 group hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2 items-center">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {row.planningNo || "N/A"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {row.itemCode}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex gap-1 items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          "active"
                        )}`}
                      >
                        {getStatusIcon("active")}
                        Active
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2 items-center text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {formatDateToDDMMYYYY(row.date) || "No date"}
                        </span>
                      </div>

                      <div className="flex gap-2 items-center text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {row.requesterName || "No requester"}
                        </span>
                      </div>

                      <div className="flex gap-2 items-center text-sm">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 truncate">
                          {row.projectName || "No project"}
                        </span>
                      </div>

                      <div className="p-3 mt-4 bg-gray-50 rounded-lg">
                        <p className="mb-1 text-sm font-medium text-gray-900">
                          {row.itemName || "No item name"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.packingDetail || "No packing detail"}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="font-semibold text-gray-900">
                            {row.totalQty || "0"}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">UOM</p>
                          <p className="font-semibold text-gray-900">
                            {row.uom || "-"}
                          </p>
                        </div>
                        {/* <div className="flex gap-1">
                          <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-blue-600 hover:bg-blue-50">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-emerald-600 hover:bg-emerald-50">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div> */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleView(row.planningNo)}
                            className="p-2 text-gray-400 rounded-lg transition-colors hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(row.planningNo)}
                            className="p-2 text-gray-400 rounded-lg transition-colors hover:text-emerald-600 hover:bg-emerald-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Planning Details Modal */}
          {showPlanningModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Planning Details: {selectedPlanningData[0]?.planningNo}
                  </h2>
                  <button
                    onClick={() => setShowPlanningModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            "Planning No",
                            "Serial No",
                            "Date",
                            "Requester",
                            "Project",
                            "Firm",
                            "Vendor",
                            "Vendor ID",
                            "Item Type",
                            // "Packing Detail",
                            "Item Name",
                            "UOM",
                            "Qty",
                            "Qty/Set",
                            "Total Qty",
                            "Remarks",
                            "State",
                            "Department",
                            "Actions",
                          ].map((header) => (
                            <th
                              key={header}
                              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPlanningData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                              {row.planningNo || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.serialNo || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {formatDateToDDMMYYYY(row.date) || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.requesterName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.projectName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.firmName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.vendorId || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.vendorName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                                {row.itemType || "-"}
                              </span>
                            </td>
                            {/* <td
                              className="px-6 py-4 text-sm text-gray-700 max-w-48 truncate"
                              title={row.packingDetail}
                            >
                              {row.packingDetail || "-"}
                            </td> */}
                            <td
                              className="px-6 py-4 text-sm text-gray-700 max-w-48 truncate"
                              title={row.itemName}
                            >
                              {row.itemName || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.uom || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap text-right">
                              {row.qty || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap text-right">
                              {row.qtySet || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap text-right">
                              {row.totalQty || "-"}
                            </td>
                            <td
                              className="px-6 py-4 text-sm text-gray-700 max-w-48 truncate"
                              title={row.remarks}
                            >
                              {row.remarks || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                                  "active"
                                )}`}
                              >
                                {getStatusIcon("active")}
                                {row.state || "Active"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              {row.department || "-"}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                              <div className="flex gap-2 items-center">
                                <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-blue-600 hover:bg-blue-50">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-emerald-600 hover:bg-emerald-50">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-gray-400 rounded-lg transition-colors hover:text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {filteredRows.length === 0 && !loading && (
            <div className="py-16 text-center bg-white rounded-xl border border-gray-100 shadow-lg">
              <div className="flex justify-center items-center mx-auto mb-6 w-24 h-24 bg-gray-100 rounded-full">
                <Search className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">
                No data found
              </h3>
              <p className="mb-6 text-gray-500">
                Try adjusting your search criteria or refresh to reload data
              </p>
              <button
                onClick={() => loadRows()}
                className="inline-flex gap-2 items-center px-4 py-2 text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </button>
            </div>
          )}
        </div>
        {/* Planning Form Modal */}
        {showForm && (
          <PlanningForm
            isOpen={showForm}
            initialData={editData || undefined}
            onClose={() => {
              setShowForm(false);
              setEditData(null);
            }}
            onSuccess={() => {
              loadRows(true); // Force refresh with true parameter
              setShowForm(false);
              setEditData(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Planning;
