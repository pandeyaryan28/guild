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
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { generateInviteToken, isValidEmail } from './validation';
import { seedDefaultChannels } from './chat';
import { deleteCollectionByQuery } from './firestore-helpers';
export { deleteCollectionByQuery };
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

  return orgId;
}

export async function getOrgById(orgId: string): Promise<Organization | null> {
  const snap = await getDoc(doc(db, 'organizations', orgId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: orgId } as Organization;
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

export async function createInviteLink(
  orgId: string,
  createdBy: string,
  options: { maxUses?: number | null; expiresDays?: number; email?: string; role?: UserRole } = {}
): Promise<string> {
  const token = generateInviteToken();
  const expiresDays = options.expiresDays ?? 7; // default 7 days
  const expiresAt = Timestamp.fromMillis(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

  const invite: Omit<InviteLink, 'id'> = {
    token,
    orgId,
    createdBy,
    createdAt: Timestamp.now(),
    expiresAt,
    maxUses: options.maxUses !== undefined ? options.maxUses : 5, // default 5 uses
    useCount: 0,
    isActive: true,
    role: options.role ?? 'member',
  };

  if (options.email) {
    invite.email = options.email.toLowerCase().trim();
    // For email invites, default to 1 use
    if (options.maxUses === undefined) {
      invite.maxUses = 1;
    }
  }

  await setDoc(doc(db, 'inviteLinks', token), invite);
  return token;
}

export async function revokeInviteLink(token: string): Promise<void> {
  await updateDoc(doc(db, 'inviteLinks', token), { isActive: false });
}

export async function getInviteLinkByToken(token: string): Promise<InviteLink | null> {
  const snap = await getDoc(doc(db, 'inviteLinks', token));
  if (!snap.exists()) return null;
  return snap.data() as InviteLink;
}

export async function validateInviteToken(
  token: string,
  userEmail?: string
): Promise<{ valid: boolean; org: Organization | null; error?: string; invite?: InviteLink }> {
  const invite = await getInviteLinkByToken(token);

  if (!invite) return { valid: false, org: null, error: 'Invite link not found.' };
  if (!invite.isActive) return { valid: false, org: null, error: 'This invite link has been revoked or deactivated.' };

  const now = Timestamp.now();
  if (invite.expiresAt.toMillis() < now.toMillis()) {
    return { valid: false, org: null, error: 'This invite link has expired.' };
  }

  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    return { valid: false, org: null, error: 'This invite link has reached its maximum usage limit.' };
  }

  if (invite.email) {
    if (userEmail && invite.email !== userEmail.toLowerCase().trim()) {
      return { 
        valid: false, 
        org: null, 
        error: `This invite link is reserved for ${invite.email} (you are signed in as ${userEmail}).` 
      };
    }
  }

  const org = await getOrgById(invite.orgId);
  return { valid: true, org, invite };
}

export async function getInviteLinkByEmail(email: string): Promise<InviteLink | null> {
  const q = query(
    collection(db, 'inviteLinks'),
    where('email', '==', email.toLowerCase().trim()),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const now = Date.now();
  for (const docSnap of snap.docs) {
    const invite = docSnap.data() as InviteLink;
    if (invite.expiresAt.toMillis() > now && (invite.maxUses === null || invite.useCount < invite.maxUses)) {
      return invite;
    }
  }
  return null;
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
    token,
    phoneNumber,
  } = payload;

  const lowerUsername = username.toLowerCase().trim();

  await runTransaction(db, async (transaction) => {
    // 1. Check Username uniqueness in transaction
    const usernameRef = doc(db, 'usernames', lowerUsername);
    const usernameSnap = await transaction.get(usernameRef);
    if (usernameSnap.exists()) {
      throw new Error('This username is already taken.');
    }

    let joiningRole: UserRole = 'member';

    // 2. Validate invite token if provided in transaction
    if (token) {
      const inviteRef = doc(db, 'inviteLinks', token);
      const inviteSnap = await transaction.get(inviteRef);
      if (!inviteSnap.exists()) {
        throw new Error('Invite link not found.');
      }
      const invite = inviteSnap.data() as InviteLink;

      if (!invite.isActive) {
        throw new Error('This invite link has been revoked or deactivated.');
      }
      if (invite.expiresAt.toMillis() < Date.now()) {
        throw new Error('This invite link has expired.');
      }
      if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
        throw new Error('This invite link has reached its maximum usage limit.');
      }
      if (invite.email && invite.email !== email.toLowerCase().trim()) {
        throw new Error(`This invite link is reserved for ${invite.email}`);
      }

      // Set joining role specified by invite metadata (owner can invite admins, etc.)
      joiningRole = invite.role ?? 'member';

      // Increment invite count
      transaction.update(inviteRef, {
        useCount: increment(1)
      });
    }

    // 3. Create User Profile
    const userRef = doc(db, 'users', uid);
    transaction.set(userRef, {
      uid,
      email,
      fullName,
      username: lowerUsername,
      designation,
      employeeId,
      age,
      organizationId: orgId,
      role: joiningRole,
      phoneNumber: phoneNumber ?? '',
      createdAt: Timestamp.now()
    });

    // 4. Reserve Username
    transaction.set(usernameRef, { uid });

    // 5. Add Member to Organization membership collection
    const memberRef = doc(db, 'organizationMembers', `${orgId}_${uid}`);
    transaction.set(memberRef, {
      orgId,
      userId: uid,
      role: joiningRole,
      joinedAt: Timestamp.now()
    });

    // 6. Complete onboarding state
    const onboardingRef = doc(db, 'onboardingState', uid);
    transaction.set(onboardingRef, {
      uid,
      completed: true,
      path: 'join',
      step: 4,
      updatedAt: Timestamp.now()
    });
  });
}

export async function acceptInvite(uid: string, token: string, orgId: string): Promise<void> {
  const inviteRef = doc(db, 'inviteLinks', token);
  const userRef = doc(db, 'users', uid);
  const memberRef = doc(db, 'organizationMembers', `${orgId}_${uid}`);
  const onboardingRef = doc(db, 'onboardingState', uid);

  await runTransaction(db, async (transaction) => {
    // 1. Get and validate invite link
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists()) {
      throw new Error('Invite link not found.');
    }
    const invite = inviteSnap.data() as InviteLink;

    if (!invite.isActive) {
      throw new Error('This invite link has been revoked or deactivated.');
    }
    const now = Date.now();
    if (invite.expiresAt.toMillis() < now) {
      throw new Error('This invite link has expired.');
    }
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
      throw new Error('This invite link has reached its maximum usage limit.');
    }

    // 2. Get user profile to check email match
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('User profile not found.');
    }
    const userProfile = userSnap.data() as UserProfile;
    if (invite.email && invite.email !== userProfile.email.toLowerCase().trim()) {
      throw new Error(`This invite link is reserved for ${invite.email}`);
    }

    const joiningRole = invite.role ?? 'member';

    // 3. Update invite useCount
    transaction.update(inviteRef, {
      useCount: increment(1)
    });

    // 4. Update user profile organization
    transaction.update(userRef, {
      organizationId: orgId,
      role: joiningRole
    });

    // 5. Add org member
    transaction.set(memberRef, {
      orgId,
      userId: uid,
      role: joiningRole,
      joinedAt: Timestamp.now()
    });

    // 6. Complete onboarding state
    transaction.set(onboardingRef, {
      uid,
      completed: true,
      path: 'join',
      step: 4,
      updatedAt: Timestamp.now()
    });
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
  role: UserRole,
  orgId?: string
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  let resolvedOrgId = orgId;
  if (!resolvedOrgId) {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      resolvedOrgId = userSnap.data()?.organizationId;
    }
  }

  const batch = writeBatch(db);
  batch.update(userRef, { role });

  if (resolvedOrgId) {
    const memberRef = doc(db, 'organizationMembers', `${resolvedOrgId}_${uid}`);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) {
      batch.update(memberRef, { role });
    }
  }

  await batch.commit();
}

