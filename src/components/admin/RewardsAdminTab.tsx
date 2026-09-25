import { useState, useEffect, useMemo } from "react";
import type {
  RewardCampaign,
  RewardActivity,
  RewardVerificationRequest,
  CustomerRewardState,
  RewardStampHistory,
} from "../../types";
import {

  fetchActiveRewardCampaign,
  saveRewardCampaign,
  fetchAllRewardRequests,
  approveRewardRequest,
  rejectRewardRequest,
  fetchCustomerRewardProfile,
  redeemReward,
} from "../../services/rewardService";

interface Props {
  onRequestUpdated?: () => void;
}

export function RewardsAdminTab({ onRequestUpdated }: Props) {
  const [campaign, setCampaign] = useState<RewardCampaign | null>(null);
  const [activities, setActivities] = useState<RewardActivity[]>([]);
  const [requests, setRequests] = useState<RewardVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Sub-tabs: "requests" | "config" | "customers"
  const [subTab, setSubTab] = useState<"requests" | "config" | "customers">("requests");

  // Selected Request for Modal Verification
  const [selectedRequest, setSelectedRequest] = useState<RewardVerificationRequest | null>(null);
  const [rejectionModalRequest, setRejectionModalRequest] = useState<RewardVerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Campaign Configuration Form State
  const [campaignName, setCampaignName] = useState("");
  const [campaignDesc, setCampaignDesc] = useState("");
  const [requiredVisitsInput, setRequiredVisitsInput] = useState<number>(5);
  const [expiryDateInput, setExpiryDateInput] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  // Customer Lookup State
  const [customerSearchPhone, setCustomerSearchPhone] = useState("");
  const [searchedProfile, setSearchedProfile] = useState<CustomerRewardState | null>(null);
  const [searchedHistory, setSearchedHistory] = useState<RewardStampHistory[]>([]);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [redemptionFeedback, setRedemptionFeedback] = useState<string | null>(null);

  const loadAdminRewardsData = async () => {
    try {
      const [campData, reqData] = await Promise.all([
        fetchActiveRewardCampaign(),
        fetchAllRewardRequests(),
      ]);

      setCampaign(campData.campaign);
      setActivities(campData.activities);
      setRequests(reqData);

      setCampaignName(campData.campaign.name);
      setCampaignDesc(campData.campaign.description);
      setRequiredVisitsInput(campData.campaign.requiredVisits);
      setExpiryDateInput(
        campData.campaign.expiryDate ? campData.campaign.expiryDate.split("T")[0] : "2026-12-31"
      );
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
  }, []);

  // Filter requests
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.requestStatus === "PENDING"),
    [requests]
  );

  const historyRequests = useMemo(
    () => requests.filter((r) => r.requestStatus !== "PENDING"),
    [requests]
  );

  // Stats
  const approvedCount = useMemo(
    () => requests.filter((r) => r.requestStatus === "APPROVED").length,
    [requests]
  );

  // Handle Approve Request
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

  // Handle Reject Request
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

  // Handle Save Campaign Config
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

  // Handle Customer Lookup
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

  // Handle Redeem Reward
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

      {/* 2. Top Summary Metric Cards */}
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

      {/* 3. SUB-TAB 1: VERIFICATION REQUESTS */}
      {subTab === "requests" && (
        <div className="space-y-6">
          {/* Pending Verification Requests Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                <span>🔔</span> Pending Verification Requests ({pendingRequests.length})
              </h3>
              <button
                onClick={loadAdminRewardsData}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading requests...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100 p-6">
                <div className="mx-auto mb-1 text-2xl">🎉</div>
                No pending reward verification requests right now.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs hover:shadow-md transition-shadow"
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

                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        🔍 Details
                      </button>
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isProcessingAction}
                        className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        ✓ Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History of Verification Requests */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-navy">
              Verification History ({historyRequests.length})
            </h3>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white max-h-96 overflow-y-auto">
              {historyRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No request history yet.</div>
              ) : (
                historyRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 text-xs">
                    <div>
                      <div className="font-bold text-navy">
                        {req.customerName} (+91 {req.customerPhone})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Visit {req.visitNumber} • Activity: {req.activityType.replace(/_/g, " ")} • {new Date(req.submittedAt).toLocaleString()}
                      </div>
                      {req.rejectionReason && (
                        <div className="text-[11px] text-rose-600 font-medium">
                          Reason: {req.rejectionReason}
                        </div>
                      )}
                    </div>

                    <span
                      className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                        req.requestStatus === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {req.requestStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: REWARD CONFIGURATION */}
      {subTab === "config" && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm max-w-2xl space-y-5">
          <div>
            <h3 className="font-display text-base font-bold text-navy">
              ⚙️ Reward Campaign Settings
            </h3>
            <p className="text-xs text-slate-500">
              Configure the active campaign, milestone visit threshold, and expiry date.
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
      )}

      {/* 5. SUB-TAB 3: CUSTOMER LOOKUP */}
      {subTab === "customers" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm max-w-xl space-y-4">
            <h3 className="font-display text-base font-bold text-navy">
              👤 Customer Reward Lookup
            </h3>

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
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${
                      searchedProfile.status === "UNLOCKED"
                        ? "bg-gold text-navy animate-pulse"
                        : "bg-blue-100 text-blueink"
                    }`}
                  >
                    {searchedProfile.status}
                  </span>
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

                {/* Customer Stamp History */}
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
        </div>
      )}


      {/* 6. VERIFICATION REQUEST DETAIL MODAL */}
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

      {/* 7. REJECTION REASON MODAL */}
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
    </div>
  );
}
