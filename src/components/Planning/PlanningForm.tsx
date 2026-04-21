import { supabase } from "../../lib/supabase";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Building,
  Truck,
  Package,
  MapPin,
  FileText,
} from "lucide-react";

interface PlanningFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: {
    formData: FormData;
    products: Product[];
    planningNo: string;
  };
}

interface Product {
  id: string;
  packingDetail: string;
  itemName: string;
   itemCode?: string;
  uom: string;
  qty: number;
  qtySet: number;
  totalQty: number;
  remarks: string;
}

interface FormData {
  date: string;
  requesterName: string;
  projectName: string;
  firmName: string;
  vendorName: string;
  itemType: string;
  state: string;
  department: string;
  packingDetailSelect: string;
  masterQuantity: string;
  vendorId: string;
}

const PlanningForm: React.FC<PlanningFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {


  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split("T")[0],
    requesterName: "",
    projectName: "",
    firmName: "",
    vendorName: "",
    itemType: "",
    state: "",
    department: "",
    packingDetailSelect: "",
    masterQuantity: "",
    vendorId: "",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Dropdown dynamic options and loading states
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [firmOptions, setFirmOptions] = useState<string[]>([]);
  const [vendorOptionsFlat, setVendorOptionsFlat] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [departmentOptionsFlat, setDepartmentOptionsFlat] = useState<string[]>(
    []
  );
  const [vendorIdOptions, setVendorIdOptions] = useState<string[]>([]);

  const [packingDetailOptions, setPackingDetailOptions] = useState<string[]>([]);


  const [itemTypeOptions, setItemTypeOptions] = useState<string[]>([]);
  const [vendorNameToId, setVendorNameToId] = useState<Record<string, string>>({});
  const [dropdownLoading, setDropdownLoading] = useState<boolean>(false);
  const [dropdownError, setDropdownError] = useState<string | null>(null);

  const [uomOptions, setUomOptions] = useState<string[]>([
    "Kg",
    "Pieces",
    "Meters",
    "Liters",
    "Sets",
  ]);

  const [itemData, setItemData] = useState<{
    [key: string]: { qtySet: number; uom: string };
  }>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [itemTypeToVendors, setItemTypeToVendors] = useState<
    Record<string, string[]>
  >({});
  const [stateToDepartments, setStateToDepartments] = useState<
    Record<string, string[]>
  >({});
  const [enhancedMappingsLoaded, setEnhancedMappingsLoaded] = useState(false);
  // Master Items for cascading dropdown (non-BOS)
  const [masterItems, setMasterItems] = useState<
    { name: string; group: string; uom: string }[]
  >([]);
  const [masterItemsLoading, setMasterItemsLoading] = useState(false);
  const [masterItemsError, setMasterItemsError] = useState<string | null>(null);

  // All Master Items (loaded once, filtered by item type in UI) - similar to BOS approach
  const [allMasterItems, setAllMasterItems] = useState<
    {
      code: any | string | undefined; name: string; group: string; uom: string 
}[]
  >([]);


  // const fetchDropdownData = async () => {
  //   try {
  //     setDropdownLoading(true);

  //     // 1. Fetch projects from Supabase
  //     const { data: projectData } = await supabase
  //       .from("project_master")
  //       .select("project_name");

  //     setProjectOptions([...new Set(projectData?.map(p => p.project_name) || [])]);

  //     // 2. Fetch firms from Supabase
  //     const { data: firmData } = await supabase
  //       .from("project_master")
  //       .select("firm_name");

  //     setFirmOptions([...new Set(firmData?.map(f => f.firm_name) || [])]);

  //     // 3. Fetch vendors with their item types from Supabase
  //     const { data: vendorData } = await supabase
  //       .from("project_master")
  //       .select("vendor_name, item_type");

  //     if (vendorData) {
  //       setVendorOptionsFlat([...new Set(vendorData.map(v => v.vendor_name))]);

  //       const mapping: Record<string, string[]> = {};
  //       vendorData.forEach(v => {
  //         if (!mapping[v.item_type]) mapping[v.item_type] = [];
  //         mapping[v.item_type].push(v.vendor_name);
  //       });
  //       setItemTypeToVendors(mapping);
  //     }

  //     // 4. Fetch products from Supabase
  //     const { data: productData } = await supabase
  //       .from("project_master")
  //       .select("product_name, group_head, uom");

  //     if (productData) {
  //       setAllMasterItems(
  //         productData.map(p => ({
  //           name: p.product_name,
  //           group: p.group_head,
  //           uom: p.uom
  //         }))
  //       );
  //     }

  //     // 5. Fetch UOM options from project_master (unique UOMs)
  //     const { data: uomData } = await supabase
  //       .from("project_master")
  //       .select("uom")
  //       .not("uom", "is", null)
  //       .not("uom", "eq", "");

  //     const uniqueUoms = [...new Set(uomData?.map(u => u.uom) || [])];
  //     setUomOptions(uniqueUoms.length > 0 ? uniqueUoms : ["Kg", "Pieces", "Meters", "Liters", "Sets"]);

  //     // 6. Set STATE options (hardcoded fallback - create state_master table if needed)
  //     const stateOptionsList = [
  //       "Maharashtra",
  //       "Gujarat",
  //       "Karnataka",
  //       "Delhi",
  //       "Tamil Nadu",
  //       "Uttar Pradesh",
  //       "Rajasthan",
  //       "West Bengal",
  //       "Telangana",
  //       "Haryana"
  //     ];
  //     setStateOptions(stateOptionsList);

  //     // 7. Set DEPARTMENT options (hardcoded fallback - create department_master table if needed)
  //     const departmentOptionsList = [
  //       "Support",
  //       "Operations",
  //       "Finance",
  //       "HR",
  //       "Procurement",
  //       "Logistics",
  //       "Sales",
  //       "Marketing"
  //     ];
  //     setDepartmentOptionsFlat(departmentOptionsList);

  //     // 8. Set ITEM TYPE options from project_master (unique item types)
  //     const { data: itemTypeData } = await supabase
  //       .from("project_master")
  //       .select("item_type")
  //       .not("item_type", "is", null)
  //       .not("item_type", "eq", "");

  //     const uniqueItemTypes = [...new Set(itemTypeData?.map(i => i.item_type) || [])];
  //     setItemTypeOptions(uniqueItemTypes.length > 0 ? uniqueItemTypes : [
  //       "CABLE",
  //       "POLYMER",
  //       "BATTERY",
  //       "PANEL",
  //       "BOS",
  //       "PUMP"
  //     ]);

  //     // 9. Create state to department mapping (hardcoded for now)
  //     const stateDeptMapping: Record<string, string[]> = {
  //       "Maharashtra": ["Support", "Operations", "Finance", "Procurement"],
  //       "Gujarat": ["Support", "Operations", "Logistics"],
  //       "Karnataka": ["Support", "Operations", "Finance", "Sales"],
  //       "Delhi": ["Support", "Operations", "Marketing"],
  //       "Tamil Nadu": ["Support", "Operations", "Finance"],
  //       "Uttar Pradesh": ["Support", "Operations"],
  //       "Rajasthan": ["Support", "Operations"],
  //       "West Bengal": ["Support", "Operations", "Finance"],
  //       "Telangana": ["Support", "Operations", "Procurement"],
  //       "Haryana": ["Support", "Operations", "Logistics"]
  //     };
  //     setStateToDepartments(stateDeptMapping);

  //     setEnhancedMappingsLoaded(true);

  //   } catch (err) {
  //     console.error(err);
  //     setDropdownError("Failed to load dropdown data");

  //     // Set fallback options on error
  //     setProjectOptions(["OFFGRID POWER PLANT", "Other"]);
  //     setFirmOptions(["Om Renewable (India) Pvt Ltd", "Other"]);
  //     setVendorOptionsFlat(["Steel Works", "Other"]);
  //     setStateOptions(["Maharashtra", "Gujarat", "Karnataka", "Delhi", "Tamil Nadu"]);
  //     setDepartmentOptionsFlat(["Support", "Operations", "Finance", "Procurement"]);
  //     setItemTypeOptions(["CABLE", "POLYMER", "BATTERY", "PANEL", "BOS", "PUMP"]);
  //     setUomOptions(["Kg", "Pieces", "Meters", "Liters", "Sets"]);

  //   } finally {
  //     setDropdownLoading(false);
  //   }
  // };



const fetchDropdownData = async () => {
  try {
    setDropdownLoading(true);

    // project_master se sirf project, firm, state, department
    const { data: pmData, error: pmError } = await supabase
      .from("project_master")
      .select("project_name, firm_name, uom, state, department_name");

    if (pmError) throw pmError;

    if (pmData) {
      setProjectOptions([...new Set(pmData.map(p => p.project_name).filter(Boolean))]);
      setFirmOptions([...new Set(pmData.map(f => f.firm_name).filter(Boolean))]);
      setUomOptions([...new Set(pmData.map(u => u.uom).filter(Boolean))]);
      setStateOptions([...new Set(pmData.map(s => s.state).filter(Boolean))]);
      setDepartmentOptionsFlat([...new Set(pmData.map(d => d.department_name).filter(Boolean))]);

      const sdMapping: Record<string, string[]> = {};
      pmData.forEach(item => {
        if (item.state && item.department_name) {
          if (!sdMapping[item.state]) sdMapping[item.state] = [];
          if (!sdMapping[item.state].includes(item.department_name))
            sdMapping[item.state].push(item.department_name);
        }
      });
      setStateToDepartments(sdMapping);
    }

    // vendor_master se items_type, vendor_name, vendor_id
    const { data: vmData, error: vmError } = await supabase
      .from("vendor_master")
      .select("items_type, vendor_name, vendor_id");

    if (vmError) throw vmError;

    if (vmData) {
      setItemTypeOptions([...new Set(vmData.map(v => v.items_type).filter(Boolean))]);
      setVendorOptionsFlat([...new Set(vmData.map(v => v.vendor_name).filter(Boolean))]);

      const nameToId: Record<string, string> = {};
      vmData.forEach(v => {
        if (v.vendor_name && v.vendor_id)
          nameToId[v.vendor_name] = String(v.vendor_id);
      });
      setVendorNameToId(nameToId);

      const vMapping: Record<string, string[]> = {};
      vmData.forEach(v => {
        if (v.items_type && v.vendor_name) {
          if (!vMapping[v.items_type]) vMapping[v.items_type] = [];
          if (!vMapping[v.items_type].includes(v.vendor_name))
            vMapping[v.items_type].push(v.vendor_name);
        }
      });
      setItemTypeToVendors(vMapping);

      setVendorIdOptions([...new Set(vmData.map(v => v.vendor_id).filter(Boolean).map(id => String(id)))]);
    }

    // ✅ PRODUCTS YAHAN FETCH NAHI — loadAllMasterItems useEffect handle karega
    setEnhancedMappingsLoaded(true);

  } catch (err) {
    console.error("Error loading dropdown data:", err);

    setDropdownError("Failed to load dropdown data");
  } finally {
    setDropdownLoading(false);
  }
};



  useEffect(() => {
    fetchDropdownData();
  }, []);



  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (initialData) {
        setFormData(initialData.formData);
        setProducts(initialData.products);
      } else {
        resetForm();
      }
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, initialData]);

  // Dynamic packing detail options based on item type (BOS) - Optimized
  // Dynamic packing detail options based on item type (BOS) - Optimized
  useEffect(() => {
    if (normalizeStr(formData.itemType) === "bos") {
      // Set packing options from database or default
      if (packingDetailOptions.length === 0) {
        setPackingDetailOptions([
          "Standard Pack",
          "Custom Pack",
          "Bulk Pack",
          "Individual Pack",
        ]);
      }

      // Start loading products immediately
      loadBOSProducts();
    } else {
      // Reset BOS-specific state when switching away from BOS
      setPackingDetailOptions([]);
      setAllProducts([]);
      setItemData({});
      setProducts([]);
      if (formData.packingDetailSelect) {
        setFormData((prev) => ({ ...prev, packingDetailSelect: "" }));
      }
    }
  }, [formData.itemType]);




  // const loadBOSProducts = async () => {
  //   try {
  //     // Fetch BOS products from project_master table
  //     const { data: bosProducts, error } = await supabase
  //       .from("project_master")
  //       .select("product_name, uom, group_head")
  //       .ilike("group_head", "bos"); // Case-insensitive search for BOS

  //     if (error) throw error;

  //     const fetchedProducts: Product[] = [];

  //     if (bosProducts && bosProducts.length > 0) {
  //       bosProducts.forEach((product, index) => {
  //         fetchedProducts.push({
  //           id: `bos-${index}-${Date.now()}`,
  //           packingDetail: formData.packingDetailSelect || "Standard Pack",
  //           itemName: product.product_name,
  //           uom: product.uom || "",
  //           qty: 0,
  //           qtySet: 1,
  //           totalQty: 0,
  //           remarks: "",
  //         });
  //       });
  //     } else {
  //       // Fallback if no BOS products found
  //       fetchedProducts.push(
  //         {
  //           id: `fallback-1-${Date.now()}`,
  //           packingDetail: "Standard Pack",
  //           itemName: "Solar Panel 250W",
  //           uom: "Pieces",
  //           qty: 0,
  //           qtySet: 1,
  //           totalQty: 0,
  //           remarks: "BOS fallback item",
  //         },
  //         {
  //           id: `fallback-2-${Date.now()}`,
  //           packingDetail: "Standard Pack",
  //           itemName: "Mounting Structure",
  //           uom: "Sets",
  //           qty: 0,
  //           qtySet: 1,
  //           totalQty: 0,
  //           remarks: "BOS fallback item",
  //         }
  //       );
  //     }

  //     setAllProducts(fetchedProducts);

  //     // Create item data mapping
  //     const tempItemData: { [key: string]: { qtySet: number; uom: string } } = {};
  //     fetchedProducts.forEach(product => {
  //       tempItemData[product.itemName] = {
  //         qtySet: product.qtySet,
  //         uom: product.uom,
  //       };
  //     });
  //     setItemData(tempItemData);

  //   } catch (err) {
  //     console.error("Error loading BOS products:", err);
  //     // Set fallback products
  //     const fallbackProducts: Product[] = [
  //       {
  //         id: `fallback-1-${Date.now()}`,
  //         packingDetail: "Standard Pack",
  //         itemName: "Solar Panel 250W",
  //         uom: "Pieces",
  //         qty: 0,
  //         qtySet: 1,
  //         totalQty: 0,
  //         remarks: "BOS fallback item",
  //       },
  //       {
  //         id: `fallback-2-${Date.now()}`,
  //         packingDetail: "Standard Pack",
  //         itemName: "Mounting Structure",
  //         uom: "Sets",
  //         qty: 0,
  //         qtySet: 1,
  //         totalQty: 0,
  //         remarks: "BOS fallback item",
  //       },
  //     ];
  //     setAllProducts(fallbackProducts);
  //   }
  // };


  const loadBOSProducts = async () => {
    try {
      const { data: bosProducts, error } = await supabase
       .from("item_master")
.select("product_name, item_type, uom, product_code")
        .ilike("item_type", "bos");

      console.log("[BOS Fetch] Data:", bosProducts, "Error:", error);

      if (error) throw error;

      const fetchedProducts: Product[] = [];

      if (bosProducts && bosProducts.length > 0) {
        bosProducts.forEach((product, index) => {
          fetchedProducts.push({
            id: `bos-${index}-${Date.now()}`,
            packingDetail: formData.packingDetailSelect || "Standard Pack",
            itemName: product.product_name,
            itemCode: product.product_code,
            uom: product.uom || "",
            qty: 0,
            qtySet: 1,
            totalQty: 0,
            remarks: "",
          });
        });
      }

      setAllProducts(fetchedProducts);

      // Create item data mapping
      const tempItemData: { [key: string]: { qtySet: number; uom: string } } = {};
      fetchedProducts.forEach(product => {
        tempItemData[product.itemName] = {
          qtySet: product.qtySet,
          uom: product.uom,
        };
      });
      setItemData(tempItemData);

    } catch (err) {
      console.error("Error loading BOS products:", err);
      setAllProducts([]);
    }
  };





