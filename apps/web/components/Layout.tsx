import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Command,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Mail,
  Plus,
  Layers,
  FileText,
  FileSpreadsheet,
  ArrowRightLeft,
  BarChart3,
} from "lucide-react";
import { AnomalyNotification, CurrentUser } from "../types";
import Silk from "./ui/Silk";
import { api } from "../services/api";

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

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [notifications, setNotifications] = useState<AnomalyNotification[]>([]);
  const [overdueNotifications, setOverdueNotifications] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlertItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const sidebarNavRef = useRef<HTMLElement | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const routeLabelMap: Record<string, string> = {
    projects: "Home",
    "data-entry": "Data Entry",
    indicators: "Indicators",
    settings: "Settings",
    "sales-invoices": "Sales Invoices",
    "sales-orders": "Sales Orders",
    customers: "Customers",
    reports: "Reports",
  };

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
      if (segment === "list" && previousSegment === "projects") label = "Projects";

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
      api.getInventoryAlerts?.(),
    ])
      .then(([{ notifications, totalUnread }, overdue, alerts]) => {
        setNotifications(notifications);
        setOverdueNotifications(overdue || []);
        const inventoryList = Array.isArray(alerts) ? alerts : [];
        setInventoryAlerts(inventoryList);
        const inventoryUnread = inventoryList.filter((alert: InventoryAlertItem) => !alert.acknowledged).length;
        setUnreadCount(totalUnread + (overdue?.length || 0) + inventoryUnread);
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

  const isAdmin = currentUser?.role === 'ADMIN';
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    public: true,
    accounting: true,
    buying: true,
    selling: true,
    stock: true,
    projects: false,
    support: false,
    settings: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };

  type SidebarItem = { icon: React.ComponentType<{ className?: string }>; label: string; path: string }
  type SidebarSection = { key: string; label: string; items: SidebarItem[]; collapsible?: boolean }

  const sections: SidebarSection[] = [
    {
      key: 'public',
      label: 'Public',
      collapsible: true,
      items: [
        { icon: Home, label: 'Home', path: '/projects' },
        { icon: FolderKanban, label: 'Projects', path: '/projects/list' },
        { icon: ClipboardCheck, label: 'Data Entry', path: '/data-entry' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
      ],
    },
    {
      key: 'accounting',
      label: 'Accounting',
      collapsible: true,
      items: [
        { icon: FileText, label: 'Expenses', path: '/expenses' },
        { icon: FileText, label: 'Payments', path: '/payments' },
        { icon: FileSpreadsheet, label: 'Financial Reports', path: '/reports' },
      ],
    },
    {
      key: 'buying',
      label: 'Buying',
      collapsible: true,
      items: [
        { icon: ClipboardCheck, label: 'Purchases', path: '/inventory/purchases' },
        { icon: Command, label: 'Suppliers', path: '/inventory/suppliers' },
      ],
    },
    {
      key: 'selling',
      label: 'Selling',
      collapsible: true,
      items: [
        { icon: FileText, label: 'Sales Orders', path: '/sales-orders' },
        { icon: FileText, label: 'Sales Invoices', path: '/sales-invoices' },
        { icon: Users, label: 'Customers', path: '/inventory/customers' },
      ],
    },
    {
      key: 'stock',
      label: 'Stock',
      collapsible: true,
      items: [
        { icon: FolderKanban, label: 'Materials', path: '/inventory/materials' },
        { icon: Layers, label: 'Finished Goods', path: '/inventory/finished-goods' },
        { icon: Layers, label: 'Production', path: '/inventory/production' },
        { icon: Layers, label: 'BOMs', path: '/inventory/boms/create' },
        { icon: AlertCircle, label: 'Alerts', path: '/inventory/alerts' },
      ],
    },
    {
      key: 'projects',
      label: 'Projects',
      collapsible: true,
      items: [
        { icon: FolderKanban, label: 'Project List', path: '/projects/list' },
        { icon: Plus, label: 'New Project', path: '/projects/list' },
      ],
    },
    {
      key: 'support',
      label: 'Support',
      collapsible: true,
      items: [
        { icon: ClipboardCheck, label: 'Material Entry', path: '/inventory/materials/entry' },
        { icon: Users, label: 'Invitations', path: '/admin/invitations' },
      ],
    },
    {
      key: 'settings',
      label: 'ERPNext Settings',
      collapsible: true,
      items: [
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: FileSpreadsheet, label: 'Exports', path: '/exports' },
        { icon: Users, label: 'Team', path: '/admin/users' },
      ],
    },
  ];

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

  const SidebarSection = ({ section }: { section: { key: string; label: string; items: SidebarItem[]; collapsible?: boolean } }) => {
    const open = openSections[section.key] ?? true;
    return (
      <div>
        {!isCollapsed ? (
          <button
            type="button"
            onClick={() => toggleSection(section.key)}
            className="mb-2 flex w-full items-center justify-between px-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:text-slate-200"
          >
            <span>{section.label}</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : null}

        {(open || isCollapsed) && (
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleSidebarItemClick}
                  title={isCollapsed ? item.label : ''}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center ${
                    isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                  } py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <item.icon
                      className={`w-5 h-5 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed ? <span className="whitespace-nowrap">{item.label}</span> : null}
                  </div>
                  {!isCollapsed && isActive ? <ChevronRight className="w-4 h-4 text-white/70" /> : null}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  };


  return (
    <div className="h-screen w-full bg-blue-900 flex overflow-hidden font-sans p-2 lg:p-4 gap-4 relative">
      <Silk speed={5} scale={1} color="#4d66ff" noiseIntensity={0.8} rotation={0} paused={true} />

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
        <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {sections.map((section) => (
            <SidebarSection key={section.key} section={section} />
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
                <p className="text-xs text-slate-400 truncate group-hover:text-slate-300">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 rounded-2xl shadow-2xl relative">
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
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {unreadCount > 0 ? `${unreadCount} alerts attention` : "All caught up"}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          disabled={markingRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                        >
                          {markingRead ? "Marking..." : "Mark all read"}
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                      {overdueNotifications.length > 0 &&
                        overdueNotifications.map((n) => (
                          <Link
                            key={n.id}
                            to={`/indicators/${n.indicatorId}`}
                            onClick={() => setShowNotifications(false)}
                            className="px-4 py-3 hover:bg-amber-50/60 flex gap-3 transition-colors cursor-pointer group block"
                          >
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-amber-700 truncate">
                                  {n.indicatorName} Overdue
                                </p>
                                <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">
                                  Overdue
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {n.projectName}
                              </p>
                              <p className="text-xs text-amber-600 mt-1 line-clamp-2">
                                Last report was {n.daysOverdue} days ago. Expected {n.expectedFrequency.toLowerCase()}.
                              </p>
                            </div>
                          </Link>
                        ))}

                      {inventoryAlerts.length > 0 && (
                        <div className="px-4 py-3 bg-slate-50/30">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Inventory Alerts
                            </p>
                            <Link
                              to="/inventory/alerts"
                              onClick={() => setShowNotifications(false)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              Open page
                            </Link>
                          </div>
                          <div className="space-y-2">
                            {inventoryAlerts.map((alert) => (
                              <div
                                key={alert.id}
                                className="rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                      {alert.rawMaterial?.name || "Unknown material"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Low stock alert
                                      {alert.createdAt ? ` · ${new Date(alert.createdAt).toLocaleString()}` : ""}
                                    </p>
                                  </div>
                                  {!alert.acknowledged ? (
                                    <button
                                      type="button"
                                      onClick={() => handleAckInventoryAlert(alert.id)}
                                      className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                                    >
                                      Acknowledge
                                    </button>
                                  ) : (
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                      Acknowledged
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            to={`/indicators/${n.indicatorId}`}
                            onClick={() => setShowNotifications(false)}
                            className="px-4 py-3 hover:bg-red-50/60 flex gap-3 transition-colors cursor-pointer group block"
                          >
                            <div className="mt-0.5 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-red-700 truncate">
                                  {n.indicatorName} anomaly
                                </p>
                                {n.anomalyStatus === "DETECTED" && (
                                  <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">
                                {n.projectName}
                              </p>
                              {n.anomalyReason && (
                                <p className="text-xs text-red-600 mt-1 line-clamp-2">
                                  {n.anomalyReason}
                                </p>
                              )}
                            </div>
                          </Link>
                        ))
                      ) : (
                        overdueNotifications.length === 0 && (
                          <div className="py-10 text-center">
                            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 font-medium">
                              Everything looks good!
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              No anomalies or late reports.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-slate-100 text-center bg-slate-50/30">
                      <span className="text-xs text-slate-400">
                        Last 30 days · auto-refreshes every 60s
                      </span>
                    </div>
                  </div>
                </>
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
  );
};

type SidebarItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
};

function SidebarSection({
  title,
  items,
  isCollapsed,
  locationPath,
  onNavigate,
  badgeCount,
  badgePath,
}: {
  title: string;
  items: SidebarItem[];
  isCollapsed: boolean;
  locationPath: string;
  onNavigate: () => void;
  badgeCount?: number;
  badgePath?: string;
}) {
  return (
    <div>
      {!isCollapsed && (
        <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = locationPath.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={isCollapsed ? item.label : ""}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center ${
                isCollapsed ? "justify-center px-0" : "justify-between px-3"
              } py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                  }`}
                />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
              {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
              {!isCollapsed && badgeCount && badgePath === item.path && badgeCount > 0 && (
                <div className="ml-2 flex items-center">
                  <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">{badgeCount}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
