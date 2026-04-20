import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  CheckCircle2,
  Filter,
  Download,
  AlertCircle
} from "lucide-react";

interface MasterRecord {
  id?: number;
  master_type: string;
  firm_name: string;
  billing_address_phone: string;
  firm_gstin: string;
  firm_pan_no: string;
  destination_address: string;
  item_type: string;
  terms_and_conditions: string;
  product_item_type: string;
  product_name: string;
  uom: string;
  pump_type: string;
  required_qty: string;
  project_name: string;
  department_name: string;
  letter_to: string;
  mail_address: string;
  behalf_of: string;
  seal_sign: string;
  state: string;
  vendor_items_type: string;
  vendor_name: string;
  vendor_address: string;
  vendor_gstin: string;
  contact_person: string;
  vendor_email: string;
  mobile: string;
  associated_modules: string;
  vendor_id?: string;
  created_at?: string;
}

const INITIAL_FORM: MasterRecord = {
  master_type: "",
  firm_name: "",
  billing_address_phone: "",
  firm_gstin: "",
  firm_pan_no: "",
  destination_address: "",
  item_type: "",
  terms_and_conditions: "",
  product_item_type: "",
  product_name: "",
  uom: "",
  pump_type: "",
  required_qty: "",
  project_name: "",
  department_name: "",
  letter_to: "",
  mail_address: "",
  behalf_of: "",
  seal_sign: "",
  state: "",
  vendor_items_type: "",
  vendor_name: "",
  vendor_address: "",
  vendor_gstin: "",
  contact_person: "",
  vendor_email: "",
  mobile: "",
  associated_modules: "",
  vendor_id: "",
};

