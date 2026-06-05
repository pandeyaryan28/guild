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
  updateDoc,
  deleteDoc,
  increment,
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
  PendingEmailInvite,
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

export async function createInviteLink(orgId: string, createdBy: string, isGlobal = false): Promise<string> {
  const token = generateInviteToken();
  const expiresAt = isGlobal 
    ? Timestamp.fromMillis(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 years for global
    : Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for single-use

  await setDoc(doc(db, 'inviteLinks', token), {
    token,
    orgId,
    createdBy,
    expiresAt,
    used: false,
    isGlobal,
    usageCount: 0,
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
  if (!invite.isGlobal && invite.used) return { valid: false, org: null, error: 'This invite link has already been used.' };

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
  // Backwards compatibility layer
  await setDoc(
    doc(db, 'users', uid),
    { organizationId: orgId, role: 'member' },
    { merge: true }
  );
  await addOrgMember(orgId, uid, 'member');
  await markInviteUsed(token);
  await setOnboardingState(uid, { completed: true, path: null, step: 4 });
}

// ─── Direct Email Invitation Logic ───────────────────────────────────────────

export async function createPendingEmailInvite(
  email: string,
  orgId: string,
  role: UserRole,
  invitedBy: string
): Promise<string> {
  const token = generateInviteToken();
  const ref = doc(db, 'pendingInvites', `${orgId}_${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`);
  await setDoc(ref, {
    email: email.toLowerCase().trim(),
    orgId,
    role,
    invitedBy,
    token,
    createdAt: serverTimestamp(),
  });
  return token;
}

export async function getPendingInviteByEmail(email: string): Promise<PendingEmailInvite | null> {
  const q = query(
    collection(db, 'pendingInvites'),
    where('email', '==', email.toLowerCase().trim())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as PendingEmailInvite;
}

// ─── Global Multi-Use Invite Links ────────────────────────────────────────────

export async function createGlobalInviteLink(orgId: string, createdBy: string): Promise<string> {
  const token = await createInviteLink(orgId, createdBy, true);
  await updateDoc(doc(db, 'organizations', orgId), {
    globalInviteToken: token,
  });
  return token;
}

export async function getOrCreateGlobalInviteLink(orgId: string, createdBy: string): Promise<string> {
  const org = await getOrgById(orgId);
  if (org?.globalInviteToken) {
    const snap = await getDoc(doc(db, 'inviteLinks', org.globalInviteToken));
    if (snap.exists()) {
      return org.globalInviteToken;
    }
  }
  return createGlobalInviteLink(orgId, createdBy);
}

export async function resetGlobalInviteLink(orgId: string, createdBy: string): Promise<string> {
  const org = await getOrgById(orgId);
  if (org?.globalInviteToken) {
    await deleteDoc(doc(db, 'inviteLinks', org.globalInviteToken));
  }
  return createGlobalInviteLink(orgId, createdBy);
}

export async function disableGlobalInviteLink(orgId: string): Promise<void> {
  const org = await getOrgById(orgId);
  if (org?.globalInviteToken) {
    await deleteDoc(doc(db, 'inviteLinks', org.globalInviteToken));
  }
  await updateDoc(doc(db, 'organizations', orgId), {
    globalInviteToken: '',
  });
}


// ─── Member Custom Join Transaction ───────────────────────────────────────────

export interface AcceptInvitePayload {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  designation: string;
  employeeId: string;
  age: number;
  orgId: string;
  role: UserRole;
  token?: string;
  isGlobal?: boolean;
  phoneNumber?: string;
}

export async function executeMemberOnboardingJoin(payload: AcceptInvitePayload): Promise<void> {
  const {
    uid,
    email,
    fullName,
    username,
    designation,
    employeeId,
    age,
    orgId,
    role,
    token,
    isGlobal,
    phoneNumber,
  } = payload;

  // 1. Transactionally write User Profile
  await createUser(uid, {
    email,
    fullName,
    username: username.toLowerCase(),
    designation,
    employeeId,
    age,
    organizationId: orgId,
    role,
    phoneNumber: phoneNumber ?? '',
  });

  // 2. Add member record
  await addOrgMember(orgId, uid, role);

  // 3. Mark/increment token
  if (token) {
    if (isGlobal) {
      await updateDoc(doc(db, 'inviteLinks', token), {
        usageCount: increment(1)
      });
    } else {
      await markInviteUsed(token);
    }
  }

  // 4. Delete matching direct email invite
  try {
    const q = query(
      collection(db, 'pendingInvites'),
      where('email', '==', email.toLowerCase().trim()),
      where('orgId', '==', orgId)
    );
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Failed to clean up pending direct email invites:', err);
  }

  // 5. Complete onboarding journey
  await setOnboardingState(uid, {
    completed: true,
    path: 'join',
    step: 4,
  });
}

// ─── Settings / Role Operations ──────────────────────────────────────────────

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}

export async function updateUserRole(
  uid: string,
  role: UserRole
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { role });
}

export async function removeUserFromOrg(
  uid: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { organizationId: '', role: 'member' });
}

export async function updateOrganizationDetails(
  orgId: string,
  data: Partial<Omit<Organization, 'id' | 'createdAt'>>
): Promise<void> {
  const orgRef = doc(db, 'organizations', orgId);
  await updateDoc(orgRef, data);
}

export async function deleteOrganization(
  orgId: string,
  slug: string,
  ownerId: string
): Promise<void> {
  // 1. Delete the organization document
  await deleteDoc(doc(db, 'organizations', orgId));

  // 2. Release the globally reserved URL slug
  await deleteDoc(doc(db, 'orgSlugs', slug.toLowerCase()));

  // 3. Reset the owner's profile to clear workspace references and role
  const userRef = doc(db, 'users', ownerId);
  await updateDoc(userRef, {
    organizationId: '',
    role: 'member'
  });

  // 4. Reset onboarding state for the owner so they go back to the setup track
  const onboardingRef = doc(db, 'onboardingState', ownerId);
  await setDoc(onboardingRef, {
    uid: ownerId,
    completed: false,
    step: 1,
    path: null,
    updatedAt: serverTimestamp()
  });

  // 5. Clean up organizationMembers entry for the owner
  await deleteDoc(doc(db, 'organizationMembers', `${orgId}_${ownerId}`));
}

export async function revokeInviteLink(
  token: string
): Promise<void> {
  await deleteDoc(doc(db, 'inviteLinks', token));
}

export async function transferOrgOwnership(
  orgId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  await updateDoc(doc(db, 'users', newOwnerId), { role: 'owner' });
  await updateDoc(doc(db, 'users', currentOwnerId), { role: 'admin' });
  await updateDoc(doc(db, 'organizations', orgId), { ownerId: newOwnerId });
}

export async function deleteUserProfile(
  uid: string,
  username: string,
  organizationId?: string
): Promise<void> {
  // 1. Delete user profile document
  await deleteDoc(doc(db, 'users', uid));

  // 2. Release the globally unique username handle
  await deleteDoc(doc(db, 'usernames', username.toLowerCase()));

  // 3. Clear the onboarding state history
  await deleteDoc(doc(db, 'onboardingState', uid));

  // 4. Clean up workspace members association if user was part of an organization
  if (organizationId) {
    await deleteDoc(doc(db, 'organizationMembers', `${organizationId}_${uid}`));
  }
}


// Re-export types
export type { UserRole, UserProfile, Organization, OrganizationMember, OnboardingState, InviteLink };
