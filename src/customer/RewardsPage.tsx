import { useState, useEffect, useCallback } from "react";
import type {
  CustomerInfo,
  RewardCampaign,
  RewardActivity,
  CustomerRewardState,
  RewardVerificationRequest,
  RewardStampHistory,
} from "../types";
import {
  fetchActiveRewardCampaign,
  fetchCustomerRewardProfile,
  submitRewardVerificationRequest,
  normalizePhone,
} from "../services/rewardService";
import { fetchCustomerOrders } from "../services/orderService";

interface Props {
  customerInfo?: CustomerInfo;
  tableNumber: number;
  onGoToMenu: () => void;
  onGoToOrders: () => void;
  onSaveCustomerInfo?: (info: CustomerInfo) => void;
}

export function RewardsPage({
  customerInfo,
  tableNumber,
  onGoToMenu,
  onGoToOrders,
  onSaveCustomerInfo,
}: Props) {

  const [campaign, setCampaign] = useState<RewardCampaign | null>(null);
  const [activities, setActivities] = useState<RewardActivity[]>([]);
  const [rewardProfile, setRewardProfile] = useState<CustomerRewardState | null>(null);
  const [activeRequest, setActiveRequest] = useState<RewardVerificationRequest | undefined>(undefined);
  const [stampHistory, setStampHistory] = useState<RewardStampHistory[]>([]);
  const [allRequests, setAllRequests] = useState<RewardVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Phone input modal state for first time guests
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const customerPhone = customerInfo?.phone ? normalizePhone(customerInfo.phone) : "";

  // Load Reward Profile & Campaign
  const loadData = useCallback(async () => {
    try {
      const { campaign: fetchedCamp, activities: fetchedActs } = await fetchActiveRewardCampaign();
      setCampaign(fetchedCamp);
      setActivities(fetchedActs);

      if (customerPhone) {
        const { profile, activeRequest: req, stampHistory: hist, allRequests: reqs } =
          await fetchCustomerRewardProfile(customerPhone);
        setRewardProfile(profile);
        setActiveRequest(req);
        setStampHistory(hist);
        setAllRequests(reqs);
      }
    } catch (err) {
      console.error("Error loading rewards data:", err);
    } finally {
      setLoading(false);
    }
  }, [customerPhone]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSavePhoneProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizePhone(phoneInput);
    if (!clean || clean.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const newInfo: CustomerInfo = {
      name: nameInput.trim() || "Customer",
      phone: clean,
    };
    if (onSaveCustomerInfo) {
      onSaveCustomerInfo(newInfo);
    }
  };

  const currentVisitNumber = rewardProfile ? rewardProfile.currentVisitCount + 1 : 1;
  const currentStampCount = rewardProfile ? rewardProfile.currentStampCount : 0;
  const requiredVisits = campaign ? campaign.requiredVisits : 5;

  // Determine current activity based on visit number
  let currentActivity: RewardActivity | undefined;
  if (activities.length > 0) {
    currentActivity = activities.find((a) => a.visitNumber === currentVisitNumber);
    if (!currentActivity && currentVisitNumber > 3) {
      // Default visit 4+ activity
      currentActivity = {
        id: "act-4+",
        rewardId: campaign?.id || "",
        visitNumber: currentVisitNumber,
        activityType: "VISIT_VERIFICATION",
        title: "Keep Visiting SUTO CAFE",
        description:
          "Complete your order during this visit and request your digital visit stamp. Our team will verify your visit.",
        isActive: true,
      };
    }
  }

  // Handle external social link click
  const handleOpenSocialLink = (url?: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Submit Claim / Verification Request
  const handleSubmitClaim = async () => {
    if (!customerPhone || !customerInfo) {
      setClaimFeedback({ type: "error", message: "Please save your mobile number to claim rewards." });
      return;
    }

    setIsSubmittingClaim(true);
    setClaimFeedback(null);

    try {
      // Check customer completed orders
      const orders = await fetchCustomerOrders(customerPhone);
      const latestOrder = orders.length > 0 ? orders[0] : undefined;

      const actType = currentActivity?.activityType || (currentVisitNumber === 1 ? "GOOGLE_REVIEW" : currentVisitNumber === 2 ? "INSTAGRAM_FOLLOW" : currentVisitNumber === 3 ? "INSTAGRAM_STORY" : "VISIT_VERIFICATION");

      const res = await submitRewardVerificationRequest({
        customerPhone,
        customerName: customerInfo.name || "Customer",
        rewardId: campaign?.id || "01000000-0000-0000-0000-000000000001",


        orderId: latestOrder?.orderId,
        visitNumber: currentVisitNumber,
        cycleNumber: rewardProfile?.cycleNumber || 1,
        activityType: actType,
      });

      if (res.success) {
        setClaimFeedback({
          type: "success",
          message: "⏳ Verification request submitted successfully! Our team will verify it shortly.",
        });
        if (res.request) setActiveRequest(res.request);
        loadData();
      } else {
        setClaimFeedback({
          type: "error",
          message: res.message || "Could not submit verification request.",
        });
      }
    } catch (err) {
      console.error("Failed to submit claim:", err);
      setClaimFeedback({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Latest request status check
  const latestRequestForCurrentVisit = allRequests.find(
    (r) => r.visitNumber === currentVisitNumber && r.cycleNumber === (rewardProfile?.cycleNumber || 1)
  );

  return (
    <div className="flex-1 px-4 pb-28 pt-4">
      {/* 1. Header Card */}
      <div className="rounded-2xl bg-gradient-to-br from-navy via-slate-900 to-navy p-5 text-white shadow-xl relative overflow-hidden">
        {/* Background Decorative Circle */}
        <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-gold/10 blur-xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div>
            <span className="rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-black uppercase text-gold border border-gold/30">
              SUTO CAFE REWARDS
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="font-display text-2xl font-bold text-white">
                Hello {customerInfo?.name || "Guest"} 👋
              </h1>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-200">
                🪑 Table {tableNumber}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {customerPhone ? `+91 ${customerPhone}` : "Visit SUTO CAFE & collect digital stamps"}
            </p>

          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/20 text-3xl border border-gold/30 shadow-inner">
            🎁
          </div>
        </div>

        {/* Digital Stamp Progress Display */}
        <div className="mt-5 rounded-xl bg-white/10 p-4 backdrop-blur-md border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Your Reward Progress</span>
            <span className="font-mono text-sm font-black text-gold">
              {currentStampCount} / {requiredVisits} Visits
            </span>
          </div>

          {/* Stamp Circles */}
          <div className="mt-3 flex items-center justify-between px-1">
            {Array.from({ length: requiredVisits }, (_, i) => i + 1).map((stampNo) => {
              const isStamped = stampNo <= currentStampCount;
              return (
                <div key={stampNo} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition-all ${
                      isStamped
                        ? "bg-gold text-navy shadow-[0_0_12px_rgba(234,179,8,0.6)] scale-105"
                        : "bg-white/15 text-white/50 border border-white/20"
                    }`}
                  >
                    {isStamped ? "✓" : stampNo}
                  </div>
                  <span className="text-[9px] font-bold text-slate-300">V{stampNo}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Status Message */}
          <div className="mt-3 text-center text-xs font-semibold text-gold/90">
            {rewardProfile?.status === "UNLOCKED" ? (
              <span className="animate-pulse text-amber-300 font-bold">🎉 REWARD UNLOCKED! Enjoy your free item!</span>
            ) : requiredVisits - currentStampCount > 0 ? (
              <span>
                {requiredVisits - currentStampCount} more verified visit
                {requiredVisits - currentStampCount > 1 ? "s" : ""} to unlock your reward.
              </span>
            ) : (
              <span>All stamps completed!</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Customer Phone Registration Modal/Box if Phone Not Set */}
      {!customerPhone ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div>
              <h3 className="font-display text-sm font-bold text-navy">
                Register Your Phone Number
              </h3>
              <p className="text-xs text-slate-600">
                Enter your mobile number to track your cafe visits and start earning digital stamps!
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePhoneProfile} className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500">Your Name</label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs focus:border-blueink focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-500">
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="e.g. 9876543210"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs focus:border-blueink focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-blueink py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              Start Earning Stamps →
            </button>
          </form>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading your rewards details...
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* 3. REWARD UNLOCKED CARD (If status === 'UNLOCKED') */}
          {rewardProfile?.status === "UNLOCKED" && (
            <div className="rounded-2xl border-2 border-gold bg-gradient-to-br from-amber-500 via-amber-400 to-amber-600 p-5 text-slate-900 shadow-2xl animate-[bounce_1s_ease_1]">
              <div className="text-center">
                <div className="text-4xl">🎉 ☕ 🎉</div>
                <h2 className="mt-2 font-display text-xl font-black text-white uppercase tracking-wide">
                  REWARD UNLOCKED!
                </h2>
                <div className="mt-1 inline-block rounded-full bg-navy px-4 py-1 text-sm font-black text-gold shadow-md">
                  {campaign?.name || "Free Thick Cold Coffee"}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-900">
                  {campaign?.description || "Get one free Thick Cold Coffee."}
                </p>
                <div className="mt-4 rounded-xl bg-white/90 p-3 text-xs font-bold text-navy shadow-inner border border-white">
                  📍 Show this screen to SUTO CAFE staff at the counter to redeem your free reward!
                </div>
              </div>
            </div>
          )}

          {/* 4. CURRENT VISIT ACTIVITY CARD */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blueink">
                  YOUR CURRENT VISIT
                </span>
                <h2 className="font-display text-lg font-bold text-navy">
                  Visit {currentVisitNumber} Reward Activity
                </h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blueink border border-blue-200">
                Visit {currentVisitNumber}
              </span>
            </div>

            {/* Visit 1: Google Review */}
            {currentVisitNumber === 1 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <span className="text-xl">⭐</span> Review SUTO CAFE on Google
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div className="flex gap-2">
                    <span className="font-bold text-blueink">Step 1:</span>
                    <span>Complete your food order through QR code.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blueink">Step 2:</span>
                    <span>Tap the button below to open Google Review.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blueink">Step 3:</span>
                    <span>Complete your Google Review.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-blueink">Step 4:</span>
                    <span>Return here and request verification.</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenSocialLink("https://share.google/HSgxbWEc0vuncBI9U")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-colors"
                >
                  <span>⭐</span> Review SUTO CAFE on Google
                </button>

                {/* Claim Verification Button */}
                <button
                  type="button"
                  disabled={isSubmittingClaim || Boolean(activeRequest)}
                  onClick={handleSubmitClaim}
                  className={`w-full rounded-xl py-3 text-xs font-bold transition-all ${
                    activeRequest
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-navy text-white hover:bg-slate-800 shadow-md"
                  }`}
                >
                  {isSubmittingClaim
                    ? "Submitting Request..."
                    : activeRequest
                    ? "⏳ Verification Request Pending"
                    : "I Have Completed My Google Review"}
                </button>
              </div>
            )}

            {/* Visit 2: Instagram Follow */}
            {currentVisitNumber === 2 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <span className="text-xl">📸</span> Follow SUTO CAFE on Instagram
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div className="flex gap-2">
                    <span className="font-bold text-purple-600">Step 1:</span>
                    <span>Complete your food order.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-purple-600">Step 2:</span>
                    <span>Tap the button below to open Instagram.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-purple-600">Step 3:</span>
                    <span>Follow <strong>@sutocafe_nagpur</strong> on Instagram.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-purple-600">Step 4:</span>
                    <span>Return here and request verification.</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenSocialLink("https://www.instagram.com/sutocafe_nagpur/")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity"
                >
                  <span>📸</span> Follow SUTO CAFE on Instagram
                </button>

                {/* Claim Verification Button */}
                <button
                  type="button"
                  disabled={isSubmittingClaim || Boolean(activeRequest)}
                  onClick={handleSubmitClaim}
                  className={`w-full rounded-xl py-3 text-xs font-bold transition-all ${
                    activeRequest
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-navy text-white hover:bg-slate-800 shadow-md"
                  }`}
                >
                  {isSubmittingClaim
                    ? "Submitting Request..."
                    : activeRequest
                    ? "⏳ Verification Request Pending"
                    : "I Have Followed SUTO CAFE"}
                </button>
              </div>
            )}

            {/* Visit 3: Instagram Story */}
            {currentVisitNumber === 3 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <span className="text-xl">📸</span> Instagram Story Challenge
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div className="flex gap-2">
                    <span className="font-bold text-pink-600">Step 1:</span>
                    <span>Complete your food order.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-pink-600">Step 2:</span>
                    <span>Create a cafe-related Instagram Story.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-pink-600">Step 3:</span>
                    <span>Tag <strong>@sutocafe_nagpur</strong> in your story.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-pink-600">Step 4:</span>
                    <span>Return here and request verification.</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenSocialLink("https://www.instagram.com/sutocafe_nagpur/")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-opacity"
                >
                  <span>📸</span> Open Instagram to Tag @sutocafe_nagpur
                </button>

                {/* Claim Verification Button */}
                <button
                  type="button"
                  disabled={isSubmittingClaim || Boolean(activeRequest)}
                  onClick={handleSubmitClaim}
                  className={`w-full rounded-xl py-3 text-xs font-bold transition-all ${
                    activeRequest
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-navy text-white hover:bg-slate-800 shadow-md"
                  }`}
                >
                  {isSubmittingClaim
                    ? "Submitting Request..."
                    : activeRequest
                    ? "⏳ Verification Request Pending"
                    : "I Have Posted My Story"}
                </button>
              </div>
            )}

            {/* Visit 4+: Standard Visit Verification */}
            {currentVisitNumber >= 4 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900">
                  <span className="text-xl">🎁</span> Keep Visiting SUTO CAFE
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 space-y-2 border border-slate-100">
                  <div>Complete your order during this visit.</div>
                  <div>After your order is completed, click the button below to request your digital stamp.</div>
                  <div className="text-[11px] text-slate-500 italic">
                    Our staff will verify your completed order and award your stamp.
                  </div>
                </div>

                {/* Claim Verification Button */}
                <button
                  type="button"
                  disabled={isSubmittingClaim || Boolean(activeRequest)}
                  onClick={handleSubmitClaim}
                  className={`w-full rounded-xl py-3 text-xs font-bold transition-all ${
                    activeRequest
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                  }`}
                >
                  {isSubmittingClaim
                    ? "Submitting Request..."
                    : activeRequest
                    ? "⏳ Verification Request Pending"
                    : "Request Reward Stamp"}
                </button>
              </div>
            )}

            {/* STATUS BANNER FEEDBACK */}
            {activeRequest && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 animate-pulse">
                <span className="text-lg">⏳</span>
                <div>
                  <div className="font-bold">Verification Pending</div>
                  <div className="mt-0.5 text-[11px] text-amber-800">
                    Your reward request for Visit {activeRequest.visitNumber} has been submitted. SUTO CAFE team will verify it shortly.
                  </div>
                </div>
              </div>
            )}

            {latestRequestForCurrentVisit?.requestStatus === "REJECTED" && !activeRequest && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <span>❌</span> Verification Not Approved
                </div>
                <p className="text-[11px] text-rose-800">
                  Reason: {latestRequestForCurrentVisit.rejectionReason || "Could not verify activity."}
                </p>
                <div className="text-[10px] text-rose-600 pt-1">
                  If you believe this is incorrect, please speak with SUTO CAFE staff.
                </div>
              </div>
            )}

            {claimFeedback && (
              <div
                className={`mt-3 rounded-xl p-3 text-xs font-semibold ${
                  claimFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {claimFeedback.message}
              </div>
            )}
          </div>

          {/* 5. CUSTOMER JOURNEY TIMELINE VISUALIZATION */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-display text-sm font-bold text-navy uppercase tracking-wider mb-3">
              YOUR SUTO CAFE JOURNEY
            </h2>

            <div className="space-y-2.5">
              {Array.from({ length: Math.max(requiredVisits, currentVisitNumber) }, (_, i) => i + 1).map(
                (vNum) => {
                  const isVerified = vNum <= currentStampCount;
                  const isCurrent = vNum === currentVisitNumber;
                  const reqForV = allRequests.find(
                    (r) => r.visitNumber === vNum && r.cycleNumber === (rewardProfile?.cycleNumber || 1)
                  );
                  const isPending = reqForV?.requestStatus === "PENDING";

                  let title = `Visit ${vNum}`;
                  if (vNum === 1) title = "Visit 1 — Google Review";
                  else if (vNum === 2) title = "Visit 2 — Instagram Follow";
                  else if (vNum === 3) title = "Visit 3 — Instagram Story + Tag";
                  else title = `Visit ${vNum} — Visit Verification`;

                  return (
                    <div
                      key={vNum}
                      className={`flex items-center justify-between rounded-xl p-3 text-xs border transition-colors ${
                        isVerified
                          ? "border-emerald-200 bg-emerald-50/60"
                          : isCurrent
                          ? "border-blue-200 bg-blue-50/60 font-bold"
                          : "border-slate-100 bg-slate-50/50 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">
                          {isVerified ? "✓" : isPending ? "⏳" : isCurrent ? "👉" : "○"}
                        </span>
                        <div>
                          <div className={isVerified ? "font-bold text-emerald-900" : isCurrent ? "font-bold text-blueink" : "text-slate-500"}>
                            {title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isVerified
                              ? "Verified & Stamp Granted"
                              : isPending
                              ? "Verification Request Pending"
                              : isCurrent
                              ? "Active Visit Activity"
                              : "Locked"}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isVerified && (
                          <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                            STAMPED
                          </span>
                        )}
                        {isPending && (
                          <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* 6. STAMP & REWARD HISTORY SECTION */}
          {stampHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="font-display text-sm font-bold text-navy uppercase tracking-wider mb-3">
                REWARD HISTORY
              </h2>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 px-3">
                {stampHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">
                        {h.action === "REWARD_UNLOCKED"
                          ? "🎁 Reward Unlocked!"
                          : h.action === "REWARD_REDEEMED"
                          ? "🎉 Reward Redeemed"
                          : `⭐ Visit ${h.visitNumber} Stamp`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cycle {h.cycleNumber} • {new Date(h.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        h.action === "REWARD_UNLOCKED"
                          ? "bg-amber-100 text-amber-800"
                          : h.action === "REWARD_REDEEMED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {h.action === "REWARD_UNLOCKED"
                        ? "UNLOCKED"
                        : h.action === "REWARD_REDEEMED"
                        ? "REDEEMED"
                        : "APPROVED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Navigation Footer */}
          <div className="flex gap-2">
            <button
              onClick={onGoToMenu}
              className="flex-1 rounded-xl bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              🍽️ Food Menu
            </button>
            <button
              onClick={onGoToOrders}
              className="flex-1 rounded-xl bg-blue-50 py-3 text-xs font-bold text-blueink hover:bg-blue-100 transition-colors"
            >
              📜 My Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
