"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

const TEMPLATES = [
  {
    name: "BasicIdentity",
    icon: "👤",
    desc: "Verify someone's identity basics",
    fields: [
      { name: "name", type: "string", desc: "Full name" },
      { name: "email", type: "string", desc: "Email address" },
      { name: "verified", type: "bool", desc: "Identity verified" },
    ],
    definition: "name:string,email:string,verified:bool",
    revocable: true,
  },
  {
    name: "AcademicDiploma",
    icon: "🎓",
    desc: "Issue academic degree credentials",
    fields: [
      { name: "name", type: "string", desc: "Student name" },
      { name: "institution", type: "string", desc: "University or school" },
      { name: "degree", type: "string", desc: "Degree title" },
      { name: "graduationDate", type: "uint256", desc: "Graduation timestamp" },
      { name: "gpa", type: "string", desc: "Grade point average" },
    ],
    definition: "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string",
    revocable: false,
  },
  {
    name: "EmploymentRecord",
    icon: "💼",
    desc: "Verify employment history",
    fields: [
      { name: "employee", type: "string", desc: "Employee name" },
      { name: "company", type: "string", desc: "Company name" },
      { name: "role", type: "string", desc: "Job title" },
      { name: "startDate", type: "uint256", desc: "Start timestamp" },
      { name: "endDate", type: "uint256", desc: "End timestamp (0 = current)" },
    ],
    definition: "employee:string,company:string,role:string,startDate:uint256,endDate:uint256",
    revocable: true,
  },
  {
    name: "DAOMembership",
    icon: "🏛",
    desc: "DAO member credentials",
    fields: [
      { name: "member", type: "string", desc: "Member name or handle" },
      { name: "dao", type: "string", desc: "DAO name" },
      { name: "role", type: "string", desc: "Member role" },
      { name: "joinDate", type: "uint256", desc: "Join timestamp" },
    ],
    definition: "member:string,dao:string,role:string,joinDate:uint256",
    revocable: true,
  },
  {
    name: "CourseCompletion",
    icon: "🚀",
    desc: "Bootcamp or course certificates",
    fields: [
      { name: "student", type: "string", desc: "Student name" },
      { name: "course", type: "string", desc: "Course name" },
      { name: "provider", type: "string", desc: "Course provider" },
      { name: "completionDate", type: "uint256", desc: "Completion timestamp" },
      { name: "grade", type: "string", desc: "Grade or score" },
    ],
    definition: "student:string,course:string,provider:string,completionDate:uint256,grade:string",
    revocable: false,
  },
  {
    name: "KYCVerification",
    icon: "✓",
    desc: "Know-your-customer attestation",
    fields: [
      { name: "name", type: "string", desc: "Full legal name" },
      { name: "documentType", type: "string", desc: "ID type (passport, license)" },
      { name: "verifier", type: "string", desc: "Verifying organization" },
      { name: "verifiedAt", type: "uint256", desc: "Verification timestamp" },
    ],
    definition: "name:string,documentType:string,verifier:string,verifiedAt:uint256",
    revocable: true,
  },
];

type ViewMode = "templates" | "custom" | "preview";

