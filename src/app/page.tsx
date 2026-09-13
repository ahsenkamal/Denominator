import { Checker } from "@/components/checker";
import { utcDate } from "@/lib/types";

export const dynamic = "force-dynamic";
export default function Home() {
  return <Checker today={utcDate()} />;
}
