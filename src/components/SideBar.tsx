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
  ClipboardList,
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
  logoutAction: () => Promise<void>;
};

export function SideBar({ active, userEmail, userId, isSuperAdmin, isSetter, logoutAction }: Props) {
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

  const items: Item[] = [
    { key: "dashboard",    href: "/dashboard",    label: "Dashboard",   Icon: LayoutDashboard, sectie: 1 },
    ...(isSuperAdmin ? [{ key: "bureaus", href: "/bureaus", label: "Bureaus", Icon: Building2, sectie: 1 } as Item] : []),
    { key: "kandidaten",   href: "/kandidaten",   label: "Kandidaten",  Icon: Users,           sectie: 2 },
    { key: "kanban",       href: "/kanban",       label: "Kanban",      Icon: KanbanSquare,    sectie: 2 },
    { key: "agenda",       href: "/agenda",       label: "Agenda",      Icon: Calendar,        sectie: 2 },
    { key: "voorstellen", href: "/voorstellen", label: "Voorstellen", Icon: Send, sectie: 2 } as Item,
    { key: "opdrachtgevers", href: "/opdrachtgevers", label: "CRM",     Icon: Contact,         sectie: 2 },
    ...(!isSetter ? [{ key: "robin", href: "/robin", label: "Robin", Icon: Sparkles, sectie: 2 } as Item] : []),
    { key: "jobdigger", href: "/jobdigger", label: "Jobdigger", Icon: PhoneCall, sectie: 2 } as Item,
    { key: "inbox",        href: "/inbox",        label: "E-mail",      Icon: Mail,            sectie: 3 },
    ...(!isSetter ? [{ key: "setters", href: "/setters", label: "Setters", Icon: UserCog, sectie: 4 } as Item] : []),
    { key: "coaching", href: "/coaching", label: "Coaching", Icon: SparklesIcon, sectie: 4 } as Item,
    { key: "instellingen", href: "/instellingen", label: "Instellingen", Icon: Settings,       sectie: 4 },
  ];

  // Groepeer per sectie voor separators
  let vorigeSectie = 0;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-200 ${
        open ? "w-60" : "w-16"
      }`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-gray-100 ${open ? "px-4" : "justify-center"}`}>
        <Link href="/dashboard" className="flex items-baseline">
          <span className="text-[#333399] text-2xl font-black tracking-tighter">{open ? "noah" : "n"}</span>
          <span className="ml-1 w-2 h-2 rounded-full bg-[#ffd84d] inline-block"></span>
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
        {/* EOD-knop (alleen setters) */}
        {isSetter && (
          <div className={open ? "px-1 mb-1" : "flex justify-center mb-1"}>
            <Link
              href="/coaching"
              title="EOD-rapport invullen"
              className="relative p-2 rounded-lg text-gray-600 hover:bg-amber-50 hover:text-amber-700 inline-flex"
            >
              <ClipboardList size={20} strokeWidth={1.8} />
              {open && <span className="ml-2 text-sm font-medium">EOD invullen</span>}
            </Link>
          </div>
        )}
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
      </div>
    </aside>
  );
}
