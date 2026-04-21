import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { 
  Building2, 
  Users, 
  Package, 
  Settings, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  LayoutGrid
} from 'lucide-react';

// Admin client uses service role key — bypasses RLS for Settings master data
const supabaseAdminUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAdminKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || "";

if (!supabaseAdminUrl || !supabaseAdminKey) {
  console.error(
    "Supabase Admin configuration is missing. Please check your .env file."
  );
}

const supabaseAdmin = createClient(supabaseAdminUrl, supabaseAdminKey);


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MasterRecord {
  id?: number;
  master_type: string;
  firm_name: string;
  billing_address_phone: string;
  firm_gstin: string;
  firm_pan_no: string;
  destination_address: string;
  terms_and_conditions: string;
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
  created_at?: string;
}

interface VendorRecord {
  id?: number;
  vendor_id: string;
  items_type: string;
  vendor_name: string;
  address: string;
  gstin: string;
  contact_person: string;
  email: string;
  mobile: string;
  associated_modules: string;
  created_at?: string;
  updated_at?: string;
}

interface ItemRecord {
  id?: number;
  product_code: string;
  item_type: string;
  product_name: string;
  uom: string;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial Forms
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_MASTER_FORM: MasterRecord = {
  master_type: "", firm_name: "", billing_address_phone: "", firm_gstin: "",
  firm_pan_no: "", destination_address: "", terms_and_conditions: "",
  pump_type: "", required_qty: "",
  project_name: "", department_name: "", letter_to: "", mail_address: "",
  behalf_of: "", seal_sign: "", state: "", vendor_items_type: "",
};

const INITIAL_VENDOR_FORM: VendorRecord = {
  vendor_id: "", items_type: "", vendor_name: "", address: "", gstin: "",
  contact_person: "", email: "", mobile: "", associated_modules: "",
};

const INITIAL_ITEM_FORM: ItemRecord = {
  product_code: "", item_type: "", product_name: "", uom: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = "project" | "vendor" | "item";

const Setting = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("project");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        
        {/* Header & Tabs */}
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-600" />
              Settings & Master Data
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Manage all system master data from one centralized place</p>
          </div>
          
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('project')}
              className={`flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'project'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Project Master
            </button>
            <button
              onClick={() => setActiveTab('vendor')}
              className={`flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'vendor'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Vendor Master
            </button>
            <button
              onClick={() => setActiveTab('item')}
              className={`flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'item'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="w-4 h-4 mr-2" />
              Item Master
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="animate-in fade-in duration-500">
          {activeTab === "project" && <ProjectMasterSection />}
          {activeTab === "vendor" && <VendorMasterSection />}
          {activeTab === "item" && <ItemMasterSection />}
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT MASTER SECTION
// ─────────────────────────────────────────────────────────────────────────────

const ProjectMasterSection = () => {
  const [records, setRecords] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MasterRecord>(INITIAL_MASTER_FORM);

  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal]);

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("project_master").select("*").order("id", { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleOpenModal = (record: MasterRecord | null = null) => {
    if (record) { setEditingRecord(record); setFormData({ ...INITIAL_MASTER_FORM, ...record }); }
    else { setEditingRecord(null); setFormData(INITIAL_MASTER_FORM); }
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
        const { error } = await supabase.from("project_master").update(payload).eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_master").insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchRecords();
    } catch (err) { alert("Error saving record."); console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const { error } = await supabase.from("project_master").delete().eq("id", id);
      if (error) throw error;
      fetchRecords();
    } catch (err) { console.error(err); }
  };

  const filteredRecords = records.filter((r) =>
    Object.values(r).some((val) => String(val || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Controls: Search Left, Button Right */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Project
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" /><p className="text-sm font-medium">Loading...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center opacity-70">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-400" /><p className="text-md font-semibold text-slate-600">No Records Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider sticky left-0 z-20 bg-slate-50 border-r border-slate-200">Actions</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[150px]">Firm Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">Billing/Phone</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">GSTIN</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">PAN</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[150px]">Project</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Dept</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">State</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-2.5 sticky left-0 z-10 bg-white border-r border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleOpenModal(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record.id!)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold uppercase">{record.master_type}</span></td>
                    <td className="px-5 py-2.5 font-medium text-slate-800">{record.firm_name}</td>
                    <td className="px-5 py-2.5 text-slate-600 truncate max-w-[200px]">{record.billing_address_phone}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{record.firm_gstin}</td>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-600">{record.firm_pan_no}</td>
                    <td className="px-5 py-2.5 font-medium text-slate-800">{record.project_name}</td>
                    <td className="px-5 py-2.5 text-slate-600">{record.department_name}</td>
                    <td className="px-5 py-2.5"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-xs">{record.state}</span></td>
                    <td className="px-5 py-2.5 text-blue-600 underline text-xs">{record.mail_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editingRecord ? "Edit Project Master" : "New Project Master"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Master Type *</label>
                    <input name="master_type" value={formData.master_type} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase">Quick Suggestions</label>
                    <select onChange={(e) => setFormData(prev => ({ ...prev, master_type: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none text-slate-700">
                      <option value="">Select...</option>
                      <option value="Firm">Firm</option>
                      <option value="Project">Project</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Firm Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> Firm Details</h3>
                    <div className="space-y-3">
                      <div><label className="text-xs text-slate-500 font-medium ml-1">Firm Name</label><input name="firm_name" value={formData.firm_name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      <div><label className="text-xs text-slate-500 font-medium ml-1">PAN No</label><input name="firm_pan_no" value={formData.firm_pan_no} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      <div><label className="text-xs text-slate-500 font-medium ml-1">GSTIN</label><input name="firm_gstin" value={formData.firm_gstin} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      <div><label className="text-xs text-slate-500 font-medium ml-1">Billing & Phone</label><input name="billing_address_phone" value={formData.billing_address_phone} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      <div><label className="text-xs text-slate-500 font-medium ml-1">Destination Address</label><input name="destination_address" value={formData.destination_address} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-blue-500" /> Project Info</h3>
                    <div className="space-y-3">
                      <div><label className="text-xs text-slate-500 font-medium ml-1">Project Name</label><input name="project_name" value={formData.project_name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-slate-500 font-medium ml-1">Department</label><input name="department_name" value={formData.department_name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                        <div><label className="text-xs text-slate-500 font-medium ml-1">State</label><input name="state" value={formData.state} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      </div>
                      <div><label className="text-xs text-slate-500 font-medium ml-1">Letter To</label><input name="letter_to" value={formData.letter_to} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                      <div><label className="text-xs text-slate-500 font-medium ml-1">Email</label><input name="mail_address" type="email" value={formData.mail_address} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 outline-none transition-all" /></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="text-xs text-slate-500 font-medium ml-1">Qty</label><input name="required_qty" type="number" value={formData.required_qty} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" /></div>
                    <div><label className="text-xs text-slate-500 font-medium ml-1">Pump Type</label><input name="pump_type" value={formData.pump_type} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" /></div>
                    <div><label className="text-xs text-slate-500 font-medium ml-1">Vendor Items Type</label><input name="vendor_items_type" value={formData.vendor_items_type} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none transition-all" /></div>
                  </div>
                  <div><label className="text-xs text-slate-500 font-medium ml-1">Terms & Conditions</label><textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleInputChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none h-16 resize-none transition-all" /></div>
                </div>

              </form>
            </div>
            
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="project-form" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center active:scale-95 disabled:opacity-50">
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />{editingRecord ? "Update Record" : "Save Record"}</>}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR MASTER SECTION
// ─────────────────────────────────────────────────────────────────────────────

const VendorMasterSection = () => {
  const [records, setRecords] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VendorRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<VendorRecord>(INITIAL_VENDOR_FORM);

  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal]);

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin.from("vendor_master").select("*").order("id", { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) { console.error("Error fetching vendor_master:", err); } finally { setLoading(false); }
  };

  const generateVendorId = async (): Promise<string> => {
    try {
      const { data } = await supabaseAdmin.from("vendor_master").select("vendor_id");
      let maxNum = 0;
      (data || []).forEach((r) => {
        const match = String(r.vendor_id || "").match(/RBPV(\d+)/i);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      return `RBPV${String(maxNum + 1).padStart(6, "0")}`;
    } catch { return `RBPV${Date.now().toString().slice(-6)}`; }
  };

  const handleOpenModal = async (record: VendorRecord | null = null) => {
    if (record) { setEditingRecord(record); setFormData({ ...INITIAL_VENDOR_FORM, ...record }); }
    else {
      const newId = await generateVendorId();
      setEditingRecord(null);
      setFormData({ ...INITIAL_VENDOR_FORM, vendor_id: newId });
    }
    setShowModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (editingRecord) {
        const { error } = await supabaseAdmin.from("vendor_master").update(payload).eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("vendor_master").insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchRecords();
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabaseAdmin.from("vendor_master").delete().eq("id", id);
      if (error) throw error;
      fetchRecords();
    } catch (err) { console.error(err); }
  };

  const filteredRecords = records.filter((r) =>
    Object.values(r).some((val) => String(val || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search vendors..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Vendor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading vendors...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center opacity-70">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <p className="text-md font-semibold text-slate-600">No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-5 py-3 sticky left-0 z-30 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-100">Actions</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[150px]">Vendor Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Items Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">GSTIN</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Mobile</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Associated Modules</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-2.5 sticky left-0 z-20 bg-white border-r border-slate-50 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenModal(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record.id!)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-xs font-mono font-medium text-slate-500">{record.vendor_id}</td>
                    <td className="px-5 py-2.5 text-sm font-semibold text-slate-800">{record.vendor_name}</td>
                    <td className="px-5 py-2.5 text-sm">
                      {record.items_type && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 text-xs font-medium">{record.items_type}</span>}
                    </td>
                    <td className="px-5 py-2.5 text-xs font-mono text-slate-500">{record.gstin}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-600">{record.contact_person}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-600">{record.mobile}</td>
                    <td className="px-5 py-2.5 text-sm text-blue-600 underline">{record.email}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-500">{record.associated_modules}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-500 truncate max-w-[250px]">{record.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editingRecord ? "Update Vendor" : "New Vendor"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <form id="vendor-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Vendor ID <span className="text-green-600 text-[10px] font-normal">(auto-generated)</span></label>
                    <input name="vendor_id" value={formData.vendor_id} readOnly className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-mono font-bold text-green-700 outline-none cursor-default" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Vendor Name *</label>
                    <input name="vendor_name" value={formData.vendor_name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Items Type</label>
                    <input name="items_type" value={formData.items_type} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. CABLE, PUMP, BOS" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">GSTIN</label>
                    <input name="gstin" value={formData.gstin} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Contact Person</label>
                    <input name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Mobile</label>
                    <input name="mobile" value={formData.mobile} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. 9876543210" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Email</label>
                  <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Associated Modules</label>
                  <input name="associated_modules" value={formData.associated_modules} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Planning, PO Generator" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Address</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none h-20 resize-none" />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="vendor-form" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center active:scale-95 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingRecord ? "Update Vendor" : "Save Vendor"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ITEM MASTER SECTION
// ─────────────────────────────────────────────────────────────────────────────

const ItemMasterSection = () => {
  const [records, setRecords] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ItemRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemRecord>(INITIAL_ITEM_FORM);

  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showModal]);

  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setTableError(null);
    try {
      const { data, error } = await supabaseAdmin.from("item_master").select("*").order("id", { ascending: false });
      if (error) {
        if (error.code === "42P01") {
          setTableError("The 'item_master' table does not exist yet.");
        } else throw error;
      }
      setRecords(data || []);
    } catch (err) { console.error("Error fetching item_master:", err); } finally { setLoading(false); }
  };

  const generateProductCode = async (): Promise<string> => {
    try {
      const { data } = await supabaseAdmin.from("item_master").select("product_code");
      let maxNum = 0;
      (data || []).forEach((r) => {
        const match = String(r.product_code || "").match(/RBPI(\d+)/i);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      return `RBPI${String(maxNum + 1).padStart(6, "0")}`;
    } catch { return `RBPI${Date.now().toString().slice(-6)}`; }
  };

  const handleOpenModal = async (record: ItemRecord | null = null) => {
    if (record) { setEditingRecord(record); setFormData({ ...INITIAL_ITEM_FORM, ...record }); }
    else {
      const newCode = await generateProductCode();
      setEditingRecord(null);
      setFormData({ ...INITIAL_ITEM_FORM, product_code: newCode });
    }
    setShowModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_code.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: Partial<ItemRecord> = {
        item_type: formData.item_type,
        product_name: formData.product_name,
        uom: formData.uom,
      };
      if (!editingRecord) payload.product_code = formData.product_code;

      if (editingRecord) {
        const { error } = await supabaseAdmin.from("item_master").update(payload).eq("id", editingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("item_master").insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchRecords();
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabaseAdmin.from("item_master").delete().eq("id", id);
      if (error) throw error;
      fetchRecords();
    } catch (err) { console.error(err); }
  };

  const filteredRecords = records.filter((r) =>
    Object.values(r).some((val) => String(val || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => handleOpenModal()} 
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Item
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading items...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center opacity-70">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <p className="text-md font-semibold text-slate-600">No items available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-5 py-3 sticky left-0 z-30 bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-100">Actions</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Product Code</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">Product Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Item Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">UOM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-2.5 sticky left-0 z-20 bg-white border-r border-slate-50 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpenModal(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(record.id!)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-xs font-mono font-bold text-blue-600">{record.product_code}</td>
                    <td className="px-5 py-2.5 text-sm font-semibold text-slate-800">{record.product_name}</td>
                    <td className="px-5 py-2.5 text-sm"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 text-xs font-medium">{record.item_type}</span></td>
                    <td className="px-5 py-2.5 text-sm"><span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 text-xs font-medium">{record.uom}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{editingRecord ? "Update Item" : "New Item Master"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Product Code <span className="text-green-600 text-[10px] font-normal">(auto-generated)</span></label>
                    <input name="product_code" value={formData.product_code} readOnly className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-mono font-bold text-green-700 outline-none cursor-default" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 ml-1">UOM</label>
                    <input name="uom" value={formData.uom} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="e.g. Nos, Kg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Product Name *</label>
                  <input name="product_name" value={formData.product_name} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Item Type</label>
                  <input name="item_type" value={formData.item_type} onChange={handleInputChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="item-form" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center active:scale-95 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingRecord ? "Update Item" : "Save Item"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default Setting;
