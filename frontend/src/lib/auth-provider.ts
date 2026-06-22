type UserLike = {
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  identities?: Array<{
    provider?: string;
  }> | null;
};

export function isGoogleSSOUser(user: UserLike | null | undefined) {
  if (!user) {
    return false;
  }

  const metadataProvider = user.app_metadata?.provider;
  const metadataProviders = user.app_metadata?.providers ?? [];
  const identityProviders = user.identities?.map((identity) => identity.provider) ?? [];

  return [metadataProvider, ...metadataProviders, ...identityProviders].includes("google");
}
