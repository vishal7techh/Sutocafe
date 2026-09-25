import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type {
  RewardCampaign,
  RewardActivity,
  CustomerRewardState,
  RewardVerificationRequest,
  RewardStampHistory,
  RewardRedemption,
  RewardActivityType,
} from "../types";

const LOCAL_CAMPAIGN_KEY = "suto_cafe_reward_campaign_v2";
const LOCAL_ACTIVITIES_KEY = "suto_cafe_reward_activities_v2";
const LOCAL_CUSTOMER_REWARDS_KEY = "suto_cafe_customer_rewards_v2";
const LOCAL_REQUESTS_KEY = "suto_cafe_reward_requests_v2";
const LOCAL_STAMP_HISTORY_KEY = "suto_cafe_stamp_history_v2";
const LOCAL_REDEMPTIONS_KEY = "suto_cafe_reward_redemptions_v2";

export const DEFAULT_CAMPAIGN: RewardCampaign = {
  id: "01000000-0000-0000-0000-000000000001",
  name: "Free Thick Cold Coffee",
  description: "Get one free Thick Cold Coffee after completing 5 verified visits.",
  requiredVisits: 5,
  expiryDate: "2026-12-31T23:59:59.000Z",
  isActive: true,
};

export const DEFAULT_ACTIVITIES: RewardActivity[] = [
  {
    id: "act-1",
    rewardId: "01000000-0000-0000-0000-000000000001",
    visitNumber: 1,
    activityType: "GOOGLE_REVIEW",
    title: "Review SUTO CAFE on Google",
    description: "Complete your food order, tap the button below to open Google Review, complete your review, return here and request verification.",
    externalUrl: "https://share.google/HSgxbWEc0vuncBI9U",
    isActive: true,
  },
  {
    id: "act-2",
    rewardId: "01000000-0000-0000-0000-000000000001",
    visitNumber: 2,
    activityType: "INSTAGRAM_FOLLOW",
    title: "Follow SUTO CAFE on Instagram",
    description: "Complete your food order, tap the button to follow @sutocafe_nagpur on Instagram, return here and request verification.",
    externalUrl: "https://www.instagram.com/sutocafe_nagpur/",
    isActive: true,
  },
  {
    id: "act-3",
    rewardId: "01000000-0000-0000-0000-000000000001",
    visitNumber: 3,
    activityType: "INSTAGRAM_STORY",
    title: "Instagram Story Challenge",
    description: "Create an Instagram Story, tag @sutocafe_nagpur, publish it, return here and request verification.",
    externalUrl: "https://www.instagram.com/sutocafe_nagpur/",
    isActive: true,
  },
  {
    id: "act-4",
    rewardId: "01000000-0000-0000-0000-000000000001",
    visitNumber: 4,
    activityType: "VISIT_VERIFICATION",
    title: "Keep Visiting SUTO CAFE",
    description: "Complete your order during this visit and request your digital visit stamp. Our team will verify your visit.",
    isActive: true,
  },
];

/** Clean and normalize Indian mobile phone numbers */
export function normalizePhone(phone: string): string {
  if (!phone) return "";
  let clean = phone.trim().replace(/[\s-]/g, "");
  if (clean.startsWith("+91")) clean = clean.slice(3);
  else if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);
  else if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);
  return clean;
}

/* Local storage helpers */
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota error
  }
}

// ============================================================
// 1. REWARD CAMPAIGN & ACTIVITIES API
// ============================================================