export async function removeUserFromOrg(
  uid: string
): Promise<void> {
  const userProfile = await getUserById(uid);
  if (!userProfile) return;
  await deleteUserProfile(uid, userProfile.username, userProfile.organizationId);
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
  ownerId: string
): Promise<void> {
  const ownerProfile = await getUserById(ownerId);

  // 1. Delete all cascading collections tied directly to orgId
  
  // A. Chats & Messages
  await deleteCollectionByQuery(query(collection(db, 'messages'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'messageReplies'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'channelMembers'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'channels'), where('orgId', '==', orgId)));
  
  // B. DMs & DM Read States
  const dmSnap = await getDocs(query(collection(db, 'directMessages'), where('orgId', '==', orgId)));
  for (const dmDoc of dmSnap.docs) {
    await deleteCollectionByQuery(
      query(
        collection(db, 'dmReadState'),
        where('orgId', '==', orgId),
        where('dmId', '==', dmDoc.id)
      )
    );
  }
  await deleteCollectionByQuery(query(collection(db, 'directMessages'), where('orgId', '==', orgId)));
  
  // C. Tasks, Activities, Comments, Labels
  await deleteCollectionByQuery(query(collection(db, 'tasks'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'taskActivities'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'taskComments'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'taskLabels'), where('orgId', '==', orgId)));
  
  // D. Projects & Milestones, Project Comments
  const projectsSnap = await getDocs(query(collection(db, 'projects'), where('orgId', '==', orgId)));
  for (const projectDoc of projectsSnap.docs) {
    await deleteCollectionByQuery(
      query(
        collection(db, 'projects', projectDoc.id, 'milestones'),
        where('orgId', '==', orgId)
      )
    );
  }
  await deleteCollectionByQuery(query(collection(db, 'projects'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'projectComments'), where('orgId', '==', orgId)));
  
  // E. Goals & Goal Comments
  await deleteCollectionByQuery(query(collection(db, 'goals'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'goalComments'), where('orgId', '==', orgId)));
  
  // F. Teams, Requests, Invites, Canvases, Studio Documents
  await deleteCollectionByQuery(query(collection(db, 'teams'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'requests'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'inviteLinks'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'pendingInvites'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'canvases'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'workspaceDocuments'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'workspaceCycles'), where('orgId', '==', orgId)));
  await deleteCollectionByQuery(query(collection(db, 'workspaceIssues'), where('orgId', '==', orgId)));
  
  // G. Owner's own notifications in the org (security rules restrict other users' notifications)
  await deleteCollectionByQuery(
    query(
      collection(db, 'notifications'), 
      where('orgId', '==', orgId), 
      where('recipientId', '==', ownerId)
    )
  );

  // 2. Fetch all members (excluding owner) to delete their profiles fully
  const membersSnap = await getDocs(query(collection(db, 'organizationMembers'), where('orgId', '==', orgId)));
  const memberIds = membersSnap.docs
    .map((d) => d.data().userId as string)
    .filter((uid) => uid !== ownerId);

  for (const memberId of memberIds) {
    try {
      // Get the profile to retrieve the username for deletion
      const userProfile = await getUserById(memberId);
      if (userProfile && userProfile.username) {
        await deleteUserProfile(memberId, userProfile.username, orgId);
      }
    } catch (err) {
      console.error(`Failed to delete member profile for user ${memberId}:`, err);
    }
  }

  // 3. Delete the organizationMembers entries
  await deleteCollectionByQuery(query(collection(db, 'organizationMembers'), where('orgId', '==', orgId)));

  // 4. Delete the organization document itself
  await deleteDoc(doc(db, 'organizations', orgId));

  // 6. Delete the owner's profile fully (including users, usernames, onboardingState)
  if (ownerProfile && ownerProfile.username) {
    await deleteUserProfile(ownerId, ownerProfile.username, orgId);
  }
}

