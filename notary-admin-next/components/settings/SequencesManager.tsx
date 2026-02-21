"use client";

import { useState, useMemo } from "react";
import {
  useSequences,
  AutomationSequence,
  AutomationStep,
} from "@/hooks/useSequences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TRIGGER_EVENTS = [
  { value: "submission_created", label: "Soumission créée" },
  { value: "payment_failed", label: "Paiement échoué" },
  { value: "document_uploaded", label: "Document uploadé" },
  { value: "appointment_scheduled", label: "Rendez-vous planifié" },
];

const TRIGGER_STATUSES = [
  { value: "pending_payment", label: "En attente de paiement" },
  { value: "pending_documents", label: "En attente de documents" },
  { value: "pending_review", label: "En cours de révision" },
  { value: "confirmed", label: "Confirmé" },
];

const DELAY_UNITS: { value: "minutes" | "hours" | "days"; label: string }[] = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Heures" },
  { value: "days", label: "Jours" },
];

const TEMPLATE_VARIABLES = [
  { key: "{{first_name}}", desc: "Prénom du client" },
  { key: "{{last_name}}", desc: "Nom du client" },
  { key: "{{email}}", desc: "Email du client" },
  { key: "{{form_link}}", desc: "Lien vers le formulaire" },
  { key: "{{support_email}}", desc: "Email de support" },
  { key: "{{company_name}}", desc: "Nom de l'entreprise" },
];

function formatDelay(value: number, unit: string) {
  const labels: Record<string, [string, string]> = {
    minutes: ["minute", "minutes"],
    hours: ["heure", "heures"],
    days: ["jour", "jours"],
  };
  const [s, p] = labels[unit] || [unit, unit];
  return `${value} ${value <= 1 ? s : p}`;
}

function formatWindow(start: number | null, end: number | null) {
  if (start === null && end === null) return null;
  return `${start ?? 0}h - ${end ?? 24}h`;
}

