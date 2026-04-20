import React, { useState, useEffect } from "react";
import { Search, Eye, RotateCw, X, ChevronRight } from "lucide-react";
import { useLayout } from "../contexts/LayoutContext";
import { RiFolderReceivedFill } from "react-icons/ri";
import { supabase } from "../lib/supabase";


interface POItem {
  "Planning No": string;
  "PO No": string;
  "Receipt ID": string;
  Date: string;
  "Vendor Name": string;
  "Vendor ID": string;
  "Item Name": string;
  Qty: number;
  "PO Copy": string;
  "Project Name": string;
  "Firm Name": string;
  // Financial fields
  "Gross Amount": number;
  "PO Amount": number;
  "Tax Amount": number;
  "Total Amount": number;
  "PO Qty": number;
  "Received Qty": number;
  "Remaining Qty": number;
  Rate: number;
  status: string;
  Remarks: string;
  "Quotation No": string;
  "GST %": number;
  Discount: number;
  "Grand Total Amount": number;
  "Product Rate": number;
  poStatus: string;
  Planned: string;
  Actual: string;
  Status: string;
  GST: number;
  ReceivedQty: number;

  "Bill Type": string;
  "Bill No": string;
  "Bill Date": string;
  "Bill Amount": number;
  "Discount Amount": number;
  "Bill Image": string;
  "Transporter Name": string;
  "LR No.": string;
  TransportCharge?: number;
  _isDirty?: boolean; // Track if the row has been modified
}

type GroupedPOItem = {
  planningNo: string;
  items: POItem[];
  itemCount: number;
  displayItem: POItem;
};

