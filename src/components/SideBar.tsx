"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { NotificatieBel } from "./NotificatieBel";
import { HelpKnop } from "./HelpKnop";
import {
  LayoutDashboard,
  Building2,
  Users,
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
  Sparkles as SparklesIcon,
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
  isSetter: boolean;
  menuPermissions: Record<string, boolean> | null;
  logoutAction: () => Promise<void>;
};

export function SideBar({ active, userEmail, userId, isSuperAdmin, isSetter, menuPermissions, logoutAction }: Props) {
  const [open, setOpen] = useState(false);

  // localStorage persist
  useEffect(() => {
    const saved = localStorage.getItem("noah-sidebar-open");
    if (saved === "1") setOpen(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("noah-sidebar-open", open ? "1" : "0");
    document.documentElement.setAttribute("data-sidebar", open ? "open" : "closed");
  }, [open]);

  const alleItems: Item[] = [
    // Sectie 1: Overzicht
    { key: "dashboard",    href: "/dashboard",    label: "Dashboard",   Icon: LayoutDashboard, sectie: 1 },
    ...(isSuperAdmin ? [{ key: "bureaus", href: "/bureaus", label: "Bureaus", Icon: Building2, sectie: 1 } as Item] : []),

    // Sectie 2: Werkstroom — recruitment
    { key: "kandidaten",     href: "/kandidaten",     label: "Kandidaten",   Icon: Users,         sectie: 2 },
    { key: "kanban",         href: "/kanban",         label: "Kanban",       Icon: KanbanSquare,  sectie: 2 },
    { key: "voorstellen",    href: "/voorstellen",    label: "Voorstellen",  Icon: Send,          sectie: 2 } as Item,
    { key: "agenda",         href: "/agenda",         label: "Agenda",       Icon: Calendar,      sectie: 2 },

    // Sectie 3: Relaties & tools
    { key: "opdrachtgevers", href: "/opdrachtgevers", label: "CRM",          Icon: Contact,       sectie: 3 },
    { key: "jobdigger",      href: "/jobdigger",      label: "Jobdigger",    Icon: PhoneCall,     sectie: 3 } as Item,
    ...(!isSetter ? [{ key: "robin", href: "/robin", label: "Robin", Icon: Sparkles, sectie: 3 } as Item] : []),

    // Sectie 4: Communicatie
    { key: "inbox",          href: "/inbox",          label: "E-mail",       Icon: Mail,          sectie: 4 },

    // Sectie 5: Team & beheer
    { key: "coaching",       href: "/coaching",       label: "Coaching",     Icon: SparklesIcon,  sectie: 5 } as Item,
    ...(!isSetter ? [{ key: "setters", href: "/setters", label: "Users", Icon: UserCog, sectie: 5 } as Item] : []),
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
      className={`fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-200 overflow-hidden ${
        open ? "w-60" : "w-16"
      }`}
      style={{
        background:
          "linear-gradient(180deg, #333399 0%, #1f1f5c 50%, #0f0f23 100%)",
      }}
    >
      {/* Subtiele radial highlight bovenin */}
      <div
        aria-hidden
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,216,77,0.4) 0%, rgba(51,51,153,0) 70%)",
        }}
      />

      {/* Logo */}
      <div className={`relative h-16 flex items-center border-b border-white/10 ${open ? "px-4" : "justify-center"}`}>
        <Link href="/dashboard" className="flex items-baseline">
          <span className="text-white text-2xl font-black tracking-tighter">{open ? "noah" : "n"}</span>
          <span className="ml-1 w-2 h-2 rounded-full bg-[#ffd84d] inline-block"></span>
        </Link>
      </div>

      {/* Items */}
      <nav className="relative flex-1 overflow-y-auto py-3">
        {items.map((it) => {
          const isActive = active === it.key;
          const separator = it.sectie !== vorigeSectie && vorigeSectie !== 0;
          vorigeSectie = it.sectie ?? vorigeSectie;
          const className = `flex items-center gap-3 mx-2 my-0.5 rounded-lg transition-all ${
            open ? "px-3 py-2" : "p-2 justify-center"
          } ${
            isActive
              ? "bg-white/15 text-white font-semibold shadow-sm backdrop-blur-sm border border-white/10"
              : "text-white/60 hover:bg-white/5 hover:text-white"
          }`;
          const inner = (
            <>
              <it.Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? "text-[#ffd84d]" : ""}
              />
              {open && <span className="text-sm">{it.label}</span>}
            </>
          );
          return (
            <div key={it.key}>
              {separator && <div className="my-2 mx-3 border-t border-white/10" />}
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
      <div className="relative border-t border-white/10 p-2">
        {/* Notificatie-bel */}
        <div className={open ? "px-1 mb-1" : "flex justify-center mb-1"}>
          <NotificatieBel userId={userId} />
        </div>
        {/* Help-knop */}
        <div className={open ? "px-1 mb-1" : "flex justify-center mb-1"}>
          <HelpKnop />
        </div>
        {open && (
          <div className="px-2 py-1.5 text-xs text-white/50 truncate" title={userEmail}>
            {userEmail}
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            title={open ? undefined : "Uitloggen"}
            className={`w-full flex items-center gap-3 rounded-lg text-white/60 hover:bg-red-500/15 hover:text-red-300 transition-colors ${
              open ? "px-3 py-2" : "p-2 justify-center"
            }`}
          >
            <LogOut size={18} strokeWidth={1.8} />
            {open && <span className="text-sm">Uitloggen</span>}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          title={open ? "Inklappen" : "Uitklappen"}
          className={`w-full flex items-center gap-3 rounded-lg text-white/50 hover:bg-white/5 hover:text-white mt-1 transition-colors ${
            open ? "px-3 py-2" : "p-2 justify-center"
          }`}
        >
          {open ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          {open && <span className="text-sm">Inklappen</span>}
        </button>
      </div>
    </aside>
  );
}
