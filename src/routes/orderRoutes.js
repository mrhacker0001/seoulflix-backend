const express = require("express");
const { db } = require("../config/firebaseAdmin");
const { requireAuth } = require("../middleware/auth");
const { getTier } = require("../config/tiers");

const router = express.Router();

// POST /api/orders  { tierId }
// Creates a pending order and returns the Click checkout URL the frontend
// should redirect the user to.
router.post("/", requireAuth, async (req, res) => {
  const { tierId } = req.body;
  const tier = getTier(tierId);

  if (!tier) {
    return res.status(400).json({ error: "Noto'g'ri tarif tanlandi." });
  }

  const orderRef = db.collection("orders").doc();
  const order = {
    id: orderRef.id,
    uid: req.uid,
    tierId: tier.id,
    amount: tier.amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await orderRef.set(order);

  const serviceId = process.env.CLICK_SERVICE_ID;
  const merchantId = process.env.CLICK_MERCHANT_ID;
  const returnUrl = process.env.CLICK_RETURN_URL;

  const payUrl =
    `https://my.click.uz/services/pay?` +
    `service_id=${serviceId}` +
    `&merchant_id=${merchantId}` +
    `&amount=${tier.amount}` +
    `&transaction_param=${order.id}` +
    `&return_url=${encodeURIComponent(returnUrl)}`;

  res.json({ orderId: order.id, amount: tier.amount, payUrl });
});

// GET /api/orders/:id  -> so the frontend can poll payment status
router.get("/:id", requireAuth, async (req, res) => {
  const snap = await db.collection("orders").doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ error: "Buyurtma topilmadi." });

  const order = snap.data();
  if (order.uid !== req.uid) return res.status(403).json({ error: "Ruxsat yo'q." });

  res.json(order);
});

module.exports = router;