const POList = () => {
  const [data, setData] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<POItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [retryCount, setRetryCount] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<GroupedPOItem | null>(
    null
  );
  const [groupItems, setGroupItems] = useState<POItem[]>([]);

  const [billStatus, setBillStatus] = useState("No");
  const [billNo, setBillNo] = useState("");
  const [billImage, setBillImage] = useState<File | string>("");
  const [billAmount, setBillAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [transportCharge, setTransportCharge] = useState("");

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState<POItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);



  // Layout context to hide sidebar/header/footer when modal is open
  const { setAllHidden } = useLayout();

  const validateForm = (formData: POItem) => {
    const errors: Record<string, string> = {};

    // Validate numeric fields are positive numbers
    const numericFields = [
      "Qty",
      "Received Qty",
      "Rate"
    ];
    numericFields.forEach((field) => {
      const value = formData[field as keyof POItem];
      // Only validate as positive number if the value is provided/exists.
      // Received Qty might be 0, which is fine, but checking for null/undefined if it's a required field.
      if (
        value !== undefined && value !== null && value !== "" &&
        (typeof value === "number" && value < 0)
      ) {
        errors[field] = "Must be a positive number";
      }
    });

    return errors;
  };

  const fetchHistoryData = async () => {
    try {
      setHistoryLoading(true);

      const { data, error } = await supabase
        .from("receipt_item_master")
        .select("*")
        .not("bill_type", "is", null);

      if (error) throw error;

      const transformedData = data.map((row) => ({
        "Planning No": row.planning_no,
        "Bill No": row.ref_no,
        "Bill Date": row.actual_payment,
        "Bill Amount": row.amount,
        "PO No": row.po_no,
        "Firm Name": row.firm_name,
        "Vendor Name": row.vendor_name,
      }));

      setHistoryData(transformedData);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroup || groupItems.length === 0) return;

    // Filter items tracking changes. Only submit items that have something being received.
    const itemsToSubmit = groupItems.filter(item => (Number(item["Received Qty"]) || 0) > 0);

    if (itemsToSubmit.length === 0) {
      alert("Please enter a Received Qty greater than 0 for at least one item to save the receipt.");
      return;
    }

    // Validate all items in the group
    let hasErrors = false;
    const allErrors: Record<string, string> = {};

    groupItems.forEach((item, index) => {
      const errors = validateForm(item);
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
        Object.entries(errors).forEach(([key, value]) => {
          allErrors[`${key}-${index}`] = value;
        });
      }
    });

    setFormErrors(allErrors);
    if (hasErrors) {
      alert("Validation failed. Please check the form errors.");
      return;
    }

    setIsSubmitting(true);

    try {
      let billImageUrl = "";

      // Upload file to Supabase Storage if bill image exists
      if (billImage instanceof File) {
        try {
          const filePath = `receipts/${Date.now()}_${billImage.name}`;

          const { error: uploadError } = await supabase.storage
            .from("po_generator")
            .upload(filePath, billImage);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("po_generator")
            .getPublicUrl(filePath);

          billImageUrl = publicUrlData.publicUrl;
        } catch (uploadError) {
          throw new Error(
            `File upload failed: ${uploadError instanceof Error
              ? uploadError.message
              : "Unknown error"
            }`
          );
        }
      }

      // Use the first item to get the PO-level fields
      const firstItem = itemsToSubmit[0];

      // Auto-generate receipt_id in format REC-001
      let receiptId = "REC-001";
      const { data: recentReceipts, error: lastRefError } = await supabase
        .from("receipt_master")
        .select("receipt_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!lastRefError && recentReceipts && recentReceipts.length > 0) {
        // Filter for IDs that match REC-XXX pattern (where XXX is not a very long timestamp)
        const validIds = recentReceipts
          .map(r => {
            const match = r.receipt_id.match(/REC-(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter(num => num !== null && num < 1000000); // Ignore timestamps (which are > 10^12)

        if (validIds.length > 0) {
          const maxId = Math.max(...validIds);
          receiptId = `REC-${(maxId + 1).toString().padStart(3, "0")}`;
        }
      }

      const today = new Date().toISOString().split("T")[0];

      // 1. Insert into receipt_master
      const { error: receiptError } = await supabase
        .from("receipt_master")
        .insert([{
          receipt_id: receiptId,
          receipt_date: today,
          po_id: firstItem["PO No"] || null,
          planning_no: firstItem["Planning No"] || null,
          vendor_name: firstItem["Vendor Name"] || null,
          invoice_no: billNo || null,
          invoice_date: billDate || null,
          transport_name: transporterName || null,
          lr_no: lrNo || null,
          lr_date: null,
          invoice_copy: billImageUrl || null,
          total_invoice_amount: parseFloat(billAmount) || null,
        }]);

      if (receiptError) throw receiptError;

      // 2. Insert itemized records into receipt_item_master
      const itemReceipts = groupItems
        .filter(item => (Number(item["Received Qty"]) || 0) > 0)
        .map(item => {
          const receivedQty = Number(item["Received Qty"]) || 0;
          const poQty = Number(item["Qty"]) || 0;
          const rate = Number(item["Rate"]) || 0;
          const gstPercent = Number(item["GST %"]) || 0;
          const discountPercent = Number(item["Discount"]) || 0;
          const baseAmount = receivedQty * rate;
          const discountAmount = baseAmount * (discountPercent / 100);
          const gstAmount = baseAmount * (gstPercent / 100);
          const netAmount = (baseAmount - discountAmount) + gstAmount;
          const remainingQty = Math.max(0, poQty - receivedQty);
          return {
            receipt_id: receiptId,
            planning_no: item["Planning No"] || firstItem["Planning No"],
            item: item["Item Name"] || "-",
            qty_received: receivedQty,
            rate: rate || null,
            gst_percent: gstPercent || null,
            discount_percent: discountPercent || null,
            net_amount: netAmount || null,
            remaining_qty: remainingQty,
            received_status: "Pending"
          };
        });

      if (itemReceipts.length > 0) {
        const { error: itemInsertError } = await supabase
          .from("receipt_item_master")
          .insert(itemReceipts);

        if (itemInsertError) throw itemInsertError;
      }

      // 3. Update purchase_order_master status (optional)
      // Removed the update to qty_received as it does not exist in this table.
      // The dashboard now calculates the total received from receipt_item_master.

      alert(`Receipt saved successfully!`);
      setShowModal(false);
      fetchData(); // Refresh data to show updated totals
    } catch (error) {
      console.error("Error saving receipt data:", error);
      setFormErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to save changes. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (
    field: keyof POItem,
    value: string | number,
    itemIndex: number
  ) => {
    setGroupItems((prevItems) => {
      const updatedItems = [...prevItems];
      if (updatedItems[itemIndex]) {
        // For numeric fields, convert to number if not empty, otherwise set to null
        const isNumericField =
          field.includes("Amount") || field.includes("Qty") || field === "Rate";
        const numericValue =
          isNumericField && value !== "" ? Number(value) || null : value;

        // Validation: Received Qty cannot exceed available balance (shown in Qty)
        if (field === "Received Qty") {
          const maxAllowed = Number(updatedItems[itemIndex]["Qty"]) || 0;
          if (Number(value) > maxAllowed) {
            setFormErrors(prev => ({
              ...prev,
              [`${field}-${itemIndex}`]: `Cannot exceed remaining qty (${maxAllowed})`
            }));
            // Cap the value at maxAllowed
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              [field]: maxAllowed,
              _isDirty: true,
            };
          } else {
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              [field]: numericValue,
              _isDirty: true,
            };
          }
        } else {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            [field]: numericValue,
            _isDirty: true,
          };
        }
      }
      return updatedItems;
    });

    // Clear error for this field if it exists
    const errorKey = `${field}-${itemIndex}`;
    if (formErrors[errorKey]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleViewClick = (group: GroupedPOItem) => {
    setSelectedGroup(group);
    setGroupItems(
      group.items.map((item) => ({
        ...item,
        "Qty": item["Remaining Qty"], // Show remaining balance in PO Qty column
        "Received Qty": 0, // Reset input for new receipt
        _isDirty: false, // Initialize as clean
      }))
    );

    // Prefill financial details from the first item (since they're same for all items in a group)
    const firstItem = group.items[0];
    setBillStatus(firstItem["Bill Type"] || "");
    setBillNo(firstItem["Bill No"] || "");
    setBillDate(firstItem["Bill Date"] || "");
    setBillImage(firstItem["Bill Image"] || "");
    setBillAmount(firstItem["Bill Amount"]?.toString() || "");
    setDiscountAmount(firstItem["Discount Amount"]?.toString() || "");
    setTransporterName(firstItem["Transporter Name"] || "");
    setLrNo(firstItem["LR No."] || "");
    setTransportCharge(firstItem.TransportCharge?.toString() || "");
    setShowModal(true);
  };

  const handleDirectApproveItem = async (item: POItem) => {
    if (!window.confirm(`Are you sure you want to mark "${item["Item Name"]}" as complete? This will remove it from the pending list.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const { error: updateError } = await supabase
        .from("receipt_item_master")
        .update({ received_status: "Approved" })
        .eq("planning_no", item["Planning No"])
        .eq("item", item["Item Name"]);

      if (updateError) throw updateError;

      alert("Item marked as complete.");
      
      // Update local state to remove the item instantly from the modal
      setGroupItems(prev => {
        const remainingItems = prev.filter(i => i["Item Name"] !== item["Item Name"]);
        if (remainingItems.length === 0) {
          setShowModal(false); // Close modal if no items left
        }
        return remainingItems;
      });
      
      // Refresh the main table data
      fetchData();
    } catch (err) {
      console.error("Error approving item:", err);
      alert("Failed to mark item as complete.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch purchase order master records (status = "Approved" lives here)
      const { data: poData, error } = await supabase
        .from("purchase_order_master")
        .select("*")
        .eq("status", "Approved");

      if (error) throw error;

      const masterData = poData || [];

      // 2. Fetch item data from po_item_master for all po_ids
      const poIds = masterData.map((r: any) => r.po_id).filter(Boolean);
      let itemMap: Record<string, { items: { name: string; qty: number }[] }> = {};

      if (poIds.length > 0) {
        const { data: itemData, error: itemError } = await supabase
          .from("po_item_master")
          .select("po_id, item, qty")
          .in("po_id", poIds);

        if (!itemError && itemData) {
          itemData.forEach((item: any) => {
            if (!itemMap[item.po_id]) {
              itemMap[item.po_id] = { items: [] };
            }
            itemMap[item.po_id].items.push({ name: item.item || "", qty: item.qty || 0 });
          });
        }
      }

      // 3. Fetch firm and project from planning_master for all planning_nos
      const planningNos = masterData.map((r: any) => r.planning_no).filter(Boolean);
      const projectNames = masterData.map((r: any) => r.project).filter(Boolean);
      let planningMap: Record<string, { firm: string; project: string; vendorId: string }> = {};

      if (planningNos.length > 0) {
        const { data: planningData, error: planningError } = await supabase
          .from("planning_master")
          .select("planning_no, firm, project, vendor_id")
          .in("planning_no", planningNos);

        if (!planningError && planningData) {
          planningData.forEach((p: any) => {
            if (p.planning_no) {
              planningMap[p.planning_no] = {
                firm: p.firm || "",
                project: p.project || "",
                vendorId: p.vendor_id || ""
              };
            }
          });
        }
      }

      // 3.1 Fetch Vendor ID from project_master if missing
      let projectVendorMap: Record<string, string> = {};
      if (projectNames.length > 0) {
        const { data: projectData } = await supabase
          .from("project_master")
          .select("project_name, vendor_id")
          .in("project_name", projectNames);

        if (projectData) {
          projectData.forEach(p => {
            if (p.project_name) projectVendorMap[p.project_name] = p.vendor_id || "";
          });
        }
      }

      // 4. Fetch receipt historical data for aggregation
      // 3.5 Fetch Receipt IDs from receipt_master for all planning_nos or po_ids
      let receiptMap: Record<string, string> = {};
      if (planningNos.length > 0 || poIds.length > 0) {
        // Create conditions for the .or() filter
        const planningCond = planningNos.length > 0 ? `planning_no.in.(${planningNos.map(n => `"${n}"`).join(",")})` : "";
        const poCond = poIds.length > 0 ? `po_id.in.(${poIds.map(i => `"${i}"`).join(",")})` : "";

        const filter = [planningCond, poCond].filter(Boolean).join(",");

        const { data: receiptData, error: receiptError } = await supabase
          .from("receipt_master")
          .select("planning_no, po_id, receipt_id")
          .or(filter);

        if (!receiptError && receiptData) {
          console.log("DEBUG: receiptData from backend", receiptData);
          receiptData.forEach((r: any) => {
            if (r.receipt_id) {
              const rid = String(r.receipt_id).trim();
              if (r.planning_no) receiptMap[String(r.planning_no).trim()] = rid;
              if (r.po_id) receiptMap[String(r.po_id).trim()] = rid;
            }
          });
        }
      }

      const { data: receiptDetails, error: receiptError } = await supabase
        .from("receipt_item_master")
        .select("planning_no, item, qty_received, received_status")
        .in("planning_no", planningNos);

      let receivedMap: Record<string, number> = {};
      let itemApprovedMap: Record<string, boolean> = {};

      if (!receiptError && receiptDetails) {
        receiptDetails.forEach((r: any) => {
          const key = `${r.planning_no}_${r.item}`;
          receivedMap[key] = (receivedMap[key] || 0) + (Number(r.qty_received) || 0);
          if (r.received_status === "Approved") {
            itemApprovedMap[key] = true;
          }
        });
      }

      // 5. Merge all data and create one row per item
      const transformedData: POItem[] = [];
      masterData.forEach((row: any) => {
        const poItems = itemMap[row.po_id]?.items || [];
        const planningInfo = planningMap[row.planning_no] || { firm: "", project: "", vendorId: "" };

        if (poItems.length === 0) {
          // If no items found, add a single row from master data
          const receivedQty = receivedMap[`${row.planning_no}_${row.item || "-"}`] || 0;
          transformedData.push({
            "Planning No": row.planning_no,
            "PO No": row.po_id || row.po_no || "-",
            Date: row.po_date,
            "Vendor Name": row.vendor_name,
            "Item Name": row.item || "-",
            Qty: row.qty || 0,
            Rate: row.rate || 0,
            "GST %": row.gst_percent || 0,
            Discount: row.discount || 0,
            "Grand Total Amount": row.grand_total || row.net_po_amount || 0,
            "PO Copy": row.po_copy,
            "Project Name": planningInfo.project || row.project || "-",
            "Firm Name": planningInfo.firm || row.firm_name || "-",
            poStatus: row.status,
            "Received Qty": receivedQty,
            "Remaining Qty": Math.max(0, (row.qty || 0) - receivedQty),
            Planned: row.planned,
            Status: itemApprovedMap[`${row.planning_no}_${row.item || "-"}`] ? "Approved" : row.receiving_status,
            Remarks: row.user_remarks,
            _isDirty: false,
          } as any);
        } else {
          // One row per item
          poItems.forEach((poItem: any) => {
            const receivedQty = receivedMap[`${row.planning_no}_${poItem.name}`] || 0;
            transformedData.push({
              "Planning No": row.planning_no,
              "PO No": row.po_id || row.po_no || "-",
              "Serial Number": "-",
              Date: row.po_date,
              "Vendor Name": row.vendor_name,
              "Item Name": poItem.name || "-",
              Qty: poItem.qty || 0,
              Rate: row.rate || 0,
              "GST %": row.gst_percent || 0,
              Discount: row.discount || 0,
              "Grand Total Amount": row.grand_total || row.net_po_amount || 0,
              "PO Copy": row.po_copy,
              "Project Name": planningInfo.project || row.project || "-",
              "Firm Name": planningInfo.firm || row.firm_name || "-",
              poStatus: row.status,
              "Received Qty": receivedQty,
              "Remaining Qty": Math.max(0, (poItem.qty || 0) - receivedQty),
              Planned: row.planned,
              Status: itemApprovedMap[`${row.planning_no}_${poItem.name}`] ? "Approved" : row.receiving_status,
              Remarks: row.user_remarks,
              _isDirty: false,
            } as any);
          });
        }
      });

      const approvedData = transformedData.filter(
        (item) => item.Status !== "Complete" && item.Status !== "Approved" && item.poStatus === "Approved" && item["Remaining Qty"] > 0
      );

      setData(approvedData);
    } catch (err) {
      console.error(err);
      setError("Failed to load data");
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

  // Group data by Planning No
  const groupedData = data.reduce((acc, item) => {
    const planningNo = item["Planning No"];
    if (!acc[planningNo]) {
      acc[planningNo] = [];
    }
    acc[planningNo].push(item);
    return acc;
  }, {} as Record<string, POItem[]>);

  const groupedDataArray = Object.entries(groupedData).map(
    ([planningNo, items]) => ({
      planningNo,
      items,
      itemCount: items.length,
      // Use first item's data for display in table
      displayItem: items[0],
    })
  );

  // Filter grouped data
  const filteredGroupedData = groupedDataArray.filter(
    (group: GroupedPOItem) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const item = group.displayItem;
      return (
        (item["Planning No"] || "").toLowerCase().includes(q) ||
        (item["PO No"] || "").toLowerCase().includes(q) ||
        (item["Vendor Name"] || "").toLowerCase().includes(q) ||
        (item["Item Name"] || "").toLowerCase().includes(q) ||
        (item["Project Name"] || "").toLowerCase().includes(q) ||
        (item["Firm Name"] || "").toLowerCase().includes(q)
      );
    }
  );

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

  const calculateTotalAmount = (item: POItem) => {
    const receivedQty = Number(item["Received Qty"]) || 0;
    const rate = Number(item.Rate) || 0;
    const discountPercent = Number(item["Discount"]) || 0;
    const gst = Number(item["GST %"]) || 0;
    const transportCharge = Number(item.TransportCharge) || 0;
    
    const baseAmount = receivedQty * rate;
    const discountAmount = baseAmount * (discountPercent / 100);
    const gstAmount = baseAmount * (gst / 100);
    const total = (baseAmount - discountAmount) + gstAmount + transportCharge;
    return total.toFixed(2);
  };

  // Calculate total of all items' total amounts
  const calculateGrandTotal = () => {
    return groupItems.reduce((total, item) => {
      return total + parseFloat(calculateTotalAmount(item));
    }, 0);
  };



  return (
    <div className="space-y-6">
      {/* Search and Refresh */}
      <div className="flex flex-col gap-4 justify-between p-6 bg-white rounded-xl border border-gray-200 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search purchase orders..."
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

        <button
          onClick={() => {
            setShowHistoryModal(true);
            fetchHistoryData();
          }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm hover:bg-gray-50"
        >
          History
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  View
                </th>
                {[
                  "Planning No",
                  "PO No",
                  "Date",
                  "Vendor Name",
                  "Item Name",
                  "Qty",
                  "Received Qty",
                  "Remaining Qty",
                  "Status",
                  "PO Copy",
                  "Project Name",
                  "Firm Name",
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
              {filteredGroupedData.length > 0 ? (
                filteredGroupedData.map(
                  (group: GroupedPOItem, index: number) => {
                    const item = group.displayItem;
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewClick(group)}
                              className="overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl px-4 py-3 group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                              title="View All Items"
                            >
                              <div className="flex items-center justify-center">
                                {/* <Eye className="w-5 h-5 text-blue-600 mr-2 group-hover:text-blue-700 transition-colors" /> */}
                                <span className="font-medium text-blue-700 group-hover:text-blue-800">
                                  <RiFolderReceivedFill className="inline-block mr-1 mb-1" />
                                </span>
                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                  {group.itemCount}
                                </span>
                                <ChevronRight className="w-4 h-4 text-blue-500 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            </button>
                            {item["PO Copy"] && (
                              <button
                                onClick={() =>
                                  window.open(item["PO Copy"], "_blank")
                                }
                                className="overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl px-4 py-3 group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                                title="View PO Copy"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        {[
                          "Planning No",
                          "PO No",
                          "Date",
                          "Vendor Name",
                          "Item Name",
                          "Qty",
                          "Received Qty",
                          "Remaining Qty",
                          "Status",
                          "PO Copy",
                          "Project Name",
                          "Firm Name",
                        ].map((colKey) => {
                          const value = item[colKey as keyof POItem];
                          return (
                            <td
                              key={colKey}
                              className="px-4 py-3 whitespace-nowrap"
                            >
                              {colKey === "PO Copy" && value ? (
                                <a
                                  href={String(value)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 underline hover:text-blue-900"
                                  title="Click to view PO Copy"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="mr-1"
                                  >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                  </svg>
                                  View Document
                                </a>
                              ) : colKey === "Status" ? (
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  String(value).toLowerCase() === "approved" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {value || "Pending"}
                                </span>
                              ) : typeof value === "number" ? (
                                value.toLocaleString()
                              ) : colKey === "Date" ? (
                                formatDateToDDMMYYYY(value)
                              ) : (
                                value || "-"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Search className="mx-auto w-12 h-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      No purchase orders found
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

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex justify-center items-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 opacity-75"
              onClick={() => setShowHistoryModal(false)}
            />

            <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Received History</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-t-2 border-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {[
                          "Planning No",
                          "PO No",
                          "Firm Name",
                          "Vendor Name",
                          "Invoice No",
                          "Invoice Date",
                          "Received Qty",
                          "Remaining Qty",
                          "Bill Amount",
                          "Invoice Copy",
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historyData.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3">{item["Planning No"]}</td>
                          <td className="px-4 py-3">{item["PO No"]}</td>
                          <td className="px-4 py-3">{item["Firm Name"]}</td>
                          <td className="px-4 py-3">{item["Vendor Name"]}</td>
                          <td className="px-4 py-3">{item["Bill No"]}</td>
                          <td className="px-4 py-3">
                            {formatDateToDDMMYYYY(item["Bill Date"])}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-900 whitespace-nowrap">
                            {item["Received Qty"]?.toLocaleString() || "0"}
                          </td>
                          <td className="px-6 py-4 text-sm text-center font-bold text-blue-600 whitespace-nowrap">
                            {item["Remaining Qty"]?.toLocaleString() || "0"}
                          </td>
                          <td className="px-4 py-3">
                            ₹{item["Bill Amount"]?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {item["Bill Image"] && (
                              <a
                                href={item["Bill Image"]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial Details Modal */}
      {showModal && selectedGroup && groupItems.length > 0 && (
        <div className="overflow-y-auto fixed inset-0 z-50">
          <div className="flex justify-center items-center px-2 pt-2 pb-4 min-h-screen text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
              onClick={() => !isSubmitting && setShowModal(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>

            <div className="inline-block overflow-hidden px-3 py-4 mx-2 w-full max-w-xs text-left align-bottom bg-white rounded-xl shadow-2xl transition-all transform sm:my-8 sm:align-middle sm:px-6 sm:py-6 sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl sm:mx-0">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:justify-between sm:items-center sm:mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
                        Financial Details - All Items
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Planning No:{" "}
                        <span className="font-medium text-blue-600">
                          {selectedGroup?.planningNo}
                        </span>{" "}
                        ({selectedGroup?.itemCount || 1} items)
                      </p>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        PO No:{" "}
                        <span className="font-medium text-blue-600">
                          {selectedGroup?.displayItem["PO No"] || "N/A"}
                        </span>{" "}
                        ({selectedGroup?.itemCount || 1} items)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4 sm:gap-6">
                    {/* Financial Details Section */}
                    <div className="w-full">
                      {/* <h4 className="mb-3 text-base font-medium text-gray-900 sm:mb-4 sm:text-lg">
                        Financial Details - All Items ({groupItems.length})
                      </h4> */}

                      {/* FinancialDetailsTable */}

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {/* Bill Status */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill Type *
                            </label>
                            <select
                              value={billStatus}
                              onChange={(e) => setBillStatus(e.target.value)}
                              className="block w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            >
                              <option value="">Select Bill Type</option>
                              <option value="Tax Invoice">Tax Invoice</option>
                              <option value="Delivery Chalan">
                                Delivery Chalan
                              </option>
                            </select>
                          </div>

                          {/* Bill No - only show if Bill Status is Yes */}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill No *
                            </label>
                            <input
                              type="text"
                              value={billNo}
                              onChange={(e) => setBillNo(e.target.value)}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter bill number"
                              disabled={isSubmitting}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill Date *
                            </label>
                            <input
                              type="date"
                              value={billDate}
                              onChange={(e) => setBillDate(e.target.value)}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* Bill Image - only show if Bill Status is Yes */}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bill Image
                            </label>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Store the file object instead of just name
                                  setBillImage(file);
                                }
                              }}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              disabled={isSubmitting}
                            />{" "}
                          </div>

                          {/* Bill Amount - only show if Bill Status is Yes */}
                          {
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bill Amount *
                              </label>
                              <input
                                type="number"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          }

                          {/* Discount Amount - only show if Bill Status is Yes */}
                          {
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Discount Amount
                              </label>
                              <input
                                type="number"
                                value={discountAmount}
                                onChange={(e) =>
                                  setDiscountAmount(e.target.value)
                                }
                                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                                min="0"
                                step="0.01"
                                disabled={isSubmitting}
                              />
                            </div>
                          }

                          {/* Transporter Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Transporter Name
                            </label>
                            <input
                              type="text"
                              value={transporterName}
                              onChange={(e) =>
                                setTransporterName(e.target.value)
                              }
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter transporter name"
                              disabled={isSubmitting}
                            />
                          </div>

                          {/* LR No */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              LR No.
                            </label>
                            <input
                              type="text"
                              value={lrNo}
                              onChange={(e) => setLrNo(e.target.value)}
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter LR number"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Vendore Name
                            </label>
                            <input
                              type="text"
                              value={
                                selectedGroup?.displayItem["Vendor Name"] || ""
                              }
                              readOnly
                              className="block px-2 py-1 w-full text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-full sm:text-sm"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Transport Charge
                            </label>
                            <input
                              type="number"
                              value={transportCharge}
                              onChange={(e) =>
                                setTransportCharge(e.target.value)
                              }
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                              placeholder="0"
                              min="0"
                              step="0.01"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 mt-6 border-t border-gray-200 sm:flex-row sm:pt-6 sm:mt-8">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setShowModal(false)}
                        className="inline-flex order-2 justify-center px-4 py-2 w-full text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 shadow-sm sm:order-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex order-1 justify-center px-4 py-2 w-full text-sm font-medium text-white bg-blue-600 rounded-md border border-transparent shadow-sm sm:order-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <svg
                              className="mr-2 -ml-1 w-5 h-5 text-white animate-spin"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>

                    {/* Basic Information Section */}
                    <div className="w-full">
                      <h4 className="mb-3 text-base font-medium text-gray-900 sm:mb-4 sm:text-lg">
                        Basic Information - All Items ({groupItems.length})
                      </h4>

                      {/* Items Table */}
                      <div className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  PO No
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Item Name
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  PO Qty
                                </th>

                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Received Qty
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Remaining Qty
                                </th>

                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Rate
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  GST %
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Discount %
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Total Amount
                                </th>
                                <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap sm:px-4 sm:py-3">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {groupItems.map((item, itemIndex) => (
                                <tr key={itemIndex}>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <span className="text-xs font-medium text-gray-900 sm:text-sm">
                                      {item["PO No"]}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={item["Item Name"] || ""}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={item["Qty"] || ""}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs text-gray-500 bg-gray-50 rounded border border-gray-200 sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td>

                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["Received Qty"] === 0 ? "" : (item["Received Qty"] || "")}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "Received Qty",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className={`block px-2 py-1 w-20 text-xs border rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm ${
                                        formErrors[`Received Qty-${itemIndex}`] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                                      }`}
                                      min="0"
                                      max={item["Qty"]}
                                    />
                                    {formErrors[`Received Qty-${itemIndex}`] && (
                                      <p className="mt-1 text-[10px] text-red-600 font-medium">
                                        Max: {item["Qty"]}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={
                                        item.Qty
                                          ? Number(item.Qty) -
                                          Number(item["Received Qty"] || 0)
                                          : 0
                                      }
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs bg-gray-50 border border-gray-200 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                    />
                                  </td>
                                  {/* Make Rate editable */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["Rate"] || ""}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "Rate",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className="block px-2 py-1 w-20 text-xs border border-gray-300 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                      step="0.01"
                                    />
                                  </td>

                                  {/* Make GST editable */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["GST %"] || ""}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "GST %",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className="block px-2 py-1 w-20 text-xs border border-gray-300 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                      max="100"
                                    />
                                  </td>

                                  {/* Make Discount editable */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="number"
                                      value={item["Discount"] || ""}
                                      onChange={(e) =>
                                        handleFieldChange(
                                          "Discount",
                                          e.target.value,
                                          itemIndex
                                        )
                                      }
                                      className="block px-2 py-1 w-20 text-xs border border-gray-300 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                      min="0"
                                      max="100"
                                    />
                                  </td>

                                  {/* Total Amount - calculated, read-only */}
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3">
                                    <input
                                      type="text"
                                      value={calculateTotalAmount(item)}
                                      readOnly
                                      className="block px-2 py-1 w-20 text-xs bg-gray-50 border border-gray-200 rounded sm:px-3 sm:py-2 sm:w-32 sm:text-sm"
                                    />
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap sm:px-4 sm:py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDirectApproveItem(item)}
                                      disabled={isSubmitting}
                                      className="p-1.5 text-green-600 hover:text-white hover:bg-green-600 border border-green-300 rounded-full transition-all duration-200"
                                      title="Mark as Completed (remove from pending)"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Grand Total Display - ADD THIS SECTION */}
                    <div className="flex justify-end mt-4 p-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">
                          Grand Total:
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          ₹{calculateGrandTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {formErrors.submit && (
                  <div className="mt-3 text-xs text-red-600 sm:mt-4 sm:text-sm">
                    {formErrors.submit}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POList;
