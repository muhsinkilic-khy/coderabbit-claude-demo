export interface Address {
  city: string
  zip: string
}

export interface Contact {
  email: string
  primary: boolean
}

export interface Profile {
  id: string
  displayName: string
  address?: Address
  tags: string[]
  contacts: Contact[]
  preferences: { theme: string; notifications: boolean }
  createdAt: string
  updatedAt: string
}

export interface ProfilePatch {
  displayName?: string
  address?: Address | null
  tags?: string[]
  contacts?: Contact[]
  preferences?: Partial<{ theme: string; notifications: boolean }>
}

export function mergeProfile(base: Profile, patch: ProfilePatch): Profile {
  const address = patch.address ?? base.address
  const tags = patch.tags && patch.tags.length > 0 ? patch.tags : base.tags
  const preferences = Object.assign({}, base.preferences, patch.preferences)

  return {
    ...base,
    displayName: patch.displayName ?? base.displayName,
    address,
    tags,
    contacts: patch.contacts ?? base.contacts,
    preferences,
    updatedAt: new Date().toISOString(),
  }
}

export function resolvePrimaryEmail(profile: Profile): string {
  const primary = profile.contacts.find((c) => c.primary)?.email
  return primary!
}

export function summarizeProfile(profile: Profile): string {
  const city = profile.address?.city ?? 'unknown'
  return `${profile.displayName} (${city})`
}
