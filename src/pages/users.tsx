"use client";

import { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaSave, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import { supabase } from "../lib/supabase";



type User = {
  id: number;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  page: string;
};



export default function UserManagement() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");


  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER",
    page: "",
  });

  const [editUserId, setEditUserId] = useState<number | null>(null);


  const [pageOpen, setPageOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);



const ALL_PAGES = [
  "Dashboard",
  "Planning",
  "Approval",
  "PO Generator",
  "PO History",
  "Received",
  "Payment",
  "Payment History",
  "License",
  "Report",
  "UserPage",
  "Setting"
];

  const handleEdit = (user: any) => {
    setEditUserId(user.id);
    setFormData({
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role.toUpperCase(),
      page: user.page,
    });
    setOpen(true);
  };




  // -------------------- HANDLERS --------------------
  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("Login")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      const formatted =
        data?.map((u) => ({
          ...u,
          page: u.page_access ? u.page_access.join(",") : "",
        })) || [];

      setUsers(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role.toLowerCase(),
        whatsapp: "",
        page_access:
          formData.page === "all"
            ? ["all"]
            : formData.page.split(",").filter(Boolean),
      };

      if (editUserId) {
        // Update existing user
        const { error } = await supabase
          .from("Login")
          .update(payload)
          .eq("id", editUserId);
        if (error) throw error;
        setMessage("User updated successfully");
      } else {
        // Insert new user
        const { error } = await supabase
          .from("Login")
          .insert([payload]);
        if (error) throw error;
        setMessage("User created successfully");
      }

      setOpen(false);
      setEditUserId(null);
      fetchUsers();

      setFormData({
        username: "",
        email: "",
        password: "",
        role: "USER",
        page: "",
      });
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;

    try {
      const { error } = await supabase
        .from("Login")
        .delete()
        .eq("id", id);

      if (error) throw error;

      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------- UI --------------------
  return (
    <div className="p-6 space-y-6  ">


      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Add User</h1>
        <button
          onClick={() => {
            setEditUserId(null);
            setFormData({
              username: "",
              email: "",
              password: "",
              role: "USER",
              page: "",
            });
            setOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg shadow hover:opacity-90"
        >
          + Add User
        </button>
      </div>

      {/* <div className="bg-white rounded-xl shadow overflow-hidden"> */}
      <div className="bg-white rounded-xl shadow hidden md:block max-h-[70vh] overflow-y-auto">


        <table className="w-full text-sm">
          {/* <thead className="bg-blue-400 text-white "> */}
          <thead className="bg-blue-400 text-white sticky top-0 z-20">

            <tr>
              <th className="p-3 text-center">Actions</th>
              <th className="p-3 text-center">Username</th>
              <th className="p-3 text-center">Password</th>
              <th className="p-3 text-center">Email</th>
              <th className="p-3 text-center">Role</th>
              <th className="p-3 text-center">Page</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 text-center space-x-3">
                  <button
                    onClick={() => handleEdit(u)}
                    className="text-blue-600 inline-flex items-center gap-1"
                  >
                    <FaEdit /> <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-600 inline-flex items-center gap-1"
                  >
                    <FaTrash /> <span>Delete</span>
                  </button>
                </td>

                <td className="p-3 text-center">{u.username}</td>
                <td className="p-3 text-center">{u.password}</td>
                <td className="p-3 text-center">{u.email}</td>
                <td className="p-3 text-center">{u.role}</td>
                <td className="p-3 text-center">{u.page}</td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

      {/* MOBILE VIEW - CARDS */}
      <div className="space-y-4 md:hidden">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white rounded-xl shadow p-4 space-y-2"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-gray-800">
                {u.username}
              </h3>

              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(u)}
                  className="text-blue-600"
                >
                  <FaEdit />
                </button>

                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-600"
                >
                  <FaTrash />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              <span className="font-medium">Email:</span> {u.email}
            </p>

            <p className="text-sm text-gray-600">
              <span className="font-medium">Role:</span> {u.role}
            </p>

            <p className="text-sm text-gray-600">
              <span className="font-medium">Password:</span> {u.password}
            </p>


            <p className="text-sm text-gray-600">
              <span className="font-medium">Page:</span> {u.page}
            </p>
          </div>
        ))}
      </div>


      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl
                    max-h-[90vh] flex flex-col animate-in zoom-in duration-200">

            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-center text-blue-600">
                {editUserId ? "Edit User" : "Add User"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
            >
              <input
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />

              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 pr-10
               focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
               text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>


              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>

              <div className="relative">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Page Access
                </p>

                <button
                  type="button"
                  onClick={() => setPageOpen(!pageOpen)}
                  className="w-full border rounded-lg px-3 py-2 text-left flex justify-between items-center hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">
                    {formData.page
                      ? formData.page === "all"
                        ? "ALL PAGES"
                        : `${formData.page.split(",").length} pages selected`
                      : "Select pages"}
                  </span>
                  <span className="text-gray-400">▾</span>
                </button>

                {pageOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border rounded-xl shadow-lg
                            p-3 space-y-2 max-h-52 overflow-y-auto">
                    <label className="flex items-center gap-2 font-medium text-green-600">
                      <input
                        type="checkbox"
                        checked={formData.page === "all"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            page: e.target.checked ? "all" : "",
                          })
                        }
                      />
                      All Pages
                    </label>

                    <hr />

                    <div className="grid grid-cols-2 gap-2">
                      {ALL_PAGES.map((page) => (
                        <label key={page} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            disabled={formData.page === "all"}
                            checked={formData.page.split(",").includes(page)}
                            onChange={(e) => {
                              const selected = formData.page
                                ? formData.page.split(",")
                                : [];

                              const updated = e.target.checked
                                ? [...selected, page]
                                : selected.filter((p) => p !== page);

                              setFormData({
                                ...formData,
                                page: updated.join(","),
                              });
                            }}
                          />
                          {page}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {message && (
                <p className="text-center text-sm text-green-600">
                  {message}
                </p>
              )}
            </form>

            <div className="px-6 py-4 border-t flex gap-3">
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:opacity-90"
              >
                {loading ? "Saving..." : "Save"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditUserId(null);
                }}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
