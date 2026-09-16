import { redirect } from "next/navigation";
import { DEFAULT_NETWORK } from "@/lib/networks";

export default function Root() {
  redirect(`/${DEFAULT_NETWORK}`);
}
