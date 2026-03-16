"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { DOTVERIFY_ABI, DOTVERIFY_ADDRESS } from "@/config/contract";

export function SchemaRegistry() {
  const { address } = useAccount();
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [revocable, setRevocable] = useState(true);

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

  function handleCreate() {
    if (!name || !definition || !DOTVERIFY_ADDRESS) return;
    writeContract({
      address: DOTVERIFY_ADDRESS,
      abi: DOTVERIFY_ABI,
      functionName: "registerSchema",
      args: [name, definition, revocable],
    });
  }

  return (
    <div className="space-y-6">
      {/* Create Schema */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Create Schema</h2>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Schema Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AcademicDiploma"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">
              Definition (field:type pairs)
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="name:string,institution:string,degree:string,date:uint256"
              rows={3}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#E6007A]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={revocable}
              onChange={(e) => setRevocable(e.target.checked)}
              className="rounded"
            />
            Revocable (attestations can be revoked later)
          </label>
          <button
            onClick={handleCreate}
            disabled={isPending || isConfirming || !address || !DOTVERIFY_ADDRESS}
            className="px-4 py-2 bg-[#E6007A] text-white rounded-lg text-sm font-medium hover:bg-[#c40066] transition-colors disabled:opacity-50"
          >
            {isPending ? "Signing..." : isConfirming ? "Confirming..." : "Register Schema"}
          </button>
          {isSuccess && (
            <p className="text-xs text-green-600">Schema registered successfully!</p>
          )}
          {!DOTVERIFY_ADDRESS && (
            <p className="text-xs text-amber-600">Contract not configured. Set NEXT_PUBLIC_DOTVERIFY_ADDRESS in .env.local</p>
          )}
        </div>
      </div>

      {/* Schema List */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">
          Registered Schemas {schemaCount !== undefined && <span className="text-muted-foreground">({Number(schemaCount)})</span>}
        </h2>
        {schemaUids && (schemaUids as `0x${string}`[]).length > 0 ? (
          <div className="space-y-2">
            {(schemaUids as `0x${string}`[]).map((uid) => (
              <SchemaCard key={uid} uid={uid} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No schemas registered yet.</p>
        )}
      </div>

      {/* Common Templates */}
      <div className="border border-border rounded-lg p-4">
        <h2 className="font-semibold text-sm mb-3">Schema Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { n: "BasicIdentity", d: "name:string,email:string,verified:bool", r: true },
            { n: "AcademicDiploma", d: "name:string,institution:string,degree:string,graduationDate:uint256,gpa:string", r: false },
            { n: "EmploymentRecord", d: "employee:string,company:string,role:string,startDate:uint256,endDate:uint256", r: true },
          ].map((t) => (
            <button
              key={t.n}
              onClick={() => { setName(t.n); setDefinition(t.d); setRevocable(t.r); }}
              className="text-left border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
            >
              <p className="font-medium text-xs">{t.n}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{t.d}</p>
              <p className="text-[10px] mt-1">{t.r ? "Revocable" : "Permanent"}</p>
            </button>
          ))}
        </div>
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
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-xs">{s.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.revocable ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
          {s.revocable ? "Revocable" : "Permanent"}
        </span>
      </div>
      <p className="text-[10px] font-mono text-muted-foreground mb-1">{s.definition}</p>
      <p className="text-[10px] text-muted-foreground">
        by {s.creator.slice(0, 6)}...{s.creator.slice(-4)} &middot;{" "}
        {new Date(Number(s.createdAt) * 1000).toLocaleDateString()}
      </p>
      <p className="text-[9px] font-mono text-muted-foreground mt-1">UID: {uid.slice(0, 18)}...</p>
    </div>
  );
}
