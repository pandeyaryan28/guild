import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateInviteToken } from './validation';
import type {
  UserRole,
  UserProfile,
  Organization,
  OrganizationMember,
  OnboardingState,
  InviteLink,
} from '@guild/types';

// ─── Uniqueness Checks ────────────────────────────────────────────────────────

export async function checkUsernameUnique(username: string): Promise<boolean> {
  const ref = doc(db, 'usernames', username.toLowerCase());
  const snap = await getDoc(ref);
  return !snap.exists();
}

export async function checkOrgSlugUnique(slug: string): Promise<boolean> {
  const ref = doc(db, 'orgSlugs', slug.toLowerCase());
  const snap = await getDoc(ref);
  return !snap.exists();
}

// ─── User Operations ──────────────────────────────────────────────────────────

export async function createUser(
  uid: string,
  data: Omit<UserProfile, 'uid' | 'createdAt'>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...data,
    uid,
    createdAt: serverTimestamp(),
  });

  // Reserve username globally
  await setDoc(doc(db, 'usernames', data.username.toLowerCase()), { uid });
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

// ─── Organization Operations ──────────────────────────────────────────────────

export async function createOrganization(
  data: Omit<Organization, 'id' | 'createdAt'>
): Promise<string> {
  const orgRef = doc(collection(db, 'organizations'));
  const orgId = orgRef.id;

  await setDoc(orgRef, {
    ...data,
    id: orgId,
    createdAt: serverTimestamp(),
  });

  // Reserve org slug globally
  await setDoc(doc(db, 'orgSlugs', data.slug.toLowerCase()), { orgId });

  return orgId;
}

export async function getOrgById(orgId: string): Promise<Organization | null> {
  const snap = await getDoc(doc(db, 'organizations', orgId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: orgId } as Organization;
}

export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const slugDoc = await getDoc(doc(db, 'orgSlugs', slug.toLowerCase()));
  if (!slugDoc.exists()) return null;

  const { orgId } = slugDoc.data();
  return getOrgById(orgId);
}

// ─── Organization Members ─────────────────────────────────────────────────────

export async function addOrgMember(
  orgId: string,
  userId: string,
  role: UserRole
): Promise<void> {
  const memberRef = doc(db, 'organizationMembers', `${orgId}_${userId}`);
  await setDoc(memberRef, {
    orgId,
    userId,
    role,
    joinedAt: serverTimestamp(),
  });
}

// ─── Onboarding State ─────────────────────────────────────────────────────────

export async function setOnboardingState(
  uid: string,
  state: Partial<Omit<OnboardingState, 'uid' | 'updatedAt'>>
): Promise<void> {
  await setDoc(
    doc(db, 'onboardingState', uid),
    { uid, ...state, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getOnboardingState(uid: string): Promise<OnboardingState | null> {
  const snap = await getDoc(doc(db, 'onboardingState', uid));
  if (!snap.exists()) return null;
  return snap.data() as OnboardingState;
}

// ─── Invite Links ─────────────────────────────────────────────────────────────

export async function createInviteLink(orgId: string, createdBy: string): Promise<string> {
  const token = generateInviteToken();
  const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await setDoc(doc(db, 'inviteLinks', token), {
    token,
    orgId,
    createdBy,
    expiresAt,
    used: false,
  });

  return token;
}

export async function getInviteLinkByToken(token: string): Promise<InviteLink | null> {
  const snap = await getDoc(doc(db, 'inviteLinks', token));
  if (!snap.exists()) return null;
  return snap.data() as InviteLink;
}

export async function validateInviteToken(
  token: string
): Promise<{ valid: boolean; org: Organization | null; error?: string }> {
  const invite = await getInviteLinkByToken(token);

  if (!invite) return { valid: false, org: null, error: 'Invite link not found.' };
  if (invite.used) return { valid: false, org: null, error: 'This invite link has already been used.' };

  const now = Timestamp.now();
  if (invite.expiresAt.toMillis() < now.toMillis()) {
    return { valid: false, org: null, error: 'This invite link has expired.' };
  }

  const org = await getOrgById(invite.orgId);
  return { valid: true, org };
}

export async function markInviteUsed(token: string): Promise<void> {
  await setDoc(doc(db, 'inviteLinks', token), { used: true }, { merge: true });
}

export async function acceptInvite(uid: string, token: string, orgId: string): Promise<void> {
  // Update the user profile to be part of the organization
  await setDoc(
    doc(db, 'users', uid),
    { organizationId: orgId, role: 'member' },
    { merge: true }
  );

  // Add member record
  await addOrgMember(orgId, uid, 'member');

  // Mark token as used
  await markInviteUsed(token);

  // Mark onboarding as completed and clear path
  await setOnboardingState(uid, { completed: true, path: null, step: 4 });
}

// Re-export types
export type { UserRole, UserProfile, Organization, OrganizationMember, OnboardingState, InviteLink };