export function SchemaRegistry() {
  const { address } = useAccount();
  const [view, setView] = useState<ViewMode>("templates");
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [revocable, setRevocable] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: schemaCount } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchemaCount",
  });

  const { data: schemaUids } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getAllSchemaUids",
  });

  function selectTemplate(t: typeof TEMPLATES[0]) {
    setSelectedTemplate(t);
    setName(t.name);
    setDefinition(t.definition);
    setRevocable(t.revocable);
    setView("preview");
  }

  function handleCreate() {
    if (!name || !definition || !DOTVERIFY_ADDRESS) return;
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "registerSchema",
      args: [name, definition, revocable],
    });
  }

  const parsedFields = definition
    ? definition.split(",").map((f) => {
        const [n, t] = f.split(":");
        return { name: n?.trim(), type: t?.trim() || "string" };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setView("templates")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              view === "templates" ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]" : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => { setView("custom"); setSelectedTemplate(null); setName(""); setDefinition(""); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              view === "custom" ? "border-[#E6007A] bg-[#E6007A]/5 text-[#E6007A]" : "border-border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            Custom Schema
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {schemaCount !== undefined && `${Number(schemaCount)} schemas on-chain`}
        </span>
      </div>

      {/* Templates view */}
      {view === "templates" && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            Choose a template to get started. Each template defines the fields that credentials of this type will contain.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => selectTemplate(t)}
                className="text-left border border-border rounded-xl p-4 hover:border-[#E6007A]/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{t.icon}</span>
                  <span className="font-semibold text-sm">{t.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">{t.desc}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {t.fields.map((f) => (
                    <span key={f.name} className="text-[9px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                      {f.name}
                    </span>
                  ))}
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${t.revocable ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
                  {t.revocable ? "Revocable" : "Permanent"}
                </span>
                <div className="mt-2 text-[10px] text-[#E6007A] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Use this template →
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview / Confirm */}
      {view === "preview" && selectedTemplate && (
        <div className="border border-[#E6007A]/20 bg-[#E6007A]/5 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{selectedTemplate.icon}</span>
            <div>
              <h3 className="font-bold text-sm">{selectedTemplate.name}</h3>
              <p className="text-[11px] text-muted-foreground">{selectedTemplate.desc}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fields</h4>
            <div className="space-y-2">
              {selectedTemplate.fields.map((f) => (
                <div key={f.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{f.name}</span>
                    <span className="text-[9px] text-muted-foreground bg-muted/50 px-1 rounded">{f.type}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs px-2 py-0.5 rounded ${selectedTemplate.revocable ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
              {selectedTemplate.revocable ? "Revocable — issuer can revoke credentials later" : "Permanent — credentials cannot be revoked once issued"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView("templates")}
              className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || isConfirming || !address || !DOTVERIFY_ADDRESS}
              className="flex-1 px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Register Schema On-Chain"}
            </button>
          </div>

          {isSuccess && (
            <div className="mt-3 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-medium">Schema registered!</p>
              <p className="text-[10px] mt-1">UID generated with BLAKE2-256. Go to the Issue tab to create credentials using this schema.</p>
            </div>
          )}

          {!address && <p className="text-xs text-amber-600 mt-2">Connect your wallet to register schemas.</p>}
          {!DOTVERIFY_ADDRESS && <p className="text-xs text-amber-600 mt-2">Contract not configured.</p>}
        </div>
      )}

      {/* Custom schema */}
      {view === "custom" && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-1">Custom Schema</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Define your own credential structure. Each field has a name and type.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Schema Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ContributorAttestation"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Fields <span className="text-[9px]">(name:type, comma-separated)</span>
              </label>
              <textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="contributor:string,project:string,role:string,date:uint256"
                rows={3}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
              />
              <p className="text-[9px] text-muted-foreground mt-1">
                Types: string, uint256, bool, address, bytes32
              </p>
            </div>

            {/* Live preview of parsed fields */}
            {parsedFields.length > 0 && parsedFields[0].name && (
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">Preview</p>
                <div className="flex flex-wrap gap-1">
                  {parsedFields.map((f) => (
                    <span key={f.name} className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-border">
                      {f.name}<span className="text-muted-foreground">:{f.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={revocable}
                onChange={(e) => setRevocable(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">Revocable</span>
              <span className="text-[10px] text-muted-foreground">(credentials can be revoked later)</span>
            </label>

            <button
              onClick={handleCreate}
              disabled={isPending || isConfirming || !address || !name || !definition || !DOTVERIFY_ADDRESS}
              className="w-full px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
            >
              {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Register Schema On-Chain"}
            </button>

            {isSuccess && (
              <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium">Schema registered!</p>
              </div>
            )}

            {!address && <p className="text-xs text-amber-600">Connect your wallet first.</p>}
          </div>
        </div>
      )}

      {/* Existing schemas */}
      <div className="border border-border rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-3">
          On-Chain Schemas {schemaCount !== undefined && <span className="text-muted-foreground">({Number(schemaCount)})</span>}
        </h2>
        {schemaUids && (schemaUids as `0x${string}`[]).length > 0 ? (
          <div className="space-y-2">
            {(schemaUids as `0x${string}`[]).map((uid) => (
              <SchemaCard key={uid} uid={uid} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No schemas registered yet. Create one above to get started.</p>
        )}
      </div>
    </div>
  );
}

function SchemaCard({ uid }: { uid: `0x${string}` }) {
  const { data: schema } = useReadContract({
    address: DOTVERIFY_ADDRESS,
    abi: DOTVERIFY_ABI,
    functionName: "getSchema",
    args: [uid],
  });

  if (!schema) return null;

  const s = schema as { uid: string; creator: string; name: string; definition: string; revocable: boolean; createdAt: bigint };

  return (
    <div className="border border-border rounded-lg p-3 hover:bg-muted/10 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-medium text-xs">{s.name}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded ${s.revocable ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
          {s.revocable ? "Revocable" : "Permanent"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {s.definition.split(",").map((field: string) => (
          <span key={field} className="text-[9px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">
            {field}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>by {s.creator.slice(0, 6)}...{s.creator.slice(-4)}</span>
        <span>{new Date(Number(s.createdAt) * 1000).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
