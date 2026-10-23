import { api } from "../lib/api";
import { useQuery } from "../lib/query";
import { Skeleton } from "../components/ui";
import { ActivityTable, ManualEntryCard, UploadCard } from "../modules/DataModules";

export default function DataPage({ notify }: { notify: (m: string) => void }) {
  const { data: items } = useQuery("activities", api.activities);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tracker data</h1>
          <p className="lede">Workouts for your plan: Milo compares them with it on the Week and Progress pages. To look at other training without a plan, use Analyze; its data stays separate.</p>
        </div>
      </header>
      <div className="modules">
        <UploadCard notify={notify} />
        <ManualEntryCard notify={notify} />
        <div className="span-all">{items ? <ActivityTable items={items} notify={notify} /> : <Skeleton height={200} />}</div>
      </div>
    </div>
  );
}