useEffect(() => {
  const loadAllMasterItems = async () => {
    setMasterItemsLoading(true);
    setAllMasterItems([]); // pehle clear karo
    try {
      const { data: productData, error } = await supabase
        .from("item_master")
        .select("product_name, item_type, uom, product_code");

      if (error) throw error;

      const allItems = (productData || [])
        .filter(p => p.product_name)
        .map(p => ({
          name: p.product_name,
          group: (p.item_type || "").trim().toLowerCase(),
          uom: (p.uom || "Nos").trim(),
          code: p.product_code || ""
        }));

      console.log("✅ item_master loaded:", allItems.length);
      setAllMasterItems(allItems);

      // ✅ item_master ke UOM bhi uomOptions mein add karo
      const itemUoms = [...new Set(allItems.map(i => i.uom).filter(Boolean))];
      setUomOptions(prev => [...new Set([...prev, ...itemUoms])]);

    } catch (err) {
      console.error("Error:", err);
      setMasterItemsError("Failed to load master items");
    } finally {
      setMasterItemsLoading(false);
    }
  };

  loadAllMasterItems();
}, []);


  // Reset vendor when item type changes
  useEffect(() => {
    if (formData.itemType !== "") {
      // Don't reset vendor name when item type changes, but ensure it's valid for the new item type
      const availableVendors = getVendorOptions();
      if (!availableVendors.includes(formData.vendorName)) {
        setFormData((prev) => ({ ...prev, vendorName: "" }));
      }
    }
  }, [formData.itemType, itemTypeToVendors]);

  // Get filtered items for dropdown based on item type (BOS vs non-BOS)
  // const getFilteredItemsForDropdown = () => {
  //   if (normalizeStr(formData.itemType) === "bos") {
  //     // For BOS items, try different variations of BOS group name
  //     const bosVariations = ["bos", "BOS", "cil", "CIL", "b.o.s", "C.O.S"];
  //     let bosItems: { name: string; group: string; uom: string }[] = [];

  //     for (const variation of bosVariations) {
  //       const items = allMasterItems.filter(
  //         (item) => normalizeStr(item.group) === normalizeStr(variation)
  //       );
  //       if (items.length > 0) {
  //         bosItems = items;
  //         break;
  //       }
  //     }

  //     // If no BOS items found, return fallback items
  //     if (bosItems.length === 0) {
  //       return [
  //         { name: "Solar Panel 250W", group: "BOS", uom: "Pieces" },
  //         { name: "Inverter 5kW", group: "BOS", uom: "Units" },
  //         { name: "Mounting Structure", group: "BOS", uom: "Sets" },
  //         { name: "DC Cable 4mm", group: "BOS", uom: "Meters" },
  //       ];
  //     }

  //     return bosItems;
  //   } else {
  //     // For non-BOS items, filter allMasterItems by item type
  //     const normalizedType = normalizeStr(formData.itemType);
  //     return allMasterItems.filter(
  //       (item) => normalizeStr(item.group) === normalizedType
  //     );
  //   }
  // };


  const getFilteredItemsForDropdown = () => {
    if (normalizeStr(formData.itemType) === "bos") {
      // For BOS items, filter by item_type = "bos"
      const bosItems = allMasterItems.filter(
        (item) => normalizeStr(item.group) === "bos"
      );

      return bosItems;
    } else {
      // For non-BOS items, filter by item_type
      const normalizedType = normalizeStr(formData.itemType);

      console.log("Selected ItemType:", formData.itemType);
console.log("Normalized:", normalizedType);
console.log("All Items:", allMasterItems);


      return allMasterItems.filter((item) => {
        const itemGroup = normalizeStr(item.group);
        return itemGroup === normalizedType || itemGroup.includes(normalizedType);
      });
    }
  };



  // Filter products by selected packing detail
  useEffect(() => {
    const isBOS = normalizeStr(formData.itemType) === "bos";

    if (isBOS) {
      const sel = normalizeStr(formData.packingDetailSelect || "");
      if (!sel) {
        // For BOS, hide the table until a packing detail is selected
        setProducts([]);
        return;
      }
      const filtered = allProducts.filter((p) => {
        const pd = normalizeStr(p.packingDetail || "");
        return pd === sel || pd.includes(sel);
      });
      setProducts(filtered);
    } else {
      // For other item types, filter only when packing detail is selected
      if (formData.packingDetailSelect && formData.packingDetailSelect.trim()) {
        const sel = normalizeStr(formData.packingDetailSelect);
        const filtered = allProducts.filter((p) => {
          const pd = normalizeStr(p.packingDetail || "");
          return pd === sel || pd.includes(sel);
        });
        setProducts(filtered);
      } else {
        // For other item types, show empty list when no packing detail is selected
        setProducts([]);
      }
    }
  }, [formData.packingDetailSelect, formData.itemType, allProducts]);



  // Helper to normalize strings (for case-insensitive, space-tolerant compares)
  const normalizeStr = (s: string) =>
    (s || "").toString().replace(/\s+/g, " ").trim().toLowerCase();





  const loadDropdowns = async (force: boolean = false) => {
    await fetchDropdownData();
  };


  const handleFormDataChange = (field: keyof FormData, value: string) => {
    let v = value;
    if (field === "itemType" || field === "packingDetailSelect") {
      v = (value || "").trim();
    }
    setFormData((prev) => ({ ...prev, [field]: v }));
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      packingDetail: formData.packingDetailSelect,
      itemName: "",
      uom: "",
      qty: 0,
      qtySet: normalizeStr(formData.itemType) === "bos" ? 0 : 1, // Set qtySet to 1 for non-BOS
      totalQty: 0,
      remarks: "",
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = (
    id: string,
    field: keyof Product,
    value: string | number
  ) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === id) {
          const updated = { ...product, [field]: value };

          // Auto-calculate total quantity
          if (field === "qty" || field === "qtySet") {
            const qty = field === "qty" ? Number(value) : updated.qty;
            const qtySet = updated.qtySet || 1; // Always use qtySet from product data

            // For BOS items, multiply qty * qtySet
            if (normalizeStr(formData.itemType) === "bos") {
              updated.totalQty = qty * qtySet;
            } else {
              // For non-BOS items, total = qty (qtySet is always 1)
              updated.totalQty = qty;
              updated.qtySet = 1;
            }
          }

          return updated;
        }
        return product;
      })
    );
  };

  const handleItemNameChange = (productId: string, itemName: string) => {
    updateProduct(productId, "itemName", itemName);

const matchingItem = getFilteredItemsForDropdown().find(
  (item) => normalizeStr(item.name) === normalizeStr(itemName)
);

console.log("[Matching Item] Result:", matchingItem);

if (matchingItem) {
  updateProduct(productId, "uom", matchingItem.uom);

  setProducts(prev =>
    prev.map(p =>
      p.id === productId
        ? { ...p, itemCode: matchingItem.code || "" }
        : p
    )
  );
}
};

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const updateAllQuantities = () => {
    const masterQuantity = parseFloat(formData.masterQuantity) || 0;

    if (!masterQuantity) return;

    setProducts((prev) =>
      prev.map((product) => ({
        ...product,
        qty: masterQuantity,
        totalQty: masterQuantity * product.qtySet,
      }))
    );
  };

  // Remove Google Sheets submission logic as per user request (fully connected to Supabase)



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // ---------- SAME VALIDATION (UNCHANGED) ----------
    const requiredFields: (keyof FormData)[] = [
      "date",
      "requesterName",
      "projectName",
      "firmName",
      "vendorName",
      "itemType",
      "state",
      "department",
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field]?.trim()
    );

    if (missingFields.length > 0) {
      alert(`Please fill the following required fields: ${missingFields.join(", ")}`);
      return;
    }

    const productsToSubmit = products.filter(p => Number(p.qty) > 0);

    if (productsToSubmit.length === 0) {
      alert("Please add at least one product item with a quantity greater than 0.");
      return;
    }

    const invalidProducts = productsToSubmit.filter(
      (p) =>
        !p.itemName?.trim() ||
        !p.uom?.trim() ||
        isNaN(Number(p.qty))
    );

    if (invalidProducts.length > 0) {
      alert(
        `Please complete all required fields for products. Missing data in ${invalidProducts.length} item(s).`
      );
      return;
    }

    setIsLoading(true);

    try {
      let nextPN = initialData?.planningNo || "PN-01";

      if (!initialData) {
        // ---------- PLANNING NUMBER GENERATION ----------
        const { data: existing } = await supabase
          .from("planning_master")
          .select("planning_no");

        if (existing && existing.length > 0) {
          let max = 0;
          existing.forEach((r: any) => {
            const pn = r.planning_no || "";
            const match = pn.match(/PN-(\d+)/);
            if (match) {
              const num = parseInt(match[1]);
              if (num > max) max = num;
            }
          });
          nextPN = "PN-" + String(max + 1).padStart(2, "0");
        }
      }

      const masterRow = {
        planning_no: nextPN,
        date: formData.date,
        requester_name: formData.requesterName,
        project: formData.projectName,
        firm: formData.firmName,
        vendor_name: formData.vendorName,
        vendor_id: formData.vendorId,
        item_type: formData.itemType,
        state: formData.state,
        department: formData.department,
       
      };

      if (initialData) {
        const { error: masterError } = await supabase
          .from("planning_master")
          .update(masterRow)
          .eq("planning_no", nextPN);
        if (masterError) throw masterError;

        // For updates, delete old items first
        const { error: deleteError } = await supabase
          .from("planning_item_master")
          .delete()
          .eq("planning_no", nextPN);
        if (deleteError) throw deleteError;
      } else {
        const { error: masterError } = await supabase
          .from("planning_master")
          .insert([masterRow]);
        if (masterError) throw masterError;
      }

      // ---------- INSERT PRODUCTS ----------
      const itemRows = productsToSubmit.map((prod, index) => {
        const totalQty = Number(prod.qty || 0) * Number(prod.qtySet || 1);
        
        console.log(`[Submit Item] Serial: ${index + 1}, Item: ${prod.itemName}, Code: ${prod.itemCode}`);

        return {
          planning_no: nextPN,
          item: prod.itemName,
          item_code: prod.itemCode || "",
          qty: totalQty,
          description: prod.remarks || "", // mapped to frontend 'Remark' field
          uom: prod.uom || ""             // mapped to the new 'UOM' column
        };
      });

      const { error: itemError } = await supabase
        .from("planning_item_master")
        .insert(itemRows);

      if (itemError) throw itemError;

      // ---------- SUCCESS FLOW (UNCHANGED) ----------
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        resetForm();

        if (onSuccess) {
          onSuccess();
        }
      }, 1500);

    } catch (error) {

      console.error("Supabase Insert Error:", error);

      alert(
        `Error saving planning data: ${error instanceof Error ? error.message : String(error)
        }`
      );

    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      requesterName: "",
      projectName: "",
      firmName: "",
      vendorName: "",
      itemType: "",
      state: "",
      department: "",
      packingDetailSelect: "",
      masterQuantity: "",
      vendorId: "",
    });
    setProducts([]);
  };



  // const getVendorOptions = () => {
  //   // Filter vendors based on selected item type
  //   if (!formData.itemType) {
  //     return vendorOptionsFlat;
  //   }

  //   const normalizedItemType = normalizeStr(formData.itemType);

  //   // Try exact match first
  //   if (itemTypeToVendors[formData.itemType]) {
  //     return itemTypeToVendors[formData.itemType];
  //   }

  //   // Try uppercase match (BOS, CABLE, etc.)
  //   const upperItemType = formData.itemType.toUpperCase();
  //   if (itemTypeToVendors[upperItemType]) {
  //     return itemTypeToVendors[upperItemType];
  //   }

  //   // Try normalized match
  //   const matchingKey = Object.keys(itemTypeToVendors).find(
  //     (key) => normalizeStr(key) === normalizedItemType
  //   );

  //   if (matchingKey && itemTypeToVendors[matchingKey]) {
  //     return itemTypeToVendors[matchingKey];
  //   }

  //   // Fallback to all vendors
  //   return vendorOptionsFlat;
  // };

  // const getDepartmentOptions = () => {
  //   // Filter departments based on selected state
  //   if (formData.state && stateToDepartments[formData.state]) {
  //     const filtered = Array.from(new Set(stateToDepartments[formData.state]));
  //     return filtered.length > 0 ? filtered : departmentOptionsFlat;
  //   }
  //   // If no state selected or no mapping available, return all departments
  //   return departmentOptionsFlat;
  // };



  const getVendorOptions = () => {
    // Filter vendors based on selected item type
    if (!formData.itemType) {
      return [...new Set(vendorOptionsFlat)]; // Remove duplicates
    }

    const normalizedItemType = normalizeStr(formData.itemType);

    // Try exact match first
    if (itemTypeToVendors[formData.itemType]) {
      return [...new Set(itemTypeToVendors[formData.itemType])]; // Remove duplicates
    }

    // Try uppercase match (BOS, CABLE, etc.)
    const upperItemType = formData.itemType.toUpperCase();
    if (itemTypeToVendors[upperItemType]) {
      return [...new Set(itemTypeToVendors[upperItemType])]; // Remove duplicates
    }

    // Try normalized match
    const matchingKey = Object.keys(itemTypeToVendors).find(
      (key) => normalizeStr(key) === normalizedItemType
    );

    if (matchingKey && itemTypeToVendors[matchingKey]) {
      return [...new Set(itemTypeToVendors[matchingKey])]; // Remove duplicates
    }

    // Fallback to all vendors
    return [...new Set(vendorOptionsFlat)]; // Remove duplicates
  };




  //   const getDepartmentOptions = () => {
  //   // Filter departments based on selected state from dynamic mapping
  //   if (formData.state && stateToDepartments[formData.state]) {
  //     const filtered = Array.from(new Set(stateToDepartments[formData.state]));
  //     return filtered.length > 0 ? filtered : departmentOptionsFlat;
  //   }
  //   // If no state selected or no mapping available, return all departments
  //   return departmentOptionsFlat;
  // };


  const getDepartmentOptions = () => {
    // Filter departments based on selected state from dynamic mapping
    if (formData.state && stateToDepartments[formData.state]) {
      const filtered = [...new Set(stateToDepartments[formData.state])]; // Remove duplicates
      return filtered.length > 0 ? filtered : departmentOptionsFlat;
    }
    // If no state selected or no mapping available, return all departments
    return [...new Set(departmentOptionsFlat)]; // Remove duplicates
  };



  // const isEnhancedLoading = dropdownLoading && !enhancedMappingsLoaded;

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="overflow-hidden fixed inset-0 z-50">
      {/* Enhanced Backdrop - Darker and more prominent */}
      <div
        className="absolute inset-0 backdrop-blur-md bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - Centered and responsive */}
      <div className="flex justify-center items-center p-4 min-h-screen">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Enhanced Fixed Header */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-t-2xl border-b border-blue-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {initialData ? "Edit Planning Request" : "New Planning Request"}
                  </h2>
                  <p className="text-sm text-blue-100">
                    Fill in the details for your procurement planning
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {dropdownLoading && (
                  <span className="text-sm text-blue-200">
                    Loading options…
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => loadDropdowns(true)}
                  className="px-3 py-2 text-sm text-white rounded-lg transition-colors bg-white/20 hover:bg-white/30"
                  title="Refresh dropdown data"
                >
                  Refresh
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors duration-200 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Content with better padding */}
          <div className="overflow-y-auto flex-1 p-6 bg-gradient-to-b from-gray-50 to-white">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Form Details Section */}
              <div className="p-6 bg-gray-50 rounded-xl">
                <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                  <Building className="mr-2 w-5 h-5 text-blue-600" />
                  Form Details
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <Calendar className="inline mr-1 w-4 h-4" />
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        handleFormDataChange("date", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <User className="inline mr-1 w-4 h-4" />
                      Requester Name *
                    </label>
                    <input
                      type="text"
                      value={formData.requesterName}
                      onChange={(e) =>
                        handleFormDataChange("requesterName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter requester name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Project Name *
                    </label>
                    <select
                      value={formData.projectName}
                      onChange={(e) =>
                        handleFormDataChange("projectName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Project"}
                      </option>
                      {projectOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Firm Name *
                    </label>
                    <select
                      value={formData.firmName}
                      onChange={(e) =>
                        handleFormDataChange("firmName", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Firm"}
                      </option>
                      {firmOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor ID hidden as per user request */}
                  <div className="hidden">
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Vendor ID
                    </label>
                    <select
                      value={formData.vendorId}
                      onChange={(e) =>
                        handleFormDataChange("vendorId", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Vendor ID"}
                      </option>
                      {vendorIdOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Item Type *
                    </label>
                    <select
                      value={formData.itemType}
                      onChange={(e) =>
                        handleFormDataChange("itemType", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select Item Type"}
                      </option>
                      {itemTypeOptions.map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <Truck className="inline mr-1 w-4 h-4" />
                      Vendor Name *
                    </label>

                    <select
                      value={formData.vendorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFormDataChange("vendorName", val);
                        if (vendorNameToId[val]) {
                          handleFormDataChange("vendorId", vendorNameToId[val]);
                        } else {
                          handleFormDataChange("vendorId", "");
                        }
                      }}
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading
                          ? "Loading…"
                          : formData.itemType
                            ? "Select Vendor"
                            : "Select Item Type First"}
                      </option>
                      {getVendorOptions().map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      <MapPin className="inline mr-1 w-4 h-4" />
                      State *
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) =>
                        handleFormDataChange("state", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading ? "Loading…" : "Select State"}
                      </option>
                      {stateOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Department *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) =>
                        handleFormDataChange("department", e.target.value)
                      }
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={dropdownLoading}
                      required
                    >
                      <option value="">
                        {dropdownLoading
                          ? "Loading…"
                          : formData.state
                            ? enhancedMappingsLoaded
                              ? "Select Department"
                              : "Loading departments…"
                            : "Select State First"}
                      </option>
                      {getDepartmentOptions().map((option: string) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* BOS Section (visible when item type is BOS) */}
              {normalizeStr(formData.itemType) === "bos" && (
                <div className="p-6 bg-blue-50 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center text-lg font-semibold text-gray-900">
                      <Package className="mr-2 w-5 h-5 text-blue-600" />
                      BOS Configuration
                    </h3>
                    <button
                      type="button"
                      onClick={loadBOSProducts}
                      className="px-3 py-2 text-sm text-blue-600 bg-blue-100 rounded-lg transition-colors hover:bg-blue-200"
                      title="Reload BOS products"
                    >
                      🔄 Reload
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Packing Detail
                      </label>
                      <select
                        value={formData.packingDetailSelect}
                        onChange={(e) =>
                          handleFormDataChange(
                            "packingDetailSelect",
                            e.target.value
                          )
                        }
                        className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Packing</option>
                        {packingDetailOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Master Quantity
                      </label>
                      <input
                        type="number"
                        value={formData.masterQuantity}
                        onChange={(e) =>
                          handleFormDataChange("masterQuantity", e.target.value)
                        }
                        className="px-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter master quantity"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={updateAllQuantities}
                        disabled={!formData.masterQuantity}
                        className="px-4 py-2 w-full text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Update All Quantities
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
                <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="flex items-center text-lg font-semibold text-gray-900">
                    <Package className="mr-2 w-5 h-5 text-blue-600" />
                    Product Items ({products.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="inline-flex items-center px-3 py-2 text-sm text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700"
                  >
                    <Plus className="mr-1 w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {products.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Packing Detail
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Item Name
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            UOM
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Qty
                          </th>

                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Total Qty
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {product.packingDetail}
                            </td>

                            <td className="px-4 py-3">
                              {normalizeStr(formData.itemType) === "bos" ? (
                                <>


                                  <input
                                    type="text"
                                    value={product.itemName}
                                    onChange={(e) => {
                                      handleItemNameChange(
                                        product.id,
                                        e.target.value
                                      );
                                    }}
                                    list={`itemName-${product.id}`}
                                    className="px-2 py-1 w-full text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Select or type item name"
                                  />

                                  <datalist id={`itemName-${product.id}`}>
                                    {(() => {


                                      const filteredItems =
                                        getFilteredItemsForDropdown().filter(
                                          (item: {
                                            name: string;
                                            group: string;
                                            uom: string;
                                          }) =>
                                            !product.itemName ||
                                            item.name
                                              .toLowerCase()
                                              .includes(
                                                product.itemName.toLowerCase()
                                              )
                                        );

                                      const displayItems = filteredItems.slice(
                                        0,
                                        20
                                      ); // Show first 20
                                      const hasMore = filteredItems.length > 20;

                                      return (
                                        <>
                                          {displayItems.map((item, index) => (
                                            <option
                                              key={`${item.name}-${index}`}
                                              value={item.name}
                                              style={{
                                                backgroundColor:
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5",
                                                color: "black",
                                                padding: "8px 12px",
                                                borderBottom: "1px solid #ddd",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#e3f2fd";
                                                e.currentTarget.style.color =
                                                  "#1976d2";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5";
                                                e.currentTarget.style.color =
                                                  "black";
                                              }}
                                            />
                                          ))}
                                          {hasMore && product.itemName && (
                                            <option
                                              value=""
                                              disabled
                                              style={{
                                                backgroundColor: "#f0f0f0",
                                                color: "#666",
                                                padding: "8px 12px",
                                                textAlign: "center",
                                                fontStyle: "italic",
                                                fontSize: "13px",
                                                cursor: "default",
                                              }}
                                            >
                                              {filteredItems.length - 20} more
                                              items available
                                            </option>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </datalist>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    value={product.itemName}
                                    onChange={(e) => {
                                      handleItemNameChange(
                                        product.id,
                                        e.target.value
                                      );
                                    }}

                                    list={`itemName-${product.id}`}
                                    className={`px-2 py-1 w-full text-sm rounded border focus:ring-1 focus:ring-blue-500 focus:border-transparent ${masterItemsLoading
                                      ? "text-gray-400 bg-gray-50 border-gray-200"
                                      : "bg-white border-gray-300 hover:border-blue-400"
                                      }`}
                                    placeholder={
                                      masterItemsLoading
                                        ? "Loading items..."
                                        : "Select or type item name"
                                    }
                                    disabled={masterItemsLoading}
                                  />
                                  <datalist id={`itemName-${product.id}`}>
                                    {(() => {


                                      const filteredItems =
                                        getFilteredItemsForDropdown().filter(
                                          (item: {
                                            name: string;
                                            group: string;
                                            uom: string;
                                          }) =>
                                            !product.itemName ||
                                            item.name
                                              .toLowerCase()
                                              .includes(
                                                product.itemName.toLowerCase()
                                              )
                                        );

                                      // console.log(
                                      //   "[DEBUG] Filtered items in datalist:",
                                      //   filteredItems.length
                                      // );

                                      const displayItems = filteredItems.slice(
                                        0,
                                        20
                                      ); // Show first 20
                                      const hasMore = filteredItems.length > 20;

                                      return (
                                        <>
                                          {displayItems.map((item, index) => (
                                            <option
                                              key={`${item.name}-${index}`}
                                              value={item.name}
                                              style={{
                                                backgroundColor:
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5",
                                                color: "black",
                                                padding: "8px 12px",
                                                borderBottom: "1px solid #ddd",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  "#e3f2fd";
                                                e.currentTarget.style.color =
                                                  "#1976d2";
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor =
                                                  index % 2 === 0
                                                    ? "white"
                                                    : "#f5f5f5";
                                                e.currentTarget.style.color =
                                                  "black";
                                              }}
                                            />
                                          ))}
                                          {hasMore && product.itemName && (
                                            <option
                                              value=""
                                              disabled
                                              style={{
                                                backgroundColor: "#f0f0f0",
                                                color: "#666",
                                                padding: "8px 12px",
                                                textAlign: "center",
                                                fontStyle: "italic",
                                                fontSize: "13px",
                                                cursor: "default",
                                              }}
                                            >
                                              {filteredItems.length - 20} more
                                              items available
                                            </option>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </datalist>
                                </>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={product?.uom}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    "uom",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1 w-full text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">UOM</option>
                                {uomOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={(formData.packingDetailSelect !== "" ? product.qtySet : product.qty) || ""}
                                onChange={(e) =>
                                  updateProduct(
                                    product.id,
                                    "qty",
                                    e.target.value === ""
                                      ? 0
                                      : parseFloat(e.target.value) || 0
                                  )
                                }
                                className="px-2 py-1 w-20 text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                min="0"
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {product.totalQty}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={product.remarks}
                                onChange={(e) => 
                                  updateProduct(
                                    product.id,
                                    "remarks",
                                    e.target.value
                                  )
                                }
                                className="px-2 py-1 w-full text-sm rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Remarks"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => deleteProduct(product.id)}
                                className="p-1 text-red-600 rounded transition-colors duration-200 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {products.length === 0 && (
                  <div className="py-8 text-center">
                    <Package className="mx-auto mb-3 w-12 h-12 text-gray-400" />
                    <p className="text-gray-500">No products added yet</p>
                    <p className="text-sm text-gray-400">
                      Click "Add Item" to start adding products
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 space-x-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-gray-700 rounded-lg border border-gray-300 transition-colors duration-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || products.length === 0}
                  className="flex items-center px-8 py-3 text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 w-5 h-5 rounded-full border-b-2 border-white animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Planning Request"
                  )}
                </button>
              </div>
            </form>

            {/* Success Modal */}
            {showSuccess && (
              <div className="flex absolute inset-0 justify-center items-center bg-white bg-opacity-95 rounded-2xl">
                <div className="text-center">
                  <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    Planning Request Submitted!
                  </h3>
                  <p className="text-gray-600">
                    Your request has been successfully submitted for approval.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningForm;
