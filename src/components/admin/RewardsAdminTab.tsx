import { useState, useEffect, useMemo } from "react";
import type {
  RewardCampaign,
  RewardActivity,
  RewardVerificationRequest,
  CustomerRewardState,
  RewardStampHistory,
  RewardActivityType,
  RewardStatus,
  RewardRequestStatus,
} from "../../types";
import {
  fetchActiveRewardCampaign,
  saveRewardCampaign,
  fetchAllRewardRequests,
  approveRewardRequest,
  rejectRewardRequest,
  fetchCustomerRewardProfile,
  redeemReward,
  fetchAllCustomerProfiles,
  saveCustomerRewardProfile,
  deleteCustomerRewardProfile,
  deleteStampHistoryItem,
  updateRewardRequest,
  deleteRewardRequest,
  clearRewardRequestsByDate,
  saveRewardActivity,
  deleteRewardActivity,
  normalizePhone,
} from "../../services/rewardService";
import {
  getTodayDateString,
  getYesterdayDateString,
  formatFriendlyDate,
} from "../../utils/dateUtils";

interface Props {
  onRequestUpdated?: () => void;
}

export function RewardsAdminTab({ onRequestUpdated }: Props) {
  const [campaign, setCampaign] = useState<RewardCampaign | null>(null);
  const [activities, setActivities] = useState<RewardActivity[]>([]);
  const [requests, setRequests] = useState<RewardVerificationRequest[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerRewardState[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State & 12:00 AM Midnight Auto Reset Engine
  const [todayDateStr, setTodayDateStr] = useState<string>(getTodayDateString());
  const [rewardDateFilter, setRewardDateFilter] = useState<string>("today"); // "today" | "yesterday" | "all" | YYYY-MM-DD

  // Sub-tabs: "requests" | "config" | "customers"
  const [subTab, setSubTab] = useState<"requests" | "config" | "customers">("requests");

  // Request Modals & Action States
  const [selectedRequest, setSelectedRequest] = useState<RewardVerificationRequest | null>(null);
  const [rejectionModalRequest, setRejectionModalRequest] = useState<RewardVerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Request Edit & Create Modals
  const [editingRequest, setEditingRequest] = useState<RewardVerificationRequest | null>(null);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [newReqPhone, setNewReqPhone] = useState("");
  const [newReqName, setNewReqName] = useState("");
  const [newReqVisit, setNewReqVisit] = useState<number>(1);
  const [newReqCycle, setNewReqCycle] = useState<number>(1);
  const [newReqActivity, setNewReqActivity] = useState<RewardActivityType>("VISIT_VERIFICATION");

  // Campaign Configuration Form State
  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [requiredVisitsInput, setRequiredVisitsInput] = useState<number>(5);
  const [expiryDateInput, setExpiryDateInput] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  // Activity Edit & Create Modal State
  const [editingActivity, setEditingActivity] = useState<RewardActivity | "new" | null>(null);
  const [actVisitNo, setActVisitNo] = useState<number>(1);
  const [actType, setActType] = useState<RewardActivityType>("VISIT_VERIFICATION");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actUrl, setActUrl] = useState("");
  const [actIsActive, setActIsActive] = useState(true);

  // Customer Lookup State & Customer CRUD Modals
  const [customerSearchPhone, setCustomerSearchPhone] = useState("");
  const [searchedProfile, setSearchedProfile] = useState<CustomerRewardState | null>(null);
  const [searchedHistory, setSearchedHistory] = useState<RewardStampHistory[]>([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [redemptionFeedback, setRedemptionFeedback] = useState<string | null>(null);

  // Customer Edit/Create Modal State
  const [editingCustomerProfile, setEditingCustomerProfile] = useState<CustomerRewardState | "new" | null>(null);
  const [custEditPhone, setCustEditPhone] = useState("");
  const [custEditName, setCustEditName] = useState("");
  const [custEditStamps, setCustEditStamps] = useState<number>(0);
  const [custEditVisits, setCustEditVisits] = useState<number>(0);
  const [custEditCycle, setCustEditCycle] = useState<number>(1);
  const [custEditStatus, setCustEditStatus] = useState<RewardStatus>("ACTIVE");

  // Load Admin Data
  const loadAdminRewardsData = async () => {
    try {
      const [campData, reqData, profilesData] = await Promise.all([
        fetchActiveRewardCampaign(),
        fetchAllRewardRequests(),
        fetchAllCustomerProfiles(),
      ]);

      setCampaign(campData.campaign);
      setActivities(campData.activities);
      setRequests(reqData);
      setCustomerProfiles(profilesData);

      setCampaignName(campData.campaign.name);
      setCampaignDesc(campData.campaign.description);
      setRequiredVisitsInput(campData.campaign.requiredVisits);
      setExpiryDateInput(
        campData.campaign.expiryDate ? campData.campaign.expiryDate.split("T")[0] : "2026-12-31"
      );

      // If a customer was searched, refresh profile
      if (customerSearchPhone) {
        const res = await fetchCustomerRewardProfile(customerSearchPhone);
        setSearchedProfile(res.profile);
        setSearchedHistory(res.stampHistory);
      }
    } catch (err) {
      console.error("Error loading admin rewards data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminRewardsData();
    const interval = setInterval(() => {
      loadAdminRewardsData();
    }, 4000);
    return () => clearInterval(interval);
  }, [customerSearchPhone]);

  // Midnight 12:00 AM Auto-Reset Engine Check
  useEffect(() => {
    const midnightInterval = setInterval(() => {
      const realToday = getTodayDateString();
      if (realToday !== todayDateStr) {
        console.log(`[Midnight Rollover - Rewards] Auto resetting today's metrics for date: ${realToday}`);
        setTodayDateStr(realToday);
        loadAdminRewardsData();
      }
    }, 5000);
    return () => clearInterval(midnightInterval);
  }, [todayDateStr]);

  // Extract available dates from requests for date dropdown filter
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    requests.forEach((r) => {
      if (r.submittedAt) {
        dates.add(r.submittedAt.split("T")[0]);
      }
    });
    return Array.from(dates).sort((a, b) => (b > a ? 1 : -1));
  }, [requests]);

  // Filter requests by Date Filter
  const filteredRequestsByDate = useMemo(() => {
    let targetDate = rewardDateFilter;
    if (rewardDateFilter === "today") targetDate = todayDateStr;
    else if (rewardDateFilter === "yesterday") targetDate = getYesterdayDateString();

    if (rewardDateFilter === "all") {
      return requests;
    }
    return requests.filter((r) => {
      const rDate = r.submittedAt ? r.submittedAt.split("T")[0] : todayDateStr;
      return rDate === targetDate;
    });
  }, [requests, rewardDateFilter, todayDateStr]);

  // Pending Requests (filtered by Date)
  const pendingRequests = useMemo(
    () => filteredRequestsByDate.filter((r) => r.requestStatus === "PENDING"),
    [filteredRequestsByDate]
  );

  // History Requests (filtered by Date)
  const historyRequests = useMemo(
    () => filteredRequestsByDate.filter((r) => r.requestStatus !== "PENDING"),
    [filteredRequestsByDate]
  );

  // Approved Count (filtered by Date)
  const approvedCount = useMemo(
    () => filteredRequestsByDate.filter((r) => r.requestStatus === "APPROVED").length,
    [filteredRequestsByDate]
  );

  // ============================================================
  // 1. VERIFICATION REQUEST ACTIONS (Approve, Reject, Update, Delete, Create)
  // ============================================================

  const handleApprove = async (req: RewardVerificationRequest) => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const res = await approveRewardRequest(req.id, "Admin");
      if (res.success) {
        setSelectedRequest(null);
        await loadAdminRewardsData();
        if (onRequestUpdated) onRequestUpdated();
      } else {
        alert(res.message || "Could not approve request.");
      }
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionModalRequest || isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      const res = await rejectRewardRequest(
        rejectionModalRequest.id,
        "Admin",
        rejectionReason.trim() || "Activity or completed order could not be verified."
      );
      if (res.success) {
        setRejectionModalRequest(null);
        setRejectionReason("");
        setSelectedRequest(null);
        await loadAdminRewardsData();
        if (onRequestUpdated) onRequestUpdated();
      } else {
        alert(res.message || "Could not reject request.");
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSaveEditedRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    setIsProcessingAction(true);
    try {
      const success = await updateRewardRequest(editingRequest.id, editingRequest);
      if (success) {
        setEditingRequest(null);
        await loadAdminRewardsData();
        if (onRequestUpdated) onRequestUpdated();
      } else {
        alert("Failed to update verification request.");
      }
    } catch (err) {
      console.error("Error updating request:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteRequestItem = async (requestId: string) => {
    if (!window.confirm("Are you sure you want to delete this verification request record?")) return;
    setIsProcessingAction(true);
    try {
      await deleteRewardRequest(requestId);
      await loadAdminRewardsData();
      if (onRequestUpdated) onRequestUpdated();
    } catch (err) {
      console.error("Error deleting request:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleBulkClearHistory = async () => {
    if (historyRequests.length === 0 || isProcessingAction) return;

    const filterDateLabel =
      rewardDateFilter === "all"
        ? "all verification history records"
        : rewardDateFilter === "today"
        ? `today's history (${formatFriendlyDate(todayDateStr)})`
        : rewardDateFilter === "yesterday"
        ? `yesterday's history (${formatFriendlyDate(getYesterdayDateString())})`
        : `history for ${formatFriendlyDate(rewardDateFilter)}`;

    if (
      !window.confirm(
        `Are you sure you want to bulk delete ${historyRequests.length} verification history records for ${filterDateLabel}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsProcessingAction(true);
    try {
      await clearRewardRequestsByDate(
        rewardDateFilter,
        todayDateStr,
        getYesterdayDateString()
      );
      await loadAdminRewardsData();
      if (onRequestUpdated) onRequestUpdated();
    } catch (err) {
      console.error("Error bulk clearing history:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleCreateManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizePhone(newReqPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    setIsProcessingAction(true);
    try {
      const tempId = `req_admin_${Date.now()}`;
      const newReq: RewardVerificationRequest = {
        id: tempId,
        customerPhone: cleanPhone,
        customerName: newReqName.trim() || "Customer",
        rewardId: campaign?.id || "01000000-0000-0000-0000-000000000001",
        visitNumber: newReqVisit,
        cycleNumber: newReqCycle,
        activityType: newReqActivity,
        requestStatus: "PENDING",
        submittedAt: new Date().toISOString(),
      };
      await updateRewardRequest(tempId, newReq);
      setIsCreateRequestOpen(false);
      setNewReqPhone("");
      setNewReqName("");
      setNewReqVisit(1);
      setNewReqCycle(1);
      await loadAdminRewardsData();
      if (onRequestUpdated) onRequestUpdated();
    } catch (err) {
      console.error("Error creating manual request:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // ============================================================
  // 2. REWARD SETTINGS & ACTIVITY CRUD
  // ============================================================

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || requiredVisitsInput < 1) {
      alert("Please enter a valid campaign name and visit threshold.");
      return;
    }

    setIsSavingConfig(true);
    setConfigFeedback(null);

    try {
      const updatedCamp: Partial<RewardCampaign> = {
        name: campaignName.trim(),
        description: campaignDesc.trim(),
        requiredVisits: requiredVisitsInput,
        expiryDate: expiryDateInput ? `${expiryDateInput}T23:59:59.000Z` : undefined,
        isActive: true,
      };

      const res = await saveRewardCampaign(updatedCamp, activities);
      if (res) {
        setConfigFeedback("✅ Reward campaign configuration saved successfully!");
        await loadAdminRewardsData();
      } else {
        setConfigFeedback("❌ Failed to save configuration.");
      }
    } catch (err) {
      console.error("Error saving campaign config:", err);
      setConfigFeedback("❌ Error saving configuration.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleOpenActivityModal = (act?: RewardActivity) => {
    if (act) {
      setEditingActivity(act);
      setActVisitNo(act.visitNumber);
      setActType(act.activityType);
      setActTitle(act.title);
      setActDesc(act.description);
      setActUrl(act.externalUrl || "");
      setActIsActive(act.isActive);
    } else {
      setEditingActivity("new");
      setActVisitNo(activities.length + 1);
      setActType("VISIT_VERIFICATION");
      setActTitle(`Visit ${activities.length + 1} Activity`);
      setActDesc("Complete your order and request verification stamp.");
      setActUrl("");
      setActIsActive(true);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) {
      alert("Please enter a valid activity title.");
      return;
    }
    try {
      const actId = typeof editingActivity === "object" && editingActivity !== null ? editingActivity.id : undefined;
      await saveRewardActivity({
        id: actId,
        rewardId: campaign?.id || "01000000-0000-0000-0000-000000000001",
        visitNumber: actVisitNo,
        activityType: actType,
        title: actTitle.trim(),
        description: actDesc.trim(),
        externalUrl: actUrl.trim() || undefined,
        isActive: actIsActive,
      });
      setEditingActivity(null);
      await loadAdminRewardsData();
    } catch (err) {
      console.error("Error saving activity:", err);
    }
  };

  const handleDeleteActivityStep = async (activityId: string) => {
    if (!window.confirm("Are you sure you want to delete this reward activity step?")) return;
    try {
      await deleteRewardActivity(activityId);
      await loadAdminRewardsData();
    } catch (err) {
      console.error("Error deleting activity:", err);
    }
  };

  // ============================================================
  // 3. CUSTOMER REWARD LOOKUP & CUSTOMER PROFILE CRUD
  // ============================================================

  const handleLookupCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSearchPhone.trim()) return;

    setCustomerLookupLoading(true);
    setRedemptionFeedback(null);

    try {
      const res = await fetchCustomerRewardProfile(customerSearchPhone);
      setSearchedProfile(res.profile);
      setSearchedHistory(res.stampHistory);
    } catch (err) {
      console.error("Error looking up customer profile:", err);
    } finally {
      setCustomerLookupLoading(false);
    }
  };

  const handleOpenCustomerModal = (prof?: CustomerRewardState) => {
    if (prof) {
      setEditingCustomerProfile(prof);
      setCustEditPhone(prof.customerPhone);
      setCustEditName(prof.customerName || "");
      setCustEditStamps(prof.currentStampCount);
      setCustEditVisits(prof.currentVisitCount);
      setCustEditCycle(prof.cycleNumber);
      setCustEditStatus(prof.status);
    } else {
      setEditingCustomerProfile("new");
      setCustEditPhone("");
      setCustEditName("");
      setCustEditStamps(0);
      setCustEditVisits(0);
      setCustEditCycle(1);
      setCustEditStatus("ACTIVE");
    }
  };

  const handleSaveCustomerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = normalizePhone(custEditPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    try {
      const res = await saveCustomerRewardProfile({
        customerPhone: cleanPhone,
        customerName: custEditName.trim() || "Customer",
        currentStampCount: custEditStamps,
        currentVisitCount: custEditVisits,
        cycleNumber: custEditCycle,
        status: custEditStatus,
      });

      if (res.success && res.profile) {
        setEditingCustomerProfile(null);
        setSearchedProfile(res.profile);
        setCustomerSearchPhone(cleanPhone);
        await loadAdminRewardsData();
      } else {
        alert(res.message || "Could not save customer profile.");
      }
    } catch (err) {
      console.error("Error saving customer profile:", err);
    }
  };

  const handleDeleteCustomerProfileRecord = async (phone: string) => {
    if (!window.confirm(`Are you sure you want to delete the reward profile and stamp history for customer +91 ${phone}?`)) return;
    try {
      await deleteCustomerRewardProfile(phone);
      if (searchedProfile && normalizePhone(searchedProfile.customerPhone) === normalizePhone(phone)) {
        setSearchedProfile(null);
        setSearchedHistory([]);
      }
      await loadAdminRewardsData();
    } catch (err) {
      console.error("Error deleting customer profile:", err);
    }
  };

  const handleDeleteSingleStampHistory = async (historyId: string) => {
    if (!window.confirm("Are you sure you want to delete this stamp history record?")) return;
    try {
      await deleteStampHistoryItem(historyId);
      if (customerSearchPhone) {
        const res = await fetchCustomerRewardProfile(customerSearchPhone);
        setSearchedHistory(res.stampHistory);
      }
      await loadAdminRewardsData();
    } catch (err) {
      console.error("Error deleting stamp history item:", err);
    }
  };

  const handleRedeemCustomerReward = async () => {
    if (!searchedProfile) return;
    if (
      !window.confirm(
        `Confirm redemption of "${campaign?.name || "Reward"}" for customer ${
          searchedProfile.customerName || searchedProfile.customerPhone
        }? This will mark reward as REDEEMED and start Cycle ${searchedProfile.cycleNumber + 1}.`
      )
    ) {
      return;
    }

    try {
      const res = await redeemReward(searchedProfile.customerPhone, "Admin");
      if (res.success && res.updatedProfile) {
        setSearchedProfile(res.updatedProfile);
        setRedemptionFeedback("🎉 Reward redeemed successfully! Customer has been advanced to the next cycle.");
        await loadAdminRewardsData();
      } else {
        alert(res.message || "Failed to redeem reward.");
      }
    } catch (err) {
      console.error("Error redeeming reward:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy flex items-center gap-2">
            <span>🎁</span> Customer Rewards Management
          </h2>
          <p className="text-xs text-slate-500">
            Verify customer visit claims, grant digital stamps, and configure reward campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("requests")}
            className={`relative rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              subTab === "requests"
                ? "bg-navy text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            📋 Verification Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab("config")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              subTab === "config"
                ? "bg-navy text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ⚙️ Reward Settings
          </button>

          <button
            onClick={() => setSubTab("customers")}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              subTab === "customers"
                ? "bg-navy text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            👤 Customer Lookup
          </button>
        </div>
      </div>

      {/* 2. Global Date-Wise Filter & 12:00 AM Reset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">📅 Filter Date:</span>
          <select
            value={rewardDateFilter}
            onChange={(e) => setRewardDateFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-navy focus:border-blueink focus:outline-none"
          >
            <option value="today">Today ({formatFriendlyDate(todayDateStr)})</option>
            <option value="yesterday">Yesterday ({formatFriendlyDate(getYesterdayDateString())})</option>
            <option value="all">All Time (Full History)</option>
            {availableDates
              .filter((d) => d !== todayDateStr && d !== getYesterdayDateString())
              .map((dateStr) => (
                <option key={dateStr} value={dateStr}>
                  {formatFriendlyDate(dateStr)} ({dateStr})
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Midnight Auto-Reset Active (Resets daily at 00:00)</span>
          <button
            onClick={loadAdminRewardsData}
            className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* 3. Top Summary Metric Cards (Filtered by Date) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Requests</span>
            <span className="text-base">⏳</span>
          </div>
          <div className="mt-1 text-2xl font-black text-amber-500">{pendingRequests.length}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stamps Approved</span>
            <span className="text-base">⭐</span>
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-600">{approvedCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Required Visits</span>
            <span className="text-base">🎯</span>
          </div>
          <div className="mt-1 text-2xl font-black text-navy">{campaign?.requiredVisits || 5} Visits</div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Reward</span>
            <span className="text-base">☕</span>
          </div>
          <div className="mt-1 text-sm font-bold text-blueink truncate">
            {campaign?.name || "Free Thick Cold Coffee"}
          </div>
        </div>
      </div>

      {/* 4. SUB-TAB 1: VERIFICATION REQUESTS */}
      {subTab === "requests" && (
        <div className="space-y-6">
          {/* Pending Verification Requests Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                <span>🔔</span> Pending Verification Requests ({pendingRequests.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreateRequestOpen(true)}
                  className="rounded-xl bg-blueink px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                >
                  + Create Request
                </button>
                <button
                  onClick={loadAdminRewardsData}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 p-6">
                <div className="mx-auto mb-1 text-2xl">🎉</div>
                No pending reward verification requests for {rewardDateFilter === "all" ? "all time" : formatFriendlyDate(rewardDateFilter === "today" ? todayDateStr : rewardDateFilter === "yesterday" ? getYesterdayDateString() : rewardDateFilter)}.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs hover:shadow-md transition-shadow relative"
                  >
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                      <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                        VISIT {req.visitNumber}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        Cycle {req.cycleNumber}
                      </span>
                    </div>

                    <div className="my-2.5 text-xs text-slate-700 space-y-1">
                      <div>
                        <strong className="text-navy">{req.customerName}</strong> (+91 {req.customerPhone})
                      </div>
                      <div className="font-semibold text-purple-700">
                        Activity: {req.activityType.replace(/_/g, " ")}
                      </div>
                      {req.orderId && (
                        <div className="text-[11px] text-slate-500">
                          Linked Order: <span className="font-mono font-bold text-blueink">{req.orderId}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        Submitted: {new Date(req.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-amber-200/60">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                      >
                        🔍 Details
                      </button>
                      <button
                        onClick={() => setEditingRequest(req)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                        title="Edit Request"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isProcessingAction}
                        className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleDeleteRequestItem(req.id)}
                        className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                        title="Delete Request"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History of Verification Requests (CRUD - Read, Update, Delete, Bulk Clear) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-display text-base font-bold text-navy">
                Verification History ({historyRequests.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Filtered Date: {formatFriendlyDate(rewardDateFilter === "today" ? todayDateStr : rewardDateFilter === "yesterday" ? getYesterdayDateString() : rewardDateFilter)}
                </span>
                {historyRequests.length > 0 && (
                  <button
                    onClick={handleBulkClearHistory}
                    disabled={isProcessingAction}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1 shadow-xs"
                    title="Bulk clear history for selected date filter"
                  >
                    <span>🗑️</span>
                    <span>
                      Clear {rewardDateFilter === "all" ? "All" : formatFriendlyDate(rewardDateFilter === "today" ? todayDateStr : rewardDateFilter === "yesterday" ? getYesterdayDateString() : rewardDateFilter)} History
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white max-h-96 overflow-y-auto">
              {historyRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No request history for selected date filter.</div>
              ) : (
                historyRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 text-xs gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-navy flex items-center gap-2">
                        <span>{req.customerName} (+91 {req.customerPhone})</span>
                        <span className="font-mono text-[10px] font-normal text-slate-400">Cycle {req.cycleNumber} • Visit {req.visitNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Activity: {req.activityType.replace(/_/g, " ")} • {new Date(req.submittedAt).toLocaleString()}
                      </div>
                      {req.rejectionReason && (
                        <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                          req.requestStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {req.requestStatus}
                      </span>
                      <button
                        onClick={() => setEditingRequest(req)}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs text-slate-600 hover:bg-slate-100"
                        title="Edit Record"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteRequestItem(req.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-xs text-rose-600 hover:bg-rose-100"
                        title="Delete Record"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: REWARD CONFIGURATION & ACTIVITIES MANAGER (CRUD) */}
      {subTab === "config" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Campaign Config Form */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-display text-base font-bold text-navy">
                  ⚙️ Reward Campaign Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Configure active campaign title, visit threshold (e.g. 5, 6, 7), and expiry.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Reward Title</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:border-blueink focus:outline-none"
                    placeholder="e.g. Free Thick Cold Coffee"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Description</label>
                  <textarea
                    rows={2}
                    value={campaignDesc}
                    onChange={(e) => setCampaignDesc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-blueink focus:outline-none"
                    placeholder="Brief description of the reward..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">
                      Required Visits / Stamps
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={requiredVisitsInput}
                      onChange={(e) => setRequiredVisitsInput(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono font-bold focus:border-blueink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDateInput}
                      onChange={(e) => setExpiryDateInput(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-blueink focus:outline-none"
                    />
                  </div>
                </div>

                {configFeedback && (
                  <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 border border-slate-200">
                    {configFeedback}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="rounded-xl bg-blueink px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
                >
                  {isSavingConfig ? "Saving..." : "Save Reward Configuration"}
                </button>
              </form>
            </div>

            {/* Reward Activity Rules Manager (CRUD - Create, Read, Update, Delete) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-navy">
                    🎯 Visit Activity Steps Rules
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define activities for Visit 1, 2, 3, etc.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenActivityModal()}
                  className="rounded-xl bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-xs"
                >
                  + Add Step
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">No activity steps configured.</div>
                ) : (
                  activities.map((act) => (
                    <div
                      key={act.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-blueink px-2 py-0.5 text-[10px] font-black text-white">
                          VISIT {act.visitNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenActivityModal(act)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteActivityStep(act.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      <div className="font-bold text-navy">{act.title}</div>
                      <div className="text-[11px] text-slate-600">{act.description}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Type: {act.activityType} • Status: {act.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: CUSTOMER LOOKUP & PROFILE CRUD */}
      {subTab === "customers" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Search & Profile View */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-navy">
                  👤 Customer Reward Lookup
                </h3>
                <button
                  onClick={() => handleOpenCustomerModal()}
                  className="rounded-xl bg-blueink px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                >
                  + New Customer Profile
                </button>
              </div>

              <form onSubmit={handleLookupCustomer} className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Enter customer mobile number..."
                  value={customerSearchPhone}
                  onChange={(e) => setCustomerSearchPhone(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-mono focus:border-blueink focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={customerLookupLoading}
                  className="rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  {customerLookupLoading ? "Searching..." : "Lookup"}
                </button>
              </form>

              {searchedProfile && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-navy">
                        {searchedProfile.customerName || "Customer"}
                      </h4>
                      <div className="text-xs text-slate-500">+91 {searchedProfile.customerPhone}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${
                          searchedProfile.status === "UNLOCKED"
                            ? "bg-gold text-navy animate-pulse"
                            : "bg-blue-100 text-blueink"
                        }`}
                      >
                        {searchedProfile.status}
                      </span>
                      <button
                        onClick={() => handleOpenCustomerModal(searchedProfile)}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-xs text-slate-700 hover:bg-slate-100"
                        title="Edit Customer Profile"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCustomerProfileRecord(searchedProfile.customerPhone)}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-1 text-xs text-rose-600 hover:bg-rose-100"
                        title="Delete Customer Profile"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white p-2 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Stamps</span>
                      <div className="font-black text-navy">{searchedProfile.currentStampCount}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Visits</span>
                      <div className="font-black text-navy">{searchedProfile.currentVisitCount}</div>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Cycle</span>
                      <div className="font-black text-navy">{searchedProfile.cycleNumber}</div>
                    </div>
                  </div>

                  {/* Customer Stamp History (CRUD - Read, Delete) */}
                  {searchedHistory.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">Customer Stamp History</div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {searchedHistory.map((h) => {
                          const dateStr = h.createdAt
                            ? new Date(h.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }) +
                              " " +
                              new Date(h.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "";

                          return (
                            <div key={h.id} className="flex justify-between items-center text-[11px] bg-white p-2 rounded border border-slate-100 gap-2">
                              <span className="font-semibold text-slate-700 truncate">
                                Visit {h.visitNumber} ({h.action})
                              </span>
                              <span className="text-slate-500 font-medium text-[10px] shrink-0 font-mono">
                                {dateStr}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px] shrink-0">Cycle {h.cycleNumber}</span>
                              <button
                                onClick={() => handleDeleteSingleStampHistory(h.id)}
                                className="text-rose-500 hover:text-rose-700 text-[10px] font-bold shrink-0 ml-1"
                                title="Delete Stamp Record"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Redeem Action Button */}
                  {searchedProfile.status === "UNLOCKED" && (
                    <button
                      onClick={handleRedeemCustomerReward}
                      className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                    >
                      🎁 Redeem Reward for Customer
                    </button>
                  )}

                  {redemptionFeedback && (
                    <div className="rounded-lg bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                      {redemptionFeedback}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List of All Registered Customer Rewards Profiles (CRUD - Read) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-display text-base font-bold text-navy">
                📋 Registered Customers Rewards Profiles ({customerProfiles.length})
              </h3>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 max-h-96 overflow-y-auto">
                {customerProfiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No registered profiles yet.</div>
                ) : (
                  customerProfiles.map((prof) => (
                    <div key={prof.customerPhone} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <div className="font-bold text-navy">{prof.customerName || "Customer"} (+91 {prof.customerPhone})</div>
                        <div className="text-[11px] text-slate-500">
                          Stamps: {prof.currentStampCount} • Visits: {prof.currentVisitCount} • Cycle {prof.cycleNumber}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSearchedProfile(prof);
                            setCustomerSearchPhone(prof.customerPhone);
                          }}
                          className="rounded-lg bg-navy px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-800"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleOpenCustomerModal(prof)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCustomerProfileRecord(prof.customerPhone)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS SECTION FOR REWARDS CRUD                              */}
      {/* ============================================================ */}

      {/* 1. VERIFICATION REQUEST DETAILS MODAL */}
      {selectedRequest && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(6,9,20,0.5)] backdrop-blur-xs"
            onClick={() => setSelectedRequest(null)}
          />
          <div className="fixed bottom-0 left-1/2 z-50 flex max-h-[90vh] w-full max-w-[480px] -translate-x-1/2 flex-col rounded-t-[20px] bg-white shadow-2xl">
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <span className="font-mono text-xs font-bold text-blueink">Request #{selectedRequest.id.slice(-6)}</span>
                <h3 className="font-display text-base font-bold text-navy">
                  Reward Verification Checklist
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5 border border-slate-100">
                <div><strong className="text-slate-700">Customer Name:</strong> {selectedRequest.customerName}</div>
                <div><strong className="text-slate-700">Phone:</strong> +91 {selectedRequest.customerPhone}</div>
                <div><strong className="text-slate-700">Target Visit:</strong> Visit {selectedRequest.visitNumber}</div>
                <div><strong className="text-slate-700">Cycle:</strong> Cycle {selectedRequest.cycleNumber}</div>
                <div><strong className="text-slate-700">Activity Type:</strong> {selectedRequest.activityType.replace(/_/g, " ")}</div>
                {selectedRequest.orderId && (
                  <div><strong className="text-slate-700">Order ID:</strong> <span className="font-mono text-blueink font-bold">{selectedRequest.orderId}</span></div>
                )}
                <div><strong className="text-slate-700">Submission Time:</strong> {new Date(selectedRequest.submittedAt).toLocaleString()}</div>
              </div>

              {/* Admin Verification Checklist */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2">
                <div className="font-bold text-navy uppercase text-[10px]">Admin Verification Requirements:</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blueink" />
                  <span>Customer completed eligible QR order</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blueink" />
                  <span>Activity requirement completed (Review / Follow / Story Tag / Order)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-blueink" />
                  <span>Visit has not already received a stamp in this cycle</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setRejectionModalRequest(selectedRequest);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2.5 font-bold text-rose-700 hover:bg-rose-100"
                >
                  ❌ Reject Claim
                </button>

                <button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={isProcessingAction}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-md"
                >
                  ✓ Approve & Grant Stamp
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. REJECTION REASON MODAL */}
      {rejectionModalRequest && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(6,9,20,0.5)]"
            onClick={() => setRejectionModalRequest(null)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-rose-700">
              Reject Verification Request
            </h3>
            <p className="text-xs text-slate-600">
              Provide a clear reason for rejecting the reward request of customer{" "}
              <strong>{rejectionModalRequest.customerName}</strong>.
            </p>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Could not verify Google Review / Instagram Story tag..."
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectionModalRequest(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessingAction}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </>
      )}

      {/* 3. EDIT VERIFICATION REQUEST MODAL (CRUD - Update) */}
      {editingRequest && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(6,9,20,0.5)]"
            onClick={() => setEditingRequest(null)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-navy">
              ✏️ Edit Verification Request
            </h3>

            <form onSubmit={handleSaveEditedRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editingRequest.customerName}
                  onChange={(e) => setEditingRequest({ ...editingRequest, customerName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blueink focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Customer Phone</label>
                <input
                  type="tel"
                  required
                  value={editingRequest.customerPhone}
                  onChange={(e) => setEditingRequest({ ...editingRequest, customerPhone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blueink focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Visit Number</label>
                  <input
                    type="number"
                    min={1}
                    value={editingRequest.visitNumber}
                    onChange={(e) => setEditingRequest({ ...editingRequest, visitNumber: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Cycle Number</label>
                  <input
                    type="number"
                    min={1}
                    value={editingRequest.cycleNumber}
                    onChange={(e) => setEditingRequest({ ...editingRequest, cycleNumber: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Request Status</label>
                <select
                  value={editingRequest.requestStatus}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      requestStatus: e.target.value as RewardRequestStatus,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              {editingRequest.requestStatus === "REJECTED" && (
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Rejection Reason</label>
                  <input
                    type="text"
                    value={editingRequest.rejectionReason || ""}
                    onChange={(e) => setEditingRequest({ ...editingRequest, rejectionReason: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="rounded-xl bg-blueink px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 4. CREATE MANUAL VERIFICATION REQUEST MODAL (CRUD - Create) */}
      {isCreateRequestOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(6,9,20,0.5)]"
            onClick={() => setIsCreateRequestOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-navy">
              + Create Verification Request
            </h3>

            <form onSubmit={handleCreateManualRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Customer Phone (10 Digits)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newReqPhone}
                  onChange={(e) => setNewReqPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blueink focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newReqName}
                  onChange={(e) => setNewReqName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blueink focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Visit Number</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newReqVisit}
                    onChange={(e) => setNewReqVisit(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Cycle Number</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newReqCycle}
                    onChange={(e) => setNewReqCycle(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Activity Type</label>
                <select
                  value={newReqActivity}
                  onChange={(e) => setNewReqActivity(e.target.value as RewardActivityType)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                >
                  <option value="GOOGLE_REVIEW">GOOGLE REVIEW</option>
                  <option value="INSTAGRAM_FOLLOW">INSTAGRAM FOLLOW</option>
                  <option value="INSTAGRAM_STORY">INSTAGRAM STORY</option>
                  <option value="VISIT_VERIFICATION">VISIT VERIFICATION</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRequestOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="rounded-xl bg-blueink px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 5. EDIT / CREATE REWARD ACTIVITY MODAL (CRUD) */}
      {editingActivity !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(6,9,20,0.5)]"
            onClick={() => setEditingActivity(null)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-navy">
              {editingActivity === "new" ? "+ Create Activity Step" : "✏️ Edit Activity Step"}
            </h3>

            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Visit Number</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={actVisitNo}
                    onChange={(e) => setActVisitNo(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Activity Type</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value as RewardActivityType)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  >
                    <option value="GOOGLE_REVIEW">GOOGLE REVIEW</option>
                    <option value="INSTAGRAM_FOLLOW">INSTAGRAM FOLLOW</option>
                    <option value="INSTAGRAM_STORY">INSTAGRAM STORY</option>
                    <option value="VISIT_VERIFICATION">VISIT VERIFICATION</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Activity Title</label>
                <input
                  type="text"
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  placeholder="e.g. Review SUTO CAFE on Google"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Description</label>
                <textarea
                  rows={2}
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blueink focus:outline-none"
                  placeholder="Instructions for customer..."
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">External Link URL (Optional)</label>
                <input
                  type="url"
                  value={actUrl}
                  onChange={(e) => setActUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blueink focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={actIsActive}
                  onChange={(e) => setActIsActive(e.target.checked)}
                  className="rounded text-blueink"
                />
                <span className="font-semibold text-slate-700">Activity Step is Active</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blueink px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* 6. EDIT / CREATE CUSTOMER REWARD PROFILE MODAL (CRUD) */}
      {editingCustomerProfile !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[rgba(6,9,20,0.5)]"
            onClick={() => setEditingCustomerProfile(null)}
          />
          <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="font-display text-base font-bold text-navy">
              {editingCustomerProfile === "new" ? "+ Create Customer Reward Profile" : "✏️ Edit Customer Profile"}
            </h3>

            <form onSubmit={handleSaveCustomerProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Mobile Phone (10 Digits)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={custEditPhone}
                  onChange={(e) => setCustEditPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono focus:border-blueink focus:outline-none"
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Customer Name</label>
                <input
                  type="text"
                  required
                  value={custEditName}
                  onChange={(e) => setCustEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-blueink focus:outline-none"
                  placeholder="e.g. Papa / Rahul"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Stamps</label>
                  <input
                    type="number"
                    min={0}
                    value={custEditStamps}
                    onChange={(e) => setCustEditStamps(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Visits</label>
                  <input
                    type="number"
                    min={0}
                    value={custEditVisits}
                    onChange={(e) => setCustEditVisits(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase text-slate-500 text-[10px]">Cycle</label>
                  <input
                    type="number"
                    min={1}
                    value={custEditCycle}
                    onChange={(e) => setCustEditCycle(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase text-slate-500 text-[10px]">Reward Status</label>
                <select
                  value={custEditStatus}
                  onChange={(e) => setCustEditStatus(e.target.value as RewardStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold focus:border-blueink focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNLOCKED">UNLOCKED</option>
                  <option value="REDEEMED">REDEEMED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomerProfile(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blueink px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
