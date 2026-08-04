import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  X,
  FileText
} from "lucide-react";

const POPending = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const loadRows = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Approved items from planning_master
      const { data: approvedData, error: masterError } = await supabase
        .from("planning_master")
        .select(`*, planning_item_master (id, planning_no, item, qty, description, uom)`)
        .eq("status", "Approved")
        .order("id", { ascending: false });

      if (masterError) throw masterError;

      // 2. Fetch already processed planning_nos from purchase_order_master
      const { data: processedPOs, error: poError } = await supabase
        .from("purchase_order_master")
        .select("planning_no");

      if (poError) throw poError;

      const processedPlanningNos = new Set(
        processedPOs?.map((po) => po.planning_no).filter(Boolean)
      );

      const transformedData: any[] = [];
      if (approvedData) {
        approvedData.forEach((master: any) => {
          // Skip if already has a PO
          if (processedPlanningNos.has(master.planning_no)) return;

          const items = master.planning_item_master || [];
          if (items.length === 0) {
            transformedData.push({
              id: `m-${master.id}`,
              masterId: master.id,
              planningNo: master.planning_no || "",
              date: master.date || "",
              requesterName: master.requester_name || "",
              projectName: master.project || "",
              firmName: master.firm || "",
              vendorName: master.vendor_name || "",
              itemType: master.item_type || "",
              itemName: "-",
              qty: "0",
              remarks: "-",
              state: master.state || "",
              department: master.department || "",
              status: master.status || "Approved",
              userRemarks: master.user_remarks || "",
              allItems: []
            });
          } else {
            // We group items by planning number for the main table view
            const firstItem = items[0];
            transformedData.push({
              id: firstItem.id,
              masterId: master.id,
              planningNo: master.planning_no || "",
              date: master.date || "",
              requesterName: master.requester_name || "",
              projectName: master.project || "",
              firmName: master.firm || "",
              vendorName: master.vendor_name || "",
              itemType: master.item_type || "",
              itemName: firstItem.item || "",
              qty: String(firstItem.qty) || "0",
              remarks: firstItem.description || "",
              state: master.state || "",
              department: master.department || "",
              status: master.status || "Approved",
              userRemarks: master.user_remarks || "",
              itemCount: items.length,
              allItems: items.map((item: any) => ({
                id: item.id,
                itemName: item.item || "",
                qty: String(item.qty) || "0",
                remarks: item.description || ""
              }))
            });
          }
        });
      }

      setRows(transformedData);

    } catch (e: any) {
      setError(e?.message || "Failed to load PO pending data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredData = rows.filter((item) => {
    const matchesSearch = Object.values(item).some((value: any) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesSearch;
  });

  const formatDateToDDMMYYYY = (dateString: any) => {
    if (!dateString) return "N/A";
    let date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              PO Pending
            </h1>
            <p className="text-gray-600">
              Approved requests awaiting Purchase Order generation
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => loadRows()}
              disabled={loading}
              className="flex gap-2 items-center px-4 py-2 text-gray-700 bg-white rounded-lg border border-gray-200 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50"
            >
              <Clock
                className={`w-4 h-4 ${loading ? "text-blue-600 animate-spin" : "text-gray-500"}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-6 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
          <Clock className="mx-auto mb-2 w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-600">Loading pending POs...</p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-white rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center space-x-2 text-red-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search pending POs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-2 pr-3 pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">View</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Planning No.</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Vendor Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Item Name</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Firm</th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="transition-colors duration-150 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <button
                      onClick={() => setSelectedGroup(item)}
                      className="p-1 text-blue-600 rounded transition-colors duration-200 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{item.planningNo}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.vendorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.itemCount > 1 ? `${item.itemName} (+${item.itemCount - 1} more)` : item.itemName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {item.allItems?.reduce((sum: number, i: any) => sum + Number(i.qty), 0) || item.qty}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{formatDateToDDMMYYYY(item.date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.projectName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{item.firmName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Approved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && !loading && (
          <div className="py-12 text-center">
            <FileText className="mx-auto w-12 h-12 text-gray-400 mb-2" />
            <h3 className="mb-1 text-lg font-medium text-gray-900">No pending POs found</h3>
            <p className="text-gray-500">All approved requests have been processed.</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedGroup && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Planning Details: <span className="text-blue-600">{selectedGroup.planningNo}</span>
                </h2>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase">Vendor</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedGroup.vendorName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase">Date</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDateToDDMMYYYY(selectedGroup.date)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase">Project</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedGroup.projectName}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase">Firm</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedGroup.firmName}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Sr.</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {selectedGroup.allItems.map((item: any, idx: number) => (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.itemName}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100">
                            {item.qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 italic">{item.remarks || "No remarks"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
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

export default POPending;