export async function transferOrgOwnership(
  orgId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', newOwnerId), { role: 'owner' });
  batch.update(doc(db, 'users', currentOwnerId), { role: 'admin' });
  batch.set(
    doc(db, 'organizationMembers', `${orgId}_${newOwnerId}`),
    { orgId, userId: newOwnerId, role: 'owner' },
    { merge: true }
  );
  batch.set(
    doc(db, 'organizationMembers', `${orgId}_${currentOwnerId}`),
    { orgId, userId: currentOwnerId, role: 'admin' },
    { merge: true }
  );
  batch.update(doc(db, 'organizations', orgId), { ownerId: newOwnerId });
  await batch.commit();
}

export async function deleteUserProfile(
  uid: string,
  username: string,
  organizationId?: string
): Promise<void> {
  // 0. Write a ban record FIRST (while the caller is still authenticated as
  //    an admin — needed for the Firestore security rule write check).
  //    This blocks the deleted user's active sessions client-side immediately.
  try {
    await setDoc(doc(db, 'bannedUsers', uid), {
      uid,
      bannedAt: Timestamp.now(),
      reason: 'removed_by_admin',
    });
  } catch (err) {
    // Non-fatal — continue with profile deletion even if this fails
    console.warn(`Could not write bannedUsers record for ${uid}:`, err);
  }

  // 0b. Disable the Firebase Auth account server-side so the user cannot log in
  //     again even in a fresh browser session.
  try {
    const idToken = await auth.currentUser?.getIdToken();
    await fetch('/api/disable-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ uid }),
    });
  } catch (err) {
    // Non-fatal — the bannedUsers doc provides client-side coverage
    console.warn(`Could not disable Firebase Auth for ${uid}:`, err);
  }

  // 1. Clean up workspace associations FIRST while user profile & org membership still exist for security rules
  if (organizationId) {
    // 1a. Clean up channel memberships scoped by orgId
    try {
      await deleteCollectionByQuery(
        query(
          collection(db, 'channelMembers'),
          where('orgId', '==', organizationId),
          where('userId', '==', uid)
        )
      );
    } catch (err) {
      console.error(`Failed to clean up channelMembers for user ${uid}:`, err);
    }

    // 1b. Clean up teams in the organization (remove from memberIds, clear managerId if matches)
    try {
      const teamsSnap = await getDocs(
        query(collection(db, 'teams'), where('orgId', '==', organizationId))
      );
      for (const teamDoc of teamsSnap.docs) {
        const teamData = teamDoc.data();
        const memberIds = teamData.memberIds || [];
        if (memberIds.includes(uid) || teamData.managerId === uid) {
          const newMemberIds = memberIds.filter((id: string) => id !== uid);
          const patch: Record<string, any> = { memberIds: newMemberIds };
          if (teamData.managerId === uid) {
            patch.managerId = '';
          }
          await updateDoc(doc(db, 'teams', teamDoc.id), patch);
        }
      }
    } catch (err) {
      console.error(`Failed to clean up teams for user ${uid}:`, err);
    }

    // 1c. Clean up projects in the organization (remove from memberIds, reassign ownerId if matches)
    try {
      const orgRef = doc(db, 'organizations', organizationId);
      const orgSnap = await getDoc(orgRef);
      const orgOwnerId = orgSnap.exists() ? (orgSnap.data()?.ownerId || '') : '';

      const projectsSnap = await getDocs(
        query(collection(db, 'projects'), where('orgId', '==', organizationId))
      );
      for (const projDoc of projectsSnap.docs) {
        const projData = projDoc.data();
        const memberIds = projData.memberIds || [];
        if (memberIds.includes(uid) || projData.ownerId === uid) {
          const newMemberIds = memberIds.filter((id: string) => id !== uid);
          const patch: Record<string, any> = { memberIds: newMemberIds };
          if (projData.ownerId === uid) {
            patch.ownerId = orgOwnerId;
          }
          await updateDoc(doc(db, 'projects', projDoc.id), patch);
        }
      }
    } catch (err) {
      console.error(`Failed to clean up projects for user ${uid}:`, err);
    }

    // 1d. Unassign user from active tasks in the organization
    try {
      const tasksSnap = await getDocs(
        query(
          collection(db, 'tasks'),
          where('orgId', '==', organizationId),
          where('assigneeIds', 'array-contains', uid)
        )
      );
      for (const taskDoc of tasksSnap.docs) {
        const taskData = taskDoc.data();
        const assigneeIds: string[] = (taskData.assigneeIds || []).filter((id: string) => id !== uid);
        await updateDoc(taskDoc.ref, { assigneeIds });
      }
    } catch (err) {
      console.error(`Failed to unassign tasks for user ${uid}:`, err);
    }

    // 1e. Delete organizationMembers record
    try {
      await deleteDoc(doc(db, 'organizationMembers', `${organizationId}_${uid}`));
    } catch (err) {
      console.error(`Failed to delete organizationMember for user ${uid}:`, err);
    }
  }

  // 2. Clear the onboarding state history (while users profile still exists for security rules checks)
  try {
    await deleteDoc(doc(db, 'onboardingState', uid));
  } catch (err) {
    console.warn(`Could not delete onboardingState for ${uid}:`, err);
  }

  // 3. Release the globally unique username handle
  if (username) {
    try {
      await deleteDoc(doc(db, 'usernames', username.toLowerCase()));
    } catch (err) {
      console.warn(`Could not release username ${username}:`, err);
    }
  }

  // 4. Delete user profile document LAST
  await deleteDoc(doc(db, 'users', uid));
}


