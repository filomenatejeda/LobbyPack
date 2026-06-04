import { t } from "elysia";

export const parcelPayloadSchema = t.Object({
  department_address: t.String({ minLength: 1, maxLength: 11 }),
  resident_name: t.String({ minLength: 1, maxLength: 30 }),
  user_phone_number: t.String({ minLength: 12, maxLength: 12 }),
  business_name: t.String({ minLength: 1, maxLength: 30 }),
  parcel_description: t.Optional(t.String({ maxLength: 150 })),
  is_urgent: t.Optional(t.Boolean()),
});

export const generalSettingsSchema = t.Object({
  building_name: t.String({ minLength: 1 }),
  community_type: t.Optional(t.String()),
  contact_email: t.String({ minLength: 1 }),
  reception_hours: t.String({ minLength: 1 }),
  address_line: t.String({ minLength: 1 }),
  access_password: t.String(),
  is_active: t.Boolean(),
});

export const communityRegistrationSchema = t.Object({
  community_name: t.String({ minLength: 1 }),
  community_type: t.String({ minLength: 1 }),
  community_country: t.String({ minLength: 1 }),
  community_location: t.String({ minLength: 1 }),
  community_address: t.String({ minLength: 1 }),
  admin_first_name: t.String({ minLength: 1 }),
  admin_last_name: t.String({ minLength: 1 }),
  admin_email: t.String({ minLength: 1 }),
});

export const communityAddressAvailabilitySchema = t.Object({
  community_country: t.String({ minLength: 1 }),
  community_location: t.String({ minLength: 1 }),
  community_address: t.String({ minLength: 1 }),
});

export const adminEmailSchema = t.Object({
  admin_email: t.String({ minLength: 1 }),
});

export const residentSettingsSchema = t.Object({
  resident_email: t.String({ minLength: 1 }),
  resident_name: t.String({ minLength: 1 }),
  resident_password: t.String({ minLength: 8 }),
  user_phone_number: t.String(),
  department_address: t.String({ minLength: 1 }),
});

export const residentEmailVerificationSchema = t.Object({
  verification_code: t.String({ minLength: 6 }),
});

export const residentMfaVerificationSchema = t.Object({
  mfa_code: t.String({ minLength: 6 }),
});

export const residentParcelQrSchema = t.Object({
  qr_value: t.String({ minLength: 1 }),
});

export const preferenceSettingsSchema = t.Object({
  package_notifications: t.Boolean(),
  daily_summary: t.Boolean(),
  qr_access: t.Boolean(),
});

export const issueStatusSchema = t.Object({
  issue_status: t.Union([
    t.Literal("open"),
    t.Literal("under_review"),
    t.Literal("resolved"),
  ]),
});

export const residentIssueSchema = t.Object({
  id_parcel: t.String({ minLength: 1 }),
  issue_description: t.String({ minLength: 1, maxLength: 300 }),
});

export const towersSchema = t.Array(
  t.Object({
    id: t.Number(),
    tower_name: t.String({ minLength: 1 }),
    selected_floor: t.Number(),
    is_editing: t.Boolean(),
    floors: t.Array(
      t.Object({
        floor_number: t.Number(),
        apartments: t.Array(t.String({ minLength: 1 })),
      }),
    ),
  }),
);
