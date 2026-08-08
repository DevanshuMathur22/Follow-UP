export const permissions = {
  VIEW_PATIENTS: "view_patients",
  EDIT_PATIENTS: "edit_patients",
  ARCHIVE_PATIENTS: "archive_patients",
  MANAGE_CATEGORIES: "manage_categories",
  MANAGE_FOLLOW_UPS: "manage_follow_ups",
  MANAGE_PRESCRIPTIONS: "manage_prescriptions",
  MANAGE_CERTIFICATES: "manage_certificates",
  VIEW_ACTIVITY: "view_activity",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_SETTINGS: "manage_settings",
};

const rolePermissions = {
  admin: new Set(Object.values(permissions)),
  doctor: new Set(Object.values(permissions)),
  staff: new Set([
    permissions.VIEW_PATIENTS,
    permissions.EDIT_PATIENTS,
    permissions.MANAGE_FOLLOW_UPS,
    permissions.MANAGE_PRESCRIPTIONS,
    permissions.MANAGE_CERTIFICATES,
  ]),
};

export function hasPermission(role, permission) {
  return rolePermissions[String(role || "").toLowerCase()]?.has(permission) === true;
}

export function forbiddenResponse() {
  return Response.json(
    {
      success: false,
      message: "You do not have permission to perform this action",
    },
    { status: 403 },
  );
}
