import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle,
  FileText,
  Package,
  CreditCard,
  Settings,

} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Planning", href: "/planning", icon: ClipboardList },
    { name: "Approval", href: "/approval", icon: CheckCircle },
    { name: "PO Generator", href: "/po-generator", icon: FileText },
    { name: "PO History", href: "/po-history", icon: FileText },
    { name: "Received", href: "/received", icon: Package },
    { name: "Report", href:"/Report", icon:Package},
    { name: "Payment", href: "/payment", icon: CreditCard },
    { name: "Payment History", href: "/payment-history", icon: CreditCard },
    { name: "Add User", href: "/users", icon: CreditCard },
    { name: "Setting", href: "/setting", icon: Settings },
  ];


  const userPages = (user?.page_access || []).map((p: string) => p.toLowerCase());
  
  const filteredNavigation =
    userPages.includes("all")
      ? navigation
      : navigation.filter((item) => {
          const navName = item.name.toLowerCase();
          
          if (userPages.includes(navName)) return true;
          
          // Aliases mapping DB names -> Sidebar names
          if (navName === "po generator" && userPages.includes("po")) return true;
          if (navName === "po history" && userPages.includes("po")) return true;
          if (navName === "received" && (userPages.includes("receipt") || userPages.includes("received"))) return true;
          if (navName === "payment history" && userPages.includes("payment")) return true;
          if (navName === "add user" && userPages.includes("users")) return true;
          if (navName === "setting" && (userPages.includes("setting") || userPages.includes("seting") || userPages.includes("settings"))) return true;
          
          return false;
        });



  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
  className={`${
    isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
  } fixed md:relative md:translate-x-0 md:opacity-100 transition-all duration-300 ease-in-out z-50 md:z-auto w-64 md:w-72 h-screen flex flex-col bg-gradient-to-b from-white via-gray-50 to-gray-100 shadow-2xl md:shadow-xl border-r border-gray-200/50 rounded-r-3xl md:rounded-none`}
>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg">
              <img
            src={"Images/Logo.PNG"}
            alt="Company Logo"
            style={{
              height: "40px",
              width: "auto",
              margin: "0 auto",
              display: "block",
            }}
          />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                PURCHASE PLANNING
              </h1>
              <p className="text-sm text-gray-600">FMS System</p>
            </div>
          </div>
        </div>

        <nav className="px-3 mt-6 flex-1 overflow-y-auto pb-6">
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <li key={item.name} className="group">
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-900 hover:shadow-md"
                      }`
                    }
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 transition-all duration-200 ${
                        location.pathname === item.href
                          ? "text-blue-600"
                          : "text-gray-400 group-hover:text-gray-600 group-hover:scale-110"
                      }`}
                    />
                    <span className="transition-all duration-200 group-hover:translate-x-1">
                      {item.name}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="p-3 bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200/50 backdrop-blur-sm">
              <div className="flex items-center">
                <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-md">
                  <span className="text-sm font-bold text-white">
                    {user.username?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-600 capitalize font-medium">
                    {user.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
