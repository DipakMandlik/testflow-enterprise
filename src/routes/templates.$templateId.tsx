import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Copy, Eye, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { CheckStatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTms } from "@/lib/tms/store";
import {
  addTemplateCategory,
  addTemplateCheck,
  archiveTemplate,
  categoriesFor,
  checksFor,
  checksForCategory,
  createTemplateRevision,
  currentUser,
  diffTemplateRevisions,
  isEditableTemplate,
  moveTemplateCheck,
  publishTemplate,
  removeTemplateCheck,
  submitTemplateForReview,
  templateById,
  templatesInFamily,
  updateTemplateCategory,
  updateTemplateCheck,
  validateTemplate,
  type TemplateCheckInput,
} from "@/lib/tms/services";
import { canManageTemplates } from "@/lib/tms/permissions";
import {
  CHECK_TYPE_LABELS,
  TEMPLATE_STATUS_LABELS,
  type CheckType,
  type TemplateCheck,
} from "@/types/domain";

export const Route = createFileRoute("/templates/$templateId")({
  head: () => ({
    meta: [
      { title: "Template — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Author categories and checks, validate, publish and preview as a tester.",
      },
    ],
  }),
  component: TemplateDetailPage,
});

interface CheckFormState {
  categoryId: string;
  checkCode: string;
  title: string;
  description: string;
  instruction: string;
  expectedResult: string;
  acceptanceCriteria: string;
  testType: CheckType;
  mandatory: boolean;
  allowNA: boolean;
  evidenceRequired: boolean;
  measurementUnit: string;
  measurementMin: string;
  measurementMax: string;
  defaultFailureCategory: string;
}

function emptyCheckForm(categoryId: string): CheckFormState {
  return {
    categoryId,
    checkCode: "",
    title: "",
    description: "",
    instruction: "",
    expectedResult: "",
    acceptanceCriteria: "",
    testType: "binary",
    mandatory: true,
    allowNA: false,
    evidenceRequired: false,
    measurementUnit: "",
    measurementMin: "",
    measurementMax: "",
    defaultFailureCategory: "",
  };
}

function checkToForm(check: TemplateCheck): CheckFormState {
  return {
    categoryId: check.categoryId,
    checkCode: check.checkCode,
    title: check.title,
    description: check.description,
    instruction: check.instruction,
    expectedResult: check.expectedResult,
    acceptanceCriteria: check.acceptanceCriteria,
    testType: check.testType,
    mandatory: check.mandatory,
    allowNA: check.allowNA,
    evidenceRequired: check.evidenceRequired,
    measurementUnit: check.measurementUnit ?? "",
    measurementMin: check.measurementMin != null ? String(check.measurementMin) : "",
    measurementMax: check.measurementMax != null ? String(check.measurementMax) : "",
    defaultFailureCategory: check.defaultFailureCategory ?? "",
  };
}

