export function landingPathByRole(roleRaw: unknown) {
  const role = String(roleRaw ?? "").trim();

  if (role === "Factory") return "/Factories/main";
  if (role === "DOED") return "/admins/dashboard";
  if (role === "Evaluator") return "/admins/dashboard";
  if (role === "Provicial" || role === "Provincial") return "/admins/dashboard";

  return "/";
}

export function isAdminRole(roleRaw: unknown) {
  const role = String(roleRaw ?? "").trim();
  return (
    role === "DOED" ||
    role === "Evaluator" ||
    role === "Provicial" ||
    role === "Provincial"
  );
}
