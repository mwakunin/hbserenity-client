"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  attachImage,
  getUploadAuth,
  removeImage,
  setCoverImage,
} from "@/app/admin/properties/actions";

interface PropertyImage {
  id: string;
  url: string;
  fileId: string;
  isCover: boolean;
  order: number;
}

/**
 * Photos for a listing.
 *
 * The file goes from this browser straight to ImageKit — the API only signs
 * the request and records the result, so multi-megabyte uploads never pass
 * through it. The order is deliberate: sign, upload, then attach. Attaching is
 * what makes the photo real, and it happens only once ImageKit has confirmed
 * the file exists.
 *
 * The API re-checks that pairing anyway: it resolves the fileId against
 * ImageKit and stores the URL ImageKit reports, not the one sent from here.
 */
export function PhotoManager({
  propertyId,
  images,
}: {
  propertyId: string;
  images: PropertyImage[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);

    try {
      let auth;
      try {
        auth = await getUploadAuth(propertyId);
      }
      catch {
        // 409 here means the API has no ImageKit credentials — the normal
        // state of a local checkout. Saying "the upload failed" would send
        // someone hunting for a bug that is really a missing env var.
        setError(
          "Image hosting is not configured on the API (IMAGEKIT_* env vars). Photos cannot be uploaded until it is.",
        );
        return;
      }

      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name);
      body.append("publicKey", auth.publicKey);
      body.append("signature", auth.signature);
      body.append("expire", String(auth.expire));
      body.append("token", auth.token);

      const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        setError(detail?.message ?? "ImageKit rejected the upload.");
        return;
      }

      const uploaded = await res.json() as { url: string; fileId: string };

      const attached = await attachImage(propertyId, {
        url: uploaded.url,
        fileId: uploaded.fileId,
        // The first photo becomes the cover, since a listing with photos and
        // no cover renders an arbitrary one.
        isCover: images.length === 0,
      });

      if (attached.status === "unauthenticated") {
        router.push("/sign-in?next=%2Fadmin%2Fproperties");
        return;
      }
      if (attached.status !== "ok") {
        setError(attached.message);
        return;
      }

      router.refresh();
    }
    catch {
      setError("The upload could not be completed.");
    }
    finally {
      setBusy(false);
    }
  }

  /** Shared by "make cover" and "remove", which differ only in the action. */
  async function act(fn: () => Promise<{ status: string; message?: string }>) {
    setBusy(true);
    setError(null);

    // Same shape as the upload above: a rejected action must not leave every
    // photo control disabled with nothing on screen to explain it.
    try {
      const result = await fn();

      if (result.status !== "ok")
        setError(result.message ?? "That did not work.");
      else router.refresh();
    }
    catch {
      setError("Something went wrong. Please try again.");
    }
    finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg text-on-surface">Photos</h2>
        <label className="cursor-pointer text-xs text-primary underline">
          {busy ? "Working…" : "Add photo"}
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      {images.length === 0
        ? (
            <p className="mt-3 rounded-lg bg-surface-container p-5 text-center text-xs text-on-surface-variant">
              No photos yet. The listing shows a placeholder until one is added.
            </p>
          )
        : (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {[...images]
                .sort((a, b) => (a.isCover === b.isCover ? a.order - b.order : a.isCover ? -1 : 1))
                .map(image => (
                  <li key={image.id} className="space-y-1">
                    <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container-high">
                      <Image src={image.url} alt="" fill sizes="120px" className="object-cover" />
                      {image.isCover && (
                        <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] uppercase text-on-primary">
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-[10px]">
                      {!image.isCover && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(() => setCoverImage(propertyId, image.id))}
                          className="text-primary underline"
                        >
                          Cover
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(() => removeImage(propertyId, image.id))}
                        className="ml-auto text-error underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
    </div>
  );
}
