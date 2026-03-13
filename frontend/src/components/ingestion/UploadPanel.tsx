export interface UploadPanelProps {
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void
  acceptedFormats?: string
}

export function UploadPanel({
  onDrop,
  onDragOver,
  onFileSelect,
  acceptedFormats = '.csv,.json,.xlsx',
}: UploadPanelProps) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-bg-secondary p-12 text-center hover:border-accent transition-colors"
      data-testid="upload-panel"
    >
      <div className="text-4xl">📁</div>
      <div>
        <p className="text-text-primary font-medium">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-sm text-text-muted mt-1">
          지원 형식: {acceptedFormats}
        </p>
      </div>
      <label className="cursor-pointer rounded-lg bg-accent hover:bg-accent-hover text-white px-4 py-2 text-sm transition-colors">
        파일 선택
        <input
          type="file"
          accept={acceptedFormats}
          onChange={onFileSelect}
          className="hidden"
        />
      </label>
    </div>
  )
}