export default function SequencesManager() {
  const {
    sequences,
    loading,
    error,
    createSequence,
    updateSequence,
    deleteSequence,
    createStep,
    updateStep,
    deleteStep,
  } = useSequences();

  const [editingSequence, setEditingSequence] =
    useState<AutomationSequence | null>(null);
  const [showNewSequence, setShowNewSequence] = useState(false);
  const [showNewStep, setShowNewStep] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<{
    sequenceId: string;
    step: AutomationStep;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const [seqForm, setSeqForm] = useState({
    name: "",
    description: "",
    trigger_event: "submission_created",
    trigger_status: "pending_payment",
    channel: "email" as "email" | "sms",
  });

  const defaultStepForm = {
    delay_value: 1,
    delay_unit: "hours" as "minutes" | "hours" | "days",
    send_window_start: "" as string | number,
    send_window_end: "" as string | number,
    template_key: "",
    subject: "",
    message_body: "",
    html_body: "",
  };

  const [stepForm, setStepForm] = useState(defaultStepForm);

  const handleCreateSequence = async () => {
    setSaving(true);
    try {
      await createSequence(seqForm);
      setShowNewSequence(false);
      setSeqForm({
        name: "",
        description: "",
        trigger_event: "submission_created",
        trigger_status: "pending_payment",
        channel: "email",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSequence = async (seq: AutomationSequence) => {
    await updateSequence(seq.id, { is_active: !seq.is_active });
  };

  const handleDeleteSequence = async (seq: AutomationSequence) => {
    if (!confirm(`Supprimer la séquence "${seq.name}" et toutes ses étapes ?`))
      return;
    await deleteSequence(seq.id);
  };

  const openEditSequence = (seq: AutomationSequence) => {
    setSeqForm({
      name: seq.name,
      description: seq.description || "",
      trigger_event: seq.trigger_event,
      trigger_status: seq.trigger_status || "",
      channel: seq.channel,
    });
    setEditingSequence(seq);
  };

  const handleUpdateSequence = async () => {
    if (!editingSequence) return;
    setSaving(true);
    try {
      await updateSequence(editingSequence.id, seqForm);
      setEditingSequence(null);
    } finally {
      setSaving(false);
    }
  };

  const openNewStep = (seqId: string) => {
    setStepForm({ ...defaultStepForm });
    setShowNewStep(seqId);
  };

  const handleCreateStep = async (seqId: string, channel: "email" | "sms") => {
    setSaving(true);
    try {
      await createStep(seqId, {
        step_order: 0,
        delay_value: stepForm.delay_value,
        delay_unit: stepForm.delay_unit,
        send_window_start:
          stepForm.send_window_start !== ""
            ? Number(stepForm.send_window_start)
            : null,
        send_window_end:
          stepForm.send_window_end !== ""
            ? Number(stepForm.send_window_end)
            : null,
        channel,
        template_key: stepForm.template_key,
        subject: stepForm.subject || null,
        message_body: stepForm.message_body || null,
        html_body: stepForm.html_body || null,
      });
      setShowNewStep(null);
    } finally {
      setSaving(false);
    }
  };

  const openEditStep = (sequenceId: string, step: AutomationStep) => {
    setStepForm({
      delay_value: step.delay_value,
      delay_unit: step.delay_unit,
      send_window_start: step.send_window_start ?? "",
      send_window_end: step.send_window_end ?? "",
      template_key: step.template_key,
      subject: step.subject || "",
      message_body: step.message_body || "",
      html_body: step.html_body || "",
    });
    setEditingStep({ sequenceId, step });
  };

  const handleUpdateStep = async () => {
    if (!editingStep) return;
    setSaving(true);
    try {
      await updateStep(editingStep.sequenceId, editingStep.step.id, {
        delay_value: stepForm.delay_value,
        delay_unit: stepForm.delay_unit,
        send_window_start:
          stepForm.send_window_start !== ""
            ? Number(stepForm.send_window_start)
            : null,
        send_window_end:
          stepForm.send_window_end !== ""
            ? Number(stepForm.send_window_end)
            : null,
        template_key: stepForm.template_key,
        subject: stepForm.subject || null,
        message_body: stepForm.message_body || null,
        html_body: stepForm.html_body || null,
      });
      setEditingStep(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStep = async (seqId: string, step: AutomationStep) => {
    await updateStep(seqId, step.id, { is_active: !step.is_active });
  };

  const handleDeleteStep = async (seqId: string, stepId: string) => {
    if (!confirm("Supprimer cette étape ?")) return;
    await deleteStep(seqId, stepId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  const currentStepChannel =
    showNewStep
      ? sequences.find((s) => s.id === showNewStep)?.channel || "email"
      : editingStep?.step.channel || "email";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Séquences d&apos;automatisation</h2>
          <p className="text-sm text-muted-foreground">
            Gérez les séquences d&apos;emails et SMS envoyés automatiquement
          </p>
        </div>
        <Button onClick={() => setShowNewSequence(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Nouvelle séquence
        </Button>
      </div>

      {sequences.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MailIcon className="mb-4 h-12 w-12 opacity-40" />
            <p>Aucune séquence configurée</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setShowNewSequence(true)}
            >
              Créer votre première séquence
            </Button>
          </CardContent>
        </Card>
      )}

      {sequences.map((seq) => (
        <Card key={seq.id} className={!seq.is_active ? "opacity-60" : ""}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{seq.name}</CardTitle>
                  <Badge
                    variant={seq.channel === "email" ? "default" : "secondary"}
                  >
                    {seq.channel === "email" ? "Email" : "SMS"}
                  </Badge>
                  <Badge
                    variant={seq.is_active ? "default" : "outline"}
                    className={
                      seq.is_active
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                        : ""
                    }
                  >
                    {seq.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {seq.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {seq.description}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>
                    Déclencheur :{" "}
                    {TRIGGER_EVENTS.find((t) => t.value === seq.trigger_event)
                      ?.label || seq.trigger_event}
                  </span>
                  {seq.trigger_status && (
                    <span>
                      Statut :{" "}
                      {TRIGGER_STATUSES.find(
                        (t) => t.value === seq.trigger_status
                      )?.label || seq.trigger_status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={seq.is_active}
                  onCheckedChange={() => handleToggleSequence(seq)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditSequence(seq)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteSequence(seq)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seq.steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    !step.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {formatDelay(step.delay_value, step.delay_unit)} après
                      </span>
                      {formatWindow(
                        step.send_window_start,
                        step.send_window_end
                      ) && (
                        <Badge variant="outline" className="text-xs">
                          {formatWindow(
                            step.send_window_start,
                            step.send_window_end
                          )}
                        </Badge>
                      )}
                      {step.subject && (
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          — {step.subject}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <code className="px-1.5 py-0.5 rounded bg-muted text-[11px]">
                        {step.template_key}
                      </code>
                      {seq.channel === "email" && step.html_body && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Template personnalisé
                        </Badge>
                      )}
                      {seq.channel === "sms" && step.message_body && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-violet-50 text-violet-700 border-violet-200"
                        >
                          Message personnalisé
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={step.is_active}
                      onCheckedChange={() => handleToggleStep(seq.id, step)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditStep(seq.id, step)}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteStep(seq.id, step.id)}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => openNewStep(seq.id)}
            >
              <PlusIcon className="mr-1 h-3.5 w-3.5" />
              Ajouter une étape
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Dialog: Nouvelle / Modifier séquence */}
      <Dialog
        open={showNewSequence || !!editingSequence}
        onOpenChange={(o) => {
          if (!o) {
            setShowNewSequence(false);
            setEditingSequence(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSequence ? "Modifier la séquence" : "Nouvelle séquence"}
            </DialogTitle>
          </DialogHeader>
          <SequenceForm form={seqForm} setForm={setSeqForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewSequence(false);
                setEditingSequence(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={editingSequence ? handleUpdateSequence : handleCreateSequence}
              disabled={saving || !seqForm.name}
            >
              {saving
                ? "Enregistrement..."
                : editingSequence
                ? "Enregistrer"
                : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nouvelle / Modifier étape — FULL EDITOR */}
      <Dialog
        open={!!showNewStep || !!editingStep}
        onOpenChange={(o) => {
          if (!o) {
            setShowNewStep(null);
            setEditingStep(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Modifier l'étape" : "Nouvelle étape"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="settings" className="mt-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
              <TabsTrigger value="content">Contenu</TabsTrigger>
              <TabsTrigger value="preview">Aperçu</TabsTrigger>
            </TabsList>

            {/* TAB 1: Paramètres */}
            <TabsContent value="settings" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Délai d&apos;envoi</Label>
                  <Input
                    type="number"
                    min={0}
                    value={stepForm.delay_value}
                    onChange={(e) =>
                      setStepForm((f) => ({
                        ...f,
                        delay_value: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Select
                    value={stepForm.delay_unit}
                    onValueChange={(v) =>
                      setStepForm((f) => ({
                        ...f,
                        delay_unit: v as "minutes" | "hours" | "days",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELAY_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fenêtre d&apos;envoi — début (heure)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="Aucune restriction"
                    value={stepForm.send_window_start}
                    onChange={(e) =>
                      setStepForm((f) => ({
                        ...f,
                        send_window_start:
                          e.target.value === "" ? "" : parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fenêtre d&apos;envoi — fin (heure)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="Aucune restriction"
                    value={stepForm.send_window_end}
                    onChange={(e) =>
                      setStepForm((f) => ({
                        ...f,
                        send_window_end:
                          e.target.value === "" ? "" : parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Clé du template</Label>
                <Input
                  value={stepForm.template_key}
                  onChange={(e) =>
                    setStepForm((f) => ({
                      ...f,
                      template_key: e.target.value,
                    }))
                  }
                  placeholder="Ex: abandoned_cart_h+1"
                />
                <p className="text-xs text-muted-foreground">
                  Identifiant unique utilisé par les edge functions pour cette étape
                </p>
              </div>
            </TabsContent>

            {/* TAB 2: Contenu */}
            <TabsContent value="content" className="space-y-4 pt-2">
              <VariablesHelper />

              {currentStepChannel === "email" ? (
                <>
                  <div className="space-y-2">
                    <Label>Objet de l&apos;email</Label>
                    <Input
                      value={stepForm.subject}
                      onChange={(e) =>
                        setStepForm((f) => ({
                          ...f,
                          subject: e.target.value,
                        }))
                      }
                      placeholder="Ex: {{first_name}}, votre certification vous attend"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Corps de l&apos;email (HTML)</Label>
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[300px] resize-y"
                      value={stepForm.html_body}
                      onChange={(e) =>
                        setStepForm((f) => ({
                          ...f,
                          html_body: e.target.value,
                        }))
                      }
                      placeholder={`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; padding: 20px;">
  <h1>Bonjour {{first_name}},</h1>
  <p>Votre certification vous attend.</p>
  <a href="{{form_link}}" style="display:inline-block; padding:12px 24px; background:#000; color:#fff; border-radius:6px; text-decoration:none;">
    Continuer
  </a>
</body>
</html>`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Collez votre template HTML complet. Les variables seront remplacées automatiquement à l&apos;envoi.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Message SMS</Label>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px] resize-y"
                    value={stepForm.message_body}
                    onChange={(e) =>
                      setStepForm((f) => ({
                        ...f,
                        message_body: e.target.value,
                      }))
                    }
                    placeholder="Bonjour {{first_name}}, votre certification n'est pas terminée. Continuez ici : {{form_link}} — L'équipe {{company_name}}"
                  />
                  <SmsCounter text={stepForm.message_body} />
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Aperçu */}
            <TabsContent value="preview" className="pt-2">
              <TemplatePreview
                channel={currentStepChannel}
                subject={stepForm.subject}
                htmlBody={stepForm.html_body}
                smsBody={stepForm.message_body}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewStep(null);
                setEditingStep(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={
                editingStep
                  ? handleUpdateStep
                  : () =>
                      showNewStep &&
                      handleCreateStep(
                        showNewStep,
                        sequences.find((s) => s.id === showNewStep)?.channel ||
                          "email"
                      )
              }
              disabled={saving || !stepForm.template_key}
            >
              {saving
                ? "Enregistrement..."
                : editingStep
                ? "Enregistrer"
                : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Variables Helper ── */

function VariablesHelper() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <button
        type="button"
        className="flex items-center gap-2 text-sm font-medium w-full text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <CodeIcon className="h-4 w-4 text-muted-foreground" />
        Variables disponibles
        <ChevronIcon
          className={`h-4 w-4 ml-auto text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {TEMPLATE_VARIABLES.map((v) => (
            <div
              key={v.key}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-2 py-1.5 transition-colors"
              onClick={() => navigator.clipboard.writeText(v.key)}
              title="Cliquer pour copier"
            >
              <code className="px-1.5 py-0.5 rounded bg-background border text-[11px] font-mono shrink-0">
                {v.key}
              </code>
              <span className="text-muted-foreground truncate">{v.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── SMS Counter ── */

function SmsCounter({ text }: { text: string }) {
  const chars = text.length;
  const segments = chars <= 160 ? 1 : Math.ceil(chars / 153);
  return (
    <p className="text-xs text-muted-foreground">
      {chars} caractère{chars > 1 ? "s" : ""} — {segments} SMS segment
      {segments > 1 ? "s" : ""}
      {chars > 160 && (
        <span className="text-amber-600 ml-1">(multi-segment)</span>
      )}
    </p>
  );
}

/* ── Template Preview ── */

function TemplatePreview({
  channel,
  subject,
  htmlBody,
  smsBody,
}: {
  channel: "email" | "sms";
  subject: string;
  htmlBody: string;
  smsBody: string;
}) {
  const sampleVars: Record<string, string> = {
    "{{first_name}}": "Jean",
    "{{last_name}}": "Dupont",
    "{{email}}": "jean.dupont@email.com",
    "{{form_link}}": "https://app.mynotary.io/form",
    "{{support_email}}": "support@mynotary.io",
    "{{company_name}}": "My Notary",
  };

  const replaceVars = (text: string) => {
    let result = text;
    for (const [key, val] of Object.entries(sampleVars)) {
      result = result.replaceAll(key, val);
    }
    return result;
  };

  const previewSubject = useMemo(() => replaceVars(subject), [subject]);
  const previewHtml = useMemo(() => replaceVars(htmlBody), [htmlBody]);
  const previewSms = useMemo(() => replaceVars(smsBody), [smsBody]);

  if (channel === "email") {
    if (!htmlBody && !subject) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <EyeIcon className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">
            Remplissez l&apos;objet et le corps HTML pour voir l&apos;aperçu
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {subject && (
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Objet
            </p>
            <p className="text-sm font-medium">{previewSubject}</p>
          </div>
        )}
        {htmlBody && (
          <div className="rounded-lg border overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              Aperçu email
            </div>
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ minHeight: 400 }}
              sandbox="allow-same-origin"
              title="Aperçu email"
            />
          </div>
        )}
      </div>
    );
  }

  if (!smsBody) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <EyeIcon className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">Rédigez le message SMS pour voir l&apos;aperçu</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-4">
      <div className="w-[320px] rounded-[2rem] border-4 border-gray-800 bg-white p-1 shadow-xl">
        <div className="rounded-[1.6rem] bg-gray-50 overflow-hidden">
          <div className="bg-gray-800 text-white text-center py-3 text-xs font-medium">
            Messages
          </div>
          <div className="p-4 min-h-[200px]">
            <div className="bg-blue-500 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[85%] leading-relaxed">
              {previewSms}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sequence Form ── */

interface SeqFormData {
  name: string;
  description: string;
  trigger_event: string;
  trigger_status: string;
  channel: "email" | "sms";
}

function SequenceForm({
  form,
  setForm,
}: {
  form: SeqFormData;
  setForm: React.Dispatch<React.SetStateAction<SeqFormData>>;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Ex: Relance panier abandonné"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Description optionnelle"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Canal</Label>
          <Select
            value={form.channel}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, channel: v as "email" | "sms" }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Événement déclencheur</Label>
          <Select
            value={form.trigger_event}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, trigger_event: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_EVENTS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Statut requis (optionnel)</Label>
        <Select
          value={form.trigger_status || "none"}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, trigger_status: v === "none" ? "" : v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {TRIGGER_STATUSES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* ── Icons ── */

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,7 12,13 2,7" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
