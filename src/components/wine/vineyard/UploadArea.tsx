"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/Provider";
import { cn } from "@/lib/utils";
import type { UploadMeta } from "@/lib/wine/types";

interface Props {
  uploads: UploadMeta[];
  onChange: (next: UploadMeta[]) => void;
}

const MAX_SIZE = 100 * 1024;
const MAX_FILES = 5;
const SUPPORTED_EXTENSIONS = [".txt", ".csv"];
type SavedDocument = UploadMeta & { id: string };

function documentKey(document: UploadMeta): string {
  return `${document.name}:${document.size}:${document.content ?? ""}`;
}

export function UploadArea({ uploads, onChange }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [library, setLibrary] = useState<SavedDocument[]>([]);

  useEffect(() => {
    void fetch("/api/documents",{cache:"no-store"}).then(async(response)=>{
      if(!response.ok){setLibrary([]);return;}
      setLibrary(((await response.json()) as {documents:SavedDocument[]}).documents.filter((document)=>document.content));
    }).catch(()=>setLibrary([]));
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const additions: SavedDocument[] = [];
    for (const f of Array.from(files).slice(0, Math.max(0, MAX_FILES - uploads.length))) {
      const lowerName = f.name.toLowerCase();
      if (f.size > MAX_SIZE || !SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
        continue;
      }
      const candidate = {
        name: f.name,
        size: f.size,
        mime: f.type || "application/octet-stream",
        content: await f.text(),
      };
      const response=await fetch("/api/documents",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(candidate)});
      if(response.ok)additions.push(((await response.json()) as {document:SavedDocument}).document);
    }
    const nextLibrary = [...library];
    for (const addition of additions) {
      if (!nextLibrary.some((document) => documentKey(document) === documentKey(addition))) {
        nextLibrary.unshift(addition);
      }
    }
    setLibrary(nextLibrary);
    const selected = [...uploads];
    for (const addition of additions) {
      if (!selected.some((document) => documentKey(document) === documentKey(addition))) {
        selected.push(addition);
      }
    }
    onChange(selected.slice(0, MAX_FILES));
  }

  function toggle(document: UploadMeta) {
    const key = documentKey(document);
    const selected = uploads.some((item) => documentKey(item) === key);
    onChange(
      selected
        ? uploads.filter((item) => documentKey(item) !== key)
        : [...uploads, document].slice(0, MAX_FILES),
    );
  }

  async function removeFromHistory(document: SavedDocument) {
    const key = documentKey(document);
    const response=await fetch(`/api/documents/${encodeURIComponent(document.id)}`,{method:"DELETE"});
    if(response.ok){setLibrary(library.filter((item)=>documentKey(item)!==key));onChange(uploads.filter((item)=>documentKey(item)!==key));}
  }

  return (
    <div className="rounded-card border border-line p-4">
      <h3 className="kicker">
        {t("vineyard.upload.title")}
      </h3>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "mt-3 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm transition",
          dragging ? "border-foreground bg-surface-2" : "border-line hover:bg-surface-1",
        )}
      >
        <p className="text-soft">{t("vineyard.upload.hint")}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".txt,.csv,text/plain,text/csv"
          onChange={(e) => {
            void addFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>
      {library.length === 0 ? (
        <p className="mt-3 text-xs text-soft">{t("vineyard.upload.empty")}</p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="kicker">Saved documents</p>
            <span className="text-xs text-soft">{uploads.length}/{MAX_FILES} selected</span>
          </div>
          <ul className="mt-3 space-y-1">
            {library.map((u) => {
              const selected = uploads.some((item) => documentKey(item) === documentKey(u));
              return (
              <li
                key={documentKey(u)}
                className="flex items-center gap-2 rounded-md border border-line bg-surface-1 px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(u)}
                  aria-label={`Use ${u.name} in analysis`}
                  className="h-3.5 w-3.5 accent-current"
                />
                <span className="flex-1 truncate">{u.name}</span>
                <span className="tabular font-mono text-soft">
                  {(u.size / 1024).toFixed(1)} KB
                </span>
                <button
                  type="button"
                  onClick={() => void removeFromHistory(u)}
                  className="ml-1 text-soft hover:text-red-400"
                  aria-label={`Delete ${u.name} from document history`}
                >
                  ×
                </button>
              </li>
              );
            })}
          </ul>
          {uploads.length > 0 ? (
            <p className="mt-2 rounded-md bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
              ✓ {t("vineyard.upload.context_badge", { n: uploads.length })}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
