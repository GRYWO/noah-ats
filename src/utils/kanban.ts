export type KanbanStap =
  | "interne_intake"
  | "in_afwachting_cv"
  | "in_wachtrij"
  | "bij_setter"
  | "voorgesteld_opdrachtgever"
  | "1e_gesprek"
  | "2e_gesprek"
  | "geplaatst"
  | "afgewezen";

export type KanbanOptie = {
  key: KanbanStap;
  label: string;
  kortLabel: string;
  rand: string;   // tailwind border-color voor kanban
  vink: string;   // tailwind bg-color voor pipeline-dot
};

export const KANBAN_STAPPEN: KanbanOptie[] = [
  { key: "interne_intake",            label: "1. Interne intake",          kortLabel: "Interne intake",         rand: "border-blue-500",   vink: "bg-blue-500"   },
  { key: "in_afwachting_cv",          label: "2. In afwachting van CV",    kortLabel: "Wacht op CV",            rand: "border-cyan-500",   vink: "bg-cyan-500"   },
  { key: "in_wachtrij",               label: "3. In wachtrij",             kortLabel: "Wachtrij",               rand: "border-indigo-500", vink: "bg-indigo-500" },
  { key: "bij_setter",                label: "4. Bij setter",              kortLabel: "Bij setter",             rand: "border-purple-500", vink: "bg-purple-500" },
  { key: "voorgesteld_opdrachtgever", label: "5. Voorgesteld opdrachtgever", kortLabel: "Voorgesteld",          rand: "border-pink-500",   vink: "bg-pink-500"   },
  { key: "1e_gesprek",                label: "6. 1e gesprek",              kortLabel: "1e gesprek",             rand: "border-amber-500",  vink: "bg-amber-500"  },
  { key: "2e_gesprek",                label: "7. 2e gesprek",              kortLabel: "2e gesprek",             rand: "border-orange-500", vink: "bg-orange-500" },
  { key: "geplaatst",                 label: "Geplaatst",                  kortLabel: "Geplaatst",              rand: "border-green-500",  vink: "bg-green-500"  },
  { key: "afgewezen",                 label: "Afgewezen",                  kortLabel: "Afgewezen",              rand: "border-red-500",    vink: "bg-red-500"    },
];

export const KANBAN_OPTIES = KANBAN_STAPPEN.map(s => ({ value: s.key, label: s.label }));

export function kanbanLabel(key: string): string {
  return KANBAN_STAPPEN.find(s => s.key === key)?.label ?? key;
}
