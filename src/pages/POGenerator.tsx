import React, { useEffect, useMemo, useState } from "react";
import { generatePDFFromHTML } from "../pages/generatePDFFromHTML"; // Path adjust karna
import { supabase } from "../lib/supabase";

import {
  FileText,
  RefreshCw,
  Edit3,
  Plus,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
// import jsPDF from "jspdf";

// Firm data structure for dynamic header
const firmData: Record<
  string,
  { name: string; address: string; phone: string; email?: string }
> = {
  "RBP INDIA PRIVATE LIMITED": {
    name: "RBP INDIA PRIVATE LIMITED",
    address:
      "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001",
    phone: "+91 92000 12400",
    email: "info@rbpindia.com",
  },
  "RBP Energy (India) Pvt Ltd": {
    name: "RBP ENERGY (INDIA) PRIVATE LIMITED",
    address:
      "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001",
    phone: "+91 92000 12400",
    email: "energy@rbpindia.com",
  },
  "Raisoni Energy (India) Pvt Ltd": {
    name: "RAISONI ENERGY (INDIA) PRIVATE LIMITED",
    address: "456, Raisoni Campus, Nagpur, Maharashtra, 440013",
    phone: "+91 98765 43210",
    email: "contact@raisenergy.com",
  },
  "RBP Constructions": {
    name: "RBP CONSTRUCTIONS PRIVATE LIMITED",
    address: "789, Construction Zone, Raipur, Chhattisgarh, 492001",
    phone: "+91 87654 32109",
    email: "projects@rbpconstructions.com",
  },
  "RBP Infrastructure": {
    name: "RBP INFRASTRUCTURE PRIVATE LIMITED",
    address: "101, Infrastructure Hub, Raipur, Chhattisgarh, 492001",
    phone: "+91 76543 21098",
    email: "infra@rbpinfra.com",
  },

  "Varyaa Renewable Pvt Ltd": {
    name: "Varyaa Renewable Pvt Ltd",
    address:
      "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001",
    phone: "+91 92000 12400",
    email: "info@rbpindia.com",
  },
};

const getFirmData = (firmName: string) => {
  return firmData[firmName] || firmData["RBP INDIA PRIVATE LIMITED"];
};

const POGenerator = () => {
  const [selectedIndent, setSelectedIndent] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedFirm, setSelectedFirm] = useState("RBP INDIA PRIVATE LIMITED");
  const [selectedItemType, setSelectedItemType] = useState("");
  const [selectedTermRecordId, setSelectedTermRecordId] = useState<number | null>(null);
  const [indentOptions, setIndentOptions] = useState<string[]>([]);
  const [loadingIndents, setLoadingIndents] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsCache, setTermsCache] = useState<Record<string, { id: number; text: string }[]>>({});
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [termsSource, setTermsSource] = useState("");
  const [planningToFirm, setPlanningToFirm] = useState<Record<string, string>>(
    {}
  );
  const [planningToVendorId, setPlanningToVendorId] = useState<Record<string, string>>(
    {}
  );


  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  // console.log("selectedFirm", selectedFirm);
  // Maps for fast lookup
  const [planningToVendor, setPlanningToVendor] = useState<
    Record<string, string>
  >({});
  const [vendorDirectory, setVendorDirectory] = useState<
    Record<string, { address: string; gstin: string; email: string }>
  >({});
  const [editingTerm, setEditingTerm] = useState<number | null>(null);
  const [terms, setTerms] = useState<{ id?: number; text: string }[]>([]);
  const [billingAddress, setBillingAddress] = useState(
    "M/S RBP INDIA PRIVATE LIMITED\nVill - Belapada, PO.Uchhakapat, VIA-Bamra,\nDist. Sambalpur (Odisha)"
  );
  const [destinationAddress, setDestinationAddress] = useState(
    "M/S RBP INDIA PRIVATE LIMITED\nN-2, Civil Township, Rourkela-769004\nDist. Sundargarh (ODISHA)"
  );
  const [editingBilling, setEditingBilling] = useState(false);
  const [editingDestination, setEditingDestination] = useState(false);
  const [poData, setPoData] = useState({
    poDate: new Date().toISOString().split("T")[0],
    poNumber: "",
    quotationNo: "",
    quotationDate: "",
    enquiryNo: "",
    enquiryDate: "",
    gstNumber: "",
    supplierEmail: "",
    supplierAddress: "",
    vendorId: "",
    preparedBy: "",
    approvedBy: "",
  });

  const [paymentTerms, setPaymentTerms] = useState(
    `1. Advance 5% = Rs. {advance} ; (Out of which an amount of Rs. 59,36,000.00 has been already transferred on date-21.09.2023) & balance amount of Rs.{balance} will be paid within a week.
2. Balance payment in advance against confirmation of dispatch.`
  );
  const [editingPayment, setEditingPayment] = useState(false);

  // Footer Notes state
  const [footerNotes, setFooterNotes] = useState(
    `Prices are inclusive of GST, Taxes, Freight, and Insurance- All inclusive. GST as per applicable at the time of billing.
Shipping location-To be delivered at in the state of Punjab, Haryana, Maharastra, Uttar Pradesh & Jharkhand.`
  );
  const [editingFooterNotes, setEditingFooterNotes] = useState(false);

  // Warranty state
  const [warrantyText, setWarrantyText] = useState(
    "As provided by you in your quotation, Bill of Material and sample and as per BIS and MNRE norms, Modules supplied should be strictly as per MNRE norms and Tender specification & ALMM applicability from April 2024."
  );
  const [editingWarranty, setEditingWarranty] = useState(false);

  // Product item type and state (mapped from INDENT sheet)
  type ProductItem = {
    sn: number; // Column C
    internalCode: string; // Column B - Planning Number
    itemType: string; // Column I
    product: string; // Column K - Item Name
    description: string; // Column P - Remarks
    qty: number; // Column M
    unit: string; // Column L
    rate: number; // not in sheet, default 0 or user input
    gst: number; // not in sheet, default 0 or user input
    discount: number; // not in sheet, default 0 or user input
    amount: number; // computed client-side
    quotationNo?: string; // user input
  };

  const [products, setProducts] = useState<ProductItem[]>([]);

  // console.log("selectedFirm",selectedFirm);

  // GAS endpoint routed via Vite proxy for CORS-free dev


  // Generic sheet fetcher
  const fetchSheet = async (table: string) => {
    const { data, error } = await supabase
      .from(table)
      .select("*");

    if (error) throw error;

    return data || [];
  };

  // Load planning_master options and planning->vendor map
  useEffect(() => {
    const loadIndents = async () => {
      setLoadingIndents(true);
      setError(null);
      try {
        console.log("Loading Indents...");
        // 1. Fetch only Approved planning_nos from planning_item_master
        const { data: approvedItems, error: itemsError } = await supabase
          .from("planning_master")
          .select("planning_no")
          .eq("status", "Approved");

        if (itemsError) throw itemsError;
        
        console.log("1. Approved Items in DB:", approvedItems);

        // 2. Fetch already processed planning_nos from purchase_order_master
        const { data: processedPOs, error: poError } = await supabase
          .from("purchase_order_master")
          .select("planning_no");

        if (poError) throw poError;
        
        console.log("2. Processed POs in DB:", processedPOs);

        const processedPlanningNos = new Set(
          processedPOs?.map((po) => po.planning_no).filter(Boolean)
        );

        const approvedPlanningNos = [
          ...new Set(
            approvedItems
              ?.map((item) => item.planning_no)
              .filter((pNo) => {
                const isProcessed = processedPlanningNos.has(pNo);
                if (isProcessed) console.log(`Filtered out ${pNo} because it is already in purchase_order_master`);
                return pNo && !isProcessed;
              })
          ),
        ];
        
        console.log("3. Final Approved Planning Nos for dropdown:", approvedPlanningNos);

        if (approvedPlanningNos.length === 0) {
          setIndentOptions([]);
          setLoadingIndents(false);
          return;
        }

        // 3. Fetch corresponding master records
        const { data: masterData, error: masterError } = await supabase
          .from("planning_master")
          .select("planning_no, vendor_name, firm, vendor_id")
          .in("planning_no", approvedPlanningNos);

        if (masterError) throw masterError;
        
        console.log("4. Master Data fetched for those Planning Nos:", masterData);

        const body = masterData || [];
        const options: string[] = [];
        const planningVendor: Record<string, string> = {};
        const planningFirm: Record<string, string> = {};
        const planningVId: Record<string, string> = {};

        body.forEach((r) => {
          const planningNo = r.planning_no;
          const vendorName = r.vendor_name;
          const firmName = r.firm;
          const vendorId = r.vendor_id;

          if (planningNo) {
            options.push(planningNo);
            if (vendorName) planningVendor[planningNo] = vendorName;
            if (firmName) planningFirm[planningNo] = firmName;
            if (vendorId) planningVId[planningNo] = vendorId;
          }
        });

        // De-duplicate while preserving order
        const uniqueOptions = Array.from(new Set(options));
        console.log("5. Unique Options pushing to state:", uniqueOptions);
        setIndentOptions(uniqueOptions);
        setPlanningToVendor(planningVendor);
        setPlanningToFirm(planningFirm);
        setPlanningToVendorId(planningVId);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load indent options");
      } finally {
        setLoadingIndents(false);
      }
    };
    loadIndents();
  }, []);

  // Fetch terms when the selected item type changes.
  useEffect(() => {
    if (selectedIndent && selectedItemType) {
      fetchTermsForProject(selectedItemType);
    }
  }, [selectedIndent, selectedItemType]);

 const ensureVendorDirectory = async () => {
  if (Object.keys(vendorDirectory).length > 0) return vendorDirectory;
  setLoadingVendor(true);
  try {
    const { data: vendorSheet, error } = await supabase
      .from("vendor_master")                        // ✅ table change
      .select("vendor_name, address, gstin, email") // ✅ correct column names
      .not("vendor_name", "is", null);

    if (error) throw error;

    const dir: Record<string, { address: string; gstin: string; email: string }> = {};

    (vendorSheet || []).forEach((vendor: any) => {
      const name = vendor.vendor_name?.toString().trim();
      const address = vendor.address?.toString() || "";       // ✅ address
      const gstin = vendor.gstin?.toString().trim() || "";   // ✅ gstin
      const email = vendor.email?.toString().trim() || "";   // ✅ email

      if (name) dir[name] = { address, gstin, email };
    });

    setVendorDirectory(dir);
    return dir;
  } catch (e) {
    console.error(e);
    setError("Failed to load Vendor Details");
    return {};
  } finally {
    setLoadingVendor(false);
  }
};

  const handleIndentChange = async (indentNo: string) => {
    setSelectedIndent(indentNo);
    if (!indentNo) {
      setSelectedSupplier("");
      setSelectedFirm("RBP INDIA PRIVATE LIMITED");
      setSelectedItemType("");
      setSelectedTermRecordId(null);
      setTerms([]);
      setTermsSource("");
      setPoData((prev) => ({
        ...prev,
        vendorId: "",
        supplierAddress: "",
        gstNumber: "",
        supplierEmail: "",
      }));
      setProducts([]);
      return;
    }

    try {
      setLoadingVendor(true);
      const vendorName = planningToVendor[indentNo] || "";
      const firmName = planningToFirm[indentNo] || "RBP INDIA PRIVATE LIMITED";
      const vId = planningToVendorId[indentNo] || "";
      setSelectedSupplier(vendorName);
      setSelectedFirm(firmName);
      setPoData(prev => ({ ...prev, vendorId: vId }));

      const currentVendorDir = await ensureVendorDirectory();
      const info = currentVendorDir[vendorName] || {};

      setPoData((prev) => ({
        ...prev,
        supplierAddress: info?.address || "",
        gstNumber: info?.gstin || "",
        supplierEmail: info?.email || "",
      }));

      // Load products for this indent
      const { data: mData } = await supabase
        .from("planning_master")
        .select("*")
        .eq("planning_no", indentNo);

      let mRow: any = null;
      if (mData && mData.length > 0) mRow = mData[0];
      setSelectedItemType(mRow?.item_type || "");
      setSelectedTermRecordId(null);

      const { data, error } = await supabase
        .from("planning_item_master")
        .select("id, planning_no, item, qty, description, uom")
        .eq("planning_no", indentNo);

      if (error) throw error;

      const mapped: ProductItem[] = (data || []).map((r: any, idx: number) => {
        let unit = r.uom || "-";
        let desc = r.description || "";
        if (unit === "-") {
          const match = desc.match(/\(UOM:\s*(.*?)\)/);
          if (match) {
            unit = match[1];
            desc = desc.replace(match[0], "").trim();
          }
        }

        return {
          sn: idx + 1,
          internalCode: r.planning_no || "",
          itemType: mRow?.item_type || "",
          product: r.item || "",
          description: desc,
          qty: Number(r.qty) || 0,
          unit: unit,
          rate: 0,
          gst: 0,
          discount: 0,
          amount: 0,
        };
      }).sort((a, b) => a.sn - b.sn);

      setProducts(mapped);
    } catch (error) {
      console.error("Failed to load products for indent", error);
      setProducts([]);
    } finally {
      setLoadingVendor(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setPoData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotals = () => {
    const subtotal = products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      return sum + (baseAmount - discountAmount);
    }, 0);

    const gstAmount = products.reduce((sum, product) => {
      const baseAmount = product.rate * product.qty;
      const discountAmount = (baseAmount * product.discount) / 100;
      const amountAfterDiscount = baseAmount - discountAmount;
      return sum + (amountAfterDiscount * product.gst) / 100;
    }, 0);

    const grandTotal = subtotal + gstAmount;

    return { subtotal, gstAmount, grandTotal };
  };

  const savePOHistory = async (pdfLink: string) => {
    const planningNo = selectedIndent || "AUTO-" + Date.now();
    const poNo = poData.poNumber || "AUTO-" + Date.now();
    const poDate = poData.poDate || new Date().toISOString().split('T')[0];
    const vendorName = selectedSupplier;

    let netPoAmount = 0;

    const poItemRows = products.map((item) => {
      const baseAmount = item.rate * item.qty;
      const discountAmount = (baseAmount * item.discount) / 100;
      const amountAfterDiscount = baseAmount - discountAmount;
      const gstAmount = (amountAfterDiscount * item.gst) / 100;
      const finalAmount = amountAfterDiscount + gstAmount;

      netPoAmount += finalAmount;

      return {
        po_id: poNo,
        planning_no: planningNo,
        item: item.product,
        qty: item.qty,
        rate: item.rate,
        gst_percent: item.gst,
        discount_percent: item.discount,
        net_amount: Math.round(finalAmount)
      };
    });

    const poMasterRow = {
      po_id: poNo,
      po_date: poDate,
      planning_no: planningNo,
      vendor_name: vendorName,
      net_po_amount: Math.round(netPoAmount),
      prepared_by: poData.preparedBy,
      approved_by: poData.approvedBy,
      po_copy: pdfLink,
      vendor_id: poData.vendorId
    };

    try {
      const { error: masterError } = await supabase
        .from("purchase_order_master")
        .insert([poMasterRow]);

      if (masterError) throw masterError;

      const { error: itemsError } = await supabase
        .from("po_item_master")
        .insert(poItemRows);

      if (itemsError) throw itemsError;

      return { success: true };
    } catch (error: any) {
      console.error("Supabase insert error:", error);
      return { success: false, error: error.message };
    }
  };
  const generateAndUploadImage = async () => {
    try {
      // Prepare data for PDF - reference PDF format के according
      const pdfData = {
        supplierName: selectedSupplier,
        supplierAddress: poData.supplierAddress,
        gstNumber: poData.gstNumber,
        poNumber: poData.poNumber || "AUTO-" + Date.now(),
        poDate: poData.poDate,
        products: products.map((product) => ({
          ...product,
          // Ensure proper state mapping
          description: product.description || "",
        })),
        terms: terms.map(t => typeof t === 'string' ? t : t.text),
        paymentTerms: paymentTerms,
        footerNotes: footerNotes, // ADD
        warrantyText: warrantyText,
      };

      // Get firm data
      const selectedFirmData = getFirmData(selectedFirm);

      // console.log("selectedFirmData",selectedFirmData);

      // Generate and upload PDF
      const result = await generatePDFFromHTML(
        pdfData,
        selectedFirmData
      );

      return result;
    } catch (error) {
      console.error("Error in generateAndUploadImage:", error);
      return {
        success: false,
        error: error?.message || "PDF generation error",
      };
    }
  };

  // Helper function to get state from product

  const isValid = useMemo(() => {
    return Boolean(selectedIndent && selectedSupplier && poData.poDate);
  }, [selectedIndent, selectedSupplier, poData.poDate]);

  const formatDateTime = (date: any) => {
    // Convert to Date object if it's a timestamp
    const dateObj = typeof date === "number" ? new Date(date) : date;

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, "0");
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const seconds = String(dateObj.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // console.log("PO submit started");
    e.preventDefault();
    if (!isValid) {
      setError("Please fill all required (*) fields.");
      return;
    }

    // if (!poData.supplierEmail) {
    //   alert("Supplier email is missing. Please update supplier details.");
    //   return;
    // }

    setIsSubmitting(true);
    // Generate current form as an image and upload to Drive
    const result = await generateAndUploadImage();
    if (result.success && result.fileUrl) {
      // Save PO history to Google Sheet
      const saveResult = await savePOHistory(result.fileUrl);
      if (saveResult.success) {
        alert(
          `PO generated, uploaded, and history saved successfully!\nPDF Link: ${result.fileUrl}`
        );
        handleReset();
      } else {
        alert(
          `PO generated and uploaded, but history save failed: ${saveResult.error}\nPDF Link: ${result.fileUrl}`
        );
      }
    } else {
      alert(`Upload failed: ${result.error || "Unknown error"}`);
    }

    setIsSubmitting(false);
  };

  //  const fetchTermsForItemType = async (itemType: string) => {
  //   if (!itemType) return;

  //   if (termsCache[itemType]) {
  //     setTerms(termsCache[itemType]);
  //     setTermsSource(`Loaded from cache for ${itemType}`);
  //     return;
  //   }

  //   setLoadingTerms(true);

  //   try {
  // const { data, error } = await supabase
  //   .from("po")
  //   .select("*");

  //     if (error) throw error;

  //     const filteredTerms = data?.map((row) => row.term_text) || [];

  //     // If no terms found, use default terms
  //     if (filteredTerms.length === 0) {
  //       setTerms([
  //         "Payment within 30 days of delivery",
  //         "Goods to be delivered at the destination address mentioned",
  //         "GST extra as applicable",
  //         "Warranty period as per standard terms",
  //         "Any disputes subject to local jurisdiction",
  //         "Delivery schedule to be strictly adhered to",
  //       ]);
  //       setTermsSource(`No terms found for ${itemType}, using defaults`);
  //     } else {
  //       setTermsCache((prev) => ({ ...prev, [itemType]: filteredTerms }));
  //       setTerms(filteredTerms);
  //       setTermsSource(`Fetched from database for ${itemType}`);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     setError("Failed to load terms and conditions");
  //     setTermsSource(`Failed to load terms for ${itemType}`);
  //   } finally {
  //     setLoadingTerms(false);
  //   }
  // };



  const fetchTermsForItemType = async (itemType: string) => {
    if (!itemType) {
      console.log("No item type provided");
      return;
    }

    console.log("👉 Selected Item Type:", itemType);

    // Check cache first
    if (termsCache[itemType]) {
      console.log(`✅ Using cached terms for ${itemType}`);
      console.log("📦 Cached Data:", termsCache[itemType]);
      setTerms(termsCache[itemType]);
      setTermsSource(`Loaded from cache for ${itemType}`);
      return;
    }

    setLoadingTerms(true);
    console.log(`🔄 Fetching terms for item type: ${itemType}`);

    try {
      const { data, error } = await supabase
        .from("term_and_condition")
        .select("id, terms_and_conditions")
        .eq("item_type", itemType)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // 🔥 IMPORTANT DEBUG
      console.log("📥 Raw Supabase Response:", data);

      console.log(`📊 Total Records Found: ${data?.length || 0}`);

      if (data && data.length > 0) {
        let allTerms: { id: number; text: string }[] = [];

        data.forEach((record, index) => {
          console.log(`📌 Record ${index + 1}:`, record);

          if (record.terms_and_conditions) {
            console.log(
              `📝 Raw Terms (Record ${index + 1}):`,
              record.terms_and_conditions
            );

            const termText = record.terms_and_conditions.trim();

            if (termText.length > 0) {
              allTerms.push({
                id: record.id,
                text: termText
              });
            }

            console.log(`✅ Final Term Added (Record ${index + 1}):`, termText);
          }
        });

        console.log("📦 Final Combined Terms Array:", allTerms);

        if (allTerms.length > 0) {
          setTermsCache((prev) => ({ ...prev, [itemType]: allTerms }));
          setTerms(allTerms);
          setTermsSource(`Fetched ${allTerms.length} terms from project_master for ${itemType}`);
          console.log(`🚀 Set ${allTerms.length} terms for ${itemType}`);
        } else {
          console.log("⚠️ No valid terms after processing");
          setTermsSource(`No valid terms found for ${itemType}, using defaults`);
        }
      } else {
        console.log(`❌ No terms found in DB for item_type: ${itemType}`);
        setTermsSource(`No terms found for ${itemType} in project_master, using defaults`);
      }
    } catch (error) {
      console.error("🔥 Error fetching terms:", error);
      setError("Failed to load terms and conditions");
      setTermsSource(`Failed to load terms for ${itemType}`);
    } finally {
      setLoadingTerms(false);
    }
  };

  const parseTermsText = (rawTerms: string | null | undefined) => {
    return (rawTerms || "")
      .split(/\r?\n+/)
      .map((term) => term.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  };

  const buildTermsText = (termRows: { text: string }[]) => {
    return termRows
      .map((term) => term.text.trim())
      .filter(Boolean)
      .join("\n");
  };

  const fetchTermsForProject = async (itemType: string) => {
    if (!itemType) return;

    if (termsCache[itemType]) {
      setTerms(termsCache[itemType]);
      setTermsSource(`Loaded from database cache for ${itemType}`);
      return;
    }

    setLoadingTerms(true);

    try {
      const { data, error } = await supabase
        .from("term_and_condition")
        .select("id, terms_and_conditions")
        .ilike("item_type", itemType)
        .order("id", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const parsedTerms = data.map((row) => ({
          id: row.id,
          text: row.terms_and_conditions || "",
        }));

        setTerms(parsedTerms);
        setTermsCache((prev) => ({
          ...prev,
          [itemType]: parsedTerms,
        }));
        setTermsSource(`Fetched ${data.length} terms from term_and_condition for ${itemType}`);
      } else {
        setTerms([]);
        setTermsSource(`No terms found in term_and_condition for ${itemType}`);
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
      setError("Failed to load terms and conditions");
      setTermsSource(`Failed to load terms for ${itemType}`);
    } finally {
      setLoadingTerms(false);
    }
  };




  const handleReset = () => {
    setSelectedIndent("");
    setSelectedSupplier("");
    setSelectedFirm("RBP INDIA PRIVATE LIMITED");
    setSelectedItemType("");
    setSelectedTermRecordId(null);
    setTerms([]);
    setTermsSource("");
    setPoData({
      poDate: new Date().toISOString().split("T")[0],
      poNumber: "",
      quotationNo: "",
      quotationDate: "",
      enquiryNo: "",
      enquiryDate: "",
      gstNumber: "",
      supplierEmail: "",
      supplierAddress: "",
      vendorId: "",
      preparedBy: "",
      approvedBy: "",
      project: "",
    });
  };

  // Terms & Conditions handlers
  const handleEditTerm = (index: number) => {
    setEditingTerm(index);
  };

  const handleSaveTerm = async (index: number, newText: string) => {
    if (!newText.trim()) {
      setEditingTerm(null);
      return;
    }

    if (!selectedItemType) {
      alert("Please select an indent with an item type first.");
      setEditingTerm(null);
      return;
    }

    try {
      const termToSave = terms[index];
      
      if (termToSave.id) {
        // Update existing row
        const { error } = await supabase
          .from("term_and_condition")
          .update({ terms_and_conditions: newText.trim() })
          .eq("id", termToSave.id);
        if (error) throw error;
      } else {
        // Insert new row
        const { data, error } = await supabase
          .from("term_and_condition")
          .insert([{ 
            item_type: selectedItemType, 
            terms_and_conditions: newText.trim() 
          }])
          .select();
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Update local state with the new ID
          setTerms(prev => prev.map((t, i) => i === index ? { ...t, id: data[0].id, text: newText.trim() } : t));
        }
      }

      const updatedTerms = terms.map((term, i) =>
        i === index ? { ...term, text: newText.trim() } : term
      );

      setTerms(updatedTerms);
      setTermsCache((prev) => ({
        ...prev,
        [selectedItemType]: updatedTerms as { id: number; text: string }[],
      }));
      setTermsSource(`Saved term to term_and_condition for ${selectedItemType}`);

    } catch (err: any) {
      console.error("Error saving term:", err);
      alert("Failed to save term: " + err.message);
      alert("Failed to save term: " + err.message);
    }

    setEditingTerm(null);
  };

  const handleCancelEdit = () => {
    setEditingTerm(null);
  };

  const handleDeleteTerm = async (index: number) => {
    if (window.confirm("Are you sure you want to delete this term?")) {
      try {
        const termToDelete = terms[index];

        if (termToDelete.id) {
          const { error } = await supabase
            .from("term_and_condition")
            .delete()
            .eq("id", termToDelete.id);
          if (error) throw error;
        }

        const nextTerms = terms.filter((_, i) => i !== index);
        setTerms(nextTerms);
        setTermsCache((prev) => ({
          ...prev,
          [selectedItemType]: nextTerms as { id: number; text: string }[],
        }));
        setTermsSource(`Deleted term from term_and_condition for ${selectedItemType}`);
      } catch (err: any) {
        console.error("Error deleting term:", err);
        alert("Failed to delete term: " + err.message);
      }
    }
  };

  const handleAddTerm = () => {
    setTerms((prev) => {
      const newTerms = [...prev, { id: selectedTermRecordId ?? undefined, text: "New term" }];
      setEditingTerm(newTerms.length - 1);
      return newTerms;
    });
  };

  const numberToWords = (num: number): string => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (num === 0) return "Zero";

    const convertHundreds = (n: number): string => {
      let result = "";
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + " ";
        n = 0;
      }
      if (n > 0) {
        result += ones[n] + " ";
      }
      return result.trim();
    };

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = num % 1000;

    let result = "";
    if (crores > 0) result += convertHundreds(crores) + " Crore ";
    if (lakhs > 0) result += convertHundreds(lakhs) + " Lakh ";
    if (thousands > 0) result += convertHundreds(thousands) + " Thousand ";
    if (hundreds > 0) result += convertHundreds(hundreds);

    return result.trim();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 space-x-3 sm:mb-0">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 sm:text-3xl">
                PO Generator
              </h1>
              <p className="text-sm font-medium text-gray-600 sm:text-base">
                Generate purchase orders from approved indents
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Company Header */}
      <div className="p-8 bg-white rounded-xl border border-gray-200">
        {/* Dynamic Company Header */}
        <div className="pb-6 mb-8 text-center border-b-2 border-blue-600">
          <h1 className="mb-2 text-3xl font-bold text-blue-600">
            {firmData[selectedFirm]?.name ||
              selectedFirm ||
              "RBP INDIA PRIVATE LIMITED"}
          </h1>
          <p className="text-gray-600">
            {firmData[selectedFirm]?.address ||
              "303, GURU GHASIDAS PLAZA, G.E. ROAD, AMAPARA RAIPUR, CHHATTISGARH, 492001"}
          </p>
          <p className="text-gray-600">
            Phone No: {firmData[selectedFirm]?.phone || "+91 92000 12400"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 gap-6 p-6 bg-gray-50 rounded-xl md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Indent No *
              </label>
              <select
                value={selectedIndent}
                onChange={(e) => handleIndentChange(e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loadingIndents}
              >
                <option value="">
                  {loadingIndents ? "Loading indents..." : "Select Indent No"}
                </option>
                {indentOptions.map((indent) => (
                  <option key={indent} value={indent}>
                    {indent}
                  </option>
                ))}
              </select>
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Supplier Name *
              </label>
              <input
                type="text"
                value={loadingVendor ? "Loading supplier..." : selectedSupplier}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                placeholder={
                  selectedIndent
                    ? "Auto-filled from indent"
                    : "Select Indent No First"
                }
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Supplier Address
              </label>
              <input
                type="text"
                value={poData.supplierAddress.replace(/\n/g, ", ")}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Vendor ID
              </label>
              <input
                type="text"
                value={poData.vendorId}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                placeholder={
                  selectedIndent
                    ? "Auto-filled from indent"
                    : "Select Indent No First"
                }
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                PO Date *
              </label>
              <input
                type="date"
                value={poData.poDate}
                onChange={(e) => handleInputChange("poDate", e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                PO Number
              </label>
              <input
                type="text"
                value={poData.poNumber}
                onChange={(e) => handleInputChange("poNumber", e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PO Number manually"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Quotation No
              </label>
              <input
                type="text"
                value={poData.quotationNo}
                onChange={(e) =>
                  handleInputChange("quotationNo", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Quotation Date
              </label>
              <input
                type="date"
                value={poData.quotationDate}
                onChange={(e) =>
                  handleInputChange("quotationDate", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Our Enq No
              </label>
              <input
                type="text"
                value={poData.enquiryNo}
                onChange={(e) => handleInputChange("enquiryNo", e.target.value)}
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Enq. Date
              </label>
              <input
                type="date"
                value={poData.enquiryDate}
                onChange={(e) =>
                  handleInputChange("enquiryDate", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                GST Number
              </label>
              <input
                type="text"
                value={poData.gstNumber}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                disabled
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={poData.supplierEmail}
                className="px-3 py-2 w-full bg-gray-100 rounded-lg border border-gray-300"
                disabled
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="pb-2 mb-4 text-lg font-semibold text-blue-600 border-b border-blue-600">
                Our Commercial Details
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value="22AAACG9223E1Z3"
                    className="px-3 py-2 w-full bg-gray-50 rounded-lg border border-gray-300"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    PAN No
                  </label>
                  <input
                    type="text"
                    value="AAACG9223E"
                    className="px-3 py-2 w-full bg-gray-50 rounded-lg border border-gray-300"
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="pb-2 text-lg font-semibold text-blue-600 border-b border-blue-600">
                  Billing Address
                </h3>
                {!editingBilling ? (
                  <button
                    onClick={() => setEditingBilling(true)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBilling(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBilling(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <textarea
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${editingBilling
                  ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  : "bg-gray-50"
                  }`}
                rows={4}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                readOnly={!editingBilling}
              />
            </div>

            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="pb-2 text-lg font-semibold text-blue-600 border-b border-blue-600">
                  Destination Address
                </h3>
                {!editingDestination ? (
                  <button
                    onClick={() => setEditingDestination(true)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingDestination(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDestination(false)}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <textarea
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${editingDestination
                  ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  : "bg-gray-50"
                  }`}
                rows={4}
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                readOnly={!editingDestination}
              />
            </div>
          </div>

          {/* Products Table */}
          {selectedIndent && (
            <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
              <div className="flex justify-between items-center p-4 text-white bg-gradient-to-r from-blue-600 to-blue-700"></div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        S/N
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Planning No
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Item Type
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Qty
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Rate
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        GST %
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase md:table-cell">
                        Discount %
                      </th>
                      <th className="px-4 py-3 text-xs font-bold tracking-wider text-left text-white uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product, index) => (
                      <tr
                        key={`${product.sn}-${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm">{product.sn}</td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          {product.internalCode}
                        </td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          <input
                            type="text"
                            value={product.itemType}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-32 focus:ring-1 focus:ring-blue-500"
                            onChange={async (e) => {
                              const newType = e.target.value;
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, itemType: newType }
                                    : p
                                )
                              );

                              if (newType) {
                                setSelectedItemType(newType);
                                await fetchTermsForProject(newType);
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          <textarea
                            value={product.product}
                            className="px-2 py-1 w-full min-h-[80px] rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 resize-y overflow-y-auto whitespace-pre-wrap"
                            onChange={(e) => {
                              const newProduct = e.target.value;
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, product: newProduct }
                                    : p
                                )
                              );
                            }}
                            placeholder="Enter product name"
                            rows={3}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {product.description}
                        </td>
                        <td className="px-4 py-3 text-sm">{product.qty}</td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          {product.unit}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            defaultValue={product.rate}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-20 focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, rate: value }
                                    : p
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          <input
                            type="number"
                            defaultValue={product.gst}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-16 focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn ? { ...p, gst: value } : p
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="hidden px-4 py-3 text-sm md:table-cell">
                          <input
                            type="number"
                            defaultValue={product.discount}
                            className="px-2 py-1 w-full rounded border border-gray-300 sm:w-16 focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                              const value = Number(e.target.value || 0);
                              setProducts((prev) =>
                                prev.map((p) =>
                                  p.sn === product.sn
                                    ? { ...p, discount: value }
                                    : p
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          ₹
                          {(() => {
                            const base = product.rate * product.qty;
                            const afterDiscount =
                              base - (base * product.discount) / 100;
                            const total =
                              afterDiscount +
                              (afterDiscount * product.gst) / 100;
                            return Math.round(total);
                          })().toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        Total:
                      </td>
                      <td className="px-4 py-3 font-bold">
                        ₹{calculateTotals().subtotal.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        GST Amount:
                      </td>
                      <td className="px-4 py-3 font-bold">
                        ₹{calculateTotals().gstAmount.toLocaleString()}
                      </td>
                    </tr>

                    {/* <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        Grand Total:
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600">
                        ₹{calculateTotals().grandTotal.toLocaleString()}
                      </td>
                    </tr> */}

                    <tr>
                      <td
                        colSpan={10}
                        className="px-4 py-3 font-medium text-right"
                      >
                        <div className="text-right">Grand Total:</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600">
                        ₹{calculateTotals().grandTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div>
            <span className="text-red-900">
              ({numberToWords(Math.round(calculateTotals().grandTotal))})
            </span>{" "}
          </div>

          {/* Footer Notes Section */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <h4 className="text-lg font-semibold text-gray-900"></h4>
              {!editingFooterNotes ? (
                <button
                  onClick={() => setEditingFooterNotes(true)}
                  className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingFooterNotes(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingFooterNotes(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${editingFooterNotes
                ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                : "bg-gray-50"
                }`}
              rows={4}
              value={footerNotes}
              onChange={(e) => setFooterNotes(e.target.value)}
              readOnly={!editingFooterNotes}
              placeholder="Enter footer notes here..."
            />
          </div>

          {/* Payment Terms Section */}
          <div className="p-2 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <h4 className="text-lg font-semibold text-gray-900">
                Payment Terms
              </h4>
              {!editingPayment ? (
                <button
                  onClick={() => setEditingPayment(true)}
                  className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPayment(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPayment(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${editingPayment
                ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                : "bg-gray-50"
                }`}
              rows={4}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              readOnly={!editingPayment}
              placeholder="Enter payment terms here..."
            />
          </div>

          {/* Warranty & Specification Section */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <h4 className="text-lg font-semibold text-gray-900">
                Warranty & Specification
              </h4>
              {!editingWarranty ? (
                <button
                  onClick={() => setEditingWarranty(true)}
                  className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingWarranty(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-green-600 rounded-lg transition-colors hover:bg-green-700"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingWarranty(false)}
                    className="flex gap-2 items-center px-3 py-1 text-sm text-white bg-gray-600 rounded-lg transition-colors hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <textarea
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-none ${editingWarranty
                ? "bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                : "bg-gray-50"
                }`}
              rows={4}
              value={warrantyText}
              onChange={(e) => setWarrantyText(e.target.value)}
              readOnly={!editingWarranty}
              placeholder="Enter warranty text here..."
            />
          </div>

          {/* Terms & Conditions */}
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="flex flex-col mb-4 space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Terms & Conditions
                </h4>
                {termsSource && (
                  <p className="flex items-center text-sm text-gray-600">
                    {termsSource.includes("Failed") ? (
                      <XCircle className="mr-1 w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="mr-1 w-4 h-4 text-green-500" />
                    )}
                    {termsSource}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddTerm}
                className="flex gap-2 items-center self-start px-3 py-1 text-sm text-white bg-blue-600 rounded-lg transition-colors hover:bg-blue-700 sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
            </div>
            {loadingTerms ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-2">Loading terms...</span>
              </div>
            ) : terms.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">
                No terms found for the selected project.
              </div>
            ) : (
              <div className="space-y-3">
                {terms.map((term, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-center p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <span className="text-sm font-medium text-gray-500 min-w-[24px]">
                      {index + 1}.
                    </span>
                    {editingTerm === index ? (
                      <div className="flex flex-1 gap-2 items-center">
                        <input
                          type="text"
                          value={term.text}
                          onChange={(e) =>
                            setTerms((prev) =>
                              prev.map((t, i) =>
                                i === index ? { ...t, text: e.target.value } : t
                              )
                            )
                          }
                          className="flex-1 px-3 py-1 text-sm rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTerm(index, term.text)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700">
                          {term.text}
                        </span>
                        <div className="flex gap-1 items-center">
                          <button
                            type="button"
                            onClick={() => handleEditTerm(index)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTerm(index)}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-1 gap-6 pt-8 border-t border-gray-200 md:grid-cols-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Prepared By *
              </label>

              <input
                type="text"
                value={poData.preparedBy}
                onChange={(e) =>
                  handleInputChange("preparedBy", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter Prepared By"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Approved By *
              </label>
              <input
                type="text"
                value={poData.approvedBy}
                onChange={(e) =>
                  handleInputChange("approvedBy", e.target.value)
                }
                className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter Approved By"
                required
              />
            </div>

            <div className="flex items-end">
              <div className="w-full text-center">
                <p className="text-sm font-medium text-gray-700">
                  For Director
                </p>
                <p className="mb-2 text-lg font-bold text-blue-600">
                  {firmData[selectedFirm]?.name ||
                    selectedFirm ||
                    "RBP INDIA PRIVATE LIMITED"}
                </p>
                <div className="mt-8 h-12 border-b border-gray-300"></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col justify-center pt-8 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <button
              type="button"
              onClick={handleReset}
              className="flex justify-center items-center px-6 py-3 text-gray-700 rounded-lg border border-gray-300 transition-colors duration-200 hover:bg-gray-50 sm:justify-start"
            >
              <RefreshCw className="mr-2 w-5 h-5" />
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex justify-center items-center px-8 py-3 text-white rounded-lg transition-colors duration-200 sm:justify-start ${isSubmitting
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {/* <Send className="mr-2 w-5 h-5" /> */}
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default POGenerator;
