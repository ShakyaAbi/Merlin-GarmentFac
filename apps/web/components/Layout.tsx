import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
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
} from "lucide-react";
import { AnomalyNotification, CurrentUser } from "../types";
import Silk from "./ui/Silk";
import { api } from "../services/api";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [notifications, setNotifications] = useState<AnomalyNotification[]>([]);
  const [overdueNotifications, setOverdueNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const routeLabelMap: Record<string, string> = {
    projects: "Projects",
    "data-entry": "Data Entry",
    indicators: "Indicators",
    settings: "Settings",
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
    ])
      .then(([{ notifications, totalUnread }, overdue]) => {
        setNotifications(notifications);
        setOverdueNotifications(overdue || []);
        setUnreadCount(totalUnread + (overdue?.length || 0));
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

  const navItems = [
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: ClipboardCheck, label: "Data Entry", path: "/data-entry" },
    ...(isAdmin ? [
      { icon: Users, label: "Team", path: "/admin/users" },
      { icon: Mail, label: "Invitations", path: "/admin/invitations" },
    ] as const : []),
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // Inventory section links
  const inventoryItems = [
    { icon: Command, label: 'Suppliers', path: '/inventory/suppliers' },
    { icon: FolderKanban, label: 'Materials', path: '/inventory/materials' },
    { icon: ClipboardCheck, label: 'Purchases', path: '/inventory/purchases' },
    { icon: AlertCircle, label: 'Alerts', path: '/inventory/alerts' },
  ];

  const handleMarkAllRead = async () => {
    if (markingRead) return;
    setMarkingRead(true);
    try {
      await api.markAllAnomaliesRead();
      setUnreadCount(0);
      // Re-fetch to update statuses
      fetchNotifications();
    } catch {}
    setMarkingRead(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("merlin_token");
    navigate("/");
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      setUnreadCount(0);
    }
    setShowNotifications(!showNotifications);
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
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 overflow-x-hidden">
            <div>
            {!isCollapsed && (
              <h2 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 animate-in fade-in whitespace-nowrap">
                Main Menu
              </h2>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    title={isCollapsed ? item.label : ""}
                    className={`
                      group flex items-center ${
                        isCollapsed
                          ? "justify-center px-0"
                          : "justify-between px-3"
                      } py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <div
                      className={`flex items-center ${
                        isCollapsed ? "justify-center" : "gap-3"
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-white"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="whitespace-nowrap">{item.label}</span>
                      )}
                    </div>
                    {!isCollapsed && isActive && (
                      <ChevronRight className="w-4 h-4 text-white/70" />
                    )}
                  </Link>
                );
              })}
            </div>
          
            {/* Inventory Section */}
            <div className="mt-6">
              {!isCollapsed && (
                <h2 className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 animate-in fade-in whitespace-nowrap">
                  Inventory
                </h2>
              )}
              <div className="space-y-1">
                {inventoryItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      title={isCollapsed ? item.label : ""}
                      className={
                        `group flex items-center ${
                          isCollapsed ? "justify-center px-0" : "justify-between px-3"
                        } py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                        <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                        {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                      </div>
                      {!isCollapsed && isActive && <ChevronRight className="w-4 h-4 text-white/70" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
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
