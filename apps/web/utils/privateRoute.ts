export type PrivateRouteState = "checking" | "allowed" | "denied";

export const resolvePrivateRouteState = (
  token: string | null,
  authenticated: boolean | null,
): PrivateRouteState => {
  if (!token) return "denied";
  if (authenticated === null) return "checking";
  return authenticated ? "allowed" : "denied";
};
