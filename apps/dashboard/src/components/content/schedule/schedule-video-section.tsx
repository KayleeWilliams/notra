"use client";

import type { SocialVideoAttachment as SocialVideoDraft } from "@notra/schemas/types/dashboard/content";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SocialVideoAttachment } from "@/components/content/social-video-attachment";
import { SOCIAL_VIDEO } from "@/constants/social-video";
import { useContent, useSaveSocialVideo } from "@/lib/hooks/use-content";
import { useSocialVideoPending } from "@/lib/hooks/use-social-video-pending";
import type { ScheduleVideoSectionProps } from "@/types/content/schedule";

/** The video that goes out with a scheduled X or LinkedIn post. */
export function ScheduleVideoSection({
  organizationId,
  contentId,
  contentType,
  destinations,
  disabled,
}: ScheduleVideoSectionProps) {
  const t = useTranslations("content.calendar.schedule");
  const tPost = useTranslations("content.postSocial");
  const { data } = useContent(organizationId, contentId);
  const saveVideo = useSaveSocialVideo(organizationId, contentId);
  const pending = useSocialVideoPending(organizationId, contentId);

  // The video only goes out through the social destination.
  const socialEnabled = destinations.social?.checked;
  if (!(socialEnabled && SOCIAL_VIDEO.contentTypes.has(contentType) && data)) {
    return null;
  }

  // The saved video, or the one being saved until the answer lands. Reading
  // the cache keeps a dialog opened mid-save in step with that save.
  const saved = data.content.sourceMetadata?.socialVideo ?? null;
  const video = saveVideo.isPending ? (saveVideo.variables ?? null) : saved;

  // The post keeps the video, so the scheduled send posts it as well.
  const handleChange = (next: SocialVideoDraft | null) => {
    saveVideo.mutate(next, {
      onError: () => toast.error(tPost("attachmentSaveFailed")),
    });
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{t("video")}</h3>
      <SocialVideoAttachment
        contentId={contentId}
        disabled={disabled || pending}
        onChange={handleChange}
        value={video}
      />
    </section>
  );
}
