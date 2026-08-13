"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
}

export function FileDropzone({ file, onFileChange, accept = "application/pdf" }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  }

  if (file) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
        </div>
        <button
          type="button"
          onClick={() => onFileChange(null)}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Ta bort fil"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
        isDragging ? "border-primary bg-secondary/50" : "border-border hover:bg-secondary/30",
      )}
    >
      <Upload className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Släpp filer här, eller <span className="font-medium text-foreground">klicka för att ladda upp</span>
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
