import { ReactNode } from "react";
import { IconName, PartnerPage } from "../../types";
import { Brand } from "../ui/Brand";
import { Icon } from "../ui/Icon";

export function WebShell({
  children,
  page,
  setPage,
  outletName = "Bersih Laundry",
}: {
  children: ReactNode;
  page: PartnerPage;
  setPage: (page: PartnerPage) => void;
  outletName?: string;
}) {
  const items: [PartnerPage, IconName, string][] = [
    ["dashboard", "home", "Dashboard"],
    ["pesanan", "orders", "Pesanan"],
    ["keuangan", "wallet", "Keuangan & Payout"],
    ["outlet", "store", "Kelola Outlet"],
  ];

  const initials = outletName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "ML";

  return (
    <div className="web-app">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">PORTAL MITRA</div>
        <nav>
          {items.map(([id, icon, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span>Butuh bantuan?</span>
          <p>Tim dukungan siap membantu operasional outletmu.</p>
          <button type="button">Hubungi dukungan</button>
        </div>
        <div className="sidebar-user">
          <div>{initials}</div>
          <span>
            <strong>{outletName}</strong>
            <small>Mitra Laundry</small>
          </span>
          <Icon name="chevron" />
        </div>
      </aside>
      <main className="web-main">{children}</main>
    </div>
  );
}

export function WebHeader({
  eyebrow,
  title,
  subtitle,
  onNotifications,
  hasNotification = true,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onNotifications?: () => void;
  hasNotification?: boolean;
}) {
  return (
    <header className="web-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">
        <button
          className="icon-button"
          aria-label="Buka notifikasi"
          onClick={onNotifications}
        >
          <Icon name="bell" />
          {hasNotification && <i />}
        </button>
      </div>
    </header>
  );
}

export function Stat({
  icon,
  label,
  value,
  trend,
  tone,
  hideIcon = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  trend: string;
  tone: string;
  hideIcon?: boolean;
}) {
  return (
    <div className={`stat-card ${hideIcon ? "stat-card-no-icon" : ""}`}>
      {!hideIcon && (
        <div className={`stat-icon ${tone}`}>
          <Icon name={icon} />
        </div>
      )}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={tone === "amber" ? "neutral" : ""}>{trend}</small>
      </div>
    </div>
  );
}

export function PanelTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button type="button" onClick={onAction}>
          {action} <Icon name="chevron" size={16} />
        </button>
      )}
    </div>
  );
}
