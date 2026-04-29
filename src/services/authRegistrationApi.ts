import { apiRequest } from "../lib/api";

type CommunityRegistrationPayload = {
  community_name: string;
  community_type: string;
  community_country: string;
  community_location: string;
  community_address: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
};

type CommunityAddressAvailabilityPayload = {
  community_country: string;
  community_location: string;
  community_address: string;
};

type CommunityAddressAvailabilityResponse = {
  available: boolean;
  message: string;
};

export function checkCommunityAddressAvailability(payload: CommunityAddressAvailabilityPayload) {
  return apiRequest<CommunityAddressAvailabilityResponse>("/api/auth/check-community-address", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function reserveCommunityRegistration(payload: CommunityRegistrationPayload) {
  return apiRequest<{ ok: boolean }>("/api/auth/register-community", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
