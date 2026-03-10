"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Inbox as InboxIcon,
  Star,
  RefreshCw,
  Utensils,
  PartyPopper,
  Search as SearchIcon,
  Package,
  FileText,
  AlertTriangle,
  Newspaper,
  Trash2,
  Mail,
  Bot,
  Send,
  RotateCw,
  GripHorizontal,
  GripVertical,
  Sparkles,
  Loader2,
  CalendarPlus,
  X,
  Reply,
  Paperclip,
  Download,
  CheckSquare,
  Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface EmailItem {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  textBody: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  isAnswered: boolean;
  hasAttachments: boolean;
  category: string | null;
  priority: string | null;
  aiDraft: string | null;
  aiSummary: string | null;
  accountId: string;
}

interface Attachment {
  filename: string;
  size: number;
  downloadUrl: string;
}

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
}

const TODO_KEY = "__todo__";

function toDDMMYYYY(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}
function fromDDMMYYYY(dmy: string): string {
  const m = dmy.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (!m) return "";
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const CATEGORIES = [
  { key: null, label: "Alle", icon: InboxIcon },
  { key: TODO_KEY, label: "TODO", icon: CheckSquare },
  { key: "reservierung", label: "Reservierungen", icon: Utensils },
  { key: "veranstaltung", label: "Veranstaltungen", icon: PartyPopper },
  { key: "fundgegenstand", label: "Fundgegenstaende", icon: SearchIcon },
  { key: "lieferant", label: "Lieferanten", icon: Package },
  { key: "bewerbung", label: "Bewerbungen", icon: FileText },
  { key: "beschwerde", label: "Beschwerden", icon: AlertTriangle },
  { key: "presse", label: "Presse/Marketing", icon: Newspaper },
  { key: "spam", label: "Spam", icon: Trash2 },
];

const REAL_CATEGORIES = CATEGORIES.filter((c) => c.key !== null && c.key !== TODO_KEY);

const PRIORITY_COLORS: Record<string, string> = {
  hoch: "bg-red-500",
  mittel: "bg-orange-400",
  niedrig: "bg-green-500",
};

type DragTarget = "category" | "emaillist" | "draft" | null;

export default function InboxPage() {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [allEmails, setAllEmails] = useState<EmailItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [quickTemplates, setQuickTemplates] = useState<{ label: string; text: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<{ label: string; text: string } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [categoryDropdownId, setCategoryDropdownId] = useState<string | null>(null);

  // Per-email draft store: { emailId -> { draft, instruction } }
  const draftsRef = useRef<Record<string, { draft: string; instruction: string }>>({});
  const [aiDraft, setAiDraft] = useState("");
  const [userInstruction, setUserInstruction] = useState("");

  const selectedEmailIdRef = useRef<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Background generation tracking: { emailId -> AbortController }
  const generatingRef = useRef<Record<string, boolean>>({});
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);

  const [categoryWidth, setCategoryWidth] = useState(192);
  const [emailListWidth, setEmailListWidth] = useState(320);
  const [draftPanelHeight, setDraftPanelHeight] = useState(280);

  // Account, von dem die Antwort verschickt wird (Standard: Account der empfangenen Mail)
  const [replyFromAccountId, setReplyFromAccountId] = useState<string>("");

  const dragTarget = useRef<DragTarget>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) setAccounts(await res.json());
    } catch { /* */ }
  }, []);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccount) params.set("accountId", selectedAccount);
      if (selectedCategory && selectedCategory !== TODO_KEY) params.set("category", selectedCategory);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const res = await fetch(`/api/emails?${params}`);
      if (res.ok) {
        let data: EmailItem[] = await res.json();
        if (selectedCategory === TODO_KEY) {
          data = data.filter((e) => !e.isAnswered);
        }
        setEmails(data);
      }
    } catch { /* */ }
    setLoading(false);
  }, [selectedAccount, selectedCategory, debouncedSearch]);

  const fetchAllEmails = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedAccount) params.set("accountId", selectedAccount);
      const res = await fetch(`/api/emails?${params}`);
      if (res.ok) setAllEmails(await res.json());
    } catch { /* */ }
  }, [selectedAccount]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      if (s.quick_templates) {
        try { setQuickTemplates(JSON.parse(s.quick_templates)); } catch { /* */ }
      }
    }).catch(() => {});
  }, []);
  useEffect(() => { fetchEmails(); fetchAllEmails(); }, [fetchEmails, fetchAllEmails]);

  // Auto-poll alle 15 Minuten: neue Mails abrufen, vorkategorisieren, Entwürfe generieren
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const syncRes = await fetch("/api/emails/sync", { method: "POST" });
        const syncData = await syncRes.json();
        const totalNew = syncData.results?.reduce(
          (s: number, r: { fetched: number }) => s + r.fetched, 0
        ) ?? 0;

        if (totalNew > 0) {
          // Reload emails
          await fetchEmails();
          await fetchAllEmails();

          // Categorize new uncategorized mails
          await fetch("/api/ai/batch-categorize", { method: "POST" });
          await fetchEmails();
          await fetchAllEmails();

          // Generate drafts for new uncategorized mails that don't have one
          const freshRes = await fetch("/api/emails?search=");
          if (freshRes.ok) {
            const freshEmails: EmailItem[] = await freshRes.json();
            const needDraft = freshEmails.filter(
              (e) => !e.aiDraft && !e.isAnswered
            ).slice(0, 5);
            for (const em of needDraft) {
              try {
                await fetch("/api/ai/draft", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ emailId: em.id }),
                });
              } catch { /* */ }
            }
            if (needDraft.length > 0) {
              await fetchEmails();
              await fetchAllEmails();
            }
          }
        }
      } catch { /* */ }
    }, 900000);

    return () => clearInterval(interval);
  }, [fetchEmails, fetchAllEmails]);

  // Save current draft to ref when draft or instruction changes
  useEffect(() => {
    if (selectedEmail) {
      draftsRef.current[selectedEmail.id] = { draft: aiDraft, instruction: userInstruction };
    }
  }, [aiDraft, userInstruction, selectedEmail]);

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragTarget.current) return;
      if (dragTarget.current === "category") {
        setCategoryWidth(Math.max(120, Math.min(350, e.clientX)));
      } else if (dragTarget.current === "emaillist") {
        setEmailListWidth(Math.max(200, Math.min(600, e.clientX - categoryWidth)));
      } else if (dragTarget.current === "draft" && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDraftPanelHeight(Math.max(150, Math.min(rect.height - 200, rect.bottom - e.clientY)));
      }
    };
    const handleMouseUp = () => {
      dragTarget.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    const handleClick = () => setCategoryDropdownId(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("click", handleClick);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); window.removeEventListener("click", handleClick); };
  }, [categoryWidth]);

  const startDrag = (target: DragTarget) => {
    dragTarget.current = target;
    document.body.style.cursor = target === "draft" ? "row-resize" : "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const syncRes = await fetch("/api/emails/sync", { method: "POST" });
      const syncData = await syncRes.json();
      if (syncData.results) {
        const errors = syncData.results.filter((r: { success: boolean }) => !r.success).map((r: { email: string; error?: string }) => `${r.email}: ${r.error}`).join("\n");
        if (errors) setSyncError(errors);
        const totalFetched = syncData.results.reduce((s: number, r: { fetched: number }) => s + r.fetched, 0);
        if (totalFetched > 0) setSyncSuccess(`${totalFetched} neue E-Mails geladen`);
      }
      await fetchEmails();
    } catch { setSyncError("Netzwerkfehler"); }
    setSyncing(false);
  };

  const handleCategorize = async () => {
    setCategorizing(true);
    try { await fetch("/api/ai/batch-categorize", { method: "POST" }); await fetchEmails(); } catch { /* */ }
    setCategorizing(false);
  };

  const [loadingBody, setLoadingBody] = useState(false);

  const handleSelectEmail = async (email: EmailItem) => {
    setSelectedEmail(email);
    setReplyFromAccountId(email.accountId);
    selectedEmailIdRef.current = email.id;
    setAttachments([]);
    setSelectedTemplate(null);
    setLoadingBody(false);
    const saved = draftsRef.current[email.id];
    if (saved) {
      setAiDraft(saved.draft);
      setUserInstruction(saved.instruction);
    } else {
      setAiDraft(email.aiDraft || "");
      setUserInstruction("");
    }
    if (!email.isRead) {
      await fetch(`/api/emails/${email.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isRead: true }) });
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)));
    }
    // Load body on demand if empty
    if (!email.textBody) {
      setLoadingBody(true);
      try {
        const res = await fetch(`/api/emails/${email.id}/fetch-body`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          const updated = { ...email, isRead: true, textBody: data.textBody || "", htmlBody: data.htmlBody || "", hasAttachments: data.hasAttachments || false };
          setSelectedEmail(updated);
          setEmails((prev) => prev.map((e) => e.id === email.id ? updated : e));
          setAllEmails((prev) => prev.map((e) => e.id === email.id ? updated : e));
          if (data.hasAttachments) {
            const attRes = await fetch(`/api/emails/${email.id}/attachments`);
            if (attRes.ok) setAttachments(await attRes.json());
          }
        }
      } catch { /* */ }
      setLoadingBody(false);
    } else if (email.hasAttachments) {
      try {
        const res = await fetch(`/api/emails/${email.id}/attachments`);
        if (res.ok) setAttachments(await res.json());
      } catch { /* */ }
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedEmail) return;
    const emailId = selectedEmail.id;
    generatingRef.current[emailId] = true;
    setGeneratingForId(emailId);
    try {
      const payload: Record<string, string> = { emailId };
      const parts: string[] = [];
      if (selectedTemplate) parts.push(`VORLAGE: ${selectedTemplate.text}`);
      if (userInstruction.trim()) parts.push(userInstruction.trim());
      if (parts.length > 0) payload.userInstruction = parts.join("\n\nZUSAETZLICH: ");
      const res = await fetch("/api/ai/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        const data = await res.json();
        draftsRef.current[emailId] = { draft: data.draft, instruction: draftsRef.current[emailId]?.instruction || "" };
        if (selectedEmailIdRef.current === emailId) {
          setAiDraft(data.draft);
        }
      }
    } catch { /* */ }
    delete generatingRef.current[emailId];
    setGeneratingForId((prev) => (prev === emailId ? null : prev));
  };

  const handleDeleteEmail = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/emails/${emailId}`, { method: "DELETE" });
      setEmails((prev) => prev.filter((em) => em.id !== emailId));
      delete draftsRef.current[emailId];
      if (selectedEmail?.id === emailId) { setSelectedEmail(null); selectedEmailIdRef.current = null; setAiDraft(""); }
    } catch { /* */ }
  };

  const handleMoveCategory = async (e: React.MouseEvent, emailId: string, newCategory: string) => {
    e.stopPropagation();
    setCategoryDropdownId(null);
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      setEmails((prev) => prev.map((em) => em.id === emailId ? { ...em, category: newCategory } : em));
      if (selectedEmail?.id === emailId) setSelectedEmail((prev) => prev ? { ...prev, category: newCategory } : prev);
    } catch { /* */ }
  };

  const toggleCategoryDropdown = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setCategoryDropdownId((prev) => prev === emailId ? null : emailId);
  };

  // Queue for background categorization
  const categorizingQueue = useRef<string[]>([]);
  const isProcessingQueue = useRef(false);
  const [categorizingIds, setCategorizingIds] = useState<Set<string>>(new Set());

  const processCategorizationQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;

    while (categorizingQueue.current.length > 0) {
      const emailId = categorizingQueue.current.shift()!;
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailId }),
        });
        if (res.ok) {
          const data = await res.json();
          const newCat = data.category || "allgemein";
          setEmails((prev) => prev.map((em) => em.id === emailId ? { ...em, category: newCat, priority: data.priority, aiSummary: data.aiSummary } : em));
          setAllEmails((prev) => prev.map((em) => em.id === emailId ? { ...em, category: newCat, priority: data.priority, aiSummary: data.aiSummary } : em));
        }
      } catch { /* */ }
      setCategorizingIds((prev) => { const next = new Set(prev); next.delete(emailId); return next; });
    }

    isProcessingQueue.current = false;
  }, []);

  const handleMarkDone = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setCategoryDropdownId(null);

    // Sofort als erledigt markieren + aus TODO entfernen
    const email = allEmails.find((em) => em.id === emailId);
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: true }),
      });
    } catch { /* */ }

    setEmails((prev) => {
      const updated = prev.map((em) => em.id === emailId ? { ...em, isAnswered: true } : em);
      return selectedCategory === TODO_KEY ? updated.filter((em) => !em.isAnswered) : updated;
    });
    setAllEmails((prev) => prev.map((em) => em.id === emailId ? { ...em, isAnswered: true } : em));
    if (selectedEmail?.id === emailId) setSelectedEmail((prev) => prev ? { ...prev, isAnswered: true } : prev);

    // Wenn keine Kategorie: KI-Kategorisierung in die Queue
    if (!email?.category) {
      setCategorizingIds((prev) => new Set(prev).add(emailId));
      categorizingQueue.current.push(emailId);
      processCategorizationQueue();
    }
  };

  const handleMarkUndone = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setCategoryDropdownId(null);
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: false }),
      });
      setEmails((prev) => prev.map((em) => em.id === emailId ? { ...em, isAnswered: false } : em));
      setAllEmails((prev) => prev.map((em) => em.id === emailId ? { ...em, isAnswered: false } : em));
      if (selectedEmail?.id === emailId) setSelectedEmail((prev) => prev ? { ...prev, isAnswered: false } : prev);
    } catch { /* */ }
  };

  const [markingAllDone, setMarkingAllDone] = useState(false);

  const handleMarkAllDone = async () => {
    const todoEmails = allEmails.filter((e) => !e.isAnswered);
    if (todoEmails.length === 0) return;
    setMarkingAllDone(true);

    // Mark all as done immediately in UI
    setAllEmails((prev) => prev.map((em) => ({ ...em, isAnswered: true })));
    if (selectedCategory === TODO_KEY) setEmails([]);

    // Patch all in DB
    for (const em of todoEmails) {
      try {
        await fetch(`/api/emails/${em.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAnswered: true }),
        });
      } catch { /* */ }
    }

    // Queue uncategorized for KI categorization
    const uncategorized = todoEmails.filter((e) => !e.category);
    for (const em of uncategorized) {
      setCategorizingIds((prev) => new Set(prev).add(em.id));
      categorizingQueue.current.push(em.id);
    }
    if (uncategorized.length > 0) processCategorizationQueue();

    setMarkingAllDone(false);
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !aiDraft.trim()) return;
    setSendingReply(true);
    setSendError(null);
    setSendSuccess(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: replyFromAccountId || selectedEmail.accountId, to: selectedEmail.fromAddress, subject: `Re: ${selectedEmail.subject}`, text: aiDraft, inReplyTo: selectedEmail.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSendError(data.details || data.error || "Senden fehlgeschlagen");
      } else {
        const patchRes = await fetch(`/api/emails/${selectedEmail.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isAnswered: true }),
        });
        const patchOk = patchRes.ok;
        if (!patchOk) {
          setSendSuccess(`Gesendet an ${selectedEmail.fromAddress}. Hinweis: Als „beantwortet“ konnte nicht gespeichert werden – bitte ggf. ueber Kategorie-Menue als erledigt markieren.`);
        } else {
          setSendSuccess(`Gesendet an ${selectedEmail.fromAddress}`);
        }
        setTimeout(() => setSendSuccess(null), patchOk ? 4000 : 8000);
        delete draftsRef.current[selectedEmail.id];
        setAiDraft("");
        setUserInstruction("");
        setEmails((prev) => {
          const updated = prev.map((e) => (e.id === selectedEmail.id ? { ...e, isAnswered: true } : e));
          return selectedCategory === TODO_KEY ? updated.filter((e) => !e.isAnswered) : updated;
        });
        setAllEmails((prev) => prev.map((e) => (e.id === selectedEmail.id ? { ...e, isAnswered: true } : e)));
        setSelectedEmail({ ...selectedEmail, isAnswered: true });
      }
    } catch {
      setSendError("Netzwerkfehler beim Senden");
    }
    setSendingReply(false);
  };

  // Reservation popup
  const [showResPopup, setShowResPopup] = useState(false);
  const [resForm, setResForm] = useState({ guestName: "", guestEmail: "", date: "", dateDisplay: "", time: "09:30", persons: 2, notes: "", pushToSupabase: true });
  const [resLoading, setResLoading] = useState(false);
  const [extractingRes, setExtractingRes] = useState(false);

  const handleOpenResPopup = async () => {
    if (!selectedEmail) return;
    setShowResPopup(true);
    setResForm({
      guestName: selectedEmail.fromName || "",
      guestEmail: selectedEmail.fromAddress || "",
      date: "",
      dateDisplay: "",
      time: "09:30",
      persons: 2,
      notes: "",
      pushToSupabase: true,
    });
    setExtractingRes(true);
    try {
      const res = await fetch("/api/ai/extract-reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: selectedEmail.id, draftText: aiDraft }),
      });
      if (res.ok) {
        const data = await res.json();
        const date = data.date || "";
        const time = (data.timeFrom || "09:30").replace(/^(\d{1,2}):(\d{2})/, (_match: string, h: string, m: string) => `${h.padStart(2, "0")}:${m}`);
        setResForm((prev) => ({
          ...prev,
          guestName: data.guestName || prev.guestName,
          guestEmail: data.guestEmail || prev.guestEmail,
          date,
          dateDisplay: date ? toDDMMYYYY(date) : "",
          time: time || prev.time,
          persons: data.persons ?? prev.persons,
          notes: data.specialRequests || prev.notes,
        }));
      }
    } catch { /* */ }
    setExtractingRes(false);
  };

  const handleConfirmReservation = async () => {
    if (!selectedEmail) return;
    const dateToSend = resForm.date || fromDDMMYYYY(resForm.dateDisplay);
    if (!dateToSend || !resForm.time) return;
    setResLoading(true);
    try {
      await fetch("/api/reservations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedEmail.accountId,
          guestName: resForm.guestName,
          guestEmail: resForm.guestEmail,
          date: dateToSend,
          time: resForm.time,
          persons: resForm.persons,
          message: resForm.notes,
          status: "confirmed",
          sourceEmailId: selectedEmail.id,
          pushToSupabase: resForm.pushToSupabase,
        }),
      });
      setShowResPopup(false);
    } catch { /* */ }
    setResLoading(false);
  };

  // Veranstaltung (Event) popup
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventForm, setEventForm] = useState({
    eventName: "",
    eventType: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    date: "",
    dateDisplay: "",
    timeFrom: "09:30",
    timeTo: "18:00",
    persons: 10,
    location: "",
    notes: "",
    pushToSupabase: true,
  });
  const [eventLoading, setEventLoading] = useState(false);
  const [extractingEvent, setExtractingEvent] = useState(false);

  const handleOpenEventPopup = async () => {
    if (!selectedEmail) return;
    setShowEventPopup(true);
    setEventForm({
      eventName: "",
      eventType: "",
      contactName: selectedEmail.fromName || "",
      contactEmail: selectedEmail.fromAddress || "",
      contactPhone: "",
      date: "",
      dateDisplay: "",
      timeFrom: "09:30",
      timeTo: "18:00",
      persons: 10,
      location: "",
      notes: "",
      pushToSupabase: true,
    });
    setExtractingEvent(true);
    try {
      const res = await fetch("/api/ai/extract-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: selectedEmail.id, draftText: aiDraft }),
      });
      if (res.ok) {
        const data = await res.json();
        const date = data.date || "";
        const timeFrom = (data.timeFrom || "09:30").replace(/^(\d{1,2}):(\d{2})/, (_m: string, h: string, min: string) => `${h.padStart(2, "0")}:${min}`);
        const timeTo = (data.timeTo || "18:00").replace(/^(\d{1,2}):(\d{2})/, (_m: string, h: string, min: string) => `${h.padStart(2, "0")}:${min}`);
        setEventForm((prev) => ({
          ...prev,
          eventName: data.eventName || prev.eventName,
          eventType: data.eventType || prev.eventType,
          contactName: data.contactName || prev.contactName,
          contactEmail: data.contactEmail || prev.contactEmail,
          contactPhone: data.contactPhone || prev.contactPhone,
          date,
          dateDisplay: date ? toDDMMYYYY(date) : "",
          timeFrom: timeFrom || prev.timeFrom,
          timeTo: timeTo || prev.timeTo,
          persons: data.persons ?? prev.persons,
          location: data.location || prev.location,
          notes: data.notes || prev.notes,
        }));
      }
    } catch { /* */ }
    setExtractingEvent(false);
  };

  const handleConfirmEvent = async () => {
    if (!selectedEmail) return;
    const dateToSend = eventForm.date || fromDDMMYYYY(eventForm.dateDisplay);
    if (!dateToSend || !eventForm.timeFrom || !eventForm.contactName) return;
    setEventLoading(true);
    try {
      await fetch("/api/reservations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedEmail.accountId,
          guestName: eventForm.contactName,
          guestEmail: eventForm.contactEmail,
          guestPhone: eventForm.contactPhone,
          date: dateToSend,
          time: eventForm.timeFrom,
          timeTo: eventForm.timeTo || null,
          persons: eventForm.persons,
          type: "event",
          eventType: eventForm.eventType || null,
          message: [eventForm.eventName, eventForm.location, eventForm.notes].filter(Boolean).join("\n"),
          status: "confirmed",
          sourceEmailId: selectedEmail.id,
          pushToSupabase: eventForm.pushToSupabase,
        }),
      });
      setShowEventPopup(false);
    } catch { /* */ }
    setEventLoading(false);
  };

  const isGeneratingCurrent = selectedEmail ? !!generatingRef.current[selectedEmail.id] : false;
  const isGeneratingAny = Object.keys(generatingRef.current).length > 0;
  const uncategorizedCount = allEmails.filter((e) => !e.category).length;

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (isToday) return time;
    if (isYesterday) return `Gestern ${time}`;
    return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} ${time}`;
  };

  return (
    <div className="flex h-screen">
      {/* Category Sidebar */}
      <div className="border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-2 overflow-y-auto shrink-0" style={{ width: categoryWidth }}>
        {accounts.length > 1 && (
          <div className="mb-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">Accounts</p>
            <button onClick={() => setSelectedAccount(null)} className={cn("mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm", !selectedAccount ? "bg-[hsl(var(--accent))] font-medium" : "hover:bg-[hsl(var(--accent))]")}>Alle Accounts</button>
            {accounts.map((acc) => (
              <button key={acc.id} onClick={() => setSelectedAccount(acc.id)} className={cn("mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm", selectedAccount === acc.id ? "bg-[hsl(var(--accent))] font-medium" : "hover:bg-[hsl(var(--accent))]")}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                <span className="truncate">{acc.name}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mb-2 px-2 text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))]">Kategorien</p>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = cat.key === null
            ? allEmails.length
            : cat.key === TODO_KEY
              ? allEmails.filter((e) => !e.isAnswered).length
              : allEmails.filter((e) => e.category === cat.key).length;
          return (
            <button key={cat.key ?? "all"} onClick={() => setSelectedCategory(cat.key)} className={cn(
              "mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              selectedCategory === cat.key ? "bg-[hsl(var(--accent))] font-medium" : "hover:bg-[hsl(var(--accent))]",
              cat.key === "todo" && count > 0 && "text-orange-600 dark:text-orange-400 font-semibold"
            )}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">{cat.label}</span>
              {count > 0 && (
                <span className={cn("text-xs", cat.key === "todo" ? "bg-orange-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold" : "text-[hsl(var(--muted-foreground))]")}>{count}</span>
              )}
            </button>
          );
        })}
        {uncategorizedCount > 0 && (
          <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={handleCategorize} disabled={categorizing}>
            <Sparkles className={cn("h-3 w-3 mr-1.5", categorizing && "animate-spin")} />
            {categorizing ? "KI sortiert..." : `${uncategorizedCount} sortieren`}
          </Button>
        )}
        {allEmails.filter((e) => !e.isAnswered).length > 0 && (
          <Button variant="outline" size="sm" className="w-full mt-2 text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={handleMarkAllDone} disabled={markingAllDone}>
            <CheckSquare className={cn("h-3 w-3 mr-1.5", markingAllDone && "animate-pulse")} />
            {markingAllDone ? "Wird erledigt..." : "Alle erledigt"}
          </Button>
        )}
      </div>

      <div onMouseDown={() => startDrag("category")} className="w-1 cursor-col-resize bg-transparent hover:bg-[hsl(var(--primary))]/20 transition-colors shrink-0" />

      {/* Email List */}
      <div className="border-r border-[hsl(var(--border))] flex flex-col shrink-0" style={{ width: emailListWidth }}>
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-3 py-2">
          <h2 className="text-sm font-semibold">{searchActive ? "Suchergebnisse" : CATEGORIES.find((c) => c.key === selectedCategory)?.label || "Posteingang"}</h2>
          <div className="flex items-center gap-1">
            {isGeneratingAny && <span title="KI generiert Entwurf..."><Loader2 className="h-3.5 w-3.5 animate-spin text-[hsl(var(--primary))]" /></span>}
            <Button variant="ghost" size="icon" onClick={() => setSearchActive(!searchActive)} title="Suchen">
              <SearchIcon className={cn("h-4 w-4", searchActive && "text-[hsl(var(--primary))]")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSync} disabled={syncing} title="E-Mails vom Server abrufen">
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            </Button>
          </div>
        </div>
        {searchActive && (
          <div className="border-b border-[hsl(var(--border))] px-3 py-2 flex items-center gap-2">
            <SearchIcon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); setSearchActive(false); } }}
              placeholder="Suche in Absender, Betreff, Text..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); }} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0">{emails.length} Treffer</span>
          </div>
        )}

        {syncError && (
          <div className="border-b border-red-200 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            <div className="font-medium mb-0.5">Sync-Fehler:</div>
            <div className="whitespace-pre-wrap">{syncError}</div>
            <button onClick={() => setSyncError(null)} className="mt-1 underline text-[10px] opacity-70 hover:opacity-100">Schliessen</button>
          </div>
        )}
        {syncSuccess && (
          <div className="border-b border-green-200 bg-green-50 dark:bg-green-950/30 px-3 py-2 text-xs text-green-700 dark:text-green-400">
            {syncSuccess}
            <button onClick={() => setSyncSuccess(null)} className="ml-2 underline text-[10px] opacity-70 hover:opacity-100">OK</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-[hsl(var(--muted-foreground))]" /></div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
              <Mail className="h-10 w-10 mb-3 opacity-30" /><p className="text-sm">Keine E-Mails</p>
            </div>
          ) : (
            emails.map((email) => {
              const hasDraft = !!(draftsRef.current[email.id]?.draft || email.aiDraft);
              const isGen = !!generatingRef.current[email.id];
              return (
                <div key={email.id} onClick={() => handleSelectEmail(email)} className={cn("group w-full border-b border-[hsl(var(--border))] px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--accent))]/50 cursor-pointer", selectedEmail?.id === email.id && "bg-[hsl(var(--accent))]", !email.isRead && "bg-[hsl(var(--primary))]/5")}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {email.priority && <span className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_COLORS[email.priority])} />}
                    <span className={cn("text-sm truncate flex-1", !email.isRead && "font-semibold")}>{email.fromName || email.fromAddress}</span>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] shrink-0 group-hover:hidden">{formatDateTime(email.date)}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <div className="relative">
                        <button onClick={(e) => toggleCategoryDropdown(e, email.id)} className="rounded p-0.5 hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors" title="Kategorie aendern">
                          <Tag className="h-3.5 w-3.5" />
                        </button>
                        {categoryDropdownId === email.id && (
                          <div className="absolute right-0 top-6 z-50 w-48 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-lg py-1" onClick={(ev) => ev.stopPropagation()}>
                            {!email.isAnswered ? (
                              <button onClick={(e) => handleMarkDone(e, email.id)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors border-b border-[hsl(var(--border))]">
                                <CheckSquare className="h-3.5 w-3.5" />
                                Erledigt
                              </button>
                            ) : (
                              <button onClick={(e) => handleMarkUndone(e, email.id)} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors border-b border-[hsl(var(--border))]">
                                <CheckSquare className="h-3.5 w-3.5" />
                                Zurueck zu TODO
                              </button>
                            )}
                            <p className="px-3 py-1 text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-semibold">Kategorie</p>
                            {REAL_CATEGORIES.map((cat) => {
                              const CatIcon = cat.icon;
                              const isActive = email.category === cat.key;
                              return (
                                <button key={cat.key} onClick={(e) => handleMoveCategory(e, email.id, cat.key!)} className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[hsl(var(--accent))] transition-colors", isActive && "font-semibold text-[hsl(var(--primary))]")}>
                                  <CatIcon className="h-3 w-3 shrink-0" />
                                  {cat.label}
                                  {isActive && <span className="ml-auto text-[10px]">●</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button onClick={(e) => handleDeleteEmail(e, email.id)} className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-950/50 text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors" title="Loeschen">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className={cn("text-sm truncate", !email.isRead ? "font-medium" : "text-[hsl(var(--muted-foreground))]")}>{email.subject}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {email.isAnswered && <CheckSquare className="h-3 w-3 text-green-500" />}
                    {email.hasAttachments && <Paperclip className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />}
                    {categorizingIds.has(email.id) ? (
                      <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]"><Loader2 className="h-2.5 w-2.5 animate-spin" />sortiert...</span>
                    ) : email.category ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{email.category}</Badge>
                    ) : null}
                    {isGen && <Loader2 className="h-3 w-3 animate-spin text-[hsl(var(--primary))]" />}
                    {!isGen && hasDraft && <Bot className="h-3 w-3 text-[hsl(var(--primary))]" />}
                    {email.isStarred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div onMouseDown={() => startDrag("emaillist")} className="w-1 cursor-col-resize bg-transparent hover:bg-[hsl(var(--primary))]/20 transition-colors shrink-0" />

      {/* Email Detail + AI Draft */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedEmail ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-xl font-semibold">{selectedEmail.subject}</h1>
                  <div className="flex items-center gap-2">
                    {selectedEmail.category && <Badge variant="secondary">{selectedEmail.category}</Badge>}
                    {selectedEmail.priority && <Badge className={cn("text-white", selectedEmail.priority === "hoch" ? "bg-red-500" : selectedEmail.priority === "mittel" ? "bg-orange-400" : "bg-green-500")}>{selectedEmail.priority}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <span className="font-medium text-[hsl(var(--foreground))]">{selectedEmail.fromName || selectedEmail.fromAddress}</span>
                  {selectedEmail.fromName && <span>&lt;{selectedEmail.fromAddress}&gt;</span>}
                  <span>&middot;</span>
                  <span>{new Date(selectedEmail.date).toLocaleString("de-DE")}</span>
                </div>
                {selectedEmail.aiSummary && (
                  <div className="mt-4 rounded-md bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="h-4 w-4 text-[hsl(var(--primary))]" />
                      <span className="text-xs font-semibold text-[hsl(var(--primary))]">KI-Zusammenfassung</span>
                    </div>
                    <p className="text-sm">{selectedEmail.aiSummary}</p>
                  </div>
                )}
              </div>
              {loadingBody ? (
                <div className="flex items-center gap-2 py-8 text-[hsl(var(--muted-foreground))]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Nachricht wird geladen...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedEmail.textBody}</div>
              )}

              {attachments.length > 0 && (
                <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
                  <p className="text-xs font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    {attachments.length} Anhang{attachments.length !== 1 ? "e" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att) => {
                      const lower = att.filename.toLowerCase();
                      const isPdf = lower.endsWith(".pdf");
                      const downloadUrl = `${att.downloadUrl}?download=1`;
                      return (
                        <div
                          key={att.filename}
                          className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))] transition-colors"
                        >
                          {isPdf ? (
                            <a
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 min-w-0"
                              title="PDF im neuen Tab oeffnen"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                              <span className="truncate max-w-[220px]">{att.filename}</span>
                              <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                                {att.size > 1048576 ? `${(att.size / 1048576).toFixed(1)} MB` : `${Math.round(att.size / 1024)} KB`}
                              </span>
                            </a>
                          ) : (
                            <a
                              href={downloadUrl}
                              download={att.filename}
                              className="flex items-center gap-2 min-w-0"
                              title="Datei herunterladen"
                            >
                              <Paperclip className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] shrink-0" />
                              <span className="truncate max-w-[220px]">{att.filename}</span>
                              <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                                {att.size > 1048576 ? `${(att.size / 1048576).toFixed(1)} MB` : `${Math.round(att.size / 1024)} KB`}
                              </span>
                              <Download className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                            </a>
                          )}
                          {isPdf && (
                            <a
                              href={downloadUrl}
                              download={att.filename}
                              className="ml-1 inline-flex items-center rounded-md px-1.5 py-1 hover:bg-[hsl(var(--accent))]"
                              title="Herunterladen"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div onMouseDown={() => startDrag("draft")} className="h-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/50 cursor-row-resize flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors shrink-0">
              <GripHorizontal className="h-3 w-3 text-[hsl(var(--muted-foreground))]/50" />
            </div>

            <div className="bg-[hsl(var(--muted))]/30 p-4 flex flex-col shrink-0 overflow-hidden" style={{ height: draftPanelHeight }}>
              <div className="flex items-center gap-2 mb-2 shrink-0 flex-wrap">
                {accounts.length > 1 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Von:</span>
                    <select
                      value={replyFromAccountId || selectedEmail.accountId}
                      onChange={(e) => setReplyFromAccountId(e.target.value)}
                      className="h-9 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 pr-7 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] appearance-none cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
                      title="Absenderadresse fuer die Antwort waehlen"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.email}</option>
                      ))}
                    </select>
                  </div>
                )}
                {quickTemplates.length > 0 && (
                  <div className="relative shrink-0">
                    <select
                      value={selectedTemplate?.label || ""}
                      onChange={(e) => {
                        if (!e.target.value) { setSelectedTemplate(null); return; }
                        const qt = quickTemplates.find((t) => t.label === e.target.value);
                        setSelectedTemplate(qt || null);
                      }}
                      className={cn(
                        "h-9 rounded-md border px-2 pr-7 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] appearance-none cursor-pointer",
                        selectedTemplate
                          ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))] font-medium"
                          : "border-[hsl(var(--input))] bg-[hsl(var(--background))]"
                      )}
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
                    >
                      <option value="">Vorlage...</option>
                      {quickTemplates.map((qt, i) => (
                        <option key={i} value={qt.label}>{qt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <input
                  value={userInstruction}
                  onChange={(e) => setUserInstruction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerateDraft(); } }}
                  placeholder={selectedTemplate ? `+ Zusatz zu "${selectedTemplate.label}"...` : "Kurzanweisung: z.B. 'ja passt, bestätigen'..."}
                  className="flex-1 h-9 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                />
                <Button variant="outline" size="sm" onClick={handleGenerateDraft} disabled={isGeneratingCurrent} className="shrink-0">
                  {isGeneratingCurrent ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5 mr-1.5" />}
                  {isGeneratingCurrent ? "Generiere..." : aiDraft ? "Neu" : "Entwurf"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenResPopup} className="shrink-0" title="Reservierung aus dieser E-Mail eintragen">
                  <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                  Reservierung
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenEventPopup} className="shrink-0" title="Veranstaltung aus E-Mail eintragen">
                  <PartyPopper className="h-3.5 w-3.5 mr-1.5" />
                  Veranstaltung
                </Button>
                <Button size="sm" onClick={handleSendReply} disabled={!aiDraft.trim() || sendingReply} className="shrink-0">
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Senden
                </Button>
              </div>
              {sendError && (
                <div className="mb-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400 shrink-0">
                  Sende-Fehler: {sendError}
                  <button onClick={() => setSendError(null)} className="ml-2 underline">OK</button>
                </div>
              )}
              {sendSuccess && (
                <div className="mb-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-400 shrink-0">
                  {sendSuccess}
                </div>
              )}
              <textarea
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                placeholder="Klicke auf 'Entwurf generieren' oder schreibe deine Antwort..."
                className="flex-1 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] min-h-0"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
            <InboxIcon className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Waehle eine E-Mail</p>
            <p className="text-sm mt-1">oder klicke auf Refresh um E-Mails abzurufen</p>
          </div>
        )}
      </div>

      {/* Reservation Popup Modal */}
      {showResPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-start pl-8 bg-black/30" onClick={() => setShowResPopup(false)}>
          <div className="bg-[hsl(var(--background))] rounded-lg shadow-xl border border-[hsl(var(--border))] w-[480px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarPlus className="h-5 w-5 text-[hsl(var(--primary))]" />
                Reservierung eintragen
              </h3>
              <button onClick={() => setShowResPopup(false)} className="rounded-md p-1 hover:bg-[hsl(var(--accent))]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {extractingRes && (
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--primary))]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  KI extrahiert Reservierungsdaten aus der E-Mail...
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Gast-Name</Label>
                  <Input value={resForm.guestName} onChange={(e) => setResForm({ ...resForm, guestName: e.target.value })} className="h-9" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">E-Mail</Label>
                  <Input value={resForm.guestEmail} onChange={(e) => setResForm({ ...resForm, guestEmail: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Datum (TT.MM.JJJJ)</Label>
                  <Input
                    type="text"
                    placeholder="TT.MM.JJJJ"
                    value={resForm.dateDisplay}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = fromDDMMYYYY(v);
                      setResForm({ ...resForm, dateDisplay: v, date: parsed });
                    }}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Uhrzeit (24h)</Label>
                  <TimeInput value={resForm.time} onChange={(e) => setResForm({ ...resForm, time: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Personen</Label>
                  <Input type="number" min={1} value={resForm.persons} onChange={(e) => setResForm({ ...resForm, persons: parseInt(e.target.value) || 1 })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Notizen</Label>
                  <Input value={resForm.notes} onChange={(e) => setResForm({ ...resForm, notes: e.target.value })} placeholder="Sonderwuensche..." className="h-9" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Auch auf der Website eintragen</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Reservierung in Supabase / Online-Tool speichern</p>
                </div>
                <Switch checked={resForm.pushToSupabase} onCheckedChange={(v) => setResForm({ ...resForm, pushToSupabase: v })} />
              </div>

              <div className="rounded-md bg-[hsl(var(--muted))]/50 p-3 text-xs text-[hsl(var(--muted-foreground))]">
                Nur die Reservierung wird eingetragen. Die E-Mail kannst du danach separat ueber den Senden-Button verschicken.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setShowResPopup(false)}>Abbrechen</Button>
              <Button onClick={handleConfirmReservation} disabled={resLoading || !resForm.guestName || (!resForm.date && !fromDDMMYYYY(resForm.dateDisplay)) || !resForm.time}>
                {resLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
                {resLoading ? "Wird eingetragen..." : "Reservierung eintragen"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Veranstaltung (Event) Popup Modal */}
      {showEventPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-start pl-8 bg-black/30" onClick={() => setShowEventPopup(false)}>
          <div className="bg-[hsl(var(--background))] rounded-lg shadow-xl border border-[hsl(var(--border))] w-[480px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h3 className="font-semibold flex items-center gap-2">
                <PartyPopper className="h-5 w-5 text-[hsl(var(--primary))]" />
                Veranstaltung eintragen
              </h3>
              <button onClick={() => setShowEventPopup(false)} className="rounded-md p-1 hover:bg-[hsl(var(--accent))]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {extractingEvent && (
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--primary))]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  KI extrahiert Veranstaltungsdaten aus der E-Mail...
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Name der Veranstaltung</Label>
                  <Input value={eventForm.eventName} onChange={(e) => setEventForm({ ...eventForm, eventName: e.target.value })} className="h-9" placeholder="z.B. Firmenfeier, Geburtstag" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Art (z.B. Geburtstag, Firmenfeier)</Label>
                  <Input value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })} className="h-9" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Ansprechpartner</Label>
                  <Input value={eventForm.contactName} onChange={(e) => setEventForm({ ...eventForm, contactName: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">E-Mail</Label>
                  <Input value={eventForm.contactEmail} onChange={(e) => setEventForm({ ...eventForm, contactEmail: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Telefon</Label>
                  <Input value={eventForm.contactPhone} onChange={(e) => setEventForm({ ...eventForm, contactPhone: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Datum (TT.MM.JJJJ)</Label>
                  <Input
                    type="text"
                    placeholder="TT.MM.JJJJ"
                    value={eventForm.dateDisplay}
                    onChange={(e) => {
                      const v = e.target.value;
                      const parsed = fromDDMMYYYY(v);
                      setEventForm({ ...eventForm, dateDisplay: v, date: parsed });
                    }}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Von (24h)</Label>
                  <TimeInput value={eventForm.timeFrom} onChange={(e) => setEventForm({ ...eventForm, timeFrom: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bis (24h)</Label>
                  <TimeInput value={eventForm.timeTo} onChange={(e) => setEventForm({ ...eventForm, timeTo: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Personen</Label>
                  <Input type="number" min={1} value={eventForm.persons} onChange={(e) => setEventForm({ ...eventForm, persons: parseInt(e.target.value) || 1 })} className="h-9" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Ort / Bereich</Label>
                  <Input value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} className="h-9" placeholder="z.B. Saal, Garten" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">Notizen / Ablauf</Label>
                  <Textarea
                    value={eventForm.notes}
                    onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                    placeholder={"Ablauf strukturiert mit Absaetzen:\n\nBudget: X Euro\n\nAblauf:\n- 09:30 Empfang\n- 10:00 Beginn"}
                    className="min-h-[120px] resize-y text-sm whitespace-pre-wrap leading-relaxed"
                    rows={6}
                  />
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Tipp: Leerzeilen fuer Absaetze, Striche (-) fuer Aufzaehlungen – so ist der Ablauf fuer Kellner gut lesbar.</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Auch auf der Website eintragen</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Veranstaltung in Supabase / Online-Tool speichern</p>
                </div>
                <Switch checked={eventForm.pushToSupabase} onCheckedChange={(v) => setEventForm({ ...eventForm, pushToSupabase: v })} />
              </div>

              <div className="rounded-md bg-[hsl(var(--muted))]/50 p-3 text-xs text-[hsl(var(--muted-foreground))]">
                Die Veranstaltung wird als Reservierung (Typ Event) eingetragen. Die E-Mail kannst du danach separat versenden.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setShowEventPopup(false)}>Abbrechen</Button>
              <Button onClick={handleConfirmEvent} disabled={eventLoading || !eventForm.contactName || (!eventForm.date && !fromDDMMYYYY(eventForm.dateDisplay)) || !eventForm.timeFrom}>
                {eventLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PartyPopper className="h-4 w-4 mr-2" />}
                {eventLoading ? "Wird eingetragen..." : "Veranstaltung eintragen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
