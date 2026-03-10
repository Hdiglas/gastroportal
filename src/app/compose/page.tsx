"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Send, Bot, RotateCw } from "lucide-react";

interface Account {
  id: string;
  name: string;
  email: string;
  color: string;
}

export default function ComposePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !accountId) setAccountId(data[0].id);
      }
    } catch { /* empty */ }
  }, [accountId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSend = async () => {
    if (!accountId || !to || !subject) return;
    setSending(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, to, subject, text: body }),
      });
      if (res.ok) {
        setSuccess(true);
        setTo("");
        setSubject("");
        setBody("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Fehler beim Senden");
      }
    } catch {
      setError("Netzwerkfehler");
    }
    setSending(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !accountId) return;
    setGeneratingAi(true);
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, prompt: aiPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setBody(data.content || "");
      }
    } catch { /* empty */ }
    setGeneratingAi(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Neue E-Mail</h1>

      {success && (
        <div className="mb-4 rounded-md bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-700">
          E-Mail erfolgreich gesendet!
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Absender-Account</Label>
            <Select
              options={accounts.map((a) => ({ value: a.id, label: `${a.name} <${a.email}>` }))}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>An</Label>
            <Input
              type="email"
              placeholder="empfaenger@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Betreff</Label>
            <Input
              placeholder="Betreff eingeben..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Nachricht</Label>
            <Textarea
              placeholder="Deine Nachricht..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !to || !subject || !accountId}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Wird gesendet..." : "Senden"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-[hsl(var(--primary))]" />
            KI-Assistent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Was soll die KI schreiben?</Label>
            <Textarea
              placeholder="z.B.: Bestaetige eine Reservierung fuer 6 Personen am Samstag um 19 Uhr..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleAiGenerate}
            disabled={generatingAi || !aiPrompt.trim()}
          >
            <RotateCw className={`h-4 w-4 mr-2 ${generatingAi ? "animate-spin" : ""}`} />
            {generatingAi ? "Generiere..." : "E-Mail generieren"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
