import { redirect } from "next/navigation";

/** The demo page grew into the dashboard; old links still land somewhere useful. */
export default function DemoPage(): never {
  redirect("/dashboard");
}
