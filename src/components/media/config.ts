/**
 * Off until the client's new factory and product videos arrive (client
 * request, 2026-10-07: don't show the old factory footage). Turn on after
 * replacing the files in /public/media/films and /public/media/clips.
 *
 * Kept in a plain module (not "use client") so server pages read the real value.
 */
export const FACTORY_VIDEO_ENABLED = false;