function TemplateDetailPage() {
  const { templateId } = Route.useParams();
  const { state, run } = useTms();
  const user = currentUser(state);
  const template = templateById(state, templateId);

  const [previewMode, setPreviewMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [checkForm, setCheckForm] = useState<CheckFormState>(emptyCheckForm(""));

  if (!user) return <AppShell title="Template">{null}</AppShell>;
  if (!template) {
    return (
      <AppShell title="Template not found" description="This template no longer exists.">
        <Button asChild variant="outline">
          <Link to="/templates">Back to templates</Link>
        </Button>
      </AppShell>
    );
  }

  const manage = canManageTemplates(user);
  const editable = manage && isEditableTemplate(template);
  const categories = categoriesFor(state, template.id);
  const problems = validateTemplate(state, template.id);
  const revisions = templatesInFamily(state, template.familyCode);
  const previousRevision = revisions.find((t) => t.revision === template.revision - 1);
  const diff = previousRevision
    ? diffTemplateRevisions(state, previousRevision.id, template.id)
    : [];

  const openAddCheck = (categoryId: string) => {
    setEditingCheckId(null);
    setCheckForm(emptyCheckForm(categoryId));
    setCheckDialogOpen(true);
  };

  const openEditCheck = (check: TemplateCheck) => {
    setEditingCheckId(check.id);
    setCheckForm(checkToForm(check));
    setCheckDialogOpen(true);
  };

  const saveCheck = () => {
    const input: TemplateCheckInput = {
      categoryId: checkForm.categoryId,
      checkCode: checkForm.checkCode.trim(),
      title: checkForm.title.trim(),
      description: checkForm.description.trim(),
      instruction: checkForm.instruction.trim(),
      expectedResult: checkForm.expectedResult.trim(),
      acceptanceCriteria: checkForm.acceptanceCriteria.trim(),
      testType: checkForm.testType,
      mandatory: checkForm.mandatory,
      allowNA: checkForm.allowNA,
      evidenceRequired: checkForm.evidenceRequired,
      measurementUnit:
        checkForm.testType === "measurement" ? checkForm.measurementUnit.trim() || null : null,
      measurementMin:
        checkForm.testType === "measurement" && checkForm.measurementMin.trim() !== ""
          ? Number(checkForm.measurementMin)
          : null,
      measurementMax:
        checkForm.testType === "measurement" && checkForm.measurementMax.trim() !== ""
          ? Number(checkForm.measurementMax)
          : null,
      defaultFailureCategory: checkForm.defaultFailureCategory.trim() || null,
    };
    const ok = editingCheckId
      ? run((s) => updateTemplateCheck(s, user, editingCheckId, input), {
          success: "Check updated.",
        })
      : run((s) => addTemplateCheck(s, user, template.id, input), { success: "Check added." });
    if (ok) setCheckDialogOpen(false);
  };

  return (
    <AppShell
      title={`${template.name} · Rev ${template.revision}`}
      description={`${template.familyCode} · ${TEMPLATE_STATUS_LABELS[template.status]} · ${template.totalChecks} checks (${template.mandatoryChecks} mandatory)`}
      actions={
        <>
          <Button variant="outline" onClick={() => setPreviewMode((v) => !v)}>
            <Eye className="size-4" /> {previewMode ? "Exit preview" : "Preview as tester"}
          </Button>
          {manage && template.status === "draft" && (
            <Button
              variant="outline"
              onClick={() => run((s) => submitTemplateForReview(s, user, template.id))}
            >
              <Send className="size-4" /> Submit for review
            </Button>
          )}
          {manage && (template.status === "draft" || template.status === "under_review") && (
            <Button
              disabled={problems.length > 0}
              onClick={() =>
                run((s) => publishTemplate(s, user, template.id), {
                  success: "Template published.",
                })
              }
            >
              Publish
            </Button>
          )}
          {manage && template.status === "published" && (
            <Button onClick={() => run((s) => createTemplateRevision(s, user, template.id))}>
              <Copy className="size-4" /> Create new revision
            </Button>
          )}
          {manage && template.status !== "archived" && (
            <Button
              variant="outline"
              onClick={() => run((s) => archiveTemplate(s, user, template.id))}
            >
              Archive
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {editable && problems.length > 0 && (
          <section className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            <p className="label-caps mb-1.5">Not ready to publish</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        )}

        {diff.length > 0 && (
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">
              Changes since Rev {previousRevision?.revision}
            </h2>
            <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {diff.map((d) => (
                <li
                  key={d.checkCode}
                  className={cn(
                    "mono-id rounded-sm border px-1.5 py-0.5",
                    d.kind === "added" && "border-success/40 bg-success/10 text-success",
                    d.kind === "removed" &&
                      "border-destructive/40 bg-destructive/10 text-destructive",
                    d.kind === "modified" && "border-warning/40 bg-warning/10 text-warning",
                  )}
                >
                  {d.checkCode} · {d.kind}
                </li>
              ))}
            </ul>
          </section>
        )}

        {manage && editable && !previewMode && (
          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="newCategory">Add category</Label>
                <Input
                  id="newCategory"
                  className="mt-1.5"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Acoustics"
                />
              </div>
              <Button
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  const ok = run((s) =>
                    addTemplateCategory(s, user, template.id, newCategoryName.trim()),
                  );
                  if (ok) setNewCategoryName("");
                }}
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </section>
        )}

        {categories.map((cat) => {
          const catChecks = checksForCategory(state, cat.id);
          return (
            <section
              key={cat.id}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                {renamingCategoryId === cat.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      autoFocus
                      className="h-8"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        run((s) => updateTemplateCategory(s, user, cat.id, renameValue.trim()));
                        setRenamingCategoryId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRenamingCategoryId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <h2 className="text-sm font-semibold">{cat.name}</h2>
                )}
                {manage && editable && !previewMode && renamingCategoryId !== cat.id && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenamingCategoryId(cat.id);
                        setRenameValue(cat.name);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAddCheck(cat.id)}>
                      <Plus className="size-4" /> Add check
                    </Button>
                  </div>
                )}
              </header>
              <ol className="divide-y divide-border">
                {catChecks.map((check, i) => (
                  <li key={check.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono-id text-primary">{check.checkCode}</span>
                        <span className="text-sm font-medium">{check.title}</span>
                        {previewMode && <CheckStatusBadge status="not_started" />}
                        {check.mandatory && (
                          <span className="label-caps text-warning">mandatory</span>
                        )}
                        <span className="label-caps text-muted-foreground">
                          {CHECK_TYPE_LABELS[check.testType]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{check.expectedResult}</p>
                      {check.testType === "measurement" && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Range {check.measurementMin}–{check.measurementMax}{" "}
                          {check.measurementUnit}
                        </p>
                      )}
                    </div>
                    {manage && editable && !previewMode && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => run((s) => moveTemplateCheck(s, user, check.id, "up"))}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={i === catChecks.length - 1}
                          onClick={() => run((s) => moveTemplateCheck(s, user, check.id, "down"))}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditCheck(check)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => run((s) => removeTemplateCheck(s, user, check.id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
                {!catChecks.length && (
                  <li className="px-4 py-3 text-sm text-muted-foreground">
                    No checks in this category yet.
                  </li>
                )}
              </ol>
            </section>
          );
        })}
        {!categories.length && (
          <p className="text-sm text-muted-foreground">
            No categories yet — add one above to start building this template.
          </p>
        )}
      </div>

      <Dialog open={checkDialogOpen} onOpenChange={setCheckDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCheckId ? "Edit check" : "Add check"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="checkCode">Check ID</Label>
                <Input
                  id="checkCode"
                  className="mt-1.5"
                  value={checkForm.checkCode}
                  onChange={(e) => setCheckForm({ ...checkForm, checkCode: e.target.value })}
                  placeholder="e.g. CAM-001"
                />
              </div>
              <div>
                <Label htmlFor="testType">Check type</Label>
                <Select
                  value={checkForm.testType}
                  onValueChange={(v) => setCheckForm({ ...checkForm, testType: v as CheckType })}
                >
                  <SelectTrigger id="testType" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHECK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="checkTitle">Title</Label>
              <Input
                id="checkTitle"
                className="mt-1.5"
                value={checkForm.title}
                onChange={(e) => setCheckForm({ ...checkForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="instruction">Instruction</Label>
              <Textarea
                id="instruction"
                className="mt-1.5"
                rows={2}
                value={checkForm.instruction}
                onChange={(e) => setCheckForm({ ...checkForm, instruction: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="expectedResult">Expected result</Label>
              <Textarea
                id="expectedResult"
                className="mt-1.5"
                rows={2}
                value={checkForm.expectedResult}
                onChange={(e) => setCheckForm({ ...checkForm, expectedResult: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="acceptanceCriteria">Acceptance criteria</Label>
              <Textarea
                id="acceptanceCriteria"
                className="mt-1.5"
                rows={2}
                value={checkForm.acceptanceCriteria}
                onChange={(e) => setCheckForm({ ...checkForm, acceptanceCriteria: e.target.value })}
              />
            </div>
            {checkForm.testType === "measurement" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="measurementUnit">Unit</Label>
                  <Input
                    id="measurementUnit"
                    className="mt-1.5"
                    value={checkForm.measurementUnit}
                    onChange={(e) =>
                      setCheckForm({ ...checkForm, measurementUnit: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="measurementMin">Min</Label>
                  <Input
                    id="measurementMin"
                    className="mt-1.5"
                    inputMode="decimal"
                    value={checkForm.measurementMin}
                    onChange={(e) => setCheckForm({ ...checkForm, measurementMin: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="measurementMax">Max</Label>
                  <Input
                    id="measurementMax"
                    className="mt-1.5"
                    inputMode="decimal"
                    value={checkForm.measurementMax}
                    onChange={(e) => setCheckForm({ ...checkForm, measurementMax: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="defaultFailureCategory">Default failure category</Label>
              <Select
                value={checkForm.defaultFailureCategory || "__none"}
                onValueChange={(v) =>
                  setCheckForm({ ...checkForm, defaultFailureCategory: v === "__none" ? "" : v })
                }
              >
                <SelectTrigger id="defaultFailureCategory" className="mt-1.5">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {state.failureCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={checkForm.mandatory}
                  onCheckedChange={(v) => setCheckForm({ ...checkForm, mandatory: v })}
                />
                Mandatory
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={checkForm.allowNA}
                  onCheckedChange={(v) => setCheckForm({ ...checkForm, allowNA: v })}
                />
                Allow N/A
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={checkForm.evidenceRequired}
                  onCheckedChange={(v) => setCheckForm({ ...checkForm, evidenceRequired: v })}
                />
                Evidence required
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!checkForm.checkCode.trim() || !checkForm.title.trim()}
              onClick={saveCheck}
            >
              {editingCheckId ? "Save changes" : "Add check"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