const Setting = () => {
  const [records, setRecords] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MasterRecord>(INITIAL_FORM);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_master")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (record: MasterRecord | null = null) => {
    if (record) {
      setEditingRecord(record);
      // Merge with INITIAL_FORM to ensure no null values for controlled inputs
      setFormData({ ...INITIAL_FORM, ...record });
    } else {
      setEditingRecord(null);
      setFormData(INITIAL_FORM);
    }
    setShowModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (editingRecord) {
        const { error } = await supabase
          .from("project_master")
          .update(payload)
          .eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_master")
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchRecords();
    } catch (err) {
      alert("Error saving record. Please ensure the database table is updated.");
      console.error("Error saving record:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const { error } = await supabase.from("project_master").delete().eq("id", id);
      if (error) throw error;
      fetchRecords();
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch = Object.values(r).some((val) =>
      String(val || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesFilter = filterType === "all" || r.master_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page Title & Add Button */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Settings className="w-6 h-6 mr-3 text-blue-600" />
            Project Master Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Add and manage all system master data in one place</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Master
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search across all fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="w-full md:w-64 flex items-center bg-white border border-gray-200 rounded-xl px-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <Filter className="w-4 h-4 text-gray-400 mr-2" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 py-3 text-sm outline-none bg-transparent font-medium"
          >
            <option value="all">All Master Types</option>
            <option value="Firm">Firm Master</option>
            <option value="Item">Item Master</option>
            <option value="Product">Product Master</option>
            <option value="Project">Project Master</option>
            <option value="Vendor">Vendor Master</option>
          </select>
        </div>
      </div>

      {/* Unified Data Table - Horizontal Scroll for All Columns */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p>Fetching master records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-bold">No Records Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-blue-600 text-white border-b border-blue-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3 sticky left-0 z-30 bg-blue-600 border-r border-blue-500 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Actions</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Firm Name</th>
                  <th className="px-4 py-3">Billing Address & Phone</th>
                  <th className="px-4 py-3">Firm GSTIN</th>
                  <th className="px-4 py-3">Firm PAN No</th>
                  <th className="px-4 py-3">Destination Address</th>
                  <th className="px-4 py-3">Item Type</th>
                  <th className="px-4 py-3">Terms & Conditions</th>
                  <th className="px-4 py-3">Prod Item Type</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">UOM</th>
                  <th className="px-4 py-3">Pump Type</th>
                  <th className="px-4 py-3">Req Qty</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Letter To</th>
                  <th className="px-4 py-3">Mail Address</th>
                  <th className="px-4 py-3">On Behalf</th>
                  <th className="px-4 py-3">Seal & Sign</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Vendor Type</th>
                  <th className="px-4 py-3">Vendor Name</th>
                  <th className="px-4 py-3">Vendor Address</th>
                  <th className="px-4 py-3">Vendor GSTIN</th>
                  <th className="px-4 py-3">Contact Person</th>
                  <th className="px-4 py-3">Vendor Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Modules</th>
                  <th className="px-4 py-3">Vendor ID</th>
                  <th className="px-4 py-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-5 py-3 sticky left-0 z-20 bg-white border-r border-gray-100 group-hover:bg-blue-50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleOpenModal(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record.id!)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{record.id}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-black uppercase">{record.master_type}</span></td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{record.firm_name}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{record.billing_address_phone}</td>
                    <td className="px-4 py-3 font-mono text-xs">{record.firm_gstin}</td>
                    <td className="px-4 py-3 font-mono text-xs">{record.firm_pan_no}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{record.destination_address}</td>
                    <td className="px-4 py-3 font-medium text-blue-600">{record.item_type}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{record.terms_and_conditions}</td>
                    <td className="px-4 py-3">{record.product_item_type}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{record.product_name}</td>
                    <td className="px-4 py-3 text-center"><span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100">{record.uom}</span></td>
                    <td className="px-4 py-3">{record.pump_type}</td>
                    <td className="px-4 py-3 text-center">{record.required_qty}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{record.project_name}</td>
                    <td className="px-4 py-3">{record.department_name}</td>
                    <td className="px-4 py-3">{record.letter_to}</td>
                    <td className="px-4 py-3 text-blue-600 underline">{record.mail_address}</td>
                    <td className="px-4 py-3">{record.behalf_of}</td>
                    <td className="px-4 py-3">{record.seal_sign}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-100">{record.state}</span></td>
                    <td className="px-4 py-3">{record.vendor_items_type}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{record.vendor_name}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{record.vendor_address}</td>
                    <td className="px-4 py-3 font-mono text-xs">{record.vendor_gstin}</td>
                    <td className="px-4 py-3">{record.contact_person}</td>
                    <td className="px-4 py-3 text-blue-600 underline">{record.vendor_email}</td>
                    <td className="px-4 py-3 font-medium">{record.mobile}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{record.associated_modules}</td>
                    <td className="px-4 py-3 text-gray-400">{record.vendor_id}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{record.created_at ? new Date(record.created_at).toLocaleString() : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col h-full max-h-[92vh] overflow-hidden border border-gray-100">
            
            {/* Modal Header - Fixed */}
            <div className="px-8 py-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                   <h2 className="text-lg font-bold text-gray-900 leading-tight">
                     {editingRecord ? "Edit Master" : "Add New Master"}
                   </h2>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/50 custom-scrollbar min-h-0">
              <form id="master-form" onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Categorization */}
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="input-label">Master Type *</label>
                      <input 
                        name="master_type" 
                        value={formData.master_type} 
                        onChange={handleInputChange} 
                        className="input-field font-bold" 
                        placeholder="e.g. Firm, Item, Product, etc."
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Quick Suggestions</label>
                      <select 
                        onChange={(e) => setFormData(prev => ({ ...prev, master_type: e.target.value }))}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Suggestion</option>
                        <option value="Firm">Firm Master</option>
                        <option value="Item">Item Master</option>
                        <option value="Product">Product Master</option>
                        <option value="Project">Project Master</option>
                        <option value="Vendor">Vendor Master</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Grid Container for Modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Firm Module */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Firm Details</h3>
                    <div className="space-y-4">
                        <div>
                          <label className="input-label">Firm Name</label>
                          <input name="firm_name" value={formData.firm_name} onChange={handleInputChange} className="input-field" placeholder="Full legal name" />
                        </div>
                        <div>
                          <label className="input-label">Billing Address & Phone</label>
                          <input name="billing_address_phone" value={formData.billing_address_phone} onChange={handleInputChange} className="input-field" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Firm GSTIN</label>
                            <input name="firm_gstin" value={formData.firm_gstin} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Firm PAN No</label>
                            <input name="firm_pan_no" value={formData.firm_pan_no} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div>
                          <label className="input-label">Destination Address</label>
                          <input name="destination_address" value={formData.destination_address} onChange={handleInputChange} className="input-field" />
                        </div>
                    </div>
                  </div>

                  {/* Product Module */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Product Specification</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Item Type</label>
                            <input name="item_type" value={formData.item_type} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Product Name</label>
                            <input name="product_name" value={formData.product_name} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                            <label className="input-label">Category</label>
                            <input name="product_item_type" value={formData.product_item_type} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">UOM</label>
                            <input name="uom" value={formData.uom} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Qty</label>
                            <input name="required_qty" type="number" value={formData.required_qty} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div>
                          <label className="input-label">Pump Type</label>
                          <input name="pump_type" value={formData.pump_type} onChange={handleInputChange} className="input-field" />
                        </div>
                        <div>
                          <label className="input-label">Terms & Conditions</label>
                          <textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleInputChange} className="input-field h-20" />
                        </div>
                    </div>
                  </div>

                  {/* Project Module */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Project Info</h3>
                    <div className="space-y-4">
                        <div>
                          <label className="input-label">Project Name</label>
                          <input name="project_name" value={formData.project_name} onChange={handleInputChange} className="input-field" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Department</label>
                            <input name="department_name" value={formData.department_name} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">State</label>
                            <input name="state" value={formData.state} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div>
                          <label className="input-label">Letter To</label>
                          <input name="letter_to" value={formData.letter_to} onChange={handleInputChange} className="input-field" />
                        </div>
                        <div>
                          <label className="input-label">Email Address</label>
                          <input name="mail_address" type="email" value={formData.mail_address} onChange={handleInputChange} className="input-field" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">On Behalf</label>
                            <input name="behalf_of" value={formData.behalf_of} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Seal / Sign</label>
                            <input name="seal_sign" value={formData.seal_sign} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                    </div>
                  </div>

                  {/* Vendor Module */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Vendor Details</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Vendor Name</label>
                            <input name="vendor_name" value={formData.vendor_name} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Vendor ID</label>
                            <input name="vendor_id" value={formData.vendor_id || ""} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">GSTIN</label>
                            <input name="vendor_gstin" value={formData.vendor_gstin} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Email</label>
                            <input name="vendor_email" type="email" value={formData.vendor_email} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Contact Person</label>
                            <input name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="input-field" />
                          </div>
                          <div>
                            <label className="input-label">Mobile</label>
                            <input name="mobile" value={formData.mobile} onChange={handleInputChange} className="input-field" />
                          </div>
                        </div>
                        <div>
                          <label className="input-label">Address</label>
                          <input name="vendor_address" value={formData.vendor_address} onChange={handleInputChange} className="input-field" />
                        </div>
                        <div>
                          <label className="input-label">Associated Modules</label>
                          <input name="associated_modules" value={formData.associated_modules} onChange={handleInputChange} className="input-field" />
                        </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer - Fixed */}
            <div className="px-8 py-5 bg-white border-t border-gray-100 flex items-center justify-end space-x-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-900 transition-all"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                form="master-form"
                disabled={isSubmitting}
                className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin text-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-3" />
                    {editingRecord ? "Update Record" : "Save Record"}
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Form Utility Classes */}
      <style>{`
        .input-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 6px;
          padding-left: 2px;
        }
        .input-field {
          width: 100%;
          padding: 8px 12px;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Setting;