export interface OwnerOnboardingPayload {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  designation: string;
  employeeId: string;
  age: number;
  phoneNumber?: string;
  orgName: string;
  orgIndustry: string;
  orgSize: string;
  domainAutoJoin?: boolean;
  emailDomain?: string;
  inviteEmails?: string;
  inviteToken?: string;
}

export async function executeOwnerOnboardingCreate(payload: OwnerOnboardingPayload): Promise<{ orgId: string; inviteToken: string }> {
  const {
    uid,
    email,
    fullName,
    username,
    designation,
    employeeId,
    age,
    phoneNumber,
    orgName,
    orgIndustry,
    orgSize,
    domainAutoJoin,
    emailDomain,
    inviteEmails,
    inviteToken: providedInviteToken,
  } = payload;

  const orgRef = doc(collection(db, 'organizations'));
  const orgId = orgRef.id;
  const inviteToken = providedInviteToken?.trim() || generateInviteToken();

  const batch = writeBatch(db);

  // 1. Create Organization
  batch.set(orgRef, {
    id: orgId,
    name: orgName.trim(),
    industry: orgIndustry,
    companySize: orgSize,
    ownerId: uid,
    domainAutoJoin: !!domainAutoJoin,
    emailDomain: emailDomain ? emailDomain.toLowerCase().trim() : '',
    createdAt: serverTimestamp(),
  });

  // 2. Create User Profile
  const userRef = doc(db, 'users', uid);
  batch.set(userRef, {
    uid,
    email,
    fullName: fullName.trim(),
    username: username.toLowerCase(),
    designation: designation.trim(),
    employeeId: employeeId.trim(),
    age,
    organizationId: orgId,
    role: 'owner',
    phoneNumber: phoneNumber?.trim() ?? '',
    createdAt: serverTimestamp(),
  });

  // 3. Reserve Username Globally
  batch.set(doc(db, 'usernames', username.toLowerCase()), { uid });

  // 4. Add Member Record
  batch.set(doc(db, 'organizationMembers', `${orgId}_${uid}`), {
    orgId,
    userId: uid,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  // 5. Create Invite Link (general link for the org)
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  batch.set(doc(db, 'inviteLinks', inviteToken), {
    token: inviteToken,
    orgId,
    createdBy: uid,
    createdAt: Timestamp.now(),
    expiresAt,
    maxUses: 25,
    useCount: 0,
    isActive: true,
    role: 'member',
  });

  // 6. Complete onboarding journey
  batch.set(doc(db, 'onboardingState', uid), {
    uid,
    completed: true,
    path: 'create',
    step: 4,
    updatedAt: serverTimestamp(),
  });

  // Commit batch write
  await batch.commit();

  // 7. Seed default channels (async)
  await seedDefaultChannels(orgId, uid, orgIndustry);

  // 8. Process direct email invitations if specified
  if (inviteEmails?.trim()) {
    const emailList = inviteEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => isValidEmail(e));
    
    const invitePromises = emailList.map((e) => 
      createInviteLink(orgId, uid, { email: e, role: 'member' })
    );
    await Promise.all(invitePromises);
  }

  return { orgId, inviteToken };
}

export async function findOrgByAutoJoinDomain(domain: string): Promise<Organization | null> {
  const q = query(
    collection(db, 'organizations'),
    where('domainAutoJoin', '==', true),
    where('emailDomain', '==', domain.toLowerCase().trim())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { ...snap.docs[0].data(), id: snap.docs[0].id } as Organization;
}

// Re-export types
export type { UserRole, UserProfile, Organization, OrganizationMember, OnboardingState, InviteLink };