export async function fetchActiveRewardCampaign(): Promise<{
  campaign: RewardCampaign;
  activities: RewardActivity[];
}> {
  const localCampaign = getLocalItem<RewardCampaign>(LOCAL_CAMPAIGN_KEY, DEFAULT_CAMPAIGN);
  const localActivities = getLocalItem<RewardActivity[]>(LOCAL_ACTIVITIES_KEY, DEFAULT_ACTIVITIES);

  if (!isSupabaseConfigured || !supabase) {
    return { campaign: localCampaign, activities: localActivities };
  }

  try {
    const { data: campaignRows, error: campErr } = await supabase
      .from("rewards")
      .select("*")
      .eq("is_active", true)
      .limit(1);

    if (campErr || !campaignRows || campaignRows.length === 0) {
      return { campaign: localCampaign, activities: localActivities };
    }

    const row = campaignRows[0];
    const fetchedCampaign: RewardCampaign = {
      id: row.id,
      name: row.name,
      description: row.description,
      requiredVisits: Number(row.required_visits),
      expiryDate: row.expiry_date,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const { data: activityRows, error: actErr } = await supabase
      .from("reward_activities")
      .select("*")
      .eq("reward_id", fetchedCampaign.id)
      .order("visit_number", { ascending: true });

    let fetchedActivities = localActivities;
    if (!actErr && activityRows && activityRows.length > 0) {
      fetchedActivities = activityRows.map((a) => ({
        id: a.id,
        rewardId: a.reward_id,
        visitNumber: Number(a.visit_number),
        activityType: a.activity_type as RewardActivityType,
        title: a.title,
        description: a.description,
        externalUrl: a.external_url,
        isActive: a.is_active,
      }));
    }

    setLocalItem(LOCAL_CAMPAIGN_KEY, fetchedCampaign);
    setLocalItem(LOCAL_ACTIVITIES_KEY, fetchedActivities);

    return { campaign: fetchedCampaign, activities: fetchedActivities };
  } catch (err) {
    console.error("Exception fetching reward campaign:", err);
    return { campaign: localCampaign, activities: localActivities };
  }
}

export async function saveRewardCampaign(
  campaign: Partial<RewardCampaign>,
  activities?: RewardActivity[]
): Promise<boolean> {
  const current = getLocalItem<RewardCampaign>(LOCAL_CAMPAIGN_KEY, DEFAULT_CAMPAIGN);
  const updatedCampaign: RewardCampaign = {
    ...current,
    ...campaign,
    id: current.id || campaign.id || "01000000-0000-0000-0000-000000000001",
    updatedAt: new Date().toISOString(),
  };

  setLocalItem(LOCAL_CAMPAIGN_KEY, updatedCampaign);
  if (activities) {
    setLocalItem(LOCAL_ACTIVITIES_KEY, activities);
  }

  if (!isSupabaseConfigured || !supabase) return true;

  try {
    const { error: campErr } = await supabase.from("rewards").upsert({
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      description: updatedCampaign.description,
      required_visits: updatedCampaign.requiredVisits,
      expiry_date: updatedCampaign.expiryDate,
      is_active: updatedCampaign.isActive,
      updated_at: new Date().toISOString(),
    });

    if (campErr) {
      console.error("Error upserting reward campaign:", campErr);
    }

    if (activities && activities.length > 0) {
      const dbActivities = activities.map((a) => ({
        id: a.id.startsWith("act-") ? undefined : a.id,
        reward_id: updatedCampaign.id,
        visit_number: a.visitNumber,
        activity_type: a.activityType,
        title: a.title,
        description: a.description,
        external_url: a.externalUrl || null,
        is_active: a.isActive,
      }));

      await supabase.from("reward_activities").upsert(dbActivities);
    }

    return true;
  } catch (err) {
    console.error("Exception saving reward campaign:", err);
    return false;
  }
}

// ============================================================
// 2. CUSTOMER REWARD PROFILE API
// ============================================================

export async function fetchCustomerRewardProfile(phone: string): Promise<{
  profile: CustomerRewardState;
  activeRequest?: RewardVerificationRequest;
  stampHistory: RewardStampHistory[];
  allRequests: RewardVerificationRequest[];
}> {
  const clean = normalizePhone(phone);
  const defaultProfile: CustomerRewardState = {
    customerPhone: clean,
    rewardId: DEFAULT_CAMPAIGN.id,
    currentVisitCount: 0,
    currentStampCount: 0,
    cycleNumber: 1,
    status: "ACTIVE",
  };

  if (!clean) {
    return { profile: defaultProfile, stampHistory: [], allRequests: [] };
  }

  // Check local cache
  const localProfiles = getLocalItem<CustomerRewardState[]>(LOCAL_CUSTOMER_REWARDS_KEY, []);
  let matchedProfile = localProfiles.find((p) => normalizePhone(p.customerPhone) === clean) || defaultProfile;

  const localRequests = getLocalItem<RewardVerificationRequest[]>(LOCAL_REQUESTS_KEY, []);
  const matchedRequests = localRequests.filter((r) => normalizePhone(r.customerPhone) === clean);
  const activeReq = matchedRequests.find((r) => r.requestStatus === "PENDING");

  const localHistory = getLocalItem<RewardStampHistory[]>(LOCAL_STAMP_HISTORY_KEY, []);
  const matchedHistory = localHistory.filter((h) => normalizePhone(h.customerPhone) === clean);

  if (!isSupabaseConfigured || !supabase) {
    return {
      profile: matchedProfile,
      activeRequest: activeReq,
      stampHistory: matchedHistory,
      allRequests: matchedRequests,
    };
  }

  try {
    // 1. Fetch customer_rewards row
    const { data: dbProfiles, error: profErr } = await supabase
      .from("customer_rewards")
      .select("*")
      .or(`customer_phone.eq.${clean},customer_phone.eq.+91${clean},customer_phone.eq.91${clean},customer_phone.eq.0${clean}`)
      .limit(1);

    if (!profErr && dbProfiles && dbProfiles.length > 0) {
      const p = dbProfiles[0];
      matchedProfile = {
        id: p.id,
        customerPhone: p.customer_phone,
        customerName: p.customer_name,
        rewardId: p.reward_id || DEFAULT_CAMPAIGN.id,
        currentVisitCount: Number(p.current_visit_count || 0),
        currentStampCount: Number(p.current_stamp_count || 0),
        cycleNumber: Number(p.cycle_number || 1),
        status: p.status || "ACTIVE",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    }

    // 2. Fetch requests for this customer
    const { data: dbRequests } = await supabase
      .from("reward_verification_requests")
      .select("*")
      .or(`customer_phone.eq.${clean},customer_phone.eq.+91${clean},customer_phone.eq.91${clean},customer_phone.eq.0${clean}`)
      .order("submitted_at", { ascending: false });

    let fetchedRequests: RewardVerificationRequest[] = matchedRequests;
    if (dbRequests && dbRequests.length > 0) {
      fetchedRequests = dbRequests.map((r) => ({
        id: r.id,
        customerPhone: r.customer_phone,
        customerName: r.customer_name || "",
        rewardId: r.reward_id || DEFAULT_CAMPAIGN.id,
        orderId: r.order_id || undefined,
        visitNumber: Number(r.visit_number),
        cycleNumber: Number(r.cycle_number || 1),
        activityType: r.activity_type as RewardActivityType,
        requestStatus: r.request_status,
        rejectionReason: r.rejection_reason,
        submittedAt: r.submitted_at,
        verifiedAt: r.verified_at,
        verifiedBy: r.verified_by,
      }));
    }

    // 3. Fetch stamp history for this customer
    const { data: dbHistory } = await supabase
      .from("reward_stamp_history")
      .select("*")
      .or(`customer_phone.eq.${clean},customer_phone.eq.+91${clean},customer_phone.eq.91${clean},customer_phone.eq.0${clean}`)
      .order("created_at", { ascending: false });

    let fetchedHistory: RewardStampHistory[] = matchedHistory;
    if (dbHistory && dbHistory.length > 0) {
      fetchedHistory = dbHistory.map((h) => ({
        id: h.id,
        customerPhone: h.customer_phone,
        rewardId: h.reward_id || DEFAULT_CAMPAIGN.id,
        orderId: h.order_id || undefined,
        requestId: h.request_id || undefined,
        visitNumber: Number(h.visit_number),
        stampNumber: Number(h.stamp_number),
        cycleNumber: Number(h.cycle_number || 1),
        action: h.action,
        approvedBy: h.approved_by,
        createdAt: h.created_at,
      }));
    }

    const fetchedActiveReq = fetchedRequests.find(
      (r) => r.requestStatus === "PENDING" && r.cycleNumber === matchedProfile.cycleNumber
    );

    // Sync local storage
    const updatedProfiles = [
      matchedProfile,
      ...localProfiles.filter((p) => normalizePhone(p.customerPhone) !== clean),
    ];
    setLocalItem(LOCAL_CUSTOMER_REWARDS_KEY, updatedProfiles);

    return {
      profile: matchedProfile,
      activeRequest: fetchedActiveReq,
      stampHistory: fetchedHistory,
      allRequests: fetchedRequests,
    };
  } catch (err) {
    console.error("Exception fetching customer reward profile:", err);
    return {
      profile: matchedProfile,
      activeRequest: activeReq,
      stampHistory: matchedHistory,
      allRequests: matchedRequests,
    };
  }
}

// ============================================================
// 3. SUBMIT REWARD VERIFICATION REQUEST
// ============================================================

export async function submitRewardVerificationRequest(params: {
  customerPhone: string;
  customerName: string;
  rewardId: string;
  orderId?: string;
  visitNumber: number;
  cycleNumber: number;
  activityType: RewardActivityType;
}): Promise<{ success: boolean; message?: string; request?: RewardVerificationRequest }> {
  const cleanPhone = normalizePhone(params.customerPhone);
  if (!cleanPhone) {
    return { success: false, message: "Please provide a valid phone number." };
  }

  // 1. Fetch current customer profile & existing requests
  const { profile, activeRequest, allRequests } = await fetchCustomerRewardProfile(cleanPhone);

  // Check if there is already a PENDING request
  if (activeRequest) {
    return {
      success: false,
      message: "You already have a pending verification request. Please wait for Admin approval.",
      request: activeRequest,
    };
  }

  // Check if this visit was already APPROVED in the current cycle
  const existingApproved = allRequests.find(
    (r) =>
      r.cycleNumber === params.cycleNumber &&
      r.visitNumber === params.visitNumber &&
      r.requestStatus === "APPROVED"
  );
  if (existingApproved) {
    return {
      success: false,
      message: `Visit ${params.visitNumber} stamp has already been verified and awarded!`,
    };
  }

  const newRequest: RewardVerificationRequest = {
    id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    customerPhone: cleanPhone,
    customerName: params.customerName || "Customer",
    rewardId: params.rewardId || DEFAULT_CAMPAIGN.id,
    orderId: params.orderId,
    visitNumber: params.visitNumber,
    cycleNumber: params.cycleNumber,
    activityType: params.activityType,
    requestStatus: "PENDING",
    submittedAt: new Date().toISOString(),
  };

  // Save to Local Storage cache
  const localRequests = getLocalItem<RewardVerificationRequest[]>(LOCAL_REQUESTS_KEY, []);
  setLocalItem(LOCAL_REQUESTS_KEY, [newRequest, ...localRequests]);

  // Ensure Customer Rewards Profile exists locally
  const localProfiles = getLocalItem<CustomerRewardState[]>(LOCAL_CUSTOMER_REWARDS_KEY, []);
  if (!localProfiles.some((p) => normalizePhone(p.customerPhone) === cleanPhone)) {
    setLocalItem(LOCAL_CUSTOMER_REWARDS_KEY, [
      ...localProfiles,
      {
        customerPhone: cleanPhone,
        customerName: params.customerName,
        rewardId: params.rewardId || DEFAULT_CAMPAIGN.id,
        currentVisitCount: params.visitNumber - 1,
        currentStampCount: profile.currentStampCount,
        cycleNumber: params.cycleNumber,
        status: "ACTIVE",
      },
    ]);
  }

  if (!isSupabaseConfigured || !supabase) {
    return { success: true, request: newRequest };
  }

  try {
    // Upsert customer profile first
    await supabase.from("customer_rewards").upsert(
      {
        customer_phone: cleanPhone,
        customer_name: params.customerName,
        reward_id: params.rewardId || DEFAULT_CAMPAIGN.id,
        current_visit_count: profile.currentVisitCount,
        current_stamp_count: profile.currentStampCount,
        cycle_number: params.cycleNumber,
        status: profile.status || "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_phone" }
    );

    // Insert verification request
    const { data: reqRows, error: reqErr } = await supabase
      .from("reward_verification_requests")
      .insert({
        customer_phone: cleanPhone,
        customer_name: params.customerName,
        reward_id: params.rewardId || DEFAULT_CAMPAIGN.id,
        order_id: params.orderId || null,
        visit_number: params.visitNumber,
        cycle_number: params.cycleNumber,
        activity_type: params.activityType,
        request_status: "PENDING",
        submitted_at: newRequest.submittedAt,
      })
      .select("id");

    if (reqErr) {
      console.error("Error inserting reward verification request into Supabase:", reqErr);
      // Fallback: still return success locally so UI is non-blocking
    } else if (reqRows && reqRows[0]?.id) {
      newRequest.id = reqRows[0].id;
    }

    return { success: true, request: newRequest };
  } catch (err) {
    console.error("Exception submitting reward request:", err);
    return { success: true, request: newRequest };
  }
}

// ============================================================
// 4. ADMIN REWARD REQUEST MANAGEMENT & APPROVAL / REJECTION
// ============================================================

export async function fetchAllRewardRequests(): Promise<RewardVerificationRequest[]> {
  const localRequests = getLocalItem<RewardVerificationRequest[]>(LOCAL_REQUESTS_KEY, []);

  if (!isSupabaseConfigured || !supabase) {
    return localRequests;
  }

  try {
    const { data: dbRequests, error } = await supabase
      .from("reward_verification_requests")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error || !dbRequests) {
      return localRequests;
    }

    const fetched: RewardVerificationRequest[] = dbRequests.map((r) => ({
      id: r.id,
      customerPhone: r.customer_phone,
      customerName: r.customer_name || "Customer",
      rewardId: r.reward_id || DEFAULT_CAMPAIGN.id,
      orderId: r.order_id || undefined,
      visitNumber: Number(r.visit_number),
      cycleNumber: Number(r.cycle_number || 1),
      activityType: r.activity_type as RewardActivityType,
      requestStatus: r.request_status,
      rejectionReason: r.rejection_reason,
      submittedAt: r.submitted_at,
      verifiedAt: r.verified_at,
      verifiedBy: r.verified_by,
    }));

    // Merge with local requests
    const map = new Map<string, RewardVerificationRequest>();
    localRequests.forEach((r) => map.set(r.id, r));
    fetched.forEach((r) => map.set(r.id, r));

    const merged = Array.from(map.values()).sort((a, b) => (b.submittedAt > a.submittedAt ? 1 : -1));
    setLocalItem(LOCAL_REQUESTS_KEY, merged);
    return merged;
  } catch (err) {
    console.error("Exception fetching reward requests:", err);
    return localRequests;
  }
}

export async function approveRewardRequest(
  requestId: string,
  adminName = "Admin"
): Promise<{ success: boolean; message?: string; updatedProfile?: CustomerRewardState }> {
  const allRequests = await fetchAllRewardRequests();
  const req = allRequests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, message: "Reward request not found." };
  }

  if (req.requestStatus === "APPROVED") {
    return { success: false, message: "This request has already been approved." };
  }

  const cleanPhone = normalizePhone(req.customerPhone);

  // Get active campaign to check required visits threshold
  const { campaign } = await fetchActiveRewardCampaign();
  const requiredVisits = campaign.requiredVisits || 5;

  // Get customer profile
  const { profile } = await fetchCustomerRewardProfile(cleanPhone);


  // Calculate new stamp count and new visit count
  const newStampCount = profile.currentStampCount + 1;
  const newVisitCount = Math.max(profile.currentVisitCount, req.visitNumber);
  const isUnlocked = newStampCount >= requiredVisits;
  const newStatus = isUnlocked ? "UNLOCKED" : "ACTIVE";

  const nowIso = new Date().toISOString();

  // 1. Update Request
  req.requestStatus = "APPROVED";
  req.verifiedAt = nowIso;
  req.verifiedBy = adminName;

  // 2. Update Profile
  const updatedProfile: CustomerRewardState = {
    ...profile,
    customerPhone: cleanPhone,
    customerName: req.customerName || profile.customerName,
    rewardId: campaign.id,
    currentVisitCount: newVisitCount,
    currentStampCount: newStampCount,
    cycleNumber: req.cycleNumber,
    status: newStatus,
    updatedAt: nowIso,
  };

  // 3. Create Stamp History Item
  const newHistoryItem: RewardStampHistory = {
    id: `stamp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    customerPhone: cleanPhone,
    rewardId: campaign.id,
    orderId: req.orderId,
    requestId: req.id,
    visitNumber: req.visitNumber,
    stampNumber: newStampCount,
    cycleNumber: req.cycleNumber,
    action: isUnlocked ? "REWARD_UNLOCKED" : "STAMP_AWARDED",
    approvedBy: adminName,
    createdAt: nowIso,
  };

  // Update local storage
  const updatedRequests = allRequests.map((r) => (r.id === requestId ? req : r));
  setLocalItem(LOCAL_REQUESTS_KEY, updatedRequests);

  const localProfiles = getLocalItem<CustomerRewardState[]>(LOCAL_CUSTOMER_REWARDS_KEY, []);
  const updatedProfiles = [
    updatedProfile,
    ...localProfiles.filter((p) => normalizePhone(p.customerPhone) !== cleanPhone),
  ];
  setLocalItem(LOCAL_CUSTOMER_REWARDS_KEY, updatedProfiles);

  const localHistory = getLocalItem<RewardStampHistory[]>(LOCAL_STAMP_HISTORY_KEY, []);
  setLocalItem(LOCAL_STAMP_HISTORY_KEY, [newHistoryItem, ...localHistory]);

  if (!isSupabaseConfigured || !supabase) {
    return { success: true, updatedProfile };
  }

  try {
    // 1. Update DB request
    await supabase
      .from("reward_verification_requests")
      .update({
        request_status: "APPROVED",
        verified_at: nowIso,
        verified_by: adminName,
      })
      .eq("id", requestId);

    // 2. Upsert DB profile
    await supabase.from("customer_rewards").upsert(
      {
        customer_phone: cleanPhone,
        customer_name: updatedProfile.customerName,
        reward_id: campaign.id,
        current_visit_count: newVisitCount,
        current_stamp_count: newStampCount,
        cycle_number: req.cycleNumber,
        status: newStatus,
        updated_at: nowIso,
      },
      { onConflict: "customer_phone" }
    );

    // 3. Insert DB history
    await supabase.from("reward_stamp_history").insert({
      customer_phone: cleanPhone,
      reward_id: campaign.id,
      order_id: req.orderId || null,
      request_id: requestId.startsWith("req_") ? null : requestId,
      visit_number: req.visitNumber,
      stamp_number: newStampCount,
      cycle_number: req.cycleNumber,
      action: isUnlocked ? "REWARD_UNLOCKED" : "STAMP_AWARDED",
      approved_by: adminName,
      created_at: nowIso,
    });

    return { success: true, updatedProfile };
  } catch (err) {
    console.error("Exception approving reward request:", err);
    return { success: true, updatedProfile };
  }
}

export async function rejectRewardRequest(
  requestId: string,
  adminName = "Admin",
  rejectionReason = "Activity or order could not be verified."
): Promise<{ success: boolean; message?: string }> {
  const allRequests = await fetchAllRewardRequests();
  const req = allRequests.find((r) => r.id === requestId);

  if (!req) {
    return { success: false, message: "Reward request not found." };
  }

  const nowIso = new Date().toISOString();
  req.requestStatus = "REJECTED";
  req.rejectionReason = rejectionReason;
  req.verifiedAt = nowIso;
  req.verifiedBy = adminName;

  const updatedRequests = allRequests.map((r) => (r.id === requestId ? req : r));
  setLocalItem(LOCAL_REQUESTS_KEY, updatedRequests);

  if (!isSupabaseConfigured || !supabase) return { success: true };

  try {
    await supabase
      .from("reward_verification_requests")
      .update({
        request_status: "REJECTED",
        rejection_reason: rejectionReason,
        verified_at: nowIso,
        verified_by: adminName,
      })
      .eq("id", requestId);

    return { success: true };
  } catch (err) {
    console.error("Exception rejecting reward request:", err);
    return { success: true };
  }
}

// ============================================================
// 5. REWARD REDEMPTION & NEXT CYCLE API
// ============================================================

export async function redeemReward(
  phone: string,
  adminName = "Admin"
): Promise<{ success: boolean; message?: string; updatedProfile?: CustomerRewardState }> {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    return { success: false, message: "Invalid customer phone number." };
  }

  const { profile } = await fetchCustomerRewardProfile(cleanPhone);
  const { campaign } = await fetchActiveRewardCampaign();

  if (profile.status !== "UNLOCKED") {
    return { success: false, message: "Reward is not unlocked yet." };
  }

  const nowIso = new Date().toISOString();
  const currentCycle = profile.cycleNumber;

  // Create Redemption Record
  const newRedemption: RewardRedemption = {
    id: `red_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    customerPhone: cleanPhone,
    rewardId: campaign.id,
    cycleNumber: currentCycle,
    redeemedAt: nowIso,
    redeemedBy: adminName,
  };

  // Stamp History Redemption Item
  const redemptionHistoryItem: RewardStampHistory = {
    id: `hist_red_${Date.now()}`,
    customerPhone: cleanPhone,
    rewardId: campaign.id,
    visitNumber: profile.currentVisitCount,
    stampNumber: profile.currentStampCount,
    cycleNumber: currentCycle,
    action: "REWARD_REDEEMED",
    approvedBy: adminName,
    createdAt: nowIso,
  };

  // Reset for Next Cycle!
  const updatedProfile: CustomerRewardState = {
    ...profile,
    customerPhone: cleanPhone,
    rewardId: campaign.id,
    currentVisitCount: 0,
    currentStampCount: 0,
    cycleNumber: currentCycle + 1,
    status: "ACTIVE",
    updatedAt: nowIso,
  };

  // Update Local Cache
  const localRedemptions = getLocalItem<RewardRedemption[]>(LOCAL_REDEMPTIONS_KEY, []);
  setLocalItem(LOCAL_REDEMPTIONS_KEY, [newRedemption, ...localRedemptions]);

  const localHistory = getLocalItem<RewardStampHistory[]>(LOCAL_STAMP_HISTORY_KEY, []);
  setLocalItem(LOCAL_STAMP_HISTORY_KEY, [redemptionHistoryItem, ...localHistory]);

  const localProfiles = getLocalItem<CustomerRewardState[]>(LOCAL_CUSTOMER_REWARDS_KEY, []);
  const updatedProfiles = [
    updatedProfile,
    ...localProfiles.filter((p) => normalizePhone(p.customerPhone) !== cleanPhone),
  ];
  setLocalItem(LOCAL_CUSTOMER_REWARDS_KEY, updatedProfiles);

  if (!isSupabaseConfigured || !supabase) {
    return { success: true, updatedProfile };
  }

  try {
    // 1. Insert DB redemption
    await supabase.from("reward_redemptions").insert({
      customer_phone: cleanPhone,
      reward_id: campaign.id,
      cycle_number: currentCycle,
      redeemed_at: nowIso,
      redeemed_by: adminName,
    });

    // 2. Insert DB history
    await supabase.from("reward_stamp_history").insert({
      customer_phone: cleanPhone,
      reward_id: campaign.id,
      visit_number: profile.currentVisitCount,
      stamp_number: profile.currentStampCount,
      cycle_number: currentCycle,
      action: "REWARD_REDEEMED",
      approved_by: adminName,
      created_at: nowIso,
    });

    // 3. Upsert customer profile for next cycle
    await supabase.from("customer_rewards").upsert(
      {
        customer_phone: cleanPhone,
        customer_name: profile.customerName,
        reward_id: campaign.id,
        current_visit_count: 0,
        current_stamp_count: 0,
        cycle_number: currentCycle + 1,
        status: "ACTIVE",
        updated_at: nowIso,
      },
      { onConflict: "customer_phone" }
    );

    return { success: true, updatedProfile };
  } catch (err) {
    console.error("Exception redeeming reward:", err);
    return { success: true, updatedProfile };
  }
}
