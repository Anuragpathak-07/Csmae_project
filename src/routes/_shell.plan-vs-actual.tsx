import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/plan-vs-actual")({
  beforeLoad: () => {
    throw redirect({ to: "/attainment-matrix", replace: true });
  },
  component: () => null,
});
