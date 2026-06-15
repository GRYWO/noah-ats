"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { NotificatieBel } from "./NotificatieBel";
import { MailBadge } from "./MailBadge";
import { HelpKnop } from "./HelpKnop";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  KanbanSquare,
  Contact,
  Mail,
  UserCog,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  PhoneCall,
  Send,
  Calendar,
  CalendarClock,
  FileSignature,
  Archive,
  CreditCard,
  AtSign,
  Megaphone,
  Briefcase,
} from "lucide-react";

type Item = {
  key: string;
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  sectie?: number;
  extern?: boolean;
};

type Props = {
  active?: string;
  userEmail: string;
  userId: string;
  isSuperAdmin: boolean;
  isSalesAdmin?: boolean;
  isSetter: boolean;
  isRecruiter?: boolean;
  isBureauAdmin?: boolean;
  menuPermissions: Record<string, boolean> | null;
  logoutAction: () => Promise<void>;
};

type SidebarModus = "handmatig" | "hover" | "altijd-open";

export function SideBar({ active, userEmail, userId, isSuperAdmin, isSalesAdmin, isSetter, isRecruiter, isBureauAdmin, menuPermissions, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const [modus, setModus] = useState<SidebarModus>("hover");

  // localStorage: modus + open-state inlezen
  useEffect(() => {
    const savedModus = (localStorage.getItem("noah-sidebar-modus") as SidebarModus | null) ?? "hover";
    setModus(savedModus);
    if (savedModus === "altijd-open") {
      setOpen(true);
    } else {
      const savedOpen = localStorage.getItem("noah-sidebar-open");
      if (savedOpen === "1") setOpen(true);
    }
    // Luister naar wijzigingen vanuit /instellingen
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail as SidebarModus;
      setModus(detail);
      if (detail === "altijd-open") setOpen(true);
      if (detail === "handmatig" || detail === "hover") {
        const savedOpen = localStorage.getItem("noah-sidebar-open");
        setOpen(savedOpen === "1");
      }
    }
    window.addEventListener("noah-sidebar-modus-change", onChange);
    return () => window.removeEventListener("noah-sidebar-modus-change", onChange);
  }, []);

  useEffect(() => {
    // Alleen in handmatige modus persisten , anders dicteert de modus zelf
    if (modus === "handmatig") {
      localStorage.setItem("noah-sidebar-open", open ? "1" : "0");
    }
    document.documentElement.setAttribute("data-sidebar", open ? "open" : "closed");
  }, [open, modus]);

  const alleItems: Item[] = [
    // Sectie 1: Overzicht
    { key: "dashboard",    href: "/dashboard",    label: "Dashboard",   Icon: LayoutDashboard, sectie: 1 },
    ...(isSuperAdmin || isSalesAdmin ? [{ key: "bureaus", href: "/bureaus", label: "Bureaus", Icon: Building2, sectie: 1 } as Item] : []),

    // Sectie 2: Werkstroom , recruitment
    ...(!isBureauAdmin ? [{ key: "kandidaten", href: "/kandidaten", label: "Kandidaten", Icon: Users, sectie: 2 } as Item] : []),
    ...(!isBureauAdmin ? [{ key: "intaken", href: "/kandidaten/intaken", label: "Intake starten", Icon: UserPlus, sectie: 2 } as Item] : []),
    { key: "kanban",         href: "/kanban",         label: "Kanban",       Icon: KanbanSquare,  sectie: 2 },
    { key: "voorstellen",    href: "/voorstellen",    label: "Voorstellen",  Icon: Send,          sectie: 2 } as Item,
    { key: "agenda",         href: "/agenda",         label: "Agenda",       Icon: Calendar,      sectie: 2 },
    { key: "herinneringen",  href: "/herinneringen",  label: "Herinneringen", Icon: CalendarClock, sectie: 2 },

    // Sectie 3: Relaties & tools
    { key: "opdrachtgevers", href: "/opdrachtgevers", label: "CRM",          Icon: Contact,       sectie: 3 },
    // Vacature aanmaken: setter + super-admin (niet bureau-admin)
    ...(!isBureauAdmin && (isSetter || isSuperAdmin) ? [{ key: "vacature-aanmaken", href: "/vacature-aanmaken", label: "Vacature aanmaken", Icon: Briefcase, sectie: 3 } as Item] : []),
    // Jobdigger: setter + admin (echt, niet bureau-admin) + super-admin
    ...(!isRecruiter && !isBureauAdmin ? [{ key: "jobdigger", href: "/jobdigger", label: "Jobdigger", Icon: PhoneCall, sectie: 3 } as Item] : []),
    // Robin: recruiter + admin (echt, niet bureau-admin) + super-admin
    ...(!isSetter && !isBureauAdmin ? [{ key: "robin", href: "/robin", label: "Robin", Icon: Sparkles, sectie: 3 } as Item] : []),

    // Sectie 4: Communicatie
    { key: "inbox",          href: "/inbox",          label: "E-mail",       Icon: Mail,          sectie: 4 },
    { key: "mail-setup",     href: "/mail-setup",     label: "Mail-instellen", Icon: AtSign,      sectie: 4 },

    // Sectie 5: Team & beheer
    ...(!isRecruiter && !isBureauAdmin ? [{ key: "coaching", href: "/coaching", label: "Coaching", Icon: Sparkles, sectie: 5 } as Item] : []),
    ...(!isSetter && !isRecruiter ? [{ key: "setters", href: "/users", label: "Users", Icon: UserCog, sectie: 5 } as Item] : []),
    ...(isSuperAdmin ? [{ key: "documenten", href: "/documenten", label: "Documenten", Icon: FileSignature, sectie: 5 } as Item] : []),
    ...(isSuperAdmin ? [{ key: "archief", href: "/archief", label: "Archief", Icon: Archive, sectie: 5 } as Item] : []),
    ...(isSuperAdmin ? [{ key: "abonnementen-beheer", href: "/abonnementen-beheer", label: "Abonnementen", Icon: CreditCard, sectie: 5 } as Item] : []),
    ...(isSuperAdmin ? [{ key: "systeem-meldingen", href: "/systeem-meldingen", label: "Meldingen", Icon: Megaphone, sectie: 5 } as Item] : []),
    { key: "instellingen",   href: "/instellingen",   label: "Instellingen", Icon: Settings,      sectie: 5 },
  ];

  // Super-admin (Yorith) ziet alles, ongeacht permissions.
  // Anders: filter op menu_permissions (null = alles aan, false = verbergen).
  const items: Item[] = isSuperAdmin
    ? alleItems
    : alleItems.filter((it) => {
        if (!menuPermissions) return true;
        return menuPermissions[it.key] !== false;
      });

  // Groepeer per sectie voor separators
  let vorigeSectie = 0;

  return (
    <aside
      onMouseEnter={() => {
        if (modus === "hover") setOpen(true);
      }}
      onMouseLeave={() => {
        if (modus === "hover") setOpen(false);
      }}
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-200 ${
        open ? "w-60" : "w-16"
      }`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-gray-100 ${open ? "px-4" : "justify-center"}`}>
        <Link href="/dashboard" className="flex items-baseline gap-1.5">
          <span className="text-[#333399] text-2xl font-black tracking-tighter">
            {open ? "Noah" : "N"}<span className="text-[#ffd84d]">.</span>
          </span>
          {open && (
            <span className="text-[#333399]/70 text-[10px] font-semibold uppercase tracking-[0.25em]">
              ATS
            </span>
          )}
        </Link>
      </div>

      {/* Items */}
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((it) => {
          const isActive = active === it.key;
          const separator = it.sectie !== vorigeSectie && vorigeSectie !== 0;
          vorigeSectie = it.sectie ?? vorigeSectie;
          const className = `flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-colors ${
            open ? "px-3 py-2" : "p-2 justify-center"
          } ${
            isActive
              ? "bg-[#eef0ff] text-[#333399] font-semibold"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
          }`;
          const inner = (
            <>
              <it.Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              {open && <span className="text-sm">{it.label}</span>}
              {it.key === "inbox" && open && <MailBadge />}
            </>
          );
          return (
            <div key={it.key}>
              {separator && <div className="my-2 mx-3 border-t border-gray-100" />}
              {it.extern ? (
                <a
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={open ? undefined : it.label}
                  className={className}
                >
                  {inner}
                </a>
              ) : (
                <Link href={it.href} title={open ? undefined : it.label} className={className}>
                  {inner}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: notificaties + user + logout + collapse-toggle */}
      <div className="border-t border-gray-100 p-2">
        {/* Notificatie-bel */}
        <div className={open ? "px-1 mb-1" : "flex justify-center mb-1"}>
          <NotificatieBel userId={userId} />
        </div>
        {/* Help-knop */}
        <div className={open ? "px-1 mb-1" : "flex justify-center mb-1"}>
          <HelpKnop />
        </div>
        {open && (
          <div className="px-2 py-1.5 text-xs text-gray-500 truncate" title={userEmail}>
            {userEmail}
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            title={open ? undefined : "Uitloggen"}
            className={`w-full flex items-center gap-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 ${
              open ? "px-3 py-2" : "p-2 justify-center"
            }`}
          >
            <LogOut size={18} strokeWidth={1.8} />
            {open && <span className="text-sm">Uitloggen</span>}
          </button>
        </form>
        {modus === "handmatig" && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            title={open ? "Inklappen" : "Uitklappen"}
            className={`w-full flex items-center gap-3 rounded-lg text-gray-500 hover:bg-gray-50 mt-1 ${
              open ? "px-3 py-2" : "p-2 justify-center"
            }`}
          >
            {open ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
            {open && <span className="text-sm">Inklappen</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
