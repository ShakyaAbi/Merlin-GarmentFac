import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  ChevronsLeft,
} from "lucide-react";
import { AnomalyNotification, CurrentUser } from "../types";
import Silk from "./ui/Silk";
import { api } from "../services/api";
import { routeLabelMap, sidebarSections } from "./layout/layoutNav";
import { SidebarSection } from "./layout/SidebarSection";
import { NotificationsMenu } from "./layout/NotificationsMenu";
import { ToastStack } from "./layout/ToastStack";
import { CurrentUserProvider } from "./auth/CurrentUserContext";

type InventoryAlertItem = {
  id: string;
  rawMaterialId: string;
  createdAt?: string | null;
  acknowledged?: boolean;
  rawMaterial?: {
    id: string;
    name: string;
    sku?: string | null;
  } | null;
};

type LowStockFinishedGoodItem = {
  id: string;
  name: string;
  currentStock?: number | null;
  reorderLevel?: number | null;
  sku?: string | null;
  productCode?: string | null;
};

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [notifications, setNotifications] = useState<AnomalyNotification[]>([]);
  const [overdueNotifications, setOverdueNotifications] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlertItem[]>([]);
  const [lowStockFinishedGoods, setLowStockFinishedGoods] = useState<LowStockFinishedGoodItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const sidebarNavRef = useRef<HTMLElement | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbItems = React.useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [{ label: "Home", path: "/" }];
    }

    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`;
      const isNumeric = /^\d+$/.test(segment);
      const previousSegment = segments[index - 1];

      let label = routeLabelMap[segment] || segment.replace(/-/g, " ");
      if (segment === "create" && previousSegment === "sales-invoices") label = "Create Invoice";
      if (isNumeric && previousSegment === "projects") label = "Project";
      if (isNumeric && previousSegment === "indicators") label = "Indicator";
      if (!routeLabelMap[segment] && !isNumeric) {
        label = label
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      }

      return { label, path };
    });
  }, [location.pathname]);

  const fetchNotifications = () => {
    Promise.all([
      api.getAnomalyNotifications(),
      api.getOverdueNotifications(),
      api.get('/operations/summary'),
      api.getInventoryAlerts?.(),
    ])
      .then(([{ notifications, totalUnread }, overdue, summary, alerts]) => {
        setNotifications(notifications);
        setOverdueNotifications(overdue || []);
        setLowStockFinishedGoods(Array.isArray(summary?.lists?.lowStockFinishedGoods) ? summary.lists.lowStockFinishedGoods : []);
        const inventoryList = Array.isArray(alerts) ? alerts : [];
        setInventoryAlerts(inventoryList);
        const inventoryUnread = inventoryList.filter((alert: InventoryAlertItem) => !alert.acknowledged).length;
        const lowStockArticleCount = Array.isArray(summary?.lists?.lowStockFinishedGoods) ? summary.lists.lowStockFinishedGoods.length : 0;
        setUnreadCount(totalUnread + (overdue?.length || 0) + inventoryUnread + lowStockArticleCount);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    api.me()
      .then(user => setCurrentUser(user))
      .catch(err => console.error("Could not load user profile", err));

    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    operations: true,
    sales: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleMarkAllRead = async () => {
    if (markingRead) return;
    setMarkingRead(true);
    try {
      await api.markAllAnomaliesRead();
      fetchNotifications();
    } catch {}
    setMarkingRead(false);
  };

  const handleAckInventoryAlert = async (id: string) => {
    try {
      await api.acknowledgeInventoryAlert(id);
      fetchNotifications();
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem("merlin_token");
    navigate("/");
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleSidebarItemClick = () => {
    sidebarNavRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const visibleSidebarSections = React.useMemo(() => {
    const isAdmin = currentUser?.role === 'ADMIN';
    return sidebarSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => isAdmin || !['/admin/users', '/admin/invitations'].includes(item.path)),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentUser?.role]);

  return (
    <CurrentUserProvider user={currentUser}>
      <div className="h-screen w-full bg-blue-900 flex overflow-hidden font-sans p-2 lg:p-4 gap-4 relative">
      <Silk speed={5} scale={1} color="#4d66ff" noiseIntensity={0.8} rotation={0} paused={true} />
      <ToastStack />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Floating Glass Panel */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50
        bg-slate-900/90 backdrop-blur-xl border-r border-white/10 lg:border-0 lg:bg-slate-900/40 lg:backdrop-blur-md lg:rounded-2xl lg:shadow-xl
        transition-all duration-200 ease-out flex flex-col lg:h-full
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        w-72
      `}
      >
        {/* Logo Area */}
        <div
          className={`h-20 flex items-center border-b border-white/10 flex-shrink-0 transition-all ${
            isCollapsed ? "justify-center px-0" : "px-6 justify-between"
          }`}
        >
          <div
            className={`flex items-center gap-3 ${
              isCollapsed ? "justify-center w-full" : ""
            }`}
          >
            <div
              className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50 flex-shrink-0 cursor-pointer hover:bg-blue-500 transition-colors"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : ""}
            >
              <img
                src="/MerlinLogoWhite.svg"
                alt="MERLIN Logo"
                className="w-5 h-5"
              />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-white tracking-tight whitespace-nowrap">
                MERLIN <span className="text-blue-300 font-normal">Lite</span>
              </span>
            )}
          </div>

          {/* Close X for Mobile */}
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse Chevron for Desktop (Only visible when open) */}
          {!isCollapsed && (
            <button
              className="hidden lg:block text-slate-400 hover:text-white"
              onClick={() => setIsCollapsed(true)}
              title="Collapse Sidebar"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          ref={sidebarNavRef}
          className="sidebar-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
        >
          {visibleSidebarSections.map((section) => (
            <SidebarSection
              key={section.key}
              section={section}
              isCollapsed={isCollapsed}
              isOpen={openSections[section.key] ?? true}
              onToggle={() => toggleSection(section.key)}
              onNavigate={handleSidebarItemClick}
            />
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <button
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "gap-3"
            } w-full p-3 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-slate-800/70 transition-colors group text-left`}
          >
            <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center font-semibold text-sm border border-slate-300/70 flex-shrink-0">
              {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : currentUser?.email?.substring(0, 2).toUpperCase() || "ME"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {currentUser?.name || currentUser?.email || "User"}
                </p>
                <p className="text-xs text-slate-300 truncate">
                  {currentUser?.jobTitle || (currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1).toLowerCase() : "Role")}
                </p>
              </div>
            )}
          </button>

          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className={`mt-3 flex w-full items-center ${
              isCollapsed ? "justify-center" : "justify-center space-x-2"
            } px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors`}
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && (
              <span className="whitespace-nowrap">Sign Out</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper - The "Card" */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 rounded-xl shadow-lg relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden md:flex items-center text-sm text-slate-500">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <React.Fragment key={item.path}>
                    {isLast ? (
                      <span className="font-medium text-slate-900">
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        to={item.path}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                    {!isLast && (
                      <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className={`p-2 rounded-full transition-all relative ${
                  showNotifications
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <NotificationsMenu
                  notifications={notifications}
                  overdueNotifications={overdueNotifications}
                  inventoryAlerts={inventoryAlerts}
                  lowStockFinishedGoods={lowStockFinishedGoods}
                  unreadCount={unreadCount}
                  onClose={() => setShowNotifications(false)}
                  onMarkAllRead={handleMarkAllRead}
                  markingRead={markingRead}
                  onAckInventoryAlert={handleAckInventoryAlert}
                />
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      </div>
    </CurrentUserProvider>
  );
};
