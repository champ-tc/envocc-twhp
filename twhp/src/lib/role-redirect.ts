export function landingPathByRole(roleRaw: unknown) {
  const role = String(roleRaw ?? "").trim();

  if (role === "Factory") return "/factories/main";
  if (
    role === "DOED" ||
    role === "Evaluator" ||
    role === "Provicial" ||
    role === "Provincial" ||
    role === "ODPC"
  ) {
    return "/admins/main";
  }

  return "/";
}

export function isAdminRole(roleRaw: unknown) {
  const role = String(roleRaw ?? "").trim();
  return (
    role === "DOED" ||
    role === "Evaluator" ||
    role === "Provicial" ||
    role === "Provincial" ||
    role === "ODPC"
  );
}
