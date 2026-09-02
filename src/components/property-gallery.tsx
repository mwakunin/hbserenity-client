import Image from "next/image";

import type { GetResponse } from "@/lib/api/client";

/** As `GET /properties/{id}` returns them — not a local copy of the shape. */
type GalleryImage = GetResponse<"/properties/{id}">["images"][number];

/**
 * The hero for a listing.
 *
 * Ordered the way the API models it: the cover first if one is set, then by
 * `order`. A property with no photos is a normal state right now — the upload
 * flow exists but nothing has been uploaded — so this degrades to a lettered
 * placeholder rather than an empty box or a broken image icon.
 */
export function PropertyGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const ordered = [...images].sort((a, b) => {
    if (a.isCover !== b.isCover)
      return a.isCover ? -1 : 1;
    return a.order - b.order;
  });

  if (ordered.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-surface-container-high">
        <span className="font-headline text-5xl text-on-surface-variant/40">
          {title.charAt(0)}
        </span>
      </div>
    );
  }

  const [cover, ...rest] = ordered;

  return (
    <div>
      <div className="relative aspect-[4/3] bg-surface-container-high">
        <Image
          src={cover.url}
          alt={title}
          fill
          priority
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
        />
      </div>

      {rest.length > 0 && (
        // A horizontal strip rather than a carousel: it needs no JavaScript,
        // and on a phone a thumb swipe is the expected gesture anyway.
        <ul className="flex gap-2 overflow-x-auto px-4 py-2">
          {rest.map(image => (
            <li key={image.id} className="relative h-16 w-24 shrink-0">
              <Image
                src={image.url}
                alt=""
                fill
                sizes="96px"
                className="rounded-md object-cover"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
