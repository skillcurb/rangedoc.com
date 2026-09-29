"use client";
/**
 * Dashboard editors for the intro video, social links and video gallery.
 * Videos can be a YouTube/Vimeo link or a file uploaded to the media library.
 */
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/forms/FormKit";
import { MediaField } from "@/components/media/MediaLibrary";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { VideoEmbed } from "@/components/profile/ProviderMedia";
import { SOCIAL_FIELDS } from "@/lib/video";
import { deleteVideo, moveVideo, saveMediaLinks, saveVideo } from "@/lib/actions/provider";

type Values = Record<string, string | null>;

export function MediaLinksForm({ allowVideo, allowSocial, values }: { allowVideo: boolean; allowSocial: boolean; values: Values }) {
  const [intro, setIntro] = useState(values.videoUrl ?? "");
  return (
    <ActionForm action={saveMediaLinks} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <MediaField name="videoUrl" defaultValue={values.videoUrl} accept="video" label="Intro video" help={allowVideo ? "Paste a YouTube/Vimeo link or upload an MP4 / WebM file." : "Not included in your plan."} onChange={setIntro} />
        {intro && allowVideo && <VideoEmbed url={intro} title="Intro video preview" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((f) => (
          <label key={f.key}>
            <span className="label">{f.label}</span>
            <input name={f.key} defaultValue={values[f.key] ?? ""} placeholder={f.placeholder} className="input" disabled={!allowSocial} inputMode="url" />
          </label>
        ))}
        {!allowSocial && <p className="text-xs text-muted sm:col-span-2">Social links are not included in your plan.</p>}
      </div>
      <div className="lg:col-span-2">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
      </div>
    </ActionForm>
  );
}

type Video = { id: number; title: string; url: string; thumbnail: string | null };

function VideoForm({ video, onDone }: { video?: Video; onDone: () => void }) {
  const [url, setUrl] = useState(video?.url ?? "");
  return (
    <ActionForm action={saveVideo} onSuccess={onDone} className="card grid gap-4 p-4 lg:grid-cols-2">
      <input type="hidden" name="id" value={video?.id ?? ""} />
      <div className="space-y-3">
        <label className="block">
          <span className="label">Title</span>
          <input name="title" required defaultValue={video?.title} className="input" placeholder="e.g. Treating lower back pain" />
        </label>
        <MediaField name="url" defaultValue={video?.url} accept="video" label="Video (YouTube/Vimeo link or upload)" onChange={setUrl} />
        <div className="flex gap-2">
          <SubmitButton pendingText="Saving…">Save video</SubmitButton>
          <button type="button" className="btn-light" onClick={onDone}>
            Cancel
          </button>
        </div>
      </div>
      {url && <VideoEmbed url={url} title="Preview" />}
    </ActionForm>
  );
}

export function VideoGalleryEditor({ videos, canAdd }: { videos: Video[]; canAdd: boolean }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((v) =>
          editing === v.id ? null : (
            <div key={v.id} className="card overflow-hidden">
              <VideoEmbed url={v.url} title={v.title} className="rounded-none shadow-none" />
              <div className="flex items-center gap-1 p-3">
                <p className="flex-1 truncate text-sm font-semibold text-navy-900">{v.title}</p>
                <ActionButton run={() => moveVideo(v.id, -1)} className="btn-light btn-sm px-2" title="Move up">
                  <ArrowUp className="size-3.5" />
                </ActionButton>
                <ActionButton run={() => moveVideo(v.id, 1)} className="btn-light btn-sm px-2" title="Move down">
                  <ArrowDown className="size-3.5" />
                </ActionButton>
                <button type="button" className="btn-light btn-sm px-2" onClick={() => setEditing(v.id)} title="Edit">
                  <Pencil className="size-3.5" />
                </button>
                <ActionButton run={() => deleteVideo(v.id)} confirm="Remove this video?" className="btn-light btn-sm px-2 text-red-600" title="Delete">
                  <Trash2 className="size-3.5" />
                </ActionButton>
              </div>
            </div>
          ),
        )}
      </div>
      {typeof editing === "number" && <VideoForm video={videos.find((v) => v.id === editing)} onDone={() => setEditing(null)} />}
      {editing === "new" ? (
        <VideoForm onDone={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn-primary" disabled={!canAdd} onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add video
        </button>
      )}
    </div>
  );
}
