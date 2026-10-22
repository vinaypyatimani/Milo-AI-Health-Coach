import { useState } from "react";
import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import type { PlannedSession } from "../lib/types";
import { exercisesFor, videoQuery } from "../lib/exercises";
import { Skeleton } from "../components/ui";

/** One exercise: the top YouTube video (loaded only when you press play), or a search link. */
function VideoCard({ name, query }: { name: string; query: string }) {
  const { data, error } = useQuery(`video:${query}`, () => api.videos(query));
  const [playing, setPlaying] = useState(false);
  const v = data?.items[0];
  const searchUrl = data?.search_url ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  return (
    <figure className="video">
      <div className="video-frame">
        {!data && !error ? <Skeleton height={0} /> : v ? (
          playing ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title}
                    allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <button type="button" className="video-thumb" onClick={() => setPlaying(true)} aria-label={`Play: ${v.title}`}>
              {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" />}
              <span className="play" aria-hidden="true" />
            </button>
          )
        ) : (
          <a className="video-link" href={searchUrl} target="_blank" rel="noreferrer">
            <span className="play" aria-hidden="true" />
            <span>Watch on YouTube</span>
          </a>
        )}
      </div>
      <figcaption>
        <strong>{name}</strong>
        {v && <span className="muted small">{v.title} · {v.channel}</span>}
        <a className="small" href={searchUrl} target="_blank" rel="noreferrer">{v ? "More videos" : `Search “${query}”`} ↗</a>
      </figcaption>
    </figure>
  );
}

/** How-to videos for the exercises of the selected day. */
export function ExerciseVideos({ session }: { session?: PlannedSession }) {
  if (!session) return <p className="muted">Pick a training day in the calendar to see how-to videos for its exercises.</p>;
  const seen = new Set<string>();
  const items = exercisesFor(session)
    .map((e) => ({ name: e.name, query: videoQuery(e, session) }))
    .filter((x): x is { name: string; query: string } => !!x.query && !seen.has(x.query) && !!seen.add(x.query))
    .slice(0, 6);
  if (!items.length) return <p className="muted">No videos needed for this one: it's an easy session. Just go at a pace you could still talk at.</p>;
  return (
    <div className="videos">
      {items.map((x) => <VideoCard key={x.query} {...x} />)}
    </div>
  );
}
