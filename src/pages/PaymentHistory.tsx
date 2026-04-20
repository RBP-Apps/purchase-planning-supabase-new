import React, { useState, useEffect } from "react";
import { Search, RotateCw, Eye, X, Download } from "lucide-react";
import { useLayout } from "../contexts/LayoutContext";
import { supabase } from "../lib/supabase";


// Define the PaymentItem interface
interface PaymentItem {
  "Planning No": string;
  "PO No": string;
  "Serial Number": string;
  Date: string;
  "Vendor Name": string;
  "Item Name": string;
  Qty: number;
  "PO Copy": string;
  "Project Name": string;
  "Firm Name": string;

  "Bill Type": string;
  "Bill No": string;
  "Bill Date": string;
  "Bill Amount": number;
  "Discount Amount": number;
  "Bill Image": string;
  "Transporter Name": string;
  "LR No.": string;

  Status?: string;
  "Payment Mode"?: string;
  Reason?: string;
  Amount?: number;
  "Reference No"?: string;
  "GST %"?: number;
  Discount?: number;
  "Grand Total Amount"?: number;
  "Product Rate"?: number;
  "Invoice No"?: string;
  "Invoice Date"?: string;
  status: string;
  Remarks: string;
  "Payment Status": string;
  "Payment Done": number;
  "Quotation No": string;

  Timestamp: string;
  Deduction: number;
}



const PaymentList: React.FC = () => {
  const [data, setData] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [retryCount, setRetryCount] = useState<number>(0);

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);

  const [selectedPlanningData, setSelectedPlanningData] = useState<
    PaymentItem[]
  >([]);
  const [showPlanningModal, setShowPlanningModal] = useState(false);

  // Layout context to hide sidebar/header/footer when modal is open
  const { setAllHidden } = useLayout();

const fetchData = async (isRetry = false) => {
  try {
    setLoading(true);
    setError(null);

    const { data: paymentData, error } = await supabase
      .from("payment_master")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch vendor names from planning_master and invoice numbers from receipt_master
    const planningNos = [...new Set((paymentData || []).map((p: any) => p.planning_no).filter(Boolean))];
    const vendorMap: Record<string, string> = {};
    const invoiceMap: Record<string, string> = {};

    if (planningNos.length > 0) {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase
          .from("planning_master")
          .select("planning_no, vendor_name")
          .in("planning_no", planningNos),
        supabase
          .from("receipt_master")
          .select("planning_no, invoice_no")
          .in("planning_no", planningNos)
          .order("created_at", { ascending: false })
      ]);

      if (pData) {
        pData.forEach((p: any) => {
          vendorMap[p.planning_no] = p.vendor_name || "";
        });
      }
      if (rData) {
        rData.forEach((r: any) => {
          if (!invoiceMap[r.planning_no]) {
            invoiceMap[r.planning_no] = r.invoice_no || "";
          }
        });
      }
    }

    const transformedData: PaymentItem[] = (paymentData || []).map((row: any) => {
      // Format date
      let formattedDate = "";
      if (row.created_at) {
        const d = new Date(row.created_at);
        formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      }

      return {
        Timestamp: row.created_at,
        "Planning No": String(row.planning_no || ""),
        "Serial Number": String(row.payment_id || row.id || ""),
        "Payment Mode": String(row.payment_mode || ""),
        Amount: Number(row.amount || 0),
        Reason: String(row.remark || ""),
        "Reference No": String(row.reference_no || ""),
        Deduction: Number(row.deduction || 0),
        "Vendor Name": vendorMap[row.planning_no] || String(row.vendor_name || ""),
        "Bill No": invoiceMap[row.planning_no] || String(row.invoice_no || ""),
      } as any;
    });

    setData(transformedData);
  } catch (err) {
    console.error("[PaymentList] Error:", err);

    const message =
      err instanceof Error ? err.message : "An unknown error occurred";

    setError(message);

    if (!isRetry && retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000;

      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        fetchData(true);
      }, delay);

      return;
    }
  } finally {
    setLoading(false);
  }
};
  // Fetch on mount
  useEffect(() => {
    fetchData(true);
  }, []);

  // Hide layout elements when modal is open
  useEffect(() => {
    setAllHidden(showModal);
    return () => {
      setAllHidden(false);
    };
  }, [showModal, setAllHidden]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  // Filter data (no pagination)
  // Filter data (no pagination)
  // console.log("data",data);
  const filteredData = data.filter((item) => {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();

  return (
    (item["Planning No"] || "").toLowerCase().includes(q) ||
    (item["Serial Number"] || "").toLowerCase().includes(q) ||
    (item["Payment Mode"] || "").toLowerCase().includes(q) ||
    (item["Reference No"] || "").toLowerCase().includes(q) ||
    (item.Reason || "").toLowerCase().includes(q) ||
    (item["Vendor Name"] || "").toLowerCase().includes(q) ||
    (item["Bill No"] || "").toLowerCase().includes(q)
  );
});

  // Loading and error states
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-100 rounded-lg">
        Error: {error}
      </div>
    );
  }

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


  return (
    <div className="space-y-6">
      {/* Search and Refresh */}
      <div className="flex flex-col gap-4 justify-between p-6 bg-white rounded-xl border border-gray-200 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="py-2 pr-3 pl-10 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setRetryCount(0);
            fetchData(true); // Pass true to bypass cache
          }}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RotateCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {/* <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  View
                </th> */}
                {[
                  "Planning No",
                  "Bill No",
                  "Vendor Name",
                  "Timestamp",
                  "Payment Mode",
                  "Amount",
                  "Reason",
                  "Reference No",
                  "Deduction",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          const planningData = data.filter(
                            (row) => row["Planning No"] === item["Planning No"]
                          );
                          setSelectedPlanningData(planningData);
                          setShowPlanningModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                      >
                        {item["Planning No"] || "-"}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Bill No"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Vendor Name"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateToDDMMYYYY(item.Timestamp) || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Payment Mode"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.Amount?.toLocaleString() || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.Reason || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item["Reference No"] || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.Deduction?.toLocaleString() || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={18} className="px-4 py-12 text-center">
                    <Search className="mx-auto w-12 h-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      No payments found
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "No data available"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Planning Data Modal */}
      {showPlanningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Payment History: {selectedPlanningData[0]?.["Planning No"]}
              </h2>
              <button
                onClick={() => setShowPlanningModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Serial Number",
                        "Timestamp",
                        "Bill No",
                        "Vendor Name",
                        "Payment Mode",
                        "Amount",
                        "Reason",
                        "Reference No",
                        "Deduction",
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
                    {selectedPlanningData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Serial Number"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {formatDateToDDMMYYYY(item.Timestamp) || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Bill No"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Vendor Name"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Payment Mode"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap text-right">
                          ₹{item.Amount?.toLocaleString() || "-"}
                        </td>
                        <td
                          className="px-6 py-4 text-sm text-gray-700 max-w-48 truncate"
                          title={item.Reason}
                        >
                          {item.Reason || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {item["Reference No"] || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap text-right">
                          ₹{item.Deduction?.toLocaleString() || "-"}
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
    </div>
  );
};

export default PaymentList;
