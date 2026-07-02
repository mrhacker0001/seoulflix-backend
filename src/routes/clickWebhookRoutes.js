const express = require("express");
const { db } = require("../config/firebaseAdmin");
const { verifyClickSignature, CLICK_ERROR } = require("../services/clickSignature");
const { getTier } = require("../config/tiers");

const router = express.Router();

// Click calls these two endpoints directly (server-to-server), not the browser.
// They must respond with x-www-form-urlencoded compatible JSON per Click's spec.

// POST /api/payments/click/prepare
router.post("/prepare", async (req, res) => {
  const body = req.body;
  const orderId = body.merchant_trans_id;

  if (!verifyClickSignature(body)) {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.SIGN_FAILED,
      error_note: "Sign check failed",
    });
  }

  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();

  if (!snap.exists) {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.TRANSACTION_NOT_FOUND,
      error_note: "Order not found",
    });
  }

  const order = snap.data();

  if (Number(order.amount) !== Number(body.amount)) {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.AMOUNT_MISMATCH,
      error_note: "Amount mismatch",
    });
  }

  if (order.status === "paid") {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.ALREADY_PAID,
      error_note: "Already paid",
    });
  }

  await orderRef.update({
    clickTransId: body.click_trans_id,
    status: "prepared",
  });

  return res.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: orderId,
    merchant_prepare_id: orderId,
    error: CLICK_ERROR.SUCCESS,
    error_note: "Success",
  });
});

// POST /api/payments/click/complete
router.post("/complete", async (req, res) => {
  const body = req.body;
  const orderId = body.merchant_trans_id;

  if (!verifyClickSignature(body)) {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.SIGN_FAILED,
      error_note: "Sign check failed",
    });
  }

  const orderRef = db.collection("orders").doc(orderId);
  const snap = await orderRef.get();

  if (!snap.exists) {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.TRANSACTION_NOT_FOUND,
      error_note: "Order not found",
    });
  }

  const order = snap.data();

  // Click reports its own failure (e.g. user cancelled) via body.error != 0
  if (Number(body.error) < 0) {
    await orderRef.update({ status: "cancelled" });
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.TRANSACTION_CANCELLED,
      error_note: "Cancelled by Click",
    });
  }

  if (order.status === "paid") {
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: orderId,
      error: CLICK_ERROR.ALREADY_PAID,
      error_note: "Already paid",
    });
  }

  const tier = getTier(order.tierId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tier.durationDays * 24 * 60 * 60 * 1000);

  await db.runTransaction(async (tx) => {
    tx.update(orderRef, {
      status: "paid",
      paidAt: now.toISOString(),
      clickCompleteId: body.click_trans_id,
    });
    tx.set(
      db.collection("users").doc(order.uid),
      { isPremium: true, premiumExpiresAt: expiresAt.toISOString(), premiumTier: tier.id },
      { merge: true }
    );
  });

  return res.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: orderId,
    merchant_confirm_id: orderId,
    error: CLICK_ERROR.SUCCESS,
    error_note: "Success",
  });
});

module.exports = router;
